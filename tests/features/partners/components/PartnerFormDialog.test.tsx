// Tests for `src/features/partners/components/PartnerFormDialog.tsx` (design
// v01-001, screen 3). The Server Action boundary (`../actions`) is mocked -
// the dialog's own logic (validation timing, error clearing, submit wiring)
// is the unit under test, not the network round trip.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/partners/actions");

import { PartnerFormDialog } from "@/features/partners/components/PartnerFormDialog";
import * as actions from "@/features/partners/actions";
import { installRadixPolyfills } from "../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

afterEach(() => {
  vi.clearAllMocks();
});

describe("PartnerFormDialog - create mode", () => {
  it("opens with the title 'New partner' and no Active control", async () => {
    const user = userEvent.setup();
    render(<PartnerFormDialog mode="create" trigger={<button>Open</button>} />);

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(
      screen.getByRole("heading", { name: "New partner" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("rejects an empty name on submit with an inline, field-local message and aria-invalid", async () => {
    const user = userEvent.setup();
    render(<PartnerFormDialog mode="create" trigger={<button>Open</button>} />);
    await user.click(screen.getByRole("button", { name: "Open" }));

    await user.click(screen.getByRole("button", { name: "Save" }));

    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(mockedActions.createPartner).not.toHaveBeenCalled();
  });

  it("clears the error live as soon as the field is corrected", async () => {
    const user = userEvent.setup();
    render(<PartnerFormDialog mode="create" trigger={<button>Open</button>} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Name is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "Acme");

    expect(screen.queryByText("Name is required.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("creates the partner with the trimmed name and closes the dialog on success", async () => {
    const user = userEvent.setup();
    mockedActions.createPartner.mockResolvedValue({
      ok: true,
      data: { id: 1, name: "Acme", active: true },
    });
    render(<PartnerFormDialog mode="create" trigger={<button>Open</button>} />);
    await user.click(screen.getByRole("button", { name: "Open" }));

    await user.type(screen.getByLabelText("Name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.createPartner).toHaveBeenCalledWith({
      name: "Acme",
    });
    await screen.findByRole("button", { name: "Open" });
    expect(
      screen.queryByRole("heading", { name: "New partner" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the dialog open with entered data intact and shows an Alert when the save fails", async () => {
    const user = userEvent.setup();
    mockedActions.createPartner.mockResolvedValue({
      ok: false,
      error: "SAVE_FAILED",
    });
    render(<PartnerFormDialog mode="create" trigger={<button>Open</button>} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.type(screen.getByLabelText("Name"), "Acme");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Could not save this partner. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Acme");
    expect(
      screen.getByRole("heading", { name: "New partner" }),
    ).toBeInTheDocument();
  });
});

describe("PartnerFormDialog - edit mode", () => {
  const partner = {
    id: 7,
    name: "Old name",
    active: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("opens pre-filled, titled with the partner's current name, and shows the Active switch", async () => {
    const user = userEvent.setup();
    render(
      <PartnerFormDialog
        mode="edit"
        partner={partner}
        trigger={<button>Edit Old name</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Old name" }));

    expect(
      screen.getByRole("heading", { name: "Edit partner Old name" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Old name");
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("submits the updated name and the toggled active state", async () => {
    const user = userEvent.setup();
    mockedActions.updatePartner.mockResolvedValue({
      ok: true,
      data: { ...partner, name: "New name", active: false },
    });
    render(
      <PartnerFormDialog
        mode="edit"
        partner={partner}
        trigger={<button>Edit Old name</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Old name" }));

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "New name");
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updatePartner).toHaveBeenCalledWith({
      id: 7,
      name: "New name",
      active: false,
    });
  });
});
