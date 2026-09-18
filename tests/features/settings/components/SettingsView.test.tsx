// Tests for `src/features/settings/components/SettingsView.tsx` (design
// `design/v01/v01-003/`): the Settings screen's two read-only sections, each
// with its own "Edit" action.
//
// `useNavigationHistory` is mocked - `RegisterVisit`'s own wiring is the unit
// under test in `tests/components/nav/register-visit.test.tsx`, and this
// component just needs it to not throw for lack of a
// `NavigationHistoryProvider` (`ai-rules/policy_testing.md` -> Relevance:
// mocks replace a boundary, never the unit under test).

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/nav/navigation-history-context", () => ({
  useNavigationHistory: () => ({ registerVisit: vi.fn() }),
}));

import { SettingsView } from "@/features/settings/components/SettingsView";
import type { CompanyProfileRecord } from "@/features/settings/repository";
import type { AppSettingsView } from "@/features/settings/queries";

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

const DEFAULT_SETTINGS: AppSettingsView = {
  hoursPerDay: "7.00",
  roundingStepMinutes: 15,
  invoiceNumberPattern: "YYYY-MM-NNN_Client_mission",
  showMissionCoefficient: false,
  microEstimatedChargeRate: "25.00",
  roundingDirection: "up",
};

const EDITED_SETTINGS: AppSettingsView = {
  hoursPerDay: "8.00",
  roundingStepMinutes: 30,
  invoiceNumberPattern: "CUSTOM-NNN",
  showMissionCoefficient: true,
  microEstimatedChargeRate: "30.00",
  roundingDirection: "up",
};

/** The empty text of a labelled read-only row, found by its accessible label. */
function rowValueText(label: string): string {
  const labelNode = screen.getByText(label);
  const value = labelNode.nextElementSibling;
  return value?.textContent ?? "";
}

describe("SettingsView - layout", () => {
  it("shows a Company profile section and an Application settings section, each with its own Edit action", () => {
    render(
      <SettingsView profile={EMPTY_PROFILE} settings={DEFAULT_SETTINGS} />,
    );

    expect(
      screen.getByRole("heading", { name: "Company profile" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Application settings" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  it("never offers a delete action for either the company profile or any application setting", () => {
    render(
      <SettingsView profile={SAVED_PROFILE} settings={DEFAULT_SETTINGS} />,
    );

    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });
});

describe("SettingsView - Company profile, first use (AD-031)", () => {
  it("shows every field empty, with no error state and no invented placeholder", () => {
    render(
      <SettingsView profile={EMPTY_PROFILE} settings={DEFAULT_SETTINGS} />,
    );

    expect(rowValueText("Legal / trading name")).toBe("");
    expect(rowValueText("SIRET")).toBe("");
    expect(rowValueText("Street")).toBe("");
    expect(rowValueText("Postal code")).toBe("");
    expect(rowValueText("City")).toBe("");
    expect(rowValueText("Contact email")).toBe("");
    expect(rowValueText("Contact phone")).toBe("");
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});

describe("SettingsView - Company profile, after saving", () => {
  it("shows every saved field's exact value", () => {
    render(
      <SettingsView profile={SAVED_PROFILE} settings={DEFAULT_SETTINGS} />,
    );

    expect(rowValueText("Legal / trading name")).toBe("Acme Consulting");
    expect(rowValueText("SIRET")).toBe("12345678901234");
    expect(rowValueText("Street")).toBe("1 Rue Exemple");
    expect(rowValueText("Postal code")).toBe("75001");
    expect(rowValueText("City")).toBe("Paris");
    expect(rowValueText("Contact email")).toBe("contact@acme.test");
    expect(rowValueText("Contact phone")).toBe("0600000000");
  });
});

describe("SettingsView - Application settings, first use defaults (functional spec, step 7)", () => {
  it("shows the bootstrap defaults exactly", () => {
    render(
      <SettingsView profile={EMPTY_PROFILE} settings={DEFAULT_SETTINGS} />,
    );

    expect(rowValueText("Hours per working day")).toBe("7.00 hours");
    expect(rowValueText("Rounding step")).toBe("15 minutes");
    expect(rowValueText("Invoice numbering pattern")).toBe(
      "YYYY-MM-NNN_Client_mission",
    );
    expect(rowValueText("Estimated micro-entreprise charge rate")).toBe(
      "25.00%",
    );
  });
});

describe("SettingsView - Application settings, fields shown only inside the edit form (functional spec, step 5)", () => {
  it("never shows the rounding direction on the plain view, even when other settings are edited", () => {
    render(<SettingsView profile={EMPTY_PROFILE} settings={EDITED_SETTINGS} />);

    // The other settings really did change, proving this is not a stale
    // render - the plain view still has no rounding-direction row at all.
    expect(rowValueText("Hours per working day")).toBe("8.00 hours");
    expect(screen.queryByText("Rounding direction")).not.toBeInTheDocument();
    expect(screen.queryByText("Always up")).not.toBeInTheDocument();
  });

  it("never shows the coefficient-display state on the plain view, whether on or off", () => {
    const { rerender } = render(
      <SettingsView profile={EMPTY_PROFILE} settings={EDITED_SETTINGS} />,
    );

    expect(
      screen.queryByText("Show mission coefficient elsewhere"),
    ).not.toBeInTheDocument();

    rerender(
      <SettingsView profile={EMPTY_PROFILE} settings={DEFAULT_SETTINGS} />,
    );

    expect(
      screen.queryByText("Show mission coefficient elsewhere"),
    ).not.toBeInTheDocument();
  });
});
