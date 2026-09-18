# Referential: mission categories, portage contracts, tags

# ── FUNCTIONAL SPEC ──────────────────────────────────────────
- Written by @product-owner. Approved by the user at gate G1.

# Goal
- Let the consultant manage the three remaining referential entities every later V1 screen depends on: **mission categories** (a small, extensible classification list), **portage contracts** (the relationship with a portage company, carrying its own contractual charge rate and validity period, several of which may run at once), and **tags** (a predefined, extensible, hierarchical list used to label time entries) (`specs/functional/MCD v2.md` -> MISSION_CATEGORY, PORTAGE_CONTRACT, RG-18, RG-19, RG-28; `specs/functional/Décisions v2.md` -> D-16, D-17, D-33; `specs/functional/Framing session v1.md` -> Point 8, D-49). This is next in the roadmap (RM-003) because missions (RM-004) read all three — a mission designates its category and, when portage, its contract — and the time entry journal (RM-005) reads tags directly.

# User flow
1. **Navigation.** The nav gains a "Referential" entry, alongside Partners, Clients and Settings. Selecting it shows three sections on one screen — **Mission categories**, **Portage contracts**, **Tags** — each with its own list and its own "New" action. Each section is a list supporting create, edit and deactivate/reactivate on an arbitrary number of records — not the single-record view/edit pattern used for settings (v01-003).
2. **Mission categories — list.** Shows every category with its label and active/inactive status. On first use, before any edit, the list already holds the three bootstrap-seeded rows — Formation école, Formation pro, Conseil (`Framing session v1.md` -> Point 10) — each active; this is the seeded starting state, not an empty state.
3. **Mission categories — create.** The user enters a label and saves. Created active. Appears in the list immediately.
   - Unhappy path: an empty label is rejected before the record is created, with a message identifying the problem.
4. **Mission categories — edit.** The user changes a category's label. The change is visible on the list after saving.
5. **Mission categories — deactivate / reactivate.** The user toggles a category's active status instead of deleting it. A deactivated category stays in the list, marked inactive. Reactivating puts it back. (What a mission form does with an inactive category is defined in RM-004, not here — see Out of scope.)
6. **Portage contracts — list.** Shows every contract with its label, company name, charge rate, validity period (start date, and end date or "open-ended" when none is set), and active/inactive status. Empty state on first use: no contracts recorded yet — unlike mission categories, nothing is seeded here, since a contract is the operator's own real data.
7. **Portage contracts — create.** The user enters: a label (required); a company name (required); a charge rate, as a percentage (required); a validity start date (required); optionally, a validity end date. Created active by default.
   - Unhappy path: an empty label, company name, charge rate, or start date is rejected before the record is created, with a message identifying which field(s) failed.
   - Unhappy path: an end date earlier than the start date is rejected, with a message identifying the problem.
8. **Portage contracts — edit.** The user changes any field, including the charge rate and either validity date, directly on the existing record. There is no separate workflow that forces closing a contract before its rate can change — MCD v2's description of a mid-contract rate change ("closing the period and opening a new row") is a suggested operating practice for the consultant, not a system-enforced constraint in this spec (see Open questions).
9. **Portage contracts — overlapping periods.** Creating or editing a contract whose validity period overlaps another contract's — including another contract for the same company — is not blocked and produces no warning. Several contracts may be active at the same time by design (RG-28), which is exactly why a portage mission must designate which one it runs under (RG-17/D-17, built in RM-004, not here).
10. **Portage contracts — deactivate / reactivate.** Same pattern as mission categories: toggling instead of deleting, staying visible when deactivated.
11. **Tags — list.** Shows every tag with its label, its position in the hierarchy (derived from its stored path), and its active/inactive status. Empty state on first use: no tags recorded yet — unlike mission categories, nothing is seeded here; the operator builds the hierarchy from scratch.
12. **Tags — create.** The user optionally selects an existing active tag as the parent (default: none, creating a top-level tag) and types a label. The stored path is composed by the system: the parent's path followed by `::` followed by the label, or just the label when there is no parent. Created active.
    - Unhappy path: an empty label is rejected before the record is created, with a message identifying the problem.
    - Unhappy path: a label that would produce a path identical to an existing tag's path (same parent, same label) is rejected, with a message identifying the problem.
