# FHIR Resource Catalog — Anees Health Platform (Medplum)

> **Audience:** engineers, hospital-integration partners, security auditors.
> **Last refresh:** 2026-06-05.
> **Source of truth:** `src/lib/medplum/*.ts` (24 modules). This doc summarises what each module does in FHIR terms; the code is authoritative.

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
- **Audit** — every clinical write goes through `writeMedplumAuditMirror` (in `src/lib/medplum/audit.ts`) which creates both a FHIR `AuditEvent` and a Postgres `AuditLog` row.

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

**Required fields**

- `status` — `final` (or `amended` after edit).
- `category[]` — `vital-signs` (`http://terminology.hl7.org/CodeSystem/observation-category`).
- `code` — LOINC (e.g. `85354-9` for BP panel, `8867-4` heart rate, `8310-5` body temp, `59408-5` SpO2, `2339-0` glucose).
- `subject` → Patient.
- `encounter` → Encounter when measured during a visit.
- `effectiveDateTime`.
- `valueQuantity { value, unit, system: "http://unitsofmeasure.org", code }`. BP uses `component[]` (systolic + diastolic).
- `performer[]` → Practitioner.

**Thresholds** are evaluated server-side in `src/lib/ehr/nursing-alerts.ts` against `src/lib/config/nursing-ops-policy.ts`. Out-of-range vitals raise a `Task` for the on-call doctor (see resource #18).

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

## 6. Observation (Assessments)

**Module:** `src/lib/medplum/assessments.ts` · **Sync:** write-through

Same `Observation` shape, but `category = survey` and `code` is an assessment scale (Braden, MMSE, Falls Risk, Numeric Pain Scale). `valueInteger` or `valueQuantity` for the score; `interpretation[]` for the bucketed label. Used by physio + nurse during sessions.

---

## 7. Observation / Composition (Care reports)

**Module:** `src/lib/medplum/care-reports.ts` · **Sync:** write-through

Long-form nursing / physio session reports written as structured `Observation` components (or as `Composition` when full-document signing is required). Always tied to an `Encounter`. The narrative portion is escaped HTML; the structured components carry coded findings.

---

## 8. Condition

**Module:** `src/lib/medplum/conditions.ts` · **Sync:** write-through

- `code` — ICD-10 or SNOMED CT (systems in `MEDPLUM_CODE_SYSTEMS.icd10 / snomed`).
- `clinicalStatus` — `active | resolved | inactive`.
- `verificationStatus` — `confirmed | provisional`.
- `subject`, `recordedDate`, `recorder` (Practitioner).
- `category[]` — `problem-list-item` or `encounter-diagnosis`.

Mental-health / behavioural conditions automatically attract `meta.security = psy` and the restricted-tier gate.

---

## 9. AllergyIntolerance

**Module:** `src/lib/medplum/allergies.ts` · **Sync:** write-through

- `clinicalStatus` — `active | resolved`.
- `type` — `allergy | intolerance`.
- `category[]` — `food | medication | environment | biologic`.
- `criticality` — `low | high | unable-to-assess`.
- `code` — RxNorm for meds, SNOMED for everything else.
- `patient`, `recorder`.
- `reaction[].manifestation[]` + `severity`.

**Why allergies live in the patient banner, not a tab:** see [EHR_ROLE_MATRIX.md §12](EHR_ROLE_MATRIX.md). They are safety-critical and rendered everywhere a clinician sees the patient.

---

## 10. MedicationRequest

**Module:** `src/lib/medplum/medications.ts` · **Sync:** write-through

- `status` — `active | on-hold | cancelled | completed | stopped`.
- `intent` — `order` (default) or `plan` for proposals.
- `medicationCodeableConcept` — RxNorm.
- `subject`, `authoredOn`, `requester` (Practitioner).
- `dosageInstruction[]` — text + timing + dose.
- For controlled substances (EDA schedule), the platform also writes a `ControlledSubstanceLedger` row in Postgres at the same time. Both must succeed or neither does.

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

Lab orders are `ServiceRequest` (status = `active | completed`, code = LOINC). Lab results are `DiagnosticReport` (status, code, subject, effectiveDateTime, conclusion, `result[]` → `Observation` refs). The PDF lives in R2 + `Binary`, referenced from `DiagnosticReport.presentedForm`.

---

## 17. Goal

**Module:** `src/lib/medplum/goals.ts` 🆕 · **Sync:** Postgres ↔ Medplum (bidirectional, identifier-keyed)

The latest addition. Round-trips between Postgres `PatientGoal` (operational view used by the physio workspace) and FHIR `Goal` (the clinical record).

- `lifecycleStatus` — `proposed | active | completed | cancelled` (mapped from `PatientGoal.status`: `in_progress → active`, `met → completed`, `discontinued → cancelled`).
- `description.text` — the SMART goal narrative.
- `subject`, `expressedBy` (Practitioner), `startDate`.
- `target[]` — `measure` (LOINC code for the metric), `detailQuantity`, `dueDate`.
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

## 20. Composition (Clinical notes)

**Module:** `src/lib/medplum/clinical-notes.ts` · **Sync:** write-through

The signed clinical note. **Immutable after `status = final`.** Amendments create a new `Composition` linked via the `clinical-note-amends` extension.

- `status` — `preliminary` (draft) → `final` (signed) → `amended`.
- `type` — Anees `clinical-note-type` code.
- `subject`, `date`, `author[]`, `encounter`.
- `section[]` — structured sections; each holds narrative + entry refs (e.g. → Observations, Conditions).
- Anees extensions: `clinical-note-text`, `clinical-note-discipline`, `clinical-note-signed-at`, `clinical-note-amends`.

License gating: only a clinician with a valid syndicate license can move a note from `preliminary` to `final` (`canSignClinical` check before the write).

---

## 21. AuditEvent (via `audit.ts`)

**Module:** `src/lib/medplum/audit.ts` · **Sync:** write-only

Every clinical write writes both: (1) a FHIR `AuditEvent` on Medplum, and (2) a Postgres `AuditLog` row. The Postgres mirror exists because it is faster to query for compliance dashboards and survives Medplum downtime.

- `type` — `rest` for API ops, `application activity` for server-side mutations.
- `action` — `C | R | U | D | E` mapped from our `AuditAction` enum (`create / read / update / delete / export / override / access_denied / login / logout`).
- `recorded`, `outcome` (`0 = success`, `4 = minor fail`, `8 = serious fail`).
- `agent[]` — actor info (Practitioner, role, IP).
- `entity[]` — what was acted on (`Patient/...`, `Encounter/...`, etc.).

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
| `Questionnaire` / `QuestionnaireResponse` | Assessments use `Observation` (assessment-coded). | When we ship patient-reported outcome surveys at scale. |

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

- [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — engineering overview, route map, conventions.
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) — how PHI moves at the wire, RBAC implementation, signed URLs.
- [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) — how this catalog maps to HIPAA §164.312 technical safeguards.
- [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) — which role can do what on which resource.
