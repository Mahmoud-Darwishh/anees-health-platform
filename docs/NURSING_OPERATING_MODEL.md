# Nursing Operating Model — Anees Health Platform

_Last updated: 2026-05-31_

This document defines the complete Nursing role logic for business operations, clinical safety,
and scalable platform behavior at Anees.

> **Care delivery context:** ~99% of Anees nursing engagements are **planned, scheduled home-care
> visits** with defined shift windows and an assigned on-duty nurse. The operating model is built
> around that reality. Truly unplanned/on-call response is out of scope for this iteration and will
> be revisited only if business mix changes.

---

## 1) Purpose of Nursing Role

Nursing in Anees is responsible for continuous patient monitoring, **safe medication
administration**, shift continuity, escalation triggering, and safe care execution between
physician decisions and home-care operations.

Nursing is the front line for:
- Administering scheduled medications and documenting each administration.
- Monitoring deterioration and documenting objective signs.
- Recording vitals and bedside clinical observations (including pain score).
- Executing care tasks and reporting completion blockers.
- Reporting incidents and near-misses (falls, medication errors, equipment failures).
- Handing over safe, structured context to the next shift.
- Coordinating with the patient's family/caregiver during care.

---

## 2) Access Model (Current Target)

### Allowed data visibility for Nursing
- Patient header and profile summary (read).
- Visits/encounters (read/write link for documentation).
- Vitals (read/write).
- Clinical notes (draft/read per current clinical workflow).
- Care tasks (read and status progression in allowed flow).
- Medication administration record (read/write for scheduled doses).
- Coordination thread and escalation context (read/write where role permits).
- Family/caregiver communication channel (read/write).
- Incident / near-miss report (read/write own, read team).
- Medications, allergies, conditions, labs, documents, assessments (read).

### Restricted actions for Nursing
- No direct demographic edits (read-only).
- No direct authoring of conditions/problem list.
- No direct authoring of medication entries (prescribing). Nurses **administer** prescribed
  medications, they do not **author** them.

### Clinical boundary rationale
- Nurses can observe, administer per orders, and escalate.
- Diagnosis and medication authoring (prescribing) remain physician/admin controlled.
- Data minimization and role separation reduce clinical/legal risk.
- All clinical reads (labs especially) will be access-logged once auth core lands.

---

## 3) Core Nursing Workflows

### A) Pre-visit readiness
- On-duty nurse identity confirmed from the daily roster (see §10).
- Required equipment/supplies confirmed before leaving for visit (see §6).
- Nurse credential validity checked (license not expired).

### B) In-shift nursing documentation
Required capabilities:
- Record vitals throughout shift (BP, HR, temperature, SpO2, glucose, weight, **pain score 0-10**).
- Administer scheduled medications and record each administration (see §4 — MAR).
- Submit nursing daily report with condition summary and follow-up plan.
- Log any incident or near-miss (see §5).
- Communicate clinical updates to family/caregiver where appropriate.
- Mark escalation-needed status when patient safety concern exists.

Safety rules (server-enforced):
- If escalation is marked as needed, follow-up plan is mandatory.
- If no active escalation exists, system auto-creates escalation Task + Communication trail.
- Vitals outside configured safety thresholds auto-create an escalation Task (see §7).
- Scheduled medication overdue by configured grace window auto-creates a reminder task.

### C) End-of-shift handoff (mandatory, two-party)
Nursing must submit a structured handoff before shift transfer, and the **incoming nurse must
acknowledge it** within the configured grace window.

Outgoing-nurse required fields:
- Shift start and shift end timestamps.
- Patient status summary.
- Pending tasks summary.
- Medication safety summary (including any held/refused doses and reasons).
- Escalation status (`none | active | resolved`).
- Next shift focus.
- Clinical handoff note.
- Captured handoff GPS location (lat/lng + accuracy).
- Completed on-site attestation.

Incoming-nurse acknowledgment:
- Confirms receipt of handoff and understanding of pending items.
- Required within configured window after shift start (default 30 min).
- If not acknowledged in window → auto-escalation to supervising role.

Server-side hard checks (outgoing handoff):
- Shift end must be later than shift start.
- New shift cannot start before prior handoff end (per patient).
- At least one vital set must exist within the shift window (with small pre-shift grace).
- If open tasks exist, pending-task summary must be substantial.
- If escalation status = active, an active escalation task must exist.
- All scheduled medication doses for the shift must be reconciled (given / held / refused).
- Handoff location must be within configured radius of patient location coordinates.
- GPS accuracy must be within acceptable threshold for field verification.

---

## 4) Medication Administration Record (MAR)

The MAR is the per-shift, per-patient record of every dose actually given (or not given).

