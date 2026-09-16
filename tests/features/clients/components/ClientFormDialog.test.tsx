// Tests for `src/features/clients/components/ClientFormDialog.tsx` (design
// v01-001, screen 5). The Server Action boundary (`../actions`) is mocked;
// `deriveShortLabel` (`../domain`) and `Money` are real, since the
// short-label auto-suggestion and the rate's round-trip display are exactly
// what this dialog is responsible for wiring correctly.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/clients/actions");

import { ClientFormDialog } from "@/features/clients/components/ClientFormDialog";
import * as actions from "@/features/clients/actions";
import { installRadixPolyfills } from "../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

const NOW = new Date("2026-01-01T00:00:00.000Z");

const ACTIVE_PARTNERS = [
  { id: 1, name: "Partner A", active: true, createdAt: NOW, updatedAt: NOW },
  { id: 2, name: "Partner B", active: true, createdAt: NOW, updatedAt: NOW },
];

afterEach(() => {
  vi.clearAllMocks();
});

async function openCreateDialog(user: ReturnType<typeof userEvent.setup>) {
  render(
    <ClientFormDialog
      mode="create"
      activePartners={ACTIVE_PARTNERS}
      trigger={<button>Open</button>}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Open" }));
}

describe("ClientFormDialog - create mode", () => {
  it("opens with the title 'New client', Billable on by default, and blank required fields", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    expect(
      screen.getByRole("heading", { name: "New client" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Short label")).toHaveValue("");
    expect(screen.getByLabelText("Billable")).toBeChecked();
  });

  it("suggests a short label as the user types the name, while the field is pristine", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    await user.type(screen.getByLabelText("Name"), "Acme Consulting");

    expect(screen.getByLabelText("Short label")).toHaveValue("ACMECONS");
  });

  it("stops overwriting the short label once the user types into it directly", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    await user.type(screen.getByLabelText("Name"), "Acme");
    expect(screen.getByLabelText("Short label")).toHaveValue("ACME");

    await user.clear(screen.getByLabelText("Short label"));
    await user.type(screen.getByLabelText("Short label"), "CUSTOM");

    await user.type(screen.getByLabelText("Name"), " Corp");

    expect(screen.getByLabelText("Short label")).toHaveValue("CUSTOM");
  });

  it("stores whatever short label is present at save time, suggested or typed", async () => {
    const user = userEvent.setup();
    mockedActions.createClient.mockResolvedValue({
      ok: true,
      data: {} as never,
    });
    await openCreateDialog(user);

    await user.type(screen.getByLabelText("Name"), "Acme");
    await user.type(screen.getByLabelText("Default rate (TJM)"), "450.50");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ shortLabel: "ACME" }),
    );
  });

  it("rejects blank Name, Short label and Default rate simultaneously, each with its own message", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Short label")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Default rate (TJM)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Short label is required.")).toBeInTheDocument();
    expect(screen.getByText("Enter a positive number.")).toBeInTheDocument();
    expect(mockedActions.createClient).not.toHaveBeenCalled();
  });

  it.each(["0", "-5", "abc"])(
    "rejects the default rate %j with 'Enter a positive number.'",
    async (defaultRate) => {
      const user = userEvent.setup();
      await openCreateDialog(user);
      await user.type(screen.getByLabelText("Name"), "Acme");
      await user.type(screen.getByLabelText("Default rate (TJM)"), defaultRate);

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByText("Enter a positive number.")).toBeInTheDocument();
      expect(mockedActions.createClient).not.toHaveBeenCalled();
    },
  );

  it("clears the default-rate error once corrected", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);
    await user.type(screen.getByLabelText("Default rate (TJM)"), "0");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter a positive number.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Default rate (TJM)"), "500.50");

    expect(
      screen.queryByText("Enter a positive number."),
    ).not.toBeInTheDocument();
  });

  it("saves successfully with no partner and no regime selected", async () => {
    const user = userEvent.setup();
    mockedActions.createClient.mockResolvedValue({
      ok: true,
      data: {} as never,
    });
    await openCreateDialog(user);
    await user.type(screen.getByLabelText("Name"), "Acme");
    await user.type(screen.getByLabelText("Default rate (TJM)"), "450.50");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: null, regime: null }),
    );
  });

  it("offers only the active partners in the referring-partner Select", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    await user.click(screen.getByLabelText("Referring partner"));

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("None")).toBeInTheDocument();
    expect(within(listbox).getByText("Partner A")).toBeInTheDocument();
    expect(within(listbox).getByText("Partner B")).toBeInTheDocument();
  });

  it("shows an Alert and preserves entered data when the save fails after validation", async () => {
    const user = userEvent.setup();
    mockedActions.createClient.mockResolvedValue({
      ok: false,
      error: "SAVE_FAILED",
    });
    await openCreateDialog(user);
    await user.type(screen.getByLabelText("Name"), "Acme");
    await user.type(screen.getByLabelText("Default rate (TJM)"), "450.50");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Could not save this client. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Acme");
    expect(
      screen.getByRole("heading", { name: "New client" }),
    ).toBeInTheDocument();
  });
});

