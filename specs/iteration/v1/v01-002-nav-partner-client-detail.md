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

# ── TECHNICAL SPEC ───────────────────────────────────────────
- Filled by @architect after the functional spec is approved. Do not edit by hand.
- Gate G2 was explicitly skipped by the user's own direct instruction: `design/v01-002/prototype/` (a validated interactive Claude Design canvas prototype; see `design/v01-002/prototype/README.md` -> "What it covers") stands in for `@designer`'s canonical markdown pass and is this spec's design source. `design/v01-002/README.md` on disk is unrevised v01-001 design content left at this path (no detail views, no rail, no breadcrumb, `Sheet`/hamburger nav) — stale for this feature and not read as canonical here.

# Architecture decisions
- AD-001 - unchanged. This feature stays inside the two domains v01-001 already created, `src/features/partners/` and `src/features/clients/` (AD-021); the nav/breadcrumb rework stays non-domain shared UI under `src/components/nav/`, the same precedent `nav-shell.tsx`/`nav-items.ts` already set (no schema, no repository).
- AD-003 - unchanged. Every mutation stays a Server Action; nothing this feature adds needs a Route Handler (a detail page is a read, not a mutation).
- AD-004 - unchanged. The new `partners/repository.ts` read that lists a partner's clients still only crosses into `Client` fields through this domain's own Prisma `include` (the existing `Partner.clients` relation), never through `clients/repository.ts` - same direction AD-021's rule already applies the other way for `clients/repository.ts` reading `Partner`.
- AD-005 - unchanged for what remains. No new Server Action is introduced. The two that are dropped, `setPartnerActive` and `setClientActive`, take their schemas with them (see Validation) - the functional spec now requires the active toggle to be reachable only through the edit form, and an orphaned row-level toggle action would still be directly callable (`policy_security.md` -> Threat model), so it is removed rather than left unused.
- AD-006 - unchanged. Both new detail pages are async Server Components awaiting their domain's `queries.ts`, same pattern as the list pages; no client-side data-fetching library. The visited-history trail behind the breadcrumb fetches nothing - it is UI-only state - so it neither touches nor supersedes AD-006; see AD-024 for what it is instead.
- AD-007 / AD-008 - unchanged. No new money, duration, rate or period field; `createdAt`/`updatedAt` stay audit-only and unrendered.
- AD-009 / AD-017 - unchanged. Still no session, the per-action role check is still dormant.
- AD-020 - unchanged. No schema change, nothing to say about the Prisma/driver-adapter baseline.
- AD-021 - unchanged. Still two domains, not merged; the detail views land inside the domain they already belong to.
- AD-022 / AD-023 - unchanged. No new model, no new field, nothing new to name.
- **AD-024** (new, this feature) - the breadcrumb/back-forward visited-history trail is ephemeral, in-memory client-side React Context state: no URL encoding, no `localStorage`/`sessionStorage`, no new dependency. Recorded in `ai-rules/decisions.md`; rule lives in this spec's Feature slice below.

