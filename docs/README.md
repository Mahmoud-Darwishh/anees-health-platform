# Anees Health Platform

Bilingual (English/Arabic) health-tech platform built for the MENA region, starting Egypt. Covers the public patient-facing website, online booking + payments, and an internal clinical dashboard (EHR — in progress). **Next.js 16 App Router · React 19 · TypeScript strict · Postgres + Prisma.**

---

## What's live

| Area | Description |
|---|---|
| Public website | Bilingual (`/en`, `/ar`) marketing site — services, doctors, specialties, about, contact, legal |
| Doctor profiles | DB-backed bilingual doctor profiles at `/[locale]/doctors/[slug]` |
| Online booking | Multi-step booking form → Kashier payment gateway → webhook confirmation |
| Coverage map | Leaflet map showing service areas; analytics stored in Postgres |
| PWA | Installable, offline-capable, push notifications (VAPID via Postgres-backed subscriptions) |
| Admin — patients | Internal patient list + view/edit at `/admin/patients` (env-guarded, auth pending) |

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 — App Router, Turbopack dev server |
| Language | TypeScript 5, strict mode |
| Styling | SCSS modules + design tokens. Bootstrap 5 in admin. No Tailwind. |
| Internationalization | `next-intl` 4.6 — `/en` and `/ar` locales, full RTL/LTR |
| Database | Postgres + Prisma 5.22 |
| Payments | Kashier (Egypt-native gateway) — test + live modes |
| PWA / Push | `@ducanh2912/next-pwa` + `web-push` (VAPID) |
| Maps | Leaflet (coverage page) |
| Auth | **NextAuth v5 chosen — not yet installed.** `Staff` table + roles ready. |
| File storage | **Not yet wired** — planned for EHR labs/scans/documents |
| Validation | Hand-rolled per-route today. Zod planned. |
| Tests | None yet — Vitest + Playwright planned |

---

## Project structure

```
anees-health-platform/
├── src/
│   ├── app/
│   │   ├── [locale]/          # Public site (/en/*, /ar/*)
│   │   │   ├── (about)/       # /about-us
│   │   │   ├── (contact)/     # /contact-us
│   │   │   ├── (legal)/       # /privacy-policy, /terms-and-conditions
│   │   │   ├── booking/       # Booking flow
│   │   │   ├── coverage/      # Service-area map
│   │   │   ├── doctors/       # Doctor listing + profiles
│   │   │   ├── payment/       # Kashier redirect + result pages
│   │   │   ├── services/      # SEO service landing pages
│   │   │   ├── settings/pwa/  # Push notification opt-in
│   │   │   └── specialties/   # SEO specialty landing pages
│   │   ├── admin/             # ⚠️ Internal dashboard (env-guarded, auth pending)
│   │   │   └── patients/      # Patient list + view/edit
│   │   ├── api/
│   │   │   ├── bookings/      # create · payment/initiate · payment/webhook
│   │   │   ├── coverage/      # check + stats
│   │   │   └── pwa/           # public-key · subscriptions · send
│   │   └── ~offline/          # PWA offline fallback
│   ├── features/              # Domain modules (feature-first)
│   │   ├── booking/           # Booking form, payment gateway, result
│   │   ├── doctors/           # Doctor grid + profile
│   │   ├── coverage/          # Coverage form + map content
│   │   └── pwa/               # Install prompt, notification hooks
│   ├── components/            # App-wide shared UI
│   │   ├── common/            # Reveal, WhatsApp button, RelatedLinks
│   │   ├── layout/            # Header, Footer, Breadcrumb, MobileBottomNav
│   │   └── sections/home/     # Home page section compositions
│   ├── lib/
│   │   ├── api/               # Server-side data access (doctors, pricing, specialties)
│   │   ├── config/            # App config + booking pricing
│   │   ├── db/                # Prisma singleton
│   │   ├── models/            # Domain TypeScript types
│   │   ├── pwa/               # DB-backed subscription store + push helpers
│   │   ├── seo/               # Metadata + structured-data helpers
│   │   └── utils/             # Logger, CORS, rate-limit, coverage, slug
│   ├── hooks/                 # useReveal (scroll animation)
│   ├── i18n/                  # next-intl request config
│   ├── assets/scss/           # Global SCSS: base, layout, components, utils
│   └── types/                 # Global TS types + SCSS module shim
├── prisma/
│   ├── schema.prisma          # Single source of truth for all DB models
│   └── seed.ts                # Lookup tables + doctors seed
├── messages/
│   ├── en.json                # English translations
│   └── ar.json                # Arabic translations
├── worker/                    # Custom PWA service worker
└── public/                    # Static assets, icons, legacy CSS
```

---

## Database models

All models are in `prisma/schema.prisma`.

