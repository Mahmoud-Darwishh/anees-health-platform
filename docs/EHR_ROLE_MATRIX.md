# Anees EHR — Role Matrix, Business Logic & System of Record

**Status:** Draft v1 — authoritative reference for who sees what, who can write what, how clinical workflows behave, and how field operations work.
**Owner:** Founder + CTO.
**Last reviewed:** 2026-06-04.
**Companion docs:** [`CTO_STRATEGY.md`](./CTO_STRATEGY.md) (long-term architecture), [`EHR_NOW.md`](./EHR_NOW.md) (active sprint).

> This document is the **single source of truth** for the EHR's business logic. When code conflicts with this doc, fix the code. When reality conflicts with this doc, update the doc.

---

## 0. Vision in one paragraph

Anees is a regulated, bilingual, FHIR-native home-care EHR built for the MENA reality: solo clinicians visiting patients at home (not hospital wards), Egyptian insurance and accreditation rules baked in from day one, and a field-operations layer (check-in/check-out, geofencing, live dispatch) that no global EHR ships with — because no global EHR was built for our model. The EHR should feel like Epic for clinical depth, Athena for operational discipline, and Uber for field dispatch.

---

## 1. Roles — final list

Ten total roles. Seven staffed on day one. Three are flags/observers.

| # | Role | Day-one staffed | Field-clinical | Notes |
|---|---|---|---|---|
| 1 | **Portal User** | ✅ | — | Patient + caregiver merged; differentiated by FHIR `Consent` scope |
| 2 | **Nurse** | ✅ | ✅ | Field clinician; check-in/out + geofence |
| 3 | **Physio** | ✅ | ✅ | Field clinician; check-in/out + geofence |
| 4 | **Doctor** | ✅ | ✅ | Field + telemed; ±on-call flag, ±clinical-director flag |
| 5 | **Medical Ops** | ✅ | partial | License-gated: licensed → full clinical write+sign; unlicensed → draft/edit only |
| 6 | **Insurance Coordinator** | ✅ | — | Sees claim data; cannot edit clinical content |
| 7 | **Admin** | ✅ | — | Merged: admin + super-admin + finance |
| 8 | **Compliance Officer** | (flag) | — | Read-only across audit logs + PHI; separation of duties from Admin |
| 9 | **Hospital Partner Admin** | (schema only) | — | Multi-tenant; flag the schema now, build UI later |
| 10 | **Viewer** | (rare) | — | Read-only KPIs, **no PHI** — for investors/board |

### Doctor flags (toggleable per shift / per user)
- `on_call` — break-the-glass enabled by default, no admin alert (expected to cover unfamiliar patients)
- `clinical_director` — read across all patients, review co-sign queue, investigate incidents, sign off on quality metrics

### Med Ops license gate
The `Staff` row carries a `clinicalLicense` block. If a licensed Med Ops user is logged in:
- **Has valid Medical / Nursing / Physiotherapy Syndicate ID + non-expired** → can write + sign clinical entries within their license scope (a licensed nurse running ops can sign nursing notes; cannot sign physician orders).
- **No license / expired license** → can draft + edit drafts, but a licensed clinician must sign before the entry becomes part of the legal record. Drafts show "drafted by [Med Ops Name] on behalf of [Clinician]".

This is the same model Athena and Epic use for "clinical documentation specialists / scribes."

---

## 2. Access model — four states × four scopes

Every (role × module) pair has one of four access states:

| State | Meaning |
|---|---|
| **Hidden** | The menu item / section does not appear in the UI |
| **Read** | Can open and view |
| **Write** | Can create or edit (drafts; not yet legally final) |
| **Sign** | Can finalize. After sign, entries are immutable — only amendable via versioned addendum |

And one of four scopes:

| Scope | Meaning |
|---|---|
| **Global** | All patients across the platform |
| **Case-scoped** | Only patients on the user's active FHIR `CareTeam` |
| **Own** | The portal user's own record |
| **Consent-scoped** | Caregiver's slice as defined by FHIR `Consent` resource |

Plus four cross-cutting controls (defined later): **break-the-glass**, **co-sign required**, **two-person rule**, **restricted-tier gate**.

---

## 3. The matrix — Role × Module

Allergies are **not** a separate module — they live in the always-visible **patient header banner** (Epic-style). The data still exists as FHIR `AllergyIntolerance` in Medplum, but there's no allergies tab. See § 12 for rationale.

