# Design v01-003 — Settings and company profile

- Spec: `specs/iteration/v1/v01-003-settings-company-profile.md` (FUNCTIONAL SPEC approved at G1).
- Prototype: `prototype/` — interactive Claude Design canvas, exploratory only, not yet reviewed at gate G2 by `@designer`.

# Screens
1. **Settings — view.** Two read-only sections, each with its own "Edit" action: Company profile, Application settings.
2. **Edit company profile.** Legal/trading name, SIRET, street, postal code, city, email, phone. Field-local validation errors on save.
3. **Edit application settings.** Hours/day, rounding step, invoice numbering pattern, coefficient-display toggle, estimated charge rate. Rounding direction shown read-only ("Always up"), not an editable control.

# States covered
- First-use empty state (Company profile) and bootstrap defaults (Application settings).
- Field-local validation errors (required fields, 14-digit SIRET, email format, numeric ranges).
- Coefficient toggle on/off.

# Notes
- No delete action anywhere in either section.
- Coefficient visibility and rounding direction are edit-only details — not repeated on the read-only view.
- Nav: "Settings" pinned to the bottom of the left rail with a gear icon, separated from Partners/Clients.
