# EHR Internal Audit — Gaps, Problems & Phased Remediation Plan

> **HISTORICAL SNAPSHOT (2026-06-18) — not live status.** This records the June clinical-core hardening pass. For current platform status and gaps, see the current audit of record: [CTO_AUDIT_2026-07-01.md](CTO_AUDIT_2026-07-01.md), plus [EHR_SYSTEM_BLUEPRINT.md](EHR_SYSTEM_BLUEPRINT.md) and [EHR_NOW.md](EHR_NOW.md).

> **Created:** 2026-06-18 · **Historical:** frozen remediation ledger, not live status (see banner above).
> **Status:** AUDIT ONLY — no code or docs changed yet. This file is the master plan.
> **Scope:** the clinical core (`src/lib/medplum/*`), the patient chart (`src/features/ehr/admin-patient/*`), the clinician workspace (`src/features/ehr/clinician-physio/*`), and the engineering docs (`.claude/CLAUDE.md`, `docs/*`).
> **Method:** read every clinical write module line-by-line and cross-checked each against `docs/FHIR_CATALOG.md`. Findings below are grounded in the code as of this date, not the docs.

---

## How to read this file

- Work is grouped into **Phases**. Do them **in order** — each phase assumes the previous one is done.
- Every phase has: **Goal**, **Why it matters**, **Findings addressed**, a **task checklist**, **files in scope**, and **done-when** acceptance criteria.
- Nothing here is implemented yet. This is the agreed plan to review **before** any build work begins.
- Severity legend: 🔴 critical (safety/compliance) · 🟠 high (maturity/correctness) · 🟡 medium (interoperability/UX) · ⚪ low (cleanup).

---

## Finding register (the full list, before phasing)

