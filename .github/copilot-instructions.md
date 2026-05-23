# AI Contributor Instructions — Anees Health Platform

You are contributing to a **production-grade, bilingual (EN/AR) health-tech platform** built with **Next.js 16 App Router, React 19, TypeScript strict mode, and Postgres + Prisma**. Target region: MENA (starting Egypt). The platform handles patient/booking/payment data today and is actively building an EHR (electronic health records). **Security, accessibility, and i18n are non-negotiable.**

Your output must reflect the standards of a senior engineer building a regulated, long-lived medical platform.

---

## 0. Quick Start

```bash
npm run dev           # http://localhost:3000/en  (also /ar)
npm run build         # prisma generate + next build
npm run lint          # ESLint (next/core-web-vitals + TypeScript)
npx tsc --noEmit      # Type check only

# Database
npm run db:generate   # Regenerate Prisma client after schema edits
npm run db:push       # Sync schema to DB (no migration files yet)
npm run db:seed       # Seed lookup tables + doctor profiles
npm run db:studio     # Open Prisma Studio (ad-hoc browser)
```

**No test runner is configured yet** (Vitest/Playwright planned — do not add tests without being asked).

### Key exemplar files

| Concern | File |
|---|---|
| Locale layout, RTL/LTR, providers | `src/app/[locale]/layout.tsx` |
| Client component + i18n hooks | `src/features/booking/components/booking-form.tsx` |
| DB singleton | `src/lib/db/prisma.ts` |
| Server-side data loader | `src/lib/api/doctors.ts` |
| Reveal animation hook | `src/hooks/useReveal.ts` |
| Design tokens | `src/assets/scss/utils/variables.scss` |
| Responsive mixins | `src/assets/scss/utils/mixins.scss` |
| Domain types | `src/lib/models/{booking,doctor}.types.ts` |
| i18n configuration | `src/i18n/request.ts` |
| Rate limiting | `src/lib/utils/rate-limit.ts` |
| CORS helper | `src/lib/utils/cors.ts` |
| Service worker (push + offline) | `worker/index.ts` |
| Locale-aware PWA manifest | `public/manifest-{en,ar}.webmanifest` |
| DB schema (source of truth) | `prisma/schema.prisma` |

---

## 1. Project Context

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript strict
- **i18n:** `next-intl` 4.6 — locales: `en`, `ar` (LTR / RTL)
- **Styling:** SCSS modules + design tokens (no Tailwind, no styled-components). Bootstrap 5 in admin.
- **Database:** Postgres + Prisma 5.22. All models in `prisma/schema.prisma`.
- **Auth:** **NextAuth v5 (Auth.js) chosen — not yet installed.** `Staff` table with `passwordHash` + `StaffRole` enum is ready.
- **Payments:** Kashier (Egypt-native gateway, HMAC-signed webhooks). Modes: `test` (sandbox), `live` (prod). Both require a public HTTPS URL.
- **PWA:** `@ducanh2912/next-pwa` with custom worker. Push subscriptions persisted in Postgres.
- **Maps:** Leaflet (coverage page) + GeoJSON in `public/assets/coverage/`
- **Domain:** Healthcare / telemedicine — PHI is being introduced. EHR is actively in development.
- **Admin dashboard:** Internal staff interface at `/admin/*` — outside `[locale]`, English-only, env-guarded (not auth-protected yet).

---

## 2. Current Architecture

