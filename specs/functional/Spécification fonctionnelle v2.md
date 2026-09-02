# SynFactu — Functional Specification (V2)

> Billing and dashboard software for a freelance consultant operating under two regimes: French micro-entreprise and salary portage (portage salarial). This document covers the **functional** scope; the data model is in `MCD v2.md`.
>
> This specification is self-contained: everything needed to build V1 is here or in `MCD v2.md`. The reasoning behind each choice, and the alternatives rejected, is recorded in `Décisions v2.md` — referenced throughout as *(D-nn)*.
>
> Domain terms with no clean English equivalent are kept as-is: TJM (daily rate), URSSAF, portage, CFP, versement libératoire, HT.

---

## 1. Introduction and Context

### 1.1 Purpose
Define the functional behavior of SynFactu, a tool to record, invoice, track payments for and analyze a freelance consultant's activity, replacing the current Excel workbook.

### 1.2 Background
The consultant currently uses a yearly Excel workbook. It works but has three limits: it is not clean (abandoned experiments remain), it has no statistics or charts, and it covers a single year. SynFactu must hold **all years in one single database** and provide stats and charts natively.

### 1.3 Scope

**In scope, V1** — data entry (CRUD) optimized for speed, the referential (clients, partners, missions, portage contracts), time tracking, consolidation for partner billing, micro invoicing, portage declarations, and a role model designed into the data model from the start.

**In scope, later phases** — payment tracking, URSSAF, payslips, dashboard and statistics, CSV import and Excel history migration, data export, PDF report builder, audit log, user management, AI analysis.

**Out of scope entirely** — generating legal invoice PDFs, VAT management of any kind *(D-27)*, automated alerts *(D-28)*, Google Calendar import *(D-29)*.

### 1.4 Product constraint
SynFactu is built as a personal tool, but **nothing is hardcoded** *(D-39)*: company identity, rates, conversion factors, numbering pattern and display options all live in configuration. This keeps a later resale as a self-hosted product possible without a rewrite. No onboarding, licensing or multi-tenancy work is done in V1.

### 1.5 Glossary
- **TJM**: daily rate (taux journalier moyen).
- **HT**: excluding tax (hors taxes).
- **Brut / Net**: gross revenue vs net after charges.
- **Partner**: an intermediary who refers end clients. A partner may itself be billed directly, under either regime.
- **End client**: the final client, possibly reached through a partner.
- **Portage**: salary portage; the portage company employs the consultant and pays a net salary.
- **Portage contract**: the contract with a portage company, carrying its own charge rate. Several may run at the same time *(D-16)*.
- **CFP**: contribution to professional training.
- **Versement libératoire**: flat personal income tax option for micro-entreprise.

### 1.6 Personas
- **Administrator** (the consultant): full access to all data and features.
- **Externalized administrative and financial assistant** (later): restricted access (time entry, URSSAF, etc.). Detailed scope to be defined when the role is implemented.

---

## 2. Business Overview

### 2.1 The two billing regimes
The consultant bills under two regimes that must remain **strictly separate** (merging them in the workbook proved to be a mistake):

- **Micro-entreprise**: charges approx. **25 %** — cotisations + CFP. This is the only figure used in estimates *(D-26)*. The versement libératoire (approx. 2,2 %) is a **personal income tax** and is tracked separately in the URSSAF module; it is never blended into the estimated charge rate.
- **Portage salarial**: charges approx. **50 %**, set by the portage contract, not by law.

Charge rates are **not fixed forever**. The micro rate is historized with validity periods (REGIME_RATE). The portage rate lives on the **portage contract**, because it is contractual, and because **several contracts may be active at the same time** *(D-16)*.

### 2.2 Revenue streams
Three billing types, all orthogonal to what the mission is about:

- **`temps passé`** — time-based with a TJM; all work is billed, on-site or not.
- **`temps sur site`** — only time spent in front of the client is billed; preparation time is recorded but not billed, so a real billing rate can be computed.
- **`forfait`** — an agreed global amount; time is tracked only to derive the real TJM.

A mission prices its time by **TJM or by hourly rate** *(D-03)*. Hourly pricing exists because some work (e.g. teaching at 65 €/h) is genuinely quoted by the hour, not as a fraction of a day.

