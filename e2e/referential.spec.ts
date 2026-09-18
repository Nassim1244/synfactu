// The v01-004 journey: the Referential screen's three sections, each round-
// tripped through a real Server Action, a real database write and the
// resulting Server Component render - the layer combination no lower level
// exercises together (`ai-rules/policy_testing.md` -> End-to-end scope).
//
// Unlike partners/clients (v01-002), this journey never asserts a "before
// any edit" empty state for Portage contracts or Tags: this run reuses
// `pnpm dev`'s own persistent database (`playwright.config.ts`), so after
// the very first ever run neither list is genuinely empty any more - the
// same reasoning `settings.spec.ts` documents for its own singleton rows.
// That first-use state (an empty result set, no bootstrap seed) is instead
// proven at the repository level, against a database this suite controls
// directly (`tests/features/referential/portage-contracts.repository.test.ts`,
// `tests/features/tags/repository.test.ts`). Mission categories are the
// opposite case - never empty, by design (AD-033's three bootstrap rows,
// no delete anywhere) - so this journey does assert their presence.
//
// Every name created here carries `RUN_ID` so a rerun's own assertions
// never coincidentally pass against a previous run's leftover rows.

import { expect, test, type Locator, type Page } from "@playwright/test";

const RUN_ID = Date.now();
const CATEGORY_LABEL = `E2E Category ${RUN_ID}`;
const CATEGORY_RENAMED = `E2E Category Renamed ${RUN_ID}`;
const CONTRACT_A_LABEL = `E2E Contract A ${RUN_ID}`;
const CONTRACT_B_LABEL = `E2E Contract B ${RUN_ID}`;
const SAME_COMPANY = `E2E Portage Co ${RUN_ID}`;
const PARENT_TAG_LABEL = `e2eparent${RUN_ID}`;
const CHILD_TAG_LABEL = `e2echild${RUN_ID}`;
const PARENT_TAG_RENAMED = `e2eparentrenamed${RUN_ID}`;

/** The persistent nav rail, `aria-label="Primary"` (`nav-rail.tsx`). */
function rail(page: Page): Locator {
  return page.getByRole("navigation", { name: "Primary" });
}

/** The `<tr>` for a list row, matched by its visible text. */
function row(page: Page, text: string): Locator {
  return page.getByRole("row").filter({ hasText: text });
}

/** The currently open dialog - every field lookup below is scoped to it. */
function dialogOf(page: Page): Locator {
  return page.getByRole("dialog");
}

test.describe.configure({ mode: "serial" });

