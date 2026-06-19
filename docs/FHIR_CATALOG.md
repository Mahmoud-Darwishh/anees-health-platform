# FHIR Resource Catalog — Anees Health Platform (Medplum)

> **Audience:** engineers, hospital-integration partners, security auditors.
> **Last refresh:** 2026-06-18.
> **Source of truth:** `src/lib/medplum/*.ts` (29 files; ~22 own a FHIR resource, the rest are client/config/constants/extensions/terminology helpers). This doc summarises what each module does in FHIR terms; **the code is authoritative — where this doc and the code disagree, the code wins and this doc is the bug.**
>
> **⚠️ Accuracy pass (2026-06-18):** an internal audit found several sections below described an *intended* design rather than the *shipped* code. Those sections now carry a **Status** line using the legend here. The full gap register and the plan to close each gap live in **[EHR_AUDIT.md](EHR_AUDIT.md)**.
>
> **Status legend:** ✅ Implemented as described · 🟡 Partial — implemented but thinner than the prose implies · 🗺️ Roadmap — described here but **not in the code yet**.

Medplum is our **single source of truth for clinical data**. We store every FHIR resource on a self-hosted Medplum instance and mirror identifiers / status into Postgres only where operational queries need them (visits, payouts, finance). This document walks the resources we use, one by one.

---

## Reading guide

For each resource you'll see:

- **Module** — the `src/lib/medplum/*.ts` file that owns it.
- **Sync direction** — does data flow Postgres → Medplum, Medplum → Postgres, or both?
- **Required fields** — the minimum we always set on create.
- **Identifiers** — the system URLs we use to round-trip with Postgres.
- **Egyptian / Anees extensions** — local extensions on top of base FHIR.
- **RBAC notes** — who can read or write, plus restricted-tier handling.
- **Example JSON** — a compact, realistic snapshot.

### Conventions used across all resources

- **Identifier code systems** live in `src/lib/medplum/constants.ts` under `MEDPLUM_CODE_SYSTEMS`. They start with `https://anees.health/fhir/identifier/`.
- **Custom code systems** (programs, encounter types, document categories) start with `https://anees.health/fhir/CodeSystem/` or `https://anees.health/fhir/`.
- **StructureDefinition extensions** live in `src/lib/medplum/fhir-extensions.ts` under `EgyptianExtensions`. Base URL: `https://anees.health/fhir/StructureDefinition/`.
- **Restricted tiers** (mental health, HIV, reproductive health, domestic violence) are flagged by `meta.security` codings (`r`, `v`, `psy`, `eth`) or clinical-code hints. See `isRestrictedTierSecurityCoding` / `isRestrictedTierClinicalCoding` in `constants.ts`. Restricted resources require explicit consent or a `DestructiveApprovalToken` to view.
- **Audit** ✅ — clinical writes and break-glass overrides go through `recordAudit` (`@/lib/utils/audit`), which writes a durable Postgres `AuditLog` row (retried, non-swallowing) **and** mirrors a FHIR `AuditEvent` to Medplum off the critical path (`after()`). See resource #21 and [EHR_AUDIT.md](EHR_AUDIT.md) Phase 1. (Login/logout + `access_denied` remain Postgres-only for now.)

---

## 1. Patient

**Module:** `src/lib/medplum/patients.ts` · **Sync:** Postgres ↔ Medplum (bidirectional, Postgres-authoritative for demographics)

**Required fields**

| FHIR field | Source | Notes |
|---|---|---|
| `identifier[].system` = `https://anees.health/fhir/identifier/patient-code` | `Patient.code` (Postgres) | Stable, human-shareable case ID. |
| `name[].family / name[].given[]` | `Patient.firstName / lastName` | Both EN + AR variants when present. |
| `gender` | `Patient.gender` | `male | female | other | unknown`. |
| `birthDate` | `Patient.birthDate` | ISO date. |
| `telecom[]` | `Patient.phone / Patient.caregiverPhone` | `phone | sms | email`, `home | mobile`. |
| `address[]` | `Patient.address*` | Always carry `governorate`, `district` extensions. |

