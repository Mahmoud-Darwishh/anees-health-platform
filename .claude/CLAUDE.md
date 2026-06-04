# Anees Health Platform — Claude Code Context

Production-grade bilingual (EN/AR) health-tech platform serving Egyptian elite home care today, with a signed hospital-partner MOU and a planned MENA expansion. **Next.js 16 App Router + React 19 + TypeScript strict**. Clinical data is **Medplum (FHIR)**. Operational data is **Postgres + Prisma**. Self-hosted Medplum on a VPS. Security and accessibility are non-negotiable.

> **Two companion docs:**
> - `docs/CTO_STRATEGY.md` — long-term architecture, phases, hiring, compliance
> - `docs/EHR_NOW.md` — short-term sprint plan, kept ruthlessly current

---

## Stack at a glance

| Layer | Choice | State |
|---|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack dev) | Live |
| Language | TypeScript 5, strict mode | Live |
| i18n | `next-intl` 4.6 — locales: `en`, `ar` | Live (full EN/AR coverage; portal + EHR translated) |
| Styling | SCSS modules + design tokens (no Tailwind); Bootstrap on admin/portal shells | Live |
| PWA | `@ducanh2912/next-pwa` + custom worker (`worker/index.ts`) | Live |
| Push | `web-push` (VAPID) — `PushSubscription` table | Live |
| Maps | Leaflet (coverage page) | Live |
| Operational DB | **Postgres + Prisma 5.22** — schema: `prisma/schema.prisma`, client: `src/lib/db/prisma.ts` | Live |
| Clinical DB | **Medplum (FHIR), self-hosted** — client: `src/lib/medplum/client.ts` | Live, deeply integrated |
| Auth | **NextAuth v5 (Auth.js, `5.0.0-beta.31`)** with Prisma adapter + JWT sessions. Providers: Google OAuth, patient credentials (phone or case-ID + password), staff credentials (email + password, bcrypt). | Live |
| OTP | **WhatsApp OTP via Wapilot** (`api.wapilot.net/api/v2`) for patient onboarding; OTP store in `src/lib/auth/whatsapp-otp-store.ts` | Live |
| Caregiver portal access | FHIR Consent resources govern caregiver scopes (`profile / visits / vitals / notes / tasks`) — see `src/lib/medplum/consent-policy.ts` | Live |
| File storage | **Medplum FHIR `Binary`** — Medplum handles blob storage for documents/labs. | Medplum-managed |
| Validation | **Zod 4.4** — used in `src/features/ehr/schemas/`; not yet on every API route | Partial |
| Payments | Kashier (test + live) — booking funnel + webhook | Live (Egypt only) |
| Tests | **None yet** (no `*.test.ts`/`*.spec.ts` under `src/`). | Gap |
| Observability | **None wired** — no Sentry, no log aggregator, no APM | Gap |
| Hosting | **Self-hosted on Hostinger VPS** (Next.js + Postgres + Medplum). Migration to OVH Bahrain planned in `EHR_NOW.md`. | Live but to be migrated |

---

## Architecture (current)

