# Design v01-001 — Global navigation and the partners/clients referential

- Spec: `specs/iteration/v1/v01-001-nav-partners-clients.md` (FUNCTIONAL SPEC approved at G1).
- Entities: `specs/functional/MCD v2.md` -> PARTNER, CLIENT, RG-01.
- Pattern precedent consulted: `design/001/README.md` (hello-world) — its section headings and its "N/A with a one-line reason" convention for inapplicable states are reused here.
- Only shadcn primitive that exists in `src/components/ui/` today is `Button` (new-york style, Radix-based, `cn` helper, `lucide-react` and `radix-ui` already installed). Every other primitive named below is new and composed from the same stack for consistency; none is invented from scratch.

# Screens

1. **Global nav shell** — not routed; wraps every route via the root layout. Purpose: give access, via a persistent hamburger control, to the sections that exist at this point in the roadmap.
2. **Partner list** — route `/partners`. Purpose: show every partner with its name and active status, and the entry point to create one.
3. **Partner form** — dialog opened from the partner list (create, and edit per row). Purpose: capture or change a partner's name and, when editing, its active status.
4. **Client list** — route `/clients`. Purpose: show every client with its name, short label, billable status, active status and linked partner, and the entry point to create one.
5. **Client form** — dialog opened from the client list (create, and edit per row). Purpose: capture or change all client fields, including the short label, the linked partner and the default regime.

No dedicated detail/show page exists for either entity — the list plus its dialog is the entire interface. This is a decision to confirm at G2 (see below).

---

# 1. Global nav shell

