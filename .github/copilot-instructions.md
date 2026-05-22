# AI Contributor Instructions — Anees Health Platform

You are contributing to a **production-grade, bilingual (EN/AR) health-tech platform** built with **Next.js 16 App Router, React 19, and TypeScript strict mode**. Target region: MENA (starting Egypt). The platform will eventually handle PHI, so **security, accessibility, and i18n are not optional**.

Your output must reflect the standards of a senior engineer building a regulated, long-lived medical platform.

---

## 0. Quick Start

```bash
npm run dev      # http://localhost:3000/en  (also /ar)
npm run build    # Production build
npm run lint     # ESLint (next/core-web-vitals + TypeScript)
npx tsc --noEmit # Type check only
```

**No test runner is configured yet** (Vitest/Playwright planned — do not add tests without being asked).

### Key exemplar files

| Concern | File |
|---|---|
| Locale layout, RTL/LTR, providers | `src/app/[locale]/layout.tsx` |
| Client component + i18n hooks | `src/features/booking/components/booking-form.tsx` |
| Server-side data loader (current pattern) | `src/lib/api/doctors.ts` |
| Reveal animation hook | `src/hooks/useReveal.ts` |
| Design tokens | `src/assets/scss/utils/variables.scss` |
| Responsive mixins | `src/assets/scss/utils/mixins.scss` |
| Domain types | `src/lib/models/{booking,doctor}.types.ts` |
| i18n configuration | `src/i18n/request.ts` |
| Service worker (push + offline) | `worker/index.ts` |
| Locale-aware PWA manifest | `public/manifest-{en,ar}.webmanifest` |

---

## 1. Project Context

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript strict
- **i18n:** `next-intl` 4.6 — locales: `en`, `ar` (LTR / RTL)
- **Styling:** SCSS modules + design tokens (no Tailwind, no styled-components)
- **PWA:** `@ducanh2912/next-pwa` with custom worker
- **Maps:** Leaflet (coverage page) + GeoJSON in `public/assets/coverage/`
- **Payments:** Kashier (HMAC-signed webhooks). Two modes: `test` (sandbox), `live` (prod). Both require a public HTTPS site URL.
- **Database:** None yet — doctor data is JSON; bookings are not persisted
- **Auth:** None yet
- **Domain:** Healthcare / telemedicine

---

## 2. Current Architecture

```
src/
├── app/                         # Next.js routes (App Router)
│   ├── [locale]/                # Localized routes (en/ar)
│   │   ├── (about)/about-us
│   │   ├── (contact)/contact-us
│   │   ├── (legal)/{privacy-policy,terms-and-conditions}
│   │   ├── booking
│   │   ├── coverage
│   │   ├── doctors/[slug]
│   │   ├── services/[slug]
│   │   ├── specialties/[slug]
│   │   ├── payment/redirect
│   │   └── settings/pwa
│   ├── api/                     # Route handlers (bookings, coverage, pwa)
│   └── ~offline/                # PWA offline fallback
│
├── features/                    # Domain modules — feature-first
│   ├── booking/components/
│   ├── doctors/components/{doctorgrid,profile}
│   ├── coverage/components/
│   └── pwa/{components,hooks}
│
├── components/                  # Truly shared UI (NOT domain-specific)
│   ├── common/                  # Reveal, WhatsApp, PwaInstallPrompt, RelatedLinks
│   ├── layout/                  # Header, Footer, Breadcrumb, MobileBottomNav
│   └── sections/home/           # Home page section compositions
│
├── lib/
│   ├── api/                     # Server-side data access (doctors.ts)
│   ├── config/                  # App config, booking pricing
│   ├── models/                  # Domain types (booking.types, doctor.types)
│   ├── pwa/                     # subscription-store, push helpers
│   ├── seo/                     # Search/discovery
│   └── utils/                   # logger, app-logger, slug, structured-data, metadata
│
├── hooks/                       # Cross-cutting hooks (useReveal)
├── i18n/                        # next-intl request config
├── assets/scss/                 # SCSS architecture (base, layout, components, pages, utils)
├── styles/                      # Global stylesheet entry
└── types/                       # Global TS types
```

