# Prototype — v01-001

An interactive Claude Design canvas prototype, built directly with the user (bypassing `@designer`'s markdown-only output) to explore the nav/partners/clients UX before `design/v01-001/README.md` was revised.

- Live, interactive version: https://claude.ai/artifact/MgEn1kU8yAQmUxMWEB14u4 (private; open in a Claude session with access to this account).
- `project/App.dc.html` and `project/canvas.json` are a snapshot of that canvas's own source, kept here for reference and history. They are Claude Design Component files (a proprietary format that mounts a small runtime injected by the hosting page) — they will not render by opening `App.dc.html` directly in a browser.

# What it covers

A single-artboard, stateful prototype demonstrating:
- A persistent, collapsible left navigation rail (icon-only collapsed, icon + label expanded) replacing the hamburger/Sheet nav from the original `design/v01-001/README.md`.
- A permanent "Synfactu" title bar, independent of the nav rail.
- Partner list → partner detail (with its linked clients, drilling into client detail).
- Client list → client detail (with its referring partner, drilling back into partner detail).
- The active/inactive toggle moved from the list row into the edit dialog (edit mode only).
- A breadcrumb that reflects the actual screens visited (not a fixed section path), capped at 10 screens, collapsing to an ellipsis plus the last 4 crumbs beyond that depth.
- Browser-style back/forward controls over the same visited-history trail.

These changes are specified functionally in `specs/iteration/v1/v01-001-fix01-fix_design.md` (gate G1, pending approval).
