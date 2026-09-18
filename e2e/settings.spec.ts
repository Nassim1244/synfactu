// The v01-003 journey: the Settings screen's two sections, each round-
// tripped through a real Server Action, a real database write and the
// resulting Server Component render - the layer combination no lower level
// exercises together (`ai-rules/policy_testing.md` -> End-to-end scope).
//
// Unlike partners/clients (v01-002), `CompanyProfile` and `Setting` are
// singletons: a fixed `id: 1` row and a fixed set of keys, never namespaced
// per test run. This journey therefore never asserts a "before any edit"
// empty/default state - that would depend on whether this is truly the
// first run ever against this shared development database
// (`playwright.config.ts` reuses `pnpm dev`'s server), which is exactly the
// execution-order dependency `ai-rules/policy_testing.md` -> Forbidden
// rules out. That first-use state is instead proven at the repository level
// (AD-031, `tests/features/settings/repository.test.ts`) and the component
// level (`tests/features/settings/components/SettingsView.test.tsx`), both
// of which control the "no row exists yet" precondition directly. What is
// left for this level: the edit-save-persist-reload cycle really works
// end to end, for both sections, against the real thing.
//
// Every value entered below carries `RUN_ID` so a rerun's own assertions
// never coincidentally pass against a previous run's leftover value.

import { expect, test, type Locator, type Page } from "@playwright/test";

const RUN_ID = Date.now();
const LEGAL_NAME = `E2E Settings Co ${RUN_ID}`;
const INVOICE_PATTERN = `YYYY-NNN-${RUN_ID}`;

/** The persistent nav rail, `aria-label="Primary"` (`nav-rail.tsx`). */
function rail(page: Page): Locator {
  return page.getByRole("navigation", { name: "Primary" });
}

/** The currently open dialog. */
function dialogOf(page: Page): Locator {
  return page.getByRole("dialog");
}

test.describe.configure({ mode: "serial" });

