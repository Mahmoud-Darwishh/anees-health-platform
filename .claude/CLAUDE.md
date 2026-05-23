# Anees Health Platform — Claude Code Context

Production-grade bilingual (EN/AR) health-tech platform. **Next.js 16 App Router + React 19 + TypeScript strict**. Target: MENA region (starting Egypt). Handles patient/booking/payment data today; clinical PHI (EHR) is being built next — security and accessibility are non-negotiable.

---

## Stack at a glance

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack dev) |
| Language | TypeScript 5, strict mode |
| i18n | `next-intl` 4.6 — locales: `en`, `ar` |
| Styling | SCSS modules + design tokens (no Tailwind) |
| PWA | `@ducanh2912/next-pwa` + custom worker (`worker/index.ts`) |
| Push | `web-push` (VAPID) — subscriptions persisted in Postgres ✅ |
| Maps | Leaflet (coverage page) |
| Database | **Postgres + Prisma 5.22** — schema: `prisma/schema.prisma`, client: `src/lib/db/prisma.ts` |
| Auth | **Not wired yet** — `Staff` model has `passwordHash` + `StaffRole` enum, but no NextAuth/Clerk installed |
| File storage | **Not wired yet** — needed for EHR document/lab/scan uploads |
| Validation | Manual hand-rolled per route (e.g., `validateBookingForm`). No Zod yet. |
| Tests | **None yet** (Vitest/Playwright planned) |

---

## Architecture (current)

```
src/
├── app/                         # Next.js routes (App Router)
│   ├── [locale]/                # /en/* and /ar/* — see route map below
│   ├── api/                     # API route handlers
│   └── ~offline/                # PWA offline fallback
│
├── features/                    # Domain modules (feature-first)
│   ├── booking/components/      # Booking form, payment gateway, result
│   ├── doctors/components/      # doctorgrid/ + profile/
│   ├── coverage/components/     # Coverage check form + page content
│   └── pwa/                     # components/ + hooks/ (usePwaManager)
│
├── components/                  # Shared, app-wide UI only
│   ├── common/                  # Reveal, WhatsApp, RelatedLinks, PwaInstallPrompt
│   ├── layout/                  # Header, Footer, Breadcrumb, MobileBottomNav
│   └── sections/home/           # Home page section compositions
│
├── lib/
│   ├── api/                     # Server-side data access (doctors, pricing, specialties, content-services)
│   ├── config/                  # App config, booking pricing
│   ├── db/                      # Prisma singleton (prisma.ts)
│   ├── models/                  # Domain types (booking.types, doctor.types)
│   ├── pwa/                     # Subscription store (DB-backed), push helpers
│   ├── seo/                     # Search/discovery metadata helpers
│   └── utils/                   # app-logger, cors, rate-limit, coverage, slug, structured-data, metadata
│
├── hooks/                       # Cross-cutting hooks (useReveal)
├── i18n/                        # next-intl request config
├── assets/scss/                 # Global SCSS: base, layout, components, pages, utils
├── styles/                      # Global stylesheet entry
└── types/                       # Global TS types + SCSS module shim

prisma/
├── schema.prisma                # Single source of truth — all DB models
└── seed.ts                      # Lookup tables + doctors seed (run: npm run db:seed)
```

**Rule of thumb:** domain-specific code → `features/<domain>/`. Truly app-wide UI → `components/`. Cross-cutting utilities → `lib/`.

---

## Database — current schema overview

All models live in [`prisma/schema.prisma`](../prisma/schema.prisma). Always reference the file before writing queries — it's the source of truth.

### Operational core (live, seeded)
- `Patient` — demographics, family link, area, status, chief complaint. **No clinical data yet.**
- `Family` — household grouping for patients.
- `Provider` — internal staff providing care (separate from public-facing `Doctor`). Role, rate, payment type.
- `Visit` — the encounter. Booked/scheduled/completed dates, status, price, payout. The natural anchor for EHR clinical data.
- `CarePlan` — multi-visit treatment plan.
- `Invoice`, `Payment`, `Expense`, `ProviderPayout` — finance.
- `Service`, `ServiceCategory`, `ProviderRole`, `PaymentMethod`, `ExpenseCategory`, `ReferralSource`, `Area` — lookups.

### Online funnel (live)
- `OnlineBooking` — website funnel record (pre-Visit). Tracks Kashier session/order/transaction IDs. Converts to a `Visit` on confirmation.

### Public website (live)
- `Doctor` — bilingual public-facing doctor profiles (migrated from JSON). Read by [src/lib/api/doctors.ts](../src/lib/api/doctors.ts).
- `Specialty`, `ContentService`, `BookingPrice` — editable from DB, no code deploy needed.