13. **Tags — edit (rename).** The user changes a tag's label. Its own path segment updates to match, and the stored path of every descendant tag updates with it, so the hierarchy stays consistent (renaming "commercial" to "sales" turns "commercial::RDV1" into "sales::RDV1"). Moving a tag under a different parent after creation is not offered in V1 — only the label is editable (see Out of scope).
14. **Tags — deactivate / reactivate.** The user toggles a tag's active status instead of deleting it. A deactivated tag stays in the list, marked inactive, and drops out of the parent-selection control described in step 12 for *new* tags. Deactivating a tag has no effect on its children's own active status — each tag's flag is independent. Reactivating puts it back.

# Acceptance criteria
- The nav lists a "Referential" entry in addition to Partners, Clients and Settings.
- Selecting "Referential" shows three sections, each with its own list and its own "New" action: Mission categories, Portage contracts, Tags.
- On first use, before any edit, the Mission categories list shows exactly three active rows: Formation école, Formation pro, Conseil.
- Saving the mission category form with a non-empty label creates a category, active by default, that appears in the list without a page reload being required to see it on next visit.
- Saving the mission category form with an empty label creates no record and surfaces a validation message.
- Editing a category's label and saving persists the new label; it is still there after navigating away and back.
- Toggling a category to inactive keeps it in the list, marked inactive; toggling it back to active restores it.
- No delete action exists anywhere in this feature for a mission category.
- On first use, before any edit, the Portage contracts list is empty, with a clear way to create the first one.
- Saving the portage contract form with a label, a company name, a charge rate and a start date creates a contract, active by default, with no end date unless one was entered.
- Saving the portage contract form with any of label, company name, charge rate or start date left empty creates no record and surfaces a validation message naming the failing field(s).
- Saving the portage contract form with a charge rate that is not a positive number, or greater than 100, creates no record and surfaces a validation message naming the failing field.
- Saving the portage contract form with an end date earlier than the start date creates no record and surfaces a validation message naming the failing field.
- Editing any portage contract field — label, company name, charge rate, start date, end date — and saving persists the change, including changing the charge rate on a contract that already has time entries or missions attached (no field is locked once set).
- Creating or editing a portage contract whose validity period overlaps an existing contract's period — including one for the same company — succeeds with no warning and no rejection.
- Toggling a portage contract to inactive keeps it in the list, marked inactive; toggling it back to active restores it.
- No delete action exists anywhere in this feature for a portage contract.
- On first use, before any edit, the Tags list is empty, with a clear way to create the first one.
- Saving the tag form with a non-empty label and no parent selected creates a top-level tag whose stored path equals the label.
- Saving the tag form with a non-empty label and an existing active tag selected as parent creates a tag whose stored path is the parent's path, `::`, then the label.
- Saving the tag form with an empty label creates no record and surfaces a validation message.
- Saving the tag form with a label/parent combination that duplicates an existing tag's exact path creates no record and surfaces a validation message.
- The parent-selection control on the tag form offers only active tags.
- Renaming a tag (editing its label) updates its own stored path and the stored path of every one of its descendant tags to match; the parent/child relationships themselves are unchanged.
- No control exists on the tag form to change an existing tag's parent after creation.
- Toggling a tag to inactive keeps it in the list, marked inactive, and removes it from the parent-selection control on the tag form for new tags; toggling it back restores both. Deactivating a tag with active children leaves those children's active status unchanged.
- No delete action exists anywhere in this feature for a tag.
- With 30 mission categories, 30 portage contracts and 150 tags entered, all three lists render every record, with none omitted, and without requiring pagination.

