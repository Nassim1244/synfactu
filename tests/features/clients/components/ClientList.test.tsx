// Tests for `src/features/clients/components/ClientList.tsx` (design
// v01-001, screen 4 -> States, Accessibility). The Server Action boundary
// (`../actions`) is mocked, same reasoning as `PartnerList.test.tsx`.

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/clients/actions");
vi.mock("@/features/partners/actions");

import {
  ClientList,
  ClientListSkeleton,
} from "@/features/clients/components/ClientList";
import * as actions from "@/features/clients/actions";
import { installRadixPolyfills } from "../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

type Client = {
  id: number;
  name: string;
  shortLabel: string;
  billable: boolean;
  active: boolean;
  defaultRateCents: number;
  regime: null;
  partnerId: number | null;
  partner: { id: number; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: 1,
    name: "Acme",
    shortLabel: "ACME",
    billable: true,
    active: true,
    defaultRateCents: 45_000,
    regime: null,
    partnerId: null,
    partner: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("ClientListSkeleton (loading state)", () => {
  it("announces itself once via role=status and visually hidden text", () => {
    render(<ClientListSkeleton />);

    const status = screen.getByRole("status");
    expect(within(status).getByText("Loading clients…")).toBeInTheDocument();
  });
});

describe("ClientList - empty state", () => {
  it("shows the empty message and repeats 'New client' as the entry point", () => {
    render(<ClientList clients={[]} activePartners={[]} />);

    expect(screen.getByText("No clients yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New client" }),
    ).toBeInTheDocument();
  });
});

describe("ClientList - populated state", () => {
  it("renders name, short label, billable as plain text, status as a Badge, and the linked partner", () => {
    render(
      <ClientList
        clients={[
          client({
            id: 1,
            name: "Acme",
            shortLabel: "ACME",
            billable: true,
            active: true,
            partner: { id: 9, name: "Referrer" },
          }),
          client({
            id: 2,
            name: "Beta",
            shortLabel: "BETA",
            billable: false,
            active: false,
            partner: null,
          }),
        ]}
        activePartners={[]}
      />,
    );

    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ACME").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Referrer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Yes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    // No partner: an em dash, never a blank cell.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("gives each row's Edit button and Switch name-specific accessible names", () => {
    render(
      <ClientList
        clients={[client({ id: 1, name: "Acme", active: true })]}
        activePartners={[]}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "Edit Acme" }).length,
    ).toBeGreaterThan(0);
    const toggle = screen.getAllByRole("switch", {
      name: "Deactivate Acme",
    })[0];
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("renders every record with none omitted, for a large list (volumetry criterion)", () => {
    const clients = Array.from({ length: 100 }, (_, index) =>
      client({ id: index + 1, name: `Client ${index + 1}` }),
    );

    render(<ClientList clients={clients} activePartners={[]} />);

    for (const entry of clients) {
      expect(screen.getAllByText(entry.name).length).toBeGreaterThan(0);
    }
  });
});

describe("ClientList - row-level active toggle", () => {
  it("disables the switch while pending, then settles and shows a dismissible error on failure", async () => {
    const user = userEvent.setup();
    let resolveToggle: (value: {
      ok: false;
      error: "SAVE_FAILED";
    }) => void = () => {
      throw new Error("resolveToggle called before being assigned");
    };
    mockedActions.setClientActive.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveToggle = resolve;
        }),
    );

    render(
      <ClientList
        clients={[client({ name: "Acme", active: true })]}
        activePartners={[]}
      />,
    );

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
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("calls setClientActive with the row's id and the requested next state", async () => {
    const user = userEvent.setup();
    mockedActions.setClientActive.mockResolvedValue({
      ok: true,
      data: client({ id: 42, active: false }),
    });

    render(
      <ClientList
        clients={[client({ id: 42, name: "Acme", active: true })]}
        activePartners={[]}
      />,
    );

    const toggle = screen.getAllByRole("switch", {
      name: "Deactivate Acme",
    })[0];
    if (toggle === undefined) {
      throw new Error("expected a switch");
    }
    await user.click(toggle);

    expect(mockedActions.setClientActive).toHaveBeenCalledWith({
      id: 42,
      active: false,
    });
  });
});