```
src/
├── auth.ts                      # NextAuth v5 configuration (root)
│
├── app/                         # Next.js routes (App Router)
│   ├── [locale]/                # /en/* and /ar/* — public site + portal + auth
│   │   ├── (about)/             # /about-us
│   │   ├── (contact)/           # /contact-us
│   │   ├── (legal)/             # /privacy-policy, /terms-and-conditions
│   │   ├── auth/                # /login, /signup, /error, /whatsapp-otp-test
│   │   ├── booking/             # Booking flow
│   │   ├── coverage/            # Service-area map
│   │   ├── doctors/             # Doctor listing + profiles
│   │   ├── payment/             # Kashier gateway pages
│   │   ├── portal/              # ✅ Patient portal — tabbed workspace
│   │   ├── services/            # SEO service landing pages
│   │   ├── settings/pwa/        # Push notification opt-in
│   │   └── specialties/         # SEO specialty landing pages
│   │
│   ├── admin/                   # ⚠️ Staff EHR — gated by NextAuth + RBAC
│   │   ├── escalations/         # Escalations queue
│   │   ├── nursing/dashboard/   # Nurse ops dashboard
│   │   └── patients/            # Patient list + huge detail page (30 server actions)
│   │
│   ├── caregiver/               # ⚠️ Empty scaffolding folders — NOT built
│   │   ├── login/               # (empty)
│   │   └── patient/[id]/        # (empty)
│   │
│   ├── api/                     # API route handlers
│   │   ├── auth/                # NextAuth + WhatsApp OTP send/verify + patient register
│   │   ├── bookings/            # create, payment/initiate, payment/webhook, promocode/validate
│   │   ├── coverage/            # coverage check + stats
│   │   ├── ehr/documents/[id]/  # Authenticated document streaming (FHIR Binary)
│   │   ├── medplum/health/      # Medplum connectivity probe
│   │   └── pwa/                 # public-key, subscriptions, send
│   │
│   └── ~offline/                # PWA offline fallback
│
├── features/                    # Domain modules (feature-first)
│   ├── booking/components/      # Booking form, payment gateway, result
│   ├── coverage/components/     # Coverage check form + page content
│   ├── doctors/components/      # doctorgrid/ + profile/
│   ├── ehr/
│   │   ├── admin-escalations/   # Escalations page logic
│   │   ├── admin-nursing-dashboard/  # Nurse dashboard page logic
│   │   ├── admin-patient/       # ⭐ Huge module: page-view (2k lines) + actions (1.7k lines, 30 server actions)
│   │   └── schemas/             # Zod schemas for admin actions
│   ├── portal/                  # Portal feature modules (expand here as portal domain grows)
│   └── pwa/                     # components/ + hooks/ (usePwaManager)
│
├── components/                  # Shared, app-wide UI only
│   ├── common/                  # Reveal, WhatsApp, RelatedLinks, PwaInstallPrompt
│   ├── layout/                  # Header, Footer, Breadcrumb, MobileBottomNav
│   └── sections/home/           # Home page section compositions
│
├── lib/
│   ├── api/                     # Server-side data access (doctors, pricing, specialties, content-services, promocode)
│   ├── auth/                    # RBAC (roles, helpers), Wapilot client, WhatsApp OTP store, session helpers
│   ├── config/                  # App config, booking pricing, nursing-ops-policy (vitals thresholds)
│   ├── db/                      # Prisma singleton
│   ├── ehr/                     # nursing-alerts (vitals threshold evaluation)
│   ├── geo/                     # presence-policy (geofence rules)
│   ├── medplum/                 # ⭐ 23 modules — see "Medplum integration" below
│   ├── models/                  # Domain types (booking.types, doctor.types)
│   ├── portal/                  # patient-record (server-only resolver — session-scoped, never client-trusted)
│   ├── pwa/                     # Subscription store (DB-backed), push helpers
│   ├── seo/                     # Search/discovery metadata helpers
│   ├── storage/                 # Reserved for future non-Medplum storage adapters
│   └── utils/                   # app-logger, cors, rate-limit, coverage, slug, structured-data, metadata
│
├── hooks/                       # Cross-cutting hooks (useReveal)
├── i18n/                        # next-intl request config
├── assets/scss/                 # Global SCSS: base, layout, components, pages, utils
├── styles/                      # Global stylesheet entry
└── types/                       # Global TS types + SCSS module shim

prisma/
├── schema.prisma                # Single source of truth — all DB models
├── migrations/                  # 3 applied migrations (init, nursing-foundations, doctor-business-identity)
└── seed.ts                      # Lookup tables + doctors seed (run: npm run db:seed)
```

