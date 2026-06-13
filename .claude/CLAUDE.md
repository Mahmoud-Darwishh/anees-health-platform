# Anees Health Platform — Claude Code Context

> **Last refresh:** 2026-06-05. This file is the canonical engineering reference. Companion docs sit in `docs/`.

Production-grade bilingual (EN/AR) health-tech platform serving Egyptian elite home care today, with a signed hospital-partner MOU and a planned MENA expansion. **Next.js 16 App Router + React 19 + TypeScript strict**. Clinical data is **Medplum (FHIR)**. Operational data is **Postgres + Prisma**. Self-hosted Medplum on a VPS (Hostinger today, OVH Bahrain in flight). Security, audit, and accessibility are non-negotiable.

> **Companion docs (`docs/`):**
> - [README.md](../docs/README.md) — guided tour of all docs
> - [CTO_STRATEGY.md](../docs/CTO_STRATEGY.md) — long-term architecture, phases, hiring, compliance
> - [EHR_NOW.md](../docs/EHR_NOW.md) — short-term sprint plan, kept ruthlessly current
> - [EHR_ROLE_MATRIX.md](../docs/EHR_ROLE_MATRIX.md) — definitive RBAC + clinical workflows + regulatory overlay
> - [EHR_PHYSIO_SPEC.md](../docs/EHR_PHYSIO_SPEC.md) — physiotherapist workspace, end-to-end spec
> - [FHIR_CATALOG.md](../docs/FHIR_CATALOG.md) — Medplum resource catalog
> - [SECURITY_ARCHITECTURE.md](../docs/SECURITY_ARCHITECTURE.md) — defense-in-depth layers
> - [HIPAA_COMPLIANCE.md](../docs/HIPAA_COMPLIANCE.md) — HIPAA + Egypt DPL mapping
> - [DEPLOYMENT_RUNBOOK.md](../docs/DEPLOYMENT_RUNBOOK.md) — infra + ops runbook

---

## Stack at a glance

| Layer | Choice | State |
|---|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack dev) | Live |
| Language | TypeScript 5, strict mode | Live |
| i18n | `next-intl` 4.6 — locales: `en`, `ar` | Live for public site + patient portal. **Admin EHR + `/clinician/*` are English-only** by design. |
| Styling | SCSS modules + design tokens (no Tailwind); Bootstrap on admin/portal shells | Live |
| PWA | `@ducanh2912/next-pwa` + custom worker (`worker/index.ts`) | Live |
| Push | `web-push` (VAPID) — `PushSubscription` table | Live |
| Maps | Leaflet (coverage page) | Live |
| Operational DB | **Postgres + Prisma 5.22** — schema: `prisma/schema.prisma`, client: `src/lib/db/prisma.ts` | Live, 9 migrations applied |
| Clinical DB | **Medplum (FHIR), self-hosted** — client: `src/lib/medplum/client.ts` | Live, 24 modules |
| Auth | **NextAuth v5 (Auth.js, `5.0.0-beta.31`)** with Prisma adapter + JWT sessions. Providers: Google OAuth, patient credentials (phone or case-ID + password), staff credentials (email + password, bcrypt). Login + logout audit live. | Live |
| OTP | **WhatsApp OTP via Wapilot** (`api.wapilot.net/api/v2`) for patient onboarding; OTP store in `src/lib/auth/whatsapp-otp-store.ts` | Live |
| Caregiver portal access | FHIR `Consent` resources govern caregiver scopes (`profile / visits / vitals / notes / tasks`) — see `src/lib/medplum/consent-policy.ts` | Live |
| Medical file storage | **Cloudflare R2** (S3-compatible) for medical documents — see `src/lib/storage/r2-medical.ts`. Files are still surfaced through FHIR `DocumentReference` + `Binary` for clinical metadata. | Live |
| Malware scanning | **`src/lib/security/malware-scan.ts`** — pluggable (mock for dev, HTTP scanner for prod, ClamAV-compatible). Background job at `/api/internal/ehr/documents/scan`. | Live (mock backend in dev) |
| Validation | **Zod 4.4** — used heavily in `src/features/ehr/schemas/`; rolled into mutation routes incrementally | Partial |
| Payments | Kashier (test + live) — booking funnel + webhook | Live (Egypt only) |
| Multi-tenancy | `Tenant` model + `tenantId` columns on Patient/Provider/Visit/CarePlan/Invoice/OnlineBooking/Staff. Defaulted to `"platform"` tenant for backwards-compat. | Foundations only (Phase 1A) |
| Tests | **None yet** under `src/`. Planned: Vitest + Playwright before hospital go-live. | Gap |
| Observability | **No Sentry / log aggregator yet.** Targeted for the next two sprints (see EHR_NOW.md). | Gap |
| Hosting | **Self-hosted on Hostinger VPS** today (Next.js + Postgres + Medplum). Target = **OVH Bahrain**, see DEPLOYMENT_RUNBOOK.md. | Live but to be migrated |

---

## Architecture (current)

