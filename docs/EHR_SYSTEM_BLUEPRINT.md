# Anees Care OS — Full System Blueprint

> **Date:** 2026-07-02 · **Basis:** full-codebase scan (8 parallel subsystem audits, every claim grounded in file:line evidence; headline findings re-verified by hand).
> **Audience:** owner + engineering. Written in plain language first, with technical evidence for engineers.
> **Companion docs:** [CTO_AUDIT_2026-07-01.md](CTO_AUDIT_2026-07-01.md) (infrastructure/risk), [EHR_AUDIT.md](EHR_AUDIT.md) (clinical gaps), [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) (RBAC). This document is the **system design**: what exists, what's broken, and what the target looks like.

---

## 1. The verdict in one page

The owner's instinct — *"the flow is not logic"* — is correct, and the scan shows it is worse than a design problem: **large parts of the designed flow literally do not run.** The system today is an EHR (medical record) with real strengths, surrounded by an operations layer that is mostly façade: schema tables and buttons exist, but the wires between them were never connected.

**Five verified truths about the system today:**

1. **The physiotherapist's field day is dead on arrival.** Every journey button (Acknowledge → Start travel → I've arrived → Check in → Check out) and every problem button (patient not home, refused at door, decline, dispute) silently fails on a one-word form-field mismatch, and the error message is written somewhere the clinician's screens never display. The clinician taps; nothing happens; no error. (Nurse and doctor workspaces use the corrected pattern and work.)
2. **Even with the buttons fixed, a physio cannot legally check out.** Check-out requires a "signed clinical entry" — but the physio's structured session note is stored in a category the gate doesn't accept, their quick-assessment form has a second independent bug so it can never save, and they have no vitals form. A triple dead end.
3. **Visits are only born from a paid online booking.** There is no screen anywhere to create or schedule a visit. A 12-session package produces exactly **one** visit. Every visit is scheduled "tomorrow, no time" because the funnel never asks the patient when they want care. The only reschedule mechanism is a *disruption* action that can wrongly apply a cancellation fee.
4. **Nobody is ever notified of anything.** Assigning a clinician sends no message (they must open the app to discover work). The patient can never see who is coming or when — the portal's "next visit" reads a data status nothing ever writes. A clinician who never shows up produces zero signals. Review/dispute tasks are created with codes no queue reads.
5. **The tracking / money / rating layer is empty schema.** GPS breadcrumbs (`VisitLocationPing`), door-step identity confirmation, patient signature, cash collection, ratings (`Visit.patientRating`, `PhysioProfile.publicRating`), payout records (`ProviderPayout`), trial scorecards (`TrialVisitScorecard`), multi-clinician visits (`VisitParticipant`) — all exist as database tables with **zero code writing them**. Earnings shown to clinicians are live projections with no settlement behind them; payouts happen off-system via CSV; disrupted-visit partial pay never appears in earnings; and the cancellation money math is **inverted** (an early free cancel books full price to the patient, a last-minute cancel books zero).

**Mobile readiness: effectively 0%.** Every clinician read and write is a Next.js server action or server-rendered page bound to a browser cookie session. A native app can call none of it. The fix — an API-first service layer — is the same fix the web app needs anyway.

**The good news:** the deep foundations are genuinely strong and reusable — the role/permission matrix, license gating, the visit state-transition ledger with concurrency guard, geofence evaluation, FHIR clinical modules (vitals, coded outcomes, validated instruments, note signing with Provenance), and the audit chain. The system does not need a rewrite. It needs **(a) the broken wires reconnected, (b) the operational loop closed, and (c) one API layer so web and mobile share the same brain.**

---

## 2. Part A — The system today (verified reality)

### A1. The clinician journey, screen by screen

