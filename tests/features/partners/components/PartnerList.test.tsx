// Tests for `src/features/partners/components/PartnerList.tsx` (design
// v01-001, screen 2 -> States, Accessibility). The Server Action boundary
// (`../actions`) is mocked - a component test's unit is the component, and
// the action is the network boundary it calls through
// (`ai-rules/policy_testing.md` -> Relevance).

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/partners/actions");

import {
  PartnerList,
  PartnerListSkeleton,
} from "@/features/partners/components/PartnerList";
import * as actions from "@/features/partners/actions";
import { installRadixPolyfills } from "../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

type Partner = {
  id: number;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function partner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: 1,
    name: "Acme",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PartnerListSkeleton (loading state)", () => {
  it("announces itself once via role=status and visually hidden text", () => {
    render(<PartnerListSkeleton />);

    const status = screen.getByRole("status");
    expect(within(status).getByText("Loading partners…")).toBeInTheDocument();
  });
});

describe("PartnerList - empty state", () => {
  it("shows the empty message and repeats 'New partner' as the entry point", () => {
    render(<PartnerList partners={[]} />);

    expect(screen.getByText("No partners yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New partner" }),
    ).toBeInTheDocument();
  });
});

describe("PartnerList - populated state", () => {
  it("renders every partner's name and a Badge carrying visible status text", () => {
    render(
      <PartnerList
        partners={[
          partner({ id: 1, name: "Active Co", active: true }),
          partner({ id: 2, name: "Inactive Co", active: false }),
        ]}
      />,
    );

    expect(screen.getAllByText("Active Co")).not.toHaveLength(0);
    expect(screen.getAllByText("Inactive Co")).not.toHaveLength(0);
    // Colour is never the only carrier: the word itself is always present.
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
  });

  it("gives each row's Edit button a name-specific accessible name", () => {
    render(
      <PartnerList
        partners={[
          partner({ id: 1, name: "Alpha" }),
          partner({ id: 2, name: "Beta" }),
        ]}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "Edit Alpha" }),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole("button", { name: "Edit Beta" }),
    ).not.toHaveLength(0);
  });

  it("gives each row's Switch a name-specific, state-dependent accessible name", () => {
    render(
      <PartnerList
        partners={[
          partner({ id: 1, name: "Active Co", active: true }),
          partner({ id: 2, name: "Inactive Co", active: false }),
        ]}
      />,
    );

    const activeSwitches = screen.getAllByRole("switch", {
      name: "Deactivate Active Co",
    });
    expect(activeSwitches).not.toHaveLength(0);
    expect(activeSwitches[0]).toHaveAttribute("aria-checked", "true");

    const inactiveSwitches = screen.getAllByRole("switch", {
      name: "Reactivate Inactive Co",
    });
    expect(inactiveSwitches).not.toHaveLength(0);
    expect(inactiveSwitches[0]).toHaveAttribute("aria-checked", "false");
  });

  it("renders every record with none omitted, for a large list (volumetry criterion)", () => {
    const partners = Array.from({ length: 20 }, (_, index) =>
      partner({ id: index + 1, name: `Partner ${index + 1}` }),
    );

    render(<PartnerList partners={partners} />);

    for (const entry of partners) {
      expect(screen.getAllByText(entry.name).length).toBeGreaterThan(0);
    }
  });
});

describe("PartnerList - row-level active toggle", () => {
  it("disables the switch while pending, then settles and shows a dismissible error on failure", async () => {
    const user = userEvent.setup();
    let resolveToggle: (value: {
      ok: false;
      error: "SAVE_FAILED";
    }) => void = () => {
      throw new Error("resolveToggle called before being assigned");
    };
    mockedActions.setPartnerActive.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveToggle = resolve;
        }),
    );

    render(
      <PartnerList partners={[partner({ name: "Acme", active: true })]} />,
    );

    // Both the table row (>= md) and the stacked card (< md) render in
    // jsdom, since no stylesheet hides either at this viewport - the table
    // one is the first in document order.
    const toggle = screen.getAllByRole("switch", {
      name: "Deactivate Acme",
    })[0];
    if (toggle === undefined) {
      throw new Error("expected a switch");
    }
    await user.click(toggle);

    expect(toggle).toBeDisabled();

    resolveToggle({ ok: false, error: "SAVE_FAILED" });

    const alerts = await screen.findAllByText(
      "Could not update Acme. Try again.",
    );
    expect(alerts.length).toBeGreaterThan(0);
    // `isPending` and `error` are two independent state updates from the
    // same `startTransition` callback and are not guaranteed to land in the
    // same React commit, so this waits rather than asserting synchronously
    // right after the `findAllByText` above settles.
    await waitFor(() => {
      expect(toggle).not.toBeDisabled();
    });
    // Nothing flipped: the Switch stays bound to the original prop, since a
    // failed mutation never triggers a revalidation that would pass a new
    // one down (AD-006's non-optimistic design).
    expect(toggle).toHaveAttribute("aria-checked", "true");

    const dismiss = screen.getAllByRole("button", { name: "Dismiss" })[0];
    if (dismiss === undefined) {
      throw new Error("expected a dismiss button");
    }
    await user.click(dismiss);

    expect(
      screen.queryByText("Could not update Acme. Try again."),
    ).not.toBeInTheDocument();
  });

  it("calls setPartnerActive with the row's id and the requested next state", async () => {
    const user = userEvent.setup();
    mockedActions.setPartnerActive.mockResolvedValue({
      ok: true,
      data: partner({ id: 42, active: false }),
    });

    render(
      <PartnerList
        partners={[partner({ id: 42, name: "Acme", active: true })]}
      />,
    );

    const toggle = screen.getAllByRole("switch", {
      name: "Deactivate Acme",
    })[0];
    if (toggle === undefined) {
      throw new Error("expected a switch");
    }
    await user.click(toggle);

    expect(mockedActions.setPartnerActive).toHaveBeenCalledWith({
      id: 42,
      active: false,
    });
  });
});
