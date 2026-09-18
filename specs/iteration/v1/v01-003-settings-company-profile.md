# Settings and company profile

# ── FUNCTIONAL SPEC ──────────────────────────────────────────
- Written by @product-owner. Approved by the user at gate G1.

# Goal
- Give the consultant a single place to record the company's legal identity, and to configure the handful of global settings the rest of V1 depends on: the length of a working day, the rounding step used on time entries, the invoice numbering pattern, the toggle that reveals the mission time-adjustment coefficient, and the estimated micro-entreprise charge rate (`specs/functional/MCD v2.md` -> SETTING / COMPANY_PROFILE, D-35; `specs/functional/Décisions v2.md` D-01, D-05, D-15, D-23, D-26; `specs/functional/Framing session v1.md` -> Point 9, D-50). This is next in the roadmap (RM-002) because missions' coefficient display (RM-004), the time entry journal (RM-005), the consolidation view (RM-006) and micro invoicing (RM-007) all read one or more of these values, and none of them can be built against a screen that does not yet exist. The company's legal identity itself is seeded as an empty record at bootstrap; this is the spec that lets the consultant fill it in.

# User flow
1. **Navigation.** The nav gains a "Settings" entry, alongside "Partners" and "Clients".
2. **Settings screen — layout.** Selecting "Settings" shows two sections, each on the same screen: **Company profile** and **Application settings**. Each section shows its current values read-only, with its own "Edit" action — the same view/edit split already established for partners and clients. They are two sections, not one form, because they are two different things (`Framing session v1.md` -> Point 9): the company's identity is a fixed set of typed fields, the application settings are named values the rest of the product reads by key.
3. **Company profile — view.** Shows the legal/trading name, the SIRET number, the address (street, postal code, city), and contact details (email, phone). Before the first edit ever made, every field shows as empty — this is the seeded starting state, not an error or a missing-record state.
4. **Company profile — edit.** The user edits: legal/trading name (required); SIRET (required, exactly 14 digits); street, postal code and city (all required); contact email (required, a valid email address); contact phone (optional). Saving persists the changes, visible on the view immediately after.
   - Unhappy path: leaving the name, SIRET, street, postal code, city or email empty is rejected before saving, with a message naming the failing field(s).
   - Unhappy path: a SIRET that is not exactly 14 digits, or an email not in a valid address form, is rejected before saving, with a message naming the failing field.
5. **Application settings — view.** Shows: the number of hours in a working day; the rounding step, in minutes; the invoice numbering pattern; and the estimated micro-entreprise charge rate, as a percentage. The rounding direction and the coefficient-display state are edit-only details and are not shown on this view (see step 6).
6. **Application settings — edit.** The user changes: hours per working day (a positive number); the rounding step in minutes (a positive whole number); the invoice numbering pattern (non-empty text); the coefficient-display toggle (on/off); the estimated micro charge rate (a percentage between 0 and 100). The rounding direction is **not** an editable control on this form — it is always up (D-05) and is shown here, within the edit form, as read-only information; it is not repeated on the view (step 5). Saving persists the changes, visible on the view immediately after.
   - Unhappy path: a non-positive or non-numeric value for hours per day or the rounding step is rejected before saving, with a message naming the failing field.
   - Unhappy path: an empty invoice numbering pattern is rejected before saving.
   - Unhappy path: a charge rate that is not a number, or is outside the 0–100 range, is rejected before saving.
7. **Defaults before any edit.** Before the consultant changes anything, Application settings holds the bootstrap defaults: 7 hours per day, a 15-minute rounding step (always up), the pattern `YYYY-MM-NNN_Client_mission`, the coefficient hidden, and a 25% estimated micro charge rate — these are seed values, already usable, not placeholders the user must fill in before the rest of the product works. Of these, the view (step 5) shows the hours, rounding step, pattern and charge rate; the rounding direction and coefficient state are defaults surfaced only in the edit form (step 6), not on the view.

