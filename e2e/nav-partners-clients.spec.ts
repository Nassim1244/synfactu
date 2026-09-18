// The v01-002 journey: the persistent nav rail plus the primary create-read
// cycle of both referential entities it unlocks, now including their detail
// views and the visited-history breadcrumb
// (`ai-rules/policy_testing.md` -> End-to-end scope: "the primary create-
// read cycle of the application's core entity" is the only mandatory
// journey for a project bootstrapped without authentication, D-40).
//
// This is the level that proves what no lower level can: the nav rail's
// links really navigate between real routes, a Server Action round-trips
// through the real database and the resulting Server Component render
// reflects it without a manual reload, and a page reload after that still
// shows the persisted state (or, for the rail's own collapsed state and the
// visited-history trail, deliberately does not). It is also the only level
// this feature's new detail views (`PartnerDetail`, `ClientDetail`), lists
// (`PartnerList`, `ClientList`) and not-found pages are covered at all:
// every one of them is a Server Component, and
// `ai-rules/policy_testing.md` -> What to test where rules those out at the
// component level ("Server Components - do not unit test. They are covered
// end to end").
//
// "Navigating to the screen already at the top of the trail does not add a
// duplicate crumb" is not re-proven here: it is exercised precisely, at the
// reducer level, by `tests/components/nav/navigation-history-context.test.tsx`
// and `tests/components/nav/breadcrumb-bar.test.tsx` - a real browser
// `Link` click to the page already showing does not reliably trigger a new
// navigation/effect cycle to observe it through.
//
// Every name created here carries `RUN_ID` (the current timestamp), because
// this journey runs against the project's real, shared development database
// (`playwright.config.ts` reuses `pnpm dev`'s server) rather than a seeded,
// disposable one - everything the journey reads, it created itself. The
// uniqueness keeps every assertion below scoped to this run's own rows, no
// matter what else already lives in that database.

import { expect, test, type Locator, type Page } from "@playwright/test";

const RUN_ID = Date.now();
const PARTNER_NAME = `E2E Partner ${RUN_ID}`;
const PARTNER_RENAMED = `E2E Partner Renamed ${RUN_ID}`;
const LINKED_CLIENT_NAME = `E2E Linked Client ${RUN_ID}`;
const CUSTOM_SHORT_LABEL = `E2ECUSTOM${RUN_ID}`;

/** The persistent nav rail, `aria-label="Primary"` (`nav-rail.tsx`). */
function rail(page: Page): Locator {
  return page.getByRole("navigation", { name: "Primary" });
}

/** The breadcrumb bar's `<nav>`, `aria-label="breadcrumb"` (shadcn `Breadcrumb`). */
function breadcrumb(page: Page): Locator {
  return page.getByRole("navigation", { name: "breadcrumb" });
}

/** Follows the named nav rail item - always visible, no menu to open first. */
async function navigateTo(page: Page, label: "Partners" | "Clients") {
  await rail(page).getByRole("link", { name: label, exact: true }).click();
}

/** The `<tr>` for a list row, matched by its visible text - never the
 * stacked-card duplicate, which carries `role="listitem"`, not `"row"`. */
function row(page: Page, text: string): Locator {
  return page.getByRole("row").filter({ hasText: text });
}

/**
 * The currently open dialog. Every field lookup inside a dialog is scoped to
 * it, never to `page` directly: the underlying screen stays mounted behind
 * the dialog, and a name created earlier in this run - e.g. "E2E Partner
 * Renamed ..." - can itself contain a field's label as a substring
 * ("re-NAME-d"), which an unscoped, non-exact `getByLabel` would also match
 * once enough rows exist.
 */
function dialogOf(page: Page): Locator {
  return page.getByRole("dialog");
}

test.describe.configure({ mode: "serial" });

