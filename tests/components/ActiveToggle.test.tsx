// Tests for `src/components/ActiveToggle.tsx`, the shared row-level
// active/inactive switch every list in the Referential screen uses
// (mission categories, portage contracts, tags). `action` is a plain
// function prop here (mocked) - the component's own contract, not a Server
// Action boundary to fake around; what is under test is the switch's own
// optimistic flip, settle-on-success and revert-on-failure behaviour.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActiveToggle } from "@/components/ActiveToggle";
import { installRadixPolyfills } from "../support/radixPolyfills";

installRadixPolyfills();

describe("ActiveToggle - accessible name", () => {
  it("offers to deactivate an active row", () => {
    render(
      <ActiveToggle id={1} active={true} label="Conseil" action={vi.fn()} />,
    );

    expect(
      screen.getByRole("switch", { name: "Deactivate Conseil" }),
    ).toBeChecked();
  });

  it("offers to reactivate an inactive row", () => {
    render(
      <ActiveToggle id={1} active={false} label="Conseil" action={vi.fn()} />,
    );

    expect(
      screen.getByRole("switch", { name: "Reactivate Conseil" }),
    ).not.toBeChecked();
  });
});

describe("ActiveToggle - toggling", () => {
  it("calls the action with the row's id and the flipped value", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(
      <ActiveToggle id={42} active={true} label="Conseil" action={action} />,
    );

    await user.click(screen.getByRole("switch"));

    expect(action).toHaveBeenCalledWith(42, false);
  });

  it("flips immediately (optimistic) before the action resolves", async () => {
    const user = userEvent.setup();
    // Never resolves within this test - only the immediate, synchronous
    // optimistic flip is under test here.
    const action = vi.fn(() => new Promise<{ ok: boolean }>(() => {}));
    render(
      <ActiveToggle id={1} active={true} label="Conseil" action={action} />,
    );

    await user.click(screen.getByRole("switch"));

    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("reverts to the previous value and shows an error when the action fails", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ ok: false });
    render(
      <ActiveToggle id={1} active={true} label="Conseil" action={action} />,
    );

    await user.click(screen.getByRole("switch"));

    expect(await screen.findByText("Could not save.")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("shows no error message after a successful toggle", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ ok: true });
    render(
      <ActiveToggle id={1} active={true} label="Conseil" action={action} />,
    );

    await user.click(screen.getByRole("switch"));

    expect(screen.queryByText("Could not save.")).not.toBeInTheDocument();
  });

  it("clears a previous error once a subsequent toggle is attempted", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    render(
      <ActiveToggle id={1} active={true} label="Conseil" action={action} />,
    );

    await user.click(screen.getByRole("switch"));
    expect(await screen.findByText("Could not save.")).toBeInTheDocument();

    await user.click(screen.getByRole("switch"));

    expect(screen.queryByText("Could not save.")).not.toBeInTheDocument();
  });
});