**Egyptian / Anees extensions**

- `EgyptianExtensions.nationalId` — Egyptian national ID number.
- `EgyptianExtensions.governorate`, `district` — bilingual address components.
- `EgyptianExtensions.addressMapUrl` — Google Maps link (when set during booking).
- `EgyptianExtensions.caregiverRelationshipDetail` — relationship + decision-making authority.
- `EgyptianExtensions.careProgram` — `sanad | haraka | wai | amal` (internal program tags).

**RBAC**

- Read: `CLINICAL_ROLES`, plus the patient themself and any consented caregiver (via `Consent`).
- Write: `CLINICAL_WRITE_ROLES` + `admin` + `superadmin`.
- Restricted-tier patients (mental health flag, DV flag) require `Consent` scope or `DestructiveApprovalToken` for access.

**Example**
```json
{
  "resourceType": "Patient",
  "identifier": [
    { "system": "https://anees.health/fhir/identifier/patient-code", "value": "ANS-001234" }
  ],
  "name": [{ "family": "El-Masry", "given": ["Salma"] }],
  "gender": "female",
  "birthDate": "1942-03-11",
  "telecom": [{ "system": "phone", "value": "+201001234567", "use": "mobile" }],
  "extension": [
    { "url": "https://anees.health/fhir/StructureDefinition/national-id", "valueString": "29203111400123" },
    { "url": "https://anees.health/fhir/StructureDefinition/governorate", "valueString": "Cairo" },
    { "url": "https://anees.health/fhir/StructureDefinition/care-program",
      "valueCoding": { "system": "https://anees.health/fhir/CodeSystem/care-program", "code": "sanad" } }
  ]
}
```

---

## 2. Practitioner

**Module:** `src/lib/medplum/practitioners.ts` · **Sync:** Postgres → Medplum (lazy, on first clinical write)

**Required fields**

- `identifier[]` with `system = https://anees.health/fhir/identifier/staff-id` → `Staff.id`.
- `name[]` and `telecom[]` from `Staff`.
- `qualification[]` carrying syndicate license type + number + expiry (mirrors `Staff.licenseType / Number / Expiry / IssuingBody`).
- `meta.tag[]` with `staff-role` system → `Staff.role` for downstream filtering.

**Caching:** `ensureCachedMedplumPractitionerForStaff(staff)` looks up by identifier first, creates if missing, caches the FHIR ID on `Staff.medplumPractitionerId`.

**RBAC:** Read for any authenticated staff; write only via admin onboarding or first-write-creates-it flow. Never created from public-facing surfaces.

---

## 3. Encounter

**Module:** `src/lib/medplum/encounters.ts` · **Sync:** Postgres → Medplum (the Postgres `Visit` is authoritative)

**Required fields**

- `status` mapped from `Visit.state` (state-machine — see `src/lib/medplum/encounters.ts`):
  - `scheduled` → `planned`
  - `acknowledged | en_route` → `arrived`
  - `checked_in | documenting` → `in-progress`
  - `checked_out | signed | completed` → `finished`
  - `cancelled_*` → `cancelled`
- `class` — `home health` (`http://terminology.hl7.org/CodeSystem/v3-ActCode`).
- `subject` → Patient reference.
- `participant[].individual` → Practitioner reference for primary clinician (+ `VisitParticipant` rows for the rest).
- `period.start / end`.
- `serviceType` — coded against `https://anees.health/fhir/encounter-type`.

**Anees extras:** geofence breadcrumb pings are stored as `VisitLocationPing` rows in Postgres (not FHIR); they roll up into the audit log for the encounter.

---

## 4. Appointment

**Module:** `src/lib/medplum/appointments.ts` · **Sync:** Postgres → Medplum

Lightweight wrapper used for scheduling proposals before a `Visit` is confirmed. Carries `participant[].actor` (Patient + Practitioner) and `start / end`. Confirmed appointments materialise into a `Visit` (Postgres) and an `Encounter` (Medplum).

---

