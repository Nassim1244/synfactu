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
- AD-001 - feature-sliced structure: this feature lands as two domains under `src/features/` (see AD-021).
- AD-003 - every mutation is a Server Action; no Route Handler is needed (nothing here matches the closed list).
- AD-004 - the repository is the only Prisma call site in each domain; `clients/repository.ts` reads `Partner` data through its own Prisma `include`, never through `partners/repository.ts`.
- AD-005 - every Server Action parses its input with Zod before touching the repository.
- AD-006 - reads stay async Server Components awaiting `queries.ts`; no client-side data-fetching library is introduced. The row-level active `Switch`'s pending/settle/revert look (design v01-001, screens 2 and 4) is plain `useTransition` around the Server Action call plus local component state - it is not an optimistic update (nothing changes before the response), so it does not need TanStack Query and AD-006 is not superseded.
- AD-007 - `Client.defaultRateCents` is stored as an integer number of cents and handled through `Money`, never a raw number; see Numeric and temporal representation.
- AD-008 - `createdAt`/`updatedAt` on both models are UTC `DateTime`; nothing in this feature is a period.
- AD-009 / AD-017 - the per-action role check is dormant, not written: V1 carries no session and no role (bootstrap debt, AD-017). See Authorisation.
- AD-020 - the two new models are built on the Prisma 7 + driver-adapter baseline already in `prisma/schema.prisma`; no change to the generator or datasource block.
- **AD-021** (new, this feature) - `Partner` and `Client` are two separate domains, `src/features/partners/` and `src/features/clients/`, not one combined domain.
- **AD-022** (new, this feature) - `Client.regime` is a Prisma `enum Regime { MICRO PORTAGE }`, not a lookup table.
- **AD-023** (new, project-wide) - Prisma naming convention for every future model: PascalCase model names, camelCase fields, mapped to snake_case tables/columns via `@map`/`@@map`. Recorded in `ai-rules/decisions.md`; the rule itself now lives in `policy_architecture.md` -> Data model conventions.

# Feature slice
- `src/features/partners/`
  - `schema.ts` - `createPartnerSchema` (`name`), `updatePartnerSchema` (`id`, `name`, `active`), `setPartnerActiveSchema` (`id`, `active`). Exports the inferred types.
  - `repository.ts` - `listPartners`, `listActivePartners`, `getPartnerById`, `createPartner`, `updatePartner`, `setPartnerActive`. The only file importing `Partner` from `src/generated/prisma`.
  - `actions.ts` - `createPartner`, `updatePartner`, `setPartnerActive`, each `"use server"`, each: `schema.parse` (no role check to perform yet, AD-017) -> repository call -> `revalidatePath`.
  - `queries.ts` - `listPartners`, `listActivePartners`, `getPartnerById`, called by `/partners`' Server Component and, cross-feature, by `clients/components/` for the referring-partner `Select`.
  - `components/` - `PartnerList` (table, loading/empty/error states per design screen 2), `PartnerFormDialog` (create/edit, design screen 3).
