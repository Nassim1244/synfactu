// Tests for
// `src/features/settings/components/CompanyProfileEditForm.tsx` (design
// `design/v01/v01-003/`, "Edit company profile"). The Server Action boundary
// (`../actions`) is mocked - the dialog's own logic (pre-fill, validation
// timing, the optional-phone rule, submit wiring) is the unit under test,
// not the network round trip.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/settings/actions");

import { CompanyProfileEditForm } from "@/features/settings/components/CompanyProfileEditForm";
import * as actions from "@/features/settings/actions";
import type { CompanyProfileRecord } from "@/features/settings/repository";
import { installRadixPolyfills } from "../../../support/radixPolyfills";

installRadixPolyfills();

const mockedActions = vi.mocked(actions);

const EMPTY_PROFILE: CompanyProfileRecord = {
  legalName: null,
  siret: null,
  street: null,
  postalCode: null,
  city: null,
  email: null,
  phone: null,
};

const SAVED_PROFILE: CompanyProfileRecord = {
  legalName: "Acme Consulting",
  siret: "12345678901234",
  street: "1 Rue Exemple",
  postalCode: "75001",
  city: "Paris",
  email: "contact@acme.test",
  phone: "0600000000",
};

afterEach(() => {
  vi.clearAllMocks();
});

async function openDialog(
  user: ReturnType<typeof userEvent.setup>,
  profile: CompanyProfileRecord,
) {
  render(
    <CompanyProfileEditForm
      profile={profile}
      trigger={<button>Open</button>}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Open" }));
}

/** Fills every required field with a valid value, leaving phone untouched. */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText("Legal / trading name"),
    "Acme Consulting",
  );
  await user.type(screen.getByLabelText("SIRET"), "12345678901234");
  await user.type(screen.getByLabelText("Street"), "1 Rue Exemple");
  await user.type(screen.getByLabelText("Postal code"), "75001");
  await user.type(screen.getByLabelText("City"), "Paris");
  await user.type(screen.getByLabelText("Contact email"), "contact@acme.test");
}

describe("CompanyProfileEditForm - first use, before any edit (AD-031)", () => {
  it("opens with the title 'Edit company profile' and every field empty, not an error state", async () => {
    const user = userEvent.setup();
    await openDialog(user, EMPTY_PROFILE);

    expect(
      screen.getByRole("heading", { name: "Edit company profile" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Legal / trading name")).toHaveValue("");
    expect(screen.getByLabelText("SIRET")).toHaveValue("");
    expect(screen.getByLabelText("Street")).toHaveValue("");
    expect(screen.getByLabelText("Postal code")).toHaveValue("");
    expect(screen.getByLabelText("City")).toHaveValue("");
    expect(screen.getByLabelText("Contact email")).toHaveValue("");
    expect(screen.getByLabelText("Contact phone (optional)")).toHaveValue("");
  });
});

describe("CompanyProfileEditForm - pre-fill from a saved profile", () => {
  it("opens pre-filled with every current field's value", async () => {
    const user = userEvent.setup();
    await openDialog(user, SAVED_PROFILE);

    expect(screen.getByLabelText("Legal / trading name")).toHaveValue(
      "Acme Consulting",
    );
    expect(screen.getByLabelText("SIRET")).toHaveValue("12345678901234");
    expect(screen.getByLabelText("Contact phone (optional)")).toHaveValue(
      "0600000000",
    );
  });
});

describe("CompanyProfileEditForm - required-field validation", () => {
  it("rejects saving a blank form, naming every failing required field, without calling the action", async () => {
    const user = userEvent.setup();
    await openDialog(user, EMPTY_PROFILE);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Legal / trading name is required."),
    ).toBeInTheDocument();
    expect(screen.getByText("SIRET is required.")).toBeInTheDocument();
    expect(screen.getByText("Street is required.")).toBeInTheDocument();
    expect(screen.getByText("Postal code is required.")).toBeInTheDocument();
    expect(screen.getByText("City is required.")).toBeInTheDocument();
    expect(screen.getByText("Contact email is required.")).toBeInTheDocument();
    expect(mockedActions.updateCompanyProfile).not.toHaveBeenCalled();
  });

  it("creates no change: the dialog stays open on 'Edit company profile' after a rejected save", async () => {
    const user = userEvent.setup();
    await openDialog(user, EMPTY_PROFILE);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByRole("heading", { name: "Edit company profile" }),
    ).toBeInTheDocument();
  });
});

describe("CompanyProfileEditForm - SIRET and email format validation", () => {
  it("rejects a SIRET that is not exactly 14 digits, naming the field, without calling the action", async () => {
    const user = userEvent.setup();
    await openDialog(user, EMPTY_PROFILE);
    await fillRequiredFields(user);
    await user.clear(screen.getByLabelText("SIRET"));
    await user.type(screen.getByLabelText("SIRET"), "12345");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("SIRET must be exactly 14 digits."),
    ).toBeInTheDocument();
    expect(mockedActions.updateCompanyProfile).not.toHaveBeenCalled();
  });

  it("rejects an email that is not a valid address, naming the field, without calling the action", async () => {
    const user = userEvent.setup();
    await openDialog(user, EMPTY_PROFILE);
    await fillRequiredFields(user);
    await user.clear(screen.getByLabelText("Contact email"));
    // "a@bcom" rather than e.g. "not-an-email": the field's native
    // `type="email"` makes a real browser (and jsdom) refuse to submit the
    // form at all for a value its own, looser built-in pattern rejects,
    // before this component's `onSubmit` ever runs - that path is proven at
    // the schema level instead (`schema.test.ts`), independent of any DOM
    // behaviour. "a@bcom" passes the native check but still has no TLD, so
    // `companyProfileSchema`'s own `.email()` still rejects it.
    await user.type(screen.getByLabelText("Contact email"), "a@bcom");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(mockedActions.updateCompanyProfile).not.toHaveBeenCalled();
  });
});