### Where new code belongs

- **Domain-specific UI / hooks / services** → `src/features/<domain>/`
- **App-wide UI primitives** (used by 3+ unrelated features) → `src/components/`
- **Cross-cutting utilities** (no feature ownership) → `src/lib/`
- **Pages and API routes** → `src/app/`

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

### TypeScript

- Strict typing is mandatory. Avoid `any` (and justify if unavoidable).
- Prefer typed props, hooks, and domain models from `src/lib/models/`.
- Domain entities should be normalized and reusable.

### Path aliases

- `@/*` → `src/*`. **Use it always** — no `../../` cross-folder relative imports.

---

## 4. Styling & Design System

- **No ad-hoc inline styles.** Justify if no alternative exists.
- Use:
  - CSS Modules / SCSS Modules (co-located `.module.scss`)
  - Shared tokens from `src/assets/scss/utils/variables.scss`
  - Bootstrap utility classes for spacing/layout where appropriate
- **`@use` only** — never `@import`. Modernize legacy `@import` you find.
- Avoid `!important`. Prefer scoped, predictable class names.
- Named breakpoints (`custom360`, `custom479`, `custom767`, `custom991`, `custom1199`, `md`, `lg`) live in `mixins.scss` — do not add ad-hoc pixel values.
- Use `respond-above(bp)` / `respond-below(bp)` mixins, not media-query strings.

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
- **`html[dir]` in `[locale]/layout.tsx` is the single source of truth.** Do not override `dir` on inner containers.
- Timezone is hardcoded to `Africa/Cairo` in `NextIntlClientProvider` — update if expanding regions.
- Accessibility must work in both languages (RTL focus order, screen reader pronunciation).

---

## 7. Accessibility (Required)

- Semantic HTML, proper headings, landmarks.
- `aria-label`, visible focus states, full keyboard navigation.
- Never sacrifice accessibility for visual polish.
- Test screen readers in both locales.

---

## 8. Health-Tech & Security

Assume the platform will handle **PHI (Protected Health Information)** in the near future. Therefore:

- Never expose secrets client-side. Server-only logic stays out of `'use client'` files.
- Validate every input at the API boundary — never rely solely on client validation.
- Authentication (when added) must support role-based access: `patient`, `doctor`, `admin`.
- Sessions must be secure (HTTP-only cookies, CSRF protection, rotation).
- API boundaries must be explicit and auditable — log meaningful events (without logging PHI).
- Any new third-party (analytics, RTC, CDN, payment SDK) requires updating **CSP headers in `next.config.ts`**.

---

## 9. API & Data Patterns

- **Route pattern:** `src/app/api/{domain}/{action}/route.ts`
- **Server-only logic** (price calc, PHI validation, HMAC verification) must never be imported into client components.
- **Current data sources:**
  - Doctors: JSON files in `src/features/doctors/components/doctorgrid/`, loaded via `readFileSync` in `src/lib/api/doctors.ts`
  - PWA subscriptions: in-memory `Map` in `src/lib/pwa/subscription-store.ts` (⚠️ lost on restart)
  - Bookings: no persistence yet
- **When DB is added:** create `features/<domain>/services/` for business logic and a thin repository in `src/lib/db/` for queries.

---

## 10. PWA Specifics