- `src/features/clients/`
  - `schema.ts` - `createClientSchema`, `updateClientSchema`, `setClientActiveSchema` - see Validation.
  - `domain.ts` - `deriveShortLabel(name: string): string`, the pure function behind the auto-suggestion (D-47). No Prisma, no React. The exact derivation (truncation, initials, slug) is left to `@coder`; the design (`Interaction detail` -> "Short-label auto-suggestion") only fixes the pristine/dirty tracking around it, not the algorithm.
  - `repository.ts` - `listClients` (joins `Partner` via Prisma `include` for the list's Partner column), `getClientById` (same join), `createClient`, `updateClient`, `setClientActive`. The only file importing `Client`/`Regime` from `src/generated/prisma`.
  - `actions.ts` - `createClient`, `updateClient`, `setClientActive`, same shape as partners' actions.
  - `queries.ts` - `listClients`, `getClientById`.
  - `components/` - `ClientList` (design screen 4), `ClientFormDialog` (design screen 5), consuming `partners/queries.ts` for the active-partner options.
- `src/components/nav/` (shared, not a domain - no schema, no repository)
  - `nav-items.ts` - the static, hardcoded array `[{ label: "Partners", href: "/partners" }, { label: "Clients", href: "/clients" }]` the design calls for; grows one literal entry per future spec, per the functional spec's own framing.
  - `nav-shell.tsx` - the hamburger trigger + `Sheet`, mounted once in `src/app/layout.tsx` (design's "Decisions to confirm at G2" #1).
- Routes: `src/app/partners/page.tsx`, `src/app/clients/page.tsx` - each an async Server Component awaiting its domain's `queries.ts`. Both wire in the shared `NavShell` already mounted at the root layout, nothing route-specific.

# Data model
- Additive only. First models in `prisma/schema.prisma`; migration `20260916112115_add_partners_and_clients`, already generated and applied to the dev database via `prisma migrate dev --name add_partners_and_clients` (approved at G3). Nothing existing is dropped, retyped or backfilled - there was no prior data.
- `Partner` (`@@map("partners")`): `id` PK autoincrement, `name String`, `active Boolean @default(true)`, `createdAt`/`updatedAt`. Relation: `clients Client[]`.
- `enum Regime { MICRO PORTAGE }` (AD-022) - no backing table.
- `Client` (`@@map("clients")`): `id` PK autoincrement, `name String`, `shortLabel String @map("short_label")`, `billable Boolean @default(true)`, `active Boolean @default(true)`, `defaultRateCents Int @map("default_rate_cents")`, `regime Regime?`, `partnerId Int? @map("partner_id")` with `partner Partner? @relation(fields: [partnerId], references: [id], onDelete: SetNull)`, `createdAt`/`updatedAt`.
- `onDelete: SetNull` on `Client.partnerId`: this feature never hard-deletes a `Partner` (no delete action exists at all, per Out of scope (functional)), so the action is currently unreachable in practice; it is specified so the schema is correct if a maintenance-only hard delete is ever added later.
- Reversal: drop `clients` then `partners` (FK order) - safe today because both tables are new and empty in every environment that has not yet run this migration.

# Numeric and temporal representation
- `Client.defaultRateCents` - the TJM (`specs/functional/MCD v2.md` D-06), a currency amount, not a percentage - is `Money` (AD-007), stored as an integer number of cents. It is not a `Rate`: a day rate in euros is money, basis points are for percentages like a charge rate.
- The client form's "Default rate (TJM)" field reaches the Server Action as a decimal string (see Validation), not a JS number - a native `type="number"` input's float value is never multiplied or divided to reach cents. `@coder` adds `Money.fromDecimalString(value: string): Money` to `src/lib/money/money.ts`, parsing by digit-shifting (mirroring the existing `toDecimalString`), never `parseFloat`/multiplication, consistent with `policy_coding_guidelines.md` -> Value objects ("rounding happens inside the value object"). The repository is the boundary that calls it, per AD-007.
- `createdAt`/`updatedAt` on both models: UTC `DateTime` (AD-008), audit-only, never rendered to the user in this feature.
- No `Duration`, no `Rate`, no period (`YYYY-MM`) field anywhere in this feature.

# Server boundary
Every action below: `schema.parse` first (no role check to perform - AD-017), then the repository call, then `revalidatePath`. Each returns `{ ok: true, data }` or `{ ok: false, error }` (`policy_coding_guidelines.md` -> Error handling and logging), `error` being a stable code, never a raw Prisma message (`policy_security.md` -> Data exposure).

- `partners/actions.ts`
  - `createPartner` - schema: `createPartnerSchema`. Revalidates `/partners`.
  - `updatePartner` - schema: `updatePartnerSchema`. Revalidates `/partners` and `/clients` (a renamed or reactivated partner is embedded in the client list's Partner column).
  - `setPartnerActive` - schema: `setPartnerActiveSchema`. Revalidates `/partners` and `/clients` (same reason).
- `clients/actions.ts`
  - `createClient` - schema: `createClientSchema`. Revalidates `/clients`.
  - `updateClient` - schema: `updateClientSchema`. Revalidates `/clients`.
  - `setClientActive` - schema: `setClientActiveSchema`. Revalidates `/clients`.
- No Route Handler: nothing here is the Better Auth catch-all, the health check, an inbound webhook, or a non-JSON file download (AD-003's closed list).

# Data access
- `partners/repository.ts`
  - `listPartners()` - every partner, ordered by name. No scoping: V1 is single-operator, nothing to scope by yet (AD-017).
  - `listActivePartners()` - same, filtered to `active: true`; feeds the client form's referring-partner `Select` (design screen 5, "options: every active partner").
  - `getPartnerById(id)` - one partner or `null`.
  - `createPartner({ name })` - inserts with `active: true` (functional spec: "created active").
  - `updatePartner(id, { name, active })`.
  - `setPartnerActive(id, active)` - the row-level toggle's target.
- `clients/repository.ts`
  - `listClients()` - every client, ordered by name, `include: { partner: { select: { id: true, name: true } } }` for the list's Partner column and the edit dialog's "still shows the (inactive) partner" requirement. No scoping (AD-017).
  - `getClientById(id)` - same include, one client or `null`.
  - `createClient({ name, shortLabel, billable, defaultRateCents, regime, partnerId })` - inserts with `active: true`, `billable` defaulting to `true` when omitted (functional spec defaults).
  - `updateClient(id, { ...all fields })`.
  - `setClientActive(id, active)`.
- Note for when authentication ships (AD-017's debt): these ten functions are exactly the set that then needs a session-derived scope added; none exists to omit today.

# Authorisation
- N/A beyond AD-017: V1 has no sessions and no roles, so the per-entry-point role check `policy_security.md` -> Authentication and authorisation describes is dormant, not violated, for every action and query in this feature. No screen, action or query here carries any role restriction (functional spec: "No permission distinctions", D-40).

# Validation
- `partners/schema.ts`
  - `createPartnerSchema`: `name` - `z.string().trim().min(1)` ("Name is required.").
  - `updatePartnerSchema`: `id` - positive int; `name` - same rule as create; `active` - boolean.
  - `setPartnerActiveSchema`: `id` - positive int; `active` - boolean.
- `clients/schema.ts`
  - `name` - `z.string().trim().min(1)` ("Name is required.").
  - `shortLabel` - `z.string().trim().min(1)` ("Short label is required.").
  - `defaultRate` - a decimal string, `^\d+(\.\d{1,2})?$`, further rejected when the parsed amount is zero ("Enter a positive number." - covers empty, non-numeric and non-positive in one message per the design's error copy).
  - `billable` - boolean, defaults to `true` when absent.
  - `active` - boolean, edit only, defaults to `true` on create.
  - `regime` - `z.enum(["MICRO", "PORTAGE"]).nullable().optional()`.
  - `partnerId` - `z.number().int().positive().nullable().optional()`. The repository relies on the FK constraint for existence (an unknown id surfaces as a stable generic error, never the raw SQLite constraint name - `policy_security.md` -> Data exposure). No server-side "must currently be active" re-check: the acceptance criteria require an existing link to a since-deactivated partner to keep saving unchanged, and restricting new selections to active partners is the `Select`'s own option list (design screen 5), not a permission boundary, so AD-005/`policy_security.md` do not require re-asserting it server-side.

# Dependencies
- None new. The ten shadcn primitives (`Sheet`, `Table`, `Dialog`, `Input`, `Label`, `Switch`, `Select`, `Badge`, `Skeleton`, `Alert`) are added as files under `src/components/ui/` by `@coder`, via the already-pinned `shadcn` CLI, built on the already-pinned `radix-ui`, `class-variance-authority` and `lucide-react`.
- `Money.fromDecimalString()` is a new method on the existing `Money` class in `src/lib/money/money.ts` - an addition to already-owned code, not a new package.

# Out of scope (technical)
- No `deletedAt` / soft-delete column on either model - this feature has no delete concept, hard or soft; `active` is the only reversible state the approved functional spec defines.
- No tenant/session scoping in either repository - none exists yet (AD-017's carried debt); this feature neither introduces nor resolves it.
- No `Regime` table, no `REGIME_RATE` - deferred by AD-022 until a later spec needs charge-rate historization; that spec supersedes AD-022.
- No TanStack Query or other client-fetching/optimistic-update library - covered under Architecture decisions (AD-006 not superseded).
- No character or format restriction on `shortLabel` beyond "required" - the invoice-numbering pattern that consumes it (RG-14, D-47) is a later, separate spec's concern.
- The exact short-label derivation algorithm - left to `@coder` as a pure function in `clients/domain.ts`; not an architecture decision (see Feature slice).
