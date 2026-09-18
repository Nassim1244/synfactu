// Tests for
// `src/features/referential/components/portage-contracts/PortageContractFormDialog.tsx`
// (design v01-004). The Server Action boundary
// (`../../portage-contracts.actions`) is mocked; `portageContractSchema` is
// real, since the field-local validation it drives - required fields, the
// charge-rate range, and end-before-start - is exactly what this dialog is
// responsible for wiring correctly.
//
// Native `<input type="date">` fields are set with `fireEvent.change`
// rather than `user.type`: jsdom's date input does not reliably accept
// character-by-character typing the way a real browser's date-picker UI
// does, but it does accept a direct value assignment, exactly like a real
// browser accepts a typed `YYYY-MM-DD` value once complete.
//
// This form's `useForm<PortageContractFormValues, unknown,
// PortageContractInput>` gives `zodResolver` a *transformed* output type
// (`PortageContractInput`, with `validFrom`/`validTo` already `Date`s) as
// its third generic, and `@hookform/resolvers/zod` really does hand
// `handleSubmit`'s callback that parsed output, not the raw form strings
// (confirmed against `node_modules/@hookform/resolvers/zod`: the resolver
// returns `values: schema.parse(input)`). So every assertion below on what
// reaches the mocked action expects `validFrom`/`validTo` as `Date`s, or
// `undefined` for an unset `validTo` - never the `YYYY-MM-DD` string typed
// into the field. `chargeRate` carries no `.transform()` in the schema and
// so stays the plain string the user typed - except that jsdom's own
// `type="number"` value sanitisation drops an insignificant trailing zero
// (`"24.60"` typed becomes `"24.6"`), which is a jsdom quirk, not
// application behaviour, so every typed rate below is written without one.

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/referential/portage-contracts.actions");

import { PortageContractFormDialog } from "@/features/referential/components/portage-contracts/PortageContractFormDialog";
import * as actions from "@/features/referential/portage-contracts.actions";
import { installRadixPolyfills } from "../../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

const FAKE_CONTRACT = {
  id: 1,
  label: "Contract A",
  companyName: "Portage Co",
  chargeRateBasisPoints: 2460,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null,
  active: true,
};

afterEach(() => {
  vi.clearAllMocks();
});

async function openCreateDialog(user: ReturnType<typeof userEvent.setup>) {
  render(
    <PortageContractFormDialog
      mode="create"
      trigger={<button>New portage contract</button>}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "New portage contract" }),
  );
}

async function fillRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.type(screen.getByLabelText("Label"), "Contract A");
  await user.type(screen.getByLabelText("Company name"), "Portage Co");
  await user.type(screen.getByLabelText("Charge rate (%)"), "24.6");
  fireEvent.change(screen.getByLabelText("Valid from"), {
    target: { value: "2026-01-01" },
  });
}