| # | Severity | Area | Problem | Source of truth |
|---|---|---|---|---|
| F1 | 🔴 | Audit | `writeMedplumAuditMirror` writes **only** a Postgres row — it never creates the FHIR `AuditEvent` the docs claim. It is also **best-effort** (swallows errors). | [audit.ts](../src/lib/medplum/audit.ts) |
| F2 | 🔴 | Docs | FHIR_CATALOG / CLAUDE.md / HIPAA describe an idealized EHR (coded, dual-audited) that the code does not implement. Multiple direct contradictions. | [FHIR_CATALOG.md](FHIR_CATALOG.md) |
| F3 | 🟠 | Medications | Uses `MedicationStatement` while the UI says "Add medication **order**" and doctors prescribe → semantically should be `MedicationRequest`. Drug name is **free text, no RxNorm/ATC**. No structured dose. No controlled-substance ledger link in this path. | [medications.ts](../src/lib/medplum/medications.ts) |
| F4 | 🔴 | Safety | **No drug–allergy or drug–drug interaction checking is possible** because meds and allergies are uncoded free text. | F3 + F5 |
| F5 | 🟠 | Allergies | Allergen is free text (no code), **no `category`** (can't distinguish drug vs food), reaction hardcoded to "Unspecified reaction", no "No Known Allergies" state. | [allergies.ts](../src/lib/medplum/allergies.ts) |
| F6 | 🟠 | Assessments | All assessments are one generic `QuestionnaireResponse` against a **phantom `Questionnaire/anees-assessment`** that isn't defined. No real instrument structure, no scoring rubric, no risk banding (Berg/Braden/Morse/MMSE are title+number+free text). | [assessments.ts](../src/lib/medplum/assessments.ts) |
| F7 | 🟠 | Labs | `DiagnosticReport` has **no result `Observation`s and no `presentedForm` PDF**. A "result" is a title + free-text conclusion. Orders/results uncoded. No order→result chase loop. | [labs.ts](../src/lib/medplum/labs.ts) |
| F8 | 🟡 | Care reports | Physio/nursing reports stuff 20+ outcome measures (Berg, Tinetti, Ashworth, TUG) as custom `component` codes in **one `Observation` (category survey)** → not trendable/interoperable by a standard FHIR consumer. Never signed. Narrative split across two resource types. | [care-reports.ts](../src/lib/medplum/care-reports.ts) |
| F9 | 🟠 | Clinical notes | "Signing" sets `status=final` + a custom extension but writes **no FHIR `Composition.attester` and no `Provenance`**. Note body is one free-text blob, not SOAP. No co-sign/countersign for trainees. | [clinical-notes.ts](../src/lib/medplum/clinical-notes.ts) |
| F10 | 🟡 | Vitals | **No respiratory rate** (core vital), no height/BMI, and **no `interpretation[]`** persisted on the observation (abnormal flag lives only in a side escalation). | [observations.ts](../src/lib/medplum/observations.ts) |
| F11 | 🟡 | Problems | Always `verificationStatus = confirmed` — cannot record provisional/differential diagnosis. No severity/body-site/stage. Doc claims auto `meta.security=psy` for mental health — not implemented. | [conditions.ts](../src/lib/medplum/conditions.ts) |
| F12 | 🟡 | Goals | Baseline/current/unit are serialized into a free-text note string and parsed back with **regex**; target uses free-text `measure`/`detailString` not coded `measure`/`detailQuantity`. | [goals.ts](../src/lib/medplum/goals.ts) |
| F13 | 🟠 | Roles | Of 12 staff roles, only physio (+ admin) has a full workspace. `doctor` has no authoring depth; `nurse` reports are unsigned; `viewer`/`hospital_partner_admin` log in to a dead-end page. | [route-access.ts](../src/lib/auth/route-access.ts) |
| F14 | 🟠 | Business | No formal **discharge / episode-of-care closure**, no outcome rollup, no order→result tasking. | repo-wide |
| F15 | 🔴 | Tech | **No tests, no Sentry/observability** repo-wide — top operational risk before hospital go-live. | repo-wide |
| F16 | 🟡 | Audit coverage | Postgres-only operational mutations (Invoice, ProviderPayout, Promocode, demographics edits) are not consistently audited. | CLAUDE.md pitfalls |
| F17 | ⚪ | Docs | "24 modules" claim is stale — there are 29 `.ts` files in `src/lib/medplum/` (~22 own a FHIR resource). | CLAUDE.md |

---

## Phase 0 — Documentation truth pass ✅ DONE (2026-06-18, no app code)

**Goal:** make every engineering doc match what the code actually does, with a clear *Implemented vs Roadmap* split, so all later decisions sit on honest ground.

**Why it matters:** several docs stated things that were false (F1, F2). You cannot plan a build on documentation that misdescribes the system. This phase is cheap and unblocks everything.

**Findings addressed:** F1 (doc side), F2, F6 (doc contradiction), F17.

**Tasks**
- [x] `docs/FHIR_CATALOG.md` §10 — corrected Medications: now states `MedicationStatement`, free-text, no RxNorm, no CS-ledger link, with `MedicationRequest` flagged as the roadmap target.
- [x] `docs/FHIR_CATALOG.md` §6 **and** the "Resources not used" table — contradiction resolved: assessments use `QuestionnaireResponse` (not `Observation`), against a not-yet-defined `Questionnaire`.
- [x] `docs/FHIR_CATALOG.md` §16 — corrected Labs: no result `Observation`s, no `presentedForm` yet; conclusion is free text.
- [x] `docs/FHIR_CATALOG.md` §9 — corrected Allergies: free text, no `category`, stub reaction, no NKA.
- [x] `docs/FHIR_CATALOG.md` §8 — flagged the "mental-health auto `meta.security=psy`" claim as not implemented.
- [x] `docs/FHIR_CATALOG.md` §17 — corrected Goal target modelling (free-text note + regex, not coded quantity).
- [x] `docs/FHIR_CATALOG.md` §20 — softened "immutable after final"; noted there is no FHIR `attester`/`Provenance` yet.
- [x] `docs/FHIR_CATALOG.md` §21 + §5 vitals + the audit convention bullet + `.claude/CLAUDE.md` + `docs/HIPAA_COMPLIANCE.md` (§164.312(b) row + retention §12) — **corrected the audit claim**: today it is **Postgres-only, best-effort**; the dual FHIR `AuditEvent` is a roadmap item (see Phase 1).
- [x] `.claude/CLAUDE.md` — fixed the "24 modules" count (29 files / ~22 resource modules) in 4 places; added a companion-docs pointer to this `EHR_AUDIT.md`; corrected the `audit.ts` row + audit roadmap row.
- [x] Added an **"Implemented vs Roadmap" status legend** at the top of FHIR_CATALOG and a per-resource **Status** line on every corrected section.
- [x] `docs/README.md` + `docs/EHR_NOW.md` — added EHR_AUDIT to the doc set, fixed the module count, dated the refresh, and linked the plan.

**Files changed:** `docs/FHIR_CATALOG.md`, `.claude/CLAUDE.md`, `docs/HIPAA_COMPLIANCE.md`, `docs/README.md`, `docs/EHR_NOW.md`.

**Done when:** a clinician/engineer/auditor reading the docs sees only statements that are true of the current code, with roadmap items clearly labelled. ✅ Met.

---

## Phase 1 — Audit trail integrity (compliance-critical) 🔴 — ✅ CORE DONE (2026-06-18), 🟡 coverage sweep residual

**Goal:** make the audit log trustworthy and match the compliance documentation.

**Why it matters:** HIPAA §164.312(b) and Egypt DPL treat the audit log as a legal control. It was single-store and silently failing.

**Findings addressed:** F1 ✅, F16 🟡 (partial).

**What shipped (no DB migration — `AuditLog` already had the columns; `AuditEvent` lives in Medplum):**
- [x] **Canonical `recordAudit`** in `src/lib/utils/audit.ts` — durable Postgres write, **retried 3× and never silently swallowed** (persistent failure logs `AUDIT_WRITE_FAILED` at ERROR; `critical: true` actions **throw** so an un-auditable security action is denied).
- [x] **Real FHIR `AuditEvent`** (R4, spec-compliant, no PHI) in new `src/lib/medplum/audit-event.ts`, mirrored **off the request's critical path** via `after()` so a Medplum outage never blocks care or loses the Postgres record (failures log `AUDIT_FHIR_MIRROR_FAILED`).
- [x] `writeMedplumAuditMirror` re-pointed at `recordAudit` → all ~14 clinical call sites get dual-store + non-swallow with **zero call-site churn**.
- [x] Break-glass / restricted-access overrides routed through `recordAudit(..., { critical: true })` → they now also emit a FHIR `AuditEvent` and fail closed if un-auditable. (Confirmed they already emitted `action=override` with actor + reason.)
- [x] `npx tsc --noEmit` + `eslint` clean on all changed files.
- [x] Docs reconciled to the shipped mechanism: FHIR_CATALOG §21 + audit bullet, HIPAA §164.312(b) + retention, SECURITY_ARCHITECTURE §6.2/§7.2 + layer diagram, CLAUDE.md.

**Residual (tracked, intentionally not forced in this pass):**
- [ ] Extend the FHIR `AuditEvent` mirror to **login/logout** (`writeLoginAudit` in `src/auth.ts`) and **`access_denied`** (`enforce.ts`). Left Postgres-only for now (auth/denial events are high-volume; mirroring needs a rate/noise decision).
- [ ] **Operational-mutation coverage sweep (F16):** add `recordAudit(...)` to Promocode redemption + Invoice + ProviderPayout mutations (in `src/app/api/bookings/*` + finance paths). Patient demographics edits are **already covered**. This sweep touches payment/booking code and deserves its own careful pass — the `recordAudit` mechanism now makes each addition a one-liner.

**Files changed:** `src/lib/utils/audit.ts`, `src/lib/medplum/audit.ts`, `src/lib/medplum/audit-event.ts` (new), `src/features/ehr/admin-patient/actions/restricted-access.ts`, plus the docs above.

**Done when:** every clinical-write + override produces an audit record that cannot silently fail and is mirrored to FHIR, and the docs describe the real mechanism. ✅ Met for clinical writes + overrides; residual sweep above extends it to auth + operational writes.

---

## Phase 2 — Coded medications + allergies → interaction checking 🔴 — ✅ CORE DONE (2026-06-18)

**Goal:** turn meds and allergies from free text into coded data so the system can reason about them.

**Why it matters:** highest patient-safety ROI. Elderly home-care patients on polypharmacy need drug–allergy and drug–drug checks.

**Findings addressed:** F4 ✅, F5 ✅, F3 🟡 (coded; resource-type split deferred — see below).

**What shipped (no DB migration — `ControlledSubstanceLedger` already existed; catalogs are app-owned):**
- [x] **App-owned drug formulary** (`src/features/ehr/catalogs/drug-formulary.ts`) — curated home-care drugs with **RxNorm + ATC codes, active ingredients, therapeutic/structural classes, and controlled-substance schedule**. Mirrors the ICD-10 catalog pattern; served via a `drug` domain on `/api/ehr/terminology/suggest`.
- [x] **App-owned allergen catalog** (`src/features/ehr/catalogs/allergen-catalog.ts`) — common allergens with **category, SNOMED/Anees coding, and cross-reactivity classes** (e.g. penicillin → beta-lactam). Served via the `allergen` domain.
- [x] **Pure interaction engine** (`src/lib/ehr/medication-safety.ts`) — drug–allergy, drug–drug (curated class-pair rules), and duplicate-therapy screening. Verified against clinical scenarios (penicillin-allergy → contraindicated, warfarin+NSAID → contraindicated, opioid+benzodiazepine → contraindicated, clean patient → no alerts).
- [x] **Coded medications** — `medicationCodeableConcept` now carries RxNorm/ATC; a typeahead `CodedTermPicker` drives the form; free-text fallback allowed (uncoded, unscreened, flagged).
- [x] **Coded + categorised allergies** — `category`, SNOMED/Anees `code`, reaction `manifestation`, plus an affirmative **"No Known Allergies"** record (SNOMED 716186003).
- [x] **Screening at med-entry** — coded drugs are screened against active meds + allergies; warnings/contraindications **block the save until the clinician ticks an acknowledgement** (server-authoritative).
- [x] **Controlled-substance ledger** — scheduled drugs (CII–CV) write a `ControlledSubstanceLedger` row (`prescribed`), audited via `recordAudit`.
- [x] `tsc` + `eslint` clean; engine validated with a standalone scenario run.

**Residual / deliberate deferrals (tracked):**
- [ ] **`MedicationRequest` split (F3).** Chart entries remain `MedicationStatement` to preserve data + MAR linkage. Splitting prescriptions (`MedicationRequest`) from reconciliation needs dual-read + MAR re-linking — its own change, not bundled with the safety work.
- [ ] **Fully structured dose quantity.** Dose/route/frequency are still captured as text (not `dosage.doseAndRate.doseQuantity`). Sufficient for screening; structure later if e-prescribing ships.
- [ ] **Formulary breadth.** ~55 common drugs today (covers the high-risk interaction set). Grow the catalog, or back it with a seeded `drug_codes` table / licensed DDI source behind the same interface.

**Files changed:** `src/lib/ehr/medication-safety.ts` (new), `src/features/ehr/catalogs/drug-formulary.ts` (new), `src/features/ehr/catalogs/allergen-catalog.ts` (new), `src/features/ehr/components/CodedTermPicker.tsx` (new), `src/lib/medplum/medications.ts`, `src/lib/medplum/allergies.ts`, `src/features/ehr/admin-patient/actions/{medications,conditions-allergies,index}.ts`, `.../views/{medications-mar-sections,problems-risks-sections}.tsx`, `src/features/ehr/schemas/admin-patient/{medications,conditions-allergies}.ts`, `src/app/api/ehr/terminology/suggest/route.ts`, plus the docs above.

**Done when:** a clinician adding a drug the patient is allergic to gets an explicit blocking warning, and meds/allergies carry codes. ✅ Met.

---

## Phase 3 — Outcome measures as discrete coded Observations 🟡 — ✅ CORE DONE (2026-06-18)

**Goal:** make physio/nursing outcome scores trendable and interoperable.

**Why it matters:** the hospital partner (signed MOU) will need standards-based data. Berg/Tinetti/Ashworth/TUG were locked inside one custom Observation only Anees code understood (F8).

**Findings addressed:** F8 ✅.

**What shipped (no DB migration; additive — existing analytics untouched):**
- [x] **New `src/lib/medplum/outcome-measures.ts`** — a measure registry + a pure `buildOutcomeObservation` builder + `createOutcomeObservations` (transaction bundle) + a `listPatientOutcomeMeasures` trend reader.
- [x] **Each measure → its own discrete `Observation`**: Anees outcome code **+ LOINC where one exists** (pain → 72514-3), `valueQuantity` with a **UCUM** unit (`deg`/`s`/`cm`/`{score}`), dual `category` (standard + an Anees `outcome-measure` category for precise search).
- [x] **Wrapper-references-measures**: children `derivedFrom` the parent report; the parent gains a `hasMember` reference to the children. Emission is centralized in `createPhysioSessionReport` and **best-effort** (never loses the saved report).
- [x] **Trend reader surfaced** in the physio session workspace ("Coded Outcome Measures" panel) — the interoperable read, instead of parsing survey components.
- [x] `tsc` + `eslint` clean; the builder was scenario-verified (Berg → Anees code + `{score}`/UCUM + parent linkage; pain → Anees + LOINC 72514-3; TUG → `s` unit, no LOINC).

**Folded into Phase 6 (deliberate — avoids building the attester machinery twice):**
- [ ] Give care-reports a **draft→sign** lifecycle (currently created `final`, unsigned).
- [ ] **Unify the narrative** into a `Composition` so a patient's notes aren't split across `Composition` + `Observation/survey`.

**Files changed:** `src/lib/medplum/outcome-measures.ts` (new), `src/lib/medplum/care-reports.ts`, `src/lib/medplum/constants.ts`, `src/features/ehr/clinician-physio/session-workspace/{data.ts,SessionWorkspacePageView.tsx}`, plus the docs above.

**Done when:** a standard FHIR client can read and trend a patient's Berg/TUG scores over time. ✅ Met (the signing/unification residual moved to Phase 6).

---

## Phase 4 — Validated assessment instruments 🟠 — ✅ DONE (2026-06-18)

**Goal:** replace the generic assessment with real, scored, risk-banded instruments.

**Findings addressed:** F6 ✅.

**What shipped (no DB migration; pure catalog + coded Observation):**
- [x] **App-owned instrument catalog** (`src/features/ehr/catalogs/assessment-instruments.ts`, pure) for **Braden, Morse Fall Scale, MMSE, Berg, TUG, NPRS** — each with score range, LOINC (where one exists), measurement direction, and clinically-standard **risk bands**.
- [x] **Coded Observation storage** (replacing the phantom `Questionnaire/anees-assessment`): Anees instrument code + LOINC, `valueQuantity` (UCUM), and the band as `interpretation[]` (v3 `N/A/AA` + Anees risk coding).
- [x] **Range enforcement** — `scoreAssessment` validates the raw score against the instrument range and **rejects out-of-range saves** server-side.
- [x] **Risk banding computed + stored** (e.g. Braden ≤9 → "Severe risk", Berg ≤20 → "High fall risk", NPRS 7–10 → "Severe pain").
- [x] **Dual read** — `listPatientAssessments` merges new coded Observations with legacy `QuestionnaireResponse`s so history survives; the band shows in the admin Measurements table + physio session workspace.
- [x] Forms updated (admin Measurements + physio quick-assessment) to a validated-instrument selector; free-text fallback retained on the admin side.
- [x] `tsc` + `eslint` clean; the scoring/banding was scenario-verified against clinical thresholds for all six instruments (incl. out-of-range rejection + unknown-instrument guard).

**Note:** "enforce each instrument's *items*" (e.g. Berg's 14 sub-items) is intentionally **not** implemented — we validate + band the **total score** (the clinically-actionable value). Item-level capture would need large per-instrument forms and is deferred (would use `Questionnaire`/`QuestionnaireResponse`); tracked as a future enhancement, not a Phase 4 blocker.

**Files changed:** `src/features/ehr/catalogs/assessment-instruments.ts` (new), `src/lib/medplum/assessments.ts`, `src/lib/medplum/constants.ts`, `src/features/ehr/schemas/admin-patient/vitals-assessments.ts`, `src/features/ehr/admin-patient/actions/vitals-assessments.ts`, `.../views/measurements-sections.tsx`, `src/features/ehr/clinician-physio/session-workspace/{data.ts,SessionWorkspacePageView.tsx}`, plus the docs above.

**Done when:** selecting "Braden" produces a real scored scale with a risk band, not a free integer. ✅ Met.

---

## Phase 5 — Vitals completeness & interpretation 🟡 — ✅ DONE (2026-06-18)

**Goal:** complete the vital-signs set and persist abnormal flags on the data itself.

**Findings addressed:** F10 ✅.

**What shipped (no DB migration):**
- [x] **Respiratory rate** (LOINC 9279-1), **height** (8302-2), and **auto-computed BMI** (39156-5, from weight + height) added to the vitals panel.
- [x] **`Observation.interpretation[]`** (`L`/`N`/`H`, v3 ObservationInterpretation) now written on every threshold-bearing vital + the BP components, from the nursing-ops thresholds; BMI uses WHO cut-offs. Parsed back on read as per-metric abnormal flags.
- [x] **At-entry live warning** — new `VitalInput` client component shows Low/High as the clinician types, with thresholds passed from the server policy (no client/server duplication). The "Recent vitals" table highlights abnormal values.
- [x] **Respiratory-rate threshold** added to `nursing-ops-policy` (+ env overrides) and wired into the escalation evaluator.
- [x] **Glucose duplication resolved by clarification** — vitals glucose (2339-0) is point-of-care; the form now links to the structured **Blood Glucose Profile** (41653-7). Documented as distinct-by-design (matches the existing glucose-profile feature).
- [x] `tsc` + `eslint` clean.

**Note:** kept the interpretation to `L/N/H` (driven by the configured alert range) rather than a separate `LL/HH` critical tier — adding configurable critical thresholds is a small future enhancement, not needed for the flag-on-the-data requirement.

**Files changed:** `src/lib/medplum/observations.ts`, `src/lib/config/nursing-ops-policy.ts`, `src/lib/ehr/nursing-alerts.ts`, `src/features/ehr/components/VitalInput.tsx` (new), `src/features/ehr/schemas/admin-patient/vitals-assessments.ts`, `src/features/ehr/admin-patient/actions/vitals-assessments.ts`, `.../views/measurements-sections.tsx`, plus the docs above.

**Done when:** the vitals set is clinically complete and each reading carries its own normal/abnormal flag. ✅ Met.

---

## Phase 6 — Clinical note signing & problem maturity 🟠 — ✅ CORE DONE (2026-06-18)

**Goal:** make signed notes legally sound and let clinicians record clinical nuance.

**Findings addressed:** F9 ✅ (signing/attestation), F11 ✅ (condition maturity).

**What shipped (no DB migration):**
- [x] **Legal attestation on sign** — `signClinicalNote` now writes a FHIR **`Composition.attester`** (`mode = legal`, party, time) **and** an immutable **`Provenance`** (new reusable `src/lib/medplum/provenance.ts`, best-effort).
- [x] **Immutable amendments** — `createClinicalNoteDraft` sets `relatesTo` (`replaces`) when amending; the prior note is never mutated and a re-sign of a `final` note is a no-op.
- [x] **Condition maturity** — `verificationStatus` is now clinician-selectable (`confirmed | provisional | differential | unconfirmed`), plus optional SNOMED-coded **severity** and free-text **body-site**; surfaced in the problems form + table.
- [x] **Auto restricted-tier tagging** — sensitive diagnoses are auto-classified on create (ICD-10 F-codes → `psy`; HIV B20–B24/Z21 + STIs A50–A64 → `r`; label fallback), so the existing restricted-tier masking applies automatically.
- [x] **(folded from Phase 3)** Care-reports (physio + nursing) now write an immutable **`Provenance`** authorship attestation on create.
- [x] `tsc` + `eslint` clean.

**Deferred (tracked — all need a notes-management UI that doesn't exist yet, so building them now would add uncalled code):**
- [ ] **Trainee co-sign / countersign** (a supervisor adding a second `attester`). The data model supports it; there is no notes list/sign UI to attach it to.
- [ ] **Structured SOAP sections** — the only note authored today is the physio *discharge summary* (a narrative), which SOAP doesn't fit; revisit when per-encounter note authoring ships.
- [ ] **Full narrative unification** (migrating the care-report narrative into a `Composition`). Phase 3 already solved the interoperability driver (discrete coded Observations); this is now a lower-priority structural cleanup.

**Files changed:** `src/lib/medplum/provenance.ts` (new), `src/lib/medplum/clinical-notes.ts`, `src/lib/medplum/conditions.ts`, `src/lib/medplum/care-reports.ts`, `src/features/ehr/schemas/admin-patient/conditions-allergies.ts`, `src/features/ehr/admin-patient/actions/conditions-allergies.ts`, `.../views/problems-risks-sections.tsx`, plus the docs above.

**Done when:** a signed note has a real FHIR attestation + provenance and notes/problems support real clinical states. ✅ Met (co-sign/SOAP/unification deferred pending a notes UI).

---

## Phase 7 — Labs: discrete results & order→result loop 🟡 — ✅ CORE DONE (2026-06-18)

**Goal:** make labs a real ordering + resulting workflow.

**Findings addressed:** F7 ✅, F14 (partial — order→result loop ✅).

**What shipped (no DB migration):**
- [x] **App-owned analyte catalog** (`src/features/ehr/catalogs/lab-analytes.ts`, pure) — ~23 common analytes with **LOINC**, **UCUM** unit, and adult **reference ranges**.
- [x] **Discrete result Observations** (`createLabResultObservation`) — category `laboratory`, LOINC-coded, `valueQuantity` + unit, **`referenceRange`**, and a computed **`interpretation`** (L/N/H). Linked to the `DiagnosticReport` via `result[]` and to the order via `basedOn`.
- [x] **Order→result loop** — a lab order spawns a `lab-result-review` `Task` owned by the ordering clinician (deterministic; no unresulted order falls through silently).
- [x] **UI** — a coded "Add result value" form (analyte picker → auto LOINC + range + flag) + a flagged discrete-results table in the Labs tab; loaded tab-aware.
- [x] `tsc` + `eslint` clean; flagging scenario-verified (Potassium 6.0 → H, Hemoglobin 9 → L, ALT 120 → H, normals → N) with correct LOINC.

**Deferred:** `presentedForm` (result PDF) — already coverable via the Documents feature; native wiring is a small follow-up. The time-based "unresulted after N days" sweep is superseded by the deterministic per-order task (a cron sweep can be added later if needed).

**Files changed:** `src/features/ehr/catalogs/lab-analytes.ts` (new), `src/lib/medplum/labs.ts`, `src/features/ehr/admin-patient/actions/labs.ts`, `.../actions/index.ts`, `src/features/ehr/schemas/admin-patient/labs.ts`, `src/app/api/ehr/terminology/suggest/route.ts`, `.../data/index.ts`, `.../data/empty-state.ts`, `.../types.ts`, `.../view-context.ts`, `.../views/labs-sections.tsx`, plus the docs above.

**Done when:** a lab order can be fulfilled with discrete, flagged results and unresolved orders are chased. ✅ Met.

---

## Roles live per the matrix (2026-06-18) — ✅ wired

Alongside Phase 7, the coarse access gates were aligned to the already-correct fine matrix (`policy/ehr-matrix.ts`), so **every role is live with matrix-accurate access**:

- **Compliance Officer** now has **global read** of the patient chart + documents (audit/oversight, separation of duties), via a new `CLINICAL_READ_ROLES` set used by the route gate, the patient list/detail loaders, and document streaming. It holds **no write role**, so every mutation stays gated; the otherwise-ungated vitals/assessment forms are hidden for read-only roles (`canWriteMeasurements`). Restricted-tier standing read-all was already wired.
- **Viewer** (aggregate KPIs, **no PHI**) and **Hospital Partner Admin** (schema-only; multi-tenant portal lands in the tenant phase) are **intentionally deferred by the matrix itself** — they now get a clear, role-aware landing page instead of a generic dead-end.
- Doctor → patients, Nurse → nursing dashboard, Med Ops/Operator → ops, Physio → clinician, Insurance Coordinator/Finance → insurance, Compliance → compliance + read charts, Admin/Superadmin → everything. All verified against the route gate.

**Files:** `role-constants.ts`, `rbac.ts`, `route-access.ts`, `admin/patients/page.tsx`, `admin-patient/data/index.ts`, `api/ehr/documents/[id]/route.ts`, `admin/no-workspace/page.tsx`, `admin-patient/role-scope.ts` + `view-context.ts` + `views/measurements-sections.tsx`.

---

## Phase 8 — Role depth + matrix enforcement 🟠 — ✅ CORE DONE (2026-06-18)

**Goal:** give the clinical roles real, safe, matrix-accurate access — and make the role matrix the single source the UI and the server both obey.

**Findings addressed:** F13 ✅, F14 (episode closure ✅).

**What shipped (no DB migration):**
- [x] **UI gating now DERIVES from the role matrix.** `role-scope.ts` flags (`canWriteMedication`, `canWriteClinicalCondition`, `canEditDemographics`, `canWriteMeasurements`, `canCreateNursingShiftHandoff`, `canCloseCareEpisode`) call the same `roleAllowsAction` lookup the server gate uses — so a form a user **sees** and an action they can **submit** can no longer drift. This fixed a real bug: `admin` was shown clinical-write forms (meds/dx/vitals) it could never submit (the server already rejected them). Verified per role: admin → demographics only; doctor → meds/medical-dx/vitals/discharge; nurse/physio → their discipline; medops → per licence; compliance/finance/insurance → read-only.
- [x] **Discharge / Episode-of-care closure** — new `src/lib/medplum/episodes.ts` (FHIR `EpisodeOfCare`) + `closeCareEpisodeAction` + a "Care episode & discharge" panel in the Care-Plan tab. Gated by a new `episode.close` action (matrix: care-plan **sign** → licensed physician / superadmin), captures an outcome summary, audited.
- [x] **"My Access" page** (`/admin/access`) — renders the signed-in role's effective permissions **live from the matrix** (`permissionsForRole`), so the matrix is visible + auditable for every staff member (esp. compliance). Added to the nav + route gate.
- [x] **(done in Phase 7)** Matrix-deferred roles (`viewer`, `hospital_partner_admin`) get a role-aware landing; `compliance_officer` has global chart read.
- [x] `tsc` + `eslint` clean; role-flag matrix-alignment scenario-verified.

**Deferred (documented — not blockers):**
- [ ] A dedicated **doctor "rounds / order-sets" workspace** (a physio-app-style surface). The doctor is **not hollow** — they have full matrix-gated chart access (meds, dx, labs, notes, care plan) **plus discharge** now; a doctor-optimised inbox/order-sets view is an optimisation, a separate build.
- [ ] **Nursing-report draft→sign lifecycle** — same blocker as Phase 6 co-sign (needs a report-management UI that doesn't exist yet).

**Files changed:** `src/features/ehr/admin-patient/role-scope.ts`, `src/lib/auth/policy/actions.ts`, `src/lib/medplum/episodes.ts` (new), `.../actions/care-coordination.ts` + `.../actions/index.ts`, `.../schemas/admin-patient/care-coordination.ts`, `.../data/{index,empty-state}.ts`, `.../types.ts`, `.../view-context.ts`, `.../views/care-plan-goals-sections.tsx`, `src/app/admin/access/page.tsx` (new), `src/lib/auth/route-access.ts`, `src/lib/auth/admin-nav-policy.ts`, plus docs.

**Done when:** every role that can log in has matrix-accurate access (no UI/server drift), and a care episode can be discharged. ✅ Met.

---

## Phase 9 — Cross-cutting hardening 🔴 — ✅ CORE DONE (2026-06-18)

**Goal:** the non-negotiables before any hospital patient touches the system.

**Findings addressed:** F15 ✅ (tests), F16 🟡 (tenant guard).

**What shipped:**
- [x] **Automated test suite (Vitest)** — installed + configured (`vitest.config.ts`, `server-only` stub, `@/` alias; tests live in `tests/`, never `src/`). **39 unit tests, all green**, covering the security-critical **RBAC matrix** (server gate + UI-flag derivation per role), the **edge route gate**, the **clinical-safety engines** (drug–drug/allergy/duplicate, lab reference-range flagging, validated-assessment scoring/banding), the **coded catalogs**, and **production-readiness**. `npm test`.
- [x] **Tenant-scope guard** (`scripts/guard-tenant-scope.cjs`, `npm run lint:tenant`) — a CI ratchet that fails when a NEW Prisma call on a tenant-scoped model lacks a scoping signal (`tenantId` / `sessionTenantId` / nested-patient-tenant / `medplumPatientId`). Baselined at the current state (11 accepted sites — mostly `visit.update({where:{id}})` already tenant-validated upstream; a few earnings aggregates flagged for review).
- [x] **Production-readiness fail-fast** (`src/lib/config/production-readiness.ts` + `src/instrumentation.ts`) — at server boot in production, **throws** if the malware scanner is `mock_clean` (or unconfigured) or a required secret (`AUTH_SECRET`, `DATABASE_URL`, `MEDPLUM_*`) is missing. No-op in dev. Unit-tested.
- [x] **Observability seam + error boundaries** — `src/lib/utils/observability.ts` (`reportError`, the single Sentry drop-in point) + a new root `src/app/error.tsx` and the existing `global-error.tsx` now both forward to it. The CSP **already** allows `*.sentry.io` / `*.ingest.sentry.io`.

**Deferred (infra/deploy decisions, documented):**
- [ ] **Playwright E2E** — needs a running app + seeded auth/Medplum; the unit layer covers the pure safety/RBAC logic now.
- [ ] **`@sentry/nextjs` SDK install** — the seam, the instrumentation hook, and the CSP are ready; installing the SDK + setting a DSN is a deploy-time decision (the SDK is inert without one and wraps `next.config`).
- [ ] **Finish the tenant-scope sweep** — review the baselined earnings aggregates and migrate hot paths to the `$extends` tenant client; the ratchet now blocks regressions.

**Files changed:** `vitest.config.ts` (new), `tests/**` (new), `scripts/guard-tenant-scope.cjs` (new) + baseline, `src/lib/config/production-readiness.ts` (new), `src/instrumentation.ts` (new), `src/lib/utils/observability.ts` (new), `src/app/error.tsx` (new), `src/app/global-error.tsx`, `package.json` (vitest + scripts), plus docs.

**Done when:** core safety paths are test-covered, errors route to one observable sink, and prod can't boot with dev-only safety stubs. ✅ Met (E2E + Sentry SDK are deploy-time follow-ons).

---

## Suggested execution order (summary)

1. **Phase 0** — Docs truth pass (unblocks honest planning)
2. **Phase 1** — Audit trail integrity (compliance)
3. **Phase 2** — Coded meds + allergies + interaction checks (top safety ROI)
4. **Phase 3** — Outcome measures as coded Observations (interoperability)
5. **Phase 4** — Validated assessment instruments
6. **Phase 5** — Vitals completeness + interpretation
7. **Phase 6** — Note signing + problem maturity
8. **Phase 7** — Labs discrete results + order→result loop
9. **Phase 8** — Doctor/nurse workflow depth + discharge
10. **Phase 9** — Tests, observability, tenant enforcement (can run in parallel from the start)

> Phases 1 and 9 are the compliance/safety backbone and can begin alongside Phase 0. Phases 2→7 are the clinical-maturity build, in priority order. Phase 8 is the role-coverage build.

---

## Change log

| Date | Change |
|---|---|
| 2026-06-18 | Initial audit + phased remediation plan created. No code/docs changed yet. |
| 2026-06-18 | **Phase 0 (docs truth pass) completed.** Corrected FHIR_CATALOG (legend + per-resource Status lines), CLAUDE.md (module counts + audit row + companion link), HIPAA_COMPLIANCE (audit control + retention), README + EHR_NOW (doc set + counts + plan link). No application code changed. |
| 2026-06-18 | **Phase 1 (audit trail integrity) core completed.** New `recordAudit` (durable, retried, non-swallowing) + real FHIR `AuditEvent` mirror (`audit-event.ts`, off critical path via `after()`); clinical writes + break-glass overrides now dual-store. tsc + eslint clean; no DB migration. Residual: FHIR mirror for login/logout + `access_denied`, and the operational-mutation coverage sweep (promocode/invoice/payout). |
| 2026-06-18 | **Phase 2 (coded meds + allergies + interaction checking) core completed.** App-owned drug formulary (RxNorm/ATC + classes + CS schedule) + allergen catalog (category + cross-reactivity) + pure interaction engine; coded medication & allergy capture with NKA; drug–allergy/drug–drug/duplicate screening that blocks-with-acknowledgement at med-entry; controlled-substance ledger for scheduled drugs. tsc + eslint clean, engine scenario-tested; no DB migration. Residual: `MedicationRequest` split, structured dose quantity, formulary breadth. |
| 2026-06-18 | **Phase 3 (outcome measures as discrete coded Observations) core completed.** New `outcome-measures.ts` promotes each physio measure (Berg/TUG/pain/ROM…) to its own LOINC/UCUM-coded Observation with `derivedFrom`+`hasMember` parent linkage; `listPatientOutcomeMeasures` trend reader surfaced in the session workspace. Additive (existing analytics untouched), best-effort emission, no DB migration; builder scenario-verified. Care-report signing + notes-unification folded into Phase 6. |
| 2026-06-18 | **Phase 4 (validated assessment instruments) completed.** App-owned instrument catalog (Braden/Morse/MMSE/Berg/TUG/NPRS) with ranges + LOINC + risk bands; assessments now coded Observations with range-validated scores + `interpretation` bands (phantom Questionnaire removed); dual read preserves legacy QR history; forms + tables updated. tsc + eslint clean, scoring scenario-verified; no DB migration. Item-level capture deferred (total-score banding shipped). |
| 2026-06-18 | **Dead-code cleanup.** Removed unused exports: `ASSESSMENT_OPTIONS`, `COMMON_MEDICATIONS`, `COMMON_ALLERGENS` (view-helpers), `highestSeverity` (medication-safety), the catalog `severityToInterpretationCode` (superseded by inlined copy), and `NO_KNOWN_ALLERGY_CODING` (allergen-catalog). tsc clean. |
| 2026-06-18 | **Phase 5 (vitals completeness + interpretation) completed.** Added respiratory rate + height + auto-computed BMI; `interpretation[]` (L/N/H) persisted on every vital + BP components from nursing-ops thresholds (WHO cut-offs for BMI); new `VitalInput` shows at-entry Low/High warnings; recent-vitals table highlights abnormals; glucose duplication resolved by clarification (point-of-care 2339-0 vs profile 41653-7). tsc + eslint clean; no DB migration. |
| 2026-06-18 | **Phase 9 (cross-cutting hardening) core completed.** Vitest installed + 39 unit tests green (RBAC matrix + UI-flag derivation, route gate, drug/lab/assessment safety engines, catalogs, production-readiness); tenant-scope CI ratchet (`guard-tenant-scope.cjs`, baselined); production-readiness fail-fast at boot (mock malware scanner / missing secrets throw in prod, via `instrumentation.ts`); observability seam (`reportError`) + root `error.tsx` wired (CSP already Sentry-ready). tsc + eslint clean. Deferred: Playwright E2E, `@sentry/nextjs` SDK install (DSN/deploy decision). |
| 2026-06-18 | **Phase 8 (role depth + matrix enforcement) core completed.** UI permission flags now derive from the role matrix via `roleAllowsAction` (eliminating admin/finance UI-vs-server drift — verified per role); FHIR `EpisodeOfCare` discharge/closure (`episodes.ts` + `closeCareEpisodeAction` + care-plan panel, matrix-gated `episode.close` = licensed physician); "My Access" page renders effective permissions live from the matrix. tsc + eslint clean; no DB migration. Deferred: doctor rounds/order-sets workspace, nursing-report draft→sign (need dedicated UIs). |
| 2026-06-18 | **Phase 7 (labs: discrete results + order→result loop) core completed + roles wired live per the matrix.** App-owned analyte catalog (LOINC + UCUM + reference ranges); discrete result Observations with referenceRange + interpretation flags, linked via `result[]`/`basedOn`; every lab order spawns a `lab-result-review` Task; coded result-entry form + flagged results table. Separately: `CLINICAL_READ_ROLES` gives compliance_officer global chart read (no writes), and viewer/hospital_partner_admin get a role-aware landing — all aligned to `policy/ehr-matrix.ts`. tsc + eslint clean, flagging + route-access scenario-verified; no DB migration. `presentedForm` deferred. |
| 2026-06-18 | **Phase 6 (clinical note signing + problem maturity) core completed.** New reusable `provenance.ts`; `signClinicalNote` writes legal `Composition.attester` + immutable `Provenance`; amendments `replaces` predecessor; conditions gain selectable verification (confirmed/provisional/differential/unconfirmed) + SNOMED severity + body-site + auto restricted-tier tagging (F-codes → psy, HIV/STI → r); care-reports write an authorship Provenance (folded Phase 3). tsc + eslint clean; no DB migration. Deferred (need a notes-management UI): trainee co-sign, SOAP sections, full narrative unification. |
