// Tests for `src/app/partners/error.tsx` (design v01-001, screen 2 -> States
// -> Error). A Client Component, unlike the Server Component page/loading
// segments it accompanies, so it is tested directly rather than only end to
// end (`ai-rules/policy_testing.md` -> What to test where).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PartnersError from "@/app/partners/error";

describe("PartnersError", () => {
  it("shows the generic message, never the raw error, inside an alert", () => {
    render(
      <PartnersError
        error={new Error("SQLITE_ERROR: no such table: partners")}
        reset={() => {
          // not exercised in this test
        }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Partners could not be loaded.");
    expect(alert).not.toHaveTextContent("SQLITE_ERROR");
  });

  it("calls reset when 'Try again' is activated", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<PartnersError error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
