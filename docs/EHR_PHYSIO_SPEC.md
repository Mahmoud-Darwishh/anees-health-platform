# Anees EHR — Physiotherapist Workspace, End-to-End Spec

**Version:** 2.0
**Status:** Active — Slice A landed 2026-06-05. Sprint plan rewritten. Reads as the canonical doc.
**Owners:** Founder + CTO + Clinical Director (Physio lead) + Med Ops Director
**Last reviewed:** 2026-06-05
**Companion docs:**
- [`CTO_STRATEGY.md`](./CTO_STRATEGY.md) — long-term architecture, hiring, compliance
- [`EHR_NOW.md`](./EHR_NOW.md) — current sprint backlog kept ruthlessly current
- [`EHR_ROLE_MATRIX.md`](./EHR_ROLE_MATRIX.md) — cross-role permission matrix
- [`FHIR_CATALOG.md`](./FHIR_CATALOG.md) — FHIR resources used by the physio workspace (Goal, Encounter, Task, Observation, Composition)
- [`SECURITY_ARCHITECTURE.md`](./SECURITY_ARCHITECTURE.md) — license gating, case scope, break-glass, R2 streaming
- [`HIPAA_COMPLIANCE.md`](./HIPAA_COMPLIANCE.md) — how clinician actions map to §164.312 technical safeguards
- [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md) — infra runbook + on-call playbook

> **Read order:** §1 (what changed) → §2 (reality check) → §5 (business model) → §25 (sprint plan v2). Everything else is reference.

---

## 0. Reading guide

This doc describes the **physiotherapist workspace** end-to-end: who the user is, how they get an account, what they see, what they can do, how the platform pays them, how we keep them and their patients safe, and what we still need to build.

It covers three lenses:

| Lens | What it answers |
|---|---|
| **Medical** | What clinical work a physio can actually do inside the EHR — visits, notes, vitals, goals, discharge. **No deep clinical depth in v1** (assessments library, body diagram, structured PT diagnoses are deferred until clinical protocols are written — see §24.2). |
| **Business** | How a physio joins, gets paid, how the platform monetises, how the consumer-facing `Doctor` profile relates to the operational `Staff` account, how cancellations and disputes flow into money. |
| **Tech** | The actual code shape — schema, server actions, RBAC, audit, validation, observability, scalability boundaries. |

If you only read four sections, read §1, §2, §5, §25.

---

## 1. What changed in this revision (v2.0)

This revision rewrites v1.1 around three product decisions made on 2026-06-05:

### 1.1 HEP (Home Exercise Program) removed entirely

The HEP suite was scaffolded ahead of clinical protocols. Without proper Egyptian-physio protocols and guidelines, prescribing exercises through the platform creates clinical-safety exposure we are not ready to underwrite. The whole HEP track is **deleted, not paused**:

- ❌ Models removed: `Exercise`, `PatientHEP`, `PatientHEPItem`, `HEPAdherenceEntry`, `HEPReminderState`
- ❌ Enum removed: `HEPStatus`
- ❌ Back-relations cleaned off `Patient`, `Staff`, `Visit`
- ❌ Disabled action stubs `createPatientHepAction` / `updatePatientHepAction` / `discontinuePatientHepAction` deleted
- ❌ `hepAdherence` field removed from `CreatePhysioReportInput`, the Zod schema, and the session form
- ✅ Migration `20260605120000_drop_hep_workspace` lands the database changes defensively

HEP returns only when (a) the Clinical Director ships a protocol library, (b) Med Ops can monitor adherence, (c) a designated physio owner is named for content curation. None of those preconditions are present in 2026 Q2.

### 1.2 EHR / clinician workspace is English-only

The team works comfortably in English. No `next-intl` strings, no Arabic chrome, no RTL handling inside `/clinician/*` or `/admin/*`. Patient `arabicName` data is still **displayed** where it identifies a patient — that is data, not UI chrome.

What this does **not** change: the public marketing/booking surfaces (`/[locale]/*`) and the patient portal stay bilingual. This is purely about staff-facing screens.

### 1.3 Deep clinical depth is deferred

The original spec (§9 of v1.1) promised:
- A structured assessment library (Berg, Tinetti, TUG, ROM, MMT, 6MWT, etc.)
- An interactive body diagram with SNOMED body-site coding
- APTA-pattern structured PT diagnoses
- Red-flag keyword detection on session notes

All of these are real and worthwhile. None of them ship until the Clinical Director has signed off on (i) the score-interpretation rules, (ii) the red-flag trigger list, (iii) the escalation SOPs that go with each. Building them without those preconditions ships clinical-decision-support without clinical decision rules — which is worse than not having them. See §24.2.

### 1.4 Business focus moves to the front

Two business surfaces are now first-class:

- **`Doctor` row ↔ `Staff` row bridge** (§5). The three physios who appear publicly as `Doctor` records — Reem Ragab, Menna Yahia, Mohamed Hamza — must also have operational accounts. The data model that links them must be explicit, audited, and not require manual JSON edits.
- **Earnings & disruption money flow** (§16, §17). Cancellation timing → patient fee → physio pay must be a single configurable engine, not three half-engines.

---

## 2. Reality check — built vs. spec'd vs. deferred (2026-06-05)

| Area | Status | Where to find it |
|---|---|---|
| `StaffRole.physiotherapist` + RBAC helpers | ✅ Built | [`src/lib/auth/rbac.ts`](../src/lib/auth/rbac.ts) |
| `staff-credentials` NextAuth provider | ✅ Built | [`src/auth.ts`](../src/auth.ts) |
| Demo physio account (`physio@aneeshealth.local / Physio@123`) | ✅ Built | [`prisma/seed.ts:2212`](../prisma/seed.ts) |
| `/clinician` route group + shell + bottom nav | ✅ Built (English-only) | [`src/app/clinician/`](../src/app/clinician) |
| "My Journey" (today) page | ✅ Skeleton; missing map, badges, distance, end-of-day card | [`src/app/clinician/today/page.tsx`](../src/app/clinician/today/page.tsx) |
| "My Patients" list (case-scoped) | ✅ Skeleton | [`src/features/ehr/clinician-physio/patients/`](../src/features/ehr/clinician-physio/patients) |
| Session workspace at `/clinician/visits/[visitId]/session` | ✅ Built (template picker, pain sparkline, assessment form) | [`src/features/ehr/clinician-physio/session-workspace/`](../src/features/ehr/clinician-physio/session-workspace) |
| Tasks | ✅ Minimal — lists FHIR `Task`; start/complete actions | [`tasks/TasksPageView.tsx`](../src/features/ehr/clinician-physio/tasks/TasksPageView.tsx) |
| Earnings | ✅ Week / month / all-time totals | [`earnings/EarningsPageView.tsx`](../src/features/ehr/clinician-physio/earnings/EarningsPageView.tsx) |
| Profile | ✅ Read-only | [`profile/ProfilePageView.tsx`](../src/features/ehr/clinician-physio/profile/ProfilePageView.tsx) |
| Visit state machine schema | ✅ Built (`VisitState`, `VisitDisruptionCode`, `VisitStateTransition`, `VisitParticipant`, `VisitLocationPing`) | [`prisma/schema.prisma`](../prisma/schema.prisma) |
| Visit lifecycle server actions | 🟡 Thin wrappers around admin-patient actions; no first-class clinician implementations | [`clinician-physio/actions.ts`](../src/features/ehr/clinician-physio/actions.ts) |
| `PhysioProfile` table | ✅ Schema only — no rows for the 3 doctor-table physios | [`prisma/schema.prisma`](../prisma/schema.prisma) |
| `TrialVisitScorecard` table | ✅ Schema only | — |
| Patient goals | ✅ Schema + actions (using raw SQL, should be Prisma) | [`patients/actions.ts`](../src/features/ehr/clinician-physio/patients/actions.ts) |
| Discharge summary (basic) | ✅ Auto-signed clinical note draft | [`patients/actions.ts:191`](../src/features/ehr/clinician-physio/patients/actions.ts) |
| **HEP** | ❌ **REMOVED** in slice A | n/a |
| **Arabic chrome in EHR** | ❌ **REMOVED** in slice A | n/a |
| `/clinician/patients/[id]` detail page | ❌ Not built — physio falls into admin chart today | n/a |
| Map preview on My Journey | ❌ Not built | n/a |
| Geofence proximity detection + override | ❌ Not built | n/a |
| 4-confirmation check-in protocol | ❌ Not built (single transition form today) | n/a |
| Check-out recap + signature + cash gratuity | ❌ Not built | n/a |
| Cancellation-fee engine + pay-logic engine | ❌ Not built | [`src/lib/billing/`](../src/lib/billing) (empty) |
| SOS button + inactivity check | ❌ Not built | n/a |
| Audit writes on Postgres-only mutations | ❌ TODOs scattered in `patients/actions.ts` | n/a |
| Public `/[locale]/physiotherapists/[slug]` | ❌ Out of scope until further notice | — |
| Telephysio | ❌ Deferred — see §24.4 | — |
| Assessment library (Berg/TUG/etc.) | ❌ Deferred — see §24.2 | — |
| Body diagram, PT diagnoses, red-flag detection | ❌ Deferred — see §24.2 | — |

**Snapshot:** infrastructure is solid. The visible product is half-built. The non-visible business plumbing (earnings policy, audit, lifecycle attribution) is the weakest link.

---

## 3. Locked product decisions

### 3.1 Original 10 (carried from Sprint 0, locked 2026-06-04)

| # | Area | Locked answer | Why |
|---|---|---|---|
| 1 | Geofence radius default | 150 m platform default; per-patient override via `Patient.handoffGeofenceRadiusMeters`. Tower-block → 200 m. Rural/farm → 500 m + override flow. | Cairo density + towers need breathing room; 50 m fails too often. |
| 2 | Co-sign on physio sessions | Routine = no co-sign. Red-flag-triggered = doctor co-sign within 24h. Discharge summary = optional notification, no required co-sign. | Matches Athena standard; respects scope while protecting safety. |
| 3 | Public profile threshold | 10 verified visits + ≥ 4.0★ + active license + physio opt-in. | Filters noise; achievable in 1–2 weeks. |
| 4 | HEP video hosting | Cloudflare R2 + Stream. *Moot in v2.0 — HEP removed.* | Control + offline cache for elderly patients. |
| 5 | Telephysio in MVP | No — Phase 2. Daily.co when it ships. | MVP focus on home visits. |
| 6 | Physio compensation models | Pay-per-session only. UI does not render hourly/salary. | 95% of physios will be per-session. |
| 7 | Physio→Doctor red-flag handoff | Hold-to-trigger SOS **and** auto-task on trigger-keyword detection, both with 4-hour SLA. | Belt and suspenders for safety. |
| 8 | Discharge summary signature | Physio signs as primary. Doctor on care team gets read-only + optional counter-sig. | Respects scope; reduces friction. |
| 9 | HEP adherence reminders | *Moot in v2.0 — HEP removed.* | n/a |
| 10 | Trial visit scoring | 7-domain rubric, 1–5 each. Pass = mean ≥ 4.0 AND no domain < 3.0. Stored in `TrialVisitScorecard`. | Concrete + defensible. |

