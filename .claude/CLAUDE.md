# Anees Health Platform — Claude Code Context

Production-grade bilingual (EN/AR) health-tech platform. **Next.js 16 App Router + React 19 + TypeScript strict**. Target: MENA region (starting Egypt). Future PHI handling — security and accessibility are non-negotiable.

---

## Stack at a glance

| Layer | Choice |
|---|---|
| Framework | Next.js 16.1 (App Router, Turbopack dev) |
| Language | TypeScript 5, strict mode |
| i18n | `next-intl` 4.6 — locales: `en`, `ar` |
| Styling | SCSS modules + design tokens (no Tailwind) |
| PWA | `@ducanh2912/next-pwa` + custom worker (`worker/index.ts`) |
| Push | `web-push` (VAPID) — subscriptions currently in-memory ⚠️ |
| Maps | Leaflet (coverage page) |
| Database | **None yet** — doctors are JSON, bookings have no persistence |
| Auth | **None yet** |
| Tests | **None yet** (Vitest/Playwright planned) |

---

## Architecture (current, post-refactor)

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
│   ├── api/                     # Server-side data access (e.g., doctors.ts)
│   ├── config/                  # App config, booking pricing
│   ├── models/                  # Domain types (booking.types, doctor.types)
│   ├── pwa/                     # subscription store, push helpers
│   ├── seo/                     # Search/discovery metadata helpers
│   └── utils/                   # logger, app-logger, slug, structured-data, metadata
│
├── hooks/                       # Cross-cutting hooks (useReveal)
├── i18n/                        # next-intl request config
├── assets/scss/                 # Global SCSS: base, layout, components, pages, utils
├── styles/                      # Global stylesheet entry
└── types/                       # Global TS types + SCSS module shim
```

**Rule of thumb:** domain-specific code → `features/<domain>/`. Truly app-wide UI → `components/`. Cross-cutting utilities → `lib/`.

---

## Route map

| Path | Notes |
|---|---|
| `/[locale]` | Home |
| `/[locale]/about-us`, `/contact-us` | Route groups: `(about)`, `(contact)` |
| `/[locale]/privacy-policy`, `/terms-and-conditions` | Route group: `(legal)` |
| `/[locale]/booking` | Booking flow (client form + server action target) |
| `/[locale]/coverage` | Service-area map (Leaflet + GeoJSON) |
| `/[locale]/doctors`, `/doctors/[slug]` | Listing + profile (data: JSON, see pitfalls) |
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
- **Logging:** `@/lib/utils/app-logger` for general server logs. `@/lib/utils/logger` is **coverage-check file logging only** (writes JSONL) — do not repurpose.
- **PWA manifest:** Locale-specific (`/manifest-en.webmanifest`, `/manifest-ar.webmanifest`) referenced from `[locale]/layout.tsx`. The legacy `manifest.json` was removed.

---

## Critical pitfalls (read before changing)

| Pitfall | Where | Guidance |
|---|---|---|
| **Doctors data is hardcoded JSON** | `src/features/doctors/components/doctorgrid/doctors.{en,ar}.json` | Loaded via `readFileSync` in `src/lib/api/doctors.ts`. Any path change must update that loader. |
| **PWA subscriptions are in-memory** | `src/lib/pwa/subscription-store.ts` | Lost on server restart. Move to DB before production. |
| **CSP in `next.config.ts`** | `next.config.ts` headers | Any new third-party (analytics, RTC, CDN, payment SDK) requires updating `Content-Security-Policy`. |
| **Kashier webhook signing** | `src/app/api/bookings/payment/webhook/route.ts` | Validates HMAC; do not log raw payloads. |
| **`cleanPhoneNumber()`** | Egypt-specific E.164 — flag when internationalizing. |
| **`useReveal` deps** | Pass `locale`/`pathname` as deps so animations replay on route change. |
| **PHI awareness** | Never log PHI. Never expose secrets client-side. Validate at API boundaries, not just client. |

---

## Build & verify

```bash
npm run dev      # http://localhost:3000/en (and /ar)
npm run build    # Production build
npm run lint     # ESLint (next/core-web-vitals + TS)
npx tsc --noEmit # Type check only
```

Pre-existing lint errors exist (React `setState`-in-effect in `doctorgrid/doctors-grid.tsx`). Do not auto-fix unless asked — they predate the current refactor and the user is aware.

---

## Scaling roadmap (decisions pending — ask before implementing)

The platform is frontend-scaffold-ready but **not backend-ready**. Before adding heavy features, these decisions need to be made:

1. **Database + ORM** — recommend Postgres + Prisma. Tables: `users`, `doctors`, `bookings`, `payments`, `push_subscriptions`, `audit_logs`.
2. **Auth** — Auth.js (NextAuth v5) or Clerk. Roles: `patient`, `doctor`, `admin`.
3. **Validation** — Zod schemas shared between client forms and server handlers.
4. **State management** — Zustand for cross-page booking flow; TanStack Query for client-side server data cache.
5. **Forms** — `react-hook-form` + Zod resolver.
6. **Observability** — Sentry for errors; structured logging via `pino`.
7. **Testing** — Vitest (unit) + Playwright (e2e).
8. **Compliance** — encryption at rest, audit log table, RBAC, BAA-eligible vendors if handling real PHI.

When implementing any of the above, follow the feature-module pattern:
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