## 5. Observation (Vitals)

**Module:** `src/lib/medplum/observations.ts` · **Sync:** write-through to Medplum, query Medplum on read

**Status:** ✅ Complete (Phase 5, 2026-06-18).

- `status` — `final` (or `amended` after edit).
- `category[]` — `vital-signs`.
- `code` — LOINC: BP panel `85354-9` (systolic `8480-6` / diastolic `8462-4`), HR `8867-4`, **respiratory rate `9279-1`**, body temp `8310-5`, glucose `2339-0`, body weight `29463-7`, **body height `8302-2`**, **BMI `39156-5` (auto-computed from weight + height)**, SpO2 `59408-5`, pain `72514-3`.
- `valueQuantity { value, unit, system: UCUM, code }`. BP uses `component[]` (systolic + diastolic).
- **`interpretation[]`** is now written on every threshold-bearing vital (and the BP components) — `L` / `N` / `H` (v3 ObservationInterpretation) from the nursing-ops thresholds; BMI uses WHO cut-offs. The abnormal flag lives on the Observation itself, not only in the side escalation.
- `subject`, `encounter`, `effectiveDateTime`, `performer[]` → Practitioner.

**Live + server alerting:** the charting form shows an **at-entry** Low/High warning as the clinician types (thresholds passed from `nursing-ops-policy`), and `recordVitalsAction` still raises a debounced escalation `Communication` on a breach (now incl. respiratory rate) — see resources #18/#19.

**Glucose — two purposes by design:** the vitals glucose (LOINC `2339-0`) is a point-of-care reading; the dedicated **Blood Glucose Profile** (LOINC `41653-7`, with timing/meal context) is the structured monitoring feature. The vitals form links to it.

**Example (heart rate)**
```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs" }] }],
  "code": { "coding": [{ "system": "http://loinc.org", "code": "8867-4", "display": "Heart rate" }] },
  "subject": { "reference": "Patient/abc123" },
  "encounter": { "reference": "Encounter/visit789" },
  "effectiveDateTime": "2026-06-05T09:14:00+02:00",
  "valueQuantity": { "value": 78, "unit": "/min", "system": "http://unitsofmeasure.org", "code": "/min" },
  "performer": [{ "reference": "Practitioner/menna" }]
}
```

---

## 6. Observation (Assessments) — validated, scored, risk-banded

**Module:** `src/lib/medplum/assessments.ts` + `src/features/ehr/catalogs/assessment-instruments.ts` · **Sync:** write-through

**Status:** ✅ Validated instruments (Phase 4, 2026-06-18). The phantom `Questionnaire/anees-assessment` is gone.

Assessments are now stored as **coded `Observation`s** (category `survey` + an Anees `assessment` category for precise search), driven by an app-owned instrument catalog (Braden, Morse Fall Scale, MMSE, Berg, TUG, NPRS):

- `code` — Anees instrument code **+ LOINC** where one exists (Braden 38228-2, MMSE 72106-8, NPRS 72514-3).
- `valueQuantity` — the raw score with a UCUM unit; **range-validated** server-side against the instrument (e.g. Berg 0–56) — an out-of-range score is rejected.
- `interpretation[]` — the computed **risk band** (e.g. "High fall risk") as a FHIR v3 ObservationInterpretation code (`N / A / AA`) + an Anees risk coding.
- A free-text fallback remains for non-instrument notes (no band).

`listPatientAssessments` reads the new coded Observations **and** legacy `QuestionnaireResponse`s (so history still surfaces), merged newest-first. The risk band shows in the admin Measurements table and the physio session workspace.

---

## 7. Observation (Care reports) + discrete outcome-measure Observations

**Module:** `src/lib/medplum/care-reports.ts` + `src/lib/medplum/outcome-measures.ts` · **Sync:** write-through

**Status:** ✅ Outcome measures promoted to discrete coded Observations (Phase 3, 2026-06-18). 🟡 Report signing + notes-unification folded into Phase 6.

