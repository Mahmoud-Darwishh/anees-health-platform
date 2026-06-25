# Anees Health — Product / Clinical Launch Audit (v3 — **Medical & Clinician-Flow Focus**)

> **Date:** 2026-06-19 · **Re-run of** `docs/PRODUCT_LAUNCH_AUDIT.md` (v2, same day) · **Read-only audit, no code changed.**
> **Focus this round (owner's request):** the **medical core** — for each clinical role, *what screen opens first, how they navigate, what they should and shouldn't see*, and what to build/fix next for our **own home-care EHR** (B1). Hospital (B2) and insurance/claims are explicitly out of scope here.
> **Audience:** the owner (plain language first); every finding carries a file link an engineer can act on.
> **Verification method:** I read the actual code (routing, RBAC matrix, each clinician workspace, the chart, the clinical write-actions, the malware/readiness seams, the money loop). Where I say "verified," I traced it in code; where I say "assumed," I did not run it.

---

## 0. One-paragraph verdict

**The clinical engine is now genuinely multi-discipline, and it moved a long way since this morning's v2 audit.** v2 said "only physio has a finished journey, nurse and doctor don't exist, you can't even create staff." That is no longer true: there is now a **nurse field workspace**, a **doctor review-&-sign workspace**, a **staff-onboarding UI**, **separated staff login + password reset**, an **InstaPay confirmation queue + refunds**, and **coverage-gated booking**. The RBAC matrix is excellent and is now the *single source of truth* that both the screens and the server enforce — discipline boundaries (a nurse can't sign a doctor's note, a physio can't prescribe) are real, not aspirational. **The remaining medical gaps are now specific, not structural:** the **nurse field visit is half-built** (vitals + one assessment, but no nursing note, no medication administration/MAR, no escalation-from-the-field), **no clinician can declare their availability** (so the dispatch board is flying blind), and the **doctor's co-sign / red-flag queue is task-list-only** (they bounce to the full chart to act). None of these block a *small* supervised pilot; all of them block a confident multi-discipline launch. Fix the nurse visit and clinician availability next — those are the two that touch real patient safety and real operations.

---

## 1. WHAT CHANGED since the last audit (the diff)

The v2 audit (same date) is the "before." The code is now the "after," and it is **substantially ahead** of v2's assumptions. This is the most important section — most of v2's blockers are **closed**.