# Design
- `design/v01-004/` — the Referential screen (all three sections, each list, and each entity's create/edit form) has a user interface. `@designer` produces it at gate G2.

# Out of scope (functional)
- Missions themselves, the mission's category/contract-selection controls, and the time-adjustment coefficient — RM-004, a later spec; this spec only manages the three referential entities in isolation, with nothing yet reading them.
- Assigning tags to time entries (`TIME_ENTRY_TAG`) and any time-entry screen — RM-005, a later spec; this spec only manages the `TAG` entity itself.
- How a mission form, a time-entry form, or any other later screen behaves when the category/contract/tag it references has since been deactivated — defined by whichever later spec builds that screen (RM-004, RM-005), not here.
- `REGIME` / `REGIME_RATE` — separate entities, already out of scope per v01-001 and v01-003; unrelated to this spec.
- Enforcing "close the contract, open a new one" as the only way to change a portage contract's charge rate — this spec allows a direct edit instead (see Open questions).
- Re-parenting an existing tag (moving it under a different parent after creation) — only the label is editable in V1.
- Hard delete of a mission category, a portage contract, or a tag, in any form.
- Search, filtering, sorting, or pagination of any of the three lists beyond a plain full list with a visible active/inactive status.
- Any permission or role restriction. V1 has no login (D-40, `context/vision.md` -> Target user); there is one full-access operator.
- Audit log or history of changes to these entities (D-36, deferred, same as v01-003).
- Concurrent-edit handling. V1 is single-operator with no login; two simultaneous editors of the same record is not a scenario this spec accounts for.

# Open questions
The following were judgment calls, not confirmed with the user. Each is a default, not a hidden guess — reject any of them at G1 and the spec will be revised.

- **One "Referential" nav entry with three list sections on one screen**, rather than three separate nav entries (one list-screen each, like Partners/Clients) or bundling into an existing screen. Assumed because none of the three entities is complex enough to need its own screen, and grouping keeps the nav from growing by three more entries for what are all small reference lists.
- **Tag creation is parent-picker-plus-label, not free-text path typing.** The user never types `::` directly; the system composes the path from an optional parent selection and a plain label. Chosen to avoid a syntax the user has to remember correctly, and because a mistyped separator would silently corrupt the hierarchy. Reject this if free-text path entry is actually wanted.
- **Renaming a tag cascades its new path prefix to every descendant**, so the hierarchy never desyncs after a rename. `Framing session v1.md` -> Point 8 lists "supports rename" as part of the rationale for the path design, which I read as requiring this cascade; reject if rename should instead be blocked on any tag that has children, or left to desync.
- **No re-parenting control in V1** — a tag's parent is fixed at creation; only its label can change afterward. Assumed to keep this first cut simple; reject if moving a tag (and its subtree) under a different parent is needed now rather than later.
- **`TAG.path` must be unique** (same parent, same label rejected) — the only uniqueness constraint proposed among the three entities. Unlike a duplicate partner or client name, two tags with an identical path would make the prefix-query behaviour the path design exists for ("every entry under `commercial`") ambiguous. Mission category labels and portage contract labels/company names get no uniqueness constraint, consistent with the no-uniqueness precedent set in v01-001.
- **Portage contract charge rate is directly editable at any time, with no system-enforced "close and reopen" workflow.** MCD v2's PORTAGE_CONTRACT entry describes closing the old row and opening a new one as how a rate change is *recorded*, which I read as an operating convention for the consultant, not a rule this CRUD spec has to enforce (V1 is "CRUD and views only" per `context/vision.md` -> Roadmap). Reject this if the edit form should instead refuse to change the charge rate on a contract past its start date, forcing the close-and-reopen pattern.
- **`active` and the validity dates on a portage contract are independent** — the system never auto-deactivates a contract whose `valid_to` has passed, and `active` is a plain manual toggle, same as every other entity in this spec. Reject if an expired contract should read as inactive automatically.
- **Portage contract charge rate is bounded to a positive number, at most 100 (percentage).** No lower bound beyond "positive" is stated anywhere in the functional source; confirm or correct.
- **No bootstrap seed for portage contracts or tags** — only mission categories are seeded; `Framing session v1.md` -> Point 10's seed list is Formation école, Formation pro, Conseil, and does not mention contracts or tags. Both lists start empty and the operator builds each from scratch. (Confirmed with the user: V1 ships with zero seeded tags — resolves the gap `Framing session v1.md` -> Point 8 left open about the base tag list's content.)
- **Deactivate-only, no hard delete, for all three entities.** Same reasoning as v01-001 and v01-003: an `active` boolean already exists on each row in `specs/functional/MCD v2.md`.
- **Volumetry figures for the list-rendering criterion**: 30 mission categories, 30 portage contracts, 150 tags. None of these is given in `context/vision.md` or the functional source (only "under 100 clients" is); these are my own estimates from the entities' expected size (a short, mostly-static list for categories; a handful of real contracts accumulated over several years; a larger but still bounded hierarchical list for tags). Confirm or correct.
- **No permission distinctions** — single operator, no login (D-40).