**Training is not a revenue stream**: it is a property of a mission. A mission carries an `is_training` flag **and** a **category** (Formation école / Formation pro / Conseil, extensible) *(D-33)*, both independent of the billing type.

### 2.3 Hours and days
**7 hours = 1 day** *(D-01)*, a single global setting. An hourly rate derived from a TJM is `TJM / hours_per_day`. Every hours/days/amount figure in the consolidation and declaration views rests on this conversion.

### 2.4 Gross vs net
At invoicing, the net is an **estimate**: the charge rate in effect on the date the document is **sent** is frozen into the document *(D-25)*. Since the rate is frozen at sending, later rate changes never retroactively affect existing documents.

The **real** net and charge rate are recorded per payment, not on the document — a single document can be settled by several payments. This entire mechanism depends on the payments module and is therefore **Phase 2**: V1 shows estimated figures only.

### 2.5 High-level workflow
Time entry → consolidation → invoicing (micro) or declaration (portage) → *[Phase 2]* payment(s) → URSSAF tracking (micro) → dashboard.

---

## 3. Functional Scope (Overview)
- Core CRUD on financial data, optimized for fast entry.
- Visualization by month, quarter, year, multi-year, client, partner, regime and billing type.
- Statistics: annual averages, real TJM, average payment delay, real billing rate *(Phase 2)*.
- Charts: gross/net evolution, revenue trend, per-client distribution *(Phase 2)*.
- Payment tracking and reconciliation, including installments *(Phase 2)*.
- One single multi-year database (mandatory).

---

## 4. Data Model (Conceptual)
The conceptual data model — entities, Mermaid diagram, entity dictionary, cardinalities, business rules RG-01..RG-35 — is maintained in **`MCD v2.md`**.

---

## 5. Functional Modules

### 5.1 Referential *(V1)*
Clients, partners, missions, mission categories, portage contracts and application settings.

- A **client** carries a `billable` flag, an `active` flag, an optional referring partner, a default regime and a **single default TJM** *(D-06)*.
- A **mission** belongs to one client, carries its own TJM or hourly rate (pre-filled from the client), a billing type, a `billable` flag *(D-04)*, an `is_training` flag and a category. A portage mission **must designate its portage contract** *(D-17)* — with concurrent contracts the rate cannot be resolved from the date alone.
- **RG-02 stands**: one mission covers exactly one prestation and one rate. A rate change means a new mission, not a new rate version *(D-06)*.
- Inactive missions and inactive clients are excluded from selection lists but remain in history.

### 5.2 Time tracking and entry *(V1)*
Record time entries quickly. Each entry carries: date, optional start/end, **three durations**, billable flag, unbilled reason, title, tags, ISO week, the invoicing period it is affected to, the applied rate and the computed revenue.

**The three durations** *(D-02)*:

| Field | Meaning |
|---|---|
| `worked_duration` | Time actually worked. |
| `rounded_duration` | Auto-computed from the worked duration. |
| `billed_duration` | What is billed. Defaults to the rounded duration, manually correctable, and **may exceed the worked duration** — a 2 h 45 on-site session billed as 3 h 30 is normal. |

All revenue derives from `billed_duration`. The real billing rate is `billed_duration / worked_duration`.

**Rounding** *(D-05)*: the step is a configurable setting (default 15 minutes) and rounding is **always upward** to the next step — 0 h 16 → 0 h 30, 1 h 19 → 1 h 30, 3 h 43 → 3 h 45. See also Appendix A for the order of operations.

**Billable and non-billable** *(D-04)*: an entry is billable or not; when it is not, an `unbilled_reason` says why — `prep` (preparation on a paying mission), `internal`, `commercial`, `other`. The distinction matters: prep time on a paying mission is what the real billing rate measures, whereas internal time is overhead.

**Forfait missions** *(D-07)*: their time entries carry **no TJM and zero revenue**. Time is tracked solely to derive the real TJM.

**Invoicing period**: chosen manually, stored as `YYYY-MM` *(D-08)*. It frequently differs from the work date — work done in October 2025 may be affected to 2026-01.

**Client and partner** are not stored on the entry; they are read through the mission *(D-10)*.

