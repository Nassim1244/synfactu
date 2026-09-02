# SynFactu — Decisions (round 2, 2026-08-31)

> The decision record behind `Spécification fonctionnelle v2.md` and `MCD v2.md`. Those two documents state **what** SynFactu does; this one states **why**, and which alternatives were rejected. They cite it as *(D-nn)*.
>
> It resolves the 33 findings of the v1 review round. Read it when a rule in the other two documents looks arbitrary, or before reopening a settled question.

---

## 1. Time entry and rates

| # | Decision | Replaces |
|---|---|---|
| D-01 | `hours_per_day` = **7**, single global setting. Hourly rate derived as `TJM / hours_per_day`. | A6 (was unstated) |
| D-02 | `TIME_ENTRY` carries **three durations**: `worked_duration`, `rounded_duration` (auto), `billed_duration` (default = rounded, manually editable, may exceed worked). All revenue derives from `billed_duration`. | A5 |
| D-03 | **No hourly billing type.** A mission prices by **TJM *or* hourly rate**; the 65 €/h formation is a `temps sur site` mission priced hourly. `billing_type` stays: `temps passé` / `temps sur site` / `forfait`. | A7 |
| D-04 | Add `MISSION.billable`, and `TIME_ENTRY.unbilled_reason` (`prep` / `internal` / `commercial` / `other`) to separate unbilled prep on a paying mission from genuinely non-billable time. | A8, RG-05, C7 |
| D-05 | **Rounding always rounds UP** to the next step (step configurable, default 15 min). Confirmed by every row of the workbook (0 h 16 → 0 h 30, 1 h 19 → 1 h 30, 3 h 43 → 3 h 45). | RG-17 (direction was unstated) |
| D-06 | **One default TJM per client**; each mission carries its own TJM (pre-filled from the client). The separate multi-rate `RATE` entity and its validity dates are **dropped** — a different rate means a different mission (RG-02 unchanged). | C10, RG-02 |
| D-07 | Time entries on a **forfait** mission carry **zero revenue** and no TJM. Time is tracked solely for the real-TJM statistic. | C9 |
| D-08 | All month fields stored as a single **`YYYY-MM`** string (invoicing period, declaration month, payment month, URSSAF month). Separate `year` fields removed. | A10 |
| D-09 | **Freeze historical facts, compute the rest.** Frozen on write: applied TJM, estimated charge rate, billed amount, and the coefficients of Appendix A. Computed on read: totals, work value, billing backlog, outstanding to pay. | C23 |
| D-10 | `TIME_ENTRY` does **not** store client or partner — both are read through `MISSION → CLIENT → PARTNER`. | C12, §5.1 |

> D-11 to D-15 are recorded in Appendix A.

---

## 2. Portage

| # | Decision | Replaces |
|---|---|---|
| D-16 | New **`PORTAGE_CONTRACT`** entity (company, charge rate, validity). **Several contracts may be active at the same time**, each with its own rate. The portage rate lives on the contract; `REGIME_RATE` keeps the **micro rate only**. | C21, RG-19 |
| D-17 | Each portage **mission names its contract** — with concurrent contracts the rate cannot be resolved by date alone. | consequence of D-16 |
| D-18 | **`PORTAGE_DECLARATION` = contract × month**, with a new **`PORTAGE_DECLARATION_LINE`** per partner / end client (hours, days, CA). One monthly salary settles one declaration. | A4, RG-04 |
| D-19 | New **`PAYSLIP`** entity, one per contract per month. The salary payment links to it; the real charge rate is derived from it. Resolves the three-way contradiction between the spec, the Bilan and Q8. | A3, C1, C2 |

---

## 3. Micro invoicing

| # | Decision | Replaces |
|---|---|---|
| D-20 | **No due dates and no overdue flag.** §6.5's "en retard" is removed. Payment delay = `payment_date − sent_date`. | A1, §6.5 |
| D-21 | `MICRO_INVOICE` carries a **`sent_date`** — it drives both the numbering and the rate freeze. | A1 |
| D-22 | **One mission per invoice** (`id_mission` FK). | A2 |
| D-23 | Number = **`YYYY-MM-NNN_Client_mission`**, where `YYYY-MM` is the **month it is sent**. Sequence **resets every month**, assigned **at sending** (drafts carry no number, so no holes). | RG-14, C14 |
| D-24 | Status gains **`Annulée`**: `Brouillon → Envoyée → Payée partiellement → Payée`, plus `Annulée`. No credit note. | C13, RG-15 |
| D-25 | The charge rate frozen on a document is the one valid on its **send date**. | RG-20, C6 |
| D-26 | Micro `estimated_charge_rate` = **25 % (cotisations + CFP) only**. Versement libératoire is tracked separately in the URSSAF module, never blended into the estimate. | B10, C5, §2.1 |

---

## 4. Removed from scope

| # | Decision | Replaces |
|---|---|---|
| D-27 | **VAT is not tracked at all.** §5.8 (threshold monitoring, progress bar) is deleted. | B11, §5.8 |
| D-28 | **No alerts in V1.** All alert language removed from §5.8 and §6.5. | B14 |
| D-29 | **Google Calendar pre-fill leaves V1 entirely** — one line in the roadmap, nothing in the model. | B13 |

---

