// Tests for `src/app/clients/[id]/error.tsx`. A Client Component, unlike the
// Server Component page/loading segments it accompanies, so it is tested
// directly rather than only end to end
// (`ai-rules/policy_testing.md` -> What to test where), same reasoning and
// pattern as `tests/app/clients/error.test.tsx`.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ClientDetailError from "@/app/clients/[id]/error";

describe("ClientDetailError", () => {
  it("shows the generic message, never the raw error, inside an alert", () => {
    render(
      <ClientDetailError
        error={new Error("SQLITE_ERROR: no such table: clients")}
        reset={() => {
          // not exercised in this test
        }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("This client could not be loaded.");
    expect(alert).not.toHaveTextContent("SQLITE_ERROR");
  });

  it("calls reset when 'Try again' is activated", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ClientDetailError error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
