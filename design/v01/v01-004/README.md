# Design v01-004 — Referential: mission categories, portage contracts, tags

- Spec: `specs/iteration/v1/v01-004-referential-categories-contracts-tags.md` (FUNCTIONAL SPEC, pending G1).
- Prototype: `prototype/` — interactive Claude Design canvas, built directly in the main session (bypassing `@designer`'s markdown-only pass, per direct user instruction). Exploratory, not yet reviewed at gate G2. It is the source of exact layout, wording and interaction; this file states only the functional gist.

# Screens
1. **Referential** — route `/referential`, one screen, three sections stacked: Mission categories, Portage contracts, Tags. Each section is a list (`Table`) with its own "New" action; row actions are an inline "Edit" button and an active `Switch`.
2. **Mission category form** — dialog, create/edit, from the Mission categories section.
3. **Portage contract form** — dialog, create/edit, from the Portage contracts section.
4. **Tag form** — dialog, create/edit, from the Tags section; parent picker on create only, read-only parent on edit (no re-parenting).

# States covered
- Loading (per-section skeleton), Empty (Portage contracts and Tags only — Mission categories can't go empty, no delete and a 3-row bootstrap seed), Populated, Error (`Alert` + "Try again"), Saving/saved (row-level `Switch` pending/settle/revert) — see `prototype/States.dc.html` for the Loading/Empty/Error reference.
- Field-local validation on every dialog: required fields, charge-rate range (0–100), end-date-before-start, duplicate tag path.

# Notes
- **No detail page for any of the three entities** — deviates from `design/README.md`'s "every entity gets a detail page" guideline. None of the three has related data worth its own page, and the spec groups all three onto one screen; row actions stay inline (the v01-001 shape), not moved to a detail page like v01-002 did for partners/clients.
- No delete anywhere — deactivate/reactivate only, no confirmation.
- No new shadcn primitive required (`Table`, `Badge`, `Switch`, `Dialog`, `Input`, `Label`, `Select`, `Button`, `Skeleton`, `Alert` already exist). Portage contract dates use a native `<input type="date">` via the existing `Input` — no date-picker primitive.
- Nav: add `{ label: "Referential", href: "/referential", icon: Tags }` to `NAV_ITEMS` in `src/components/nav/nav-items.ts`, after "Clients". `NAV_FOOTER_ITEMS` (Settings) unaffected.
- No client-side data-fetching library, no live-updating view (same reasoning as v01-001/v01-002, AD-006).