```
src/
├── app/
│   ├── [locale]/                # Public site (/en/*, /ar/*)
│   │   ├── (about)/about-us
│   │   ├── (contact)/contact-us
│   │   ├── (legal)/{privacy-policy,terms-and-conditions}
│   │   ├── booking/             # Booking flow (form → Kashier → webhook)
│   │   ├── coverage/            # Service-area map
│   │   ├── doctors/[slug]/      # Doctor profiles (DB-backed)
│   │   ├── services/[slug]/     # SEO landing pages
│   │   ├── specialties/[slug]/  # SEO landing pages
│   │   ├── payment/redirect/    # Kashier redirect handler
│   │   └── settings/pwa/        # Push notification opt-in
│   ├── admin/                   # ⚠️ Internal dashboard — env-guarded, NOT auth-protected
│   │   └── patients/            # Patient list + view/edit (EHR phase 1)
│   ├── api/
│   │   ├── bookings/            # create · payment/initiate · payment/webhook
│   │   ├── coverage/            # check + stats
│   │   └── pwa/                 # public-key · subscriptions · send
│   └── ~offline/                # PWA offline fallback
│
├── features/                    # Domain modules — feature-first
│   ├── booking/components/      # Booking form, payment gateway, result
│   ├── doctors/components/      # doctorgrid/ + profile/
│   ├── coverage/components/     # Coverage form + map content
│   └── pwa/{components,hooks}/  # Install prompt, notification hooks
│
├── components/                  # Truly shared UI (NOT domain-specific)
│   ├── common/                  # Reveal, WhatsApp, PwaInstallPrompt, RelatedLinks
│   ├── layout/                  # Header, Footer, Breadcrumb, MobileBottomNav
│   └── sections/home/           # Home page section compositions
│
├── lib/
│   ├── api/                     # Server-side data access (doctors, pricing, specialties, content-services)
│   ├── config/                  # App config, booking pricing
│   ├── db/                      # Prisma singleton (prisma.ts)
│   ├── models/                  # Domain types (booking.types, doctor.types)
│   ├── pwa/                     # Postgres-backed subscription store + push helpers
│   ├── seo/                     # Metadata + structured-data helpers
│   └── utils/                   # app-logger, cors, rate-limit, coverage, slug, structured-data
│
├── hooks/                       # Cross-cutting hooks (useReveal)
├── i18n/                        # next-intl request config
├── assets/scss/                 # SCSS architecture (base, layout, components, pages, utils)
├── styles/                      # Global stylesheet entry
└── types/                       # Global TS types + SCSS module shim
```

### Where new code belongs

- **Domain-specific UI / hooks / services** → `src/features/<domain>/`
- **App-wide UI primitives** (used by 3+ unrelated features) → `src/components/`
- **Cross-cutting utilities** (no feature ownership) → `src/lib/`
- **Public pages and API routes** → `src/app/[locale]/` and `src/app/api/`
- **Admin dashboard pages** → `src/app/admin/` (no locale prefix, English-only, Bootstrap-styled)

When a `features/<domain>/` module grows, follow this scalable layout:
```
features/<domain>/
├── components/   # UI
├── hooks/        # Feature-local hooks
├── services/     # Business logic (callable from server actions + API routes)
├── api/          # Client-side fetchers
├── schemas/      # Zod (shared client+server)
├── store/        # Feature state (Zustand)
└── types/        # Feature types
```

---

## 3. Non-Negotiable Engineering Principles

### Architecture

- **Server components by default.** Use `'use client'` only when you need state, effects, or browser APIs.
- Keep layout-level concerns (Header, Footer, Providers) centralized in `app/[locale]/layout.tsx`.
- UI is **thin** — business logic belongs in services / API routes, not components.
- Never duplicate logic across pages or locales — extract to `lib/` or `features/<domain>/services/`.
- Admin pages have no `<Header>` or `<Footer>` — separate chrome from the public site.

### TypeScript

- Strict typing is mandatory. Avoid `any` (justify if unavoidable).
- Prefer typed props, hooks, and domain models from `src/lib/models/`.
- Domain entities should be normalized and reusable.

### Path aliases

- `@/*` → `src/*`. **Use it always** — no `../../` cross-folder relative imports.

---

## 4. Styling & Design System

- **No ad-hoc inline styles.** Justify if no alternative.
- Use:
  - SCSS Modules (co-located `.module.scss`) for all page/component styles
  - Design tokens from `src/assets/scss/utils/variables.scss`
  - Bootstrap 5 utility classes — available globally, use for admin/dashboard layout