Per-administration capture:
- Medication reference (links to authored `MedicationRequest`).
- Scheduled time vs actual administration time.
- Dose given, route, site (if applicable).
- Status: `given | held | refused | missed`.
- If not given: reason (clinical hold, patient refusal, supply unavailable, etc.).
- Performer (nurse identity from session).
- Optional witness signature for high-risk meds (insulin, opioids, anticoagulants).

Persisted as Medplum `MedicationAdministration` linked to:
- The patient (`subject`).
- The originating `MedicationRequest` (`request`).
- The current `Encounter` (`context`).
- The administering nurse `Practitioner` (`performer`).

Safety rules:
- Cannot record administration of a medication that is not on the active medication list.
- Cannot record administration outside a configured window around scheduled time without an
  override reason.
- Held/refused doses must include a textual reason.
- Handoff cannot be submitted while scheduled doses in the shift remain unreconciled.

---

## 5) Incident & Near-Miss Reporting

Required capture for clinical safety culture:
- Incident type: `fall | medication-error | pressure-injury | equipment-failure | needle-stick | infection-exposure | other`.
- Severity: `near-miss | minor | moderate | severe | sentinel`.
- Narrative description.
- Patient impact (none, monitoring required, intervention required, harm occurred).
- Immediate action taken.
- Notification status (family, physician, supervisor).
- Auto-creates an escalation Task when severity is moderate or above.

Persisted as Medplum `Observation` with code `nursing-incident-report` plus a linked
`Communication` for notification chain.

---

## 6) Equipment & Supply Readiness

Tracked per planned visit:
- Required equipment list per care program (oxygen tank, IV pump, suction, dressing kit, etc.).
- Pre-visit checklist that nurse must confirm before traveling.
- In-shift equipment status (e.g., oxygen tank percentage remaining).
- Auto-flag when expected equipment is missing or below threshold.

---

## 7) Vitals Thresholds & Auto-Flagging

Configurable per-patient threshold ranges (defaults from clinical guidelines):
- Systolic BP, diastolic BP, heart rate, temperature, SpO2, glucose, pain score.
- Each vital has soft (warning) and hard (auto-escalate) bounds.

Behavior:
- Recording a vital outside soft bounds → visible warning + flag on chart.
- Recording a vital outside hard bounds → auto-creates an escalation Task (same pathway as
  manual nursing escalation) + Communication to on-call physician/supervisor.
- Auto-escalation links back to the originating vitals `Observation`.

---

## 8) Data Contract for Nursing Handoff

Persisted as Medplum `Observation` with code `nursing-shift-handoff` and structured components:
- `shift-start-at`
- `shift-end-at`
- `patient-status-summary`
- `pending-tasks-summary`
- `medication-safety-summary`
- `escalation-status`
- `next-shift-focus`
- `handoff-latitude`
- `handoff-longitude`
- `handoff-location-accuracy-m`
- `distance-from-patient-m`
- `within-patient-location-radius`
- `handoff-attestation`
- `incoming-nurse-acknowledged-at` (filled by incoming nurse acknowledgment step)
- `incoming-nurse-reference` (filled by incoming nurse acknowledgment step)

Audit expectation:
- Every handoff write creates `MedplumNursingShiftHandoff` audit mirror metadata.
- Acknowledgment writes a separate `MedplumNursingHandoffAck` audit row.
- PHI must not be duplicated into non-clinical logs.

---

## 9) Shift-to-Shift Continuity Logic

Minimum continuity standard before handoff acceptance:
1. Objective monitoring evidence (vitals in shift window, including pain score).
2. All scheduled medication doses reconciled (MAR complete).
3. Explicit unresolved work (pending task summary).
4. Medication risk communication for next shift.
5. Escalation state truth aligned with active task state.
6. Clear next-shift execution focus.
7. Incoming nurse acknowledgment received within grace window.

This creates a **two-party closed-loop handoff chain** and prevents information loss between
shifts.

---

## 10) Shift Roster & On-Duty Identity

The roster is the source of truth for "who is the nurse for this patient right now."

Required fields per roster entry:
- Patient.
- Nurse (Staff with `nurse` role).
- Shift window (start, end).
- Care program assignment.
- Status: `planned | active | completed | swapped | no-show`.

Behavior:
- Only the rostered nurse for the active shift window can record vitals/MAR/notes/handoff
  for that patient (with supervisor override available).
- Roster gaps in active care plans surface in a daily operations dashboard.
- Swap/no-show events generate audit and notification trails.

The roster also drives:
- Two-party handoff (system knows the incoming nurse).
- License expiry blocking (cannot roster a nurse whose license has lapsed).
- Equipment readiness assignment.

---

