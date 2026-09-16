// The v01-001 journey: the global nav shell plus the primary create-read
// cycle of both referential entities it unlocks (`policy_testing.md` -> End-
// to-end scope: "the primary create-read cycle of the application's core
// entity" is the only mandatory journey for a project bootstrapped without
// authentication, D-40).
//
// This is the level that proves what no lower level can: the hamburger Sheet
// really navigates between real routes, a Server Action round-trips through
// the real database and the resulting Server Component render reflects it
// without a manual reload, and a page reload after that still shows the
// persisted state.
//
// Every name created here carries `RUN_ID` (the current timestamp), because
// this journey runs against the project's real, shared development database
// (`playwright.config.ts` reuses `pnpm dev`'s server) rather than a seeded,
// disposable one - `prisma/seed.ts` does not exist yet, and this feature has
// no need of it: everything the journey reads, it created itself. The
// uniqueness keeps every assertion below scoped to this run's own rows, no
// matter what else already lives in that database.

import { expect, test, type Locator, type Page } from "@playwright/test";

const RUN_ID = Date.now();
const PARTNER_NAME = `E2E Partner ${RUN_ID}`;
const PARTNER_RENAMED = `E2E Partner Renamed ${RUN_ID}`;
const LINKED_CLIENT_NAME = `E2E Linked Client ${RUN_ID}`;
const CUSTOM_SHORT_LABEL = `E2ECUSTOM${RUN_ID}`;

/** Opens the hamburger Sheet and follows the named nav item. */
async function navigateTo(page: Page, label: "Partners" | "Clients") {
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("link", { name: label, exact: true }).click();
}

/** The `<tr>` for a list row, matched by its visible text - never the
 * stacked-card duplicate, which carries `role="listitem"`, not `"row"`. */
function row(page: Page, text: string): Locator {
  return page.getByRole("row").filter({ hasText: text });
}

/**
 * The currently open dialog. Every field lookup inside a dialog is scoped to
 * it, never to `page` directly: the list stays mounted behind the dialog, and
 * a name created earlier in this run - e.g. "E2E Partner Renamed ..." - can
 * itself contain a field's label as a substring ("re-NAME-d"), which an
 * unscoped, non-exact `getByLabel` would also match once enough rows exist.
 */
function dialogOf(page: Page): Locator {
  return page.getByRole("dialog");
}

test.describe.configure({ mode: "serial" });