The physio/nursing session report is still written as a parent `Observation` (`category = survey`) carrying the narrative + components (so the existing physio analytics keep working). **In addition**, each structured measure (pain before/after, Berg, Tinetti, Ashworth, TUG, knee ROM, SLR, Schober, functional reach) is now promoted to its **own discrete `Observation`** via `outcome-measures.ts`:

- `code` — an Anees outcome code **+ a LOINC** secondary coding where one exists (e.g. pain → `72514-3`).
- `valueQuantity` with a **UCUM** unit (`deg`, `s`, `cm`, `{score}`).
- dual `category` (`survey | activity | exam` + an Anees `outcome-measure` category for precise search).
- `derivedFrom` → the parent report; the parent gains a `hasMember` reference to the children (the wrapper *references* the measures).

A standards-based consumer — or our `listPatientOutcomeMeasures` trend reader, surfaced in the physio session workspace — can now pull "every Berg score over time" with one search. Emission is best-effort: a failure never loses the (already-saved) report.

**Phase 6 update:** each report now writes an immutable **`Provenance`** authorship attestation on create. A full draft→sign lifecycle and narrative unification into a `Composition` remain deferred (need a notes-management UI) — see [EHR_AUDIT.md](EHR_AUDIT.md) Phase 6.

---

## 8. Condition

**Module:** `src/lib/medplum/conditions.ts` · **Sync:** write-through

**Status:** ✅ Matured (Phase 6, 2026-06-18).

- `code` — ICD-10 (from the Postgres `icd10_codes` table).
- `clinicalStatus` — `active | resolved | inactive | remission` (lifecycle edit supported).
- `verificationStatus` — **`confirmed | provisional | differential | unconfirmed`** (clinician-selectable; defaults to confirmed).
- `severity` — SNOMED-coded `mild | moderate | severe` (optional).
- `bodySite` — free-text site (optional).
- `subject`, `recordedDate`, `recorder` (Practitioner), `category[]` (`problem-list-item` + a `physical-therapy` tag for PT diagnoses).

**Restricted tier (auto):** sensitive diagnoses are **auto-tagged** into a restricted security tier on create — ICD-10 F-codes → `psy` (behavioural health); HIV (B20–B24, Z21) and STIs (A50–A64) → `r`; plus a label-keyword fallback. The existing restricted-tier masking then applies automatically.

---

## 9. AllergyIntolerance

**Module:** `src/lib/medplum/allergies.ts` · **Sync:** write-through

**Status:** ✅ Coded + categorised (Phase 2, 2026-06-18).

- `clinicalStatus` — `active | inactive | resolved`; `verificationStatus` defaults to `unconfirmed` (`confirmed` for the NKA record).
- `category` — **`food | medication | environment | biologic`** (from the allergen catalog `@/features/ehr/catalogs/allergen-catalog`, or clinician-selected for free text).
- `code` — **SNOMED** (where known) + an **Anees allergen code** that links back to the catalog; `text` fallback for free-text allergens.
- `criticality` — derived from severity (`severe → high`, any other severity → `low`, none → `unable-to-assess`).
- `reaction[]` — captures the **manifestation** (e.g. *rash*, *anaphylaxis*, *angioedema*) + severity.
- **"No Known Allergies"** is recordable as an affirmative SNOMED-coded (716186003) record — clinically distinct from an empty (unasked) list.
- `patient`, `recorder`.