- Custom service worker: `worker/index.ts` (push + notification click).
- Manifests are locale-aware: `public/manifest-{en,ar}.webmanifest`; the layout sets `metadata.manifest` accordingly. The legacy `manifest.json` was removed.
- Push backend lives at `/api/pwa/{public-key,subscriptions,send}`. `send` requires the `x-pwa-server-key` header.
- VAPID env vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PWA_PUSH_SERVER_KEY`.

---

## 11. Observability & Reliability

- `@/lib/utils/app-logger` — general server logger (suppresses debug/info in production).
- `@/lib/utils/logger` — **coverage-check file logging only** (writes JSONL). Do not repurpose for general logs.
- Guard critical flows with retries and graceful degradation.
- Errors should fail safely and visibly to the user, with structured logs server-side.
- No error-tracking service is integrated yet (Sentry planned).

---

## 12. Future Feature Readiness

| Feature | Design notes |
|---|---|
| **Booking** | Normalized entities (Patient, Provider, Slot, Appointment, Payment). SSR-friendly, client hydration for interactivity. |
| **Telemedicine** | Plan around WebRTC or RTC provider. Separate signaling vs media. Secure tokens, waiting rooms, session lifecycle. |
| **Chat** | Abstract real-time layer (WebSocket / RTC). Support persistence, read receipts, offline cache. |
| **EHR** | Strict access control, audit logs, encryption at rest. Plan schema before implementing. |
| **Dashboards** | Patient + doctor + admin views. RBAC enforced at API + UI. |

Keep feature modules isolated under `src/features/` — do not couple them through `components/`.

---

## 13. Scaling Roadmap (Pending Decisions)

The platform is **frontend-scaffold-ready but not backend-ready**. Before adding heavy features, these decisions need to be made — confirm with the maintainer first:

1. **Database + ORM** → Postgres + Prisma recommended
2. **Auth** → Auth.js (NextAuth v5) or Clerk
3. **Validation** → Zod (shared client+server schemas)
4. **State management** → Zustand (cross-page flows) + TanStack Query (server cache)
5. **Forms** → `react-hook-form` + Zod resolver
6. **Observability** → Sentry + `pino` structured logging
7. **Testing** → Vitest (unit) + Playwright (e2e)
8. **Env validation** → `@t3-oss/env-nextjs` to fail fast on missing vars
9. **Compliance** → encryption at rest, audit log table, RBAC, BAA-eligible vendors if handling real PHI

---

## 14. Known Pitfalls

| Pitfall | Where | Guidance |
|---|---|---|
| **Doctors JSON path is hardcoded** | `src/lib/api/doctors.ts` uses `readFileSync` with a literal path | Any move/rename of the JSON files must update the loader. |
| **PWA subscriptions volatile** | `src/lib/pwa/subscription-store.ts` | In-memory `Map`; lost on restart. Move to DB before production. |
| **CSP must be updated for new third-parties** | `next.config.ts` headers | Adding analytics, RTC, CDN, payment SDK → update `Content-Security-Policy`. |
| **Kashier modes** | `KASHIER_MODE` in `.env.local` | `test` (sandbox) and `live` (prod). Both require a public HTTPS `NEXT_PUBLIC_SITE_URL` — use cloudflared/ngrok for local dev. Test mode needs separate test credentials from Kashier dashboard. |
| **`$` in env values** | `.env.local` | Escape literal `$` as `\$` — dotenv expands `$<name>` otherwise (silent truncation). |
| **Kashier webhook** | `src/app/api/bookings/payment/webhook/route.ts` | Validates HMAC against `KASHIER_API_KEY`. Never log raw payloads. |
| **`cleanPhoneNumber()`** | Egypt-specific E.164 formatting | Flag as tech debt when internationalizing. |
| **`useReveal` deps missing** | Always pass `locale`/`pathname` as deps | Without them, animations don't replay on route change. |
| **`html[dir]` overrides** | Set once in `[locale]/layout.tsx` | Do not override on inner elements. |
| **Bootstrap loaded via `<Script>`** | Coexists with SCSS modules | Do not introduce Tailwind — CSS isolation conflict. |
| **PHI logging** | Anywhere | Never log identifiers, names, or contact info. Hash if needed (see `logCoverageCheck`). |

---

## 15. AI Behavior Rules

When generating code or suggestions:

- Prefer **clarity over cleverness**, **reusability over shortcuts**, **explicitness over magic**.
- If unsure, **ask for clarification** — do not guess.
- Never introduce patterns that contradict this document.
- Do **not** add tests, dependencies, abstractions, or refactors that weren't requested.
- When you discover dead code, stale references, or hardcoded paths during a task, **flag them** — do not silently delete or restructure.
- **Branch hygiene:** `main` stays production-ready. New features → feature branches. Keep feature modules isolated.