test("navigates from the hamburger menu through the partner and client referential's full create-read cycle", async ({
  page,
}) => {
  await page.goto("/");

  // Opening the hamburger from an arbitrary page (the bootstrap home page,
  // not one v01-001 itself adds) reaches the menu it mounts app-wide.
  await navigateTo(page, "Partners");
  await expect(page).toHaveURL("/partners");
  await expect(
    page.getByRole("heading", { level: 1, name: "Partners" }),
  ).toBeVisible();

  // --- Partners: unhappy path - an empty name creates nothing -----------
  await page.getByRole("button", { name: "New partner" }).first().click();
  let dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: "New partner" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Name is required.")).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "New partner" }),
  ).toBeVisible();

  // --- Partners: happy path -----------------------------------------------
  await dialog.getByLabel("Name", { exact: true }).fill(PARTNER_NAME);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "New partner" }),
  ).not.toBeVisible();
  await expect(row(page, PARTNER_NAME)).toBeVisible();

  // --- Partners: edit the name --------------------------------------------
  await row(page, PARTNER_NAME)
    .getByRole("button", { name: `Edit ${PARTNER_NAME}` })
    .click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: `Edit partner ${PARTNER_NAME}` }),
  ).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill(PARTNER_RENAMED);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(row(page, PARTNER_RENAMED)).toBeVisible();
  await expect(row(page, PARTNER_NAME)).toHaveCount(0);

  // Persists after navigating away and back.
  await navigateTo(page, "Clients");
  await navigateTo(page, "Partners");
  await expect(row(page, PARTNER_RENAMED)).toBeVisible();

  // --- Clients: link a fresh client to the still-active renamed partner --
  await navigateTo(page, "Clients");
  await expect(page).toHaveURL("/clients");
  await expect(
    page.getByRole("heading", { level: 1, name: "Clients" }),
  ).toBeVisible();

  // Unhappy path: all three required fields empty.
  await page.getByRole("button", { name: "New client" }).first().click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: "New client" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Name is required.")).toBeVisible();
  await expect(dialog.getByText("Short label is required.")).toBeVisible();
  await expect(dialog.getByText("Enter a positive number.")).toBeVisible();

  // Happy path, every field, and the short-label suggestion behaviour: as
  // Name is typed the short label auto-fills, and the user can still
  // overwrite it before saving.
  const shortLabelInput = dialog.getByLabel("Short label");
  await expect(shortLabelInput).toHaveValue("");
  await dialog.getByLabel("Name", { exact: true }).fill(LINKED_CLIENT_NAME);
  await expect(shortLabelInput).not.toHaveValue("");
  await shortLabelInput.fill(CUSTOM_SHORT_LABEL);

  await dialog.getByLabel("Default rate (TJM)").fill("450.50");

  await dialog.getByRole("combobox", { name: "Referring partner" }).click();
  await page.getByRole("option", { name: PARTNER_RENAMED }).click();

  await dialog.getByRole("combobox", { name: "Default regime" }).click();
  await page.getByRole("option", { name: "Micro" }).click();

  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "New client" }),
  ).not.toBeVisible();

  const clientRow = row(page, LINKED_CLIENT_NAME);
  await expect(clientRow).toBeVisible();
  await expect(clientRow.getByText(CUSTOM_SHORT_LABEL)).toBeVisible();
  await expect(clientRow.getByText(PARTNER_RENAMED)).toBeVisible();

  // --- Deactivate the linked partner, from the Partners screen ------------
  await navigateTo(page, "Partners");
  await row(page, PARTNER_RENAMED)
    .getByRole("switch", { name: `Deactivate ${PARTNER_RENAMED}` })
    .click();
  await expect(
    row(page, PARTNER_RENAMED).getByRole("switch", {
      name: `Reactivate ${PARTNER_RENAMED}`,
    }),
  ).toBeVisible();
  await expect(row(page, PARTNER_RENAMED).getByText("Inactive")).toBeVisible();

  // Never blocked, never a confirmation: the click above already went
  // through with no dialog in between, despite the client link above.

  // --- The deactivated partner: still the client's visible link, but ------
  // --- absent from the Select's options for a fresh pick ------------------
  await navigateTo(page, "Clients");

  // A fresh "New client" dialog must not offer the now-inactive partner.
  await page.getByRole("button", { name: "New client" }).first().click();
  dialog = dialogOf(page);
  await dialog.getByRole("combobox", { name: "Referring partner" }).click();
  await expect(page.getByRole("option", { name: PARTNER_RENAMED })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // The existing client's own edit dialog still shows it, suffixed.
  await row(page, LINKED_CLIENT_NAME)
    .getByRole("button", { name: `Edit ${LINKED_CLIENT_NAME}` })
    .click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: `Edit client ${LINKED_CLIENT_NAME}` }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Referring partner" }),
  ).toHaveText(`${PARTNER_RENAMED} (inactive)`);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // --- Toggle the client inactive, then active again -----------------------
  await row(page, LINKED_CLIENT_NAME)
    .getByRole("switch", { name: `Deactivate ${LINKED_CLIENT_NAME}` })
    .click();
  await expect(
    row(page, LINKED_CLIENT_NAME).getByRole("switch", {
      name: `Reactivate ${LINKED_CLIENT_NAME}`,
    }),
  ).toBeVisible();
  await expect(
    row(page, LINKED_CLIENT_NAME).getByText("Inactive"),
  ).toBeVisible();

  await row(page, LINKED_CLIENT_NAME)
    .getByRole("switch", { name: `Reactivate ${LINKED_CLIENT_NAME}` })
    .click();
  await expect(
    row(page, LINKED_CLIENT_NAME).getByRole("switch", {
      name: `Deactivate ${LINKED_CLIENT_NAME}`,
    }),
  ).toBeVisible();
  await expect(
    row(page, LINKED_CLIENT_NAME).getByText("Active", { exact: true }),
  ).toBeVisible();

  // --- Reload: everything above survives a hard refresh --------------------
  await page.reload();
  await expect(clientRow).toBeVisible();
  await expect(clientRow.getByText(CUSTOM_SHORT_LABEL)).toBeVisible();
  await expect(clientRow.getByText(PARTNER_RENAMED)).toBeVisible();
  await expect(clientRow.getByText("Active", { exact: true })).toBeVisible();

  // --- And navigating away and back, not only a reload ----------------------
  await navigateTo(page, "Partners");
  await expect(row(page, PARTNER_RENAMED).getByText("Inactive")).toBeVisible();
  await navigateTo(page, "Clients");
  await expect(clientRow).toBeVisible();
});

test("keeps every dialog's tab order matching the design's visual field order", async ({
  page,
}) => {
  await page.goto("/partners");

  // Every locator below is scoped to the open dialog: the underlying list
  // stays in the DOM behind it, and its row labels ("Edit ... Renamed ...",
  // "Reactivate ... Renamed ...") happen to contain "Name" as a substring
  // ("re-NAME-d"), which an unscoped, non-exact `getByLabel("Name")` would
  // also match.
  await page.getByRole("button", { name: "New partner" }).first().click();
  let dialog = page.getByRole("dialog");

  // Partner form, create mode: Name (autofocused) -> Cancel -> Save. No
  // Active switch in create mode, per the design.
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Save" })).toBeFocused();
  await page.keyboard.press("Escape");

  // Partner form, edit mode: Name -> Active switch -> Cancel -> Save.
  await page
    .getByRole("button", { name: /^Edit /, exact: false })
    .first()
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("switch")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Save" })).toBeFocused();
  await page.keyboard.press("Escape");

  await page.goto("/clients");

  // Client form: Name -> Short label -> Default rate -> Billable ->
  // Referring partner -> Default regime -> Cancel -> Save.
  await page.getByRole("button", { name: "New client" }).first().click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Short label")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Default rate (TJM)")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Billable")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("combobox", { name: "Referring partner" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("combobox", { name: "Default regime" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Save" })).toBeFocused();
  await page.keyboard.press("Escape");
});