# ── TECHNICAL SPEC ───────────────────────────────────────────
- Filled by @architect after the functional spec is approved. Do not edit by hand.

# Architecture decisions
- AD-001 - feature-sliced structure: `referential/` and `tags/` each follow it.
- AD-003 - every mutation (create, edit, toggle-active on all three entities) is a Server Action.
- AD-004 - the Prisma client is imported only from `mission-categories.repository.ts`, `portage-contracts.repository.ts` and `tags/repository.ts`.
- AD-005 - every action parses its input with a Zod schema before touching the repository.
- AD-006 - the Referential page is an async Server Component awaiting each entity's `queries.ts`.
- AD-007 - `PortageContract.chargeRateBasisPoints` is an integer number of basis points, manipulated through `Rate` (`src/lib/money/rate.ts`), same value object v01-003 introduced.
- AD-008 - all `DateTime` columns, including `PortageContract.validFrom`/`validTo`, store UTC. No period (`YYYY-MM`) field in this feature.
- AD-009 - no role check anywhere in this feature (D-40, no login in V1) - same stance as every other v01 spec.
- AD-021/AD-030 - the precedents AD-032 (below) weighs and departs from.
- AD-023 - PascalCase models, camelCase fields, `@map`/`@@map` to snake_case (`mission_categories`, `portage_contracts`, `tags`, and their columns).
- AD-029 - `prisma/seed.ts`'s refusal guard gains one line per new model, per its own accepted per-model maintenance cost.
- AD-031 - the computed-default pattern this spec's `PortageContract`/`Tag` still follow (no bootstrap row, nothing to compute either - both start genuinely empty) and the one AD-033 departs from for `MissionCategory` specifically.
- **AD-032** (new) - `MissionCategory` and `PortageContract` share `src/features/referential/` with per-entity files; `Tag` is its own domain, `src/features/tags/`.
- **AD-033** (new) - the three `MissionCategory` bootstrap rows are inserted by the migration itself, not computed; `prisma/seed.ts`'s guard is adjusted to expect exactly 3 rows in `mission_categories` rather than 0.

# Feature slice
- `src/features/referential/`
  - `mission-categories.schema.ts` - `missionCategorySchema` (Zod: `label` non-empty, trimmed). Exports the inferred `MissionCategoryInput` type.
  - `mission-categories.repository.ts` - the only file for this entity importing Prisma: `listMissionCategories()`, `createMissionCategory(data)`, `updateMissionCategory(id, data)`, `setMissionCategoryActive(id, active)`.
  - `mission-categories.actions.ts` - `createMissionCategoryAction`, `updateMissionCategoryAction`, `toggleMissionCategoryActiveAction` (`"use server"`).
  - `mission-categories.queries.ts` - `listMissionCategoriesView()`, called by the Referential page's Server Component.
  - `portage-contracts.schema.ts` - `portageContractSchema` (Zod: `label`, `companyName` non-empty; `chargeRate` a decimal string, positive, at most 100, at most 2 fraction digits; `validFrom` a required date; `validTo` an optional date, refined against `validFrom`). Exports the inferred `PortageContractInput` type.
  - `portage-contracts.repository.ts` - `listPortageContracts()`, `createPortageContract(data)`, `updatePortageContract(id, data)`, `setPortageContractActive(id, active)`.
  - `portage-contracts.actions.ts` - `createPortageContractAction`, `updatePortageContractAction`, `togglePortageContractActiveAction`.
  - `portage-contracts.queries.ts` - `listPortageContractsView()`.
  - `components/mission-categories/` - the list table and the create/edit dialog form, per `design/v01/v01-004/prototype/`.
  - `components/portage-contracts/` - the list table and the create/edit dialog form, same source.