test("navigates the persistent rail through the partner and client referential's full create-detail-edit cycle", async ({
  page,
}) => {
  await page.goto("/");

  // The title bar is shown at all times, from an arbitrary page (the
  // bootstrap home page, not one this feature itself adds).
  await expect(page.getByText("Synfactu", { exact: true })).toBeVisible();

  // The rail is visible with no action taken to reveal it, and collapses
  // and expands again without losing its links.
  await expect(
    rail(page).getByRole("link", { name: "Partners" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(
    rail(page).getByRole("link", { name: "Partners" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Collapse navigation" }),
  ).toBeVisible();

  await navigateTo(page, "Partners");
  await expect(page).toHaveURL("/partners");
  await expect(
    page.getByRole("heading", { level: 1, name: "Partners" }),
  ).toBeVisible();
  await expect(page.getByText("Synfactu", { exact: true })).toBeVisible();
  await expect(
    rail(page).getByRole("link", { name: "Partners" }),
  ).toHaveAttribute("aria-current", "page");

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
  const partnerRow = row(page, PARTNER_NAME);
  await expect(partnerRow).toBeVisible();
  // No inline toggle or separate Edit control left in the row - the name is
  // the row's only interactive element, a link to its detail view.
  await expect(partnerRow.getByRole("switch")).toHaveCount(0);
  await expect(partnerRow.getByRole("button", { name: /Edit/ })).toHaveCount(0);
  await expect(
    partnerRow.getByRole("link", { name: PARTNER_NAME }),
  ).toBeVisible();

  // --- Partner detail: name, status, empty linked-clients state -----------
  await partnerRow.getByRole("link", { name: PARTNER_NAME }).click();
  await expect(page).toHaveURL(/\/partners\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: PARTNER_NAME }),
  ).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
  await expect(
    page.getByText("No clients linked to this partner yet."),
  ).toBeVisible();
  await expect(
    rail(page).getByRole("link", { name: "Partners" }),
  ).toHaveAttribute("aria-current", "page");

  // --- Partner detail: edit renames it, no confirmation, no row toggle ----
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: `Edit partner ${PARTNER_NAME}` }),
  ).toBeVisible();
  await expect(dialog.getByRole("switch")).toBeChecked();
  await dialog.getByLabel("Name", { exact: true }).fill(PARTNER_RENAMED);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: PARTNER_RENAMED }),
  ).toBeVisible();

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

  // Happy path, every field, and the short-label suggestion behaviour.
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
  await expect(clientRow.getByRole("switch")).toHaveCount(0);
  await expect(clientRow.getByRole("button", { name: /Edit/ })).toHaveCount(0);

  // --- Client detail: every read-only field, and the referring-partner link
  await clientRow.getByRole("link", { name: LINKED_CLIENT_NAME }).click();
  await expect(page).toHaveURL(/\/clients\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: LINKED_CLIENT_NAME }),
  ).toBeVisible();
  await expect(page.getByText(CUSTOM_SHORT_LABEL)).toBeVisible();
  await expect(page.getByText("450,50", { exact: false })).toBeVisible();
  await expect(page.getByText("Micro", { exact: true })).toBeVisible();
  const referringPartnerLink = page.getByRole("link", {
    name: PARTNER_RENAMED,
  });
  await expect(referringPartnerLink).toBeVisible();

  // --- Breadcrumb: reflects the actual visited sequence, in order --------
  // Exactly 4 screens visited so far: Partners, the partner's detail,
  // Clients, this client's detail - at the visible cap, no ellipsis yet.
  await expect(breadcrumb(page).getByText("Partners")).toBeVisible();
  await expect(breadcrumb(page).getByText(PARTNER_RENAMED)).toBeVisible();
  await expect(breadcrumb(page).getByText("Clients")).toBeVisible();
  await expect(breadcrumb(page).getByText(LINKED_CLIENT_NAME)).toBeVisible();

  // --- The referring partner's link opens that partner's own detail view -
  // A 5th screen, past the visible cap: the oldest ("Partners") collapses
  // behind an ellipsis.
  await referringPartnerLink.click();
  await expect(page).toHaveURL(/\/partners\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: PARTNER_RENAMED }),
  ).toBeVisible();
  await expect(
    page.getByText("No clients linked to this partner yet."),
  ).not.toBeVisible();
  const linkedClientRow = row(page, LINKED_CLIENT_NAME);
  await expect(linkedClientRow).toBeVisible();
  await expect(
    linkedClientRow.getByText("Active", { exact: true }),
  ).toBeVisible();
  await expect(breadcrumb(page).getByText("Partners")).not.toBeVisible();
  await expect(breadcrumb(page).getByText(LINKED_CLIENT_NAME)).toBeVisible();

  // --- Back and forward: step through the same trail as the breadcrumb ---
  const backButton = page.getByRole("button", { name: "Go back" });
  const forwardButton = page.getByRole("button", { name: "Go forward" });
  await expect(forwardButton).toBeDisabled(); // already on the last screen

  await backButton.click();
  await expect(page).toHaveURL(/\/clients\/\d+$/);
  await expect(
    rail(page).getByRole("link", { name: "Clients" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(forwardButton).toBeEnabled();

  for (let step = 0; step < 3; step += 1) {
    await backButton.click();
  }
  await expect(backButton).toBeDisabled();
  await expect(page).toHaveURL("/partners");
  await expect(
    rail(page).getByRole("link", { name: "Partners" }),
  ).toHaveAttribute("aria-current", "page");

  for (let step = 0; step < 4; step += 1) {
    await forwardButton.click();
  }
  await expect(forwardButton).toBeDisabled();
  await expect(page).toHaveURL(/\/partners\/\d+$/);

  // --- Deactivate the linked partner, from its own edit form ---------------
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = dialogOf(page);
  await expect(dialog.getByRole("switch")).toBeChecked();
  await dialog.getByRole("switch").click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
  // Never blocked, never a confirmation: the click above already went
  // through with no dialog in between, despite the client link above.

  // A fresh "New client" dialog must not offer the now-inactive partner.
  await navigateTo(page, "Clients");
  await page.getByRole("button", { name: "New client" }).first().click();
  dialog = dialogOf(page);
  await dialog.getByRole("combobox", { name: "Referring partner" }).click();
  await expect(page.getByRole("option", { name: PARTNER_RENAMED })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // The existing linked client's row still shows the deactivated partner's
  // name (a since-deactivated link keeps saving, RG-09).
  await expect(
    row(page, LINKED_CLIENT_NAME).getByText(PARTNER_RENAMED),
  ).toBeVisible();

  // --- Not found: an id that resolves to nothing, for both entities -------
  await page.goto("/partners/999999999");
  await expect(
    page.getByText("This partner could not be found."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to partners" }).click();
  await expect(page).toHaveURL("/partners");

  await page.goto("/clients/999999999");
  await expect(page.getByText("This client could not be found.")).toBeVisible();
  await page.getByRole("link", { name: "Back to clients" }).click();
  await expect(page).toHaveURL("/clients");

  // --- Reload: the record persists, but the rail state and the trail do not
  await row(page, LINKED_CLIENT_NAME)
    .getByRole("link", { name: LINKED_CLIENT_NAME })
    .click();
  // The click above only starts a client-side transition; waiting for the
  // resulting URL before reloading avoids a race where the reload lands
  // while still on the list page.
  await expect(page).toHaveURL(/\/clients\/\d+$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: LINKED_CLIENT_NAME }),
  ).toBeVisible();
  await expect(page.getByText(CUSTOM_SHORT_LABEL)).toBeVisible();
  // The visited-history trail starts empty again: only the screen just
  // (re)loaded is in it, so both directions are disabled.
  await expect(page.getByRole("button", { name: "Go back" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Go forward" })).toBeDisabled();
  // The rail's own collapsed/expanded state is not remembered either: back
  // to its default (expanded), despite having been collapsed earlier.
  await expect(
    page.getByRole("button", { name: "Collapse navigation" }),
  ).toBeVisible();
});

test("keeps every dialog's tab order matching the design's visual field order", async ({
  page,
}) => {
  await page.goto("/partners");

  // Every locator below is scoped to the open dialog: the underlying screen
  // stays in the DOM behind it.
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

  // Partner form, edit mode, now reached through a partner's own detail
  // page rather than a row-level control: Name -> Active switch -> Cancel
  // -> Save.
  const firstPartnerRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("link") })
    .first();
  await firstPartnerRow.getByRole("link").click();
  await expect(page).toHaveURL(/\/partners\/\d+$/);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
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
