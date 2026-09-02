# SynFactu — Framing session (2026-09-02)

> Resolution of the twelve unresolved model points blocking `@architect`, plus the bootstrap decisions of `spec driven template/specs/init.md`.
>
> This document is the **record of the session**, not a rule book. Each outcome below names where the rule actually lands: an amendment to the functional record (`D-41`+), or an architecture decision in the product repository (`D-016`+).

---

## Decision numbering convention

Three series coexist and must not be confused:

| Series | Form | Home | Owner |
|---|---|---|---|
| Functional | `D-01` .. `D-40`, then `D-41`+ | `Spécification fonctionnelle/docs/Décisions v2.md` | the user, this workspace |
| Architecture | `D-001` .. `D-015`, then `D-016`+ | product repo `ai-rules/decisions.md` | `@architect` |
| Business rules | `RG-nn` | `MCD v2.md` §4 | the user, this workspace |

A bare `D-` reference in the product repository means the **architecture** series. This convention is stated in the product repo's `CLAUDE.md` on day one, as `spec driven template/README.md` -> Decision numbering requires.

---

## 1. The twelve model points

### Point 1 — Coefficient and rounding

**Resolved.** `rounded_duration = round_up(worked_duration × (1 + applied_coefficient))`, where the coefficient is frozen as `0` when the mission carries none, and always `0` on a non-billable entry (RG-29c).

`billed_duration` therefore defaults to `rounded_duration` with no branch, and §5.2 and Appendix A stop disagreeing. D-13's order of operations (coefficient first, then rounding) is preserved, not superseded.

Verified against the workbook rows cited in D-11: 2h00 × 1,15 = 2h18 → 2h30 · 1h12 × 1,15 = 1h22,8 → 1h30 · 0h54 × 1,15 = 1h02,1 → 1h15.

Consequence: the pure `round_up(worked)` value is no longer stored. It is recomputable and nothing in the spec reads it.

→ **D-41**, amending §5.2 and RG-29b.

### Point 2 — Frozen or derived document totals

**Resolved.** Totals are **derived while the document is a draft, and freeze on the send/submission transition**.

This adds no mechanism: the invoice number (D-23), the charge rate (D-25) and the send date (D-21) already freeze at exactly that moment. A document a third party has received can never be rewritten by editing or unlinking a time entry.

Applies to `PORTAGE_DECLARATION` totals, `PORTAGE_DECLARATION_LINE` totals, and `MICRO_INVOICE.amount_ht` outside forfait. For forfait, `amount_ht` is the typed amount of D-34 and is entered, not derived.

RG-33 is reworded: totals are computed on read **until the document carrying them is sent**.

→ **D-42**, amending RG-33 and D-09.

### Point 3 — `PORTAGE_DECLARATION_LINE.id_partner`

**Resolved.** Relaxed from (1,1) to (0,1), with the integrity rule "at least one of `id_partner` / `id_client` must be set".

A portage mission whose client has no referring partner is now representable. A sentinel "Direct" PARTNER row was rejected: it puts a fact that is not true into a financial table.

→ **D-45**, amending MCD §3 cardinality and adding an RG.

### Point 4 — `MICRO_INVOICE.id_client`

**Resolved.** Dropped. The client is read through `MISSION → CLIENT`.

This is the D-10 argument applied where it was missed. RG-01 already states that a directly-billed partner gets its own CLIENT record, which that partner's missions then belong to, so no addressing case is lost.

→ **D-46**, amending D-22 and the MCD.

### Point 5 — Short label for the numbering pattern

**Resolved.** `short_label` added to CLIENT and to MISSION. Required, auto-suggested from `name` / `label` at creation, user-editable.

Required rather than nullable because `YYYY-MM-NNN_Client_mission` must never fail to render for a missing field at the moment an invoice is sent.

→ **D-47**, filling a gap left by D-23.

### Point 6 — A cancelled invoice has consumed a number

**Resolved.** The number is **consumed and never reused**. An `Annulée` invoice keeps its number and remains in the sequence at zero value.

Matches French invoicing practice — a number is never recycled — and keeps the sequence auditable. D-23's "no holes" wording is amended: there is no gap, because the cancelled document still occupies its slot.

→ **D-43**, amending D-23 and RG-14.

### Point 7 — `iso_week` on TIME_ENTRY

**Resolved.** Column dropped, derived from `day`.

Pure derivation, no historical fact, so D-09 governs. At the volumetry of point 12 there is no performance argument. If grouping ever becomes slow it returns as an index, not as a spec-level field.

→ **D-48**, applying D-09 to the MCD.

### Point 8 — Tags

**Resolved.** A `TAG` entity (`id`, `path`, `label`, `active`) plus a `TIME_ENTRY_TAG` join.

Hierarchy lives in the `path` string (`commercial::RDV1`); the parent is derived by splitting on `::`. This matches the stated need literally, supports rename and deactivation, and makes "every entry under `commercial`" a prefix query. A self-referencing parent FK was rejected: it needs recursive queries, which SQLite through Prisma makes awkward for no gain here.

**Still open:** the base list itself is defined nowhere. Needed for `prisma/seed.ts` and for spec 005.

→ **D-49**, amending RG-18 and the MCD.

### Point 9 — SETTING / COMPANY_PROFILE

**Resolved.** Two different shapes, because they are two different things.

- `COMPANY_PROFILE` — a single typed row: legal identity, address, SIRET, contact details. Typed because the fields are known, few, and each one means something specific.
- `SETTING` — a key/value table whose keys are declared in a **Zod registry in code**, so keys are typed at compile time and values validated on read. A new knob is one registry line and no migration.