test("manages mission categories, portage contracts and tags end to end, with no delete anywhere", async ({
  page,
}) => {
  await page.goto("/");
  await rail(page)
    .getByRole("link", { name: "Referential", exact: true })
    .click();
  await expect(page).toHaveURL("/referential");
  await expect(
    page.getByRole("heading", { level: 1, name: "Referential" }),
  ).toBeVisible();
  await expect(
    rail(page).getByRole("link", { name: "Referential" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Mission categories" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Portage contracts" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();

  // --- Mission categories: the bootstrap seed is always present ----------
  await expect(row(page, "Formation école")).toBeVisible();
  await expect(row(page, "Formation pro")).toBeVisible();
  await expect(row(page, "Conseil")).toBeVisible();

  // --- Mission categories: unhappy path - an empty label creates nothing -
  await page.getByRole("button", { name: "New mission category" }).click();
  let dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: "New mission category" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Label is required.")).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "New mission category" }),
  ).toBeVisible();

  // --- Mission categories: happy path -------------------------------------
  await dialog.getByLabel("Label").fill(CATEGORY_LABEL);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "New mission category" }),
  ).not.toBeVisible();
  const categoryRow = row(page, CATEGORY_LABEL);
  await expect(categoryRow).toBeVisible();
  await expect(categoryRow.getByText("Active", { exact: true })).toBeVisible();

  // --- Mission categories: edit persists the new label --------------------
  await categoryRow.getByRole("button", { name: "Edit" }).click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", {
      name: `Edit mission category ${CATEGORY_LABEL}`,
    }),
  ).toBeVisible();
  await dialog.getByLabel("Label").fill(CATEGORY_RENAMED);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(row(page, CATEGORY_RENAMED)).toBeVisible();
  await expect(row(page, CATEGORY_LABEL)).not.toBeVisible();

  // --- Mission categories: deactivate / reactivate, never a delete -------
  const renamedCategoryRow = row(page, CATEGORY_RENAMED);
  await renamedCategoryRow
    .getByRole("switch", { name: `Deactivate ${CATEGORY_RENAMED}` })
    .click();
  await expect(
    renamedCategoryRow.getByText("Inactive", { exact: true }),
  ).toBeVisible();
  await renamedCategoryRow
    .getByRole("switch", { name: `Reactivate ${CATEGORY_RENAMED}` })
    .click();
  await expect(
    renamedCategoryRow.getByText("Active", { exact: true }),
  ).toBeVisible();

  // --- Portage contracts: unhappy path - every required field empty ------
  await page
    .getByRole("button", { name: "New portage contract" })
    .first()
    .click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: "New portage contract" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Label is required.")).toBeVisible();
  await expect(dialog.getByText("Company name is required.")).toBeVisible();
  await expect(
    dialog.getByText("Enter a percentage between 0 and 100."),
  ).toBeVisible();
  await expect(dialog.getByText("Enter a valid date.")).toBeVisible();

  // --- Portage contracts: charge-rate bounds ------------------------------
  await dialog.getByLabel("Label").fill(CONTRACT_A_LABEL);
  await dialog.getByLabel("Company name").fill(SAME_COMPANY);
  await dialog.getByLabel("Valid from").fill("2026-01-01");
  await dialog.getByLabel("Charge rate (%)").fill("0");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    dialog.getByText("Enter a percentage between 0 and 100."),
  ).toBeVisible();
  await dialog.getByLabel("Charge rate (%)").fill("101");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    dialog.getByText("Enter a percentage between 0 and 100."),
  ).toBeVisible();

  // --- Portage contracts: end date earlier than start date ----------------
  await dialog.getByLabel("Charge rate (%)").fill("24.60");
  await dialog.getByLabel("Valid until (optional)").fill("2025-12-31");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    dialog.getByText("End date must be on or after the start date."),
  ).toBeVisible();

  // --- Portage contracts: happy path --------------------------------------
  await dialog.getByLabel("Valid until (optional)").fill("2026-06-30");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "New portage contract" }),
  ).not.toBeVisible();
  const contractARow = row(page, CONTRACT_A_LABEL);
  await expect(contractARow).toBeVisible();
  await expect(contractARow.getByText(SAME_COMPANY)).toBeVisible();
  await expect(contractARow.getByText("24.60 %")).toBeVisible();
  await expect(contractARow.getByText("2026-01-01")).toBeVisible();

  // --- Portage contracts: overlapping periods, same company, are allowed -
  await page
    .getByRole("button", { name: "New portage contract" })
    .first()
    .click();
  dialog = dialogOf(page);
  await dialog.getByLabel("Label").fill(CONTRACT_B_LABEL);
  await dialog.getByLabel("Company name").fill(SAME_COMPANY);
  await dialog.getByLabel("Charge rate (%)").fill("30");
  await dialog.getByLabel("Valid from").fill("2026-04-01");
  await dialog.getByLabel("Valid until (optional)").fill("2026-12-31");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "New portage contract" }),
  ).not.toBeVisible();
  // No warning, no rejection: both contracts, overlapping and for the same
  // company, are simply both in the list.
  await expect(row(page, CONTRACT_A_LABEL)).toBeVisible();
  await expect(row(page, CONTRACT_B_LABEL)).toBeVisible();

  // --- Portage contracts: every field is editable at any time ------------
  await contractARow.getByRole("button", { name: "Edit" }).click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", {
      name: `Edit portage contract ${CONTRACT_A_LABEL}`,
    }),
  ).toBeVisible();
  await dialog.getByLabel("Charge rate (%)").fill("45.00");
  await dialog.getByLabel("Valid until (optional)").fill("2027-01-31");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(contractARow.getByText("45.00 %")).toBeVisible();
  await expect(contractARow.getByText("2027-01-31")).toBeVisible();

  // --- Portage contracts: deactivate / reactivate, never a delete --------
  await contractARow
    .getByRole("switch", { name: `Deactivate ${CONTRACT_A_LABEL}` })
    .click();
  await expect(
    contractARow.getByText("Inactive", { exact: true }),
  ).toBeVisible();
  await contractARow
    .getByRole("switch", { name: `Reactivate ${CONTRACT_A_LABEL}` })
    .click();
  await expect(contractARow.getByText("Active", { exact: true })).toBeVisible();

  // --- Tags: unhappy path - an empty label creates nothing ----------------
  await page.getByRole("button", { name: "New tag" }).first().click();
  dialog = dialogOf(page);
  await expect(dialog.getByRole("heading", { name: "New tag" })).toBeVisible();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Label is required.")).toBeVisible();

  // --- Tags: creates a top-level tag whose path equals the label ----------
  await dialog.getByLabel("Label").fill(PARENT_TAG_LABEL);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "New tag" }),
  ).not.toBeVisible();
  const parentTagRow = row(page, PARENT_TAG_LABEL);
  await expect(parentTagRow).toBeVisible();
  await expect(
    parentTagRow.getByText(PARENT_TAG_LABEL, { exact: true }),
  ).toBeVisible();

  // --- Tags: duplicate top-level path is rejected -------------------------
  await page.getByRole("button", { name: "New tag" }).first().click();
  dialog = dialogOf(page);
  await dialog.getByLabel("Label").fill(PARENT_TAG_LABEL);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    dialog.getByText("A tag with this label already exists under this parent."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // --- Tags: creates a child tag whose path is parent::label --------------
  await page.getByRole("button", { name: "New tag" }).first().click();
  dialog = dialogOf(page);
  await dialog.getByRole("combobox", { name: "Parent tag" }).click();
  await page.getByRole("option", { name: PARENT_TAG_LABEL }).click();
  await dialog.getByLabel("Label").fill(CHILD_TAG_LABEL);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "New tag" }),
  ).not.toBeVisible();
  const composedPath = `${PARENT_TAG_LABEL}::${CHILD_TAG_LABEL}`;
  await expect(page.getByText(composedPath, { exact: true })).toBeVisible();

  // --- Tags: renaming the parent cascades to the child's stored path ------
  await parentTagRow.getByRole("button", { name: "Edit" }).click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: `Edit tag ${PARENT_TAG_LABEL}` }),
  ).toBeVisible();
  // No control to change the parent - only the label field and its Label.
  await expect(dialog.getByRole("combobox")).toHaveCount(0);
  await dialog.getByLabel("Label").fill(PARENT_TAG_RENAMED);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByText(PARENT_TAG_RENAMED, { exact: true }),
  ).toBeVisible();
  const cascadedChildPath = `${PARENT_TAG_RENAMED}::${CHILD_TAG_LABEL}`;
  await expect(
    page.getByText(cascadedChildPath, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(composedPath, { exact: true })).not.toBeVisible();

  // --- Tags: the parent picker offers only active tags --------------------
  const renamedParentRow = row(page, PARENT_TAG_RENAMED).first();
  await renamedParentRow
    .getByRole("switch", { name: `Deactivate ${PARENT_TAG_RENAMED}` })
    .click();
  await expect(
    renamedParentRow.getByText("Inactive", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New tag" }).first().click();
  dialog = dialogOf(page);
  await dialog.getByRole("combobox", { name: "Parent tag" }).click();
  await expect(
    page.getByRole("option", { name: PARENT_TAG_RENAMED }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // --- Tags: deactivating a tag leaves its active children's flag intact -
  const childTagRow = row(page, cascadedChildPath);
  await expect(childTagRow.getByText("Active", { exact: true })).toBeVisible();

  // Reactivate the parent to leave the fixture in a known state before the
  // final page-wide checks below.
  await renamedParentRow
    .getByRole("switch", { name: `Reactivate ${PARENT_TAG_RENAMED}` })
    .click();
  await expect(
    renamedParentRow.getByText("Active", { exact: true }),
  ).toBeVisible();

  // --- No delete action exists anywhere on this whole screen --------------
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);

  // --- Persistence across navigating away, back, and a fresh page load ----
  await rail(page).getByRole("link", { name: "Clients" }).click();
  await expect(page).toHaveURL("/clients");
  await rail(page)
    .getByRole("link", { name: "Referential", exact: true })
    .click();
  await expect(page).toHaveURL("/referential");
  await expect(row(page, CATEGORY_RENAMED)).toBeVisible();
  await expect(row(page, CONTRACT_A_LABEL)).toBeVisible();
  await expect(
    page.getByText(PARENT_TAG_RENAMED, { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(row(page, CATEGORY_RENAMED)).toBeVisible();
  await expect(row(page, CONTRACT_A_LABEL).getByText("45.00 %")).toBeVisible();
  await expect(
    page.getByText(cascadedChildPath, { exact: true }),
  ).toBeVisible();
});