describe("CompanyProfileEditForm - phone is optional", () => {
  it("saves successfully with phone left blank when every other required field is valid", async () => {
    const user = userEvent.setup();
    mockedActions.updateCompanyProfile.mockResolvedValue({
      ok: true,
      data: SAVED_PROFILE,
    });
    await openDialog(user, EMPTY_PROFILE);
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updateCompanyProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        legalName: "Acme Consulting",
        siret: "12345678901234",
        street: "1 Rue Exemple",
        postalCode: "75001",
        city: "Paris",
        email: "contact@acme.test",
        phone: "",
      }),
    );
  });
});

describe("CompanyProfileEditForm - successful save", () => {
  it("saves every field and closes the dialog", async () => {
    const user = userEvent.setup();
    mockedActions.updateCompanyProfile.mockResolvedValue({
      ok: true,
      data: SAVED_PROFILE,
    });
    await openDialog(user, EMPTY_PROFILE);
    await fillRequiredFields(user);
    await user.type(
      screen.getByLabelText("Contact phone (optional)"),
      "0600000000",
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedActions.updateCompanyProfile).toHaveBeenCalledWith({
      legalName: "Acme Consulting",
      siret: "12345678901234",
      street: "1 Rue Exemple",
      postalCode: "75001",
      city: "Paris",
      email: "contact@acme.test",
      phone: "0600000000",
    });
    await screen.findByRole("button", { name: "Open" });
    expect(
      screen.queryByRole("heading", { name: "Edit company profile" }),
    ).not.toBeInTheDocument();
  });
});

describe("CompanyProfileEditForm - save failure", () => {
  it("keeps the dialog open with entered data intact and shows an Alert", async () => {
    const user = userEvent.setup();
    mockedActions.updateCompanyProfile.mockResolvedValue({
      ok: false,
      error: "SAVE_FAILED",
    });
    await openDialog(user, EMPTY_PROFILE);
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Could not save the company profile. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Legal / trading name")).toHaveValue(
      "Acme Consulting",
    );
    expect(
      screen.getByRole("heading", { name: "Edit company profile" }),
    ).toBeInTheDocument();
  });
});