| Step | Physio | Nurse | Doctor | Evidence |
|---|---|---|---|---|
| Log in, see today's visits | ✅ works | ✅ works | ✅ works | `clinician-shared/visit-flow.ts:180-285` |
| Acknowledge / Start travel / Arrived / Check in | ❌ **silent no-op** | ✅ works | ✅ works | form posts `visitId` (`VisitTransitionForm.tsx:116`), physio wrapper reads `physioVisitId` (`clinician-physio/actions.ts:49`); nurse/doctor wrappers read `visitId` and work |
| See errors when something fails | ❌ never | ⚠️ docs forms yes, transitions no | ⚠️ same | `failAction` writes flash cookie `path:'/admin'` (`admin-patient/flash.ts:10`); no flash renderer under `/clinician` |
| Structured session note | ⚠️ saves, but success/failure look identical | ✅ inline feedback (`useActionState` + rethrow) | ✅ inline feedback | physio actions never pass `{rethrow:true}` (`clinician-physio/actions.ts:101-176`) |
| Quick assessment | ❌ can never save | ⚠️ instrument path broken too | — | form key `assessmentInstrument` never mapped by `formDataToInput` (`schemas/admin-patient/primitives.ts:117-334`) → Zod refine always fails → swallowed |
| Check out | ❌ blocked 3 ways | ✅ (vitals count as evidence) | ✅ | evidence gate accepts vitals / signed Composition / assessment only (`shared/review-tasks.ts:99-128`); physio session report is category `survey` (`care-reports.ts:108-113`) — not accepted |
| Record a no-show / refusal / dispute | ❌ silent no-op (only disruption UI in the product) | ❌ no UI | ❌ no UI | disruption forms post `visitId` (`SessionWorkspacePageView.tsx:492-533`); 6 med-ops disruption actions have **zero UI callers** (`visit-workflow.ts:562-779`) |
| Patient phone / map / directions | ❌ not shown | ❌ | ❌ | today card selects address+landmark only (`visit-flow.ts:208-221`) — no phone, no map link despite GPS + map-URL existing on Patient |
| Pre-visit clinical brief (care plan, allergies detail, last notes) | ❌ only aggregate charts; full chart = desktop admin page | ⚠️ safety header + link to admin chart | ⚠️ | signed notes are **not rendered anywhere in the staff chart** (loaded, never displayed — `admin-patient/data/index.ts:232`, zero view consumers) |
| Tasks (start/complete) | ✅ works (errors crash to boundary) | ✅ | ✅ | `tasks/actions.ts:24-79` |
| Earnings | ⚠️ projections only; payout dates hardcoded (18th/3rd); disrupted-visit pay invisible | ❌ no earnings screen | ❌ no earnings screen | `earnings/data.ts:111-159`; settled filter excludes `no_show`/`cancelled` statuses that carry partial pay |
| Schedule beyond today | ❌ none (no week view, no tomorrow) | ❌ | ❌ | — |
| Offline | ❌ any connectivity drop = lost work | ❌ | ❌ | PWA fallback page only; no queue (`worker/index.ts` handles push only) |

### A2. Visit lifecycle & tracking reality

- **State machine:** 23 enum states; only 16 are reachable. `draft`, `documenting`, `signed`, `amended`, `completed` (as state), `force_closed_by_admin`, `abandoned` have **no writer**. On finished visits `state` and `status` permanently disagree (`checked_out` vs `completed`).
- **No transition-legality map:** journey steps use ad-hoc timestamp guards; disruption transitions have **zero** sequence guards — once wired, a completed visit could be re-marked "refused at door" and its money rewritten (`visit-workflow.ts:495-560`).
- **GPS:** one-shot browser fix at check-in/out, entirely client-asserted (spoofable). `VisitLocationPing` (breadcrumb trail): zero references in code. No live map, no ETA, despite the role matrix advertising an "Uber-style live view".
- **Geofence:** enforced at check-in but the override is self-service (clinician picks "Med Ops unlock" from a dropdown + 6-char reason; nothing verifies approval; "door photo proof" is a free-text ID with no photo upload). Check-out geofence has **no** override path at all — a legitimately-overridden check-in strands the clinician at check-out.
- **Arrival protocol:** identity confirmation, consent reaffirmation, safety clearance, companions, patient signature — all schema columns, all permanently empty.
- **Supervisor force-override** bypasses sequence, GPS, geofence, and documentation gates (audited but not approval-gated; contradicts the role matrix which gives `admin` read-only on this module).

### A3. Documentation & signing reality