| Module | Portal User | Nurse | Physio | Doctor | Med Ops *(licensed)* | Med Ops *(unlicensed)* | Insurance Coord | Admin | Compliance | Viewer |
|---|---|---|---|---|---|---|---|---|---|---|
| **Own demographics** | view + **edit** | — | — | — | — | — | — | — | — | — |
| **Patient demographics** (case-scoped clinicians) | — | view assigned | view assigned | view assigned | view + edit global | view + edit global | view (claim fields only) | view + edit global | read | aggregate |
| **Patient banner: allergies + DNR + alerts** | view (consent) | always visible | always visible | always visible | always visible | always visible | hidden | view | view | hidden |
| **Vitals** | view (consent) | **write + sign** | **write + sign** | write + co-sign on red flags | **write + sign** | **draft + edit only** | hidden | read | read | hidden |
| **Nursing notes** | view signed (consent) | **write + sign + amend** | read | read + co-sign | **write + sign + amend** | **draft + edit only** | read signed only | read | read | hidden |
| **Physio notes** | view signed (consent) | read | **write + sign + amend** | read + co-sign | **write + sign + amend** | **draft + edit only** | read signed only | read | read | hidden |
| **Medical notes** | view signed (consent) | read | read | **write + sign + amend** | **draft + edit only** *(even licensed nurses cannot sign physician notes)* | **draft + edit only** | read signed only | read | read | hidden |
| **Nursing diagnoses** (NANDA) | view (consent) | **write + sign** | read | read | **write + sign** *(if RN licensed)* | draft only | read signed | read | read | hidden |
| **PT diagnoses** (movement-system) | view (consent) | read | **write + sign** | read | **write + sign** *(if PT licensed)* | draft only | read signed | read | read | hidden |
| **Medical diagnoses** (ICD-10) | view (consent) | read | read | **write + sign** | **draft only** *(even licensed RN — physician scope only)* | draft only | read signed | read | read | hidden |
| **Medication list — prescribe new** | view (consent) | hidden | hidden | **prescribe + sign** | **draft only** | draft only | read | read | read | hidden |
| **Medication — administer / record dose** | view own (consent) | **administer + record** | read | record + sign | **administer + record** | draft only | read | read | read | hidden |
| **Medication reconciliation** | view (consent) | flag discrepancies | flag discrepancies | **reconcile + sign** | flag + draft | flag only | read | read | read | hidden |
| **Lab — order** | view results (consent) | execute standing order | execute standing order | **order + sign** | **draft only** | draft only | read | read | read | hidden |
| **Lab — interpret + report** | view (consent) | read | read | **interpret + sign** | draft only | draft only | read signed | read | read | hidden |
| **Care plan (master)** | view (consent) | progress updates | progress updates | **author + sign** | draft + propose | draft only | read | read | read | hidden |
| **Assessments** (falls, Braden, MMSE) | view (consent) | **write + sign** | **write + sign** | read + sign | **write + sign** *(if licensed)* | draft only | read | read | read | hidden |
| **Care team assignment** | view (own clinicians) | view own | view own | view own | **assign / reassign** | **assign / reassign** | hidden | full | read | hidden |
| **Tasks / handoffs** | hidden | own queue + create | own queue + create | own queue + create | **full board + reassign** | **full board + reassign** | hidden | read | read | hidden |
| **Visits — schedule / reschedule / cancel** | view + request | view own | view own | view own | **full** | **full** | view (claim-linked) | full | read | aggregate |
| **Visit check-in / check-out** (clinician self-action) | view status | **own visits** | **own visits** | **own visits** | view all + override | view all + override | hidden | view all | view | aggregate |
| **Live dispatch board** (Uber-like map) | hidden | hidden | hidden | hidden | **full live view** | **full live view** | hidden | view | view | hidden |
| **Documents** (labs, scans, reports) | view own (consent) | upload + view | upload + view | upload + sign reports | upload + manage | upload + draft | view claim-linked | full | read | hidden |
| **Escalations** | hidden | raise + view own | raise + view own | raise + view own | **triage / close** | **triage / close** | hidden | read | read | hidden |
| **Incident reports** | hidden | file + read own | file + read own | file + read own + sign | **triage + close** | draft only | read claim-relevant | read | **read all** | hidden |
| **Communications** (in-platform msgs) | view (consent) | send / receive | send / receive | send / receive | send / receive | send / receive | send claim-related | read | read | hidden |
| **Consent records** (caregiver scopes) | view own | view | view | view | grant / revoke | grant / revoke | view (for claims) | full | read | hidden |
| **Restricted-tier data** (mental health, HIV, reproductive, DV) | view own | gated re-auth | gated re-auth | gated re-auth | hidden by default | hidden by default | hidden | hidden by default | **read all** | hidden |
| **Standing orders** (doctor's pre-auth panel) | hidden | execute | execute | **author + sign** | execute on behalf | draft only | hidden | read | read | hidden |
| **Controlled-substance ledger** (EDA) | view own scripts | record administration | hidden | **prescribe + sign + reconcile** | hidden | hidden | hidden | read | **read all** | hidden |
| **Billing / Invoices** | view own | hidden | hidden | hidden | view only | view only | view + draft claim | **full** | read | hidden |
| **Provider payouts** | hidden | view own | view own | view own | view only | view only | hidden | **full** | read | hidden |
| **Insurance claims / pre-auth** | view own claim status | flag claim-relevant | flag claim-relevant | sign claim attestation | **full draft + submit** | draft only | **full draft + submit** | full | read | hidden |
| **Promocodes / pricing** | hidden | hidden | hidden | hidden | view | view | hidden | **full** | read | hidden |
| **Audit log** | hidden | hidden | hidden | hidden | hidden | hidden | hidden | view | **full read** | hidden |
| **Staff / user mgmt + role grants** | hidden | hidden | hidden | hidden | hidden | hidden | hidden | **full** | read | hidden |
| **Aggregate KPIs / dashboards** | hidden | own metrics | own metrics | own metrics | full ops view | full ops view | claims metrics | full | full | **read all (no PHI)** |

---

## 4. Discipline-bound authorship — the hard rule

The **type** of note/diagnosis/assessment is bound to the author's licensed discipline. The UI must not show options the user cannot legally author.

| Author discipline | Can author |
|---|---|
| Nurse | Nursing notes, NANDA diagnoses, vitals, nursing assessments (Braden, falls risk), medication administration records |
| Physio | Physio notes, movement-system diagnoses, gait/ROM/strength assessments, exercise progress |
| Doctor | Medical notes, ICD-10 diagnoses, prescriptions, lab orders, lab interpretations, care-plan authorship, standing orders |

This is enforced **server-side** in `actions.ts`. A nurse calling `signMedicalNoteAction` must be rejected even if the request reaches the server. UI hiding is convenience; server enforcement is the law.

---

## 5. Solo-visit standing orders

Home care in Egypt frequently runs solo visits. The clinician on site must be empowered to close the visit alone — without breaking the licensure boundary.

**Doctor pre-authorizes a `StandingOrder` panel** per patient (or per care plan):

- **Lab panel:** "Order CBC + electrolytes + CRP if temp > 38.5°C or new confusion"
- **PRN meds:** "Paracetamol 1g PO q6h PRN fever or pain"
- **Vitals frequency:** "Vitals q4h while febrile"
- **Escalation thresholds:** "Call MD if SBP < 90 or > 180, HR > 120, SpO2 < 92%"

A nurse or physio on a solo visit can **execute** these orders without per-visit MD approval. The execution is logged and shows "executed under standing order #SO-2026-0041 signed by Dr. X on YYYY-MM-DD".

What **never** delegates:
- **Prescribing new medications** — Doctor only
- **Authoring or amending the master care plan** — Doctor only
- **Signing medical (ICD-10) diagnoses** — Doctor only
- **Interpreting lab results into the chart** — Doctor only

---

## 6. Sensitive (Restricted) segments — day 1

The following FHIR resources are tagged `restricted` and gated:

- Mental health (psychiatric diagnoses, psych notes)
- HIV / STI
- Reproductive health (pregnancy outcomes, contraception, abortion)
- Domestic violence / safeguarding
- Substance use disorders

**Behavior:**

- **Hidden by default** in the patient overview for any clinician who is not the treating clinician on the relevant care team.
- Treating clinicians see them normally; non-treating clinicians see a "restricted" badge and a "request access" button.
- Opening a restricted resource requires a typed **reason** (free text, persisted) + an audit-log entry tagged `RESTRICTED_ACCESS`.
- **Admin cannot see restricted content by default.** Only Compliance Officer has standing access.
- Portal Users always see their own restricted data.
- Caregivers see restricted data **only if** the FHIR `Consent` explicitly includes `restricted` scope (off by default, opt-in per resource type).

This is Epic's "Sensitive" tier and is critical for MENA where social stigma can cause real-world harm if leaked.

---

## 7. Field operations — the Uber-like layer

This is what separates Anees from every global EHR. **Nurse, Physio, Doctor** operating in the field all share the same field-ops layer.

### 7.1 Visit lifecycle (state machine)

```
scheduled
   │  (Med Ops assigns clinician + sends notification)
   ▼
acknowledged              ← clinician confirms they'll go
   │
   ▼
en_route                  ← clinician taps "Start travel"; geolocation enabled
   │
   ▼
arrived                   ← clinician within geofence radius of patient address (auto) or manual override
   │
   ▼
checked_in                ← clinician confirms identity, starts encounter; vitals/notes can be entered
   │
   ▼
checked_out               ← clinician taps "Complete visit"; geolocation captured; encounter signed
   │
   ▼
completed
```

Branches: `cancelled`, `no_show`, `rescheduled`, `escalated_in_visit` (handoff to MD telemed).

### 7.2 Check-in rules

- Check-in **requires** the clinician's device to be within the patient's `handoffGeofenceRadiusMeters` of the patient's `gpsLatitude/gpsLongitude` **OR** a Med Ops manual override (logged, requires reason).
- Default geofence radius: **150m** (patient field already exists in schema — `Patient.handoffGeofenceRadiusMeters`).
- Time stamp: `checkInAt` + `checkInLat` + `checkInLng` + `checkInAccuracyMeters`.
- A late check-in (> 15 min past scheduled time without `en_route` ping) auto-creates a Med Ops task.

### 7.3 Check-out rules

- Check-out **requires** at least one signed clinical entry for the visit (vitals OR note OR assessment).
- Captures `checkOutAt` + `checkOutLat` + `checkOutLng`.
- Visits < 5 minutes flagged for Med Ops review.
- Visits where check-out distance from check-in is > 500m flagged (possible fraud or genuine emergency transport — must be reviewed).

### 7.4 Live location during shift

- Location tracking is **shift-scoped, not all-day**. Clinician is tracked from `en_route` → `checked_out`, not 24/7.
- **Explicit consent in employment contract** + in-app consent at first login + ability to see one's own location history.
- Tracking is **paused** during legally-defined break windows (configured per clinician schedule).
- Stored in a separate `VisitLocationPing` table (heartbeat every 30 seconds while `en_route`/`arrived`), purged after 90 days unless a dispute references it.

### 7.5 Dispatch (Med Ops view)

- Live map of every active clinician (en_route + arrived + checked_in) + every pending visit pin.
- Drag-and-drop reassignment.
- Auto-suggest reassignment if a visit will be > 30 min late based on current clinician travel time.
- Push notification to clinician on reassignment.

### 7.6 Schedule view (clinician self-view)

Each field clinician sees their own day:
- Today's visits (chronological, with map preview)
- Tap a visit → patient banner, allergies, DNR, prior visit summary, standing orders for this patient
- One-tap "Start travel" → triggers `en_route` state + opens device navigation
- Inline vitals entry + note entry (offline-capable PWA — sync on reconnect)
- Daily summary at end of shift: visits completed, payout earned, hours worked

### 7.7 Permissions for location access

- **Clinician self:** sees own current + historical location
- **Med Ops:** sees all clinicians' current + 24h history
- **Admin:** sees all (audited)
- **Compliance:** sees all (audited)
- **Patient:** sees only "your clinician is X minutes away" during `en_route` (Uber-style ETA, no map of clinician's actual position)
- **Doctor / Nurse / Physio (peers):** cannot see each other's locations

---

## 8. Workflow automations

These are server-side rules that fire on data changes. They are part of the EHR's "intelligence" — without them, we're just a CRUD app.

| Trigger | Automation |
|---|---|
| Nurse signs note tagged `fall_event`, `med_error`, `controlled_substance`, or `refusal_of_care` | Auto-creates Doctor co-sign task with 24h SLA; escalates to Med Ops if breached |
| Vitals outside thresholds (configured in `lib/config/nursing-ops-policy.ts`) | Auto-creates alert → Doctor on care team + Med Ops; SMS + push |
| Check-in not detected within 15 min of scheduled time | Med Ops task |
| Check-out distance > 500m from check-in | Med Ops review task |
| Restricted-tier resource opened by non-treating clinician | Audit log + Compliance Officer notification (weekly digest unless > 5/week) |
| Break-the-glass invoked | Real-time alert to Admin + Compliance; weekly review meeting |
| Patient demographics change (insurance fields) | Insurance Coordinator notified to re-verify coverage |
| Invoice > X EGP voided | Two-person rule: requires second Admin approval before commit |
| Med list shows interaction (LOINC/RxNorm cross-check) | Soft warning to prescribing Doctor at sign time |
| Visit completed with no vitals entered for high-risk patient | Med Ops task |
| Standing order expired (180 days default) | Doctor notification to renew |
| Caregiver consent expires | Portal access auto-revokes; patient + Med Ops notified |

---

## 9. Egypt regulatory overlay

What the EHR must honor on day one to operate legally and survive insurance audits in Egypt.

| Authority | Requirement | EHR implementation |
|---|---|---|
| **Egyptian Medical Syndicate** | Physician must have valid syndicate ID; appears on all signed prescriptions and claims | `Staff.clinicalLicense` block; rendered on PDF outputs |
| **Egyptian Nursing Syndicate** | RN syndicate ID for nursing care attestation | Same field |
| **Egyptian Physiotherapy Syndicate** | PT syndicate ID | Same field |
| **EDA (Egyptian Drug Authority)** | Controlled substance register with serialized prescription numbers, prescriber ID, patient ID, quantity, balance | `ControlledSubstanceLedger` table; immutable; serialized; exportable to MoH format |
| **UHIA (Universal Health Insurance)** | Pre-auth for expensive items; ICD-10 + procedure codes on claims; physician syndicate on attestation | Claims module + pre-auth workflow |
| **Private insurers** (Bupa, AXA, MetLife, Misr) | Direct-billing protocols; signed physician attestation; structured diagnosis + procedure codes | Insurance Coordinator surface + claims model |
| **GAHAR** (Egyptian JCI-equivalent accreditation) | Full audit trail (read AND write); separation of duties; sensitive-data tier; co-sign rules | All requirements in this doc |
| **MoH** | Serious adverse event report within 24h; in-home death report within 24h | Incident workflow with `requires_moh_report` tag |
| **DPL 151/2020** (Egypt's GDPR) | Lawful basis, consent records, right to access, breach notification, data residency | Consent module + audit log + (planned) OVH Bahrain hosting |

**Data residency note:** OVH Bahrain migration is on the roadmap (see [`EHR_NOW.md`](./EHR_NOW.md)). Until done, Hostinger EU is a temporary risk to flag with hospital partners.

---

## 10. Insurance & claims model

Egyptian insurance has two operational modes; the EHR supports both:

**Direct billing (in-network):** Patient shows insurance card → we verify eligibility → we submit pre-auth if needed → we deliver service → we submit claim → insurer pays us. Patient pays only co-pay/deductible.

**Reimbursement (out-of-network):** Patient pays full → we provide an itemized signed invoice + clinical summary → patient submits to their insurer → insurer reimburses patient.

### Claim data requirements (per insurer, configurable)
- Patient demographics + national ID
- Insurance member ID + policy number + expiry
- ICD-10 diagnosis codes (structured, not free text)
- Procedure codes (CPT or MoH code, configurable per insurer)
- Signed physician attestation with syndicate ID
- Visit timestamps (check-in/out from field ops)
- Pre-auth reference number (if applicable)
- Itemized line items (service + price + qty)

### Models to add
- `InsurerProfile` — per-insurer config (code system, pre-auth rules, direct vs reimbursement)
- `Claim` — header (status, amount, dates, insurer ref)
- `ClaimLineItem` — each billable item
- `PriorAuth` — pre-authorization requests + status
- `Coverage` — FHIR `Coverage` mirror per patient

---

## 11. Navigation / IA — what each role sees

The **tab list rendered in the UI is computed from the role**. A doctor never sees the Insurance Claims tab. An Insurance Coordinator never sees Care Plan authoring.

### 11.1 Portal User (patient or caregiver, consent-scoped)

URL: `/[locale]/portal?tab=...`

| Tab | Visible when |
|---|---|
| **Overview** | Always |
| **Visits** | Consent `visits` |
| **Vitals** | Consent `vitals` |
| **Notes** (signed only) | Consent `notes` |
| **Tasks** (mine) | Consent `tasks` |
| **Care Team** | Always |
| **Care Plan** | Consent `notes` |
| **Documents** | Consent `notes` |
| **Medications** | Consent `notes` |
| **Insurance & Bills** | Always (own) |
| **Caregiver Access** *(manage consents)* | Patient only, not caregivers |
| **Profile & Demographics** *(edit)* | Patient only, not caregivers |
| **Settings** *(PWA, push, language)* | Always |

### 11.2 Nurse / Physio / Doctor — workspace (clinician app)

URL: `/admin/clinician` *(new — to be built; see § 16)*

| Tab | All three | Notes |
|---|---|---|
| **My Day** | ✅ | Today's schedule + map + check-in flow |
| **My Patients** | ✅ | Case-scoped list of currently assigned patients |
| **Patient Detail** | ✅ | Full clinical chart for one patient (banner + tabs) |
| **Tasks** | ✅ | My queue (co-signs due, handoffs, restricted-access requests) |
| **Standing Orders** | ✅ | View (all), author (doctor only) |
| **Messages** | ✅ | In-platform comms |
| **Escalations** | ✅ | Raise, view own |
| **Reports** *(my metrics)* | ✅ | Visits/week, signed notes, late check-ins, payout |
| **Schedule** *(view, request swaps)* | ✅ | Read; swap requests go to Med Ops |
| **Knowledge Base / Standing Order Library** | ✅ | Reference content |

#### Patient Detail tabs (rendered inside Patient Detail)

The current admin patient page lists **14 tabs**. Proposed cleanup → **9 tabs** + always-visible banner:

| Current tab | Decision |
|---|---|
| Overview | **Keep** |
| Clinical | **Merge into Overview banner + dedicated Diagnoses tab** |
| Documents | **Keep** |
| Labs & Imaging | **Keep** |
| Assessments | **Keep** |
| Consent | **Merge into Care Team tab** (caregiver consents live with care team) |
| Visits | **Keep** |
| Vitals | **Keep** |
| Notes | **Keep** |
| Care Team | **Keep** (absorb Consent sub-section) |
| Coordination | **Merge into Tasks** |
| Scheduling | **Merge into Visits** |
| Tasks | **Keep** (absorb Coordination) |
| Reports | **Keep** (rename → "Activity & Audit") |

**Final patient detail tab list (9):** Overview · Diagnoses · Vitals · Notes · Visits · Labs · Assessments · Documents · Care Team · Tasks · Activity

**Always-visible patient banner (top of every tab):**
- Name + Arabic name + age + gender + photo
- **Allergies (red badge)** — Epic-style, never hidden
- **DNR status** (orange badge if `dnr`)
- Active diagnoses (top 3)
- Active medications count
- Active care plan name
- Restricted-tier indicator (lock icon if patient has any restricted resources)
- Insurance status + last verified date
- "Restricted record" badge if patient is opted-in to extra protection

### 11.3 Medical Ops

URL: `/admin/ops`

| Tab |
|---|
| **Live Dispatch** (the map) |
| **Today's Visits** |
| **Clinician Roster** |
| **Care Team Management** |
| **Tasks (all open)** |
| **Escalations** |
| **Incident Reports** |
| **Standing Orders Library** |
| **Patient Directory** |
| **Reports / KPIs** |
| **Communications** |

### 11.4 Insurance Coordinator

URL: `/admin/insurance`

| Tab |
|---|
| **Claims Pipeline** (by status: draft → submitted → adjudicating → paid/denied) |
| **Pre-Authorizations** |
| **Insurer Directory** |
| **Coverage Verification Queue** |
| **Patient Insurance Records** |
| **Denied Claims (work queue)** |
| **Reports** |

### 11.5 Admin

URL: `/admin`

| Tab |
|---|
| **Dashboard** (KPIs) |
| **Finance** (invoices, payments, expenses, payouts, P&L) |
| **Patients** |
| **Staff & Roles** |
| **Providers & Doctors (public profiles)** |
| **Booking Funnel & Promocodes** |
| **Pricing & Services** |
| **Areas & Coverage** |
| **Audit Log** |
| **System Settings** |
| **Tenants / Hospital Partners** *(flag for later)* |

### 11.6 Compliance Officer

URL: `/admin/compliance`

| Tab |
|---|
| **Audit Log** (full read, filterable) |
| **Break-the-Glass Events** |
| **Restricted Access Log** |
| **Incident Reports** |
| **Co-sign SLA Breach Report** |
| **Data Export Log** (every PDF export tracked) |
| **Access Review** (who has what role, last login) |

### 11.7 Hospital Partner Admin *(phase 2)*

URL: `/partner/[tenantId]`

| Tab |
|---|
| **Referred Patients** (only their referrals) |
| **Outcomes & Quality Metrics** |
| **Aggregate Reports** |
| **Their Staff Activity** (if their clinicians use our platform) |

### 11.8 Viewer

URL: `/admin/board`

| Tab |
|---|
| **Business KPIs** (revenue, growth, retention) |
| **Operational KPIs** (visits/week, NPS, on-time rate) |
| **Geographic Coverage** |

Strictly no PHI. Aggregated counts only. Names, addresses, diagnoses never visible.

---

## 12. Why allergies live in the banner, not a tab

Removing the allergies *tab* but keeping allergies *prominently visible everywhere* is the safer pattern:

- A nurse signing a medication while looking at the meds tab cannot click away to check allergies. The banner stays in view.
- Epic, Cerner, Athena all use a persistent allergy banner. It's a patient-safety standard.
- The FHIR `AllergyIntolerance` resources still exist in Medplum (`src/lib/medplum/allergies.ts` already implements them). Nothing is removed from the data model — only the dedicated tab is collapsed into the banner.

If the founder wants the allergies module *truly* gone (no data, no banner), that is a clinical-safety decision that should be made explicitly, in writing, with the medical director's sign-off. The recommendation in this document is **keep the data, kill the tab, surface in banner**.

---

## 13. Security hardening — the 12 controls

These apply across all roles. Each is non-negotiable for a regulated EHR.

| # | Control | Where it lives |
|---|---|---|
| 1 | **Sign = immutable** | After `Composition.status = final`, no UPDATE allowed; only versioned `amend` |
| 2 | **Break-the-glass** | Override case-scope with typed reason; real-time alert to Admin + Compliance |
| 3 | **Co-sign rules** | Auto-task on flagged note types (falls, controlled meds, refusal of care) |
| 4 | **Discipline-bound authorship** | Server enforces author license type against entry type |
| 5 | **Restricted-tier gate** | Extra re-auth + reason for non-treating clinician access; logged loudly |
| 6 | **Separation of duties** | Admin in user-mgmt/finance mode cannot view PHI in same browser session — forces context switch |
| 7 | **Two-person rule** | Voiding visit, deleting document, refunding > 5,000 EGP → second Admin approval |
| 8 | **Session timeouts** | Clinical 5min · Admin 15min · Portal 30min. Re-auth on resume |
| 9 | **PHI export watermarking** | Every PDF/print carries viewer name + timestamp + patient MRN in footer |
| 10 | **Device + IP anomaly step-up** | New device → WhatsApp OTP. Impossible-travel pattern → block + alert |
| 11 | **Consent scopes per-resource + per-duration** | Patient grants caregiver "vitals only, 30 days" → auto-revoke |
| 12 | **No PHI in logs** | Lint + PR review; structured logger strips known PHI fields |

---

## 14. Audit log — what must be logged

Every row in `AuditLog` already captures: table, recordId, action, changedFields, prev, new, changedBy, timestamp. Gaps to close:

- **Read events on restricted resources** — currently not logged (we only log writes). Required for GAHAR.
- **Login events** — staff login logs are missing (`src/auth.ts` line ~104 TODO). Add.
- **Break-the-glass invocations** — needs explicit `auditAction: 'override'` enum value + reason field.
- **PDF/document exports** — currently no audit row when a clinician downloads a lab PDF via `/api/ehr/documents/[id]`. Add.
- **Failed access attempts** — when an unauthorized user tries to open a patient (403). Add.
- **Role grant changes** — already covered by writeMedplumAuditMirror in clinical paths but not for `Staff.role` mutations from Admin. Add.

Schema change: add `AuditAction` enum values `read`, `override`, `export`, `access_denied`, `login`, `logout`.

---

## 15. Multi-tenancy — what to do now

The hospital MOU means a real tenant is coming. Decision: **prepare the schema now, don't build UI yet.**

### Schema additions (low-cost now, high-cost later)

```prisma
model Tenant {
  id              String   @id @default(cuid())
  code            String   @unique
  name            String
  contactEmail    String?
  status          TenantStatus @default(active)
  isPlatform      Boolean  @default(false)  // The "Anees default" tenant
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum TenantStatus {
  active
  suspended
  archived
}
```

Add `tenantId` (nullable for now, default to "platform") to:
- `Patient` · `Staff` · `Provider` · `Visit` · `CarePlan` · `Invoice` · `OnlineBooking`

Add a new role `hospital_partner_admin` to `StaffRole` enum. Scope: their tenant only.

Don't build the partner UI yet. Just make sure we can backfill `tenantId='platform'` for existing rows, and start writing new tenant-aware queries.

---

## 16. Current state audit — what exists today

### ✅ Already in place (do not rebuild)

| Area | What's there |
|---|---|
| Roles enum | `superadmin, admin, operator, doctor, physiotherapist, nurse, finance, viewer` in `prisma/schema.prisma:115` |
| RBAC helpers | `src/lib/auth/rbac.ts` — `getStaffUser`, `CLINICAL_ROLES`, `CASE_SCOPED_CLINICAL_READ_ROLES`, `staffHasRole` |
| Patient model | Demographics, GPS (`gpsLatitude`/`gpsLongitude`), `handoffGeofenceRadiusMeters`, `temporarilyAwayUntil`, DNR, insurance fields, caregiver fields, soft-delete |
| Visit model | Status enum, scheduled date/time, provider link, area, type, pricing |
| NurseShiftAssignment | Primary + incoming nurse, acknowledgement, escalation task linkage |
| Staff model | `medplumPractitionerId`, `providerId`, `lastLoginAt`, password hash |
| Audit log | Generic `AuditLog` table with prev/new JSON; `writeMedplumAuditMirror` for clinical writes |
| Medplum integration | 24 modules in `src/lib/medplum/` covering Patient, Practitioner, Encounter, Observation, Condition, AllergyIntolerance, MedicationRequest, MedicationAdministration, Assessment, ClinicalNote (Composition), CarePlan, CareTeam, Task, Communication, Consent, DocumentReference+Binary, ServiceRequest+DiagnosticReport |
| 30 admin server actions | Visits, vitals, notes (draft + sign), care team, tasks, nursing reports, physio reports, conditions, allergies, meds, med administration, incidents, documents, labs, assessments, communications, escalations, appointments, shift handoffs, geo policy, caregiver consent, demographics |
| Patient portal | 8-tab workspace with consent-scoped rendering (`src/app/[locale]/portal/page.tsx`) |
| Admin patient detail | 14-tab workspace (`src/features/ehr/admin-patient/page-view.tsx`) |
| Caregiver consent system | `src/lib/medplum/consents.ts` + `consent-policy.ts` |
| Document streaming | `/api/ehr/documents/[id]` with RBAC + consent check |
| Nurse shift handoff with geolocation | `NursingHandoffLocationCapture.tsx` already in admin-patient module |
| Audit-log mirror | `writeMedplumAuditMirror` for every clinical Medplum write |
| Rate limiting | `RateLimit` table + helper |
| Coverage analytics | `CoverageCheck` table with hashed IP |
| Promocodes | `Promocode` table + booking funnel integration |
| Doctors (public) | `Doctor` table — bilingual profiles, replaces JSON |
| Push notifications | VAPID via `PushSubscription` table |

### 🟡 Partially in place

- Audit on writes is mirrored from Medplum; **read events + login events + export events not yet logged**
- Zod validation in EHR schemas folder, not on every API route
- Allergies module exists in Medplum but no banner UI yet
- `Patient.handoffGeofenceRadiusMeters` exists but check-in/out flow doesn't yet enforce it
- One geo-aware action already exists (nursing handoff) — needs generalization to visit check-in/out

### ❌ Missing entirely

Listed in § 17 below.

---

## 17. What to remove

| Item | Reason |
|---|---|
| `StaffRole.finance` | Merged into `admin` |
| `StaffRole.operator` | Rename → `medical_ops` to reflect actual scope |
| `ENABLE_ADMIN_DASHBOARD` env flag | Legacy dev-only; auth is now real gating |
| `STORAGE_PROVIDER` env flag + `src/lib/storage/` placeholder | Medplum manages Binary storage; dead code |
| `STORAGE_LOCAL_SIGNING_SECRET`, `STORAGE_LOCAL_ROOT` env vars | Same as above |
| `src/app/caregiver/*` scaffolding folders | Already deleted; CLAUDE.md mention is stale and should be updated |
| Allergies as a dedicated tab in admin patient detail | Replace with always-visible banner |
| `Coordination` tab in admin patient detail | Merge into `Tasks` |
| `Scheduling` tab in admin patient detail | Merge into `Visits` |
| `Consent` tab in admin patient detail | Merge into `Care Team` |
| `Clinical` tab in admin patient detail | Split into banner + a new `Diagnoses` tab |
| Free-text diagnoses (currently `Condition.code.text` only) | Require structured ICD-10 / NANDA / PT code |

---

## 18. What to add — sequenced gap list

### Phase 1 — Foundation (sprint 1–2)

1. **Schema changes**
   - Rename `StaffRole.operator` → `medical_ops`
   - Remove `StaffRole.finance` (migrate existing finance users → `admin`)
   - Add `StaffRole.medical_ops`, `insurance_coordinator`, `compliance_officer`, `hospital_partner_admin`
   - Add `clinicalLicenseType`, `clinicalLicenseNumber`, `clinicalLicenseExpiry`, `licenseIssuingBody` to `Staff`
   - Add `tenantId` (nullable, default 'platform') to `Patient`, `Staff`, `Provider`, `Visit`, `CarePlan`, `Invoice`, `OnlineBooking`
   - Create `Tenant` model
   - Extend `AuditAction` enum with `read`, `override`, `export`, `access_denied`, `login`, `logout`
   - Migration name suggestion: `add-license-tenant-roles`

2. **RBAC refactor (`src/lib/auth/rbac.ts`)**
   - Update `CLINICAL_ROLES` and `CLINICAL_WRITE_ROLES` for new enum
   - Add `isLicensedMedOps(user)` helper
   - Add `canSignClinical(user, discipline)` helper
   - Add `isRestrictedTierEligible(user, patientId)` helper

3. **Always-visible patient banner**
   - Build `<PatientBanner />` component with allergies, DNR, restricted indicator
   - Render at top of every admin patient tab + portal patient view

4. **Login + export audit events**
   - Wire login event in `src/auth.ts` (staff-credentials.authorize, patient-credentials.authorize, google profile)
   - Wire export event in `/api/ehr/documents/[id]`

### Phase 2 — Field Operations (sprint 3–4)

5. **Visit check-in / check-out flow**
   - New states on `Visit`: `acknowledged`, `en_route`, `arrived` (or use separate `VisitWorkflowState` table for granularity)
   - New `VisitLocationPing` table for heartbeat tracking
   - Server actions: `acknowledgeVisitAction`, `startTravelAction`, `checkInAction`, `checkOutAction`
   - Geofence enforcement using existing `Patient.handoffGeofenceRadiusMeters`
   - Auto-task creation for late check-ins
   - Portal-side "your clinician is X min away" view

6. **Clinician workspace app (`/admin/clinician`)**
   - "My Day" page with map + visit list
   - Patient detail (re-use admin patient with role-scoped tabs)
   - Offline-capable PWA shell (vitals + notes work offline, sync on reconnect)

7. **Med Ops live dispatch board (`/admin/ops`)**
   - Live map of active clinicians + pending visits
   - Drag-and-drop reassignment
   - ETA + late-warning alerts

### Phase 3 — Clinical Safety (sprint 5–6)

8. **Discipline-bound authorship**
   - Add `discipline` field to ClinicalNote / Condition / Assessment writes
   - Server-side enforcement in `actions.ts`
   - UI: hide options the user cannot author

9. **Sign-immutability + amend workflow**
   - On `Composition.status = final`, lock updates
   - Add `amendClinicalNoteAction` that creates a new versioned Composition referencing the original

10. **Co-sign automation**
    - Tag notes with `requires_cosign` based on content keywords/structured fields
    - Auto-create Doctor task with 24h SLA
    - SLA sweep extends existing `runEscalationSlaSweepAction`

11. **Restricted-tier gating**
    - Tag FHIR resources with `restricted` security label
    - Server-side filter in all clinical read modules
    - Reason-required modal in UI
    - Audit log entry per access

### Phase 4 — Regulatory & Insurance (sprint 7–8)

12. **Standing orders**
    - New `StandingOrder` table linked to `Patient` + `CarePlan`
    - Doctor authoring UI
    - Nurse/Physio execution flow at check-in

13. **Controlled-substance ledger**
    - New `ControlledSubstanceLedger` table (immutable, serialized)
    - Prescriber syndicate ID enforced
    - Export to MoH format

14. **Insurance & claims**
    - `InsurerProfile`, `Coverage`, `PriorAuth`, `Claim`, `ClaimLineItem` models
    - Insurance Coordinator workspace at `/admin/insurance`
    - ICD-10 + procedure code structured fields on diagnoses/visits

15. **Break-the-glass**
    - Reason-required override modal
    - Real-time push to Admin + Compliance
    - Weekly review report

### Phase 5 — Compliance & Multi-tenancy (sprint 9–10)

16. **Compliance Officer workspace (`/admin/compliance`)**
    - Full audit log read interface (filter by user/patient/date/action)
    - Break-the-glass event log
    - Restricted access log
    - Co-sign SLA breach report
    - Data export log
    - Access review (who-has-what)

17. **Two-person rule**
    - On void invoice / delete document / refund > 5,000 EGP
    - Second Admin approval flow (in-app notification + token)

18. **Separation of duties**
    - Admin in user-mgmt or finance mode → blocks PHI reads in same session
    - Context-switch modal on attempt

19. **Watermark + PHI export tracking**
    - PDF generator adds watermark footer (user, timestamp, MRN)
    - Audit log entry per export

20. **Hospital Partner Admin (UI later, schema now)**
    - Tenant-scoped queries everywhere
    - Build `/partner/[tenantId]` shell only after first MOU patient referral

### Phase 6 — Observability & Hardening (parallel)

21. **Sentry + structured logging** (web + server)
22. **Vitest + Playwright** — start with clinical write paths
23. **OVH Bahrain migration** (separate doc: `EHR_NOW.md`)

---

## 19. Schema changes — consolidated summary

```prisma
// ENUM CHANGES
enum StaffRole {
  superadmin                 // KEEP
  admin                      // KEEP (absorbs finance)
  medical_ops                // RENAMED from operator
  doctor                     // KEEP
  physiotherapist            // KEEP
  nurse                      // KEEP
  insurance_coordinator      // NEW
  compliance_officer         // NEW
  hospital_partner_admin     // NEW (schema-only for now)
  viewer                     // KEEP
  // REMOVED: finance, operator
}

enum AuditAction {
  create
  update
  delete
  read              // NEW — for restricted-resource reads
  override          // NEW — break-the-glass
  export            // NEW — PDF/Binary downloads
  access_denied     // NEW — 403 attempts
  login             // NEW
  logout            // NEW
}

enum TenantStatus { active suspended archived }

enum LicenseType {
  medical_syndicate
  nursing_syndicate
  physiotherapy_syndicate
  pharmacy_syndicate     // for future
  none
}

// NEW MODELS
model Tenant { ... }
model StandingOrder { ... }
model VisitLocationPing { ... }
model ControlledSubstanceLedger { ... }
model InsurerProfile { ... }
model Coverage { ... }
model PriorAuth { ... }
model Claim { ... }
model ClaimLineItem { ... }

// EXTENSIONS TO Staff
model Staff {
  // ...existing fields...
  clinicalLicenseType     LicenseType?
  clinicalLicenseNumber   String?
  clinicalLicenseExpiry   DateTime?
  licenseIssuingBody      String?
  isOnCall                Boolean @default(false)
  isClinicalDirector      Boolean @default(false)
  tenantId                String  @default("platform")
}

// EXTENSIONS TO Visit
model Visit {
  // ...existing fields...
  acknowledgedAt    DateTime?
  enRouteAt         DateTime?
  arrivedAt         DateTime?
  checkInAt         DateTime?
  checkInLat        Decimal? @db.Decimal(10, 7)
  checkInLng        Decimal? @db.Decimal(10, 7)
  checkInAccuracyM  Int?
  checkOutAt        DateTime?
  checkOutLat       Decimal? @db.Decimal(10, 7)
  checkOutLng       Decimal? @db.Decimal(10, 7)
  tenantId          String   @default("platform")
}

// TENANT SCOPING (add nullable, default 'platform')
// Patient, Provider, CarePlan, Invoice, OnlineBooking → add tenantId String @default("platform")
```

---

## 20. Open decisions / parked items

| # | Decision | Status | Owner |
|---|---|---|---|
| 1 | Allergies tab — remove and put in banner, OR remove the data entirely | **Recommendation: banner, do not remove data** — needs founder sign-off if disagree | Founder |
| 2 | Default geofence radius (currently per-patient field exists; what's the system default?) | 250m proposed | Med director |
| 3 | Co-sign SLA — 24h proposed for routine, 4h for high-risk (falls/controlled meds) | Med director |
| 4 | Visit-too-short threshold | 10 min proposed | Med Ops lead |
| 5 | Late check-in alert threshold | 25 min proposed | Med Ops lead |
| 6 | Restricted-tier definition — final list of conditions/diagnoses that auto-restrict | Phase 3 | Med director + legal |
| 7 | Insurance Coordinator scope — also calls patients, or pure backend? | TBD | Founder |
| 8 | Hospital Partner Admin — when do we actually build the UI? | After first signed referral arrives | Founder |
| 9 | Mobile-first clinician app — PWA only, or native (Expo) eventually? | PWA day-one, native later per CTO_STRATEGY | CTO |
| 10 | Two-person-rule threshold for refunds | 5,000 EGP proposed | Founder + finance |

---

## 21. How to use this document

1. **Before adding a new role or permission:** update this doc first, then code.
2. **Before adding a new clinical resource type:** add a row to the matrix in § 3.
3. **Before changing tab structure:** update § 11.
4. **Before relaxing a security control:** discuss with Compliance Officer + Founder; document the why in § 13.
5. **Before merging a PR that touches `rbac.ts`, `actions.ts`, or a Medplum module:** confirm the change matches this doc.

This doc is meant to be read by a senior engineer, a medical director, and an insurance auditor and produce the same understanding. If any of those three would walk away confused, fix the doc.

---

*End of EHR_ROLE_MATRIX.md*