### ✅ Newly complete / newly shipped (v2 said "missing" → code says "done")
| Area | v2 said | Code now | Evidence |
|---|---|---|---|
| **Nurse field app** | "no field-clinician app; build it on the physio template" | **Exists** — Today → visit session → vitals + assessment + check-in/out | [src/app/clinician/nursing/today/page.tsx](src/app/clinician/nursing/today/page.tsx), [NurseSessionView.tsx](src/features/ehr/clinician-nursing/NurseSessionView.tsx), [actions.ts](src/features/ehr/clinician-nursing/actions.ts) |
| **Doctor workspace** | "lands on /admin/patients, missing the worklist layer" | **Exists** — "My Cases" worklist + co-sign/review task queue + profile | [src/app/clinician/doctor/page.tsx](src/app/clinician/doctor/page.tsx), [DoctorWorklistView.tsx](src/features/ehr/clinician-doctor/DoctorWorklistView.tsx) |
| **Staff-management UI (v2 #1 blocker)** | "cannot create staff without a developer" | **Exists** — staff form, role/licence controls, credential-link issuance | [src/features/admin/staff/](src/features/admin/staff/), [src/app/admin/staff/](src/app/admin/staff/) |
| **Staff login separated** | "staff share the patient login page" | **Exists** — dedicated staff login + set-password | [src/app/admin/login/](src/app/admin/login/), [src/app/admin/set-password/](src/app/admin/set-password/) |
| **Password reset** | "prove it before real users" | **Exists** — patient forgot/reset flow | [src/app/[locale]/auth/forgot-password/](src/app/[locale]/auth/forgot-password/), [src/app/api/auth/patient/reset-password/route.ts](src/app/api/auth/patient/reset-password/route.ts) |
| **InstaPay manual-confirm (v2 Gap A)** | "no confirmation workflow; bookings will stall" | **Exists** — InstaPay intake + ops/finance pending-confirm queue | [src/app/api/bookings/payment/instapay/route.ts](src/app/api/bookings/payment/instapay/route.ts), [src/features/admin/billing/data.ts](src/features/admin/billing/data.ts) |
| **Refunds (v2 Gap B)** | "no refund screen" | **Exists** — refunds view + actions | [src/features/admin/billing/RefundsView.tsx](src/features/admin/billing/RefundsView.tsx), [actions.ts](src/features/admin/billing/actions.ts) |
| **Coverage *enforcement*** | "marketing map only; must gate booking" | **Exists** — Cairo+Giza gate blocks out-of-area before payment | [src/app/api/bookings/create/route.ts:78-100](src/app/api/bookings/create/route.ts) |
| **Clinician public-profile self-management** | "read-only; gap" | **Exists** — editor + admin approval queue | [PublicProfileEditor](src/features/admin/profile-requests/PublicProfileEditor.tsx), [profile-requests/](src/features/admin/profile-requests/) |
| **Owner analytics + ops board** | "skeleton only" | **Exists** — analytics view + dispatch board | [src/features/admin/analytics/](src/features/admin/analytics/), [src/features/admin/ops/DispatchBoardView.tsx](src/features/admin/ops/DispatchBoardView.tsx) |
| **`access_denied` audit on every RBAC denial** | "still a gap" | **Done** — every denied policy check writes an audit row | [src/lib/auth/policy/enforce.ts:16-41](src/lib/auth/policy/enforce.ts) |
| **Matrix-driven discipline routing** | n/a (physio-only) | **Done** — workspace dispatch by `workspace.{physio,nursing,doctor}.access` | [src/app/clinician/page.tsx](src/app/clinician/page.tsx), [layout.tsx](src/app/clinician/layout.tsx) |

### 🟡 Newly recommended / newly visible gaps (only surfaced now that the journeys exist)
- **Nurse visit is missing its core clinical tools** — see §3.2. Vitals + one assessment only; **no nursing note, no medication administration (MAR), no field escalation** despite the matrix granting all three.
- **No clinician availability anywhere** — physio, nurse, doctor all lack a "when/where I work" surface; the new dispatch board has nothing real to assign against.
- **Doctor acts only by leaving the workspace** — the worklist "Open chart" link sends them to `/admin/patients/[id]`; there's no in-workspace co-sign/sign panel.
- **Discipline nav is lopsided** — physio has 5 tabs (Journey/Patients/Tasks/Earnings/Profile); nurse has **2** (Today/Profile); doctor has **2** (My Cases/Profile). See §3.

### 🔁 No regressions found
Nothing that v2 marked "done/strong" has gone backwards. The RBAC matrix, soft-delete discipline, audit dual-store, and tab-aware chart loading are all intact.

---

## 2. Launch-readiness scorecard (per surface)

🟢 launch-ready · 🟡 works but thin / needs a pass · 🔴 missing or unsafe for real patients

| Surface | State | Blocker for a clinical pilot? | Note |
|---|---|---|---|
| RBAC matrix + enforcement | 🟢 | No | Single source of truth; UI flags derive from it ([role-scope.ts:62-99](src/features/ehr/admin-patient/role-scope.ts)) |
| Clinical write safety (licence + discipline + scope) | 🟢 | No | Every sign action gated ([actions.ts](src/lib/auth/policy/actions.ts), [vitals-assessments.ts:13-19](src/features/ehr/admin-patient/actions/vitals-assessments.ts)) |
| Patient chart `/admin/patients/[id]` | 🟢 | No | 11 tabs, role-scoped, tab-aware loading |
| Physiotherapist journey | 🟢 | No | The template; session dashboard + outcomes + tasks + earnings |
| **Nurse journey** | 🟡 | **Yes (for nursing cases)** | Field flow exists but missing note/MAR/escalation — §3.2 |
| **Doctor journey** | 🟡 | No (review/sign works) | Acts via chart, not in-workspace; fine for launch, polish later |
| Medical-Ops / Case-Manager (dispatch) | 🟡 | Partial | Board exists; **no availability/capacity feed** to assign against |
| Staff onboarding (admin) | 🟢 | No | Create clinician + role + licence + credential link |
| Auth front door (staff/patient split, reset) | 🟢 | No | Separated logins + reset |
| Money loop (book→pay→confirm→refund) | 🟡 | Partial | Coverage gate ✅, InstaPay queue ✅, refunds ✅; **booking→Visit→invite hand-off not auto** — §4 |
| **Clinician availability / scheduling** | 🔴 | **Yes (for ops)** | Not built for any discipline |
| Malware scan (prod) | 🟡 | Yes (config) | Seam fails-fast if `mock_clean` in prod; real backend is an owner/ops config — §5 |
| Observability (Sentry) | 🟡 | No | Seam only; SDK+DSN pending |

---

## 3. Role-by-role clinical journeys — first screen, navigation, what to show/hide

This is the heart of the medical audit. For each role: **where they land**, **how they move**, **what should and shouldn't appear**, and **what to add/fix**.

Landing is driven by [route-access.ts `ROLE_HOME`](src/lib/auth/route-access.ts:110-131) and the clinician dispatcher ([page.tsx](src/app/clinician/page.tsx)).

---

### 3.1 Physiotherapist — *the gold-standard journey (clone this)* 🟢
- **Lands on:** `/clinician/today` ("My Journey") — today's visits with the next action per visit.
- **Navigation (5 tabs):** My Journey · Patients · Tasks · Earnings · Profile ([ClinicianBottomNav](src/app/clinician/ui/ClinicianBottomNav.tsx:11-17)).
- **The visit flow:** Today → open visit → state transitions (acknowledge → travel → arrived → check-in) → **session workspace** (assessments, coded outcome measures, pain-trend sparklines, template outcome ranking) → check-out. Documentation opens **only when checked-in** ([session data.ts:469](src/features/ehr/clinician-physio/session-workspace/data.ts)).
- **What's right:** worklist → drill-down → document-on-site → sign, all license-gated and case-scoped. The session dashboard ([session-workspace/data.ts](src/features/ehr/clinician-physio/session-workspace/data.ts)) is genuinely sophisticated.
- **Should NOT see:** other clinicians' patients (enforced — `providerId` scope), prescribing, billing internals. ✅ correct.
- **Enhance next:** (a) **availability** (declare working days/areas) — shared gap; (b) physio Profile shows licence read-only + public-profile editor — fine.

### 3.2 Nurse — *exists but clinically half-equipped* 🟡 **(top medical priority)**
- **Lands on:** `/clinician/nursing/today` — same "My Journey" worklist as physio (shares [visit-flow.ts](src/features/ehr/clinician-shared/visit-flow.ts)).
- **Navigation (2 tabs only):** My Journey · Profile. **No Patients list, no Tasks tab** (physio has both).
- **The visit session** ([NurseSessionView.tsx](src/features/ehr/clinician-nursing/NurseSessionView.tsx)): safety header → state transitions → **Vitals** + **one Assessment** form → check-out.
- **The gap (this is the important one):** the RBAC matrix grants the nurse **sign** on **nursing notes**, **medication administration**, **assessments**, and **write** on escalations/standing-order execution ([ehr-matrix.ts:149-160, 242-252, 398-422, 463-473](src/lib/auth/policy/ehr-matrix.ts)) — but the **nurse field session only exposes vitals + assessment**. A real home nursing visit needs to:
  - **Write a nursing note** (narrative) — *missing in the field app* (exists in the chart, not in the session).
  - **Record medications given (MAR)** — `medication.administer` action exists ([actions.ts:101-104](src/lib/auth/policy/actions.ts)) but **no field form**.
  - **Raise an escalation from the doorstep** (red-flag vitals auto-escalate ✅ via [vitals-assessments.ts:39-64](src/features/ehr/admin-patient/actions/vitals-assessments.ts), but the nurse can't *manually* escalate from the session).
  - **Execute a standing order** (the mechanism that lets a nurse act between doctor visits) — not surfaced.
- **Should NOT see:** prescribing (correct — doctor-only), physician notes sign (correct), other providers' rosters (enforced via `providerId` scope, [data.ts:111](src/features/ehr/clinician-nursing/data.ts)). ✅
- **Enhance next (in order):** 1) **nursing note in the session**; 2) **MAR form**; 3) **manual escalation button**; 4) add **Patients** + **Tasks** nav tabs to match physio; 5) availability.

