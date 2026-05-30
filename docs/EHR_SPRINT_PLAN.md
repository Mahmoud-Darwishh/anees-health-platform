# Anees Health Platform — Vision, Architecture & Delivery Roadmap

_Last updated: 2026-05-30 (re-assessed against actual code, build verified exit 0)_

The single source of truth for **what Anees is becoming**, **what is built today**, and **the
business-prioritized path** to get there. Written for both the business owner (plain language)
and engineers (precise, FHIR-grounded).

---

## PART I — THE VISION (north star)

Anees Health is **not a booking app**. It is a **coordinated, longitudinal, home-healthcare
operating system** — managed-care infrastructure for MENA, built to healthcare-enterprise
standards.

It must function as **all of these at once**:

- A **unified longitudinal patient record** (one continuously evolving medical timeline).
- A **coordinated multi-disciplinary care** platform (doctors, physios, nurses, coordinators,
  ops, labs, radiology, nutritionists, caregivers, family — collaborating in one journey).
- A **home-healthcare operations & dispatch** system (Uber-like scheduling, routing, visit
  verification, SLA, territories).
- A **patient & family engagement** platform (consent-based shared visibility).
- A **telemedicine & communication** system (video, voice, secure messaging).
- A **remote patient monitoring** hub (BP/glucose/SpO₂/ECG/wearables → timeline).
- A **healthcare interoperability hub** (FHIR-native; hospital/insurer/lab/pharmacy/gov links).
- A **scalable, compliant healthcare infrastructure** (HIPAA/GDPR-ready, multi-org, HA/DR).

### Guiding principles (non-negotiable)
1. **Longitudinal care first** — every visit, report, med, escalation, lab, message joins one journey.
2. **Coordinated multi-disciplinary care** — escalations, handoffs, shared care plans, clinical
   messaging, cross-disciplinary referrals are first-class.
3. **Healthcare-grade access control** — RBAC **+ ABAC + field-level + context-aware** policies.
   Access depends on role **and** care relationship, assignment, clinical relevance, department,
   workflow, and org policy.
4. **FHIR-ready interoperability** — standardized resources only; no isolated/non-standard schemas.
5. **Compliance by construction** — immutable audit, consent, data minimization, encryption,
   least privilege, full traceability.
6. **Enterprise architecture** — modular domains, event-driven, real-time, high concurrency,
   HA/DR, multi-organization.

---

## PART II — WHERE WE ARE TODAY (verified against code, 2026-05-30)

**Architecture is on-vision.** Medplum (FHIR) is the single clinical source of truth; Postgres
holds operational/booking/finance only. The staff workspace is enterprise-grade; the portal is
live; the clinical breadth (problems, allergies, meds, labs, documents, assessments) is in;
coordination, dispatch, and formal compliance are underway.

### ✅ Built & verified (production-build green)