### Infrastructure (live)
- `PushSubscription` — VAPID subscriptions (DB-backed).
- `RateLimit` — fixed-window counters for `@/lib/utils/rate-limit`.
- `CoverageCheck` — analytics for the coverage map. No PII (IP is SHA-256 hashed).
- `Staff` — admin dashboard users. Has `passwordHash` and `StaffRole` enum (`superadmin | admin | operator | finance | viewer`), but **no auth library is installed yet**.

### Audit (model exists, NOT wired up)
- `AuditLog` — `tableName`, `recordId`, `action` (create/update/delete), `previousData`, `newData`, `changedBy`, `changedAt`. **Zero writes from `src/` today** — must be wired into every mutation when auth lands.

### Missing for EHR (to be added)
Clinical entities not yet modeled: `MedicalHistory`, `Allergy`, `Medication`, `Diagnosis` (ICD-10), `VitalSigns`, `LabOrder`/`LabResult`, `ImagingStudy`, `Document` (uploads), `InsurancePolicy`, `ConsentRecord`, `ProgressNote`, `Immunization`, `StaffShift` (attendance). The natural anchors are `Patient` and `Visit`.

---

## Route map

| Path | Notes |
|---|---|
| `/[locale]` | Home |
| `/[locale]/about-us`, `/contact-us` | Route groups: `(about)`, `(contact)` |
| `/[locale]/privacy-policy`, `/terms-and-conditions` | Route group: `(legal)` |
| `/[locale]/booking` | Booking flow (client form → `/api/bookings/create`) |
| `/[locale]/coverage` | Service-area map (Leaflet + GeoJSON) |
| `/[locale]/doctors`, `/doctors/[slug]` | Listing + profile (data: `Doctor` table) |
| `/[locale]/services`, `/services/[slug]` | SEO landing pages |
| `/[locale]/specialties`, `/specialties/[slug]` | SEO landing pages |
| `/[locale]/payment`, `/payment/redirect` | Kashier gateway integration |
| `/[locale]/settings/pwa` | Push notification opt-in |
| `/api/bookings/{create,payment/initiate,payment/webhook}` | Booking + Kashier webhook |
| `/api/coverage`, `/api/coverage/stats` | Coverage check + analytics |
| `/api/pwa/{public-key,subscriptions,send}` | Push notification backend |

---

## Conventions

- **Path alias:** `@/*` → `src/*`. Use it always — no `../../` relative imports across folders.
- **Server-first:** Default to server components. Add `'use client'` only when interactivity is required.
- **DB access:** Always import the singleton `import { prisma } from '@/lib/db/prisma'`. Never `new PrismaClient()` in app code — it leaks connections in dev hot-reload.
- **i18n:**
  - Server: `getTranslations({ locale, namespace })`
  - Client: `useTranslations(namespace)`, `useLocale()`
  - Messages live in `messages/en.json`, `messages/ar.json` — never hardcode text.
  - `dir` (LTR/RTL) is set once on `<html>` in `[locale]/layout.tsx` — do not override on inner elements.
- **SCSS:**
  - `@use` only — never `@import`. Modernize legacy `@import` you encounter.
  - Tokens: `src/assets/scss/utils/variables.scss`. Breakpoint mixins: `respond-above(bp)` / `respond-below(bp)`.
  - Component styles: co-located `.module.scss`. Shared section/page styles live under `src/assets/scss/{components,layout,pages,sections}/`.
- **Motion:** `<Reveal />` + `data-reveal` (IntersectionObserver). Respects `prefers-reduced-motion` automatically. No AOS, no ad-hoc animation libs.
- **Logging:** `@/lib/utils/app-logger` for general server logs. `@/lib/utils/logger` is **coverage-check file logging only** (writes JSONL) — do not repurpose. Never log PHI or raw payment payloads.
- **Rate limiting:** Use `@/lib/utils/rate-limit` (`checkRateLimit(key, max, windowMs)`) on every mutation route, keyed by IP from `getClientIp(request)`. Backed by the `RateLimit` table.
- **CORS:** Use `resolveCorsHeaders` from `@/lib/utils/cors` on every API route response.
- **PWA manifest:** Locale-specific (`/manifest-en.webmanifest`, `/manifest-ar.webmanifest`) referenced from `[locale]/layout.tsx`.

---

## Critical pitfalls (read before changing)