# Acceptance criteria
- The nav lists a "Settings" entry in addition to "Partners" and "Clients".
- Selecting "Settings" shows a Company profile section and an Application settings section, each with its current values and its own "Edit" action.
- On first use, before any edit, every Company profile field displays as empty, with no error state and no invented placeholder value.
- On first use, before any edit, the Application settings view displays: 7 hours per day, a 15-minute rounding step, the pattern `YYYY-MM-NNN_Client_mission`, and a 25% estimated micro charge rate. Opening the edit form at this point shows the rounding direction defaulting to "always up" (read-only) and the coefficient toggle defaulting to off.
- Saving the Company profile edit form with all required fields filled (name, SIRET, street, postal code, city, email) and a valid SIRET and email persists every field; the view reflects the new values without a page reload being required to see them on next visit.
- Saving the Company profile edit form with any of name, SIRET, street, postal code, city or email left empty creates no change and surfaces a validation message naming the failing field(s).
- Saving the Company profile edit form with a SIRET that is not exactly 14 digits, or an email that is not a valid address, creates no change and surfaces a validation message naming the failing field.
- The phone field is optional: saving the Company profile edit form with it left empty succeeds when every other required field is valid.
- Saving the Application settings edit form with a positive number of hours per day, a positive whole number of rounding-step minutes, a non-empty invoice numbering pattern, any value for the coefficient toggle, and a charge rate between 0 and 100 persists every field; the view reflects the new values without a page reload being required to see them on next visit.
- Saving the Application settings edit form with a non-positive or non-numeric hours-per-day or rounding-step value creates no change and surfaces a validation message naming the failing field.
- Saving the Application settings edit form with an empty invoice numbering pattern creates no change and surfaces a validation message.
- Saving the Application settings edit form with a charge rate that is non-numeric, negative, or greater than 100 creates no change and surfaces a validation message naming the failing field.
- The Application settings edit form has no control for the rounding direction; the edit form continues to display it as fixed, read-only information ("always up") both before and after any other setting is edited. It is never shown on the plain view.
- Toggling the coefficient-display setting and saving persists the new value; the Application settings edit form reflects the new toggle state after saving. The plain view never displays the coefficient state.
- Changes to either section persist across navigating away and back, and across a fresh page load.
- No delete action exists anywhere in this feature for either the company profile or any application setting; edit is the only mutation offered.

# Design
- `design/v01-003/` — the Settings screen (Company profile section, Application settings section, and both edit forms) has a user interface. `@designer` produces it at gate G2.

# Out of scope (functional)
- The portage charge rate and any per-contract data (`PORTAGE_CONTRACT`) — a different entity entirely (D-16), covered by a later referential spec (RM-003).
- Historizing the micro charge rate (`REGIME_RATE`) — phase-marked, not built in V1 (`Framing session v1.md` -> Point 10, D-51). This spec's `micro_estimated_charge_rate` is the single current value; there is no "valid from / valid to" history to manage here.
- The `getEstimatedChargeRate(regime, date)` resolver, and every screen that will eventually call it (missions, time entries, invoicing, declarations) — this spec only maintains the setting value the resolver reads in V1; the resolver itself belongs wherever it is first actually called, in a later spec.
- Every screen that reads these settings once they exist — mission coefficient display (RM-004), the time entry journal's rounding behaviour (RM-005), consolidation (RM-006), invoice numbering (RM-007) — later specs; this spec only lets the values be viewed and edited.
- Mission categories, portage contracts and tags — the rest of the referential (RM-003), unrelated to this spec.
- Any permission or role restriction. V1 has no login (D-40, `context/vision.md` -> Target user); there is one full-access operator.
- Audit log or history of setting/profile changes — wanted, designed in later, not built now (D-36).
- Any export, backup, or import of settings or the company profile — outside V1.
- Concurrent-edit handling. V1 is single-operator with no login; two simultaneous editors of the same record is not a scenario this spec accounts for.
- Validating the internal syntax of the invoice numbering pattern beyond "not empty" — e.g. checking it actually contains the tokens the numbering rule (D-23, RG-14) expects. Deferred to whichever later spec's numbering logic first parses it.