## Layout
- A slim header, full width, sticky to the top of the viewport, present on every route (mounted in the root layout, `src/app/layout.tsx`).
- Header contains a single element: the hamburger trigger, left-aligned.
- Activating it opens a **Sheet** sliding in from the left, covering up to the tablet breakpoint width and capped at a comfortable reading width above it.
- Sheet content, top to bottom: a small close affordance (the Sheet's own default), then a `<nav>` with a vertical list of the sections that exist: "Partners", then "Clients", in that order (the order they're introduced in the spec's user flow).

## Content
- Nav item labels: exactly "Partners" and "Clients". No icon is required by the spec; none is added.
- No placeholder items for sections that don't exist yet (explicit out-of-scope item).

## Components
- `Sheet` (new primitive — side panel, Radix `Dialog` primitive under the hood, consistent with how `Dialog` itself will be built).
- `Button` (existing) with `variant="ghost"` `size="icon"` as the trigger, carrying the `lucide-react` `Menu` icon.
- Plain semantic `<nav>` / `<ul>` / `<li>` with Next.js `Link` for the items — no list-primitive is needed for two items.

## Actions
- Open menu (hamburger button) → opens the Sheet.
- Select "Partners" → navigates to `/partners`, closes the Sheet.
- Select "Clients" → navigates to `/clients`, closes the Sheet.
- No role restriction: V1 has one full-access operator (D-40).

## Hierarchy
- The hamburger is the only persistent chrome; it must be noticeable but not compete with page content — ghost variant, icon only.
- Inside the Sheet, the two nav items carry equal visual weight; the item matching the current route is marked (see Accessibility) but not made larger.

## States
- **Loading** — N/A. The nav item list is a static list in code (it "grows one entry per shipped spec"), not fetched; nothing to await.
- **Empty** — N/A. At least "Partners" and "Clients" exist from this spec onward; an empty nav is not a reachable state.
- **Populated** — the normal and only case: two items.
- **Partial** — N/A. Nothing here is derived or reconciled data.
- **Error** — N/A. Nothing can fail at runtime (no fetch, no mutation).
- **Forbidden** — N/A. No roles in V1 (D-40).
- **Saving / saved** — N/A. Navigation only, nothing persisted here.

---

# 2. Partner list (`/partners`)

## Layout
Top to bottom:
1. Page heading (`h1` "Partners") and the primary action button "New partner", in the same row, heading left / button right.
2. The partner table, full width, taking the remaining page height; the **page** scrolls when the list is long (no internal scroll container, no pagination — matches the 20-partner/100-client volumetry criterion with a plain full list).

## Content — table columns, in order
1. **Name** — `PARTNER.name`.
2. **Status** — `PARTNER.active`, rendered as "Active" / "Inactive".
3. **Actions** — not a data column: the edit control and the active toggle.

## Components
- `Table` (new primitive — header row + body rows).
- `Badge` (new primitive) for the Status column: "Active" (default/neutral tone) vs "Inactive" (muted tone), text always present alongside colour.
- `Button` (existing, `variant="ghost"` `size="sm"`) labelled "Edit" per row, opening the edit dialog for that row.
- `Switch` (new primitive) per row for the active toggle, next to or inside the Actions cell.
- `Skeleton` (new primitive) for the loading state.
- `Alert` (new primitive) for the error state.

## Actions
- **New partner** (primary button, top of page) → opens the partner form dialog in create mode.
- **Edit** (per row) → opens the partner form dialog in edit mode, pre-filled from that row's already-loaded data (no separate fetch).
- **Active toggle** (per row, `Switch`) → flips `active` immediately, no dialog, no confirmation (see Interaction detail).
- No role restriction (D-40).

## Hierarchy
- Name is what the user scans for; it is the first column and gets no decoration.
- Status is secondary but must never be missed, hence the `Badge`, not plain text.
- "New partner" is the one clearly primary call to action on the page (default button variant); row actions are secondary (ghost button, plain switch).

## States
- **Loading** — a skeleton table: the header row renders immediately (it needs no data), 5 skeleton body rows matching the three-column shape. Wrapped in `role="status"` with visually hidden text "Loading partners…" for assistive technology.
- **Empty** — no partners recorded. The table is replaced by a centred message "No partners yet." with the same "New partner" action repeated as the primary control, so the empty state is itself the entry point (per the acceptance criterion).
- **Populated** — the normal case, any number of rows, no pagination.
- **Partial** — N/A, with reason: every column is a directly stored field; nothing here is derived or reconciled at this stage of the roadmap (unlike future billing screens).
- **Error** — the table area is replaced by an `Alert` (destructive-adjacent but not alarming tone): "Partners could not be loaded." plus a "Try again" button that reissues the same request. Never a raw technical message.
- **Forbidden** — N/A. No roles (D-40).
- **Saving / saved** — applies to the row-level active toggle: while the toggle mutation is in flight the `Switch` is disabled and shows a brief pending look (reduced opacity, matching the existing `disabled:opacity-50` button convention); on success it settles into its new state and the `Badge` updates in place; on failure it snaps back to its previous state and an `Alert` (non-blocking, dismissible) reports "Could not update {name}. Try again."

---

# 3. Partner form (dialog)

Opened from the partner list, never routed on its own.

## Layout
`Dialog`, title "New partner" or "Edit partner {name}". Body: a single field. Footer: "Cancel" (left or outline), "Save" (primary, right).

## Content
- **Name** (`Input`, type text, required). Autofocus on open.
- **Active** (`Switch`, edit mode only) — mirrors the list's row-level toggle so the state can be changed from either place. Not shown in create mode: a new partner is always created active, per the spec, so there is nothing to choose.

## Components
- `Dialog`, `Label`, `Input`, `Switch` (edit only), `Button` (existing, for Cancel/Save).

## Actions
- **Save** → validates, then creates or updates the partner.
- **Cancel** / Escape / clicking outside → closes the dialog, discards any unsaved change, no confirmation (see Interaction detail — no unsaved-change guard, out of scope).

## Hierarchy
- The Name field is the only thing to fill in create mode; nothing competes with it.
- In edit mode, Active is visually secondary (placed below Name, smaller control) since most edits are to the name.

## States
- **Loading** — N/A for edit: the dialog is pre-filled synchronously from the row already loaded in the list; there is no separate fetch-on-open.
- **Empty** — N/A, not a collection.
- **Populated** — normal filled (edit) or blank (create) state.
- **Partial** — N/A.
- **Error** —
  - Empty name on submit: the field gets `aria-invalid`, a red border, and an inline message directly under it: "Name is required." Fires on submit attempt (not on every keystroke), and clears as soon as the user types a non-empty value and resubmits or moves on.
  - Save fails after passing validation (e.g. a server error): the dialog stays open, entered data is preserved, and an `Alert` appears above the footer: "Could not save this partner. Try again."
- **Forbidden** — N/A.
- **Saving / saved** — the "Save" button shows a pending state (disabled, label replaced by "Saving…") while the mutation is in flight. On success the dialog closes and the partner list re-renders with the new/updated row visible immediately, without a manual page reload.

---

# 4. Client list (`/clients`)

## Layout
Same structure as the partner list:
1. Heading (`h1` "Clients") + primary "New client" button, same row.
2. The client table, full width, page-level scroll, no pagination.

## Content — table columns, in order
1. **Name** — `CLIENT.name`.
2. **Short label** — `CLIENT.short_label`.
3. **Billable** — `CLIENT.billable`, rendered as plain text "Yes" / "No".
4. **Status** — `CLIENT.active`, rendered as a `Badge`, "Active" / "Inactive" (same treatment as the partner list, for consistency).
5. **Partner** — the linked `PARTNER.name` through `CLIENT.id_partner`, or an em dash "—" when none.
6. **Actions** — Edit button + active `Switch`, same pattern as the partner list.

## Components
Same set as the partner list: `Table`, `Badge`, `Switch`, `Button`, `Skeleton`, `Alert`.

## Actions
- **New client** → opens the client form dialog in create mode.
- **Edit** (per row) → opens the client form dialog in edit mode, pre-filled from the loaded row.
- **Active toggle** (per row) → same immediate, confirmation-free behaviour as partners.
- No role restriction (D-40).

## Hierarchy
- Name and Short label are what the user scans for (short label matters because it feeds invoice numbering later — `specs/functional/MCD v2.md` D-47).
- **Status** (active/inactive) gets the `Badge` treatment — it is the field the acceptance criteria hinge on (partner-selector visibility, list retention).
- **Billable** stays plain text: a real but secondary attribute, not a status the rest of this feature reacts to.
- Partner link is shown but not decorated; it is informational here (its own record is reachable from the partner list, not from here — no cross-navigation link is specified, so none is added).

## States
- **Loading** — skeleton table, 5 rows × 5 columns (excluding Actions), `role="status"`, hidden text "Loading clients…".
- **Empty** — "No clients yet." + a repeated "New client" primary action, replacing the table.
- **Populated** — normal case, any number of rows (criterion: 100 clients render with none omitted, no pagination).
- **Partial** — N/A, same reasoning as the partner list: every column is directly stored.
- **Error** — `Alert`: "Clients could not be loaded." + "Try again".
- **Forbidden** — N/A (D-40).
- **Saving / saved** — same pending/settle/revert pattern as the partner list's active toggle, scoped to the client's active field only (billable is not toggled inline; it only changes through the edit dialog).

---

# 5. Client form (dialog)

Opened from the client list, never routed on its own. The larger of the two forms; field order below is also the tab order (see Interaction detail).

## Layout
`Dialog`, title "New client" or "Edit client {name}". Body: a single-column stack of fields (this dialog is wider than the partner one to accommodate the Select controls comfortably — width is the architect/coder's implementation detail, not a pixel spec). Footer: "Cancel", "Save".

## Content, in order
1. **Name** (`Input`, text, required). Autofocus on open.
2. **Short label** (`Input`, text, required). Auto-suggested from Name as the user types (see Interaction detail for the exact behaviour); always editable; required at save time regardless of whether the value shown is the suggestion or a manual edit.
3. **Default rate** (`Input`, `type="number"`, required, label "Default rate (TJM)"). Must be a positive number.
4. **Billable** (`Switch`, default on/"Yes").
5. **Referring partner** (`Select`, optional, label "Referring partner"). Options: every **active** partner, plus a leading "None" option to represent no link. When editing a client whose linked partner has since been deactivated, that partner still appears as the current value (its name shown, with an "(inactive)" suffix) even though it is absent from the option list for a fresh selection; it can still be changed to any active partner or cleared to "None".
6. **Default regime** (`Select`, optional, label "Default regime"). Options: "None" (leading, default), "Micro", "Portage" — the two fixed REGIME values; this feature does not manage the REGIME values themselves.

## Components
- `Dialog`, `Label`, `Input` (text and number variants), `Switch`, `Select` (new primitive), `Button` (Cancel/Save).

## Actions
- **Save** → validates Name, Short label and Default rate; creates or updates the client.
- **Cancel** / Escape / outside click → closes, discards unsaved changes, no confirmation.

## Hierarchy
- Name, Short label and Default rate are visually primary (required, plain `Input`s, top of the stack).
- Billable, Referring partner and Default regime are visually secondary (all optional or defaulted) but not hidden — they sit below the required block in the same single column, no accordion or "advanced" collapse, since six fields does not warrant hiding any of them.

## States
- **Loading** — N/A for edit, same reasoning as the partner form: pre-filled synchronously from the already-loaded row.
- **Empty** — N/A.
- **Populated** — normal filled (edit) or defaulted-blank (create: Billable on, everything else empty) state.
- **Partial** — N/A.
- **Error** —
  - On submit, each failing field gets `aria-invalid`, a red border, and its own inline message directly beneath it, naming the problem: "Name is required.", "Short label is required.", "Enter a positive number." (Default rate, for both empty and non-positive/non-numeric input). Multiple fields can show errors simultaneously; no separate summary banner is needed since each message sits at its field.
  - Errors clear per-field as soon as that field is corrected and the user re-submits (or, for a smoother feel, as soon as it holds a valid value — exact re-validation timing is left to the coder as an implementation nicety, not a functional requirement).
  - Save fails after passing validation: dialog stays open, all entered data preserved, `Alert` above the footer: "Could not save this client. Try again."
- **Forbidden** — N/A.
- **Saving / saved** — "Save" button shows "Saving…" and disables while in flight. On success, dialog closes and the client list re-renders with the new/updated row immediately visible, no manual reload.

---

# Interaction detail

## Form behaviour
- Validation fires on submit attempt for both forms; a field already flagged invalid re-validates live as the user edits it, so the error disappears the moment it's fixed rather than waiting for another submit.
- Validation messages are field-local (under the field), never a generic top-of-dialog "there are errors" banner — there are at most three failing fields (client form) and the spec asks for messages that "identify" / "name" the failing field(s), which field-local placement does directly.
- On submit failure after the mutation itself (not a validation failure — e.g. a write error), the dialog remains open with all entered values intact so nothing is retyped; a dialog-level `Alert` explains it in plain language.
- On success, both forms close their dialog and return the user to the list they were opened from, with the affected row visible and current — no separate confirmation screen.

## Short-label auto-suggestion (client form only)
- While the Short label field is "pristine" (untouched since the dialog opened, or still equal to the value the suggestion engine last derived), every keystroke in Name re-derives the Short label and updates it live.
- The moment the user types directly into the Short label field, it becomes "dirty": further edits to Name stop overwriting it. This applies identically when creating and when editing (editing an existing client's Name never silently clobbers a Short label the user has since customised).
- The exact derivation (truncation, initials, slug, etc.) is a business-logic detail per D-47, not a design decision — the design only specifies the pristine/dirty tracking behaviour above.

## Destructive actions
- There are none. No delete exists anywhere in this feature (explicit out-of-scope item); deactivation is the only reversible state change, and it is treated as non-destructive throughout: no confirmation dialog, on the list or in the edit form, for deactivating either a partner or a client. Partner deactivation is stated explicitly in the acceptance criteria; client deactivation is designed the same way for consistency and because the same "assumed reversible, RG-09 precedent" reasoning applies to both — flagged for confirmation at G2 since the acceptance criteria only spell it out for partners.

## Navigation
- Creating or editing a partner: user stays on `/partners`.
- Creating or editing a client: user stays on `/clients`.
- There is no dedicated "view partner" / "view client" page; opening a row for edit is opening the dialog, not navigating to a new route. Flagged for confirmation at G2.
- Selecting a nav item always lands on the corresponding list (`/partners`, `/clients`), never on a form.

## Keyboard
- **Nav shell**: hamburger button is reachable by Tab from the top of any page; Enter/Space opens the Sheet; Escape closes it and returns focus to the hamburger trigger; inside the open Sheet, Tab moves through "Partners" then "Clients".
- **Partner list**: Tab order is "New partner" → each row's "Edit" button → that row's active `Switch`, top to bottom.
- **Partner form dialog**: Tab order is Name → (edit mode only) Active switch → Cancel → Save. Enter inside the Name field submits the form (native single-field behaviour, nothing re-implemented).
- **Client list**: Tab order is "New client" → each row's "Edit" button → that row's active `Switch`, top to bottom.
- **Client form dialog**: Tab order follows the field order given above — Name → Short label → Default rate → Billable → Referring partner → Default regime → Cancel → Save — matching visual order, so fast sequential entry (Tab, type, Tab, type…) works without surprises.
- No bespoke keyboard shortcuts are introduced; native dialog/form/Select keyboard behaviour (Radix-based) is relied on as-is.

## Responsive behaviour
Breakpoint: the existing Tailwind `md` (tablet) breakpoint, matching the criterion's own wording ("below the tablet breakpoint").
- **Nav Sheet**: unchanged — it already behaves as a full-height overlay at every size; on very narrow viewports it takes the full width instead of a fixed side width (default `Sheet` behaviour).
- **Partner list / Client list table → stacked cards below `md`**: each row becomes one card, its columns rendered as stacked label/value pairs inside the card (e.g. "Status — Active"), with the row's Edit button and active `Switch` at the bottom of the card. This preserves every column's information without horizontal scrolling or truncation.
- **Dialogs**: no special treatment beyond the primitive's own responsive default (near-full-width with margin on narrow viewports); six fields in a single column already reads fine at phone width.

---

# Accessibility

- **Accessible names**:
  - Hamburger trigger: `aria-label="Open navigation menu"`.
  - Nav items: their visible text ("Partners", "Clients") is the accessible name.
  - "New partner" / "New client": visible text is the accessible name.
  - Per-row "Edit" button: visible text "Edit" is not unique per row, so each carries `aria-label="Edit {name}"` (partner or client name) to disambiguate for assistive technology, even though sighted users read it from the row context.
  - Per-row active `Switch`: `aria-label` states the action, not just the field, and changes with state — "Deactivate {name}" when currently active, "Reactivate {name}" when currently inactive — so the control's purpose is unambiguous out of row context.
  - Every form field has a `Label` associated via `htmlFor`/`id` (never a placeholder standing in for a label).
- **Colour is never the only carrier**:
  - Active/Inactive is a `Badge` with the word "Active" or "Inactive" printed, colour only reinforcing it.
  - Field validation pairs the red border with a written message, never colour alone.
  - The Switch's on/off state is exposed via `aria-checked` and reinforced by the adjacent `Badge` text, not by colour alone.
- **Focus order follows visual order** on every screen and dialog listed under Keyboard above — no CSS-only reordering is used anywhere in this feature.
- **Heading hierarchy**:
  - `/partners`: a single `h1`, "Partners". No other heading level on the page.
  - `/clients`: a single `h1`, "Clients". No other heading level on the page.
  - Dialog titles ("New partner", "Edit partner {name}", "New client", "Edit client {name}") use the `Dialog` primitive's own title element, associated to the dialog via `aria-labelledby` rather than introducing a visible `h2` that would sit awkwardly under the page's `h1` while the dialog is open over it.
- Loading skeletons carry `role="status"` and visually-hidden text ("Loading partners…" / "Loading clients…") so their presence is announced once rather than leaving assistive technology with silent placeholder rows.
- Error `Alert`s use `role="alert"` so they are announced as soon as they appear, without requiring focus to move to them.

---

# Decisions to confirm at G2

1. **Nav shell mounts at the root layout**, applying app-wide (including the existing `/hello-world` and `/` pages), not only to the two routes this feature adds — read from "the application shell carries a hamburger control at all times."
2. **Edit is a dialog opened from the list row**, not a separate routed page — no dedicated partner/client detail screen exists in this feature.
3. **No confirmation prompt on deactivating a client**, generalising the partner rule the acceptance criteria state explicitly (same RG-09-style reversibility reasoning).
4. **No toast/notification system is introduced.** "Saved" feedback is the dialog closing plus the visibly updated row in the list; a project-wide toast pattern, if wanted, is a separate cross-cutting decision beyond this feature.
5. **The active toggle lives directly in each list row** (fast path, no dialog needed to flip it) in addition to being editable inside the edit dialog itself.
6. **Billable is plain text; Active/Inactive is a `Badge`** — different visual weight, reflecting that the acceptance criteria hinge on active status, not on billable.
7. **Short-label pristine/dirty tracking** applies identically on create and edit, per the "Short-label auto-suggestion" rule above.

# Flagged for the architect

- **New shadcn primitives required**: `Sheet`, `Table`, `Dialog`, `Input`, `Label`, `Switch`, `Select`, `Badge`, `Skeleton`, `Alert`. Only `Button` exists today. All are standard shadcn/ui primitives built on the `radix-ui` + `cn` + `class-variance-authority` stack already in `package.json` — recommend adding them in one pass via the shadcn CLI rather than piecemeal.
- **No client-side data-fetching library is assumed or required.** The interactivity this design calls for — dialog open/close state, controlled form inputs, the short-label pristine/dirty tracking, and the row-level Switch's local pending/settle/revert — is local client-component state, not a data-fetching concern. How list data reaches the page and how mutations round-trip (e.g. Server Actions, revalidation) is entirely the architect's call under AD-006; this design does not choose it.
- **No live-updating view is required.** A saved record needs to be visible on the same view immediately after its own mutation completes (already covered above) and durably after navigating away and back (acceptance criteria) — no polling, no websocket, no subscription.
- **No chart, no map, nothing beyond the ten primitives listed above.**

---

This is gate **G2**. The design folder is `design/v01-001/`. Nothing proceeds past this point — no `@architect` work, no code — until the user explicitly approves this design or asks for changes.