**Rule of thumb:** domain-specific code → `features/<domain>/`. Truly app-wide UI → `components/`. Cross-cutting utilities → `lib/`. Admin EHR pages → `app/admin/`. Public + patient surfaces → `app/[locale]/`.

---

## Medplum integration (the clinical core)

Medplum is the **single source of truth for clinical data**. Postgres holds operational/financial data only.

### Modules in `src/lib/medplum/` (all server-only)

| Module | FHIR resource(s) | Used for |
|---|---|---|
| `client.ts` | n/a | Singleton with auto client-credentials login + 401 retry |
| `config.ts` | n/a | Reads `MEDPLUM_BASE_URL/CLIENT_ID/CLIENT_SECRET` |
| `constants.ts` | n/a | Code systems, identifiers, extensions |
| `fhir-extensions.ts` | n/a | Egyptian-context FHIR extensions (e.g. address map URL) |
| `patients.ts` | `Patient` | Sync from/to Postgres `Patient.medplumPatientId` |
| `practitioners.ts` | `Practitioner` | Maps `Staff.medplumPractitionerId`; cached lookup |
| `encounters.ts` | `Encounter` | Visits as FHIR encounters |
| `appointments.ts` | `Appointment` | Scheduling |
| `observations.ts` | `Observation` | **Vitals** (BP, HR, temp, SpO2, glucose, weight, pain) |
| `care-reports.ts` | `Observation` | Long-form nursing/physio reports as structured Observations |
| `conditions.ts` | `Condition` | Diagnoses (ICD/SNOMED) |
| `allergies.ts` | `AllergyIntolerance` | Allergies + severities |
| `medications.ts` | `MedicationRequest` | Active medication list |
| `medication-administrations.ts` | `MedicationAdministration` | Doses given during visits |
| `assessments.ts` | `Observation` (assessment-coded) | Falls risk, Braden, MMSE etc. |
| `clinical-notes.ts` | `Composition` | Draft + sign workflow; immutable after signing |
| `care-plans.ts` | `CarePlan` | Per-patient programs |
| `care-teams.ts` | `CareTeam` | Assigned clinicians; drives case-scoped reads |
| `tasks.ts` | `Task` | Handoffs, follow-ups |
| `communications.ts` | `Communication` | Staff-to-patient or staff-to-staff messages |
| `consents.ts` | `Consent` | Caregiver portal access scopes |
| `consent-policy.ts` | (logic) | Resolves portal scopes for caregivers from Consent resources |
| `documents.ts` | `DocumentReference` + `Binary` | Lab PDFs, scans — stored as Medplum Binaries |
| `labs.ts` | `ServiceRequest` + `DiagnosticReport` | Lab orders + results |
| `audit.ts` | (mirror) | `writeMedplumAuditMirror` — writes Postgres `AuditLog` row alongside Medplum `AuditEvent` |

### Where files actually live
Documents and labs are stored as FHIR `Binary` resources **inside Medplum**. Authenticated streaming for downloads goes through `/api/ehr/documents/[documentId]` which reads the Binary back from Medplum and enforces RBAC + case-scope + caregiver consent.

### Identity bridge
- `Patient.medplumPatientId` — links a Postgres patient to a Medplum `Patient`
- `Staff.medplumPractitionerId` — links a Postgres staff member to a Medplum `Practitioner`
- Practitioner lookup is cached via `ensureCachedMedplumPractitionerForStaff`

---

## Route map