# Open questions
The following were judgment calls, not confirmed with the user. Each is a default, not a hidden guess — reject any of them at G1 and the spec will be revised:
- **Company profile field list.** Assumed from D-35/D-39's "legal identity, address, SIRET, contact details": legal/trading name, SIRET (14 digits), street, postal code, city, contact email (required), contact phone (optional). Confirm this list, or add/remove fields (e.g. a legal form, a website, a logo).
- **Rounding direction is read-only in this spec, not an editable control.** D-05 states rounding "always rounds up"; `rounding_direction` is nonetheless listed as a `SETTING` key (Point 9). I read that as the key existing for architectural completeness, not as a control the Application settings edit form exposes for editing in V1 — it is shown there as read-only information only, and is not repeated on the plain view. Reject this to make it an editable up/down toggle instead.
- **Invoice numbering pattern is free text, validated only as non-empty.** The pattern's token structure is fixed by D-23/RG-14; this spec does not attempt to functionally validate that user-entered text still produces a working pattern. Reject this if you want a stricter check (e.g. a fixed set of accepted tokens) defined now rather than left to the later spec that consumes it.
- **`hours_per_day` is entered and displayed in hours** (default 7), not minutes, even though the underlying bootstrap default is recorded as 420 minutes (AD-019). Confirm hours is the right unit to show the user, and whether a fractional value (e.g. 7.5) must be accepted.
- **`rounding_step_minutes` accepts any positive whole number of minutes**, with no requirement that it evenly divide 60. Confirm, or constrain it to a fixed list of common step values (5, 10, 15, 30, 60).
- **`micro_estimated_charge_rate` is entered and displayed as a percentage** (default 25%) rather than as a raw basis-points number. Confirm the bound: this spec assumes 0–100 inclusive: reject if a different bound (e.g. must be greater than 0) is intended.
- **View-then-Edit pattern, not a single always-editable form.** Assumed for consistency with the partner/client detail views already shipped (v01-002). Reject if you'd rather have both sections directly editable inline with no separate Edit step.
- **No permission distinctions** — single operator, no login (D-40).

# ── TECHNICAL SPEC ───────────────────────────────────────────
- Filled by @architect after the functional spec is approved. Do not edit by hand.

# Architecture decisions
- AD-001 - feature-sliced structure: this feature is one domain, `src/features/settings/`.
- AD-003 - every mutation is a Server Action; no Route Handler is needed here.
- AD-004 - `src/features/settings/repository.ts` is the only file importing Prisma for this domain.
- AD-005 - every Server Action parses its input with Zod before doing anything else.
- AD-006 - reads go through an async Server Component awaiting `queries.ts`; no live-updating view is needed (view-then-edit, per design).
- AD-007 - `hours_per_day`/`rounding_step_minutes` are `Duration` (integer minutes); `micro_estimated_charge_rate` is `Rate` (integer basis points).
- AD-008 - `createdAt`/`updatedAt` on both new models are UTC; no period field in this feature.
- AD-009 - dormant per D-40: no login in V1, so no role check exists to perform, but the two-layer shape is otherwise unaffected.
- AD-018 - `hours_per_day`'s bootstrap default is 420 minutes (7h); rounding is half up, same direction used for the new `Duration.fromHours`/`Rate.fromPercent` conversions below.
- AD-020/AD-023 - Prisma naming convention (camelCase fields, `@map`/`@@map` to snake_case) applies to both new models.
- AD-030 (new) - `CompanyProfile` and `Setting` share one `src/features/settings/` domain rather than two.
- AD-031 (new) - bootstrap defaults are computed by the repository from the Zod registry / an empty object; no row is seeded or migration-inserted.
- D-01, D-05 - `hours_per_day` and rounding step/direction are the settings this feature stores.
- D-23 - `invoice_number_pattern` is stored as free text here; its token structure is validated by a later spec.
- D-26 - `micro_estimated_charge_rate` default is 2500 basis points (25%), cotisations + CFP only.
- D-35, D-50 - `SETTING`/`COMPANY_PROFILE` as two shapes: a typed single row and a key/value store keyed by a Zod registry in code.
- D-40 - no login, no role distinctions, in V1.