describe("PortageContractFormDialog - create mode", () => {
  it("opens with the title 'New portage contract' and every field blank", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    expect(
      screen.getByRole("heading", { name: "New portage contract" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toHaveValue("");
    expect(screen.getByLabelText("Company name")).toHaveValue("");
  });

  it("rejects every required field left empty, each with its own message", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Label is required.")).toBeInTheDocument();
    expect(screen.getByText("Company name is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Enter a percentage between 0 and 100."),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter a valid date.")).toBeInTheDocument();
    expect(mockedActions.createPortageContractAction).not.toHaveBeenCalled();
  });

  it.each(["0", "101", "150"])(
    "rejects the charge rate %j with the range message",
    async (chargeRate) => {
      const user = userEvent.setup();
      await openCreateDialog(user);
      await user.type(screen.getByLabelText("Label"), "Contract A");
      await user.type(screen.getByLabelText("Company name"), "Portage Co");
      await user.type(screen.getByLabelText("Charge rate (%)"), chargeRate);

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(
        screen.getByText("Enter a percentage between 0 and 100."),
      ).toBeInTheDocument();
      expect(mockedActions.createPortageContractAction).not.toHaveBeenCalled();
    },
  );

  it("rejects an end date earlier than the start date, naming the end date field", async () => {
    const user = userEvent.setup();
    await openCreateDialog(user);
    await fillRequiredFields(user);
    fireEvent.change(screen.getByLabelText("Valid until (optional)"), {
      target: { value: "2025-12-31" },
    });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("End date must be on or after the start date."),
    ).toBeInTheDocument();
    expect(mockedActions.createPortageContractAction).not.toHaveBeenCalled();
  });

  it("accepts an end date equal to the start date", async () => {
    const user = userEvent.setup();
    mockedActions.createPortageContractAction.mockResolvedValue({
      ok: true,
      data: FAKE_CONTRACT,
    });
    await openCreateDialog(user);
    await fillRequiredFields(user);
    fireEvent.change(screen.getByLabelText("Valid until (optional)"), {
      target: { value: "2026-01-01" },
    });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.createPortageContractAction).toHaveBeenCalledWith(
      expect.objectContaining({
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: new Date("2026-01-01T00:00:00.000Z"),
      }),
    );
  });

  it("creates the contract, active by default and open-ended, on the minimum required fields", async () => {
    const user = userEvent.setup();
    mockedActions.createPortageContractAction.mockResolvedValue({
      ok: true,
      data: FAKE_CONTRACT,
    });
    await openCreateDialog(user);
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.createPortageContractAction).toHaveBeenCalledWith({
      label: "Contract A",
      companyName: "Portage Co",
      chargeRate: "24.6",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: undefined,
    });
  });

  it("shows an Alert and keeps the dialog open when the save fails", async () => {
    const user = userEvent.setup();
    mockedActions.createPortageContractAction.mockResolvedValue({
      ok: false,
      error: "SAVE_FAILED",
    });
    await openCreateDialog(user);
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Could not save this portage contract. Try again.",
      ),
    ).toBeInTheDocument();
  });
});

describe("PortageContractFormDialog - edit mode", () => {
  const contract = {
    id: 5,
    label: "Contract A",
    companyName: "Portage Co",
    chargeRatePercent: "24.60",
    validFrom: "2026-01-01",
    validTo: null as string | null,
    active: true,
  };

  it("pre-fills every field from the record", async () => {
    const user = userEvent.setup();
    render(
      <PortageContractFormDialog
        mode="edit"
        contract={contract}
        trigger={<button>Edit Contract A</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Contract A" }));

    expect(
      screen.getByRole("heading", { name: "Edit portage contract Contract A" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Label")).toHaveValue("Contract A");
    expect(screen.getByLabelText("Company name")).toHaveValue("Portage Co");
    expect(screen.getByLabelText("Charge rate (%)")).toHaveValue(24.6);
    expect(screen.getByLabelText("Valid from")).toHaveValue("2026-01-01");
  });

  it("submits a changed charge rate and a changed end date - no field is locked once set", async () => {
    const user = userEvent.setup();
    mockedActions.updatePortageContractAction.mockResolvedValue({
      ok: true,
      data: FAKE_CONTRACT,
    });
    render(
      <PortageContractFormDialog
        mode="edit"
        contract={contract}
        trigger={<button>Edit Contract A</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Contract A" }));

    await user.clear(screen.getByLabelText("Charge rate (%)"));
    await user.type(screen.getByLabelText("Charge rate (%)"), "35");
    fireEvent.change(screen.getByLabelText("Valid until (optional)"), {
      target: { value: "2026-12-31" },
    });
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updatePortageContractAction).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        chargeRate: "35",
        validTo: new Date("2026-12-31T00:00:00.000Z"),
      }),
    );
  });

  it("rejects a charge rate edited past 100", async () => {
    const user = userEvent.setup();
    render(
      <PortageContractFormDialog
        mode="edit"
        contract={contract}
        trigger={<button>Edit Contract A</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Contract A" }));

    await user.clear(screen.getByLabelText("Charge rate (%)"));
    await user.type(screen.getByLabelText("Charge rate (%)"), "150");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Enter a percentage between 0 and 100."),
    ).toBeInTheDocument();
    expect(mockedActions.updatePortageContractAction).not.toHaveBeenCalled();
  });

  it("has no delete control anywhere in the dialog", async () => {
    const user = userEvent.setup();
    render(
      <PortageContractFormDialog
        mode="edit"
        contract={contract}
        trigger={<button>Edit Contract A</button>}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit Contract A" }));

    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });
});