test("edits, persists and reloads both Settings sections, with no delete action anywhere", async ({
  page,
}) => {
  await page.goto("/");

  await rail(page).getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL("/settings");
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings" }),
  ).toBeVisible();
  await expect(
    rail(page).getByRole("link", { name: "Settings" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Company profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Application settings" }),
  ).toBeVisible();

  // No delete action exists anywhere on this screen for either section.
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);

  // --- Company profile: unhappy path - a required field left empty --------
  await page
    .getByRole("heading", { name: "Company profile" })
    .locator("..")
    .getByRole("button", { name: "Edit" })
    .click();
  let dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: "Edit company profile" }),
  ).toBeVisible();
  await dialog.getByLabel("Legal / trading name", { exact: true }).fill("");
  await dialog.getByLabel("SIRET", { exact: true }).fill("12345678901234");
  await dialog.getByLabel("Street", { exact: true }).fill("1 Rue Exemple");
  await dialog.getByLabel("Postal code", { exact: true }).fill("75001");
  await dialog.getByLabel("City", { exact: true }).fill("Paris");
  await dialog
    .getByLabel("Contact email", { exact: true })
    .fill("contact@acme.test");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    dialog.getByText("Legal / trading name is required."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Edit company profile" }),
  ).toBeVisible();

  // A SIRET that is not 14 digits is also rejected, naming the field.
  await dialog
    .getByLabel("Legal / trading name", { exact: true })
    .fill(LEGAL_NAME);
  await dialog.getByLabel("SIRET", { exact: true }).fill("123");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    dialog.getByText("SIRET must be exactly 14 digits."),
  ).toBeVisible();

  // --- Company profile: happy path, phone left blank (optional) -----------
  await dialog.getByLabel("SIRET", { exact: true }).fill("12345678901234");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit company profile" }),
  ).not.toBeVisible();

  // The view reflects the new values immediately, with no reload.
  await expect(page.getByText(LEGAL_NAME)).toBeVisible();
  await expect(page.getByText("12345678901234")).toBeVisible();
  await expect(page.getByText("contact@acme.test")).toBeVisible();

  // --- Application settings: unhappy path ----------------------------------
  await page
    .getByRole("heading", { name: "Application settings" })
    .locator("..")
    .getByRole("button", { name: "Edit" })
    .click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: "Edit application settings" }),
  ).toBeVisible();

  // The rounding direction is shown, fixed, with no control to change it -
  // inside the edit form only, at first use before any edit. The plain view
  // never shows it (checked once the dialog is closed below).
  const roundingDirectionField = dialog.getByLabel("Rounding direction");
  await expect(roundingDirectionField).toHaveValue("Always up");
  await expect(roundingDirectionField).toBeDisabled();
  await expect(
    dialog.getByRole("switch", {
      name: "Show the mission time-adjustment coefficient elsewhere in the product",
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Rounding direction")).toHaveCount(0);
  await expect(
    page.getByText("Show mission coefficient elsewhere"),
  ).toHaveCount(0);
  await page
    .getByRole("heading", { name: "Application settings" })
    .locator("..")
    .getByRole("button", { name: "Edit" })
    .click();
  dialog = dialogOf(page);

  await dialog.getByLabel("Hours per working day").fill("0");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Must be a positive number.")).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Edit application settings" }),
  ).toBeVisible();

  // --- Application settings: happy path, including the coefficient toggle -
  await dialog.getByLabel("Hours per working day").fill("8");
  await dialog.getByLabel("Rounding step (minutes)").fill("30");
  await dialog.getByLabel("Invoice numbering pattern").fill(INVOICE_PATTERN);
  const coefficientToggle = dialog.getByRole("switch", {
    name: "Show the mission time-adjustment coefficient elsewhere in the product",
  });
  const coefficientWasOn = await coefficientToggle.isChecked();
  if (coefficientWasOn) {
    await coefficientToggle.click();
  }
  await dialog
    .getByLabel("Estimated micro-entreprise charge rate (%)")
    .fill("30");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit application settings" }),
  ).not.toBeVisible();

  // The view reflects every new value immediately, with no reload. The
  // rounding direction and the coefficient state are never on this plain
  // view - only the edit form shows them (checked below).
  await expect(page.getByText("8.00 hours")).toBeVisible();
  await expect(page.getByText("30 minutes")).toBeVisible();
  await expect(page.getByText(INVOICE_PATTERN)).toBeVisible();
  await expect(page.getByText("30.00%")).toBeVisible();
  await expect(page.getByText("Rounding direction")).toHaveCount(0);
  await expect(page.getByText("Always up")).toHaveCount(0);
  await expect(
    page.getByText("Show mission coefficient elsewhere"),
  ).toHaveCount(0);

  // Reopening the edit form still shows the rounding direction fixed,
  // read-only, and now confirms the coefficient toggle saved as off.
  await page
    .getByRole("heading", { name: "Application settings" })
    .locator("..")
    .getByRole("button", { name: "Edit" })
    .click();
  dialog = dialogOf(page);
  await expect(dialog.getByLabel("Rounding direction")).toHaveValue(
    "Always up",
  );
  await expect(
    dialog.getByRole("switch", {
      name: "Show the mission time-adjustment coefficient elsewhere in the product",
    }),
  ).not.toBeChecked();

  // --- The coefficient toggle round-trips: switch it on and save again ----
  await dialog
    .getByRole("switch", {
      name: "Show the mission time-adjustment coefficient elsewhere in the product",
    })
    .click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit application settings" }),
  ).not.toBeVisible();

  // The plain view still never shows either field after this second save.
  await expect(page.getByText("Rounding direction")).toHaveCount(0);
  await expect(
    page.getByText("Show mission coefficient elsewhere"),
  ).toHaveCount(0);

  // Reopening the edit form confirms the coefficient toggle really saved on.
  await page
    .getByRole("heading", { name: "Application settings" })
    .locator("..")
    .getByRole("button", { name: "Edit" })
    .click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("switch", {
      name: "Show the mission time-adjustment coefficient elsewhere in the product",
    }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // --- Persistence across navigating away and back -------------------------
  await rail(page).getByRole("link", { name: "Partners" }).click();
  await expect(page).toHaveURL("/partners");
  await rail(page).getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL("/settings");
  await expect(page.getByText(LEGAL_NAME)).toBeVisible();
  await expect(page.getByText("8.00 hours")).toBeVisible();
  await expect(page.getByText(INVOICE_PATTERN)).toBeVisible();
  await expect(page.getByText("Rounding direction")).toHaveCount(0);
  await expect(
    page.getByText("Show mission coefficient elsewhere"),
  ).toHaveCount(0);
  await page
    .getByRole("heading", { name: "Application settings" })
    .locator("..")
    .getByRole("button", { name: "Edit" })
    .click();
  dialog = dialogOf(page);
  await expect(dialog.getByLabel("Rounding direction")).toHaveValue(
    "Always up",
  );
  await expect(
    dialog.getByRole("switch", {
      name: "Show the mission time-adjustment coefficient elsewhere in the product",
    }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // --- Persistence across a fresh page load ---------------------------------
  await page.reload();
  await expect(page.getByText(LEGAL_NAME)).toBeVisible();
  await expect(page.getByText("12345678901234")).toBeVisible();
  await expect(page.getByText("8.00 hours")).toBeVisible();
  await expect(page.getByText("30 minutes")).toBeVisible();
  await expect(page.getByText(INVOICE_PATTERN)).toBeVisible();
  await expect(page.getByText("30.00%")).toBeVisible();
  await expect(page.getByText("Rounding direction")).toHaveCount(0);
  await expect(
    page.getByText("Show mission coefficient elsewhere"),
  ).toHaveCount(0);
  await page
    .getByRole("heading", { name: "Application settings" })
    .locator("..")
    .getByRole("button", { name: "Edit" })
    .click();
  dialog = dialogOf(page);
  await expect(dialog.getByLabel("Rounding direction")).toHaveValue(
    "Always up",
  );
  await expect(
    dialog.getByRole("switch", {
      name: "Show the mission time-adjustment coefficient elsewhere in the product",
    }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // Still no delete action anywhere, after every edit above.
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
});