**Foundation & infrastructure**
- Medplum server client with **automatic 401 re-login** (Proxy-wrapped, `client.ts`) — token resilient.
- `Patient.medplumPatientId` link + booking-create/payment-webhook sync + backfill.
- Program CarePlan auto-created on paid package (Sanad/Haraka/Wa'i/Amal).
- **RBAC** (`rbac.ts`): `CLINICAL_ROLES`, `CLINICAL_WRITE_ROLES`, `CASE_SCOPED_CLINICAL_READ_ROLES`,
  helpers + role POVs enforced.
- **Audit** (`medplum/audit.ts`): Medplum `AuditEvent` is the source of truth; Postgres `AuditLog`
  is a best-effort mirror.
- Staff→**Practitioner** identity mapping cached on `Staff.medplumPractitionerId`.
- DB cleanup: 25 legacy clinical tables + ~12 enums dropped.
- **Versioned migrations** introduced (`prisma/migrations/00000000000000_baseline`).
- CI workflows scaffolded under `.github/workflows/`.

**Staff clinical workspace** (`src/features/ehr/admin-patient/`, helpers in `src/lib/medplum/`)
- **Visits/Encounters**, **Vitals** (LOINC-coded, persisted via FHIR **transaction Bundle**),
  **Clinical notes** (Composition draft→sign-off), **Care team** (assign/unassign with
  **`If-Match` weak-ETag** optimistic concurrency), **Tasks**, **Nursing/physio reports**.
- Feature-module: `data.ts` (parallelized via `Promise.allSettled`), `actions.ts`,
  `schemas/` (**Zod**), `flash.ts` (user-facing errors), `page-view.tsx`.
- Every write **RBAC-gated** + **audited**; **case-scoped reads** for clinicians.

**Clinical breadth (Phase C)**
- Problems/**Conditions** (ICD-10/SNOMED-ready), **Allergies** (AllergyIntolerance),
  **Medications** (MedicationStatement/Request, RxNorm-ready), **Labs** (ServiceRequest +
  DiagnosticReport/Observation), **Documents** (DocumentReference + Binary/Media + signed
  download `/api/ehr/documents/[documentId]`), **Assessments** (Observation/QuestionnaireResponse).

**Patient & family portal** (`src/app/[locale]/portal/`)
- Bilingual EN/AR + RTL.
- **Consent-scoped caregiver visibility** via FHIR `Consent` (`consents.ts` + `consent-policy.ts`):
  per-patient scopes — profile, visits, vitals, notes, tasks — and allow/deny provisions matched
  by caregiver phone/email.
- Patient sees: care plans, care team, upcoming appointment, visits, vitals, signed notes, tasks.

**Coordination & operations foundations (Phases D & E started)**
- **`communications.ts`** — FHIR `Communication` helper (escalation/messaging primitives).
- **`appointments.ts`** — FHIR `Appointment` helper (scheduling primitives).

### ❌ Not yet built (the remaining work)
- **Full ABAC engine** (`can(actor, action, resource, context)`) + field-level masking helpers.
- **Care-coordination & escalation engine** end-to-end: clinical messaging UI, escalation
  workflows, handoffs, cross-disciplinary referrals, in-app/push notifications.
- **Workforce & dispatch operations** end-to-end: clinician scheduling UI, dispatch board,
  check-in/out, visit verification, signatures/media, SLA, territories, missed-visit/reschedule.
- **Formal HIPAA/GDPR/DPL hardening**: MFA, secret-rotation policy, encryption-at-rest review,
  retention policy, incident traceability, audit-review UI, BAA-eligible vendor list.
- **Telemedicine / RPM / AI / Interoperability hub / multi-org / HA-DR** — future phases.
- **Observability**: Sentry + structured logs + Medplum/health metrics.
- **Testing**: Vitest (helpers) + Playwright (login → record visit → portal-read journeys).
- **Read-side perf**: vitals date-scoping, hot-read caching (CarePlan/header).
- Patient demographic edit (currently no admin write of demographics; dual-source concern parked).

---

## PART III — TARGET ARCHITECTURE & PRINCIPLES

- **One source of truth per fact.** Clinical → Medplum (FHIR). Operational/booking/finance → Postgres.
- **Modular domains, feature-first.** `src/features/<domain>/` with `data`, `actions`, `schemas`
  (Zod), `components`, `types`. Medplum access lives in `src/lib/medplum/<resource>.ts` — typed,
  `server-only`, idempotent, returning the resource (with `meta.versionId` for concurrency).
- **Permissions = RBAC + ABAC + field-level.** Role gates the door; attributes (assignment, care
  relationship, department, sensitivity, consent) gate the data and the fields.
- **Event-driven coordination.** Escalations, handoffs, notifications modelled as FHIR
  `Communication`/`Task` + (Phase D2) an outbox/queue so workflows are auditable and async.
- **Compliance by construction.** Medplum `AuditEvent` is the immutable clinical audit; consent
  via FHIR `Consent`; least-privilege everywhere; PHI never logged; signed URLs for files;
  versioned migrations only (no `db:push` from now on).
- **Interoperability-first.** Standard FHIR resources + standard code systems (LOINC, ICD-10,
  SNOMED, RxNorm) so external links are configuration, not rewrites.
- **Scale & resilience.** Stateless app tier; parallelized + batched Medplum I/O (transaction
  Bundles); optimistic concurrency via `If-Match`/`versionId`; pagination; targeted caching; auto
  re-login on 401; Medplum/Postgres each independently scalable; backups + DR runbook.
- **Multi-org ready by design.** Wherever ownership matters, model `organization` as an attribute
  early (FHIR `Organization` + a Postgres `orgId` on tenant-scoped rows); enforce later.

### FHIR domain mapping (canonical model)
| Concept | FHIR resource(s) | Status |
|---|---|---|
| Patient demographics | `Patient` | ✅ |
| Provider/staff identity | `Practitioner` (+ `PractitionerRole` future) | ✅ |
| Visit/encounter | `Encounter` | ✅ |
| Vitals & device readings | `Observation` (vital-signs) | ✅ (RPM device feed: Phase H) |
| Clinical note | `Composition` (draft→final) | ✅ |
| Care team | `CareTeam` (with `If-Match` concurrency) | ✅ |
| Task/follow-up | `Task` | ✅ |
| Nursing/physio report | `Observation` (survey) | ✅ |
| Care program/plan | `CarePlan` | ✅ |
| Problem/diagnosis | `Condition` (ICD-10/SNOMED) | ✅ |
| Allergy | `AllergyIntolerance` | ✅ |
| Medication | `MedicationStatement`/`MedicationRequest` (RxNorm) | ✅ |
| Lab/imaging order + result | `ServiceRequest` + `DiagnosticReport`/`Observation` | ✅ |
| Document/file | `DocumentReference` + `Binary`/`Media` (signed URL API) | ✅ |
| Functional assessment | `Observation`/`QuestionnaireResponse` | ✅ |
| Clinical messaging/escalation | `Communication` + `Task` | 🟡 helper exists; engine pending |
| Appointment/scheduling | `Appointment` + `Slot`/`Schedule` | 🟡 helper exists; UI/flow pending |
| Consent | `Consent` (portal scopes, allow/deny) | ✅ foundation; ABAC engine pending |
| Organization (multi-tenant) | `Organization` | ⏳ |

---

## PART IV — PERMISSION ARCHITECTURE (RBAC + ABAC + field-level)

Today: RBAC + care-team scoping + Consent-scoped portal. Target adds **ABAC** (attributes) and
**field-level** masking across all reads.

**Decision matrix = role × care-relationship × clinical-relevance × department × consent × org.**

### Role POVs (target — partially enforced today)
- **Doctor** — full clinical (diagnoses, labs, imaging, meds, notes, vitals, nursing/physio reports,
  care plans, escalations); prescribe, plan, escalate, approve, refer. **Excluded:** finance, payroll,
  insurance internals.
- **Physiotherapist** — rehab diagnoses, functional/mobility/pain assessments, sessions, relevant
  imaging, doctor rehab orders; session reports, request reassessment, escalate, attendance.
  **Excluded:** billing, insurance, unrelated sensitive diagnoses.
- **Nurse** — med administration, daily care plans, vitals, wound care, tasks, doctor orders,
  escalations; handoffs, media/notes, compliance, incidents. **Excluded:** finance.
- **Medical operations** — scheduling, dispatch, workforce, visit status, areas, SLA, escalation
  queues, ops analytics. **Limited** clinical visibility.
- **Patient** — own timeline, visits, reports, prescriptions, labs, care plan, care team, messaging,
  upcoming appointments. **Excluded:** internal notes/escalations/QA/staff evaluations.
- **Family/caregiver** — consent-based subset (today: profile/visits/vitals/notes/tasks scopes;
  expand as needed). Configurable per patient consent; revocable.

### Implementation path
Extend `src/lib/auth/` with a single **policy core** `policy.ts` exposing
`can(actor, action, resource, context)`. Sources of truth:
- **Role** from session.
- **Care relationship** from `CareTeam`.
- **Consent** from `Consent` (via `consent-policy.ts`).
- **Field sensitivity** from a sensitivity registry per FHIR field/extension.

Add a small `projectForActor(resource, actor)` to strip non-permitted fields **server-side before
serialization** — no UI logic decides what a user sees.

---

## PART V — THE ROADMAP (phased epics → sprints, business-prioritized)

> Sprints ≈ 2 weeks. Order is now optimized for **business value × dependency**, not just sequence.

### ✅ Phase 0 — Foundation & staff clinical core — DONE
Medplum integration, RBAC, audit, practitioner mapping, staff workspace, feature-module refactor.

### ✅ Phase A — Hardening to enterprise-grade — SUBSTANTIALLY DONE
- ✅ A1 Concurrency (`If-Match` + `versionId` in CareTeam/related shared resources).
- ✅ A2 Batch writes (vitals as FHIR transaction Bundle).
- ✅ A4 Token resilience (Proxy-wrapped client, auto re-login on 401).
- ✅ A5 Migrations (`prisma/migrations/` baseline; no more `db:push` going forward).
- ⏳ A3 Read efficiency (date-scope vitals; hot-read caching) — minor, do alongside Phase B polish.
- ⏳ A6 Observability + tests — see Sprint Ω.

### ✅ Phase B — Patient & family portal — STRUCTURALLY DONE
- ✅ B1 Read-only longitudinal record (bilingual EN/AR + RTL).
- ✅ B2 Family/caregiver consent-based access (FHIR `Consent` with portal scopes).
- ⏳ B3 Engagement polish: reminders, push, care-team contact actions, journey summaries.

### ✅ Phase C — Clinical depth — DONE
Conditions, allergies, medications, labs (ServiceRequest + DiagnosticReport), documents
(DocumentReference + Binary + signed URLs), assessments. _Header banners (allergies/high-risk
conditions) and admin-side rich UI for each: polish in subsequent sprints._

### 🟡 Phase D — Care coordination & escalation engine — STARTED
- ✅ `Communication` helper exists.
- ⏳ D1 In-app clinical messaging UI (per patient/case, audited).
- ⏳ D2 Escalation workflow: priority, owner, follow-up, SLA timer (nurse deterioration, physio
  reassessment), as `Task` + `Communication`.
- ⏳ D3 Handoffs (shift handover packets), cross-disciplinary referrals.
- ⏳ D4 Notifications (in-app first; push/SMS/WhatsApp already partially wired) + outbox/queue.

### 🟡 Phase E — Workforce & home-healthcare operations (dispatch) — STARTED
- ✅ `Appointment` helper exists.
- ⏳ E1 Scheduling UI (`Schedule`/`Slot`/`Appointment`) for doctors/nurses/physios; availability.
- ⏳ E2 Dispatch + visit lifecycle: assign, en-route, **check-in/out**, duration, **visit
  verification**, patient signature, media upload, missed-visit + reschedule logic.
- ⏳ E3 SLA monitoring, territories/service areas, ops escalation queue, ops analytics dashboard.
- ⏳ E4 Future: GPS verification, geo-fencing, Face-ID verification, fraud prevention, smart
  dispatch, ETA prediction.

### 🟡 Phase F — ABAC, consent & compliance (HIPAA/GDPR/DPL) — FOUNDATION STARTED
- ✅ FHIR `Consent` + portal scope policy.
- ⏳ F1 ABAC engine + field-level masking (target Part IV).
- ⏳ F2 MFA for staff; secret-rotation policy; encryption-at-rest review; data-retention policy.
- ⏳ F3 Audit-review UI for superadmin (search `AuditEvent` by actor/resource/time).
- ⏳ F4 Compliance gate for public PHI go-live: BAA vendors, DPL 151/2020 alignment.

### Phase G — Telemedicine & communication (revenue line)
Video/voice consults, secure messaging, call routing, virtual waiting rooms, AI visit summaries.
Build vs buy decision required (Twilio/Daily.co vs WebRTC + Medplum).

### Phase H — Remote patient monitoring (recurring revenue line)
Device integrations (BP, glucose, SpO₂, ECG, wearables) → `Observation` on the timeline;
threshold alerts feed the **escalation engine** (Phase D).

### Phase I — Interoperability hub (B2B unlocks)
FHIR APIs + SMART-on-FHIR; connectors for hospitals, insurers, labs, pharmacies, gov; inbound +
outbound mapping; external EMR/EHR exchange.

### Phase J — AI layer (compounding efficiency + differentiation)
Clinical (SOAP/visit summaries, risk & deterioration prediction, care recommendations),
operational (smart dispatch, staffing, no-show & route optimization), patient (reminders, triage,
support assistant). Built on the structured FHIR record.

### Phase K — Scale, multi-org & resilience
Multi-org tenancy (`Organization` per resource), HA + DR + backups/restore runbook, performance/
load testing, observability matured, e2e test coverage.

---

## PART VI — RECOMMENDED NEXT 3 SPRINTS (business-prioritized action plan)

Given **current state** + **business ROI** + **dependencies**, here is the concrete next-quarter
plan. Each sprint is ~2 weeks.

### Sprint Ω — "Production-grade gate" (do first, ~1 week)
**Why business cares:** Before piling on dispatch + escalations + real PHI, lock down the platform
so it does not break under load and you can prove what happened when something goes wrong.
- A3 Read efficiency: date-scope vitals query; cache patient header/CarePlan in request memo.
- **Observability:** wire Sentry (PHI-safe); structured request logger; Medplum latency metrics
  on the health endpoint.
- **Tests:** Vitest for `lib/medplum/*` (idempotency, concurrency, consent matching);
  Playwright for the 3 critical journeys (staff login → record visit, patient portal read,
  paid-booking → CarePlan created).
- Rotate the Medplum client secret + the starter `admin@anees.health` password.
- Docs: update `CLAUDE.md` (it still describes dropped tables).

**You'll see:** errors visible in Sentry, build with passing tests, faster patient page, signed
secret hygiene checklist.

### Sprint D1 — Care coordination v1 (clinical safety + family trust)
**Why business cares:** Coordinated care is the *differentiator*. Nurses escalate deterioration,
physios request reassessment, families see "your case team is on it." Also the prerequisite for
dispatch's event flow.
- In-app **clinical messaging** UI on the patient page (per-case thread; staff-only; audited).
- **Escalation workflow**: a "Raise escalation" action creates a `Task` (priority/owner) +
  `Communication` (initial note), routed to a triage queue. SLA timer counts down.
- Handoff packet for shift change (today's events + open tasks).
- In-app notification badge for the assigned owner; push later.

**You'll see:** a nurse can flag a patient is deteriorating; doctor sees it in their queue
within seconds; full audit trail; family-portal flag the family-portal-permitted lines.

### Sprint E1 — Dispatch & visit verification v1 (the operational 10×)
**Why business cares:** Today, every visit is manually coordinated and there is no way to verify
the visit happened, took the right duration, or reached the patient. This sprint turns Anees
into an *operating system* — and unblocks fraud prevention, SLA enforcement, and capacity
planning.
- **Scheduling UI** on Appointment/Slot/Schedule for doctor/nurse/physio.
- **Assign + dispatch board** for ops; status: requested → assigned → en-route → checked-in →
  completed → invoiced.
- **Mobile-friendly clinician view**: check-in / check-out (timestamp + location coarse), visit
  notes + media + signature.
- Missed-visit logic + reschedule path; SLA dashboard for ops.

**You'll see:** ops sees "today's board"; clinicians complete visits with one device; every
visit has verified start/stop + signature; the same `Encounter` everywhere is the truth.

After these 3 sprints, return to Phase F (formal compliance / ABAC engine) before public PHI
go-live, then sequence G → H → I → J → K per business demand.

---

## PART VII — CROSS-CUTTING WORKSTREAMS
| Stream | What | When |
|---|---|---|
| Security | Rotate Medplum secret + starter staff password; MFA; CSP | Sprint Ω → Phase F |
| Migrations | All schema changes via `prisma migrate` (`db:push` forbidden) | Now |
| i18n (EN/AR) | Portal bilingual ✅; admin AR pass | Phase D/E sprints |
| Code systems | LOINC ✅, ICD-10 / SNOMED / RxNorm content as domains land | Phases C → I |
| Compliance/audit | Medplum AuditEvent authoritative; consent; retention | Ongoing, formalized F |
| Testing/observability | Sentry + Vitest + Playwright | Sprint Ω, hard gate Phase K |
| Outbox/queue | Async events for notifications, integrations | Phase D2 → I |
| Multi-org readiness | Add `Organization` attributes proactively | Now, enforce Phase K |
| Docs | Refresh `CLAUDE.md` + `.github/copilot-instructions.md` | Sprint Ω |

---

## PART VIII — OPEN DECISIONS FOR THE OWNER
1. **Telemedicine vendor (Phase G):** build on WebRTC+Medplum, or integrate Twilio/Daily.co? Impacts
   CSP, BAA, time-to-market.
2. **File storage for documents:** keep in Medplum `Binary`/`Media` (already in use) — or split heavy
   media (scans/video) into S3-compatible private bucket with signed URLs for cost/perf?
3. **Public PHI go-live gate:** confirm we ship to real patients only after Phase F (recommended).
4. **Family/caregiver model:** one caregiver per patient (today) or multiple with per-caregiver
   consent scopes? Recommendation: multiple.
5. **Multi-org tenancy:** start adding `Organization`/`orgId` attributes now (design-time cheap)
   even if enforcement is Phase K?
6. **Care-coordination first or dispatch first?** Recommendation: **D1 before E1**, because escalations
   and dispatched-visit events share the same FHIR primitives and D unblocks E's event flow.

---

## PART IX — ARCHITECTURE & SCALABILITY CHECKLIST (continuous)

These are the **clean-code / scalability disciplines** to keep applying as new features land:

- ✅ Server-only Medplum helpers; idempotent; return resource + `meta.versionId`.
- ✅ Parallel reads via `Promise.allSettled`; per-source error isolation.
- ✅ Batch writes via FHIR **transaction Bundles** (not loops of single creates).
- ✅ Optimistic concurrency on shared updates (`If-Match` weak ETag).
- ✅ Auto re-login on 401 (Proxy-wrapped client).
- ✅ Audit: Medplum `AuditEvent` source-of-truth; Postgres mirror best-effort.
- ✅ Zod schemas on every server-action input.
- ✅ Versioned migrations (`prisma migrate`).
- ⏳ ABAC `can()` + field-level projection helpers (Phase F1).
- ⏳ Sentry + structured logger (PHI-safe) + Medplum latency metrics (Sprint Ω).
- ⏳ Vitest + Playwright critical-journey tests (Sprint Ω).
- ⏳ Outbox/queue for async notifications + integrations (Phase D2 / I).
- ⏳ Caching for hot reads (CarePlan header, latest vitals row).
- ⏳ Multi-org attributes (`Organization`) added proactively where ownership matters.

---

## PART X — DELIVERY ORDER (summary)

```
DONE      Phase 0   Foundation + staff clinical core
DONE      Phase A   Hardening (concurrency, batch, token, migrations)   [A3+observ. in Sprint Ω]
DONE      Phase B   Patient & family portal (bilingual, consent)         [B3 polish ongoing]
DONE      Phase C   Clinical depth (problems, allergies, meds, labs, documents, assessments)
NOW →     Sprint Ω  Production-grade gate (observability, tests, secret rotation, A3 perf)
NEXT      Sprint D1 Care coordination v1 (messaging + escalation + handoffs)
NEXT      Sprint E1 Dispatch + visit verification v1
THEN      Phase F   ABAC + consent + HIPAA/GDPR/DPL hardening  ← gate for public PHI
LATER     Phase G   Telemedicine                                ← new revenue line
LATER     Phase H   Remote patient monitoring                   ← chronic-care subscription
LATER     Phase I   Interoperability hub                        ← B2B partnerships
LATER     Phase J   AI layer                                    ← efficiency + differentiation
LATER     Phase K   Multi-org, HA/DR, full test+observability   ← scale to new markets
```

_This document is the master plan. Update it at the end of each phase so it always reflects reality._