```
src/
├── auth.ts                      # NextAuth v5 — providers + JWT session augmentation + login audit
│
├── app/                         # Next.js routes (App Router)
│   ├── [locale]/                # /en/* and /ar/* — public site + patient portal + auth pages
│   │   ├── (about)/             # /about-us
│   │   ├── (contact)/           # /contact-us
│   │   ├── (legal)/             # /privacy-policy, /terms-and-conditions
│   │   ├── auth/                # /login, /signup, /error, /whatsapp-otp-test
│   │   ├── booking/             # Booking flow
│   │   ├── coverage/            # Service-area map
│   │   ├── doctors/             # Doctor listing + profiles
│   │   ├── payment/             # Kashier gateway pages
│   │   ├── portal/              # ✅ Patient portal — tabbed workspace (consent-gated for caregivers)
│   │   ├── services/            # SEO service landing pages (under restructure)
│   │   ├── settings/pwa/        # Push notification opt-in
│   │   └── specialties/         # SEO specialty landing pages (under restructure)
│   │
│   ├── admin/                   # ⚠️ Staff EHR / ops — NextAuth + RBAC. English-only. Bootstrap shell.
│   │   ├── clinician/           # Gateway redirect to /clinician/today
│   │   ├── compliance/          # 🆕 Audit log dashboard (compliance_officer + admin)
│   │   ├── escalations/         # Escalations queue
│   │   ├── insurance/           # 🆕 Insurer + coverage + prior-auth + claims dashboard
│   │   ├── nursing/dashboard/   # Nurse-ops dashboard
│   │   ├── ops/                 # 🆕 Visit dispatch + disputes (medical_ops + operator)
│   │   │   └── disputes/        # Disputed-visit queue
│   │   └── patients/            # Patient list + huge detail page (server actions for all clinical writes)
│   │
│   ├── clinician/               # 🆕 Discipline-scoped clinician workspace (English-only)
│   │   ├── layout.tsx           # Top bar + ClinicianBottomNav
│   │   ├── page.tsx             # Dispatch → /clinician/today
│   │   ├── today/               # "My Journey" — today's visits + state transitions
│   │   ├── patients/            # Case-scoped patient list (CareTeam-driven)
│   │   ├── visits/[id]/session/ # Active-visit session workspace
│   │   ├── tasks/               # FHIR Task list (start/complete)
│   │   ├── earnings/            # Week / month / lifetime payout summaries
│   │   ├── profile/             # Read-only license + syndicate display
│   │   └── ui/                  # Shared workspace UI bits
│   │
│   ├── caregiver/               # ❌ Deleted — caregivers access via `/[locale]/portal` + Consent
│   │
│   ├── api/                     # API route handlers
│   │   ├── auth/                # NextAuth + WhatsApp OTP + patient register + 🆕 logout-audit
│   │   ├── bookings/            # create, payment/initiate, payment/webhook, promocode/validate
│   │   ├── coverage/            # coverage check + stats
│   │   ├── ehr/documents/[id]/  # Authenticated document streaming (FHIR Binary + R2)
│   │   ├── internal/            # 🆕 Internal-only routes (cron / scheduler)
│   │   │   └── ehr/documents/scan/  # Background malware-scan job
│   │   ├── medplum/health/      # Medplum connectivity probe
│   │   └── pwa/                 # public-key, subscriptions, send
│   │
│   └── ~offline/                # PWA offline fallback
│
├── features/                    # Domain modules (feature-first)
│   ├── booking/components/
│   ├── coverage/components/
│   ├── doctors/components/
│   ├── ehr/
│   │   ├── admin-escalations/        # Escalations module
│   │   ├── admin-nursing-dashboard/  # Nurse dashboard module
│   │   ├── admin-patient/            # ⭐ Patient EHR detail (page-view + actions + data + schemas)
│   │   ├── clinician-physio/         # 🆕 Physiotherapist workspace — TodayPageView, session, tasks, earnings, patients, profile
│   │   └── schemas/                  # Zod schemas for admin actions
│   ├── portal/                       # Patient-portal feature modules
│   └── pwa/                          # PWA components + hooks
│
├── components/                  # Shared, app-wide UI only
│   ├── common/                  # Reveal, WhatsApp, RelatedLinks, PwaInstallPrompt, SocialBrandIcon
│   ├── layout/                  # Header, Footer, Breadcrumb, MobileBottomNav
│   └── sections/home/           # Home page section compositions
│
├── lib/
│   ├── api/                     # Server-side data access (doctors, pricing, specialties, content-services, promocode)
│   ├── auth/                    # RBAC, license-gating, Wapilot, OTP store, session helpers, 🆕 admin-nav-policy
│   ├── billing/                 # 🆕 cancellation-policy + physio-pay-policy (EGP)
│   ├── config/                  # App config, booking pricing, nursing-ops-policy (vitals thresholds)
│   ├── db/                      # Prisma singleton
│   ├── ehr/                     # nursing-alerts, 🆕 clinician-physio-profile resolver
│   ├── geo/                     # presence-policy (geofence rules)
│   ├── medplum/                 # ⭐ 24 modules — FHIR clinical core. See "Medplum integration" below.
│   ├── models/                  # Domain types (booking.types, doctor.types)
│   ├── portal/                  # patient-record (server-only resolver — session-scoped)
│   ├── pwa/                     # Subscription store + push helpers
│   ├── security/                # 🆕 malware-scan (pluggable AV backends)
│   ├── seo/                     # Search/discovery metadata helpers
│   ├── storage/                 # 🆕 r2-medical (Cloudflare R2 client + key builder + sanitizer)
│   └── utils/                   # app-logger, cors, rate-limit, coverage, slug, structured-data, metadata
│
├── hooks/                       # Cross-cutting hooks (useReveal)
├── i18n/                        # next-intl request config
├── assets/scss/                 # Global SCSS: base, layout, components, pages, utils
├── styles/                      # Global stylesheet entry
└── types/                       # Global TS types + SCSS module shim

prisma/
├── schema.prisma                # Single source of truth — all DB models
├── migrations/                  # 9 applied migrations (init → patient_goal_fhir_link)
└── seed.ts                      # Lookup tables + doctors seed (run: npm run db:seed)
```

**Rule of thumb:** domain-specific code → `features/<domain>/`. Truly app-wide UI → `components/`. Cross-cutting utilities → `lib/`. Admin / ops pages → `src/app/admin/`. Discipline-scoped clinician work → `src/app/clinician/`. Public + patient surfaces → `src/app/[locale]/`.

