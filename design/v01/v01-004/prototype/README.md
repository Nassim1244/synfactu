# Prototype — v01-004

An interactive Claude Design canvas prototype of `design/v01/v01-004/README.md`, built directly in the main session (bypassing `@designer`'s markdown-only output, per direct user instruction) so the Referential screen can be reviewed as a working page rather than a written spec alone.

- Live, interactive version: https://claude.ai/artifact/36r5hzHH12VtVmtEVmWsVd (private; open in a Claude session with access to this account).
- `project/Main.dc.html`, `project/States.dc.html` and `project/canvas.json` are a snapshot of that canvas's own source, kept here for reference and history. They are Claude Design Component files (a proprietary format that mounts a small runtime injected by the hosting page) — they will not render by opening the `.dc.html` files directly in a browser.

# What it covers

**`Main.dc.html`** — the full `/referential` screen, stateful and interactive:
- The existing app shell: title bar, nav rail (collapsible, "Referential" shown current) and a minimal breadcrumb.
- All three sections — Mission categories, Portage contracts, Tags — populated with sample data (the mission category bootstrap seed; two sample portage contracts; an eight-row tag hierarchy including one inactive parent with an active child, to show the two flags are independent).
- Each row's "Edit" button and active `Switch` actually work: toggling flips the row's badge live; "New"/"Edit" open a real dialog, pre-filled in edit mode.
- One shared dialog, retextured per entity, with working field-local validation: empty label, empty company/charge rate/start date, charge rate out of 0–100, end date before start date, and a duplicate tag path (all matching the acceptance criteria in `specs/iteration/v1/v01-004-referential-categories-contracts-tags.md`).
- Renaming a tag live-updates every descendant's displayed path (the cascade behaviour from the spec's step 13), and the tag dialog shows the parent as read-only text in edit mode (no re-parenting control), matching `design/v01/v01-004/README.md`.

**`States.dc.html`** — a static reference panel showing the Loading / Empty / Error treatment for one section (Portage contracts, representative of all three per the design doc).

Colours, radii and type match the shipped app's own `src/app/globals.css` tokens (shadcn "stone" palette, Geist Sans/Mono) rather than a generic placeholder palette, so this reads as the real app rather than a mockup.

These are specified functionally in `specs/iteration/v1/v01-004-referential-categories-contracts-tags.md` (gate G1, pending approval) and in design in `design/v01/v01-004/README.md` (gate G2, pending approval).