### 3.3 Doctor — *review & sign works; acts by leaving the workspace* 🟡
- **Lands on:** `/clinician/doctor` — "My Cases": stat cards (my patients / open tasks / urgent / overdue), a **"Needs my action"** task queue (co-sign / review / follow-up), and a case-team patient list ([DoctorWorklistView.tsx](src/features/ehr/clinician-doctor/DoctorWorklistView.tsx)).
- **Navigation (2 tabs):** My Cases · Profile (with public-profile editor — good, since doctors appear on the public site).
- **How they act:** every "Open chart" link goes to `/admin/patients/[id]` ([DoctorWorklistView.tsx:64,92](src/features/ehr/clinician-doctor/DoctorWorklistView.tsx)) where they sign diagnoses (ICD-10), medical notes, prescriptions, reconcile meds, author standing orders, and co-sign. Doctor has chart read access via `CLINICAL_READ_ROLES` ([role-constants.ts:62](src/lib/auth/role-constants.ts)). ✅ This matches the **"review + sign only"** launch decision — **no doctor field app needed yet** (correct).
- **What's right:** the worklist → chart pattern is exactly the missing "which patient do I open?" layer v2 complained about. Co-sign routing via FHIR Tasks is the right mechanism.
- **Should NOT see:** nursing-only / physio-only *sign* actions (matrix correctly gives doctor `read`+co-sign on those); field check-in flow (doctor isn't in the field). ✅
- **Enhance next:** (a) a thin **in-workspace co-sign panel** for red-flag vitals so the doctor doesn't context-switch to the full chart for a one-tap co-sign; (b) make the "urgent/overdue" counts clickable filters.

### 3.4 Medical-Ops / Case-Manager — *the conductor; under-fed* 🟡
- **Lands on:** `/admin/ops` — dispatch board + disputes ([DispatchBoardView.tsx](src/features/admin/ops/DispatchBoardView.tsx)).
- **What's right:** has global visit view, care-team assignment (`care_team.assign` = write/global), escalation triage, InstaPay confirm queue (shared with finance).
- **The gap:** the board can show *visits* but there is **no clinician-availability or capacity feed** to assign against — ops is assigning blind. This is the operational twin of the §3.2 clinical gap.
- **Enhance next:** **capacity/availability view** (who's free, in which area, today) — depends on the availability model being built.

### 3.5 Admin / Superadmin — 🟢
- **Lands on:** `/admin/patients`. Can now onboard staff ([admin/staff](src/app/admin/staff/)), manage refunds/billing, view analytics, manage profiles. The "run the business" screens v2 said were missing now exist.
- **Should NOT see (by design):** restricted-tier clinical data without break-glass (matrix hides it from admin) — ✅ a deliberate, correct privacy choice.
- **Enhance next:** a settings/feature-flag surface for superadmin (coverage areas, payment config) — minor.

### 3.6 Compliance officer — 🟢 (keep light)
- **Lands on:** `/admin/compliance` (audit-log dashboard). Global **read** on every clinical module, **no writes** ([ehr-matrix.ts:537-543](src/lib/auth/policy/ehr-matrix.ts)). Correct separation of duties.

### 3.7 Finance — 🟡
- **Lands on:** `/admin/insurance`. For B1 (no claims), finance's *real* job is refunds + InstaPay confirm + payout reconciliation — those live under `/admin/billing` (finance has access via [route-access.ts:57](src/lib/auth/route-access.ts)). Fine for launch; payouts stay manual per the locked scope.

### 3.8 Roles to keep hidden for this launch
`viewer`, `hospital_partner_admin`, `insurance_coordinator` (claims) → land on `/admin/no-workspace` or are parked. ✅ already handled.

---

## 4. The money loop trace (medical hand-off lens)

```
Booking (coverage-gated ✅, price from DB ✅, promocode ✅)
   → Patient row created + Medplum Patient synced ✅   [create/route.ts:183-321]
   → PREPAY:  Kashier webhook (auto) ✅  OR  InstaPay → ops/finance confirm queue ✅
   → ⚠️ HAND-OFF GAP: booking is created with status 'pending'; there is no automatic
         booking → Visit creation, care-team assembly, or portal invite (WhatsApp OTP)
   → Visit (clinician documents in the field/chart) ✅
   → Receipt / payout reconciliation (manual, per locked scope) 🟡
```
- **Verified working:** coverage enforcement before payment ([create/route.ts:78-100](src/app/api/bookings/create/route.ts)); Patient + Medplum sync on booking; InstaPay pending-confirm queue ([billing/data.ts](src/features/admin/billing/data.ts)); refunds.
- **The one structural break for the *clinical* loop:** a paid booking does **not** automatically become a **Visit** with an assigned **care team** and a **portal invite**. Today that's a manual ops step. For a small pilot that's acceptable; before scale it's the highest-value automation. (This is the medical-operations equivalent of v2's "intake pipe.")

---

## 5. Clinical-safety status — verified vs assumed

| Control | Status | How I checked |
|---|---|---|
| **Licence + discipline + scope gate on every clinical write** | ✅ **Verified** | Every sign action carries `requiresLicense + discipline + requiresCaseScope` ([actions.ts:44-152](src/lib/auth/policy/actions.ts)); nurse/physio field writes delegate to the same audited admin actions ([clinician-nursing/actions.ts:143,160](src/features/ehr/clinician-nursing/actions.ts)) |
| **Discipline boundaries (nurse ≠ doctor sign, physio ≠ prescribe)** | ✅ **Verified** | Matrix scopes by discipline; `medication.prescribe` is `discipline: 'medical'` only ([actions.ts:97-100](src/lib/auth/policy/actions.ts)) |
| **`access_denied` audited on every denial** | ✅ **Verified** | [enforce.ts:16-41,66](src/lib/auth/policy/enforce.ts) |
| **Red-flag vitals auto-escalation** | ✅ **Verified** | Threshold breach → escalation + communication ([vitals-assessments.ts:39-64](src/features/ehr/admin-patient/actions/vitals-assessments.ts)) |
| **Soft-delete only for clinical data** | ✅ **Verified** | Loaders filter `deletedAt: null` throughout (e.g. [clinician-doctor/data.ts:87](src/features/ehr/clinician-doctor/data.ts)) |
| **Malware scan real in production** | 🟡 **Verified seam, config pending** | Dev returns `clean`; boot **fails fast** if `mock_clean` in prod ([production-readiness.ts:21-27](src/lib/config/production-readiness.ts), [malware-scan.ts:37-44](src/lib/security/malware-scan.ts)). Real backend = owner/ops env config, not code. |
| **Restricted-tier (MH/HIV/repro/DV) gating + break-glass** | 🟡 **Verified in policy, flow not run** | `restricted.read` gated + `DestructiveApprovalToken` actions exist ([actions.ts:22-25](src/lib/auth/policy/actions.ts)); end-to-end UI flow not executed in this audit (**assumed**) |
| **Tenant scoping on clinical reads** | ✅ **Verified (per-query)** | `sessionTenantId(staff)` on loaders; still per-call, not RLS (known) |

**Net:** the dangerous failure modes (ungated write, wrong-discipline sign, hard-delete, un-audited denial) are **closed in code**. The two items needing a human before real patients: **(1) point the malware scanner at a real backend in prod**, **(2) walk the restricted-tier break-glass flow once, manually, to confirm the UI matches the policy.**

---

## 6. Charts vs dashboards vs portal — placement

- **Chart** = `/admin/patients/[id]`, 11 tabs, **role-scoped** (nurse/physio see 7 task-relevant tabs; full clinical roles see all 11; compliance/admin read-only) ([role-scope.ts:17-60](src/features/ehr/admin-patient/role-scope.ts), [workspace-tabs.ts](src/features/ehr/admin-patient/workspace-tabs.ts)). ✅ correct.
- **Dashboards / worklists** = each clinician's "Today"/"My Cases", ops board, nursing dashboard, analytics. The **worklist → drill into chart** pattern v2 wanted now exists for all three disciplines. ✅
- **Portal** = bilingual patient narrative (separate from the chart). ✅
- **Vitals trends** live *inside* the relevant section (physio session sparklines; measurements tab) — never a standalone "charts" destination. ✅ This is the correct placement.

**One small inconsistency to tidy:** physio documents only when `checked_in`; nurse can document when `checked_in` **or** `checked_out` ([NurseSessionView.tsx:95](src/features/ehr/clinician-nursing/NurseSessionView.tsx) vs [physio session data.ts:469](src/features/ehr/clinician-physio/session-workspace/data.ts)). Pick one rule across disciplines.

---

## 7. B2 (hospital) / B3 (white-label) — honest state

Out of focus by request, stated briefly for completeness: **both deferred and correctly parked.** Tenant foundations (`tenantId` columns + `sessionTenantId` helper) exist but enforcement is **per-query, not row-level** — a cross-tenant leak is a code-review responsibility today, not a DB guarantee. Minimum next step *when* B2 resumes: tenant-aware Prisma client (or RLS) before any second tenant touches data. **Nothing to do now for B1.**

---

## 8. Prioritized roadmap (smallest launchable → largest) — medical-first

Given the front-door and money blockers from v2 are largely closed, the critical path is now **clinical completeness + operability**, not plumbing.

**Sprint A — Make the nurse visit clinically complete (highest patient-safety value)**
1. Nursing **note** form in the session ([NurseSessionView.tsx](src/features/ehr/clinician-nursing/NurseSessionView.tsx) — wire `note.nursing.sign`).
2. **MAR** (medication administration) form in the session (wire `medication.administer`).
3. **Manual escalation** button from the session (wire `escalation`/`incident_report.create`).
4. Add **Patients** + **Tasks** nav tabs for the nurse (parity with physio).

**Sprint B — Clinician availability (unblocks operations)**
5. An availability model + screen (working days, hours, areas) for physio + nurse.
6. Feed it into the **ops capacity view** so dispatch stops guessing.

**Sprint C — Close the clinical hand-off loop**
7. Paid booking → **auto-create Visit + assemble care team + send portal invite (WhatsApp OTP)**.
8. Doctor **in-workspace co-sign panel** for red-flag vitals (one tap, no chart detour).

**Sprint D — Safety hardening → go-live gate**
9. Point malware scanner at a real backend in prod; walk the restricted-tier break-glass flow once.
10. Install Sentry (DSN); standardise the document-window rule across disciplines.

---

## 9. Open decisions only the owner can make

1. **Nurse scope at launch:** do home nursing visits at launch require **MAR + nursing notes** (Sprint A), or is **vitals + assessment** enough for the very first supervised cases? (Recommendation: MAR + note before any *unsupervised* nursing visit — it's a documentation/legal gap otherwise.)
2. **Availability ownership:** do clinicians self-declare availability, or does ops set it for them at launch? (Recommendation: ops sets it now, clinicians self-serve later — faster to ship.)
3. **Booking→Visit automation vs manual:** accept a manual ops step for the first ~10 cases, or build the auto hand-off first? (Recommendation: manual for the pilot, automate before scale.)
4. **Malware backend vendor** (ClamAV self-host vs hosted) — needed before any real document upload in prod.
5. **Document-window rule:** can clinicians document *after* check-out (nurse behaviour) or only while checked-in (physio behaviour)? Pick one.

---

## If you only do three things next
1. **Finish the nurse visit** — add the **nursing note + medication (MAR) + manual escalation** to the field session. Right now a nurse can take vitals but can't legally document the care they gave. ([NurseSessionView.tsx](src/features/ehr/clinician-nursing/NurseSessionView.tsx))
2. **Give clinicians an availability screen** — without it, the new ops dispatch board is assigning visits blind, and that breaks every multi-discipline case.
3. **Before any real patient:** point the **malware scanner at a real backend in prod** and walk the **restricted-tier break-glass** flow once by hand — the policy is correct; confirm the screens match it.

---

### Cross-references
- Previous audit (the "before"): [docs/PRODUCT_LAUNCH_AUDIT.md](docs/PRODUCT_LAUNCH_AUDIT.md)
- RBAC matrix (the source of truth, strong — keep): [src/lib/auth/policy/ehr-matrix.ts](src/lib/auth/policy/ehr-matrix.ts)
- Action gates: [src/lib/auth/policy/actions.ts](src/lib/auth/policy/actions.ts) · Enforcement: [src/lib/auth/policy/enforce.ts](src/lib/auth/policy/enforce.ts)
- Clinician routing + role homes: [src/lib/auth/route-access.ts](src/lib/auth/route-access.ts)
- Nurse workspace: [src/features/ehr/clinician-nursing/](src/features/ehr/clinician-nursing/) · Doctor: [src/features/ehr/clinician-doctor/](src/features/ehr/clinician-doctor/) · Physio (template): [src/features/ehr/clinician-physio/](src/features/ehr/clinician-physio/)
- Chart (role-scoped tabs): [src/features/ehr/admin-patient/role-scope.ts](src/features/ehr/admin-patient/role-scope.ts)
</content>
</invoke>