**Tags**: a predefined base list, extensible with user-added tags, hierarchical via `::` — e.g. `commercial::RDV1`.

### 5.3 Consolidation for partner billing *(V1)*
Aggregated view per partner, broken down by end client and by work week/month, showing hours, days and amount HT. The module **auto-generates the billing text**:

```
Détail du mois : Avril 2026
Client : <client A> : 9,5h - soit 1,36 j
  - Semaine 03 : 3,5h - soit 0,5 j
  - Semaine 04 : 6h - soit 0,86 j
Client : <client B> : 8,75h - soit 1,25 j
  ...
```

The month in the header is the **invoicing period**, not the work month — the weeks listed under it may belong to an earlier month.

### 5.4 Portage declarations *(V1)*
A declaration is **one per portage contract per month** *(D-18)*, with a **breakdown line per partner and end client** carrying hours, days and amount HT. This mirrors the current "Déclaration portage" sheet, and it is what allows a single monthly salary to settle a whole month's activity across several partners.

The declaration carries its total hours, total days, amount HT, the charge rate frozen from its contract, the estimated net, and a status.

### 5.5 Micro invoicing *(V1)*
Records invoices with: number, invoicing period, client, **mission** *(D-22)*, amount HT, send date, estimated charge rate, estimated net, status, comment. SynFactu tracks invoice **data only**; it does not produce the legal PDF.

**Numbering** *(D-23)*: `YYYY-MM-NNN_Client_mission`, where `YYYY-MM` is the month the invoice is **sent**. The sequence **resets every month** and is **assigned at sending** — drafts carry no number, so the sequence has no holes. The mission part is a few very short words.

**Send date** *(D-21)*: it drives the numbering, the charge-rate freeze *(D-25)* and the payment-delay statistic. There are **no due dates** *(D-20)*.

**Status** *(D-24)*: `Brouillon → Envoyée → Payée partiellement → Payée`, plus **`Annulée`**. The first two and the cancellation are set manually; the two payment statuses are derived from linked payments *(Phase 2)*. There is no credit note (avoir).

**Linking time entries**: the system pre-selects all unlinked billable time entries for the relevant client/mission/period; the user can deselect entries before validating.

### 5.6 Billing backlog and installments *(V1 for the backlog)*
- **Work value** per mission: sum of the billable entries' revenue for `temps passé` and `temps sur site`; the agreed `fixed_price_amount` for `forfait`.
- **Billing backlog ("encours à facturer")** = work value minus the amount already invoiced.
- A total can be **invoiced in several steps**. For a forfait, the fraction is recorded as a **typed amount per invoice** *(D-34)*.
- **Outstanding to pay ("reste à payer")** = amount invoiced minus payments received — *Phase 2*, since it needs the payments module.
- **No planned schedule (échéancier)**: only the running deltas are tracked.

### 5.7 Payments *(Phase 2)*
Declare a payment and link it to **either** a micro invoice **or** a portage declaration. **One payment settles exactly one document** *(D-30)*: a single transfer covering two invoices is entered as two payment lines. Several payments per document are supported (installments), and the outstanding amount per document is shown.

The payment's period is **derived from its date and manually overridable** *(D-31)*.

Each payment carries the **real** figures once known. For a micro payment, the real rate and net are auto-computed once its month's URSSAF record is finalized. For a portage payment, the real charge rate is derived from the **payslip**. A payment is "reconciled" once its real charge rate is set.

### 5.8 Payslips *(Phase 2)*
One payslip **per portage contract per month** *(D-19)*, recording gross, net and employer charges. The salary payment links to it, and the contract's real charge rate is derived from it. This is what the v1 spec assumed but never modeled.

### 5.9 URSSAF management, micro *(Phase 2)*
CRUD on **monthly** URSSAF records *(D-32)* — no quarterly option — separating:

- **Cotisations + CFP** = company-level tax.
- **Versement libératoire** = personal income tax.

The base of a month is the sum of the micro payments received that month; those payments are linked to the record. Two nets are distinguished: the net after cotisations, and the net after cotisations **and** versement libératoire.

---

## 6. Dashboard and Reporting *(Phase 2)*

### 6.1 Key indicators
Revenue (HT), gross, net, outstanding to invoice, outstanding to pay, average payment delay, real TJM, real billing rate.