**Operational core:** `Patient`, `Family`, `Provider`, `Visit`, `CarePlan`, `Invoice`, `Payment`, `Expense`, `ProviderPayout`

**Lookups:** `Area`, `Service`, `ServiceCategory`, `ProviderRole`, `PaymentMethod`, `ExpenseCategory`, `ReferralSource`

**Online funnel:** `OnlineBooking` — website booking record, converts to `Visit` on payment

**Public site:** `Doctor`, `Specialty`, `ContentService`, `BookingPrice` — editable from DB, no redeploy needed

**Infrastructure:** `PushSubscription`, `RateLimit`, `CoverageCheck`, `Staff`, `AuditLog`

**EHR (in progress):** Patient header fields being added (`primaryCaregiverPhone`, `addressMapUrl`). Clinical schema (`MedicalHistory`, `Allergy`, `Medication`, `Diagnosis`, `VitalSigns`, `ProgressNote`) coming in the next phase.

---

## Running locally

```bash
npm install
npm run dev           # http://localhost:3000/en and /ar
npm run build         # prisma generate + next build
npm run lint
npx tsc --noEmit      # type check only

# Database
npm run db:generate   # regenerate Prisma client after schema changes
npm run db:push       # sync schema to DB (no migration files yet)
npm run db:seed       # seed lookup tables + doctor profiles
npm run db:studio     # Prisma Studio — ad-hoc data browser
```

Required in `.env.local`:
```bash
DATABASE_URL=postgresql://...

# Payments
KASHIER_MODE=test           # or live
KASHIER_MERCHANT_ID=...
KASHIER_API_KEY=...

# PWA push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...
PWA_PUSH_SERVER_KEY=...

# Admin dashboard (local only — do not set in production without auth)
ENABLE_ADMIN_DASHBOARD=true
```

---

## Booking + Payments (Kashier)

- Booking form at `/[locale]/booking` POSTs to `/api/bookings/create`
- Payment initiated at `/api/bookings/payment/initiate` → redirects to Kashier hosted page
- Kashier posts back to `/api/bookings/payment/webhook` (HMAC-verified)
- Two modes: `test` (test-api.kashier.io) and `live` (api.kashier.io)
- **Both modes reject `http://localhost`** — use a tunnel (cloudflared / ngrok) for local testing

---

## PWA + Push Notifications

- Installable PWA with locale-aware manifests (`/manifest-en.webmanifest`, `/manifest-ar.webmanifest`)
- Offline fallback: `/~offline`
- Push subscription endpoints: `POST /api/pwa/subscriptions`, `DELETE /api/pwa/subscriptions`
- Public VAPID key: `GET /api/pwa/public-key`
- Send push (server-to-all): `POST /api/pwa/send` (requires `x-pwa-server-key` header)
- Subscriptions are persisted in Postgres (`PushSubscription` table)

---

## Admin Dashboard — EHR (in progress)

The internal clinical dashboard lives at `/admin/*`. It sits outside the `[locale]` routing (English-only, no i18n), uses Bootstrap for layout, and has **no public Header/Footer**.

**Current state:** `/admin/patients` lists patients; `/admin/patients/[id]` shows and edits the patient header (name, DOB, gender, caregiver, address, maps URL).

**Access guard:** The admin section returns 404 unless `ENABLE_ADMIN_DASHBOARD=true` is set in `.env.local`. This is a dev-only gate — full NextAuth v5 authentication is the next milestone before any admin feature ships to production.

**EHR phasing:**

| Phase | What | Status |
|---|---|---|
| 1 | Patient header (name, caregiver, address) | 🔄 In progress |
| 2 | Clinical schema (medical history, allergies, meds, diagnoses, vitals, progress notes) | ⏳ Next |
| 3 | Auth (NextAuth v5) + Audit log wiring | ⏳ Unlocks production |
| 4 | File storage (labs, scans, insurance docs) | ⏳ After auth |
| 5 | Staff operations (attendance / shifts) | ⏳ Later |

---

## Conventions (brief)

- `@/*` path alias → `src/*` — always use it, no `../../` across folders
- Server components by default; `'use client'` only when interactivity is required
- `import { prisma } from '@/lib/db/prisma'` — never `new PrismaClient()` in app code
- SCSS `@use` only — never `@import`
- Never log PHI; never expose secrets client-side; validate at API boundaries

---

## Roadmap

- **Now:** Admin patient view/edit (EHR Phase 1)
- **Next:** Full clinical schema + admin forms (EHR Phase 2) → NextAuth v5 auth + audit wiring (Phase 3) → File storage for documents (Phase 4)
- **Later:** Staff attendance, e-prescribing primitives, telemedicine (WebRTC), chat (WebSocket), observability (Sentry + pino), Vitest + Playwright tests

---

© 2026 Anees Health. All rights reserved.