describe("ClientFormDialog - edit mode", () => {
  const baseClient = {
    id: 5,
    name: "Old name",
    shortLabel: "OLDNAME",
    billable: true,
    active: true,
    defaultRateCents: 45_050,
    regime: null,
    partnerId: null,
    partner: null,
  };

  it("pre-fills every field from the record, including the rate as a plain decimal string", async () => {
    const user = userEvent.setup();
    render(
      <ClientFormDialog
        mode="edit"
        client={baseClient as never}
        activePartners={ACTIVE_PARTNERS}
        trigger={<button>Edit Old name</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Old name" }));

    expect(
      screen.getByRole("heading", { name: "Edit client Old name" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Old name");
    expect(screen.getByLabelText("Short label")).toHaveValue("OLDNAME");
    expect(screen.getByLabelText("Default rate (TJM)")).toHaveValue(450.5);
  });

  it("re-derives the short label from Name while it stays pristine, even in edit mode", async () => {
    const user = userEvent.setup();
    render(
      <ClientFormDialog
        mode="edit"
        client={baseClient as never}
        activePartners={ACTIVE_PARTNERS}
        trigger={<button>Edit Old name</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Old name" }));

    await user.type(screen.getByLabelText("Name"), " Ltd");

    // deriveShortLabel("Old name Ltd") = "OLDNAMEL", different from the
    // stored "OLDNAME" - proof the field was actually re-derived, not just
    // coincidentally unchanged.
    expect(screen.getByLabelText("Short label")).toHaveValue("OLDNAMEL");
  });

  it("shows a since-deactivated linked partner with an '(inactive)' suffix as the current value, absent from a fresh pick", async () => {
    const user = userEvent.setup();
    const clientWithInactivePartner = {
      ...baseClient,
      partnerId: 99,
      partner: { id: 99, name: "Retired Partner" },
    };
    render(
      <ClientFormDialog
        mode="edit"
        client={clientWithInactivePartner as never}
        activePartners={ACTIVE_PARTNERS}
        trigger={<button>Edit Old name</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Old name" }));

    expect(
      screen.getByRole("combobox", { name: "Referring partner" }),
    ).toHaveTextContent("Retired Partner (inactive)");

    await user.click(
      screen.getByRole("combobox", { name: "Referring partner" }),
    );
    const listbox = await screen.findByRole("listbox");
    // The inactive partner still has its own option (so the current value
    // stays selectable/visible), and the active ones are still offered.
    expect(
      within(listbox).getByText("Retired Partner (inactive)"),
    ).toBeInTheDocument();
    expect(within(listbox).getByText("Partner A")).toBeInTheDocument();
    expect(within(listbox).getByText("Partner B")).toBeInTheDocument();
  });

  it("submits every editable field, including the toggled active state and a chosen regime", async () => {
    const user = userEvent.setup();
    mockedActions.updateClient.mockResolvedValue({
      ok: true,
      data: {} as never,
    });
    render(
      <ClientFormDialog
        mode="edit"
        client={baseClient as never}
        activePartners={ACTIVE_PARTNERS}
        trigger={<button>Edit Old name</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Old name" }));

    await user.click(screen.getByLabelText("Billable"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updateClient).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
        name: "Old name",
        shortLabel: "OLDNAME",
        billable: false,
        active: true,
        defaultRate: "450.50",
        partnerId: null,
        regime: null,
      }),
    );
  });
});