## 5. Money in (Phase 2)

| # | Decision | Replaces |
|---|---|---|
| D-30 | **One payment settles exactly one invoice or one declaration.** A transfer covering two invoices is entered as two payment lines. RG-04 stands. | C4 |
| D-31 | A payment's period is **derived from `payment_date`, manually overridable**. The redundant `month`/`year` fields are removed. | C4 |
| D-32 | **URSSAF stays monthly only.** No quarterly option. | B9 |

---

## 6. Model and product

| # | Decision | Replaces |
|---|---|---|
| D-33 | `MISSION` keeps `is_training` **and** gains a **category reference table** (Formation école / Formation pro / Conseil, extensible). | B8, RG-25 |
| D-34 | Partial invoicing of a forfait: **typed amount per invoice**. Backlog = forfait − sum of invoices. | C8 |
| D-35 | New **`SETTING` / `COMPANY_PROFILE`** entity: hours per day, rounding step and direction, numbering pattern, company identity, and the display options of Appendix A. | B7, RG-17 |
| D-36 | **Audit log and data versioning are both wanted and are distinct** (who-changed-what vs restorable snapshots). Designed into the model now, **built later**. | B4, §7 |
| D-37 | **CSV import** (map columns → dry run → validate) **is** the Excel migration path. Both land in **V2**. | B1, B15, §8 |
| D-38 | Export (CSV/JSON), the WYSIWYG PDF report builder and AI analysis are **later phases**, but must appear in the spec's scope and roadmap. | B2, B3, B5 |
| D-39 | **Personal tool, nothing hardcoded.** Company identity, rates, thresholds and settings are all configuration. Resale stays possible without a rewrite; no onboarding or licensing work in V1. | B6 |
| D-40 | **No login in V1.** `USER` / `ROLE` / `PERMISSION` stay in the conceptual model; Better Auth is wired in when the assistant role arrives. | §7, C22 |

---

## 7. V1 perimeter

**In V1 — CRUD and views only:**
1. Referential: clients, partners, missions, TJM, portage contracts, mission categories, settings.
2. Time entry journal + per-partner consolidation view with generated billing text.
3. Micro invoicing + portage declarations (with time entries linked to them).

**Phase 2:** payments, URSSAF, payslips, and the whole dashboard / stats / charts.
**Phase 3:** CSV import and the Excel history migration.
**Later:** export, PDF report builder, audit log, user management, AI, Google Calendar.

### Two consequences worth stating plainly

- **V1 has no real net.** Estimated vs real reconciliation (§2.3, §5.6, RG-22, RG-23) depends entirely on payments, which are Phase 2. V1 shows estimated figures only, and neither "outstanding to pay" nor the average payment delay exists yet.
- **No login means the V1 instance must not be exposed publicly** — keep it behind your Caddy instance on a private network or a local port until Better Auth is in.

---

## 8. Integrity rules to add (decided, not asked)

- **RG-26** — A `TIME_ENTRY` links to at most one of `id_invoice` / `id_declaration`, never both. Linking to **neither** is normal: unlinked billable entries are the billing backlog.
- **RG-27** — `REGIME_RATE` periods for a given regime must not overlap; a document whose send date is covered by no rate is rejected at creation.
- **RG-28** — `PORTAGE_CONTRACT` validity periods **may** overlap by design (D-16), which is why the mission designates its contract (D-17).
- **RG-29** — See Appendix A.

## 9. Editorial fixes to apply during the v2 rewrite

- Complete MCD §3 with the two missing cardinalities (`MICRO_INVOICE`/`PORTAGE_DECLARATION` — bills — `TIME_ENTRY`).
- Harmonize amount naming: `amount_ht` on both the invoice and the declaration; drop the asymmetric `expected_payment`.
- Widen the Glossary definition of **Partner** — RG-01 allows a partner to be billed directly, and your workbook shows micro invoices addressed to a partner.
- Reword §2.2 "Full time-based: with a TJM, off site is billed".
- Soften §11 — the modelling round was not closed.
- Treat the pre-v2 working notes and business summaries as **historical records**, not as current rules: they still describe the real net arriving at full payment, and formation as a billing type. Repair their stale cross-references at the same time.

---

## Appendix A — Internal parameters

| # | Decision |
|---|---|
| D-11 | A mission may carry a **time adjustment coefficient**: `billed_duration = round_up(worked_duration × (1 + coefficient))`. Verified against the affected rows of the workbook: 2 h 00 → 2 h 30, 1 h 12 → 1 h 30, 0 h 54 → 1 h 15 (×1,15, then rounded up to the quarter). |
| D-12 | The coefficient is defined **per mission** and **historized**. The value in force is read at entry creation and **frozen on the time entry**. |
| D-13 | **Order of operations**: coefficient first, then rounding (D-05). |
| D-14 | It applies to **billable entries only**. Prep and internal time keep their real duration, so the real billing rate stays honest. |
| D-15 | **Not displayed by default.** Only an administrator setting reveals the coefficient and its column. Because it is baked into `billed_duration`, every downstream figure reconciles (`hours × TJM = CA`) whether or not it is shown, and no amount differs between the two modes — nothing appears anomalous when the application is demonstrated. |
| RG-29 | Coefficient validity periods must not overlap for a given mission. |