---

## Medplum integration (the clinical core)

Medplum is the **single source of truth for clinical data**. Postgres holds operational + financial data only.

### Modules in `src/lib/medplum/` (all server-only)

| Module | FHIR resource(s) | Purpose |
|---|---|---|
| `client.ts` | n/a | Singleton with auto client-credentials login + 401 retry |
| `config.ts` | n/a | Reads `MEDPLUM_BASE_URL/CLIENT_ID/CLIENT_SECRET` |
| `constants.ts` | n/a | Code systems, identifiers, extension URLs |
| `fhir-extensions.ts` | n/a | Egyptian-context FHIR extensions (e.g. address-map URL, syndicate license) |
| `patients.ts` | `Patient` | Sync from/to Postgres `Patient.medplumPatientId` |
| `practitioners.ts` | `Practitioner` | Maps `Staff.medplumPractitionerId`; cached lookup; created on first clinical write |
| `encounters.ts` | `Encounter` | Visits as FHIR encounters |
| `appointments.ts` | `Appointment` | Scheduling |
| `observations.ts` | `Observation` | **Vitals** (BP, HR, temp, SpO2, glucose, weight, pain) |
| `care-reports.ts` | `Observation` | Long-form nursing/physio reports as structured Observations |
| `conditions.ts` | `Condition` | Diagnoses (ICD/SNOMED) |
| `allergies.ts` | `AllergyIntolerance` | Allergies + severities |
| `medications.ts` | `MedicationRequest` | Active medication list |
| `medication-administrations.ts` | `MedicationAdministration` | Doses given during visits |
| `assessments.ts` | `Observation` (assessment-coded) | Falls risk, Braden, MMSE, etc. |
| `clinical-notes.ts` | `Composition` | Draft + sign workflow; immutable after signing |
| `care-plans.ts` | `CarePlan` | Per-patient clinical programs |
| `care-teams.ts` | `CareTeam` | Assigned clinicians; drives case-scoped reads |
| `tasks.ts` | `Task` | Handoffs, follow-ups, clinician work queue |
| `communications.ts` | `Communication` | Staff↔patient or staff↔staff messages |
| `consents.ts` | `Consent` | Caregiver portal access scopes |
| `consent-policy.ts` | (logic) | Resolves portal scopes for caregivers from `Consent` resources |
| `documents.ts` | `DocumentReference` + `Binary` | Lab PDFs, scans, medical attachments. Binary → R2-backed in production. |
| `goals.ts` 🆕 | `Goal` | Patient rehabilitation goals; round-trip sync with Postgres `PatientGoal` (fhir_goal_id linkage) |
| `labs.ts` | `ServiceRequest` + `DiagnosticReport` | Lab orders + results |
| `audit.ts` | (mirror) | `writeMedplumAuditMirror` — writes Postgres `AuditLog` row alongside Medplum `AuditEvent` |

See [docs/FHIR_CATALOG.md](../docs/FHIR_CATALOG.md) for resource-level field-by-field detail, sync direction, and example JSON.

### Where files actually live
- **Clinical metadata** (DocumentReference, signed-on, language, category) lives in Medplum.
- **Bytes** are stored in **Cloudflare R2** under a deterministic key (`ehr/YYYY/MM/{uuid}-{sanitized-name}`).
- The FHIR `Binary` resource holds the R2 URL as its attachment. Authenticated streaming goes through `/api/ehr/documents/[documentId]`, which: (1) resolves the DocumentReference + Binary, (2) enforces RBAC + case-scope + caregiver-consent, (3) issues a short-lived signed R2 URL (or proxies the bytes).
- Every uploaded medical file is malware-scanned via the background job at `/api/internal/ehr/documents/scan` before being marked clean (see `src/lib/security/malware-scan.ts`). Infected files are quarantined and audited.

### Identity bridge
- `Patient.medplumPatientId` — links a Postgres patient to a Medplum `Patient`
- `Staff.medplumPractitionerId` — links a Postgres staff member to a Medplum `Practitioner`
- Practitioner lookup is cached via `ensureCachedMedplumPractitionerForStaff`
- `PatientGoal.fhirGoalId` — round-trip link to Medplum `Goal`

---

## Route map

### Public site (`[locale]` — bilingual EN/AR)

| Path | Notes |
|---|---|
| `/[locale]` | Home |
| `/[locale]/about-us`, `/contact-us` | Route groups: `(about)`, `(contact)` |
| `/[locale]/privacy-policy`, `/terms-and-conditions` | Route group: `(legal)` |
| `/[locale]/auth/{login,signup,error,whatsapp-otp-test}` | NextAuth pages + OTP tester |
| `/[locale]/booking` | Booking flow (client form → `/api/bookings/create`) |
| `/[locale]/coverage` | Service-area map (Leaflet + GeoJSON) |
| `/[locale]/doctors`, `/doctors/[slug]` | Listing + profile |
| `/[locale]/payment`, `/payment/redirect` | Kashier gateway integration |
| `/[locale]/portal?tab=...` | ✅ Patient portal — tabs: overview, clinical, files, care, visits, vitals, notes, tasks |
| `/[locale]/settings/pwa` | Push notification opt-in |

### Staff EHR + ops (`/admin/*` — English-only, NextAuth + RBAC)

