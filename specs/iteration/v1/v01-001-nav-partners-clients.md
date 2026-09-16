# Global navigation and the partners/clients referential

# ── FUNCTIONAL SPEC ──────────────────────────────────────────
- Written by @product-owner. Approved by the user at gate G1.

# Goal
- Give the application its persistent global navigation (a hamburger control opening a menu of the sections that exist so far), and let the consultant manage the two referential entities every later V1 feature depends on: **partners** (intermediaries who refer end clients) and **clients** (end clients, optionally linked to a referring partner), including the relation between them (`specs/functional/MCD v2.md` -> PARTNER, CLIENT, RG-01). This is now first in the roadmap because missions, time entries, invoicing and declarations all need a real client to point at, and because every screen built after it lives inside the nav shell this feature introduces.

# User flow
1. **Navigation.** The application shell carries a hamburger control at all times. Opening it shows a menu listing the sections that exist in the product at this point in the roadmap — at this iteration, "Partners" and "Clients". Later specs add their own entry when they ship; this menu is not pre-populated with placeholders for sections that do not exist yet.
2. **Partners — list.** Selecting "Partners" shows every partner, each with its name and active/inactive status. Empty state: no partners recorded yet, with a clear way to create the first one.
3. **Partners — create.** The user enters a name and saves. The partner is created active. It appears in the list immediately.
   - Unhappy path: an empty name is rejected before the record is created, with a message identifying the problem.
4. **Partners — edit.** The user opens an existing partner and changes its name. The change is visible on the list and on the record after saving.
5. **Partners — deactivate / reactivate.** The user toggles a partner's active status instead of deleting it. A deactivated partner stays in the list, marked inactive, stays visible on every client already linked to it, and drops out of the partner-selection control described in step 7 for *new* links. Reactivating puts it back.
6. **Clients — list.** Selecting "Clients" shows every client, each with its name, short label, billable status, active status, and linked partner if any. Empty state: no clients recorded yet, with a clear way to create the first one.
7. **Clients — create.** The user enters: a name (required); a default rate, the TJM that pre-fills new missions (required, a positive number); whether the client is billable (defaults to yes); optionally, a referring partner, chosen from the active partners; optionally, a default regime, chosen between the two fixed values Micro and Portage. As the user types the name, a short label is suggested automatically; the user may accept it or type a different one before saving, and the field is required either way (`specs/functional/MCD v2.md` -> CLIENT.short_label, D-47).
   - Unhappy path: an empty name, an empty short label, or a default rate that is not a positive number is rejected before the record is created, with a message identifying which field(s) failed.
8. **Clients — edit.** The user opens an existing client and changes any of its fields, including its short label, its linked partner (set, changed or removed) and its default regime. Changes are visible after saving.
9. **Clients — deactivate / reactivate.** The user toggles a client's active status instead of deleting it. A deactivated client stays in the list, marked inactive, and its record stays visible and editable. Reactivating puts it back.
10. **The RG-01 direct-billing case.** When a partner is itself invoiced directly, the user represents it as a client through the ordinary flow of step 7 — typically reusing the partner's name — and may link that new client back to the same partner. This spec adds no dedicated "convert this partner into a client" shortcut; RG-01 already treats PARTNER and CLIENT as separate records, one optionally referencing the other.

# Acceptance criteria
- The hamburger control is present on every screen this feature adds (partner list, partner form, client list, client form) and opens a menu listing at least "Partners" and "Clients".
- Selecting "Partners" from the menu shows a list of every partner with its name and active/inactive status.
- Saving the partner form with a non-empty name creates a partner, active by default, that appears in the list without a page reload being required to see it on next visit.
- Saving the partner form with an empty name creates no record and surfaces a validation message.
- Editing a partner's name and saving persists the new name; it is still there after navigating away and back.
- Toggling a partner to inactive keeps it in the partner list, marked inactive, and removes it from the partner-selection control on the client form; toggling it back to active restores it to both.
- A client that is already linked to a partner keeps that link, fully visible and unchanged, after the partner is deactivated; deactivating a partner is never blocked and never prompts a confirmation, regardless of how many clients reference it.
- Selecting "Clients" from the menu shows a list of every client with its name, short label, billable status, active status, and linked partner if any.
- The client form requires a name, a short label and a default rate; leaving any of the three empty (or, for the rate, entering a non-positive or non-numeric value) creates no record and surfaces a validation message naming the failing field(s).
- Typing a name into a new client form suggests a short label automatically; the user can overwrite the suggestion before saving, and whatever value is present at save time (suggested or typed) is what is stored.
- A new client saves successfully with no partner selected and no default regime selected: both are optional.
- The partner-selection control on the client form offers only active partners when creating a new link; an existing link to a partner that has since been deactivated still displays that partner's name on the client record and can be changed or cleared.
- A new client defaults to billable = yes and active = yes unless the user changes either before saving.
- Editing any client field — name, short label, default rate, billable, active, linked partner, default regime — and saving persists the change; it is still there after navigating away and back.
- Toggling a client to inactive keeps it in the client list, marked inactive; toggling it back to active restores its active status.
- No delete action exists anywhere in this feature for a partner or a client; deactivation/reactivation is the only reversible state change offered.
- With 100 clients and 20 partners entered, both list views render every record, with none omitted, and without requiring pagination.