V1 keys: `hours_per_day` (420 minutes, D-01), `rounding_step_minutes` (15, D-05), `rounding_direction` (up, D-05), `invoice_number_pattern` (D-23), `show_mission_coefficient` (false, D-15), `micro_estimated_charge_rate` (2500 basis points, see point 10).

→ **D-50**, filling D-35.

### Point 10 — Initial dataset and the charge rate

**Resolved, and the shape changed.** The estimated charge rate is read through a **resolver**, not from a table and not from a constant:

- `getEstimatedChargeRate(regime, date)` is written once now. In V1 it ignores `date` and returns the `SETTING` value `micro_estimated_charge_rate`.
- The document freezes what the resolver returned, at send. D-25 and RG-20 are unchanged.
- `REGIME_RATE` stays in the conceptual model, **phase-marked and not built in V1**. In Phase 2, alongside URSSAF, the table arrives and the resolver gains a dated lookup with the setting as fallback. No call site changes.

Two consequences worth stating:

- **RG-27 is inactive in V1.** There is always a covering rate, so no document can be rejected for want of one. The rule becomes live when the table exists.
- Historical micro rates are **back-computed from `URSSAF_RECORD`** (cotisations + CFP over base) in Phase 2. This is why the Phase 3 Excel migration depends on Phase 2 and not only on the import tooling — worth carrying in the roadmap rather than discovering it during the migration.

Bootstrap seed contents: `REGIME` rows (Micro, Portage), `MISSION_CATEGORY` rows (Formation école, Formation pro, Conseil), the `SETTING` defaults above, the base `TAG` list, and an empty `COMPANY_PROFILE` filled through the UI in spec 002. No `REGIME_RATE` rows.

→ **D-51**, amending RG-19, RG-27 and the phase markers.

### Point 11 — Consolidation

**Resolved.** Consolidation is a **pure view with no persistence**, and the generated billing text is **not stored**.

The view queries time entries grouped by partner / end client / week for an invoicing period. Its text is regenerated on demand and copied out. No `CONSOLIDATION` entity.

Accepted consequence, to be stated in spec 006 rather than left implicit: **the exact wording sent to a partner is not archived**, and regenerating it after time entries change will not reproduce it.

→ **D-44**, amending §5.3.

### Point 12 — Volumetry

**Resolved.** Ceiling for acceptance criteria: **~10 000 time entries, under 100 clients**, a few hundred missions, a few hundred invoices — roughly 5 to 8 years at 500–1 000 entries per year.

Performance criteria are written against that figure, e.g. "the consolidation view renders in under 500 ms at 10 000 time entries". SQLite is comfortable at this size and stays comfortable, so D-013's PostgreSQL migration remains genuinely "later".

→ **D-52**, added to §9.

---

## 2. Bootstrap decisions (`specs/init.md`)

| Step | Decision | Lands as |
|---|---|---|
| 1 | Package `synfactu`, application "SynFactu" | product repo `package.json` |
| 1 | **Licence AGPL-3.0** — copyleft reaching network use; as sole copyright holder a commercial exception stays sellable, which is the resale route D-39 wants | **D-016** |
| 1 | **No authentication at bootstrap**, honouring D-40 | **D-017** |
| 1b | Repository at `H:\Programs\Synfactu` — outside OneDrive, confirmed | — |
| 6 | **Money rounds HALF_UP**, via a typed rounding-mode parameter. `HALF_EVEN` exists in the enum and throws until needed, so the later switch touches one file | **D-018** |
| 6 | Day length **420 minutes** (D-01) | **D-019** |
| 10b | Backups to a host directory beside the stack, `BACKUP_KEEP=30` | **D-021** |
| 12 | shadcn/ui **slate**, **dark by default**, with a persisted light/dark switch in the menu | **D-022** |
| — | **French only, single locale constant**, no i18n library. D-39 governs business configuration — rates, factors, identity, numbering — and explicitly not the interface language | **D-020** |

### D-017 — the cost, stated plainly

Authentication is skipped, so:

- **The instance must not be exposed on a public URL.** Keep it behind Caddy on a private network or a local port.
- **D-009 is outstanding debt across specs 002 to 009.** Every Server Action written before Better Auth arrives will need its authorisation check retro-fitted.

`init.md` step 15 requires this restated in the bootstrap close-out report. It is not buried in a decision entry.

### Open at design time, not here

A persisted theme toggle without a flash of the wrong theme on first paint is the one non-trivial part of D-022. It needs either `next-themes` with a dependency justification per `policy_techstack.md`, or a cookie read in the root layout. That is a `@designer` / `@architect` call on spec 002.

---

## 3. Still needed before `init.md` can run

1. **The Caddy external Docker network name**, and the host the production stack will run on. Required by `init.md` step 10.
2. **The base tag list** (§5.2, "a predefined base list"). Required by `prisma/seed.ts` and by spec 005.

`COMPANY_PROFILE` values are not needed — they are entered through the UI in spec 002, which is what D-39 asks for.

---

## 4. V1 spec order

Unchanged from the brief, and the dependency reason for the first one is now concrete: `hours_per_day`, the rounding step and `micro_estimated_charge_rate` are all `SETTING` keys (point 9), and 005 reads all three.

| # | Spec |
|---|---|
| 002 | Settings and company profile |
| 003 | Referential — partners, clients, categories, portage contracts, tags |
| 004 | Missions and the time adjustment coefficient |
| 005 | Time entry journal |
| 006 | Partner consolidation and generated billing text |
| 007 | Micro invoicing |
| 008 | Portage declarations |
| 009 | Billing backlog |

`specs/001-hello-world.md` runs first regardless — it is the bootstrap smoke test that proves the agent chain, and `init.md` step 14 forbids shortcutting it.