| Path | Roles | Notes |
|---|---|---|
| `/admin/patients` | clinical roles + admin + medical_ops | Patient list (Medplum-sourced, case-scoped) |
| `/admin/patients/[id]` | clinical roles + admin + medical_ops | ⭐ Patient EHR detail — server actions for visits, vitals, notes, care team, tasks, conditions, allergies, meds, labs, docs, escalations, handoffs, consent, demographics |
| `/admin/nursing/dashboard` | nurse + admin + superadmin | Nurse-ops dashboard |
| `/admin/escalations` | clinical + medical_ops + admin | Escalations queue |
| `/admin/clinician` 🆕 | clinical disciplines + medical_ops + operator + admin | Redirects to `/clinician/today` |
| `/admin/ops` 🆕 | medical_ops + operator + admin | Dispatch + shift oversight |
| `/admin/ops/disputes` 🆕 | medical_ops + operator | Disputed-visit queue |
| `/admin/insurance` 🆕 | insurance_coordinator + admin | Insurer master + coverage + prior-auth + claims |
| `/admin/compliance` 🆕 | compliance_officer + admin | Audit log dashboard — break-glass overrides, restricted-access events, login/logout |

Navigation visibility per role is computed by `src/lib/auth/admin-nav-policy.ts`.

### Clinician workspace (`/clinician/*` — English-only, license-gated)

| Path | Roles | Notes |
|---|---|---|
| `/clinician/today` 🆕 | physiotherapist (pilot) + admin/superadmin | "My Journey" — today's visits + state transitions |
| `/clinician/patients` 🆕 | physiotherapist + admin | Case-scoped patient list (via CareTeam) |
| `/clinician/visits/[visitId]/session` 🆕 | physiotherapist + admin | Active-visit workspace (assessments, sparklines, templates) |
| `/clinician/tasks` 🆕 | physiotherapist + admin | FHIR Task list (start/complete) |
| `/clinician/earnings` 🆕 | physiotherapist + admin | Payout summaries (week/month/lifetime) — driven by `src/lib/billing/physio-pay-policy.ts` |
| `/clinician/profile` 🆕 | physiotherapist + admin | Read-only license + syndicate display |

### API

| Path | Notes |
|---|---|
| `/api/auth/[...nextauth]` | NextAuth handler |
| `/api/auth/otp/whatsapp/{send,verify}` | WhatsApp OTP via Wapilot |
| `/api/auth/patient/register` | Patient self-registration |
| `/api/auth/logout-audit` 🆕 | Best-effort logout audit log writer |
| `/api/bookings/{create,payment/initiate,payment/webhook,promocode/validate}` | Booking + Kashier webhook + promocodes |
| `/api/coverage`, `/api/coverage/stats` | Coverage check + analytics |
| `/api/ehr/documents/[documentId]` | Authenticated document streaming (FHIR Binary + R2) |
| `/api/internal/ehr/documents/scan` 🆕 | Internal malware-scan batch job — authenticated via `x-ehr-scan-key` or `Bearer ${CRON_SECRET}` |
| `/api/medplum/health` | Medplum connectivity probe |
| `/api/pwa/{public-key,subscriptions,send}` | Push notification backend |

`/caregiver/*` routes have been **removed**. Caregivers access the patient portal via FHIR `Consent` scopes resolved server-side.

---

## Auth model (NextAuth v5, JWT sessions)

Configured in `src/auth.ts`. Adapter: `@auth/prisma-adapter`.

### Providers
1. **Google OAuth** (`AUTH_GOOGLE_ID/SECRET`) — default new accounts to `role=patient`. `allowDangerousEmailAccountLinking: true`.
2. **`patient-credentials`** — login by phone or case-ID + password (bcrypt).
3. **`staff-credentials`** — staff login by email + password (bcrypt). Updates `Staff.lastLoginAt`. **Login emits `AuditLog` row** (`writeLoginAudit`), action = `login`, with provider. Logout is logged via the `/api/auth/logout-audit` route.

### Session shape (augmented in `src/auth.ts`)
```ts
session.user = {
  id: string,
  name?: string,
  email?: string,
  image?: string,
  role: 'patient' | 'staff',
  patientId?: string | null,
  staffId?: string | null,
  staffRole?: StaffRole | null,
  phone?: string | null,
}
```

`StaffRole` now spans: `superadmin`, `admin`, `medical_ops`, `operator`, `doctor`, `physiotherapist`, `nurse`, `insurance_coordinator`, `compliance_officer`, `hospital_partner_admin`, `finance`, `viewer`.

### RBAC helpers (`src/lib/auth/rbac.ts`)
- `getSessionUser()`, `getPatientUser()`, `getStaffUser([roles])`
- `CLINICAL_ROLES`, `CLINICAL_WRITE_ROLES`, `CASE_SCOPED_CLINICAL_READ_ROLES`
- `staffHasRole()`, `isCaseScopedClinicalRole()`, `isStaff()`, `isLicensedMedOps()`
- `canSignClinical(staff, discipline)` — checks syndicate expiry per discipline (`nursing | physiotherapy | medical`); blocks signing if license expired
- `StaffLicenseSnapshot` — portable license view used in policy checks
- `ClinicalDiscipline = 'nursing' | 'physiotherapy' | 'medical'`

### Navigation policy (`src/lib/auth/admin-nav-policy.ts`)
- Single source of truth for which `/admin/*` and `/clinician/*` links a role sees.
- Used by both the admin layout (chrome rendering) and per-page `getStaffUser([...])` guards.

### License gating
- Physiotherapists, nurses, and doctors have a `PhysioProfile` (or equivalent) sidecar carrying syndicate number, license expiry, certifications.
- **Routine clinical writes** require the license to be valid as of the action's timestamp. `canSignClinical()` is the gate.
- Expired licenses can still log in and read (so clinicians can wrap up admin), but cannot sign or author clinical content.
- Break-glass overrides flow through `DestructiveApprovalToken` (see "Schema" below).

### WhatsApp OTP
- Configured via `WAPILOT_BASE_URL / WAPILOT_INSTANCE_ID / WAPILOT_API_TOKEN / WAPILOT_DEFAULT_COUNTRY_CODE`
- `src/lib/auth/wapilot.ts` (send) + `src/lib/auth/whatsapp-otp-store.ts` (OTP storage)
- Routes: `/api/auth/otp/whatsapp/send` + `/verify`