### 3.2 New decisions added in this revision (v2.0)

| # | Area | Locked answer | Date | Owner |
|---|---|---|---|---|
| 11 | HEP feature | Removed entirely from schema + code + UI. Re-introduce only when a Clinical Director-owned protocol library exists. | 2026-06-05 | Founder + Clinical Director |
| 12 | Clinician + admin EHR i18n | English-only. No `next-intl` in `/clinician/*` or `/admin/*`. Patient `arabicName` stays as display data. Public surfaces stay bilingual. | 2026-06-05 | Founder |
| 13 | Deep clinical depth | Deferred until Clinical Director ships score-interpretation rules + red-flag trigger list + escalation SOPs. No assessment library, body diagram, structured PT diagnoses, or keyword detection ship before then. | 2026-06-05 | Clinical Director |
| 14 | `Doctor` row ↔ `Staff` row bridge | `PhysioProfile.publicDoctorId` (Int, optional) FK to `Doctor.id`. One physio = one `Doctor` row + one `Staff` row + one `Provider` row + one `PhysioProfile` row + one Medplum `Practitioner`. Created and kept in sync by a single seed/admin action. | 2026-06-05 | CTO |
| 15 | Public physio profile page | Deferred — focus on accounts + EHR. The public `Doctor` page already exists; we will not duplicate it under `/physiotherapists/*` until accounts are healthy. | 2026-06-05 | Founder |
| 16 | Goals storage | Use Prisma typed access on `PatientGoal`, not raw SQL via `$executeRaw`. Refactor in slice E. | 2026-06-05 | CTO |
| 17 | Visit lifecycle authorship | Clinician-side server actions must write `VisitStateTransition` rows directly (not via thin wrappers). The admin-patient actions stop being the single source of truth for lifecycle. | 2026-06-05 | CTO |
| 18 | Audit-log coverage | Every Postgres mutation in `/features/ehr/clinician-physio/**/actions.ts` MUST emit an `AuditLog` row in the same transaction. Slice E removes the "TODO(audit)" comments. | 2026-06-05 | CTO + Compliance |

---

## 4. The physio user (personas)

Two design personas drive every UI decision. We design for both at once — if a feature fails Hossam (less tech-comfortable) it doesn't ship.

**Persona A — "Mariam, 28, post-grad ortho specialist, Cairo."**
Works mornings in a hospital; joins Anees for afternoon home visits. iPhone. Tech-comfortable. Earns per visit. Wants speed, clean documentation, visible patient progress, and a steady stream of visits.

**Persona B — "Hossam, 45, neuro-rehab specialist, Alexandria."**
20 years of clinical experience. Anees-only. Mid-range Android. Less tech-comfortable. Wants big tap targets and clinical depth. Cares about being trusted with complex cases.

Both must feel that the platform respects their time and treats them as a professional, not a gig worker.

---

## 5. The business model — physios as a `Doctor` **and** a `Staff` account

This is the section that has changed the most. Read it carefully.

### 5.1 Why the `Doctor` table stays

The `Doctor` table on the public site is **content** — bios, ratings, languages, prices, the data that powers `/[locale]/doctors/[slug]` and the booking funnel. It is intentionally not the same shape as the operational `Provider` / `Staff` data model. Mixing the two would couple consumer marketing changes (bio copy edits, photo swaps, price formatting) to operational deploys.

We keep the `Doctor` table exactly where it is.

### 5.2 The bridge to operational accounts

Every clinician on the platform — physio, doctor, nurse — has rows in five different layers:

| # | Row | Lives in | Purpose | Maintained by |
|---|---|---|---|---|
| 1 | `Doctor` (optional) | Postgres | Public site profile content | Marketing |
| 2 | `Provider` | Postgres | Operational entity: payouts, payment type, area coverage | Med Ops |
| 3 | `Staff` | Postgres | Workforce identity: role, license, password hash, login | Med Ops |
| 4 | `User` | Postgres (NextAuth) | Auth identity: email, role=`staff`, optional Google link | NextAuth |
| 5 | `Practitioner` | Medplum | FHIR clinical authorship reference | Auto-created on first clinical write |
| 6 | `PhysioProfile` (physios only) | Postgres | Specialty sidecar: syndicate, certifications, onboarding state | Med Ops |

Linkage rules:
- `Staff.providerId` is the only required link to make a physio receive visits.
- `Staff.medplumPractitionerId` is set lazily on first clinical write via `ensureCachedMedplumPractitionerForStaff`.
- `User.staffId` is set when the Med Ops admin promotes a user record to a staff account.
- `PhysioProfile.staffId` is required for the clinician workspace to render the physio sidecar tab.
- **New:** `PhysioProfile.publicDoctorId` — optional FK pointing at the `Doctor.id` row that represents this physio on the public site. Lets us reconcile public photo + bio + slug without duplicating data.

### 5.3 The three physios in the `Doctor` table today

These three rows already exist in the consumer-facing `Doctor` table from [`prisma/seed-doctors.ts`](../prisma/seed-doctors.ts):

| Doctor.id | Slug | Name (EN) | Specialty |
|---|---|---|---|
| `101` | `reem-ragab-physiotherapist` | Reem Ragab | Orthopedic / post-op |
| `102` | `menna-m-yahia-physiotherapist` | Menna M. Yahia | Orthopedic / general rehab |
| `103` | `mohamed-mahmoud-hamza-physiotherapist` | Mohamed Mahmoud Hamza | Neurological rehab |

To make any of them log in and see their day, each needs:
1. A `Provider` row (`code`, `fullName`, `roleId=physiotherapist`, payment terms)
2. A `Staff` row (`role='physiotherapist'`, `providerId` linked, bcrypt password, `clinicalLicenseType='physiotherapy_syndicate'`)
3. A `User` row (`role='staff'`, `staffId` linked)
4. A `PhysioProfile` row (`staffId` linked, `publicDoctorId` linked, `onboardingState='approved'`, syndicate data)
5. A Medplum `Practitioner` (auto-created on first clinical write)

**Slice B** (next deliverable) ships a seed script `prisma/seed-physio-accounts.ts` that creates rows 1–4 for these three, idempotently. The Medplum `Practitioner` is left to lazy creation. See §25.1.

### 5.4 Onboarding pipeline (business-side) for new physios

For physios beyond the seeded three, the business pipeline is:

| Step | Owner | Duration | What lands in the system |
|---|---|---|---|
| 1. Inbound (referral, LinkedIn, internal) | Med Ops | n/a | Lead row in HubSpot (outside this schema) |
| 2. Phone screen | Med Ops | 10 min | `PhysioProfile` created, `onboardingState='invited'` |
| 3. Document verification | Med Ops | 1–2 d | `syndicateNumber`, `syndicateExpiresAt`, `documentsSubmittedAt` set |
| 4. Background reference | Med Ops | 1–2 d | Notes on `PhysioProfile` (no separate model in v1) |
| 5. Orientation | Physio (self-paced) | 30 min | `interviewedAt` set when complete |
| 6. Trial visit | Senior physio + Clinical Director | 1 visit | `TrialVisitScorecard` row created, scored 7 domains |
| 7. Approval | Med Ops | 5 min | `Staff` row created, `Provider` row created, `User` row created, `PhysioProfile.onboardingState='approved'`, `approvedAt` set |
| 8. First live visit | Physio + Med Ops | within 72h | Med Ops manually assigns a warm case |

In v1 there is no public `/join/physio` form. New physios come through Med Ops directly (the funnel is small enough — < 5/month — to handle by hand). When volume justifies it (~ 20+/month inbound), we build the public form.

### 5.5 Compensation model (locked)

Per Decision #6: **pay-per-session only** in v1.

- `Provider.paymentType = 'per_visit'` for all physios
- `Provider.baseRateEgp` = the rate per visit for that physio (negotiated)
- Multipliers for visit type / urgency / time-of-day live in `lib/billing/physio-pay-policy.ts` (slice E)
- Payouts collected weekly via `ProviderPayout` (existing schema)
- Tax-clean: physios receive a YTD earnings PDF on demand (slice F)

Disruption pay logic — when a physio doesn't complete a visit through no fault of their own (cancelled, refused at door, etc.) — see §16.2.

---

## 6. Identity, auth, and licensing

### 6.1 Sign-in

There is no separate "physio login" page. Physios sign in via the existing staff login at `/en/auth/login`, which already routes through the `staff-credentials` NextAuth provider in [`src/auth.ts`](../src/auth.ts).

| Field | Value |
|---|---|
| Identifier | Email |
| Credential | Password (bcrypt) |
| Role on session | `session.user.staffRole = 'physiotherapist'` |
| Post-login redirect | `/clinician/today` (via `/admin/clinician` redirect for back-compat) |

On every login we set `Staff.lastLoginAt` (existing) and (slice E) emit an `AuditLog` row with `action='LOGIN'`.

### 6.2 Sign-up

There is no self-service sign-up for physios in v1. Accounts are created by Med Ops at onboarding step 7 (§5.4). When the volume justifies a public form, the only thing to add is the entry-point — the `/join/physio` form simply collects fields that go into `PhysioProfile` with `onboardingState='invited'`. Med Ops still owns activation.

### 6.3 Licensing

- `Staff.clinicalLicenseType = 'physiotherapy_syndicate'`
- `Staff.clinicalLicenseNumber` — syndicate ID
- `Staff.clinicalLicenseExpiry` — set at onboarding
- `PhysioProfile.syndicateNumber/IssuedAt/ExpiresAt` — durable record (Staff fields are the operational mirror, PhysioProfile is the durable record)