- **`@use` only** — never `@import`. Modernize legacy `@import` you encounter.
- Avoid `!important`. Prefer scoped class names.
- Named breakpoints: `custom360`, `custom479`, `custom767`, `custom991`, `custom1199`, `md`, `lg` — defined in `mixins.scss`. Do not add ad-hoc pixel values.
- Use `respond-above(bp)` / `respond-below(bp)` — not raw media-query strings.

---

## 5. Motion & Interactions

- **`<Reveal as="..." />`** wrapper sets `data-reveal`; an IntersectionObserver fades content in.
- Programmatic use: `useReveal(ref, deps, options)` — **always pass `locale`/`pathname` as deps** so animations replay on route change.
- Motion tokens: `--reveal-duration`, `--reveal-ease`, `--reveal-distance` — never hardcode durations.
- `prefers-reduced-motion` is respected automatically — do not add separate checks.
- **No AOS, no global animation hacks.**

---

## 6. Internationalization & RTL

- Locale **must be read from the route** (`useLocale()` client, `params.locale` server).
- All copy lives in `messages/{en,ar}.json` — never hardcode strings.
- Server: `getTranslations({ locale, namespace })`. Client: `useTranslations(namespace)`.
- **`html[dir]` in `[locale]/layout.tsx` is the single source of truth.** Do not override `dir` on inner containers. Use `dir="auto"` on individual text inputs where users may type in either language.
- Timezone: `Africa/Cairo` in `NextIntlClientProvider` — update when expanding regions.
- Admin routes (`/admin/*`) are English-only — no `[locale]` prefix, no i18n, no `getTranslations` calls.
- Accessibility must work in both languages (RTL focus order, screen reader pronunciation).

---

## 7. Accessibility (Required)

- Semantic HTML, proper headings, landmarks.
- `aria-label`, visible focus states, full keyboard navigation.
- Never sacrifice accessibility for visual polish.
- Test screen readers in both locales.

---

## 8. Health-Tech & Security

The platform handles PHI (patient/booking data today; full EHR in progress). Standards to apply now:

- **Never expose secrets client-side.** Server-only logic stays out of `'use client'` files.
- **Validate at every API boundary** — never rely solely on client validation.
- **Rate-limit all mutation routes.** Use `checkRateLimit(key, max, windowMs)` from `@/lib/utils/rate-limit`, keyed by IP from `getClientIp(request)`. Backed by the `RateLimit` DB table.
- **CORS:** Apply `resolveCorsHeaders` from `@/lib/utils/cors` on every API route response.
- **Never log PHI.** Log IDs only — never names, phones, addresses, or clinical data.
- **Audit trail:** An `AuditLog` table exists in the DB. Every mutation on clinical/patient data must eventually emit a row. Until auth is wired, leave a `// TODO(audit): wire when auth lands` comment — do not ship un-audited write paths silently.
- **Soft-delete only for clinical records.** Never hard-delete `Patient`, `Visit`, or any future EHR model. Use `deletedAt DateTime?`.
- **Admin routes not yet auth-protected.** Guarded only by `ENABLE_ADMIN_DASHBOARD=true` env var — local dev only. Do not deploy without NextAuth v5.
- **CSP:** Any new third-party (auth SDK, storage, analytics, RTC, payment SDK) requires updating `Content-Security-Policy` in `next.config.ts`.
- **Sessions (when auth lands):** HTTP-only cookies, CSRF protection, token rotation. Use NextAuth v5 JWT strategy with `Staff` + `StaffRole`.

---

## 9. Database Patterns

- **Import the singleton:** `import { prisma } from '@/lib/db/prisma'`. Never `new PrismaClient()` in app code — leaks connections in hot-reload.
- **Schema is the source of truth:** always read `prisma/schema.prisma` before writing queries.
- **Current DB-backed systems:**
  - Doctors → `Doctor` table (bilingual; read by `src/lib/api/doctors.ts`)
  - Patients, Visits, Providers, Finance → operational core models
  - Online bookings → `OnlineBooking` table (converts to `Visit` on payment)
  - Push subscriptions → `PushSubscription` table (Postgres-backed)
  - Rate limits → `RateLimit` table
  - Audit trail → `AuditLog` table (exists, not yet wired to mutations)
  - Specialty, ContentService, BookingPrice → editable from DB, no redeploy needed