---

## Database — current schema (highlights from `prisma/schema.prisma`)

All models live in `prisma/schema.prisma`. Reference the file before writing queries — it is the source of truth. A human-readable, grouped overview lives in [docs/FHIR_CATALOG.md](../docs/FHIR_CATALOG.md) (clinical) and the schema file itself (operational).

### Tenancy (Phase 1A foundations)
- `Tenant` — `code`, `name`, `status` (`active | suspended | archived`), `isPlatform`. Defaulted `"platform"` tenant for backwards-compat.
- `tenantId` columns added to: `Patient`, `Provider`, `Visit`, `CarePlan`, `Invoice`, `OnlineBooking`, `Staff`, `Coverage`, `PriorAuth`, `Claim`, `ControlledSubstanceLedger`.

### Auth
- `User` — NextAuth identity. `role: patient | staff`. Linked to `Patient` or `Staff` (1:1).
- `Account` — OAuth accounts.
- `VerificationToken` — NextAuth email verification.
- `Staff` — admin/EHR staff. `passwordHash`, `StaffRole`, `medplumPractitionerId`, `lastLoginAt`. **Now carries license fields:** `licenseType` (`medical_syndicate | nursing_syndicate | physiotherapy_syndicate | pharmacy_syndicate | none`), `licenseNumber`, `licenseExpiry`, `licenseIssuingBody`, plus on-call + clinical-director flags.

### Operational core
- `Patient` — demographics, blood group, marital status, religion, insurance fields, GPS, caregiver fields, DNR status, geofence radius, temporarily-away tracking, soft-delete (`deletedAt`), `medplumPatientId`, plus address fidelity + privacy tier + safety flags.
- `Family`, `Provider`, `Visit`, `CarePlan`, `Invoice`, `Payment`, `Expense`, `ProviderPayout`.
- `Service`, `ServiceCategory`, `ProviderRole`, `PaymentMethod`, `ExpenseCategory`, `ReferralSource`, `Area` — lookups.
- `NurseShiftAssignment`.

### Visit lifecycle (state-machine)
- `Visit.state` — 22-state `VisitState` enum (draft, scheduled, acknowledged, en_route, arrived, checked_in, documenting, signed, checked_out, completed, cancelled_by_patient, disputed, force_closed_by_admin, abandoned, …).
- `VisitDisruptionCode` — 16 codes (patient_late_cancel, patient_no_show, family_blocked_access, unsafe_environment, physio_personal_emergency, weather, equipment_failure, …).
- `VisitStateTransition` — append-only ledger: `from`, `to`, `trigger`, `actor`, `reason`, `geo`, override metadata.
- `VisitParticipant` — multi-clinician participation per visit (`primary_clinician`, `secondary_clinician`, `observer`, `trainer`, `trainee`, `family_witness`).
- `VisitLocationPing` — geofence breadcrumb trail (lat, long, timestamp, distance-to-patient).
- `Visit` also carries identity-confirmation fields, consent reaffirmed, safety clearance, companions present, geofence override metadata, media IDs, cash collected/gratuity, receipt delivery channels, `disruptionCode`.

### Clinical governance
- `StandingOrder` — recurring clinical instructions (e.g. "daily wound dressing"), discipline-tagged, validity window, signed by staff.
- `StandingOrderExecution` — audit trail of each fulfillment.
- `DestructiveApprovalToken` — **break-glass** token for restricted-data overrides (delete patient, override restricted segment access). `requestedBy / approvedBy / approvedAt / consumedBy / expiresAt`. Always audited.

### Insurance + claims
- `InsurerProfile` — payer registry (code, payer type, direct-billing support).
- `Coverage` — per-patient policy (member ID, plan, effective dates, status).
- `PriorAuth` — pre-authorization workflow (status: `draft | submitted | approved | denied | expired`).
- `Claim` — submission (status: `submitted | adjudicating | paid | partially_paid | denied | cancelled`).
- `ClaimLineItem` — itemized claim lines.
- `ControlledSubstanceLedger` — EDA-aligned medication-dispensation audit trail (`ControlledSubstanceAction`: prescribed, administered, reconciled, wasted).

