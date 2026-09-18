# Navigation and partners/clients UX revision (revises v01-001)

# ── FUNCTIONAL SPEC ──────────────────────────────────────────
- Written by @product-owner. Approved by the user at gate G1.

# Goal
- Revise the shipped navigation shell and the partner/client screens from `specs/iteration/v1/v01-001-nav-partners-clients.md` per the UX changes the user validated in an external prototype (`design/v01-001/prototype/`): a persistent, collapsible navigation panel replaces the hamburger-triggered menu; the application title gets its own permanent bar; a partner detail view and a client detail view are introduced, reversing v01-001's original list-only decision (user-approved at G1); the row-level active/inactive toggle moves into the edit form; the partner and client lists drop the columns that toggle and the separate "Edit" control occupied; and a visited-history breadcrumb with back/forward controls is added. No change to the underlying `PARTNER`/`CLIENT` data model, fields, or validation rules (`specs/functional/MCD v2.md` -> PARTNER, CLIENT, RG-01) — this is a presentation-layer revision of an already-shipped feature. The prototype is the source of exact layout, wording and visual behaviour; this spec states only the functional gist each screen must deliver.

# User flow
1. **Navigation panel.** A navigation panel is visible on every route without the user opening it, and can be collapsed to a narrower state and back. The item for the section currently shown is visually distinguished from the other, in either state. Its collapsed/expanded state is not remembered — it resets to its default every time the application loads.
2. **Application title.** The application's title is shown at all times, independent of the navigation panel's state.
3. **Partner list.** Same purpose and data as v01-001 (name, active/inactive status). The inline toggle and separate "Edit" control are removed from the row; the name is the click target.
4. **Partner detail.** Clicking a partner opens a detail view showing its name, its active/inactive status, and its linked clients, each shown with its own name and active/inactive status; each linked client opens that client's own detail view. An "Edit" action opens the same form v01-001 defines, now also carrying the active/inactive toggle.
   - Unhappy path: no clients linked — an empty-state message replaces the list.
   - Unhappy path: the partner id does not resolve to an existing record — a not-found state is shown, not an error page or a blank screen.
5. **Client list.** Same columns as v01-001 (name, short label, billable, active/inactive status, linked partner), minus the inline toggle and separate "Edit" control; the name is the click target.
6. **Client detail.** Clicking a client opens a detail view showing its name, active/inactive status, short label, default rate, billable status, referring partner and default regime, all read-only. A present referring partner is clickable and opens its own detail view. An "Edit" action opens the same form v01-001 defines, now also carrying the active/inactive toggle.
   - Unhappy path: the client id does not resolve to an existing record — a not-found state is shown, not an error page or a blank screen.
7. **Editing, including activation state.** The active/inactive toggle exists only in the edit form (unchanged from v01-001: a new record is always created active) and no longer inline on either list.
8. **Breadcrumb.** A breadcrumb reflects the sequence of list and detail screens actually visited, across both Partners and Clients — not a fixed path derived from the current screen's section. Each crumb returns the user to that screen. The trail has a bounded length; its exact depth and any visual truncation are the prototype's concern, not this spec's. The trail is not remembered — it restarts empty every time the application loads.
9. **Back and forward.** Controls next to the breadcrumb step backward and forward through the same visited-history trail. Each is disabled when there is nothing further in that direction. These controls are entirely independent of the browser's own native back/forward buttons and address bar, which remain available and are untouched by this feature.
   - Unhappy path: the user jumps back to an earlier crumb, then visits a new screen — everything after the point jumped back to is dropped from the trail before the new screen is added.