- **Migrations:** currently `db:push` (schema sync). Switch to `prisma migrate dev`/`deploy` before any PHI/clinical data lands in a real environment.
- **Audit log pattern:** use a Prisma Client Extension (`$extends`) wrapping mutations on audited models — not scattered `prisma.auditLog.create` calls.

---

## 10. API & Data Patterns

- **Route pattern:** `src/app/api/{domain}/{action}/route.ts`
- **Server-only logic** (price calc, PHI validation, HMAC verification) must never be imported into client components.
- **Every mutation route must:**
  1. Call `checkRateLimit()` keyed by IP
  2. Validate input at the boundary
  3. Apply `resolveCorsHeaders()` on the response
  4. Leave a `// TODO(audit)` comment if writing to any Patient/EHR-related table
- **Server actions** (in admin) follow the same validation + audit discipline as API routes.

---

## 11. EHR — In Progress

The EHR replaces the team's previous Google Docs / Sheets / Drive workflow. It is being built incrementally.

**Current patient data (Google Docs structure → platform mapping):**

| Google Drive | Platform |
|---|---|
| Docs — medical history / report | `Patient` header today; full clinical models next |
| Sheets — staff attendance | `StaffShift` model (Phase 5) |
| Folder — labs | `Document` + file storage (Phase 4) |
| Folder — scans | `Document` + file storage (Phase 4) |
| Folder — insurance/papers | `Document` + file storage (Phase 4) |

**EHR phases:**

| Phase | What | Status |
|---|---|---|
| 1 | Patient header admin UI — name, DOB, gender, caregiver, address, maps URL | 🔄 In progress |
| 2 | Clinical schema — `MedicalHistory`, `Allergy`, `Medication`, `Diagnosis`, `VitalSigns`, `ProgressNote` | ⏳ Next |
| 3 | Auth (NextAuth v5) + Audit log wiring (Prisma extension) | ⏳ Required before production |
| 4 | File storage — labs, scans, insurance docs; private bucket, signed URLs | ⏳ After auth |
| 5 | Staff operations — shift / attendance (replaces Google Sheets) | ⏳ Later |

**Clinical data rules (apply from Phase 2 onward):**
- Soft-delete only (`deletedAt`) — never hard-delete clinical records.
- Progress notes are immutable after sign-off; corrections are addendums (new child row).
- Medications are an immutable timeline — dose changes create new rows, end-dating the prior.
- `ClinicalSensitivity` enum (`normal | sensitive | highly_sensitive`) flags records needing extra RBAC gates.
- Free-text clinical fields (note bodies) are written in the clinician's language — no forced translation. Use `dir="auto"` on those inputs.

---

## 12. PWA Specifics