# Design
- `design/v01-001/` — the nav shell, the partner list/form and the client list/form all have a user interface. `@designer` produces it at gate G2.

# Out of scope (functional)
- Mission categories, portage contracts and tags — the rest of the referential, deferred to a follow-on spec later in the reordered roadmap (see the report accompanying this spec).
- Settings and company profile (`hours_per_day`, the rounding step, the estimated charge rate, the invoice numbering pattern) — a separate, later spec.
- Missions, time entries, invoicing, portage declarations and the billing backlog, and any screen that will eventually consume partners or clients (e.g. a mission's client picker) — later specs; this spec only builds the referential and the nav shell, not their consumers.
- Creating, editing or deleting the REGIME values themselves (Micro / Portage). This spec only lets a client pick one of the two existing, fixed values as its default; the pair itself is not user-managed.
- Hard delete of a partner or a client, in any form.
- An automated "turn this partner into a client" action for the RG-01 direct-billing case (step 10); the client is created manually through the normal client-creation flow.
- Search, filtering, sorting, or pagination of the partner/client lists beyond a plain full list with a visible active/inactive status.
- Any permission or role restriction. V1 has no login (D-40, `context/vision.md` -> Target user); there is one full-access operator.
- Placeholder navigation entries for sections that do not exist yet.
- Concurrent-edit handling. V1 is single-operator with no login; two simultaneous editors of the same record is not a scenario this spec accounts for.

# Open questions
The following were judgment calls, not confirmed with the user. Each is a default, not a hidden guess — reject any of them at G1 and the spec will be revised:
- **Deactivate-only, no hard delete.** Assumed from the `active` boolean already on both entities in `specs/functional/MCD v2.md`, and from the precedent RG-09 sets for missions (inactive but retained, never removed).
- **No cascade and no confirmation when deactivating a partner that clients still reference.** Assumed reversible and non-destructive, same reasoning as RG-09.
- **The RG-01 direct-billing case gets no dedicated conversion action** (step 10) — a manual client creation is enough.
- **No uniqueness constraint on partner/client name or on short label.** Duplicates are permitted. A short-label collision does not corrupt invoice numbering (RG-14): the sequence that guarantees uniqueness is the per-month counter, not the label, which is only the human-readable suffix.
- **`CLIENT.id_regime` (default regime) is in scope** as a plain pick between the two fixed, seeded regime values — no separate spec needed for it, since REGIME itself has no CRUD. Reject this if you'd rather hold the field back for the later referential spec.
- **The nav menu lists only "Partners" and "Clients" for now**, growing one entry per shipped spec, with no placeholders for sections that don't exist yet.
- **No permission distinctions** — single operator, no login (D-40).
- **Volumetry figure for the list-rendering criterion**: 100 clients, taken from `context/vision.md` -> Roadmap -> Later ("under 100 clients"); 20 partners is my own estimate, since vision.md gives no partner count. Confirm or correct the partner figure.

# ── TECHNICAL SPEC ───────────────────────────────────────────
- Filled by @architect after the functional spec is approved. Do not edit by hand.

# Architecture decisions
-

# Feature slice
-

# Data model
-

# Numeric and temporal representation
-

# Server boundary
-

# Data access
-

# Authorisation
-

# Validation
-

# Dependencies
-

# Out of scope (technical)
-