# Acceptance criteria
- A navigation panel is visible on every screen this feature and v01-001 cover (partner list, partner detail, client list, client detail), with no action required to reveal it, and can be collapsed and expanded again.
- The item matching the section of the screen currently displayed is visually distinguished from the other item, in both states of the panel.
- The navigation panel's collapsed/expanded state resets to its default on every fresh load of the application; it is not remembered across a reload or between sessions.
- The application's title is shown at all times, unaffected by the navigation panel's state.
- Clicking a partner opens a detail view showing that partner's name and active/inactive status.
- The partner detail view lists every client currently linked to that partner, each with its name and active/inactive status; when none is linked, an empty-state message replaces the list.
- Each client listed in the partner detail view is clickable and opens that client's own detail view.
- Opening a partner or client detail view for a record id that does not resolve to an existing record shows a not-found state, not an error page or a blank screen.
- Clicking a client opens a detail view showing that client's name, active/inactive status, short label, default rate, billable status, referring partner, and default regime, all read-only.
- When the client detail view's referring partner is present, it is clickable and opens that partner's detail view; when no partner is linked, no such link is shown.
- Neither the partner list nor the client list shows an active/inactive toggle inline in its rows; changing a record's active status is only possible through its edit form.
- The active/inactive toggle appears in the edit form when editing an existing partner or client, and is absent when creating a new one.
- The partner list's row click target is the name; no separate "Edit" control appears in the list.
- The client list keeps its existing columns (name, short label, billable, active/inactive status, linked partner); the name is the row's click target; no separate "Edit" control appears in the list.
- Both the partner detail view and the client detail view carry an "Edit" action that opens the same create/edit form defined in v01-001 for that entity, now also carrying the active/inactive toggle.
- The breadcrumb reflects the sequence of list and detail screens actually visited, across both Partners and Clients, in visiting order — not a fixed section-derived path.
- Each crumb in the breadcrumb returns the user to the corresponding screen, showing that screen as it was (e.g., the same partner or client).
- Navigating to the screen already at the top of the trail does not add a duplicate crumb.
- The breadcrumb trail has a bounded length; visiting past that bound drops the oldest visited screens first.
- The visited-history trail behind the breadcrumb and the back/forward controls resets to empty on every fresh load of the application; it is not remembered across a reload or between sessions.
- Jumping back to an earlier crumb and then visiting a new screen discards every crumb after the point jumped back to, before the new screen is appended to the trail.
- Back and forward controls step to the previous and next screen in the same visited-history trail as the breadcrumb; each updates the breadcrumb and the navigation panel's highlighted item to match the screen landed on.
- The back control is disabled when the current screen is the first one in the trail; the forward control is disabled when the current screen is the last one in the trail.
- The in-app back and forward controls have no effect on, and are not affected by, the browser's own native back/forward buttons or the address bar.

# Design
- `design/v01-001/prototype/` holds the validated prototype covering the navigation panel, the title bar, the partner and client detail views, the revised list rows, and the breadcrumb/back-forward controls. `@designer` turns it into the canonical design artefacts at gate G2, filed under `design/v01-002/` per this spec's confirmed index. Flag for `@designer`: the prototype folder itself still sits under `design/v01-001/`, indexed to the feature it was originally explored against rather than this spec's `v01-002` — reconciling that (moving it, or citing it from the new location) is `@designer`'s call at G2, not done here.

# Out of scope (functional)
- Any change to `PARTNER`/`CLIENT` fields, defaults, or validation rules — the create/edit forms keep exactly the fields and rules v01-001 already specifies; only where the active/inactive control appears changes.
- Any change to the deactivate/reactivate business rule (RG-09 precedent): still reversible, still no confirmation, still no cascade — only its location moves.
- Search, filtering, sorting, or pagination of either list — still out of scope, as in v01-001.
- Hard delete of a partner or a client, in any form — unchanged from v01-001.
- Persistence of the navigation panel's state or of the breadcrumb/back-forward trail across a reload or between sessions — settled as not persisted (see User flow).
- Any interaction between the in-app back/forward controls and the browser's own native back/forward buttons or address bar — settled as fully independent (see User flow).
- Any distinct full-screen or overlay treatment of the navigation panel on narrow viewports beyond its own collapsed state — the prototype's concern, not a functional requirement here.
- Any permission or role restriction — unchanged from v01-001, V1 has one full-access operator (D-40).
- Concurrent-edit handling — unchanged from v01-001.

# Open questions
- None. The index conflict is resolved: the user's decision is that `context/vision.md`'s roadmap tracks an ordered sequence of ideas, not pre-reserved indices — indices are allocated only when a spec file is actually written. This spec's index is `v01-002`, the next unused index in `specs/iteration/v1/`, consistent with `specs/iteration/README.md` (dependency order: it revises `v01-001` and precedes everything the roadmap now describes after it). Applying that decision to `context/vision.md` itself is a separate, pending edit outside this spec — see the note under Design for the one remaining mechanical follow-up it leaves for `@designer`.