- Custom service worker: `worker/index.ts` (push + notification click).
- Manifests are locale-aware: `public/manifest-{en,ar}.webmanifest`; layout sets `metadata.manifest`.
- Push backend: `/api/pwa/{public-key,subscriptions,send}`. `send` requires `x-pwa-server-key` header.
- **Subscriptions are Postgres-backed** (`PushSubscription` table) — not in-memory.
- VAPID env vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PWA_PUSH_SERVER_KEY`.

---

## 13. Observability & Reliability

- `@/lib/utils/app-logger` — general server logger (suppresses debug/info in production).
- `@/lib/utils/logger` — **coverage-check file logging only** (writes JSONL). Do not repurpose.
- Guard critical flows with retries and graceful degradation.
- Errors should fail safely and visibly to the user, with structured logs server-side.
- No error-tracking service yet (Sentry planned). PHI must never appear in logs or error payloads.

---

## 14. Scaling Roadmap

| # | Concern | Status |
|---|---|---|
| 1 | Database + ORM | ✅ Postgres + Prisma 5.22 live |
| 2 | EHR Phase 1 (patient header) | 🔄 In progress |
| 3 | Auth | ⏳ **NextAuth v5 chosen.** Install before any admin feature ships. |
| 4 | Audit logging | ⏳ Table exists, not wired. Needs Prisma extension. |
| 5 | EHR Phase 2 (clinical schema) | ⏳ After Phase 1 UI works |
| 6 | EHR Phase 3 (auth + audit) | ⏳ Unlocks production |
| 7 | Validation | ⏳ Hand-rolled → Zod (shared client + server) |
| 8 | State management | ⏳ Zustand + TanStack Query |
| 9 | Forms | ⏳ `react-hook-form` + Zod resolver |
| 10 | Migrations | ⏳ `db:push` → `prisma migrate` before PHI goes live |
| 11 | Observability | ⏳ Sentry + `pino` |
| 12 | Testing | ⏳ Vitest + Playwright |
| 13 | File storage | ⏳ S3-compatible, private, signed URLs (EHR Phase 4) |
| 14 | Compliance | ⏳ Encryption at rest, MFA, audit trail, Egypt DPL 151/2020 |

---

## 15. Known Pitfalls

| Pitfall | Where | Guidance |
|---|---|---|
| **Admin is not auth-protected** | `src/app/admin/` | Guarded only by `ENABLE_ADMIN_DASHBOARD=true` env var. Do not deploy without NextAuth v5 wired. |
| **`AuditLog` is unused** | `prisma/schema.prisma` | Table exists; nothing writes to it. Every mutation on Patient/EHR data needs a row. Leave `// TODO(audit)` at minimum. |
| **`Staff.passwordHash` unverified** | `Staff` model | No auth library installed. Do not expose any `Staff`-reading endpoint publicly. |
| **`db:push` replaces migrations** | `prisma/` | Safe for dev; unsafe for any environment with real clinical data. Switch to `prisma migrate` first. |
| **CSP must be updated for new third-parties** | `next.config.ts` headers | Auth SDK, storage, analytics, RTC → all need CSP entries. |
| **Kashier modes** | `KASHIER_MODE` env var | `test` (sandbox) and `live` (prod). Both reject `http://localhost` — use cloudflared/ngrok for local dev. |
| **`$` in env values expanded** | `.env.local` | Escape literal `$` as `\$`. dotenv treats `$<name>` as variable expansion (silent truncation). |
| **Kashier webhook HMAC** | `src/app/api/bookings/payment/webhook/route.ts` | Validates against `KASHIER_API_KEY`. Never log raw payloads. |
| **`cleanPhoneNumber()`** | Booking util | Egypt-specific E.164 — flag as tech debt when internationalizing. |
| **`useReveal` deps missing** | `hooks/useReveal.ts` | Always pass `locale`/`pathname` as deps — animations don't replay on route change without them. |
| **`html[dir]` overrides** | `[locale]/layout.tsx` | Set once at layout. Do not override on inner elements. Use `dir="auto"` on user text inputs only. |
| **Never log PHI** | Any route touching `Patient` / EHR | Log IDs only. Names, phones, addresses, clinical notes are PHI. |
| **Soft-delete only** | EHR models (Phase 2+) | `deletedAt DateTime?` pattern. Hard-delete is forbidden for clinical records. |

---

## 16. AI Behavior Rules

- Prefer **clarity over cleverness**, **reusability over shortcuts**, **explicitness over magic**.
- If unsure, **ask** — do not guess.
- Never introduce patterns that contradict this document.
- Do **not** add tests, dependencies, abstractions, or refactors that weren't requested.
- When you discover dead code or stale references, **flag them** — do not silently delete or restructure.
- Build EHR **incrementally** — do not model all clinical entities at once. Wait for confirmation of each phase.
- Any DB mutation on patient or clinical data must have a `// TODO(audit): wire when auth lands` comment if no AuditLog write is present.
- Admin routes go under `src/app/admin/` — outside `[locale]`, no i18n, English-only, Bootstrap-styled, no public Header/Footer.