| Path | Notes |
|---|---|
| `/[locale]` | Home |
| `/[locale]/about-us`, `/contact-us` | Route groups: `(about)`, `(contact)` |
| `/[locale]/privacy-policy`, `/terms-and-conditions` | Route group: `(legal)` |
| `/[locale]/auth/{login,signup,error,whatsapp-otp-test}` | NextAuth pages + OTP tester |
| `/[locale]/booking` | Booking flow (client form → `/api/bookings/create`) |
| `/[locale]/coverage` | Service-area map (Leaflet + GeoJSON) |
| `/[locale]/doctors`, `/doctors/[slug]` | Listing + profile (data: `Doctor` table) |
| `/[locale]/services`, `/services/[slug]` | SEO landing pages |
| `/[locale]/specialties`, `/specialties/[slug]` | SEO landing pages |
| `/[locale]/payment`, `/payment/redirect` | Kashier gateway integration |
| `/[locale]/portal?tab=...` | ✅ Patient portal — tabs: overview, clinical, files, care, visits, vitals, notes, tasks |
| `/[locale]/settings/pwa` | Push notification opt-in |
| `/admin/patients` | Patient list (Medplum-sourced, scoped by role/care-team) |
| `/admin/patients/[id]` | ⭐ Patient EHR detail — 30 server actions covering visits, vitals, notes, care team, tasks, conditions, allergies, meds, labs, docs, escalations, handoffs, consent, demographics |
| `/admin/nursing/dashboard` | Nurse-ops dashboard |
| `/admin/escalations` | Escalations queue |
| `/api/auth/[...nextauth]` | NextAuth handler |
| `/api/auth/otp/whatsapp/{send,verify}` | WhatsApp OTP via Wapilot |
| `/api/auth/patient/register` | Patient self-registration |
| `/api/bookings/{create,payment/initiate,payment/webhook,promocode/validate}` | Booking + Kashier webhook + promocodes |
| `/api/coverage`, `/api/coverage/stats` | Coverage check + analytics |
| `/api/ehr/documents/[documentId]` | Authenticated document streaming (FHIR Binary) |
| `/api/medplum/health` | Medplum connectivity probe |
| `/api/pwa/{public-key,subscriptions,send}` | Push notification backend |
| `/caregiver/*` | Not implemented; caregivers use `/[locale]/portal` via FHIR Consent scopes |

---

## Auth model (NextAuth v5, JWT sessions)

Configured in `src/auth.ts`. Adapter: `@auth/prisma-adapter`.