Coded allergens carry cross-reactivity classes (e.g. penicillin → beta-lactam) that drive **drug–allergy screening** at medication entry (see #10). Free-text allergens carry a category but no cross-reactivity data.

**Why allergies live in the patient banner, not a tab:** see [EHR_ROLE_MATRIX.md §12](EHR_ROLE_MATRIX.md). They are safety-critical and rendered everywhere a clinician sees the patient.

---

## 10. MedicationStatement (coded + safety-screened)

**Module:** `src/lib/medplum/medications.ts` · **Sync:** write-through

**Status:** ✅ Coded + safety-screened (Phase 2, 2026-06-18). 🟡 Resource type unchanged by design (see note).

What is written today:
- `status` — `active | on-hold | completed | stopped | entered-in-error | …`.
- `medicationCodeableConcept` — **RxNorm + ATC coding** from the app-owned formulary (`@/features/ehr/catalogs/drug-formulary`), with a `text` fallback. Free-text drugs not in the formulary are still allowed but save uncoded and are not screened.
- `subject`, `dateAsserted`, `informationSource` (Practitioner); `effectivePeriod`; `dosage[0]` text + route + timing.

**Safety screening:** on create, coded drugs are screened by `@/lib/ehr/medication-safety` against the patient's active medications + allergies — **drug–allergy cross-reactivity, drug–drug interactions, and duplicate therapy**. Warnings/contraindications **block the save** until the clinician ticks an acknowledgement.

**Controlled substances:** a scheduled drug (CII–CV, flagged in the formulary) also writes a Postgres `ControlledSubstanceLedger` row (`actionType = prescribed`) — the EDA audit trail — audited via `recordAudit`.

**Resource-type note (deliberate):** chart entries remain `MedicationStatement`, not `MedicationRequest`. This preserves existing data + `MedicationAdministration` linkage. Splitting prescriptions (`MedicationRequest`) from reconciliation (`MedicationStatement`) needs dual-read + MAR re-linking and is tracked as its own follow-on in [EHR_AUDIT.md](EHR_AUDIT.md) Phase 2 — not bundled with the safety work.

---

## 11. MedicationAdministration

**Module:** `src/lib/medplum/medication-administrations.ts` · **Sync:** write-through

Records doses actually given (vs. ordered). Required: `status`, `medicationCodeableConcept`, `subject`, `effectiveDateTime`, `performer[]` (Practitioner), `dosage.dose`. For EDA controlled substances, a matching `ControlledSubstanceLedger` row is required.

---

## 12. CarePlan

**Module:** `src/lib/medplum/care-plans.ts` · **Sync:** write-through (clinical), with operational `CarePlan` row in Postgres for finance

- `status` — `draft | active | completed | revoked`.
- `intent` — `plan` or `order`.
- `category` — Anees `care-program` code (`sanad | haraka | wai | amal`).
- `subject`, `period`, `author` (Practitioner).
- `activity[]` — each linked to a `Task` (#18) for execution tracking.
- `goal[]` — references to `Goal` resources (#17).

Note: the Postgres `CarePlan` table is for operational/finance tracking (cost, visit count). The Medplum `CarePlan` is the clinical record. Both exist; both link to the same patient.

**EpisodeOfCare (Phase 8):** `src/lib/medplum/episodes.ts` adds the care-episode bookend — **discharge / closure**. Closing an episode (`closeCareEpisode`, gated by `episode.close` = care-plan **sign** → licensed physician) sets `status = finished`, stamps `period.end`, and records a clinician **outcome summary** (an Anees extension). Surfaced as the "Care episode & discharge" panel in the Care-Plan tab.

---

## 13. CareTeam

**Module:** `src/lib/medplum/care-teams.ts` · **Sync:** write-through

- `status`, `subject` (Patient), `period`.
- `participant[].member` → Practitioner refs.
- `category[]` — Anees `care-team-category` code system.

**Drives case scoping.** `getStaffUser(['physiotherapist'])` resolves the practitioner's CareTeams and limits patient reads to that set. See `src/features/ehr/clinician-physio/data.ts`.

---

## 14. Consent

**Module:** `src/lib/medplum/consents.ts` + `consent-policy.ts` · **Sync:** write-through

The single most important resource for the **caregiver portal**. A patient's caregiver has *no* default access — every scope is granted via a `Consent`.

- `status` — `active | inactive`.
- `scope` — `patient-privacy` (typical) or `treatment`.
- `category[]` — Anees `portal-scope` extension: `profile | visits | vitals | notes | tasks | files | care-team | messaging`.
- `patient`, `dateTime`, `performer` (the patient or their guardian), `actor` (the caregiver Practitioner / RelatedPerson).
- `policyRule.coding` — internal policy code.

`consent-policy.ts` resolves an authenticated caregiver session to the set of scopes they currently have. The patient portal queries this for every render.

---

## 15. DocumentReference + Binary

**Module:** `src/lib/medplum/documents.ts` + `src/lib/storage/r2-medical.ts` · **Sync:** write-through

This is the hybrid storage path:

1. The file's bytes go to **Cloudflare R2** under a deterministic key: `ehr/YYYY/MM/{uuid}-{sanitized-name}`.
2. A FHIR `Binary` resource carries the R2 URL as its attachment.
3. A FHIR `DocumentReference` wraps the `Binary` with clinical metadata (type, category, language, signed-on, author, encounter).

**Required fields on `DocumentReference`:** `status` (`current`), `type` (LOINC), `category[]` (Anees `document-category`), `subject`, `date`, `author[]`, `content[].attachment` → Binary ref, `context.encounter`.

**Malware scan:** new uploads land with a `BinaryMalwareState = pending` extension. The background job at `/api/internal/ehr/documents/scan` calls `scanMedicalDocument()` and flips to `clean | infected | scan_failed`. Files that have never reached `clean` cannot be streamed to a user.

**Authenticated streaming** goes through `/api/ehr/documents/[documentId]` — RBAC + case-scope + consent enforced, then either proxies the bytes or issues a short-lived (≤10 min) signed R2 URL.

---

## 16. ServiceRequest + DiagnosticReport (Labs)

**Module:** `src/lib/medplum/labs.ts` · **Sync:** write-through

**Status:** ✅ Discrete coded results + order→result loop (Phase 7, 2026-06-18). 🟡 `presentedForm` PDF deferred (use the Documents feature).

- Lab orders are `ServiceRequest` (`status = active`, `intent = order`); the title is validated against the terminology service.
- **Discrete results** are now `Observation`s (category `laboratory`) via `createLabResultObservation`: **LOINC-coded** from the app-owned analyte catalog (`catalogs/lab-analytes.ts`), `valueQuantity` + UCUM unit, a **`referenceRange`**, and a computed **`interpretation`** (L/N/H abnormal flag). They link to the `DiagnosticReport` via `result[]` and to the order via `basedOn`.
- **Order→result loop:** creating a lab order also spawns a `lab-result-review` `Task` owned by the ordering clinician, so an unresulted order can't silently fall through.
- The `DiagnosticReport` still carries the narrative title + conclusion; the discrete values surface (with flags) alongside it in the Labs tab.

**Deferred:** `presentedForm` (the result PDF) — already coverable via the Documents feature (#15); native `presentedForm` wiring is a small follow-up.

---

## 17. Goal

**Module:** `src/lib/medplum/goals.ts` 🆕 · **Sync:** Postgres ↔ Medplum (bidirectional, identifier-keyed)

**Status:** 🟡 Partial. Round-trips between Postgres `PatientGoal` (operational view used by the physio workspace) and FHIR `Goal` (the clinical record).

- `lifecycleStatus` — `active | completed | cancelled` (mapped from `PatientGoal.status`: `in_progress → active`, `met → completed`, `discontinued → cancelled`).
- `achievementStatus` — `in-progress | achieved | not-achieved`.
- `description.text` — the SMART goal narrative.
- `subject`, `expressedBy` (Practitioner), `startDate`.
- `target[]` — `measure` is **free text** (`measurementUnit`), `detailString` (not a coded `detailQuantity`), `dueDate`. **Baseline / current values are serialized into a free-text `note` string and parsed back out with a regex** — brittle, not structured. Coded target quantities are a roadmap item.
- `identifier[]` with `system = https://anees.health/fhir/identifier/patient-goal-id` → `PatientGoal.id`. Postgres `PatientGoal.fhirGoalId` holds the Medplum resource ID.

**Why bidirectional:** the physio workspace edits goals heavily during sessions (mobile-first UX). Postgres is faster for those edits; Medplum is the regulatory record. Sync runs on every commit.

---

## 18. Task

**Module:** `src/lib/medplum/tasks.ts` · **Sync:** write-through

- `status` — `requested | accepted | in-progress | completed | cancelled | rejected`.
- `intent` — `order`.
- `code` — Anees `task-type` system (e.g. `handoff`, `follow-up`, `escalation`, `lab-result-review`).
- `for` → Patient.
- `owner` → Practitioner or CareTeam.
- `requester`.
- `executionPeriod.start / end`.

Tasks power the clinician's work queue, vitals-threshold escalations, lab-result review, and handoffs between disciplines.

---

## 19. Communication

**Module:** `src/lib/medplum/communications.ts` · **Sync:** write-through

- `status` — `in-progress | completed`.
- `category[]` — Anees `communication-type` (`care-update`, `handoff`, `secure-message`).
- `subject` (Patient), `sender` + `recipient[]` (Practitioner or RelatedPerson).
- `sent`, `received`.
- `payload[].contentString`.

Used for staff↔staff handoffs and staff↔patient secure messages. Patient-facing copies surface in the patient portal under the **Notes** tab when the caregiver has the `notes` consent scope.

---

## 20. Composition (Clinical notes) + Provenance

**Module:** `src/lib/medplum/clinical-notes.ts` + `src/lib/medplum/provenance.ts` · **Sync:** write-through

The clinical note. Draft → sign workflow with optimistic concurrency (`If-Match` on the version id).

**Status:** ✅ Legally attested signing (Phase 6, 2026-06-18). 🟡 Structured SOAP sections + trainee co-sign deferred (no notes-management UI yet).

On **sign**, the note gets:
- `status = final`, `date`, the `clinical-note-signed-at` extension;
- a FHIR **`Composition.attester`** (`mode = legal`, `party`, `time`) — a standards-grade attestation of who signed and when;
- an immutable **`Provenance`** record (target = the Composition; agents = legal + author) via `provenance.ts`.

**Amendments** create a **new** Composition that `relatesTo` (`replaces`) its predecessor — the prior note is never mutated (immutable history); re-signing a `final` note is a no-op.

- `status` — `preliminary` (draft) → `final` (signed) → `amended`.
- `type`, `subject`, `date`, `author[]`, **`attester[]`**, **`relatesTo[]`**, `encounter`.
- `section[]` — currently one narrative section (structured SOAP deferred).
- Anees extensions: `clinical-note-text`, `clinical-note-discipline`, `clinical-note-signed-at`, `clinical-note-amends`.

License gating: the calling action checks `canSignClinical` before moving a note to `final`.

**Deferred (tracked, [EHR_AUDIT.md](EHR_AUDIT.md) Phase 6):** structured SOAP sections, trainee **co-sign/countersign**, and full narrative unification — all need a notes-management UI that doesn't exist yet.

---

## 21. AuditEvent (FHIR) + AuditLog (Postgres) — dual-store

**Module:** `src/lib/medplum/audit-event.ts` (FHIR) + `src/lib/utils/audit.ts` (Postgres + orchestration) · **Sync:** write-only

**Status:** ✅ Implemented (Phase 1, 2026-06-18) for clinical writes + break-glass overrides; 🟡 not yet extended to login/logout and `access_denied`.

`recordAudit` (in `@/lib/utils/audit`) is the canonical entry point. It:

1. Writes the durable Postgres `AuditLog` row, **retried up to 3× and never silently swallowed** (a persistent failure logs at ERROR with the marker `AUDIT_WRITE_FAILED`; for `critical` actions — access grants, break-glass — it **throws** so the action is denied rather than left un-audited).
2. Mirrors a spec-compliant FHIR **`AuditEvent`** (R4) to Medplum **off the request's critical path** via `after()`, so a Medplum outage never blocks care nor loses the already-persisted Postgres record. FHIR-mirror failures log with the marker `AUDIT_FHIR_MIRROR_FAILED`.

`writeMedplumAuditMirror` (clinical writes) and the restricted-access / break-glass actions both route through `recordAudit`, so both halves are written for those paths.

**FHIR `AuditEvent` shape (no PHI):** `type` (`rest`, or DICOM `110114` for auth), `subtype` (Anees `audit-action` code), `action` (C/R/U/D/E), `recorded`, `outcome` (`0` success / `4` minor failure), `agent[]` (`who` = Practitioner ref or staff identifier, `requestor: true`, role), `source.observer` = "Anees Health EHR", `entity[]` (the touched resource + an optional `Patient` entity).

**Postgres `AuditLog` row carries:** `tableName`, `recordId`, `action` (`create / read / update / delete / export / override / access_denied / login / logout`), `changedBy`, `changedFields`, optional `newData` / `previousData`.

**Residual (tracked in [EHR_AUDIT.md](EHR_AUDIT.md) Phase 1):** login/logout (`writeLoginAudit` in `src/auth.ts`) and `access_denied` (`enforce.ts`, best-effort) are still Postgres-only; the operational-mutation coverage sweep (promocode redemption, invoice, payout) is ongoing — patient demographics edits are already covered.

---

## Resources not currently used

The following base FHIR resources are **not** in active use and should not be added without an architectural review:

| Resource | Why we skip it today | When we'd add it |
|---|---|---|
| `Coverage` (FHIR) | We model insurance in Postgres (`Coverage` table) for finance speed. | When we wire live claim adjudication to a payer. |
| `Claim` / `ClaimResponse` (FHIR) | Same — Postgres `Claim` + `ClaimLineItem` for now. | Same trigger. |
| `Immunization` | Out of scope for home care. | When we add primary-care pediatrics. |
| `Procedure` | We embed procedure info in `Encounter` + `Composition` today. | When we need detailed surgical reporting. |
| `RelatedPerson` | Caregivers are modelled as `Practitioner` + `Consent` for simplicity. | When caregivers need their own scoped portal accounts. |
| `Questionnaire` / item-level `QuestionnaireResponse` | Assessments now store **coded `Observation`s** with validated total scores + risk bands (see #6), not item-level questionnaires. Legacy `QuestionnaireResponse`s are still read for history. | When item-level capture is needed (e.g. patient-reported outcome surveys at scale). |

---

## Egyptian context extensions — quick reference

All under `https://anees.health/fhir/StructureDefinition/`:

| Extension | Applies to | Value type |
|---|---|---|
| `national-id` | Patient, Practitioner | string (14-digit Egyptian NID) |
| `governorate` | Patient address | string (EN/AR) |
| `district` | Patient address | string (EN/AR) |
| `address-map-url` | Patient address | uri (Google Maps) |
| `caregiver-relationship-detail` | Patient | string |
| `care-program` | Patient, CarePlan | Coding (`sanad | haraka | wai | amal`) |
| `clinical-note-text` | Composition | string |
| `clinical-note-discipline` | Composition | code (`nursing | physiotherapy | medical`) |
| `clinical-note-signed-at` | Composition | dateTime |
| `clinical-note-amends` | Composition | reference (prior Composition) |

Caregiver scope flags (consent extension): `portal-scope` system maps to `profile | visits | vitals | notes | tasks | files | care-team | messaging`.

---

## How to add a new FHIR resource

1. Add the module under `src/lib/medplum/<resource>.ts`.
2. Reuse `getMedplumClient()` from `client.ts`.
3. Define constants in `constants.ts` (code systems + identifiers).
4. Define extensions in `fhir-extensions.ts` if Egyptian context is needed.
5. Always call `writeMedplumAuditMirror` on every create / update / delete.
6. Map the resource to an existing Postgres identifier when one exists.
7. Add a section to **this** document.
8. Add the resource to the matrix in [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) §3 so RBAC stays explicit.

---

## See also

- [EHR_AUDIT.md](EHR_AUDIT.md) — the gap register + phased remediation plan behind every 🟡 / 🗺️ Status line above.
- [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — engineering overview, route map, conventions.
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) — how PHI moves at the wire, RBAC implementation, signed URLs.
- [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) — how this catalog maps to HIPAA §164.312 technical safeguards.
- [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) — which role can do what on which resource.