License expiry reminders (slice F): push + email at T-60d / T-30d / T-7d. Past expiry → `canSignClinical` returns false ([`rbac.ts:117`](../src/lib/auth/rbac.ts)) and the physio cannot sign new clinical entries until they upload a renewed license.

### 6.4 Session shape (carry from CLAUDE.md)

```ts
session.user = {
  id, name, email, image,
  role: 'staff',
  staffId,
  staffRole: 'physiotherapist',
  phone: null,
}
```

### 6.5 RBAC helpers — what a physio can do

From [`src/lib/auth/rbac.ts`](../src/lib/auth/rbac.ts):

| Helper | Physio allowed? |
|---|---|
| `getStaffUser(['physiotherapist'])` | Required gate for every clinician page/action |
| `canSignClinical(staff)` | Yes if license unexpired |
| `canWriteClinicalCondition(staff, discipline)` | Yes when `discipline === 'physiotherapy'` (deferred; UI doesn't expose it in v1 — see §24.2) |
| `isCaseScopedClinicalRole(role)` | Yes — physios only see patients on their CareTeam |
| `isRestrictedTierEligibleRole(role)` | Yes |

---

## 7. Navigation map

```
/clinician/
├── today           — My Journey (visits today)
├── patients        — case-scoped list
├── patients/[id]   — patient detail (slice D — not built)
├── visits/[id]/
│   └── session     — session workspace
├── tasks           — assigned tasks
├── earnings        — payouts + history
├── profile         — read-only profile (slice F — editable)
└── schedule        — 14-day view (slice F — not built)
```

Bottom nav (mobile-first, 5 chips):

| Icon | Label | Route |
|---|---|---|
| 📅 | My Journey | `/clinician/today` |
| 👥 | Patients | `/clinician/patients` |
| ✅ | Tasks | `/clinician/tasks` |
| 💰 | Earnings | `/clinician/earnings` |
| 👤 | Profile | `/clinician/profile` |

Top bar (always visible):
- "Good day, {staffName}" (English only)
- Home link → `/en`
- Sign out
- *(slice G)* SOS hold-to-trigger button
- *(slice G)* Notification bell

---

## 8. "My Journey" — the today screen

The page a physio sees 70% of the time. Today it renders a vertical list of visit cards from [`getPhysioTodayData`](../src/features/ehr/clinician-physio/data.ts). It's the right structure; it's missing all the things that make it feel premium.

### 8.1 What it shows today

Per-visit card:
- Scheduled time block
- Patient name (Arabic name shown as data line under the English name)
- Service name + area
- Flow state chip: Scheduled → Acknowledged → En route → Arrived → Checked in → Checked out → Closed
- Primary action button driven by flow state
- Transition timeline (last 4 transitions)

### 8.2 What slice C adds (next visible UX uplift)

- **Stats strip** at the top: `4 visits · 2 done · 1 in progress · 1 upcoming · 1,400 EGP earned today`
- **Distance to next visit** (computed from physio's current location to patient GPS, if available)
- **Allergy + DNR badges** on every card (always visible, always prominent)
- **Patient initials avatar** (no photo upload pipeline in v1)
- **End-of-day summary card** appearing after the last visit: visits completed, earnings, notes signed, ratings received
- **Friendlier state chips** with explicit colors per state
- **Empty state**: "No visits today — enjoy the quiet."

### 8.3 What slice D will need from this page

Once `/clinician/patients/[id]` exists, the patient name on each visit card becomes a link into the chart (instead of jumping straight into the session workspace). The session workspace stays as a discrete sub-view for active visits.

### 8.4 What's deferred

- Map preview (Leaflet) — slice F
- Weather / traffic banner — never (operational noise)
- Patient photo upload — deferred until media storage is wired
- WhatsApp ping to patient on `en_route` — slice F when Wapilot integration broadens

---

## 9. "My Patients" — case-scoped list

Lives at [`patients/PatientsPageView.tsx`](../src/features/ehr/clinician-physio/patients/PatientsPageView.tsx). Filters: Active / Upcoming / Recently discharged / All. Search by name (EN/AR) or code.

Case scope is enforced server-side in [`patients/data.ts`](../src/features/ehr/clinician-physio/patients/data.ts) via `listCareTeamPatientIdsForPractitioner`. A physio sees a patient only if they sit on that patient's `CareTeam` in Medplum.

Each row links to (slice D) `/clinician/patients/[id]`. Until D ships, rows link to the admin chart, which is jarring but functional.

---

## 10. Patient detail — the clinician-scoped chart

**Status: not built.** This is slice D.

The admin patient detail at `/admin/patients/[id]` is a 2,000+ line catch-all built for Med Ops. A physio dropped into that page sees too much (medications, prior auths, claims) and too little (no role-aware tab filter). We add a sibling at `/clinician/patients/[id]` with a slimmer surface.

### 10.1 Tab set (physio-scoped)

| Tab | What renders | Read | Write |
|---|---|---|---|
| Overview | Banner: allergies, DNR, active conditions (top 3), active care plan, session progress, last 3 visits | ✅ | — |
| Sessions | List of physio sessions on this patient; tap → session workspace if active | ✅ | sign / amend |
| Vitals | BP, HR, SpO2, pain — read all; write within physio scope | ✅ | ✅ (limited) |
| Notes | Physio's own notes + read-only nursing + medical | ✅ | sign / amend |
| Documents | Lab PDFs, imaging — authenticated download via `/api/ehr/documents/[id]` | ✅ | upload (slice F) |
| Goals | Patient's active goals (Prisma `PatientGoal`) — progress bars | ✅ | ✅ |
| Care Team | Read-only list of CareTeam participants | ✅ | — |
| Tasks | Tasks assigned to me for this patient | ✅ | start / complete |

### 10.2 What's hidden from physios

- Prescribe Medications (doctor only)
- Lab Order authoring (doctor only)
- Insurance / Billing (Finance + Med Ops only)
- Audit Log (admin + Compliance only)
- Demographics edit (Med Ops only)
- **Assessments library / body diagram / PT diagnoses** — deferred per §24.2

### 10.3 Always-visible banner

Same banner pattern as the admin chart, but slimmer:
- Name + Arabic name + age + gender
- Allergies (red badge, always shown)
- DNR status (orange when applicable)
- Top 3 active conditions
- Active care plan + session progress badge ("4 / 12")
- Last visit clinician + date
- Restricted-tier lock indicator if applicable

---

## 11. Session form — fast documentation

The session workspace at [`session-workspace/SessionWorkspacePageView.tsx`](../src/features/ehr/clinician-physio/session-workspace/SessionWorkspacePageView.tsx) is the closest thing to a "feels-fast" experience the clinician shell has. Target documentation time: **under 90 seconds per visit**.

### 11.1 Structure (single scrollable form)

| Section | Fields | Notes |
|---|---|---|
| **A. Context** | Patient (locked), date/time (auto), session number ("4 of 12"), visit type, duration | All auto-filled from check-in |
| **B. Subjective** | Pain before (0–10 slider), subjective function (free text), new symptoms (optional) | Voice-to-text on free-text *(slice F)* |
| **C. Objective** | Template-driven structured fields (post-op knee, stroke rehab, low-back, geriatric, custom) | Template stays; deep assessment library deferred §24.2 |
| **D. Interventions** | Free-text list (chip-picker deferred to §24.2) | |
| **E. Response** | Pain after, response summary, next session focus, home plan (free text) | "Home plan" stays — it's a free-text recommendation, not HEP infrastructure |
| **F. Discharge readiness** | Not yet / 1–2 sessions / Ready | "Ready" triggers discharge summary draft on save |
| **G. Sign** | Big primary button | Disabled until required fields are filled |

### 11.2 What "fast" requires

1. **Last session's values pre-fill** so changes-only need typing — wired today via the sparkline + session dashboard
2. **Template per condition** — wired (5 templates)
3. **One tap to sign** — wired
4. **Offline-safe** — *(slice G)* IndexedDB queue + retry-on-reconnect
5. **Voice-to-text** — *(slice F)* Web Speech first, Whisper fallback if accuracy poor

### 11.3 Immutability + amend

- Signed = locked. UI shows striked-through edits; server rejects mutation
- Amend creates a new versioned `Composition` linked to the original (FHIR-standard pattern)
- Slice E adds first-class `amendPhysioSessionAction` (today this routes through the admin action)

---

## 12. Visit lifecycle — the full state machine

**This section is canonical and unchanged from v1.1.** The state machine is well-formed and the schema is fully migrated. The gap is in the server actions (slice E).

### 12.1 State diagram

```
                                 ┌────────────────────────────────┐
                                 │                                ▼
   draft  →  scheduled  →  acknowledged  →  en_route  →  arrived  →  checked_in  →  documenting  →  signed  →  checked_out  →  completed
     │           │              │               │            │              │               │             │              │
     ▼           ▼              ▼               ▼            ▼              ▼               ▼             ▼              ▼
  abandoned  cancelled_     declined_by_   diverted_    refused_     patient_      session_      amended      disputed
              before_ack    physio         in_transit   at_door      not_home      interrupted
                                                                       │
                                                                       └─→ rescheduled_in_place
                                ┌── cancelled_by_patient (any time before signed)
                                ├── cancelled_by_med_ops (any time before checked_in)
                                ├── reassigned_to_other_physio (before en_route)
                                └── force_closed_by_admin (rare; full audit)
```

### 12.2 State definitions

| State | Trigger | Who can move it | Side effects |
|---|---|---|---|
| `draft` | Med Ops drafting; not yet visible to physio | Med Ops | None |
| `scheduled` | Visit confirmed + assigned to physio | Med Ops, auto-dispatcher | Push to physio; calendar block |
| `acknowledged` | Physio taps Acknowledge | Physio | `acknowledgedAt` set; locks visit to this physio |
| `declined_by_physio` | Physio declines with reason | Physio | Returns to dispatch board |
| `cancelled_by_patient` | Patient cancels | Patient, Med Ops on patient's behalf | Cancel-fee per §16 |
| `cancelled_by_med_ops` | Operational cancel | Med Ops | Reason captured |
| `reassigned_to_other_physio` | Med Ops swaps before `en_route` | Med Ops | Original physio notified |
| `en_route` | Physio taps Start travel | Physio | `enRouteAt` set; location ping starts |
| `diverted_in_transit` | Physio cannot make it | Physio | Med Ops auto-tasked |
| `arrived` | Geofence pass OR manual | Auto + Physio | `arrivedAt` + GPS stored |
| `refused_at_door` | Patient refuses to open | Physio | Pay logic per §16 |
| `patient_not_home` | Knock + call + wait 10 min, no answer | Physio + auto-rule | Med Ops auto-tasked |
| `checked_in` | Physio confirms identity + consent → session starts | Physio | 4-confirmation protocol (§14) |
| `documenting` | Session form in progress | Physio (implicit) | Auto-save every 15s |
| `session_interrupted` | Emergency, equipment fail | Physio | Escalation flow may trigger |
| `rescheduled_in_place` | Patient agrees to reschedule mid-visit | Physio | Visit splits |
| `signed` | Physio taps Sign | Physio | Note immutable; earnings accrue |
| `amended` | Physio adds amendment after sign | Physio | Versioned Composition |
| `checked_out` | Physio taps Complete visit | Physio | `checkOutAt` + GPS captured |
| `completed` | All required artefacts present | Auto-rule | Invoice + payout accrual + patient summary |
| `disputed` | Patient/caregiver disputes | Patient, Med Ops | Earnings hold; investigator queue |
| `force_closed_by_admin` | Admin closes stuck visit | Admin | Heavy audit |
| `abandoned` | Visit aged past viability | Auto-rule | Cleanup; no pay |

### 12.3 Transition rules (the guardrails)

- `scheduled` is the only first state from `draft`
- `en_route` requires `acknowledged` first
- `checked_in` requires geofence pass **or** logged override
- `signed` requires at least one of: signed clinical note, completed assessment, recorded vitals
- `checked_out` requires at least one signed entry (unless `session_interrupted` or `refused_at_door`)
- `completed` is system-set, not human-set
- Once `completed`, only `disputed` or `amended` mutates it

### 12.4 What slice E adds

| Action | From → To | Notes |
|---|---|---|
| `acknowledgeVisitAction` | scheduled → acknowledged | First-class; writes VisitStateTransition; AuditLog |
| `declineVisitAction` | scheduled \| acknowledged → declined_by_physio | Reason required |
| `startTravelAction` | acknowledged → en_route | Begins location pings |
| `divertVisitAction` | en_route → diverted_in_transit | Med Ops auto-tasked |
| `markArrivedAction` | en_route → arrived | Auto via geofence OR manual override |
| `markPatientNotHomeAction` | arrived → patient_not_home | ≥3 attempts logged |
| `markRefusedAtDoorAction` | arrived → refused_at_door | Captures who refused |
| `checkInVisitAction` | arrived → checked_in | 4-confirmation protocol (§14) |
| `startDocumentingAction` | checked_in → documenting | Auto on first form input |
| `interruptSessionAction` | documenting → session_interrupted | Triggers escalation if medical |
| `rescheduleInPlaceAction` | checked_in \| documenting → rescheduled_in_place | Spawns new scheduled visit |
| `signPhysioSessionAction` | documenting → signed | Server validates required artefacts |
| `amendPhysioSessionAction` | signed \| completed → amended | Versioned Composition |
| `checkOutVisitAction` | signed → checked_out | Captures end GPS |
| `completeVisitAction` | checked_out → completed | System-fired; invoice + summary |
| `disputeVisitAction` | completed → disputed | Investigator queue |
| `forceCloseVisitAction` | any → force_closed_by_admin | Admin only; heavy audit |

### 12.5 What the physio sees

Friendly chip labels (English only — Decision #12):

| State | Chip label |
|---|---|
| `scheduled` | Scheduled |
| `acknowledged` | Confirmed |
| `en_route` | On the way |
| `arrived` | Arrived |
| `checked_in` / `documenting` | In session |
| `signed` | Signed — tap to check out |
| `completed` | Complete |
| `cancelled_by_*` | Cancelled |
| `patient_not_home` / `refused_at_door` | Missed |
| `disputed` | Under review |

---

## 13. Geofence & location handling

### 13.1 Why we use it

1. **Authenticity** — proves the visit happened where it should have. Insurer-grade.
2. **Safety** — wrong-address visits are dangerous; catches them before harm.
3. **Operations** — ETA, time-on-site, route optimization depend on real GPS.

### 13.2 Parameters

| Parameter | Default | Notes |
|---|---|---|
| Radius | **150 m** | Per-patient override via `Patient.handoffGeofenceRadiusMeters` |
| Source of truth | `Patient.gpsLatitude` + `gpsLongitude` | Verified on first visit |
| Accuracy gate | ≤ **50 m** reported accuracy | Reject below |
| Ping frequency | **30 s** during `en_route` / `arrived` | `VisitLocationPing`; 90-day retention |
| Auto-arrival trigger | inside radius for **≥ 30 s** at acc ≤ 50 m | Avoids drive-by false positives |
| Indoor fallback | If accuracy > 100 m for > 60 s | Switch to manual confirm with override |

### 13.3 The address-truth ritual (first visit)

1. Med Ops books first visit at stated address
2. Physio (or nurse) checks in; check-in GPS becomes the **candidate** address
3. App prompts: "Confirm this is the correct entrance for future visits?" with map
4. Physio confirms → `Patient.gpsLatitude/Longitude` set + `Patient.addressVerifiedAt` stamped
5. From visit 2 onwards, geofence enforced

### 13.4 Override flow

1. Physio taps "I'm at the door but GPS says otherwise"
2. App requires one of: photo of entrance, 4-digit code from patient (Med Ops sends via WhatsApp), or Med Ops dispatch unlock
3. Override permitted; `VisitStateTransition.isOverride=true` + `overrideMethod` recorded
4. > 3 overrides / 30 days for the same physio → Compliance review task

### 13.5 Privacy boundaries

| Surface | Live location | Historical pings |
|---|---|---|
| Clinician themselves | ✅ | ✅ (own only) |
| Med Ops (dispatch) | ✅ during shift | ✅ 90 days |
| Admin | ✅ | ✅ audited |
| Compliance | ✅ audited | ✅ |
| Doctors / nurses / peers | ❌ | ❌ |
| Patient | Blurred zone + ETA during `en_route` only | ❌ |
| Public / investors | ❌ | Aggregate heatmaps only |

Tracking is **shift-scoped** (`en_route` → `checked_out`). Not 24/7.

### 13.6 Slice E will deliver

- `VisitLocationPing` write loop during `en_route`/`arrived` (today the table is empty)
- 30s/50m auto-arrival logic
- Override flow with media capture
- Compliance dashboard for excessive overrides (deferred to slice G)

---

## 14. Check-in flow

The most important 60 seconds of a visit. Get it right and everything that follows is defensible. **Not built today** — slice E.

### 14.1 The 4-confirmation protocol

Single screen, top to bottom:

1. **Identity confirmation** — patient name + DOB shown. Toggle: confirmed by patient / by caregiver (which one) / unable
2. **Consent confirmation** — "Patient/caregiver consents to today's session?" yes / re-consent required
3. **Safety check** — "Environment safe to proceed?" yes / no (no → escalation modal with type: aggressive person/animal, hazardous condition, suspicion of abuse, weapon visible, intoxication)
4. **Companions present** — multi-select: alone / patient + primary caregiver / patient + family / patient + outsider

Tap "Confirm check-in" → state → `checked_in`. All four toggles captured in `VisitStateTransition.contextJson` (typed JSON).

### 14.2 What's captured

```ts
{
  visitId,
  state: 'checked_in',
  checkInAt: ISO timestamp,
  checkInLat, checkInLng, checkInAccuracyMeters,
  identityConfirmedBy: 'patient' | 'caregiver:{name}' | 'unable',
  consentReaffirmed: boolean,
  safetyClearance: boolean,
  companionsPresent: ['caregiver_primary', 'family_member', ...],
  geofencePassed: boolean,
  overrideMethod: 'photo' | 'code' | 'med_ops' | null,
  overridePhotoMediaId: string | null,
}
```

### 14.3 Check-in photo (configurable)

For high-risk patients or insurer-required visits, policy can require a check-in photo (door / room, never the patient's face). Captured + watermarked + stored as FHIR `Media`. Configurable per `InsurerProfile` or per `CarePlan`. Default off in v1.

---

## 15. Check-out flow

The exit ritual. Locks the visit, drives payment, kicks off post-visit experience. **Not built today** — slice E.

### 15.1 Pre-conditions to allow check-out

System blocks check-out unless one of:
- A clinical entry is signed (note, assessment, or vitals)
- Visit ended in `refused_at_door`, `patient_not_home`, or `session_interrupted` with reason
- Admin override is in place (rare; audited)

Prevents drive-by visits with no documentation.

### 15.2 Check-out screen

1. **Recap card** — visible summary of what was documented
2. **Patient acknowledgement** *(optional, configurable per insurer)* — patient/caregiver taps "I confirm Hala visited today" + finger-signature on canvas. Stored as FHIR `Provenance` with image
3. **Cash gratuity capture** *(Egypt-specific, opt-in)* — log amount for tax-clean record (§16.9)
4. **Receipt delivery** — WhatsApp / printed / both / none
5. **Next session** — auto-suggested by care plan; book on the spot
6. **Big "Complete visit" button**

### 15.3 What fires on `completed`

- `Invoice` created or attached to active `CarePlan`
- Patient summary PDF generated and WhatsApp'd + portal Documents
- Care-team thread updated with machine-summary
- Earnings accrued to physio's pending payout
- Quality auto-score updated (on-time %, sign-within-target %)
- If applicable, claim auto-staged for Insurance Coordinator
- Post-visit feedback request to patient (2-hour delay)

### 15.4 Sanity checks

| Check | Threshold | Action |
|---|---|---|
| Visit duration | < 5 min | Flag for Med Ops review |
| Check-out distance from check-in | > 500 m | Flag for Med Ops review |
| Missing vitals on vitals-required visit type | — | Soft warning before commit |
| Pain documented, no intervention | — | Soft warning |
| Goal past due, still not met | — | Discharge consideration prompt |

---

## 16. Disruptions — cancellation, refusal, no-show, dispute

This section decides whether the physio gets paid, the patient gets charged, and the relationship survives. **Cancellation-fee engine and physio-pay-policy engine are not built today** — slice E.

### 16.1 Patient cancellation

| Timing | Patient charged | Physio paid |
|---|---|---|
| > 24h before | 0% | 0% |
| 4h–24h | 25% (config) | 0% or 25% (config) |
| < 4h | 50% | 50% |
| Physio en_route | 100% | 100% |
| Physio arrived | 100% | 100% |

Patient cancels via portal, WhatsApp ("CANCEL <ref>"), or by calling Med Ops. All paths land on `cancelVisitByPatientAction`.

### 16.2 Physio cancellation

| Reason code | Physio earnings | Operational follow-up |
|---|---|---|
| `physio_personal_emergency` | 0 (first 2/year free, then review) | Med Ops finds cover |
| `physio_vehicle_breakdown` | 0; transport reimbursement possible | Med Ops finds cover |
| `physio_traffic_blocked` | Partial pay if reschedule agreed | Med Ops finds cover or reschedules |
| `weather` | No penalty (system-wide pause) | Mass reschedule if applicable |
| `unsafe_environment` | Full pay | Compliance follow-up; visit not retried until cleared |
| `personal_safety` | Full pay | Compliance + Founder review |
| `medical_emergency_other_patient` | Pay for completed, none for skipped | Med Ops finds cover |

### 16.3 No-show / patient not home (10-minute protocol)

1. Physio arrives, geofence passes
2. Knock + ring bell — wait 3 minutes
3. Call patient phone — wait 2 minutes
4. Call caregiver phone — wait 2 minutes
5. Notify Med Ops; Med Ops attempts contact
6. Wait additional 3 minutes if Med Ops working it
7. After **10 minutes total**, mark `patient_not_home`

Patient charged per cancellation policy. Physio paid 100% (configurable). Auto-task for Med Ops to investigate.

### 16.4 Refused at door

Reasons captured (multi-select):
- Patient feels unwell, wants to skip
- Family member objects
- Trust/comfort issue with this clinician
- Did not realize visit was scheduled
- Other

Not counted as no-show. Cancellation policy applies (usually 100% since physio reached the door).

If "trust/comfort issue" selected → Med Ops auto-tasked to call patient + consider reassignment going forward.

### 16.5 Patient incapable

| Subtype | Action |
|---|---|
| Unresponsive / medical emergency | Escalation → 123 (ambulance) → on-call MD. State → `session_interrupted`. Full pay |
| Severely confused (new onset) | Escalation to on-call MD. Defer session. Full pay |
| Hospitalized (learned at door) | `cancelled_by_med_ops` / `patient_hospitalised`. Full pay |
| Deceased (learned at door) | High-sensitivity protocol: condolence script, do not enter unless invited, notify Med Ops + on-call MD, MoH death-report. Full pay |

### 16.6 Reschedule on the spot

Patient unwell but stable, asks to reschedule. Workflow:
1. State → `rescheduled_in_place`
2. App offers to book the new visit before physio leaves
3. New `Visit` row created with link back to original
4. Original gets brief courtesy note
5. Pay: default 50% for the physio's time + travel

### 16.7 Disputed visits

Patient or caregiver claims visit didn't happen / care was poor.

1. Raised via portal / Med Ops
2. State → `disputed`. Earnings hold; invoice on hold
3. Investigator (Med Ops + Compliance) reviews:
   - GPS pings + check-in/out coords
   - Check-in/check-out photos if captured
   - Patient acknowledgement signature
   - Session note content
   - Communications history
4. Outcome: confirmed / refunded / partial. Earnings released or clawed back. Documented + audited

### 16.8 Dispute prevention features

- Patient acknowledgement signature at check-out (configurable)
- WhatsApp visit summary within 2h
- Patient sees the same session summary (filtered for clinical safety)
- Single-tap dispute button for 7 days post-visit only

### 16.9 Cash gratuity (Egypt-specific)

Patients commonly tip clinicians. Today this is off-platform and tax-leaky. Optional: physio logs cash tip at check-out (amount). Stored on visit. Counted for tax visibility. Future: in-app tipping via Vodafone Cash / InstaPay so cash isn't needed.

---

## 17. Earnings, schedule, availability

### 17.1 Earnings at a glance (built today)

Top of `/clinician/earnings`:
- This week: N visits, X EGP earned, next payout Sunday
- This month: N visits, X EGP
- All-time: N visits, X EGP

### 17.2 What slice F adds

- **Per-visit breakdown**: date, patient initials, service code, gross, deductions, net, status pipeline (pending sign → signed → invoiced → paid in payout #N)
- **Year-to-date PDF** for tax filing
- **Bank details management**
- **Peer-median comparison** (anonymous): "12-min avg arrival vs scheduled (peer median: 18)"
- **Quality metrics**: rating, on-time %, escalations / 6 mo

### 17.3 Schedule (slice F)

- 14-day calendar grid
- Days off / time blocks / max visits/day / preferred areas
- Swap request flow (raise + pending list)

### 17.4 Pay-policy engine

Slice E ships [`src/lib/billing/physio-pay-policy.ts`](../src/lib/billing) — a single function:

```ts
computePhysioPay(visit: VisitWithStateTransitions, policy: PayPolicy): PayBreakdown
```

Takes the visit and its lifecycle and returns gross / deductions / net / reason codes. The earnings page calls this; the payout job calls this. No two places diverge.

---

## 18. Goals & discharge — minimal viable

### 18.1 Goals

`PatientGoal` schema lives in [`prisma/schema.prisma`](../prisma/schema.prisma):
- `text` (SMART): "Walk 10m unaided"
- `category`: mobility / strength / pain / balance / function / endurance
- `baselineValue`, `currentValue`, `targetValue`, `measurementUnit`
- `targetDate`, `status: in_progress | met | discontinued`
- `metAt`, `authorStaffId`

Built today:
- `createPatientGoalAction`, `updatePatientGoalProgressAction`, `markPatientGoalMetAction` in [`patients/actions.ts`](../src/features/ehr/clinician-physio/patients/actions.ts)

**Slice E refactor:** these actions use `$executeRaw`. Per Decision #16 they move to Prisma typed access. Also: emit `AuditLog` rows.

### 18.2 Discharge summary (basic)

`createDischargeSummaryAction` exists today — generates a clinical note draft with a goal-met summary and immediately signs it. Output: FHIR `Composition` in Medplum.

What's deferred until clinical protocols:
- PDF generation
- WhatsApp / portal delivery automation
- Doctor counter-signature workflow (Decision #8)
- Baseline-vs-final outcome auto-table (needs assessment library — §24.2)

### 18.3 Visualization

Slice C adds goal progress bars on the patient banner. Met goals get a green check. No animation (avoid implying clinical certainty we don't have).

---

## 19. Tasks & communications

### 19.1 Tasks tab (built)

Lists FHIR `Task` resources assigned to the physio:
- Co-sign requests from Med Ops on drafts
- Follow-up reminders
- Documentation gaps ("Sign your visit from June 1")
- (slice E) Red-flag follow-ups with 4-hour SLA tag

Per-task: start, complete, view patient.

### 19.2 Communications (slice F)

Built today: not present in clinician shell. Planned:
- Per-patient threads (patient + family, brokered by Med Ops)
- Med Ops 1:1 thread
- Care-team thread per patient (multi-party)

Backed by FHIR `Communication`. WhatsApp bridge for patient-facing threads via Wapilot.

### 19.3 Escalations (slice G)

SOS hold-to-trigger in topbar:
- Type: medical / safety / operational / other
- Priority: routine / urgent / critical
- Voice-to-text brief description
- Auto-attach location + visit context
- Routes to Med Ops + on-call MD (if medical critical)

---

## 20. Safety — lone worker, identity, hazards (slice G)

### 20.1 Identity verification

Every visit:
- Patient photo (if available) shown on check-in screen
- Verbal confirmation: name + DOB
- For cognitively impaired: primary caregiver confirms by name + relationship
- Failed verification → escalation, do not proceed

### 20.2 Consent reaffirmation

Master Consent signed at platform onboarding (FHIR `Consent`). Every visit reaffirms: one toggle. New intervention → intervention-specific consent modal (deferred until clinical depth lands).

### 20.3 Lone worker safety

Physios visit alone. Anees treats their safety as a system concern:

1. **Pre-visit:** safety brief on patients with hazards flagged (aggressive dog, history of conflict, etc.)
2. **During visit:** app listens for safe-word phrase (configurable, e.g. "I need to grab something from my car"). Triggers discreet Med Ops alert
3. **Inactivity check:** `checked_in` for > 90 min with no activity → silent app ping. No response in 5 min → Med Ops phones. No response → escalation chain
4. **Check-out delay:** scheduled duration + 30 min, no check-out → Med Ops phones
5. **SOS button:** always-on, top bar, hold-to-trigger. Sends location + visit context to Med Ops + on-call manager. Silent on physio's phone

### 20.4 Patient safety flags

Stored on `Patient.safetyFlags` (Json): aggressive dog, mobility hazard, known firearm, family conflict, prior abuse, infection risk, allergy alert. Visible on My Journey card + patient banner. Editable by Med Ops + Doctor + Compliance only.

### 20.5 Hazardous-home protocol

New hazard discovered:
- During visit: "Add safety flag" → note → save → Med Ops notified
- After visit: same; debrief required if severity high
- Future visits surface the flag prominently

### 20.6 Infection control

`PPE required` visit flag → patient is on isolation precautions (TB, MRSA, COVID, C. diff). Pre-visit notice; check-in protocol asks "PPE donned?"

---

## 21. UI/UX principles for the EHR

1. **Big tap targets** — min 44×44 pt. Phones get used with greasy or gloved hands.
2. **English only** — Decision #12. Patient `arabicName` displays as data, not chrome.
3. **One thumb operable** — primary actions reachable with one thumb on a 6.7" phone.
4. **Speed > polish** — animations < 200 ms. No spinners > 1 s without skeleton state.
5. **Banner-first safety** — allergies + DNR always at top, never collapsed.
6. **Defaults that work** — pre-fill last session's values; templates per condition.
7. **Less is more** — never show a field the physio doesn't need for this session type.
8. **Confirmations sparingly** — only sign + delete confirm. Everything else commits instantly.
9. **Optimistic UI** — show success immediately; reconcile in background; recover on failure.
10. **Privacy by default** — patient initials in lists; full name only on detail.
11. **Clinical chrome ≠ marketing chrome** — `/clinician/*` and `/admin/*` use Bootstrap + custom SCSS module; no public-site `<Header>`/`<Footer>`.
12. **No emoji** in production UI. Emoji is for docs.
13. **Color discipline** — red = allergy + SOS; orange = DNR + restricted; green = safe / signed / complete; gray = neutral / inactive. No purple, no rainbow, no novelty.

---

## 22. Tech architecture

### 22.1 Folder layout

```
src/
├── app/
│   ├── clinician/                  # Physio workspace (English only)
│   │   ├── layout.tsx              # Bootstrap shell, SOS-ready topbar
│   │   ├── today/page.tsx          # My Journey
│   │   ├── patients/
│   │   │   ├── page.tsx            # Case-scoped list
│   │   │   └── [id]/page.tsx       # Slice D — patient chart
│   │   ├── visits/[visitId]/session/page.tsx
│   │   ├── tasks/page.tsx
│   │   ├── earnings/page.tsx
│   │   ├── schedule/page.tsx       # Slice F
│   │   └── profile/page.tsx
│   │
│   └── admin/                      # Med Ops / admin (English only)
│       └── patients/[id]/page.tsx  # Full chart with all tools
│
├── features/ehr/
│   ├── admin-patient/              # Shared deep chart used by admin
│   ├── clinician-physio/           # Physio-scoped views & actions
│   │   ├── actions.ts              # Lifecycle actions — slice E first-class
│   │   ├── data.ts                 # My Journey loader
│   │   ├── TodayPageView.tsx
│   │   ├── VisitTransitionForm.tsx
│   │   ├── patients/
│   │   ├── session-workspace/
│   │   ├── tasks/
│   │   ├── earnings/
│   │   └── profile/
│   └── schemas/                    # Zod schemas for actions
│
└── lib/
    ├── auth/                       # NextAuth + rbac + WhatsApp OTP
    ├── billing/                    # Slice E:
    │   ├── cancellation-policy.ts
    │   └── physio-pay-policy.ts
    ├── ehr/                        # Domain rules (alerts, etc.)
    ├── geo/                        # Geofence, ETA, presence policy
    ├── medplum/                    # FHIR client + modules
    └── utils/                      # Logger, audit, rate-limit, CORS
```

### 22.2 Server actions & validation

Pattern (slice E):

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { writeAuditLog } from '@/lib/utils/audit';

const Schema = z.object({
  visitId: z.string().min(1),
  reasonCode: z.enum([...]).optional(),
  reasonNote: z.string().max(500).optional(),
});

export async function acknowledgeVisitAction(formData: FormData): Promise<void> {
  const input = Schema.parse(Object.fromEntries(formData));
  const staff = await getStaffUser(['physiotherapist', 'admin', 'superadmin']);
  if (!staff?.staffId) throw new Error('Unauthorized');

  await prisma.$transaction(async (tx) => {
    const visit = await tx.visit.update({
      where: { id: input.visitId },
      data: { acknowledgedAt: new Date(), state: 'acknowledged' },
    });

    await tx.visitStateTransition.create({
      data: {
        visitId: visit.id,
        fromState: 'scheduled',
        toState: 'acknowledged',
        actorStaffId: staff.staffId,
      },
    });

    await writeAuditLog(tx, {
      tableName: 'visits',
      recordId: visit.id,
      action: 'UPDATE',
      changedFields: { state: 'acknowledged' },
      changedBy: staff.staffId,
    });
  });

  revalidatePath('/clinician/today');
}
```

Three rules:
1. Every action: `getStaffUser(...)` gate first
2. Every action: Zod-parsed input (no raw `FormData.get` in business logic)
3. Every mutation: same Prisma transaction writes the lifecycle row + audit row

### 22.3 Audit discipline

`AuditLog` rows are mandatory for:
- Any `Visit` state mutation
- Any clinical-write entry (notes, vitals, assessments, goals, discharge)
- Any `PhysioProfile` mutation
- Any `Staff` / `User` mutation (incl. login)
- Any "force_closed" or "amended" or "disputed" transition

Mechanism today: scattered `prisma.auditLog.create()` calls + `writeMedplumAuditMirror` for Medplum writes. **Slice E** consolidates into a single helper [`src/lib/utils/audit.ts`](../src/lib/utils) with signature `writeAuditLog(tx, payload)` so every action looks identical.

Future direction (slice E+1): Prisma client extension that auto-emits audit rows on configured models. Until that lands, we use the manual helper and the no-PHI-in-logs lint rule.

### 22.4 RBAC matrix for physio scope

| Operation | Physio | Doctor | Nurse | Med Ops | Admin |
|---|---|---|---|---|---|
| Read own visits today | ✅ | ✅ (own) | ✅ (own) | ✅ all | ✅ all |
| Read patient on own CareTeam | ✅ | ✅ | ✅ | ✅ all | ✅ all |
| Sign physio session note | ✅ | ❌ | ❌ | ❌ | ✅ |
| Sign nursing note | ❌ | ❌ | ✅ | ❌ | ✅ |
| Sign medical note | ❌ | ✅ | ❌ | ❌ | ✅ |
| Author PT diagnosis | ❌ in v1 (deferred) | — | — | — | — |
| Author ICD-10 diagnosis | ❌ | ✅ | ❌ | ❌ | ❌ |
| Prescribe meds | ❌ | ✅ | ❌ | ❌ | ❌ |
| Order lab | ❌ | ✅ | ❌ | ❌ | ❌ |
| Edit demographics | ❌ | ❌ | ❌ | ✅ | ✅ |
| View Invoices/Claims | ❌ | ❌ | ❌ | ✅ | ✅ |
| View AuditLog | ❌ | ❌ | ❌ | ❌ | ✅ |
| Force-close a visit | ❌ | ❌ | ❌ | ❌ | ✅ |

### 22.5 Multi-tenant readiness

There is no `tenantId` on any clinical resource yet. Hospital partnerships (the signed MOU) will force this. Plan (post slice E):

1. Add `tenantId` to `Patient`, `Visit`, `CarePlan`, `Provider`, `Staff`, `PhysioProfile` (default `'platform'`)
2. Add `tenantId` claim to NextAuth session
3. Add tenant filter to every query in `data.ts` files via a single helper
4. Migrate existing rows: all → `'platform'`
5. Hospital signs → new tenant row → onboard their staff with the new `tenantId`

Doing this now is wasted work — wait for the first concrete hospital deal.

### 22.6 Performance & scalability

| Concern | Current state | Threshold for action |
|---|---|---|
| `getPhysioTodayData` N+1 | Today does `Promise.all` over per-visit state + timeline raw queries | At > 30 visits/day/physio, batch into a single CTE |
| Medplum reads on every chart open | No cache; each chart hit is fresh | At 100+ active physios, add 60s edge cache per patient bundle |
| Geofence pings | Will produce 1 row / 30s during travel + visit | At 100 physios doing 5 visits/day, ~30M pings/year. Partition `VisitLocationPing` monthly + 90-day retention |
| Audit log volume | Linear with mutations | Partition `AuditLog` quarterly when > 50M rows |
| Search by patient name | Today uses `contains, mode: insensitive` | Add Postgres `pg_trgm` index when patient count > 10k |

### 22.7 Observability

Today: nothing wired. No Sentry, no log aggregator.

Slice E+ adds:
- Sentry web + server SDK
- One-time-per-error fingerprint to avoid noise
- Structured logger replacing console.error in clinician + admin paths
- Health endpoint `/api/health/clinician` for uptime checks

No clinical content (notes, vitals, PHI) ever leaves the perimeter via Sentry. Confirmed by Sentry config `beforeSend` scrubbing.

### 22.8 Testing

Today: zero. The clinical write paths are the highest-leverage targets.

Slice E+ adds Vitest unit tests for:
- `physio-pay-policy.ts` — every disruption code × every timing bucket
- `cancellation-policy.ts` — every timing bucket
- `getPhysioTodayData` (golden fixtures with state transitions)
- Each lifecycle action under happy + boundary conditions

Playwright E2E (slice H+):
- Login → My Journey → acknowledge → en route → arrive → check in → document → sign → check out → completed
- Patient cancels at each timing bucket → correct fee applied
- Dispute → investigator queue → resolution → earnings released or clawed back

---

## 23. Schema reference (current, post slice A)

### 23.1 Enums (relevant subset)

```prisma
enum StaffRole {
  superadmin admin operator doctor physiotherapist nurse finance viewer
  medical_ops compliance_officer insurance_coordinator
}

enum LicenseType {
  medical_syndicate nursing_syndicate physiotherapy_syndicate
}

enum VisitState {
  draft scheduled acknowledged declined_by_physio
  cancelled_by_patient cancelled_by_med_ops reassigned_to_other_physio
  en_route diverted_in_transit arrived refused_at_door patient_not_home
  checked_in documenting session_interrupted rescheduled_in_place
  signed amended checked_out completed
  disputed force_closed_by_admin abandoned
}

enum VisitDisruptionCode {
  patient_late_cancel patient_no_show patient_refused_care
  patient_hospitalised patient_deceased family_blocked_access
  unsafe_environment physio_personal_emergency physio_vehicle_breakdown
  physio_traffic_blocked weather med_ops_reassignment
  equipment_failure internet_blackout other
}

enum PhysioOnboardingState {
  invited documents_pending documents_submitted
  interview_scheduled trial_visit_scheduled
  approved suspended off_boarded
}

enum GoalStatus { in_progress met discontinued }

enum VisitParticipantRole {
  primary_clinician supporting_clinician observer
  med_ops_oversight compliance_audit
}

enum TrialVisitOutcome { pending passed conditional failed }

// HEPStatus removed in slice A.
```

### 23.2 Models (physio-relevant)

- `Staff` — workforce identity
- `Provider` — operational entity with payment terms
- `User` — auth identity
- `PhysioProfile` — physio specialty sidecar (one-to-one with Staff)
- `Doctor` — public-site content (one-to-one with PhysioProfile when applicable, via `PhysioProfile.publicDoctorId` — added in slice B)
- `TrialVisitScorecard` — trial-visit outcome record
- `Visit` — encounter with full lifecycle fields
- `VisitStateTransition` — append-only lifecycle ledger
- `VisitParticipant` — joint visit / observer model
- `VisitLocationPing` — GPS pings during en_route + visit
- `Patient` — clinical-and-operational subject
- `PatientGoal` — SMART goal authored by clinician
- `CarePlan` — multi-visit program (operational)
- `ProviderPayout` — weekly payout record
- `AuditLog` — every change to anything that matters

(Full schema is in [`prisma/schema.prisma`](../prisma/schema.prisma).)

### 23.3 Schema changes needed for next slices

- **Slice B:** add `PhysioProfile.publicDoctorId Int? @unique` + FK to `Doctor.id`. New migration `link_physio_profile_to_doctor`.
- **Slice C:** none.
- **Slice D:** none (reuses existing models).
- **Slice E:** none if we use existing `VisitStateTransition` / `AuditLog` schemas as-is. Possibly a `Visit.lastTransitionAt` denormalized timestamp for faster My Journey reads — defer until needed.
- **Slice F:** `Staff.bankAccountIban`, `Staff.bankName`, `Staff.bankBranchCode` (encrypted at rest). New migration `physio_bank_details`.
- **Slice G:** `Patient.safetyFlags Json?` (might already exist — check before adding).

---

## 24. Explicitly deferred / future work

This section is as important as the build list. It names what we are **not** doing now and why, so nobody re-litigates the decision in code review.

### 24.1 Home Exercise Program (removed entirely)

Decision #11. Returns when (a) Clinical Director ships a protocol library with contraindications, (b) Med Ops can monitor adherence with an SLA, (c) a designated content owner is named. Until then, "home plan" is a free-text recommendation field on the session note, nothing more.

### 24.2 Deep clinical depth

Per Decision #13, **none** of the following ship until a Clinical Director-owned clinical-protocols document exists:

- **Assessment library** — Berg Balance, TUG, Tinetti, ROM, MMT, 6MWT, NPRS, Modified Ashworth, FIM, DASH, Oswestry, GMFM. Each tool needs (1) a Clinical-Director-approved score-interpretation guide, (2) explicit Egyptian-context calibration, (3) trend-threshold rules for escalation.
- **Interactive body diagram** — Tap-to-mark pain / swelling / ROM with SNOMED body-site coding. Without the protocol library, the data has no clinical destination.
- **Structured PT diagnoses (APTA pattern categories)** — Movement-system diagnosis authoring requires an Egyptian-physio-scope statement we don't have. RBAC allows it (`canWriteClinicalCondition` accepts `physiotherapy`) but no UI exposes it.
- **Red-flag keyword detection** — Auto-spotting "cauda equina" / "calf swelling + redness" / "saddle anesthesia" in notes and proposing escalation. The trigger list must be Clinical Director-owned; the escalation SLA must be on-call-MD-staffed.

These represent ~3 sprints of work and are the most clinically-defensible features in the spec. They wait.

### 24.3 Public physio profile pages

Decision #15. The public `/[locale]/doctors/[slug]` already exists for the three seeded physios. We will not duplicate it under `/[locale]/physiotherapists/[slug]` until the account-side is mature. When we do, it reads from `PhysioProfile.publicDoctorId` and uses the existing `Doctor` content; it does not introduce a separate content store.

### 24.4 Telephysio

Decision #5. Phase 2. Daily.co integration when it ships. Reuses session form with `visitType=telemedicine`. CSP allow-list will need a Daily.co domain entry.

### 24.5 Native mobile app

Per CTO_STRATEGY: Expo (React Native), Phase 3. PWA covers v1. Native shell adds biometric unlock, lock-screen widget for today's visits, and native push.

### 24.6 Multi-tenant hospital partner mode

Per §22.5. Plan exists; execution waits for the first concrete hospital deal so we don't waste design budget.

### 24.7 Public `/join/physio` self-service form

Per §5.4. Build when inbound exceeds ~20/month. Today's volume (< 5/month) is Med-Ops-by-hand.

### 24.8 Insurance claim staging

Auto-stage `Claim` drafts from `completed` visits with structured ICD/CPT codes. Lives in [`features/insurance-coordinator/`](../src/features) — not yet built. Slice I or later, after backend hardening (slice E) lands.

---

## 25. Sprint plan v2 — what's next

This supersedes the v1.1 §32 sprint plan. The decisions in §3 collapse what was 12 sprints into 8 useful slices. Slice A (cleanup) landed on 2026-06-05. Slices B–H are the remaining work.

> **Slice ordering selected by Founder (2026-06-05):** A → B → C → D → E → F → G → H.

### 25.1 Slice B — physios as real accounts (~3 days)

**Goal:** Reem (Doctor 101), Menna (Doctor 102), Mohamed (Doctor 103) can each log into `/clinician/today` and see assigned visits.

**Stories**
- S-B.1 Add `PhysioProfile.publicDoctorId Int? @unique` + FK to `Doctor.id`. Migration `link_physio_profile_to_doctor`.
- S-B.2 New seed script `prisma/seed-physio-accounts.ts` that for each of the 3 doctor rows:
  - upserts `Provider` (role=physiotherapist, paymentType=per_visit, baseRateEgp negotiated)
  - upserts `Staff` (role=physiotherapist, status=active, bcrypt password, `clinicalLicenseType=physiotherapy_syndicate`, `providerId` linked)
  - upserts `User` (role=staff, staffId linked)
  - upserts `PhysioProfile` (staffId linked, publicDoctorId linked, onboardingState=approved, syndicate fields populated, bio mirrored from Doctor)
- S-B.3 Hook the new seed into `npm run db:seed`
- S-B.4 Document the three logins in `docs/EHR_NOW.md` and rotate the placeholder passwords on Founder's first login
- S-B.5 Verify each physio can log in, sees the correct empty My Journey state, and shows the right name in the topbar

**Acceptance criteria**
- `npm run db:seed` is idempotent (re-run safe)
- Each of the 3 physios appears in Staff query with proper role + providerId
- Each can log in with the documented credential
- Each lands on `/clinician/today` with no console errors
- Audit log row written for the seed action (`AuditLog.action='INSERT'` × 4 per physio × 3 physios = 12 rows)

**Out of scope**
- Medplum `Practitioner` is left lazy (first clinical write creates it)
- No public profile changes — Doctor pages already exist

### 25.2 Slice C — clinician shell UI/UX (~1 week)

**Goal:** the workspace feels premium. Mobile-first. Allergies + DNR always visible. Distance + earnings on every glance.

**Stories**
- S-C.1 Redesign `TodayPageView` card layout: time block / patient initials avatar / name + Arabic name (data only) / age / allergy badge / DNR badge / address + landmark + distance / state chip / primary action
- S-C.2 Stats strip at top of My Journey: `4 visits · 2 done · 1 in progress · 1 upcoming · X EGP earned today`
- S-C.3 End-of-day summary card after last visit closes
- S-C.4 Better empty states for My Journey, Patients, Tasks, Earnings
- S-C.5 Topbar polish: SOS placeholder button (non-functional UI for now — slice G wires it), notification bell placeholder
- S-C.6 Color discipline pass: red = allergy + SOS; orange = DNR + restricted; green = safe + signed; gray = neutral
- S-C.7 New `clinician-shell.scss` tokens: spacing, breakpoint, color, large-text mode
- S-C.8 Mobile viewport test — every primary action reachable with right thumb on iPhone 13/14/15 + Galaxy S22
- S-C.9 SessionWorkspacePageView: add big "Sign session" button at bottom-right (sticky), keep sparkline + assessments

**Acceptance criteria**
- Lighthouse mobile score ≥ 90 on `/clinician/today`
- No horizontal scroll on any clinician page at 375 px viewport
- Allergy + DNR badges visible on every My Journey card
- Stats strip computes the correct numbers from today's visits
- Color usage matches §21 discipline

**Out of scope**
- Map preview (slice F)
- Voice-to-text (slice F)
- Distance shows "—" when no patient GPS — that's a slice F input

### 25.3 Slice D — `/clinician/patients/[id]` chart (~1 week)

**Goal:** physios get a chart that is not the admin chart.

**Stories**
- S-D.1 New route `src/app/clinician/patients/[id]/page.tsx` with case-scope gate
- S-D.2 New `src/features/ehr/clinician-physio/patient-detail/` module:
  - `data.ts` — single loader returning typed bundle (overview, sessions, vitals, notes, documents, goals, careTeam, tasks)
  - `PatientDetailView.tsx` — banner + tab nav + tab content
  - `tabs/` — `OverviewTab.tsx`, `SessionsTab.tsx`, `VitalsTab.tsx`, `NotesTab.tsx`, `DocumentsTab.tsx`, `GoalsTab.tsx`, `CareTeamTab.tsx`, `TasksTab.tsx`
- S-D.3 Banner component (shared with My Journey card later)
- S-D.4 Hide forbidden tabs (Medications / Lab Orders / Insurance / Audit / Demographics)
- S-D.5 Link from My Journey card patient-name → `/clinician/patients/[id]` (visit card primary action still goes to session workspace)
- S-D.6 Link from Patients list row → `/clinician/patients/[id]`

**Acceptance criteria**
- Physio cannot reach a patient outside their CareTeam (server-side throws; client never renders)
- All eight allowed tabs render without console errors
- No reference to deferred clinical surfaces (no body diagram, no APTA picker, no assessment library)
- Banner shows the right safety badges

**Out of scope**
- Document upload (slice F)
- Vitals authoring beyond what already exists in admin actions

### 25.4 Slice E — backend hardening (~1.5 weeks)

**Goal:** lifecycle actions become first-class. Audit log is universal. Cancellation + pay policies live in one engine each.

**Stories**
- S-E.1 New `src/lib/utils/audit.ts` with `writeAuditLog(tx, payload)` helper
- S-E.2 New `src/lib/billing/cancellation-policy.ts` exporting `computeCancellationFee(visit, cancelledAt, cancelledBy)`
- S-E.3 New `src/lib/billing/physio-pay-policy.ts` exporting `computePhysioPay(visit, disruptionCode | null)`
- S-E.4 Refactor `src/features/ehr/clinician-physio/actions.ts` — replace every thin wrapper with a first-class action per the §22.2 pattern (gate, Zod, transaction, lifecycle row, audit row, revalidate)
- S-E.5 Refactor `src/features/ehr/clinician-physio/patients/actions.ts` — replace `$executeRaw` with Prisma typed access on `PatientGoal`. Emit audit rows.
- S-E.6 `VisitLocationPing` write loop in the en-route client (PWA-safe). Idempotency on (visitId, capturedAt).
- S-E.7 Geofence helper `src/lib/geo/geofence.ts` extended with `checkProximity(patientLat, patientLng, currentLat, currentLng, radiusM, accuracyM) → { inside, accuracyOk }`. Auto-arrival timer (30 s inside).
- S-E.8 Override flow: photo / code / Med Ops unlock paths. Photo stored as FHIR `Media`.
- S-E.9 4-confirmation check-in screen wired to the new `checkInVisitAction`
- S-E.10 Check-out recap screen + optional patient signature + cash gratuity capture wired to the new `checkOutVisitAction`
- S-E.11 Replace all `TODO(audit)` comments — none left in `clinician-physio/**/actions.ts`
- S-E.12 Vitest fixtures for `cancellation-policy.ts` and `physio-pay-policy.ts` — 100% branch coverage on these two files

**Acceptance criteria**
- `grep "TODO(audit)" src/features/ehr/clinician-physio` returns zero
- Every action in `clinician-physio/actions.ts` follows the §22.2 pattern
- `cancellation-policy.ts` + `physio-pay-policy.ts` are the only places fee/pay logic lives
- Vitest passes for those two files; CI gate added
- A test physio can complete an entire visit (acknowledge → en_route → arrived [geofence] → checked_in [4-confirm] → documenting → signed → checked_out → completed) and `VisitStateTransition` ledger shows all 7 rows with correct attribution

**Out of scope**
- Offline IndexedDB queue (slice G)
- Voice-to-text (slice F)

### 25.5 Slice F — earnings, schedule, profile, comms polish (~1 week)

**Stories**
- S-F.1 Earnings: per-visit breakdown table, YTD PDF, bank details management (encrypted at rest), peer-median anonymous comparison
- S-F.2 Schedule: 14-day grid; days off / time blocks / max-visits-per-day self-service
- S-F.3 Swap request flow → Med Ops dispatch board
- S-F.4 Profile editor (specialties, languages, bio EN, certifications upload)
- S-F.5 License expiry reminders (T-60d / T-30d / T-7d push + email)
- S-F.6 Communications threading: per-patient + Med Ops 1:1 + care-team
- S-F.7 WhatsApp bridge for patient-facing threads via Wapilot
- S-F.8 Map preview on My Journey (Leaflet, already in stack)
- S-F.9 Voice-to-text on session form free-text fields (Web Speech API)
- S-F.10 Patient WhatsApp ping on physio `en_route` (blurred-zone ETA only)
- S-F.11 Document upload to chart (`POST /api/ehr/documents` → FHIR Binary)

**Acceptance criteria**
- Earnings page matches `ProviderPayout` records exactly
- YTD PDF includes net + gross + per-visit detail
- Schedule edits propagate to Med Ops dispatch within 60 s
- WhatsApp threading works end-to-end on a test patient

### 25.6 Slice G — safety, lone worker, offline (~1 week)

**Stories**
- S-G.1 SOS hold-to-trigger button wired to Med Ops alert + on-call manager
- S-G.2 Inactivity ping: 90-min checked_in with no activity → silent app ping; no response → Med Ops phones
- S-G.3 Check-out delay alert (scheduled + 30 min, no check-out)
- S-G.4 Safe-word phrase listener (configurable, opt-in)
- S-G.5 Patient `safetyFlags Json?` field — always-visible banner + Med Ops management UI
- S-G.6 PWA install prompt on second login
- S-G.7 IndexedDB offline queue for session forms + vitals + assessments
- S-G.8 Conflict resolution modal on reconnect
- S-G.9 Map tile cache per assigned area
- S-G.10 Restricted-tier patient handling (re-auth + reason on access)

**Acceptance criteria**
- SOS triggers Med Ops alert with location + visit context within 3 s
- Inactivity escalation chain tested end-to-end
- Physio can complete an entire visit on airplane mode and sync on reconnect

### 25.7 Slice H — disruption flows + cancellation policy (~3 days)

**Stories**
- S-H.1 Patient cancel from portal + WhatsApp `CANCEL <ref>` keyword
- S-H.2 `cancelVisitByPatientAction` + `cancelVisitByMedOpsAction` + `reassignVisitAction` + `declineVisitAction`
- S-H.3 `markRefusedAtDoorAction` + `markPatientNotHomeAction` with attempt-log enforcement
- S-H.4 `divertVisitAction` + `interruptSessionAction` + `rescheduleInPlaceAction`
- S-H.5 Dispute flow: `disputeVisitAction` + investigator queue at `/admin/ops/disputes`
- S-H.6 Sensitive deceased-patient protocol UI (condolence script, no automated downstream messaging)

**Acceptance criteria**
- All 22 visit states reachable in tests
- Cancellation fee computed correctly per timing bucket
- Physio earnings reflect pay logic per disruption code
- E2E Playwright test covers happy path + 3 disruption paths

### 25.8 Slice I — when clinical protocols arrive

Triggered by the Clinical Director shipping a clinical-protocols document. Until that lands, this slice is dormant.

**Stories (preview)**
- S-I.1 Assessment library (top 6: ROM, MMT, Berg, TUG, NPRS, 6MWT) with Clinical-Director-approved score interpretation
- S-I.2 Trend chart per tool over patient visits
- S-I.3 Interactive body diagram (SVG anterior/posterior) with SNOMED body-site coding
- S-I.4 PT diagnosis picker with APTA pattern categories — UI exposes the already-allowed RBAC
- S-I.5 Red-flag trigger word detection in session notes + 4-hour SLA escalation task tagged `red_flag`
- S-I.6 Discharge summary baseline-vs-final outcome auto-table

---

## 26. Demo script — current state (post slice E)

Once slice E lands, this 4-minute script makes the workspace investor-grade. Until then, the demo is "skeleton + intent."

1. **Open My Journey on a phone.** Show "4 visits today, 1 in progress, earned 1,400 EGP, next: Mrs. Salma in 12 min, 2.3 km away."
2. **Tap Mrs. Salma's card.** Show banner: allergies (penicillin), DNR, last visit summary.
3. **Tap "Start travel."** ETA computed, route line on map, location pings begin.
4. **Auto-arrival fires** when inside 150 m geofence for 30 s. Card flips to "Arrived → Check in."
5. **Check-in protocol:** identity confirm → consent → safety → companions → tap Confirm. `VisitStateTransition` row written with all 4 toggles.
6. **Open session form.** Pick "stroke rehab" template — Modified Ashworth + Berg fields appear (in slice I; in v1, the structured fields are a free-text template).
7. **Update goal: "Walk 10m unaided"** — current value from 4m → 6m. Progress bar moves on banner.
8. **Sign session.** Note locked. Earnings increment in real time.
9. **Check-out screen:** recap → patient signature → next-visit booking → Complete.
10. **Show patient portal on a second device.** Patient sees session summary, can tap dispute within 7 days only.

---

## 27. Operational runbook

### 27.1 Daily

- Med Ops monitor `/admin/ops/disputes` and the un-acknowledged-visit queue
- Med Ops triage red-flag tasks within the 4-hour SLA
- Med Ops review override-rate per physio (Compliance threshold: > 3 / 30 d)

### 27.2 Weekly

- Finance runs `ProviderPayout` job → physios receive WhatsApp confirmation
- Compliance reviews any `force_closed_by_admin` or `disputed` outcomes
- Clinical Director reviews any `session_interrupted` with medical reason

### 27.3 Monthly

- Founder review: cancellation rate by reason, dispute rate, average rating, on-time %
- Clinical Director review: documentation completeness audit (10% random sample)

### 27.4 Quarterly

- Each physio reviews tracking-data retention with Compliance (DPL 151/2020)
- License expiry sweep: anyone within 60 days → reminder + Med Ops follow-up

### 27.5 Incident response

- SOS triggered: Med Ops + on-call manager paged within 30 s → physio contacted within 2 min
- Critical escalation from session: on-call MD paged within 30 s → MD contacts physio within 4 min
- Patient deceased at door: Clinical Director + Med Ops Director paged → condolence protocol + MoH death-report

---

## 28. Acceptance bar before "first paying hospital partner"

The hospital MOU is signed. Before we onboard a hospital tenant, these must all be true:

| Item | Required state |
|---|---|
| Slices B + C + D + E + F + G + H all merged and live | ✅ for two consecutive weeks |
| Sentry wired across clinician + admin | ✅ |
| Zero `TODO(audit)` in `src/features/ehr/**/actions.ts` | ✅ |
| Multi-tenant scoping retrofit (§22.5) | ✅ — every clinical table has `tenantId` |
| Clinical Director clinical-protocols document v1 | ✅ — at least the red-flag list + 6 standard assessments |
| Slice I clinical depth (assessments + body diagram + PT diagnoses + red-flag detection) | ✅ |
| OVH Bahrain migration off Hostinger | ✅ — per `EHR_NOW.md` |
| Insurance Coordinator workspace at least at MVP | ✅ |
| Compliance Officer training program documented | ✅ |
| Penetration test passed (red-team via external party) | ✅ |
| Egypt DPL 151/2020 compliance documentation | ✅ |
| Disaster recovery: full DB backup restored in < 4 h on a drill | ✅ |

This list is the gate. None of it is negotiable.

---

## 29. Glossary

| Term | Meaning |
|---|---|
| Anees | The platform |
| Care plan | Multi-visit clinical program (operational + clinical) |
| Care team | FHIR-modeled group of clinicians assigned to a patient |
| Case-scoped | Read scope = patient on the user's CareTeam |
| Check-in protocol | 4-confirmation ritual at `arrived → checked_in` |
| Clinician | Any clinical role — physio, doctor, nurse |
| `Doctor` (table) | Public-site content row |
| Geofence | Radius around patient address that gates check-in |
| HEP | Home Exercise Program (removed in v2.0) |
| MOU | Memorandum of Understanding — signed hospital partner agreement |
| Med Ops | Medical Operations team — dispatch, scheduling, escalation |
| PHI | Protected Health Information |
| `Provider` (table) | Operational entity for payouts and assignment |
| Restricted tier | Privacy-elevated patient (VIP, conflict, sensitive) |
| `Staff` | Workforce identity row |
| Tenant | A hospital partner organization (future) |
| Visit lifecycle | The state machine in §12 |

---

*End of EHR_PHYSIO_SPEC.md v2.0*