### Providers
1. **Google OAuth** (`AUTH_GOOGLE_ID/SECRET`) — default new accounts to `role=patient`. `allowDangerousEmailAccountLinking: true`.
2. **`patient-credentials`** — login by phone or case-ID + password (bcrypt).
3. **`staff-credentials`** — staff login by email + password (bcrypt). Updates `Staff.lastLoginAt`. **TODO(audit): emit login event.**

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
  staffRole?: StaffRole | null,   // superadmin|admin|operator|doctor|physiotherapist|nurse|finance|viewer
  phone?: string | null,
}
```

### RBAC helpers (`src/lib/auth/rbac.ts`)
- `getSessionUser()`, `getPatientUser()`, `getStaffUser([roles])`
- `CLINICAL_ROLES`, `CLINICAL_WRITE_ROLES`, `CASE_SCOPED_CLINICAL_READ_ROLES`
- `staffHasRole()`, `isCaseScopedClinicalRole()`, `isStaff()`

### WhatsApp OTP
- Configured via `WAPILOT_BASE_URL / WAPILOT_INSTANCE_ID / WAPILOT_API_TOKEN / WAPILOT_DEFAULT_COUNTRY_CODE`
- `src/lib/auth/wapilot.ts` (send) + `src/lib/auth/whatsapp-otp-store.ts` (OTP storage)
- Routes: `/api/auth/otp/whatsapp/send` + `/verify`

---

## Database — current schema (highlights from `prisma/schema.prisma`)

All models live in [`prisma/schema.prisma`](../prisma/schema.prisma). 982 lines. Reference the file before writing queries — it's the source of truth.

### Auth
- `User` — NextAuth identity. `role: patient | staff`. Linked to `Patient` or `Staff` (1:1).
- `Account` — OAuth accounts (Google).
- `VerificationToken` — NextAuth email verification.
- `Staff` — admin/EHR staff. `passwordHash`, `StaffRole`, `medplumPractitionerId`, `lastLoginAt`. Linked to `Provider` (1:1 optional via `providerId`).

### Operational core
- `Patient` — rich profile: demographics, blood group, marital status, religion, insurance fields, GPS, full caregiver fields (phone/whatsapp/email), DNR status, geofence radius, temporarily-away tracking, soft-delete (`deletedAt`), and `medplumPatientId` link.
- `Family` — household grouping.
- `Provider` — internal staff providing care (separate from public-facing `Doctor`). Role, rate, payment type.
- `Visit` — encounter. Booked/scheduled/completed dates, status, price, payout, area, visit type (in_home/telemedicine).
- `CarePlan` — multi-visit treatment plan (operational tracking; clinical CarePlan lives in Medplum).
- `Invoice`, `Payment`, `Expense`, `ProviderPayout` — finance.
- `Service`, `ServiceCategory`, `ProviderRole`, `PaymentMethod`, `ExpenseCategory`, `ReferralSource`, `Area` — lookups.
- `NurseShiftAssignment` — primary + incoming nurse, acknowledgement, escalation task linkage.

### Online funnel
- `OnlineBooking` — website funnel record (pre-Visit). Kashier session/order/transaction IDs. Promocode link. Converts to `Visit` on confirmation.
- `Promocode` — % or fixed-EGP discount codes; redemption cap; min/max constraints.

### Public website
- `Doctor` — bilingual public-facing doctor profiles (migrated from JSON).
- `Specialty`, `ContentService`, `BookingPrice` — editable from DB, no code deploy needed.

### Infrastructure
- `PushSubscription` — VAPID subscriptions (Postgres-backed).
- `RateLimit` — fixed-window counters for `@/lib/utils/rate-limit`.
- `CoverageCheck` — coverage-map analytics. IP is SHA-256 hashed.
- `AuditLog` — every clinical/operational change. Written today via `writeMedplumAuditMirror` from Medplum modules. **Postgres-only mutations (User, Patient demographics, Invoices, etc.) are NOT yet auto-audited** — see "Critical pitfalls".

---

## Conventions

- **Path alias:** `@/*` → `src/*`. Use it always — no `../../` relative imports across folders.
- **Server-first:** Default to server components. Add `'use client'` only when interactivity is required.
- **Server actions:** Most EHR writes are Next.js server actions, not API routes. See `src/features/ehr/admin-patient/actions.ts`.
- **DB access:** Always import `import { prisma } from '@/lib/db/prisma'`. Never `new PrismaClient()` in app code — it leaks connections in dev hot-reload.
- **Medplum access:** Always import via `getMedplumClient()` from `@/lib/medplum/client`. Module-scoped helpers (e.g. `listPatientEncounters`) are preferred over raw client use.
- **i18n:**
  - Server: `getTranslations({ locale, namespace })`
  - Client: `useTranslations(namespace)`, `useLocale()`
  - Messages live in `messages/en.json`, `messages/ar.json` — never hardcode text.
  - `dir` (LTR/RTL) is set once on `<html>` in `[locale]/layout.tsx` — do not override on inner elements.
  - Admin routes (`/admin/*`) and `/caregiver/*` (when built) are English-only — no `[locale]` prefix.
- **SCSS:**
  - `@use` only — never `@import`. Modernize legacy `@import` you encounter.
  - Tokens: `src/assets/scss/utils/variables.scss`. Breakpoint mixins: `respond-above(bp)` / `respond-below(bp)`.
  - Admin + portal also use Bootstrap (loaded globally) for rapid dashboard UI.
- **Motion:** `<Reveal />` + `data-reveal` (IntersectionObserver). Respects `prefers-reduced-motion`. No AOS or ad-hoc animation libs.
- **Logging:** `@/lib/utils/app-logger` for general server logs. `@/lib/utils/logger` is **coverage-check file logging only** (writes JSONL) — do not repurpose. **Never log PHI or raw payment payloads.**
- **Rate limiting:** Use `@/lib/utils/rate-limit` (`checkRateLimit(key, max, windowMs)`) on every mutation route, keyed by IP from `getClientIp(request)`. Backed by the `RateLimit` table.
- **CORS:** Use `resolveCorsHeaders` from `@/lib/utils/cors` on every API route response.
- **PWA manifest:** Locale-specific (`/manifest-en.webmanifest`, `/manifest-ar.webmanifest`) referenced from `[locale]/layout.tsx`.
- **Admin layout:** Admin pages use Bootstrap. No `<Header>`/`<Footer>` — admin chrome via `src/app/admin/layout.tsx`.
- **Portal layout:** Patient portal under `[locale]/portal` uses Bootstrap + custom SCSS module.

---

## Critical pitfalls (read before changing)

| Pitfall | Where | Guidance |
|---|---|---|
| **Postgres-only audit gap still exists** | auth callbacks + Postgres mutation paths | Medplum writes are mirrored via `writeMedplumAuditMirror`, but some Postgres-only writes are still not guaranteed to emit `AuditLog`. Keep explicit audit writes until/unless a centralized extension is wired. |
| **No tests** | repo-wide | No `*.test.ts` or `*.spec.ts` under `src/`. Acceptable today but high risk as clinical write paths grow. Plan Vitest + Playwright. |
| **No Sentry / observability** | repo-wide | Errors are not centrally tracked. Add Sentry (web + server) before the hospital MOU goes live. |
| **CSP allow-list will need updates** | `next.config.ts` headers | Current CSP allows Kashier, Vercel, Chatling, Cloudflare, Clarity, FB. **Adding Daily.co (telemed), Sentry, or any new third-party requires updating `Content-Security-Policy`.** |
| **`Staff` login does not emit an audit event** | `src/auth.ts` line ~104 | TODO comment in place. Add an explicit audit row in the `staff-credentials.authorize` callback. |
| **Kashier has 2 modes** | `KASHIER_MODE` in `.env.local` | `test` (test-api.kashier.io, sandbox), `live` (api.kashier.io, prod). BOTH reject `http://localhost` URLs — a tunnel (cloudflared/ngrok) is required for local dev. |
| **`$` in env values is expanded** | `.env.local` | dotenv treats `$<name>` as variable expansion. Escape literal `$` as `\$` (e.g. Kashier secret keys). |
| **Kashier webhook signing** | `src/app/api/bookings/payment/webhook/route.ts` | Validates HMAC against `KASHIER_API_KEY`. Do not log raw payloads. |
| **`cleanPhoneNumber()`** | Booking form util | Egypt-specific E.164 — flag when internationalizing. |
| **`useReveal` deps** | `hooks/useReveal` | Pass `locale`/`pathname` as deps so animations replay on route change. |
| **PHI awareness** | Any clinical route | Never log PHI. Never expose secrets client-side. Validate at API boundaries, not just client. Patient-record reads must go through `getOwnPatientRecord()` (session-resolved, never client-supplied ID). |
| **Clinical soft-delete only** | EHR data | Never hard-delete clinical records. Postgres `Patient.deletedAt` is the gate. Medplum resources should be marked `entered-in-error` rather than deleted. |
| **No multi-tenancy yet** | Schema-wide | No `tenantId` column. Hospital B2B will require adding tenant scoping. Plan before signing the first hospital partner. |
| **Self-hosted Medplum on Hostinger** | Infrastructure | Production data sits on Hostinger today. Migration to OVH Bahrain is planned (see `docs/EHR_NOW.md`). Do not deploy new patient-data-touching features until that migration is complete or the rollback plan is firm. |

---

## Environment variables

Required in `.env.local` for full functionality:

```
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

# Misc
HASH_SALT=...
NEXT_PUBLIC_SITE_URL=...
NEXT_PUBLIC_API_URL=...
ENABLE_ADMIN_DASHBOARD=true   # legacy dev-only flag; admin is now auth-gated
STORAGE_PROVIDER=local         # legacy storage toggle; safe to ignore in current Medplum-managed flow
STORAGE_LOCAL_SIGNING_SECRET=...
STORAGE_LOCAL_ROOT=...
```

---

## Build & verify

```bash
npm run dev          # http://localhost:3000/en (and /ar)
npm run build        # prisma generate + next build
npm run lint         # ESLint (next/core-web-vitals + TS)
npx tsc --noEmit     # Type check only

# Database
npm run db:generate  # Regenerate Prisma client after schema edits
npm run db:migrate   # prisma migrate dev (current workflow)
npm run db:migrate:deploy   # prisma migrate deploy
npm run db:migrate:status   # check pending migrations
npm run db:seed      # Run prisma/seed.ts (lookup tables + doctors)
npm run db:studio    # Open Prisma Studio for ad-hoc data inspection
```

`DATABASE_URL` and all `MEDPLUM_*` vars must be present in `.env.local`.



To enable the admin dashboard locally, ensure you have a staff `User` and `Staff` row with a valid bcrypt password hash, then log in at `/en/auth/login`. The `ENABLE_ADMIN_DASHBOARD=true` flag is legacy and not required now that auth is wired.

---

## Scaling roadmap (current state)

| # | Concern | Status |
|---|---|---|
| 1 | Database + ORM | ✅ Postgres + Prisma 5.22 live; 3 migrations applied; real migrate workflow |
| 2 | Clinical EHR — Medplum FHIR | ✅ Deeply integrated. 23 modules, 30 server actions in admin patient detail, patient portal renders 12+ resource types |
| 3 | Patient portal | ✅ Live at `/[locale]/portal` with tabbed workspace, caregiver consent scopes, document streaming |
| 4 | Auth | ✅ NextAuth v5 + Google + patient creds + staff creds + WhatsApp OTP |
| 5 | Audit logging | 🟡 Medplum `AuditEvent` (server) + Postgres mirror via `writeMedplumAuditMirror` for clinical writes. Postgres-only mutations still need explicit audit coverage. |
| 6 | Validation (Zod) | 🟡 In place for EHR schemas; not yet on every API route |
| 7 | File storage | ✅ Medplum-managed (FHIR `Binary`); local-disk abstraction is dead code |
| 8 | Hosting | 🟡 Self-hosted on **Hostinger** — migration to OVH Bahrain planned (see `EHR_NOW.md`) |
| 9 | Observability | ❌ No Sentry / log aggregator yet |
| 10 | Tests | ❌ None |
| 11 | Multi-tenancy | ❌ Not in schema — required before hospital B2B |
| 12 | Telemedicine | ❌ Not built — Daily.co is the planned vendor |
| 13 | Hospital partner portal | ❌ Not built — MOU signed |
| 14 | Mobile app | ❌ Not built — Expo (React Native) is the planned framework |
| 15 | Insurance integration | ❌ Future — FHIR `Claim` + `Coverage` resources will be the base |
| 16 | Compliance docs (Egypt DPL, etc.) | ❌ No formal docs yet — needed before serious hospital deals |
| 17 | Caregiver-specific app | ❌ Scaffolding folders empty — caregivers currently use `/portal` via consent |

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
- When adding a Postgres mutation, plan how it will emit an `AuditLog` row. Emit explicitly via `prisma.auditLog.create()` and leave a `// TODO(audit): centralize when extension is wired` comment where needed.
- Build EHR features inside `features/ehr/` following the admin-patient module's shape (actions, data, page-view, schemas).
- Admin routes go under `src/app/admin/` — outside `[locale]`, no i18n, English-only, Bootstrap-styled.
- Patient portal lives under `src/app/[locale]/portal/` — bilingual, consent-gated for caregivers, session-resolved (never client-trusted) patient ID.