- `src/features/tags/`
  - `schema.ts` - `tagSchema` (Zod: `label` non-empty, trimmed; `parentId` an optional positive integer). Exports the inferred `TagInput` type.
  - `domain.ts` - pure functions, no Prisma, no React: `composeTagPath(parentPath: string | null, label: string): string` (parent's path + `::` + label, or just the label); `cascadeDescendantPaths(oldPath: string, newLabel: string, descendants: { id: number; path: string }[]): { id: number; path: string }[]` (recomputes every descendant's path under the renamed prefix).
  - `repository.ts` - the only file in this domain importing Prisma: `listTags()`, `listActiveTagsForParentPicker()`, `createTag(data)` (resolves the parent's stored path, calls `domain.composeTagPath`, relies on the DB's unique constraint on `path` for the duplicate check), `renameTag(id, label)` (loads the tag and every descendant via a `path` prefix `LIKE` query inside one `$transaction`, calls `domain.cascadeDescendantPaths`, updates the tag and every descendant's row), `setTagActive(id, active)`.
  - `actions.ts` - `createTagAction`, `renameTagAction`, `toggleTagActiveAction`.
  - `queries.ts` - `listTagsView()`, `listActiveTagsForParentPickerView()` - the second is also the cross-feature read surface a later spec (time entries, RM-005) will import.
  - `components/` - the list table, the create dialog (parent picker + label) and the edit dialog (label only, read-only parent), per `design/v01/v01-004/prototype/`.
- `src/app/referential/page.tsx` - a single async Server Component rendering the three sections; the nav gains a "Referential" entry per `design/v01/v01-004/README.md` -> Notes (`src/components/nav/nav-items.ts`).

# Data model
- Additive only. Three new models, no existing table touched, nothing dropped or retyped.
```prisma
/// A classification for a mission, e.g. "Formation école"
/// (specs/functional/MCD v2.md -> MISSION_CATEGORY, RG-18). Unlike
/// CompanyProfile/Setting (AD-031), a category is a first-class,
/// user-editable, deactivatable row visible on the very first screen visit,
/// so it cannot be a computed default - the three bootstrap rows (Formation
/// école, Formation pro, Conseil) are inserted by the migration itself
/// (AD-033).
model MissionCategory {
  id        Int      @id @default(autoincrement())
  label     String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("mission_categories")
}

/// The relationship with a portage company: its own contractual charge rate
/// and validity period (specs/functional/MCD v2.md -> PORTAGE_CONTRACT,
/// RG-19, RG-28). Several may be active at once by design - overlapping
/// periods, including two for the same company, are allowed with no warning.
/// `chargeRateBasisPoints` is an integer number of basis points (AD-007;
/// 2460 = 24.60%). No bootstrap seed - the operator's own real data.
model PortageContract {
  id                    Int       @id @default(autoincrement())
  label                 String
  companyName           String    @map("company_name")
  chargeRateBasisPoints Int       @map("charge_rate_basis_points")
  validFrom             DateTime  @map("valid_from")
  validTo               DateTime? @map("valid_to")
  active                Boolean   @default(true)
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  @@map("portage_contracts")
}

/// A predefined, hierarchical label applied to time entries
/// (specs/functional/MCD v2.md -> TAG, D-33). `path` is the parent's own
/// path, `::`, then `label` - or just `label` at the top level - composed by
/// `src/features/tags/domain.ts` on create and cascaded to every descendant
/// on rename; the user never types `::` directly. `path` is unique so the
/// prefix-query behaviour it exists for ("every entry under `commercial`")
/// stays unambiguous. No bootstrap seed - the operator builds the hierarchy
/// from scratch.
model Tag {
  id        Int      @id @default(autoincrement())
  label     String
  path      String   @unique
  parentId  Int?     @map("parent_id")
  parent    Tag?     @relation("TagHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children  Tag[]    @relation("TagHierarchy")
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([parentId])
  @@map("tags")
}
```
- Migration: `prisma migrate dev --name add_referential_categories_contracts_tags`. Additive; reversible by dropping the three tables, with data loss limited to whatever the operator entered (no data loss on a genuinely fresh instance's reversal, since `mission_categories`' own bootstrap rows are trivially re-derivable).
- Bootstrap data migration (AD-033): the generated `migration.sql` has three `INSERT INTO "mission_categories" ("label", "active", "updated_at") VALUES (...)` statements hand-appended immediately after `CREATE TABLE "mission_categories"`, one row each for Formation école, Formation pro, Conseil, all active. No equivalent for `portage_contracts` or `tags` - both start genuinely empty (Open questions, confirmed with the user).
- `prisma/seed.ts` -> `assertDatabaseIsEmpty()`: gains three lines (`prisma.missionCategory.count()`, `prisma.portageContract.count()`, `prisma.tag.count()`). `portage_contracts` and `tags` use the ordinary "expected 0" check every other table uses. `mission_categories` uses "expected 3" instead of "expected 0" - the migration's own bootstrap state - so the guard still refuses to seed a database the operator has already touched (any count other than exactly 3) without also refusing to seed the very state every fresh migration produces.

# Numeric and temporal representation
- `PortageContract.chargeRateBasisPoints` - `Rate`, integer basis points (AD-007; 2460 = 24.60%). The form accepts a percentage as a decimal string with up to 2 fraction digits; `Rate.fromPercent` (already added in v01-003) rejects anything more precise rather than rounding it, and the schema further bounds the value to `> 0` and `<= 100` (`<= 10 000` basis points) per the functional spec's stated bound.
- `PortageContract.validFrom` / `validTo` - UTC `DateTime` (AD-008). Both are day-level calendar dates with no meaningful time-of-day, entered through a native `<input type="date">` (`design/v01/v01-004/README.md` -> Notes); the schema parses each to a `Date` at UTC midnight. Neither is a period (AD-008's `YYYY-MM` bucket) - a validity date is a specific day, not a reporting month.
- `MissionCategory` / `PortageContract` / `Tag`'s `createdAt` / `updatedAt` - UTC `DateTime` (AD-008).
- No money field and no duration field in this feature.

# Server boundary
- `createMissionCategoryAction(input)` - no role check (D-40); `missionCategorySchema.parse(input)`; calls `repository.createMissionCategory`; `revalidatePath("/referential")`.
- `updateMissionCategoryAction(id, input)` - no role check; `missionCategorySchema.parse(input)`; calls `repository.updateMissionCategory`; `revalidatePath("/referential")`.
- `toggleMissionCategoryActiveAction(id, active)` - no role check; `z.object({ id: z.number().int(), active: z.boolean() }).parse(...)`; calls `repository.setMissionCategoryActive`; `revalidatePath("/referential")`.
- `createPortageContractAction(input)` / `updatePortageContractAction(id, input)` - no role check; `portageContractSchema.parse(input)`; call the matching repository function; `revalidatePath("/referential")`.
- `togglePortageContractActiveAction(id, active)` - no role check; same boolean-pair schema as the category toggle; `revalidatePath("/referential")`.
- `createTagAction(input)` - no role check; `tagSchema.parse(input)`; calls `repository.createTag`; `revalidatePath("/referential")`.
- `renameTagAction(id, label)` - no role check; `z.object({ id: z.number().int(), label: z.string().trim().min(1) }).parse(...)`; calls `repository.renameTag`; `revalidatePath("/referential")`.
- `toggleTagActiveAction(id, active)` - no role check; same boolean-pair schema; `revalidatePath("/referential")`.
- No Route Handler anywhere in this feature - every mutation above is a plain Server Action (AD-003); nothing here needs a non-JSON response, and there is no inbound webhook or file download.

# Data access
- `listMissionCategories()` / `listPortageContracts()` / `listTags()` - return every row, active and inactive alike, ordered by `label` (categories, contracts) or by `path` (tags, so the hierarchy renders in a stable, parent-before-child order). No scoping beyond that - single operator, no tenancy (D-40).
- `createMissionCategory(data)` / `createPortageContract(data)` - plain `prisma.*.create`.
- `createTag(data)` - reads the parent row (when `parentId` is given) for its `path`, composes the new path via `domain.composeTagPath`, then `prisma.tag.create`; a `path` collision surfaces as the DB's own unique-constraint violation, translated to a field error on `label` by the action.
- `updateMissionCategory(id, data)` / `updatePortageContract(id, data)` - plain `prisma.*.update`, every field including `PortageContract.chargeRateBasisPoints` and both validity dates writable at any time (no locking once set, per the functional spec).
- `renameTag(id, label)` - one `$transaction`: loads the tag and every row whose `path` starts with the tag's own current path followed by `::` (its descendants), calls `domain.cascadeDescendantPaths` to compute each new path, then updates the tag's own `label`/`path` and every descendant's `path` in the same transaction, so the hierarchy never partially desyncs.
- `setMissionCategoryActive(id, active)` / `setPortageContractActive(id, active)` / `setTagActive(id, active)` - plain `prisma.*.update({ where: { id }, data: { active } })`. `setTagActive` never touches any descendant's own `active` flag (each tag's flag is independent, per the functional spec).
- `listActiveTagsForParentPicker()` - `prisma.tag.findMany({ where: { active: true }, orderBy: { path: "asc" } })`, the read the tag form's parent-selection control uses.

# Authorisation
- N/A - D-40, no login in V1. Every entry point above is reachable by the single operator with no role to check, consistent with every other v01 feature.

# Validation
- Mission category: `label` non-empty after trimming.
- Portage contract: `label`, `companyName` non-empty after trimming; `chargeRate` a positive decimal string, at most 100, at most 2 fraction digits (`Rate.fromPercent` throws beyond 2 fraction digits; the schema range-checks `0 < basisPoints <= 10000`); `validFrom` a valid date, required; `validTo` optional, and when present refined to not be earlier than `validFrom` (equal is allowed - the functional spec only rejects "earlier").
- Tag: `label` non-empty after trimming; `parentId`, when given, must reference an existing **active** tag (the parent-picker only ever offers active tags, but the server re-validates rather than trusting the client); the resulting `path` must not collide with an existing tag's `path` - enforced by the DB's unique constraint and surfaced as a field error on `label`, not pre-checked with a separate read, so there is no race between the check and the insert.

# Dependencies
- None. Zod, react-hook-form and Prisma cover everything this feature needs; `Rate` (`src/lib/money/rate.ts`) already exists from v01-003.

# Out of scope (technical)
- Re-parenting logic in `tags/domain.ts` or `tags/repository.ts` - functional out of scope; only the rename cascade is built.
- Hard delete for `MissionCategory`, `PortageContract` or `Tag`, in any repository function or action - functional out of scope; deactivate-only for all three.
- Auto-deactivating a `PortageContract` whose `validTo` has passed - functional out of scope (Open questions); `active` stays a plain manual toggle, independent of the validity dates.
- Enforcing a "close and reopen" workflow for a portage contract's charge-rate change - functional out of scope (Open questions); `updatePortageContract` allows a direct edit of `chargeRateBasisPoints` at any time.
- Any use of these three entities by a mission, a time entry, or any other later screen - RM-004, RM-005, later specs; this spec's repositories and queries exist in isolation with nothing yet calling them from outside `src/app/referential/page.tsx`.