# Feature slice
- `src/components/nav/` (shared, not a domain - no schema, no repository; same precedent as v01-001's `nav-items.ts`/`nav-shell.tsx`)
  - `nav-items.ts` - `NavItem` gains an `icon` field (a `lucide-react` icon component reference) for the rail's icon-only collapsed state; still exactly the two literal entries, same order.
  - `navigation-history-context.tsx` (new) - `NavigationHistoryProvider` and the `useNavigationHistory()` hook (AD-024). Holds `{ trail: { href: string; label: string }[]; index: number }` in `useReducer`/`useState`, capped at a bounded length (drop the oldest entry first past the cap - the exact cap and any visual truncation follow `design/v01-002/prototype/README.md`, which states 10, collapsing to an ellipsis plus the last 4 - a UI detail, not an architecture one). Exposes `registerVisit(href, label)` (dedupes a consecutive repeat of the same `href` - "no duplicate crumb" - and truncates everything after the current index before appending, mirroring a browser history stack), `goBack()`, `goForward()`, `canGoBack`, `canGoForward`, `current`. Mounted once, wrapping the whole app.
  - `register-visit.tsx` (new) - a tiny client leaf, `<RegisterVisit href={...} label={...} />`, wrapping a `useEffect` call to `registerVisit` from `useNavigationHistory()`. Exists so a Server Component page/detail view can drop in visit-tracking without itself becoming a Client Component (`policy_architecture.md` -> Defaults, "`use client` ... pushed as far down the tree as possible").
  - `nav-rail.tsx` (new) - the persistent, collapsible rail (`"use client"`: local `useState` for collapsed/expanded, not persisted - functional spec: "resets to its default every time the application loads"). Current-item detection changes from v01-001's exact match to a prefix match - `pathname === item.href || pathname.startsWith(item.href + "/")` - so `/partners/42` still highlights "Partners".
  - `title-bar.tsx` (new) - the permanent "SynFactu" title bar. Fully static; no client state needed, so it stays a plain Server Component even though it is composed alongside client siblings.
  - `breadcrumb-bar.tsx` (new) - `"use client"`: reads `useNavigationHistory()`, renders the crumbs (shadcn `Breadcrumb`, see Dependencies) and the back/forward `Button`s, `disabled` bound to `canGoBack`/`canGoForward`. Selecting a crumb or a back/forward control calls `router.push` to the corresponding trail entry's `href` and moves `index` accordingly - the same trail the breadcrumb reads, per the functional spec's "same visited-history trail" requirement.
  - `nav-shell.tsx` (rewritten, not additive) - composes `TitleBar`, `NavRail` and `BreadcrumbBar`; still mounted once, in `src/app/layout.tsx`. The v01-001 `Sheet`/hamburger implementation is replaced, not kept alongside.
- `src/app/layout.tsx` - wraps `children` in `NavigationHistoryProvider`, inside which `NavShell` and the routed content both sit, so every route's visit-registration and the rail/breadcrumb read the same trail instance.
- `src/features/partners/`
  - `repository.ts` - add `getPartnerWithClients(id)`: one partner (`PARTNER_SELECT`) plus its linked clients via the existing `Partner.clients` relation, `select: { id: true, name: true, active: true }`, `orderBy: { name: "asc" }` - the partner detail view's dataset, or `null` when the id does not resolve. Add `listClientIdsByPartner(partnerId)`: `clients.findMany({ where: { partnerId }, select: { id: true } })`, used only by `actions.ts` to know which client detail pages to revalidate after a partner update (see Server boundary) - not part of any domain type, a plain `number[]`. Remove `setPartnerActive` (dead: no longer called from anywhere in the UI once the row-level toggle is gone).
  - `queries.ts` - add `getPartnerWithClients`, thin wrapper as the existing two are.
  - `schema.ts` - remove `setPartnerActiveSchema` and the `SetPartnerActive` type.
  - `actions.ts` - remove `setPartnerActive`. `updatePartner` additionally revalidates the partner's own detail path and every currently-linked client's detail path (see Server boundary).
  - `components/`
    - `PartnerList.tsx` - rewritten: the row's name becomes a `next/link` `Link` to `/partners/${id}`; `PartnerRowActions`, the row `Switch`, the per-row "Edit" `Button` and `usePartnerActiveToggle` are all removed, and with them every reason this file needed `"use client"` - it can become a plain Server Component (`policy_architecture.md` -> Defaults, "Server Components by default").
    - `PartnerDetail.tsx` (new) - Server Component, props are one `getPartnerWithClients` result. Renders name, a status `Badge`, the linked-clients list (each a `Link` to `/clients/${id}`, name + status `Badge`) or the empty-state message, an "Edit" `Button` opening the existing `PartnerFormDialog` in `mode="edit"` (unchanged - it already carries the `active` `Switch` in edit mode, per v01-001), and a `<RegisterVisit href={\`/partners/${id}\`} label={partner.name} />` leaf.
  - Routes: `src/app/partners/[id]/page.tsx` (`export const dynamic = "force-dynamic"`, same reasoning as the list page; parses the route param with `Number(...)`, calls `notFound()` from `next/navigation` when it is not a positive integer or `getPartnerWithClients` resolves `null`), `loading.tsx` (skeleton, same pattern as the list's), `error.tsx` (same `Alert` + "Try again" pattern as the list's), `not-found.tsx` (new file convention, not present in v01-001: the not-found state the functional spec requires - "not an error page or a blank screen").
- `src/features/clients/`
  - `repository.ts` - no new function: `getClientById` already joins `partner: { select: { id: true, name: true } }`, which is every field the client detail view needs from the referring partner. Remove `setClientActive` (dead, same reasoning as `setPartnerActive`).
  - `queries.ts` - unchanged; `getClientById` is already exported and already used nowhere in production code before this feature, now consumed by the new detail page.
  - `schema.ts` - remove `setClientActiveSchema` and the `SetClientActive` type.
  - `actions.ts` - remove `setClientActive`. `updateClient` additionally revalidates the client's own detail path and, when `partnerId` is not `null`, that partner's detail path (see Server boundary).
  - `components/`
    - `ClientList.tsx` - rewritten the same way as `PartnerList.tsx`: name becomes a `Link` to `/clients/${id}`, `ClientRowActions`, the row `Switch`, the per-row "Edit" `Button` and `useClientActiveToggle` are all removed; becomes a plain Server Component for the same reason.
    - `ClientDetail.tsx` (new) - Server Component, props are one `getClientById` result plus (for the edit dialog) the `listActivePartners()` result already required by `ClientFormDialog`. Renders every read-only field the functional spec lists (name, status `Badge`, short label, default rate formatted via `Money`, billable, default regime, referring partner - a `Link` to `/partners/${partnerId}` when present, nothing when absent), an "Edit" `Button` opening the existing `ClientFormDialog` in `mode="edit"` (unchanged), and a `<RegisterVisit href={\`/clients/${id}\`} label={client.name} />` leaf.
  - Routes: `src/app/clients/[id]/page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` - same shape and same reasoning as the partner detail route above.
- `src/app/partners/page.tsx` / `src/app/clients/page.tsx` (existing, modified) - each adds a `<RegisterVisit href="/partners" label="Partners" />` (respectively `/clients`/"Clients") leaf, so the list screens themselves appear in the visited-history trail, per the functional spec's "sequence of list and detail screens actually visited."

# Data model
- N/A - no schema change. The functional spec states this explicitly ("No change to the underlying `PARTNER`/`CLIENT` data model, fields, or validation rules"). Every field this feature's detail views render already exists: `Partner.clients` (the back-relation `prisma/schema.prisma` already declares) supplies the partner detail view's linked-clients list, and `Client.partner` (already selected as `{ id, name }` by `CLIENT_SELECT` in `clients/repository.ts`) supplies the client detail view's referring-partner link. No migration.

# Numeric and temporal representation
- N/A beyond what v01-001 already established - no new money, duration, rate, instant or period field. The client detail view renders `defaultRateCents` through the existing `Money` value object (AD-007), the same formatting method the client form already uses; `createdAt`/`updatedAt` remain audit-only and are not rendered on either detail view, consistent with v01-001.

# Server boundary
Every action below still starts with `schema.parse` (no role check to perform - AD-017), then the repository call, then `revalidatePath` for every route the change is now visible on; still returns `{ ok: true, data }` or `{ ok: false, error }` with a stable error code (`policy_coding_guidelines.md` -> Error handling and logging).

- `partners/actions.ts`
  - `createPartner` - unchanged. Revalidates `/partners`.
  - `updatePartner` - unchanged schema and repository call. Revalidation grows: `/partners`, `/partners/${id}` (its own new detail page), `/clients` (unchanged reason: the client list's Partner column), and `/clients/${clientId}` for every id `listClientIdsByPartner(id)` returns (a renamed or reactivated partner is shown by name and status on every one of its linked clients' detail pages, which did not exist before this feature).
  - `setPartnerActive` - removed. Its one caller (the list row's `Switch`) no longer exists; the active toggle now reaches the repository only through `updatePartner`, called from the edit form on the detail page.
- `clients/actions.ts`
  - `createClient` - unchanged. Revalidates `/clients`.
  - `updateClient` - unchanged schema and repository call. Revalidation grows: `/clients`, `/clients/${id}` (its own new detail page), and `/partners/${partnerId}` when `parsed.partnerId` is not `null` (a renamed, reactivated or deactivated client is shown by name and status on its referring partner's detail page; cheap because `partnerId` is already part of the validated input - no extra query, unlike the partner side above).
  - `setClientActive` - removed, same reasoning as `setPartnerActive`.
- No Route Handler: nothing here is the Better Auth catch-all, the health check, an inbound webhook, or a non-JSON file download (AD-003's closed list). A detail page is a read, served by its Server Component, not a mutation.
- Known limitation, stated rather than engineered around: `updatePartner`'s revalidation of every linked client's detail path keeps that path exact and bounded (one extra narrow, id-only query, cheap at this app's volumetry - see `context/vision.md` -> Roadmap -> Later, under 100 clients). Nothing goes further than that: an already-open browser tab on an affected page updates only on its next navigation or reload, same as every other page in this app, `force-dynamic` notwithstanding - `revalidatePath` invalidates the Next.js client router cache, it does not push to an open tab.

# Data access
- `partners/repository.ts`
  - `listPartners`, `listActivePartners`, `getPartnerById`, `createPartner`, `updatePartner` - unchanged from v01-001, same scoping note (none - AD-017).
  - `getPartnerWithClients(id)` (new) - one partner plus its linked clients (`id`, `name`, `active`, ordered by name), or `null`. No scoping (AD-017). Feeds `PartnerDetail`.
  - `listClientIdsByPartner(partnerId)` (new) - every client id currently linked to a partner, for `updatePartner`'s revalidation only; not a domain read, returns a plain `number[]`, not a `ClientRecord[]`. No scoping (AD-017).
  - `setPartnerActive` - removed.
- `clients/repository.ts`
  - `listClients`, `getClientById`, `createClient`, `updateClient` - unchanged from v01-001, same scoping note (none - AD-017). `getClientById` is now also the client detail view's read, unchanged in shape.
  - `setClientActive` - removed.
- Note for when authentication ships (AD-017's debt, carried forward from v01-001): the two new reads (`getPartnerWithClients`, `listClientIdsByPartner`) join the set of functions that will need a session-derived scope added; nothing here resolves that debt.

# Authorisation
- N/A beyond AD-017, unchanged from v01-001: V1 has no sessions and no roles, so the per-entry-point role check is still dormant, not violated, for every action, query and new detail route this feature adds. No screen, action or query here carries any role restriction (functional spec inherits v01-001's "No permission distinctions", D-40).

# Validation
- `partners/schema.ts` - `createPartnerSchema`, `updatePartnerSchema` unchanged. `setPartnerActiveSchema` removed (its action is removed - see Server boundary).
- `clients/schema.ts` - `createClientSchema`, `updateClientSchema` unchanged. `setClientActiveSchema` removed, same reasoning.
- Detail route params: `[id]` is parsed with `Number(...)` in each `page.tsx`; a result that is not a positive integer calls `notFound()` before any repository call. This is not a Zod schema at a Server Action/Route Handler boundary (AD-005 governs those specifically), but the same defensive posture applies for consistency with `policy_security.md` -> Threat model ("assume any ... can be invoked directly, with arbitrary arguments") - an `id` is client-suppliable via the URL.
- An unauthorised read and a missing record already return the same response (`policy_security.md` -> Data exposure, "existence cannot be probed") for the reason AD-017 gives: there is no authorisation distinction yet, so "not found" is the only outcome a bad or absent id ever produces, satisfying that rule by construction rather than by a dedicated check.

# Dependencies
- One new shadcn primitive: `Breadcrumb`, added as files under `src/components/ui/` the same way the ten v01-001 primitives were, via the shadcn CLI, on the already-pinned `radix-ui`/`class-variance-authority`/`lucide-react` stack. No new npm package.
- No primitive for the collapsible rail itself: expand/collapse is a local boolean toggling Tailwind width/visibility classes on a plain `<nav>`, composed from the existing `Button` - not shadcn's own composite `Sidebar` block (which bundles cookie-based persistence, a mobile `Sheet` variant, and grouping components this feature's two-item rail does not need). Per `policy_techstack.md` -> Dependencies, "prefer a copied component or a twenty-line helper over a dependency for anything trivial," and per AD-024's own reasoning against unneeded machinery for ephemeral state.
- No new npm dependency for the visited-history trail (AD-024): React Context, already part of `react` (pinned).

# Out of scope (technical)
- No `deletedAt`/soft-delete column, no tenant/session scoping, no `Regime` table/`REGIME_RATE`, no TanStack Query, no character/format restriction on `shortLabel` beyond "required" - all unchanged from v01-001's own Out of scope (technical), none of it touched by this feature.
- Revalidating an already-open browser tab on a page this feature's edits affect indirectly (e.g., a partner detail page left open while, in another tab, one of its clients is renamed) - out of scope, and not achievable through `revalidatePath` alone (see Server boundary's "Known limitation"); would need a push mechanism (a websocket or SSE channel), which nothing in this single-operator V1 app justifies.
- The exact breadcrumb cap and its collapse-to-ellipsis presentation - left to `@coder` against `design/v01-002/prototype/README.md` (10 entries, collapsing to an ellipsis plus the last 4), since the functional spec itself states the exact depth and any visual truncation are the design's concern, not a functional requirement.
- Any icon choice for the rail's collapsed state - a visual decision for `@coder`/the prototype to settle, not an architecture one; `nav-items.ts`'s new `icon` field only fixes that a `lucide-react` component reference is the shape, not which one.
- Keyboard and focus-management detail of the rail, breadcrumb and back/forward controls - inherits the Radix-based primitives' own native behaviour, same posture as v01-001's Keyboard section; no bespoke shortcut is introduced.