## 11) Family / Caregiver Communication

Separate channel from staff-to-staff `Communication`:
- Recipient: caregiver phone/email already on `Patient` record.
- Categories: `clinical-update | medication-reminder | scheduling | escalation-notice`.
- Audit-tracked, language-aware (EN/AR), respects caregiver consent scope.
- Family-facing tone (no clinical jargon by default).

---

## 12) Business Logic Outcomes

Expected business outcomes:
- Fewer missed clinical risks during shift transitions.
- Demonstrable record of every medication given (regulatory, legal, billing).
- Faster triage due to structured escalation pathways and threshold-driven alerts.
- Better nurse accountability with timestamped handoff and MAR artifacts.
- More predictable operations for dispatch and medical oversight.
- Safety-culture signal through incident reporting.

Operational KPIs to track:
- Handoff completion rate before shift end.
- Two-party handoff acknowledgment rate.
- Percent of shifts with vitals captured (including pain score).
- MAR completion rate per shift (no unreconciled scheduled doses).
- Auto-escalations triggered by threshold breaches and time-to-acknowledgment.
- Time from escalation trigger to owner acknowledgment.
- Incident reports per 100 patient-days (volume *and* severity mix).
- Reopened escalations after handoff (quality proxy).
- Roster no-show / swap rate.

---

## 13) Safety & Compliance Guardrails

- Role-based minimum necessary access is enforced server-side.
- Mutation workflows remain audited (including MAR and incident reports).
- No PHI in app logs/telemetry payloads.
- Handoff cannot be accepted without objective clinical evidence and continuity data.
- Handoff is blocked when outside patient geofence (default 500m radius, per-patient override).
- Nurses with expired license cannot be rostered or perform clinical writes.
- Read access to high-sensitivity data (labs, incidents, family contact) is access-logged.

### Reusable geo architecture note
- Geofence logic is implemented through shared policy evaluation (not Nursing-only inline code)
  so the same flow applies to doctor check-in, physio sessions, and visit checkout with
  role-specific thresholds.
- Shared service entrypoint: `src/lib/geo/presence-policy.ts`.
- Per-patient radius override and a `temporarily-away` flag are required for hospital admission
  and similar legitimate location displacement.

---

## 14) Implementation Status (as of this update)

### Implemented now
- Nursing role-scoped workspace access.
- Nursing end-of-shift handoff form + server validation + persistence.
- Geofenced handoff with shared policy evaluator.
- Per-patient handoff geofence override and temporary-away policy in local ops store.
- Nursing report escalation consistency rules.
- Auto-escalation creation on nursing report when needed and no active escalation exists.
- Vitals threshold auto-flagging with automatic escalation generation and alert summary.
- Pain score (`0-10`) added to vitals capture and vitals timeline.
- Medication Administration Record workflow (`MedicationAdministration`) with status `given|refused|held`.
- Incident / near-miss reporting flow with optional escalation linking.
- Shift roster table linking patient + nurse + shift window.
- Incoming-nurse acknowledgment flow with delayed-ack escalation trigger.
- Escalation SLA sweep action (manual execution path now; scheduler wiring pending).
- Server-side demographic write restriction for non-allowed roles.
- Audit mirror writes on nursing report and handoff mutations.

### In progress — Phase A hardening
1. **MAR reconciliation gate on handoff** — block handoff while scheduled doses remain unreconciled.
2. **Threshold policy governance UI** — editable soft/hard ranges per care program and per patient.
3. **Incident severity workflow depth** — enforce severity-specific mandatory fields and downstream routing.

### In progress — Phase B hardening
4. **Roster ownership strictness** — broaden active-shift ownership checks across all nursing write paths.
5. **Automated SLA timer** — move from manual sweep action to scheduled/background execution.
6. **Escalation routing tree** — deterministic role fallback chain (nurse lead -> doctor -> supervisor).

### Pending — Phase C: Quality and consistency
9. **Care program checklists** (wound care, post-op, chronic disease, neuro) feeding the
   nursing report.
10. **Family/caregiver communication channel** (separate from staff-to-staff `Communication`).
11. **PRN medication flow** with justification capture.

### Pending — Phase D: Operational hygiene
12. **Equipment / supply checklist per visit** with low-stock flagging.
13. **Nurse license / credential expiry tracking** on `Staff` record, with roster block.

### Deferred (revisit if business mix changes)
- Unplanned / on-call response workflow. Today ~99% of cases are planned with specific
  scheduled timing, so this is out of scope.
- Field-level ABAC masking — schedule after auth core lands.
- Nursing-specific care plan (NANDA/NIC/NOC) — current `CarePlan` is sufficient at this
  scale; revisit when care complexity warrants.