### Physio workspace
- `PhysioProfile` — sidecar on `Staff` (syndicate #, expiry, national ID, passport, years experience, certifications, onboarding state, `publicDoctorId` FK → `Doctor.id`).
- `TrialVisitScorecard` — onboarding trial visit, 7-domain rubric (1–5), pass threshold ≥4.0 mean.
- `PatientGoal` — SMART goals (status, baseline, current, target, target date, category, linked to `CarePlan`, **`fhirGoalId` for Medplum round-trip**).

### Online funnel
- `OnlineBooking` — website funnel record (pre-Visit). Kashier session/order/transaction IDs. Promocode link. Converts to `Visit` on confirmation.
- `Promocode` — % or fixed-EGP discount codes.

### Public website
- `Doctor` — bilingual public-facing doctor profiles.
- `Specialty`, `ContentService`, `BookingPrice` — editable from DB, no code deploy needed.

### Infrastructure
- `PushSubscription` — VAPID subscriptions.
- `RateLimit` — fixed-window counters for `@/lib/utils/rate-limit`.
- `CoverageCheck` — coverage-map analytics. IP is SHA-256 hashed.
- `AuditLog` — every clinical/operational change. `AuditAction` now spans: `create, update, delete, read, override, export, access_denied, login, logout`. Written today via `writeMedplumAuditMirror` (clinical writes) + `writeLoginAudit` (auth) + ad-hoc calls. Postgres-only mutations on operational tables are not yet fully covered (tracked in EHR_NOW.md).

### Removed (Jun 2026)
- `Exercise`, `PatientHEP`, `PatientHEPItem`, `HEPAdherenceEntry`, `HEPReminderState`, `HEPStatus` — HEP feature parked behind a clinical-protocol gate.

---

## Conventions

- **Path alias:** `@/*` → `src/*`. Use it always — no `../../` relative imports across folders.
- **Server-first:** Default to server components. Add `'use client'` only when interactivity is required.
- **Server actions:** Most EHR writes are Next.js server actions, not API routes. See `src/features/ehr/admin-patient/actions/` (domain-split: one file per clinical domain, `index.ts` barrel, internal helpers in `shared.ts`) and `src/features/ehr/clinician-physio/actions.ts`. Matching Zod schemas live in `src/features/ehr/schemas/admin-patient/` (barrel: `schemas/admin-patient-actions.ts`). New admin-patient actions go in the matching domain file, never a new monolith.
- **DB access:** Always `import { prisma } from '@/lib/db/prisma'`. Never `new PrismaClient()` in app code — it leaks connections in dev hot-reload.
- **Medplum access:** Always import via `getMedplumClient()` from `@/lib/medplum/client`. Module-scoped helpers (e.g. `listPatientEncounters`) are preferred over raw client use.
- **R2 access:** Always go through `src/lib/storage/r2-medical.ts`. Never construct S3 clients ad-hoc. Object keys must be deterministic (`buildObjectKey`) and filenames sanitised (`sanitizeFilename`).
- **License gating:** Any clinical write must pass `canSignClinical(staff, discipline)`. Cache the staff license snapshot at the start of the action.
- **i18n:**
  - Server: `getTranslations({ locale, namespace })`. Client: `useTranslations(namespace)`, `useLocale()`.
  - Messages: `messages/en.json`, `messages/ar.json` — never hardcode text in the public surface.
  - `dir` (LTR/RTL) is set once on `<html>` in `[locale]/layout.tsx`.
  - Admin (`/admin/*`) and clinician (`/clinician/*`) routes are **English-only** by design.
- **SCSS:**
  - `@use` only — never `@import`.
  - **Design tokens — one source of truth.** Build-time Sass tokens live in `src/assets/scss/utils/variables.scss` (`$primary`, `$brand-dark-blue`, ramps). Use these for Sass colour math (`color.adjust`, `rgba`). Never redefine a brand colour locally in a page/component file — `@use '../utils/variables'` and reference it. (`base/colors.scss`, a 451-line legacy template dump, was removed Jun 2026.)
  - **Runtime tokens — `var(--color-*)`.** `src/assets/scss/base/tokens.scss` emits a `:root` block of CSS custom properties **generated from** the Sass tokens (so they can't drift) + a `[data-theme='dark']` override. Loaded once via `globals.scss`. Use `var(--color-primary)` / `var(--color-text)` / `var(--color-surface)` etc. for any property that should respond to theming (dark mode, per-tenant brand). Re-theme by overriding the custom properties under a selector — never hard-code a second hex.
  - Breakpoint mixins: `respond-above(bp)` / `respond-below(bp)`.
  - Admin + portal + clinician shells use Bootstrap globally.
  - **Logical properties only — never physical direction.** The site is bilingual (EN/AR), so use `margin-inline-start` / `padding-inline-end` / `border-inline-start` / `text-align: start|end` / `float: inline-start`, never `margin-left`, `padding-right`, `text-align: right`, etc. Logical properties auto-flip with `dir` (no `[dir='rtl']` patch needed) and are identical in LTR. `[dir='rtl']` blocks are reserved for things logical CSS genuinely can't express — icon mirroring (`transform: scaleX(-1)`), `background-position` flips, `flex-direction` reversal. Enforced by `npm run lint:css` (ratchet guard, `scripts/guard-logical-css.cjs`, runs in CI) against a zero baseline. A genuinely-visual physical value can opt out with a trailing `// rtl-ok`; after converting a file run `npm run lint:css:update`.
- **Motion:** `<Reveal />` + `data-reveal` (IntersectionObserver). Respects `prefers-reduced-motion`.
- **Logging:** `@/lib/utils/app-logger` for general server logs. `@/lib/utils/logger` is **coverage-check file logging only** (writes JSONL). **Never log PHI, raw payment payloads, R2 object content, or session JWT.**
- **Rate limiting:** Use `@/lib/utils/rate-limit` (`checkRateLimit(key, max, windowMs)`) on every mutation route, keyed by IP from `getClientIp(request)`.
- **CORS:** Use `resolveCorsHeaders` from `@/lib/utils/cors` on every API route response.
- **PWA manifest:** Locale-specific (`/manifest-en.webmanifest`, `/manifest-ar.webmanifest`).
- **Admin layout:** Bootstrap + Boostrap-icons; no `<Header>`/`<Footer>` — admin chrome via `src/app/admin/layout.tsx`. Visibility per role from `admin-nav-policy.ts`.
- **Clinician layout:** Mobile-first, Bootstrap + a SCSS module (`clinician-shell.scss`), bottom-nav driven.

---

## Critical pitfalls (read before changing)

| Pitfall | Where | Guidance |
|---|---|---|
| **Postgres-only audit gap** | auth callbacks + Postgres-only mutation paths | Login/logout now audited. Clinical writes mirror to `AuditLog` via `writeMedplumAuditMirror`. Operational Postgres-only mutations (Invoice, ProviderPayout, Promocode redemption, Patient demographics admin edits) still need explicit `prisma.auditLog.create()` calls. Leave `// TODO(audit)` markers where uncovered. |
| **R2 signed URLs leak via logs** | `src/lib/storage/r2-medical.ts` | Never log signed URLs — they grant time-limited access to PHI bytes. Strip them from any debug output. Short TTL only (≤ 10 min). |
| **Malware-scan backend is `mock_clean` in dev** | `src/lib/security/malware-scan.ts` | Dev returns `clean` unconditionally. Production **must** point at a real scanner via `EHR_MALWARE_SCAN_HTTP_URL` + token. Files that never pass `clean` must not be served. |
| **Visit state-machine drift** | `Visit.state` enum + `VisitStateTransition` | The state machine has 22 states and explicit transitions. **Always go through a transition helper** that writes `VisitStateTransition`. Direct `Visit.update({ state })` is forbidden. |
| **Break-glass overrides** | `DestructiveApprovalToken` | Approving and consuming a token MUST emit `AuditLog` rows with `action=override` and the actor + reason. Never auto-approve in code. |
| **Tenant scoping is opt-in for new queries** | `tenantId` columns | All foundational tables have `tenantId`. New queries on those tables MUST filter by tenant. The platform tenant is `"platform"` by default. Cross-tenant reads are a P0 incident. |
| **No tests** | repo-wide | No `*.test.ts` / `*.spec.ts` under `src/`. Plan Vitest + Playwright before hospital go-live. |
| **No Sentry / observability** | repo-wide | Wire before the hospital partner goes live. See EHR_NOW.md Sprint 5. |
| **CSP allow-list will need updates** | `next.config.ts` headers | Adding Daily.co (telemed), Sentry, R2 public CDN, or any new third-party requires updating `Content-Security-Policy`. |
| **Kashier has 2 modes** | `KASHIER_MODE` in `.env.local` | `test` (sandbox), `live` (prod). BOTH reject `http://localhost` URLs — a tunnel (cloudflared/ngrok) is required for local dev. |
| **`$` in env values is expanded** | `.env.local` | dotenv treats `$<name>` as variable expansion. Escape literal `$` as `\$` (Kashier secret keys). |
| **Kashier webhook signing** | `src/app/api/bookings/payment/webhook/route.ts` | Validates HMAC against `KASHIER_API_KEY`. Do not log raw payloads. |
| **`cleanPhoneNumber()`** | Booking form util | Egypt-specific E.164 — flag when internationalising. |
| **PHI awareness** | Any clinical route | Never log PHI. Never expose secrets client-side. Validate at API boundaries, not just client. Patient-record reads must go through `getOwnPatientRecord()` (session-resolved, never client-supplied ID). |
| **Clinical soft-delete only** | EHR data | Never hard-delete clinical records. Postgres `Patient.deletedAt` is the gate. Medplum resources should be marked `entered-in-error` rather than deleted. |
| **Hostinger today, OVH soon** | Infrastructure | Production data sits on Hostinger. Migration to OVH Bahrain is in flight (see [DEPLOYMENT_RUNBOOK.md](../docs/DEPLOYMENT_RUNBOOK.md)). Do not deploy new PHI-touching features without confirming the rollback plan with the lead engineer. |
| **`/clinician` is physiotherapy-only today** | `/clinician/*` | Although the route shape is discipline-agnostic, only physiotherapists have a full data model + actions today. Don't pretend it serves doctors or nurses until the equivalent profiles + actions ship. |

---

## Environment variables

Required in `.env.local` for full functionality:

```
# Postgres
DATABASE_URL=postgresql://...

# NextAuth
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

# Medplum (self-hosted)
MEDPLUM_BASE_URL=https://medplum.anees.health/
MEDPLUM_CLIENT_ID=...
MEDPLUM_CLIENT_SECRET=...

# WhatsApp OTP (Wapilot)
WAPILOT_BASE_URL=https://api.wapilot.net/api/v2
WAPILOT_INSTANCE_ID=...
WAPILOT_API_TOKEN=...
WAPILOT_DEFAULT_COUNTRY_CODE=20

# Kashier payments
KASHIER_MODE=test|live
KASHIER_MERCHANT_ID=...
KASHIER_SECRET_KEY=...
KASHIER_API_KEY=...
KASHIER_WEBHOOK=...
KASHIER_ALLOWED_METHODS=...
KASHIER_BRAND_COLOR=...

# Cloudflare R2 (medical document storage)
R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=...           # base URL for signed-URL construction (optional)

# Malware scanner
EHR_MALWARE_SCAN_BACKEND=mock_clean|http
EHR_MALWARE_SCAN_HTTP_URL=https://...     # required if backend=http
EHR_MALWARE_SCAN_HTTP_TOKEN=...           # bearer token for the scanner

# Internal cron / scheduled jobs
CRON_SECRET=...             # bearer for /api/internal/* routes
EHR_SCAN_KEY=...            # alternate header for the document scan job (x-ehr-scan-key)

# Misc
HASH_SALT=...
NEXT_PUBLIC_SITE_URL=...
NEXT_PUBLIC_API_URL=...
ENABLE_ADMIN_DASHBOARD=true   # legacy dev-only flag; admin is now auth-gated
STORAGE_PROVIDER=local         # legacy storage toggle; harmless now
STORAGE_LOCAL_SIGNING_SECRET=...
STORAGE_LOCAL_ROOT=...
```

See [docs/DEPLOYMENT_RUNBOOK.md](../docs/DEPLOYMENT_RUNBOOK.md) for the per-environment matrix and secrets rotation cadence.

---

## Build & verify

```bash
npm run dev          # http://localhost:3000/en (and /ar)
npm run build        # prisma generate + next build
npm run lint         # ESLint (next/core-web-vitals + TS)
npx tsc --noEmit     # Type check only

# Database
npm run db:generate          # Regenerate Prisma client after schema edits
npm run db:migrate           # prisma migrate dev
npm run db:migrate:deploy    # prisma migrate deploy (CI / prod)
npm run db:migrate:status    # check pending migrations
npm run db:seed              # Run prisma/seed.ts
npm run db:studio            # Prisma Studio
```

`DATABASE_URL`, all `MEDPLUM_*` vars, all `R2_*` vars, and `EHR_MALWARE_SCAN_BACKEND` must be present in `.env.local`.

To enable the admin / clinician dashboards locally, ensure you have a `User` + `Staff` row with a bcrypt password hash and (for clinician) a matching `PhysioProfile`. Log in at `/en/auth/login`. `ENABLE_ADMIN_DASHBOARD` is legacy and not required now that auth is wired.

---

## Scaling roadmap (current state, Jun 2026)

| # | Concern | Status | Source of truth |
|---|---|---|---|
| 1 | Database + ORM | ✅ Postgres + Prisma 5.22 live; 9 migrations applied | `prisma/migrations/` |
| 2 | Clinical EHR — Medplum FHIR | ✅ Deeply integrated. 24 modules. | [FHIR_CATALOG.md](../docs/FHIR_CATALOG.md) |
| 3 | Patient portal | ✅ Live at `/[locale]/portal` with tabbed workspace + caregiver consent + document streaming | `src/app/[locale]/portal/` |
| 4 | Auth | ✅ NextAuth v5 + Google + patient creds + staff creds + WhatsApp OTP + login/logout audit | `src/auth.ts` |
| 5 | Audit logging | 🟡 Clinical mirror + login/logout live. Postgres-only operational writes still gap. | `src/lib/medplum/audit.ts` |
| 6 | Validation (Zod) | 🟡 In EHR schemas; not yet on every API route | `src/features/ehr/schemas/` |
| 7 | Medical file storage | ✅ Cloudflare R2 + FHIR `DocumentReference`/`Binary` + malware scan job | `src/lib/storage/r2-medical.ts`, `src/lib/security/malware-scan.ts` |
| 8 | Hosting | 🟡 Hostinger today → OVH Bahrain target | [DEPLOYMENT_RUNBOOK.md](../docs/DEPLOYMENT_RUNBOOK.md) |
| 9 | Observability | ❌ Sentry + log aggregator not wired yet | EHR_NOW Sprint 5 |
| 10 | Tests | ❌ None | EHR_NOW backlog |
| 11 | Multi-tenancy | 🟡 Foundations landed (Phase 1A): `Tenant` + `tenantId` columns. Query-level enforcement is still per-call. | `prisma/migrations/20260604130000_add_license_tenant_roles_phase1a/` |
| 12 | Clinician workspace | ✅ Physio MVP live (`/clinician/*`). Doctor + nurse equivalents not built. | [EHR_PHYSIO_SPEC.md](../docs/EHR_PHYSIO_SPEC.md) |
| 13 | Insurance | 🟡 Schema + admin dashboard skeleton (`/admin/insurance`). No live claim adjudication. | `prisma/migrations/20260604221500_matrix_foundations_tracking_insurance/` |
| 14 | Compliance dashboard | 🟡 `/admin/compliance` dashboard live (audit-log focused). Formal HIPAA + DPL documentation pack landed. | [HIPAA_COMPLIANCE.md](../docs/HIPAA_COMPLIANCE.md) |
| 15 | Break-glass governance | 🟡 Schema landed (`DestructiveApprovalToken`). Workflow UI partial. | `src/app/admin/compliance/` |
| 16 | Telemedicine | ❌ Not built — Daily.co is the planned vendor | CTO_STRATEGY Phase 2 |
| 17 | Hospital partner portal | ❌ Not built — MOU signed | CTO_STRATEGY Phase 1 |
| 18 | Mobile app | ❌ Not built — Expo (React Native) is the planned framework | CTO_STRATEGY Phase 2 |
| 19 | Caregiver-specific app | ❌ Scaffolding deleted — caregivers use `/portal` via consent | n/a |

When implementing a new domain, follow the feature-module pattern:
```
features/<domain>/
├── components/   # UI
├── hooks/        # Feature-local hooks
├── actions.ts    # Server actions (preferred for mutations over API routes)
├── data.ts       # Server-side data loaders
├── schemas/      # Zod (shared client+server)
├── helpers.tsx   # Local helpers
└── types.ts      # Feature types
```

---

## AI behavior expectations

- Prefer clarity over cleverness; reusability over shortcuts; explicitness over magic.
- **Verify before assuming.** Read the codebase before quoting status. `CLAUDE.md` is best-effort and may lag the code.
- Never introduce patterns that contradict this document. If unsure, ask.
- Output should reflect a senior engineer building a regulated, long-lived medical platform.
- Do **not** add tests, dependencies, or refactors that weren't requested.
- When you discover dead code or stale references during a task, flag it — do not silently delete or restructure.
- When adding a Postgres mutation, plan how it will emit an `AuditLog` row. Emit explicitly via `prisma.auditLog.create()` and leave a `// TODO(audit): centralise when extension is wired` comment where needed.
- Build EHR features inside `features/ehr/` following the admin-patient module's shape (actions, data, page-view, schemas).
- Admin routes go under `src/app/admin/` — outside `[locale]`, no i18n, English-only, Bootstrap-styled.
- Clinician routes go under `src/app/clinician/` — English-only, mobile-first, license-gated.
- Patient portal lives under `src/app/[locale]/portal/` — bilingual, consent-gated for caregivers, session-resolved (never client-trusted) patient ID.
- Every clinical write goes through a discipline + license check (`canSignClinical`). Every visit state change goes through a transition helper that writes `VisitStateTransition`. Every R2 access goes through `r2-medical.ts`. Every restricted-data override goes through a `DestructiveApprovalToken`. **These are not optional.**