- **Strong core:** LOINC-coded vitals with threshold auto-escalation; 4 physio templates with ~25 typed fields + red-flag keyword escalation; 12 coded outcome measures with trend reader; validated instruments (Braden/Morse/MMSE/Berg/TUG/NPRS) with range checks; Composition sign = legal attester + Provenance + version guard. This is the best-built part of the platform.
- **But:** no draft/autosave anywhere (a validation failure or dropped connection destroys a fully-typed note); signed notes can never be amended (machinery built, unreachable) and can never be **read** in the staff chart; co-signature is promised in the matrix and rendered in the doctor queue but **nothing ever creates a co-sign task**; documentation is not tied to visit state server-side (the "only after check-in" rule is just a disabled button); vitals plausibility limits are client-side only and timestamps are parsed in server timezone (a Cairo nurse's "now" can land 2-3h in the future and break the check-out evidence window); the physio discharge summary is legally signed **with no license gate, an identity-less attester, and no audit row** (`clinician-physio/patients/actions.ts:453-504`); nurse/physio wrappers forward client-supplied `encounterId` verbatim (only the doctor wrapper strips it) — documentation can be attached to another patient's encounter.

### A4. Ops & dispatch reality

> **Update (Phase 1 shipped):** several diagnoses below are now resolved — manual visit creation + series generation (`src/lib/visits/create-visit.ts` + ops scheduling form), assignment notifications (`src/lib/notifications/`), watchdog cron (`src/lib/ops/watchdog.ts`), dispute resolution actions, and a portal Visit bridge. The original diagnosis is retained for context; ✅ marks what's fixed.

- ✅ ~~**The only way a Visit is ever created** is `createVisitFromBooking`~~ — ops can now mint single visits and **package series** (care-plan expansion) from the dispatch screen; `CarePlan.totalVisitsPlanned` is now written by the series generator.
- **Assignment** is a bare dropdown: no availability enforcement, no conflict/double-booking guard, no area matching (visit `areaId` is never even set) — ✅ but assignment now **notifies** the clinician (push).
- ✅ ~~**Past-due unassigned visits vanish** from every dispatch lane~~ — fixed (B11); the watchdog also alerts on the unassigned backlog.
- ✅ ~~**No watchdogs**~~ — `/api/internal/ops/watchdog` now sweeps no-show risk, stuck states, unassigned backlog, stale payments, and unacknowledged handoffs, pushing the dispatch desk.
- **Review tasks die in a void:** `dispatch-review`, `visit-review`, `ops-dispute-review` tasks are created, but no queue reads those codes — ✅ **partly** resolved: the disputes page now has a real **resolution workflow** (uphold / force-close → `force_closed_by_admin`); a dedicated task-code queue view is the remaining follow-up.
- **Two disconnected scheduling systems:** staff-created FHIR Appointments never become Visits — ✅ the portal now reads the operational Postgres `Visit` schedule (upcoming visits + self-service change requests); FHIR-Appointment↔Visit unification remains open.
- **NurseShiftAssignment** lifecycle dead-ends at `in_progress`; overlap guard is per-patient only (one nurse can be double-booked across patients); no roster view — ✅ the watchdog now flags handoffs the incoming nurse hasn't acknowledged past SLA.

### A5. Money, ratings, workforce reality

- **Inverted cancellation math (P1, money-correctness):** `applyDisruptionFinancials` stores the cancellation fee as a *discount* — `netPrice = servicePrice − fee` — the exact complement of policy. The refund flow does it correctly (`refund = paid − fee`), so the visit ledger and refund ledger disagree by construction (`shared/financials.ts:80-88` vs `admin/billing/actions.ts:266-271`).
- **Disruption partial pay is invisible:** no-show pays the clinician 50% by policy and writes it to the visit — but earnings aggregates and the payout CSV both filter to `completed`/checked-out, so the compensation is never shown and never paid.
- **"Deductions" column shows the company's margin** to the clinician (gross patient price − payout), e.g. "Deductions: 1,200 EGP" on a 1,500 EGP visit paying 300.
- **No payout workflow:** `ProviderPayout` has zero writers; finance downloads a CSV and pays off-system; the nurse dashboard's "paid / last payout" widgets read an eternally-empty table; pay-period calendar is hardcoded.
- **No rating system anywhere:** `Visit.patientRating` (aggregated in dashboards!), `publicRating/publicReviewCount`, and the public site's doctor stars are all hand-entered or permanently zero. Nothing asks the patient anything after a visit.
- **No onboarding pipeline:** `PhysioProfile` and `TrialVisitScorecard` have no create/update path in the entire product — rows exist only via direct DB inserts, while the profile page tells clinicians to "ask Med Ops" to use a screen that doesn't exist. License data is self-typed text with no document upload or verification, no expiry alerts.
- **Cash:** `cashCollectedEgp`/`cashGratuityEgp`/`receiptDeliveryChannels` — zero reads or writes. Field cash is fully off-system in a cash-heavy market.

### A6. Patient / family loop reality

- Funnel collects **name + phone only** — no date, time, address, or complaint. Patient identity is keyed on the raw phone string and the booker's typed name **overwrites** the existing patient's name (two family members from one phone = one merged clinical record).
- Portal signup **rejects normal phone formats** (`01xxxxxxxxx` fails; only `201xxxxxxxxx` passes) and requires **no proof of phone possession** (OTP infra exists, wired only to forgot-password).
- Portal is 100% read-only: no re-book, no cancel/reschedule, no rating, no messaging; "next visit" hero is dead code (reads `planned` Encounters nothing creates); care reports never surface; no notification when a note is signed.
- Telemedicine is a sellable, payable SKU with **no delivery mechanism** in the product.
- A replayed signed "pay" webhook can flip a refunded booking back to paid (pay path has no status guard); the payment redirect page marks bookings paid without any conversion side-effects and no sweep reconciles them.

### A7. Mobile readiness

Capability scoreboard for a native clinician app today: login **partial** (cookie-only, 45-min TTL, no refresh token); today list / transitions / documentation / signing / earnings / tasks **missing** (all server actions or RSC); GPS pings **missing** (no endpoint even for web); photos **missing** (no capture flow at all); document download + terminology lookup **partial** (real GET routes, cookie-auth); push **missing** (web-push only, anonymous — `PushSubscription` has no user link — broadcast-only, and nothing in the app ever sends one); offline **missing**.

The transferable assets: the policy engine (`requireStaffCan`/`can()`), case-scoping, license gating, geofence policy, and audit chain are all server-side and client-agnostic. The patient-side onboarding APIs (OTP, register) already speak JSON. The PWA UI itself is genuinely mobile-first. **The gap is the data/auth/offline layer, not the UI.**

---

## 3. Part B — Defect register (wire-level, verified)

Ordered by build priority. "Fix cost" is relative engineering effort.

| # | Defect | Severity | Fix cost | Where |
|---|---|---|---|---|
| B1 | Physio wrapper reads `physioVisitId`; transition + disruption forms post `visitId` → entire physio field journey silently no-ops | Critical | Trivial | `clinician-physio/actions.ts:49,95` |
| B2 | All physio actions swallow errors into an `/admin`-scoped flash cookie; no inline feedback (nurse/doctor transitions equally silent) | Critical | Small | `shared/form.ts:24-41`, `flash.ts:10` |
| B3 | Check-out evidence gate rejects the physio session report (category `survey`) | High | Trivial | `shared/review-tasks.ts:99-128` |
| B4 | `assessmentInstrument` never mapped by `formDataToInput` → quick assessment can never save (breaks admin + nurse instrument paths too) | High | Trivial | `schemas/admin-patient/primitives.ts` |
| B5 | Cancellation fee stored inverted (fee booked as discount) | High | Small + backfill audit | `shared/financials.ts:80-88` |
| B6 | Disruption partial pay excluded from earnings + payout CSV | High | Small | `earnings/data.ts:118-122`, `billing/export/route.ts:32` |
| B7 | Discharge summary signs with no license gate, `authorReference: undefined`, no audit mirror | High | Small | `clinician-physio/patients/actions.ts:453-504` |
| B8 | Signed notes/care reports fetched but rendered nowhere in staff chart | High | Small | `admin-patient/data/index.ts:232` + views |
| B9 | Nurse/physio wrappers forward client `encounterId` (doctor strips it); physio UI asks clinicians to hand-paste encounter IDs instead of auto-linking the check-in encounter | High | Small | `clinician-physio/actions.ts:77-86` |
| B10 | 6 med-ops disruption actions (cancel/reassign/divert/interrupt/reschedule) have zero UI callers | High | Medium | `visit-workflow.ts:562-779` |
| B11 | Past-due unassigned visits vanish from all dispatch lanes | High | Trivial | `admin/ops/data.ts:115-136` |
| B12 | Pay-webhook replay can un-refund a booking; redirect page marks paid without conversion; no reconciliation sweep | Medium | Small | `payment/webhook/route.ts:61-224` |
| B13 | Portal signup phone normalization rejects local formats; no OTP possession proof | High | Small | `api/auth/patient/register/route.ts:63-70` |
| B14 | Booker's name overwrites existing patient record (phone-keyed identity) | High | Medium | `api/bookings/create/route.ts:184-204` |
| B15 | No transition-legality map; disruption transitions accept any from-state | Medium | Medium | `shared/workflow-state.ts:186-192` |
| B16 | Vitals: no server-side plausibility bounds; timestamps parsed in server TZ | Medium | Small | `schemas/admin-patient/vitals-assessments.ts` |
| B17 | Med/allergy/condition status updates lack version guards (lost updates) | Low | Small | `lib/medplum/medications.ts:140-167` |
| B18 | Disruption forms stamp `eventAt` at page render, not action time | Low | Trivial | `SessionWorkspacePageView.tsx:62` |
| B19 | Admin-role users shown workflow buttons the matrix denies them; unreachable `check_out` branch on Today | Low | Trivial | `visit-cards.tsx:36`, `TodayPageView.tsx:52` |

**Resolved (current build):** B1–B9, B11, B18 (Phase 0); B5, B6, B10, B12, B13, B14, B15, B16, B17 (Phase 1 bounded). B17 shipped FHIR optimistic-lock version guards (`If-Match` + `expectedVersionId`) across medication, allergy, and condition status/entered-in-error setters, threaded through schemas → `formDataToInput` → actions → hidden form inputs. B10 wired the med-ops disruption/exception actions (cancel/decline/reassign/divert/refused-at-door/patient-not-home/interrupt/reschedule/dispute) into the admin patient visit board via `VisitDisruptionActions`, each availability-gated by visit flags and action-time stamped (`eventAt`). B13 gave portal signup a two-step WhatsApp-OTP flow with possession proof (OTP verified atomically at register time, last, so a wrong case-ID can't burn a valid code) and Egypt-aware phone matching (`phone-variants.ts`, shared with password reset). **Still open:** B19 (cosmetic; server already enforces).

**Phase 1 infrastructure (current build — the operational loop is now closed):** the six multi-day infrastructure builds from the Phase 1 roadmap below have shipped, all **service-function-first** (durable service module + thin action/route/UI wrappers) so the "web today, mobile tomorrow" rule holds:

1. **Visit creation & scheduling.** New service `src/lib/visits/create-visit.ts` (`createVisit`, `createVisitSeries`, `rescheduleVisit`) — the single place operational visits are minted, each in one transaction that co-writes the visit, the initial immutable `VisitStateTransition` (from `null`), and an audit row. Wrapped by `createVisitAction` on the ops dispatch page (`src/features/admin/ops/CreateVisitForm.tsx`): patient-by-case-ID, service catalogue (`getSchedulingCatalog`), date/time/type, optional clinician assignment.
2. **Package → visit series + first-class reschedule.** `createVisitSeries` opens a `CarePlan` and generates every session spaced by a cadence, all-or-nothing in one transaction. `rescheduleVisit` is a **non-punitive** date/time move (no cancellation fee, no state-machine disruption, audited) — deliberately distinct from the punitive `rescheduled_in_place` disruption path. Exposed via `rescheduleVisitAction` (ops) and, as a *request*, from the portal.
3. **Notifications v1.** `PushSubscription` now carries a nullable `userId` FK (migration `20260702120000_push_subscription_user_link`, additive/idempotent); the subscribe route stamps the session user. New per-user seam `src/lib/notifications/index.ts` (`notify`, `pushToUser` with dead-endpoint pruning, `sendWhatsAppToPhone`, `notifyStaffByRoles`) — best-effort, never throws, PHI-light payloads. Wired into assignment (clinician push), reschedule (family WhatsApp + clinician push), and the watchdog (ops push).
4. **Watchdog cron.** New service `src/lib/ops/watchdog.ts` + internal route `src/app/api/internal/ops/watchdog/route.ts` (auth mirrors the doc-scan job: `x-ops-watchdog-key` or `Bearer ${CRON_SECRET}`; rate-limited + CORS). Five sweeps: no-show risk, stuck in-transit states, unassigned backlog, payment reconciliation (B12 — stale Kashier sessions), unacknowledged nurse handoffs. **Detect + flag + notify only** — never auto-mutates money-affecting state; writes one durable audit row per run and pushes the dispatch desk.
5. **Ops dispute resolution.** `resolveDisputeAction` + `DisputeResolveControl` on `/admin/ops/disputes` — **uphold** (`disputed → completed`) or admin **force-close** (`disputed → force_closed_by_admin`, terminal). Both go through the transition helper (ledger + TOCTOU guard); force-close is audited as `action='override'`. `force_closed_by_admin` is now a **reachable** state (added to the legality map + `CLOSED_WORKFLOW_STATES`, with a unit test).
6. **Portal upcoming-visits bridge + self-service.** The portal now reads the operational schedule (Postgres `Visit`) alongside Medplum encounters (`loadUpcomingVisits`, tenant + session scoped). Patients (and consented caregivers with the `visits` scope) can **request** a reschedule/cancellation (`requestVisitChangeAction`) — a request, not a mutation: it flags the visit for ops (`[PORTAL_REQUEST_PENDING]` marker + dispatch push) and audits the ask; ops action it from the board. Uses the pre-existing bilingual `requests.*` message keys.

Verified: `tsc --noEmit` clean, `vitest` 72/72 passing, tenant-scope + db-push guards green, ESLint clean.

**Dead-schema inventory** (tables/columns with zero writers — decide per item: wire it in the roadmap phase below, or drop it): `VisitLocationPing`, `VisitParticipant`, `Visit.identityConfirmedBy/consentReaffirmed/safetyClearance/companionsPresent/patientAcknowledgementMediaId`, `Visit.cashCollectedEgp/cashGratuityEgp/receiptDeliveryChannels`, `Visit.patientRating`, `Visit.checkOutAccuracyM`, `ProviderPayout`, `Expense`, `TrialVisitScorecard`, `PhysioProfile` (no create path), `PhysioProfile.publicRating/publicReviewCount/publicVisitCount`, `Provider.baseRateEgp`, ~~7 unreachable `VisitState` values~~ (`force_closed_by_admin` is now reachable via ops dispute force-close; the remaining unreachable values are fewer), policy actions defined-but-never-enforced (`discharge_summary.create`, `goal.*`, `task.start/complete`), co-sign machinery (detector, sweep, queue — nothing creates the task), FHIR handoff acknowledgement component (read, never written). *(Newly written this build: `PushSubscription.userId`, `CarePlan` via series generator, `Visit` via the ops scheduling service.)*

**Docs drift to fix:** `.claude/CLAUDE.md` still says `/clinician` is physio-only — nurse + doctor field workspaces ship live PHI-touching code. `EHR_ROLE_MATRIX.md:747` claims "VisitLocationPing now live" — false. `EHR_PHYSIO_SPEC.md` (the canonical journey spec) was deleted from the repo in commit `b6e4935` while 6 files still reference it — restore it from git history.

---

## 4. Part C — Target architecture: **Anees Care OS**

### C1. Design principles

1. **The Visit is the atom.** Every subsystem — clinical record, GPS, money, rating, payout, dispute — hangs off one visit lifecycle. One timeline per visit, from request to rating, visible to the right people at the right depth.
2. **The state machine is law.** A single legality map defines every allowed `from → to` transition, with its guards (GPS? evidence? role? approval token?) declared in one place, enforced server-side, and unit-tested. No screen, action, or override moves a visit outside the map.
3. **API-first, forms second.** Every capability is a service function exposed through an authenticated JSON API (`/api/v1/…`); web forms and server actions become thin wrappers over the same functions. This is the single decision that makes "web today, mobile tomorrow" true.
4. **Every event notifies someone.** Assignment → clinician push/WhatsApp. En route → family. Signed report → patient portal + WhatsApp. No-show risk → ops. Payout executed → clinician. If an event matters to a human, the system tells that human — never "open the app and check".
5. **Money mirrors reality.** Fees carry the policy sign. Cash at the door is captured at check-out. Every EGP a clinician earns lands in a payout run they can reconcile line-by-line. Disruption pay is visible the moment the disruption is recorded.
6. **Evidence, not vibes.** Presence = geofence + breadcrumbs. Overrides = approval-gated with real evidence (actual photo upload, verifiable code). Identity/consent/safety captured at the door. Signing = licensed, identified, audited — everywhere, no exceptions.
7. **Field-grade resilience.** Drafts autosave. Writes carry idempotency keys. An offline queue holds transitions and documentation until connectivity returns. Losing signal in an elevator never loses clinical work.

### C2. Module map

```
┌─────────────────────────────── ANEES CARE OS ───────────────────────────────┐
│                                                                              │
│  1. DEMAND & INTAKE            2. SCHEDULING & DISPATCH    3. WORKFORCE      │
│  booking w/ date+time+address  clinician calendars         onboarding pipe   │
│  ops manual visit creation     availability enforcement    license verify    │
│  package → visit series        conflict + area matching    + expiry alerts   │
│  portal re-book/cancel/resched assignment + notification   trial scorecards  │
│  intake (complaint, address)   live board + watchdogs      profiles (all 3   │
│                                no-show detection            disciplines)     │
│                                                                              │
│  ────────────────── 4. VISIT EXECUTION ENGINE (the heartbeat) ────────────── │
│  legality-mapped state machine · GPS breadcrumbs + live ETA · geofenced      │
│  check-in/out w/ approval-gated overrides · arrival protocol (identity/      │
│  consent/safety) · disruption recording from every surface · offline queue   │
│                                                                              │
│  5. CLINICAL RECORD (EHR)      6. MONEY                    7. QUALITY        │
│  pre-visit brief (plan,        correct fee math            post-visit rating │
│   allergies, last notes,       cash capture + receipts     (WhatsApp/portal) │
│   phone, map)                  payout runs → ProviderPayout quality score    │
│  templates + draft/autosave    clinician statements        complaint pipeline│
│  sign w/ license gate — always disruption pay visible      review queues that│
│  amendments + co-sign          rate cards per clinician     actually list    │
│  chart that shows notes        reconciliation              the review tasks  │
│                                                                              │
│  ── PLATFORM: /api/v1 (token auth) · notifications (push per-user + WhatsApp)│
│     · GPS ingest · offline sync · cron watchdogs · audit chain · RBAC matrix │
└──────────────────────────────────────────────────────────────────────────────┘
```

### C3. Target clinician journey — a day in the life

1. **07:30 — Notified, not surprised.** Push/WhatsApp last night: "3 visits tomorrow." This morning: today's route in order, with per-visit **patient brief**: photo, age, DNR/allergy badges, active care plan + goals, last session's note, phone (tap-to-call), address with **tap-to-navigate** map link.
2. **Accept or decline** each visit with a reason code — from the Today card, before travel (decline is a first-class pre-travel action, not buried post-check-in).
3. **Start travel** → background GPS breadcrumbs begin (`VisitLocationPing`), family sees "on the way + ETA", ops sees the live board.
4. **Arrive** → auto-detected inside the geofence. **Arrival protocol** on one screen: identity confirmed (patient/caregiver), consent reaffirmed, environment safe (No → escalation), companions noted. Check-in blocked outside geofence unless a **real** override: ops-issued unlock, patient code, or an actual uploaded door photo.
5. **Session workspace**: last visit's values pre-filled, discipline template, pain sliders, **autosave every few seconds** (offline-safe). Vitals available for every discipline. Red flags escalate automatically.
6. **Sign** → license checked (all disciplines, all note types), attester identity resolved, Provenance written. Mistake later? **Amendment** creates a versioned correction; red-flagged notes generate a real doctor **co-sign task** with an SLA.
7. **Check out** → geofenced (with the same override path as check-in), requires the signed session documentation (the session note itself counts). Recap card: **cash collected + gratuity + receipt channel (WhatsApp/print)**, optional patient signature, "book next session" one-tap.
8. **Money settles itself**: visit payout (including partial pay for disruptions) accrues to the current payout period; earnings page reconciles exactly to payout runs; statement per period; payday push.
9. **Anything goes wrong** — not home, refused, unsafe, emergency — one tap from any screen, correct pay policy applied, ops notified instantly.
10. **After the visit**: patient gets a WhatsApp summary + rating request → feeds the clinician's quality score and public profile.

### C4. Target patient / family journey

Book with **date, time, address, and complaint** (or an ops agent books for them — walk-in/phone/B2B referral all land in the same pipeline). Package purchase opens an episode and generates the **whole visit series**. Portal/WhatsApp shows upcoming visits — who is coming, when, live ETA on the day. Self-service cancel/reschedule inside policy windows (fees shown before confirming). After each visit: summary + rating. Caregivers see what their consent scope allows. Identity: one patient record per **person** (OTP-verified phone + "booking for someone else" concept), never merged by phone string.

### C5. Target ops journey

One board: today's fleet on a map (breadcrumb-fed), lanes for **unassigned (including overdue backlog)**, at-risk (no acknowledgment, no-show watchdog, stuck states — all cron-driven), disputes with a real resolution workflow (uphold/partial/refund + payout clawback + `force_closed_by_admin` as a reachable state). Assignment respects availability, conflicts, and area — violations require an explicit override. Every review task the system generates lands in a queue somebody owns.

### C6. Platform layer (what makes mobile "tomorrow" real)

- **API:** `/api/v1/clinician/*` (today, visit transitions, documentation, tasks, earnings), `/api/v1/patient/*` (visits, records, booking), `/api/v1/ops/*`. Server actions refactored to call the same service functions the routes expose. JSON error contract (no more flash cookies).
- **Auth:** token issuance + refresh for native clients alongside the cookie session (same NextAuth identity); suspension enforced at token refresh; identity-keyed rate limits (not IP — carrier CGNAT).
- **Push:** `PushSubscription` linked to `userId/staffId`; an in-app notification service that clinical/ops events actually call; FCM/APNs transport added with the mobile app.
- **Offline:** IndexedDB queue for transitions + documentation with idempotency keys and server-side dedup; conflict surfaced, never silently dropped.
- **Jobs:** a real scheduler (cron) for watchdogs, SLA sweeps, payout runs, webhook reconciliation sweep — replacing "someone clicks a button on one patient's chart".

---

## 5. Part D — Phased roadmap

Every phase ships working, verifiable behavior. Every new feature from Phase 1 onward is built **service-function-first** (API route + thin form) — that is the standing rule that keeps mobile compatibility true.

### Phase 0 — Reconnect the wires (days) — *make what exists actually work*
- B1 field-name fix (+ standardize on `visitId` everywhere) · B2 inline error feedback on every clinician form (rethrow + `useActionState`; kill the `/admin` flash for clinician surfaces) · B3 session report counts as check-out evidence · B4 assessment key mapping · B7 license-gate + identify + audit the discharge summary · B9 strip `encounterId` in all wrappers + auto-link the check-in encounter · B8 render notes/reports in the staff chart · B11 overdue-unassigned lane · B18/B19 trivia.
- **Acceptance:** a physiotherapist completes an entire real visit — acknowledge → travel → arrive → check in → document → check out — from their phone, sees every error inline, and the visit lands `completed` with documentation attached. *(This is currently impossible.)*

### Phase 1 — Close the operational loop (weeks) — ✅ SHIPPED
- ✅ Visit creation & scheduling screen for ops (date + time + service + area); package → **visit series** generation; reschedule as a first-class non-punitive action; wire the 6 disruption actions into ops UI + pre-travel decline on the clinician Today card. *(scheduling + series + reschedule shipped this build; the 6 disruption actions shipped earlier as B10.)*
- ✅ **Fix the money sign** (B5) + include disruption pay in earnings/CSV (B6) + honest "deductions" label.
- ✅ **Notifications v1:** link `PushSubscription` to users; assignment/reassignment push + WhatsApp to clinicians; "on the way / arrived" WhatsApp to families. *(`src/lib/notifications/`; `notify`/`notifyStaffByRoles`.)*
- ✅ **Watchdog cron:** no-show detection, stuck-state sweep, unassigned backlog alert, escalation/handoff SLA sweep, webhook reconciliation sweep (B12). *(`src/lib/ops/watchdog.ts` + `/api/internal/ops/watchdog`.)*
- ✅ **Ops queues** + dispute resolution actions (reach `force_closed_by_admin`). *(`resolveDisputeAction` + `DisputeResolveControl` on `/admin/ops/disputes`; `force_closed_by_admin` now reachable.)*
- ✅ Portal: upcoming visits visible (bridge Postgres Visit → portal), self-cancel/reschedule **requests**; signup phone-format + OTP fix (B13); booking-for-someone-else (B14). *(`loadUpcomingVisits` + `requestVisitChangeAction`.)*
- ✅ Transition-legality map + state-machine unit tests (B15); server-side vitals bounds + ISO timestamps (B16).
- **Acceptance (met):** a package buyer sees all their upcoming visits in the portal; a clinician is pushed a new assignment within seconds; ops gets an alert for a visit nobody acknowledged; a cancellation books the fee with the correct sign.
- **Note:** the FHIR-Task-backed `dispatch-review`/`visit-review`/`ops-dispute-review` queue lanes remain a thin follow-up — the watchdog raises drift via ops push + audit today, and disputes have a real resolution workflow; a dedicated task-code queue view is the remaining polish.

### Phase 2 — Money & trust (weeks)
- Cash capture at check-out (amount/gratuity/receipt channel) + cash reconciliation screen; **payout runs** writing `ProviderPayout` (approve → pay → record → clinician statement + push), earnings page reconciles to payout records exactly; per-clinician rate cards (retire the dead `baseRateEgp` or use it).
- **Ratings v1:** post-visit WhatsApp rating → `Visit.patientRating` → clinician quality score → `publicRating`; complaint pipeline.
- **Workforce v1:** onboarding pipeline UI (PhysioProfile states + TrialVisitScorecard + nurse/doctor equivalents), license document upload + expiry alerts (T-60/30/7).
- Amendments UI + co-sign task creation (red-flag → doctor co-sign with SLA); draft/autosave on documentation.
- **Acceptance:** a clinician's earnings page matches their payout record to the pound; a patient rates a visit from WhatsApp and it appears on the clinician's quality score.

### Phase 3 — Live ops & field grade (weeks–months)
- GPS breadcrumb ingest endpoint + background pings from the PWA → live ops map + family ETA; approval-gated geofence overrides with real photo upload; arrival protocol capture (identity/consent/safety/companions); check-out geofence override parity.
- **Offline queue** (IndexedDB + Background Sync + idempotency keys) for transitions and documentation; fix PWA PHI caching (explicit cache allow-list).
- Lone-worker safety: SOS, inactivity escalation, check-out-delay alert.
- **Acceptance:** a full visit works in airplane mode and syncs on reconnect; ops watches the fleet live; a dispute investigation can actually pull breadcrumbs + door photo + signature.

### Phase 4 — Mobile app (Expo)
- Token auth + refresh; FCM/APNs push; native background location (feeds the same ping endpoint); camera capture for wounds/door-proof; the app consumes `/api/v1` built in Phases 1–3. By this point the API exists — the mobile app is a client, not a re-platforming.

---

## 6. What NOT to rebuild

Keep and build on: the RBAC matrix + policy engine (`can()`/`requireStaffCan` — transport-agnostic, mobile-ready), license gating (`canSignClinical`), the transition ledger + TOCTOU guard, geofence evaluation policy, all `src/lib/medplum/*` clinical modules, the audit hash chain, Kashier/InstaPay payment core (with the Phase 1 sign fix + replay guard), and the mobile-first clinician UI shell. The billing policy engines (`cancellation-policy.ts`, `physio-pay-policy.ts`) are correct as pure functions — the bug is in how one caller applies them.