| Pitfall | Where | Guidance |
|---|---|---|
| **`AuditLog` is unused** | `prisma/schema.prisma` | Model exists; no code writes to it. When auth lands, every mutation in API routes / server actions must produce an audit row. Build a Prisma middleware or thin service wrapper rather than scattering `prisma.auditLog.create` calls. |
| **No auth yet** | `Staff` model | `passwordHash` field exists but nothing hashes/verifies it. Don't expose anything that reads `Staff` until NextAuth (or equivalent) is wired. |
| **No migrations folder** | `prisma/` | Workflow today is `db:push` (schema sync to live DB). Before production hardening, switch to `prisma migrate dev`/`deploy` and commit migration history. |
| **CSP in `next.config.ts`** | `next.config.ts` headers | Any new third-party (analytics, RTC, CDN, payment SDK, file storage) requires updating `Content-Security-Policy`. |
| **Kashier has 2 modes** | `KASHIER_MODE` in `.env.local` | `test` (test-api.kashier.io, sandbox), `live` (api.kashier.io, prod). BOTH reject `http://localhost` URLs — a tunnel (cloudflared/ngrok) is required for local dev. Test mode needs separate test credentials. |
| **`$` in env values is expanded** | `.env.local` | dotenv treats `$<name>` as variable expansion. Escape literal `$` as `\$` (e.g. Kashier secret keys). |
| **Kashier webhook signing** | `src/app/api/bookings/payment/webhook/route.ts` | Validates HMAC against `KASHIER_API_KEY`. Do not log raw payloads. |
| **`cleanPhoneNumber()`** | Egypt-specific E.164 — flag when internationalizing. |
| **`useReveal` deps** | Pass `locale`/`pathname` as deps so animations replay on route change. |
| **PHI awareness** | Never log PHI. Never expose secrets client-side. Validate at API boundaries, not just client. Once clinical data exists, default to least-privilege reads and signed-URL access for documents. |

---

## Build & verify

```bash
npm run dev          # http://localhost:3000/en (and /ar)
npm run build        # prisma generate + next build
npm run lint         # ESLint (next/core-web-vitals + TS)
npx tsc --noEmit     # Type check only

# Database
npm run db:generate  # Regenerate Prisma client after schema edits
npm run db:push      # Sync schema to DB (current workflow — no migration files)
npm run db:migrate   # prisma migrate dev (future workflow — once we adopt migrations)
npm run db:seed      # Run prisma/seed.ts (lookup tables + doctors)
npm run db:studio    # Open Prisma Studio for ad-hoc data inspection
```

`DATABASE_URL` must be present in `.env.local` (Postgres connection string).

Pre-existing lint errors exist (React `setState`-in-effect in `doctorgrid/doctors-grid.tsx`). Do not auto-fix unless asked.

---

## Scaling roadmap

Status of the major infra/architecture decisions:

| # | Concern | Status |
|---|---|---|
| 1 | Database + ORM | ✅ Postgres + Prisma 5.22 live. Schema covers operations, finance, online funnel, doctors, infra. |
| 2 | Auth | ⏳ Pending. `Staff` model ready; need to install NextAuth v5 (or Clerk) and wire RBAC. Roles already defined in `StaffRole` enum. |
| 3 | Audit logging | ⏳ Table exists, **not wired**. Highest priority before any admin/EHR write path goes live. |
| 4 | Validation | ⏳ Hand-rolled today. Migrate to Zod schemas shared client↔server. |
| 5 | File storage (S3-compatible) | ⏳ Needed for EHR uploads (labs, scans, insurance, consent forms). |
| 6 | Migrations | ⏳ Currently `db:push`. Switch to versioned `prisma migrate` before production hardening. |
| 7 | State management | ⏳ Zustand for cross-page flows; TanStack Query for client-side server cache. |
| 8 | Forms | ⏳ `react-hook-form` + Zod resolver. |
| 9 | Observability | ⏳ Sentry + `pino`. |
| 10 | Testing | ⏳ Vitest (unit) + Playwright (e2e). |
| 11 | Compliance | ⏳ Encryption at rest, MFA for staff, signed URLs, BAA-eligible vendors for real PHI. |

When implementing a new domain, follow the feature-module pattern:
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

## AI behavior expectations

- Prefer clarity over cleverness; reusability over shortcuts; explicitness over magic.
- Never introduce patterns that contradict this document. If unsure, ask.
- Output should reflect a senior engineer building a regulated, long-lived medical platform.
- Do **not** add tests, dependencies, or refactors that weren't requested.
- When you discover dead code or stale references during a task, flag it — do not silently delete or restructure.
- When adding any DB mutation, plan how it will eventually emit an `AuditLog` row, even if auth isn't wired yet — leave a TODO at minimum so we don't ship un-audited write paths.