# Feature slice
- `src/features/settings/`
  - `schema.ts` - `companyProfileSchema` (Zod, for the edit form: `legalName`, `siret`, `street`, `postalCode`, `city`, `email` required; `phone` optional). `SETTINGS_REGISTRY` - a `Record` from each of the six V1 setting keys (D-50) to its Zod schema and coded default (`hours_per_day`: 420, `rounding_step_minutes`: 15, `rounding_direction`: `"up"`, `invoice_number_pattern`: `"YYYY-MM-NNN_Client_mission"`, `show_mission_coefficient`: `false`, `micro_estimated_charge_rate`: 2500). `appSettingsFormSchema`, derived from the registry, covering only the five editable keys (excludes `rounding_direction`). Exports every inferred type.
  - `repository.ts` - the only file in this domain importing Prisma: `getCompanyProfile()`, `upsertCompanyProfile(data)`, `getSetting(key)`, `getAllSettings()`, `upsertSettings(values)` (one `$transaction`, all five editable keys or none).
  - `domain.ts` - pure helpers converting the app-settings form's display units to storage units and back, delegating all arithmetic to the value objects below. No Prisma, no React.
  - `actions.ts` - `updateCompanyProfile`, `updateAppSettings` (`"use server"`).
  - `queries.ts` - `getCompanyProfileView()`, `getAppSettingsView()`, called by the Settings page's Server Component. This is also the cross-feature read surface a later spec (missions, time entries, invoicing) imports to read a setting, per `policy_architecture.md` -> Dependency rule.
  - `components/` - `SettingsView` (the two read-only sections), `CompanyProfileEditForm`, `AppSettingsEditForm`, per `design/v01/v01-003/README.md`.
- `src/app/settings/page.tsx` - a single async Server Component rendering `SettingsView`; the nav gains a "Settings" entry alongside "Partners" and "Clients".
- `src/lib/money/duration.ts` - add `Duration.fromHours(value: string): Duration` (accepts up to 2 decimal places, rounds half up to the nearest minute via `scaleHalfUp`) and `Duration.toHoursDecimalString(): string` (the reverse, for pre-filling the edit form). Shared infra, not feature-specific; every rounding rule for a duration stays behind this barrel (AD-007).
- `src/lib/money/rate.ts` - add `Rate.fromPercent(value: string): Rate` (reuses the existing `fromDecimalString` digit-shift with 2 fraction digits, so it rejects rather than rounds beyond 2 decimals, exactly like `Money.fromDecimalString`) and `Rate.toPercentDecimalString(): string` (the reverse).

# Data model
- Additive only. Two new models, no existing table touched, nothing dropped or retyped.
```prisma
/// The operator's own legal identity - name, SIRET, address and contact
/// details used on every invoice (specs/functional/MCD v2.md ->
/// COMPANY_PROFILE, D-35). A single row, fixed id 1, enforced by the
/// application. Never seeded (AD-031): every field is nullable so "no row
/// yet" and "saved, with phone left blank" are both representable with no
/// invented placeholder value.
model CompanyProfile {
  id         Int      @id @default(1)
  legalName  String?  @map("legal_name")
  siret      String?
  street     String?
  postalCode String?  @map("postal_code")
  city       String?
  email      String?
  phone      String?
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("company_profile")
}

/// A single named application setting (specs/functional/MCD v2.md -> SETTING,
/// D-35, D-50). Keys are declared, typed and defaulted in a Zod registry in
/// code (`src/features/settings/schema.ts`); a key with no row yet reads as
/// its registry default rather than being seeded (AD-031). `value` is `Json`
/// so a key's own type (number, string or boolean) round-trips with no manual
/// serialisation step.
model Setting {
  key       String   @id
  value     Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("settings")
}
```
- Migration: `prisma migrate dev --name add_company_profile_and_settings`. Additive, no backfill (AD-031 - no row is ever required to exist). Reversible by dropping both tables; no data loss on reversal since nothing is stored until a user's first real edit.
- `prisma/seed.ts` -> `assertDatabaseIsEmpty()` gains two lines, `prisma.companyProfile.count()` and `prisma.setting.count()`, added to its guard array - the guard exists to catch any pre-existing data regardless of whether that model is ever populated by the seed itself.