### 6.2 Payment delay reference
- **Micro**: from the invoice's **send date** to the payment date *(D-20)*.
- **Portage**: from the start of the month concerned by the declaration.

### 6.3 Real TJM and billing rate
The denominator includes **all time, billable or not** (preparation, related commercial time), so the real rate can be compared to the invoiced TJM.

### 6.4 Filters and breakdowns
Time filters (month, quarter, year, multi-year). Breakdowns by client, partner, regime, billing type and mission category.

### 6.5 Charts
Gross/net evolution, revenue trend, per-client distribution. **No alerts and no overdue flagging** *(D-20, D-28)* — the dashboard shows figures and the age of unpaid documents; you draw the conclusions.

---

## 7. User Management and Roles
**No login in V1** *(D-40)*. The USER / ROLE / PERMISSION entities stay in the conceptual model so nothing has to be retrofitted, but authentication is wired in when the assistant role arrives.

- **Administrator**: full access.
- **Assistant** (externalized administrative and financial): restricted scope; permission matrix to be detailed when the role is implemented.
- An **audit log** records changes (who changed what, when, before/after), and **data versioning** keeps restorable snapshots with a diff. Both are wanted, they are **distinct**, and both are built later *(D-36)*.

> Because V1 has no authentication, the instance must not be exposed on a public URL until Better Auth is in place.

---

## 8. Data Import and Migration *(Phase 3)*
A single **CSV import** feature serves both ongoing imports and the Excel history migration *(D-37)*: read a CSV → map its columns to the model → **dry run** showing exactly what will happen → user validates.

Acceptance for the history migration: yearly totals reconcile with the source workbook, and legacy artifacts (orphan formulas, abandoned columns) are dropped rather than carried over.

**Data export** to CSV or JSON, for backup and data ownership, ships alongside it *(D-38)*.

---

## 9. Non-Functional Requirements (Functional-facing)
- **Usability**: speed of entry is the priority.
- **Data integrity**: one single source of truth, multi-year. Historical facts are frozen; totals are computed *(D-09)*.
- **Localization**: French, euro, French fiscal rules — all configurable rather than hardcoded *(D-39)*.
- **Privacy**: financial data protection; no external service holds business data.
- **Traceability**: audit log and versioning (section 7).

---

## 10. Roadmap and Phasing

| Phase | Content |
|---|---|
| **V1** | Referential · time entry and journal · consolidation view with generated billing text · micro invoicing · portage declarations · settings. **CRUD and views only.** |
| **Phase 2** | Payments · payslips · URSSAF · the whole dashboard, statistics and charts. |
| **Phase 3** | CSV import and Excel history migration · data export. |
| **Later** | PDF report builder · audit log and data versioning · user management and authentication · AI analysis (Mistral / Ollama) · Google Calendar pre-fill. |

### What V1 deliberately does not do
V1 records what you invoice, not what you are paid. Estimated-versus-real reconciliation, outstanding-to-pay and the average payment delay all depend on the payments module and arrive in Phase 2. V1 shows **estimated figures only**.

---

## 11. Open Questions
The modeling round is closed for V1. Deliberately deferred, with no impact on the V1 model:

- The **assistant permission matrix** and the precise scope of that role.
- The **subcontracted/direct training classification** and the full "Déclaration d'Activité de Formation" tooling.
- The **PDF report builder**'s detailed behavior (block types, page-break handling).
- The **AI analysis** use cases and provider.

---

## Appendix A — Internal parameters

A mission may carry a **time adjustment coefficient**, historized, which multiplies the worked duration when computing the billed duration:

```
billed_duration = round_up(worked_duration × (1 + coefficient))
```

- The coefficient is defined **per mission** and historized. The value in force is read at entry creation and **frozen on the time entry**.
- **Order of operations**: coefficient first, then the rounding of §5.2.
- It applies to **billable entries only**. Preparation and internal time keep their real duration, so the real billing rate of §6.3 stays honest.
- Coefficient validity periods must not overlap for a given mission.
- **It is not displayed by default.** Only an administrator setting reveals the coefficient and its column. Because it is folded into `billed_duration`, every downstream figure reconciles (`hours × TJM = CA`) whether or not it is shown, and no amount differs between the two display modes.