# Numeric and temporal representation
- `hours_per_day` - `Duration`, integer minutes (AD-007). Form accepts a decimal number of hours with up to 2 fraction digits; `Duration.fromHours` rounds half up to the nearest minute (AD-018's rounding direction). Default 420 minutes (7h).
- `rounding_step_minutes` - `Duration`, integer minutes, entered directly as a whole number via `Duration.fromMinutes`. Default 15.
- `rounding_direction` - fixed `Setting` value `"up"` (`z.literal("up")` in the registry), never entered by the user (D-05); read-only display only.
- `invoice_number_pattern` - plain `string`, no numeric representation. Default `"YYYY-MM-NNN_Client_mission"`.
- `show_mission_coefficient` - `boolean`. Default `false`.
- `micro_estimated_charge_rate` - `Rate`, integer basis points (AD-007). Form accepts a percentage with up to 2 fraction digits; `Rate.fromPercent` rejects (does not round) anything more precise, mirroring `Money.fromDecimalString`. Default 2500 (25%, D-26).
- `CompanyProfile`/`Setting.createdAt`/`updatedAt` - UTC `DateTime` (AD-008).
- No period (`YYYY-MM`) field in this feature.

# Server boundary
- `updateCompanyProfile(input)` - no role check (D-40, no login in V1); `companyProfileSchema.parse(input)`; calls `repository.upsertCompanyProfile`; `revalidatePath("/settings")`.
- `updateAppSettings(input)` - no role check; `appSettingsFormSchema.parse(input)`; calls `repository.upsertSettings` inside one `$transaction`; `revalidatePath("/settings")`.
- No Route Handler - both mutations are plain Server Actions (AD-003); nothing here needs a non-JSON response, and there is no inbound webhook or file download.

# Data access
- `getCompanyProfile()` - returns the stored row, or an all-null object when no row exists yet (AD-031). No scoping beyond the fixed `id: 1` - single operator, no tenancy (D-40).
- `upsertCompanyProfile(data)` - `prisma.companyProfile.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data })`.
- `getSetting(key)` / `getAllSettings()` - reads the row(s) for the given key(s); any key with no row returns `SETTINGS_REGISTRY[key].default` (AD-031).
- `upsertSettings(values)` - one `prisma.$transaction` of per-key `prisma.setting.upsert` calls, so a partial write across the five editable keys never happens.

# Authorisation
- N/A - D-40, no login in V1. Every entry point above is reachable by the single operator with no role to check, consistent with every other v01 feature.

# Validation
- Company profile: `legalName`, `street`, `postalCode`, `city` non-empty; `siret` exactly 14 digits (`/^\d{14}$/`); `email` a valid address (`z.string().email()`); `phone` optional with no format constraint beyond optionality (not specified by the functional spec).
- App settings: `hoursPerDay` a positive decimal string with at most 2 fraction digits (`Duration.fromHours` throws otherwise); `roundingStepMinutes` a positive integer; `invoiceNumberPattern` non-empty; `showMissionCoefficient` a boolean; `microEstimatedChargeRate` a decimal string between `"0"` and `"100"` inclusive with at most 2 fraction digits (`Rate.fromPercent` throws beyond that, then range-checked against 0-10 000 basis points).

# Dependencies
- None. Zod, react-hook-form and Prisma's `Json` field type cover everything this feature needs.

# Out of scope (technical)
- Migration-time `INSERT` / seeded default rows for `CompanyProfile` or `Setting` - rejected per AD-031 in favour of a computed default.
- Two separate `src/features/` domains for company profile and settings - rejected per AD-030 in favour of one.
- Any historisation of `micro_estimated_charge_rate` (`REGIME_RATE`) - functional out of scope (D-51), carried over unchanged.
- The `getEstimatedChargeRate` resolver and every later screen reading these settings (RM-004 to RM-007) - functional out of scope, carried over unchanged.
