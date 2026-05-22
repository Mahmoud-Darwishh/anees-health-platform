# Anees Health Platform

A bilingual (English/Arabic) health-tech platform built with Next.js (App Router) and TypeScript, designed for long-term scalability across EHR, telemedicine, booking, and real-time chat.

## Highlights

- **Next.js App Router** with server components by default; client components only when needed.
- **Internationalization** via `next-intl`, locale prefixes (`/en`, `/ar`), and RTL/LTR support from layout.
- **Strict TypeScript** and SCSS-based design system; no ad-hoc inline styles unless there is no viable alternative.
- **Motion** powered by `data-reveal` + `useReveal`/`Reveal` (IntersectionObserver); respects `prefers-reduced-motion`.
- **Shared layout chrome** (Header, Footer) from `components/layout`, avoiding per-page duplicates.
- **Domain-ready** for booking, telemedicine, and chat with modular `features/` structure.

## Project Structure

```
anees-health-platform/
├── src/
│   ├── app/
│   │   ├── [locale]/          # Locale-scoped layouts/pages (RTL/LTR handled here)
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── common/            # Shared primitives (e.g., Reveal)
│   │   ├── layout/            # Header, Footer (single source of truth)
│   │   └── sections/          # Page sections (home, etc.)
│   ├── features/              # Future modules (booking, telemedicine, chat, payments, dashboards)
│   ├── hooks/                 # Reusable hooks (e.g., useReveal)
│   ├── i18n/                  # next-intl setup
│   ├── lib/                   # Shared utilities/config
│   ├── styles/                # Global styles, tokens, legacy imports
│   └── types/                 # Shared TypeScript types
├── messages/                  # Translation bundles (en.json, ar.json)
├── public/                    # Static assets, legacy css/scss, images, fonts
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Conventions & Best Practices

- **Styling:** SCSS/CSS modules and shared tokens; avoid inline styles unless no alternative. No `!important` unless justified.
- **Motion:** Use `data-reveal` + `Reveal`/`useReveal`; centralize motion tokens; respect `prefers-reduced-motion`.
- **Accessibility:** Semantic HTML, proper aria labels, focus states; ensure bilingual/RTL content remains accessible.
- **Internationalization:** All text comes from message bundles; derive direction from route locale; no hardcoded LTR assumptions.
- **Architecture:** Keep UI thin; business logic in API routes/services. Prefer server components unless interactivity is required.
- **Security/Privacy:** Plan for PHI; keep secrets off the client; enforce role-based access (patient/doctor/admin) in auth flows.
- **Branching:** `main` stays production-ready; use feature branches for booking/telemed/chat/payments/dashboards.

## Current Implementation Notes

- Home page sections wrap with `Reveal` for lightweight scroll animations.
- Layout-level Header/Footer are the only chrome; removed home-specific duplicates.
- RTL/LTR set at layout based on locale; `next-intl` provides messages.

## Running & Building

```bash
npm install
npm run dev      # http://localhost:3000/en and /ar
npm run build
npm start
```

## Progressive Web App (PWA)

- Built with `@ducanh2912/next-pwa` and Workbox runtime caching.
- Locale-aware manifests:
	- `/manifest-en.webmanifest` starts at `/en`
	- `/manifest-ar.webmanifest` starts at `/ar`
- Offline fallback route: `/~offline`
- Install/update prompt and notification controls:
	- shared prompt component in common UI
	- full settings screen at `/en/settings/pwa` and `/ar/settings/pwa`

### Push Notifications Backend

- Public key endpoint: `GET /api/pwa/public-key`
- Subscription management: `POST` and `DELETE /api/pwa/subscriptions`
- Protected sending endpoint: `POST /api/pwa/send`
- Subscription storage: in-memory.

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
ENABLE_PWA_DEV=false
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:security@aneeshealth.com
PWA_PUSH_SERVER_KEY=...
```

### Send Notification Example

```bash
curl -X POST http://localhost:3000/api/pwa/send \
	-H "Content-Type: application/json" \
	-H "x-pwa-server-key: YOUR_PWA_PUSH_SERVER_KEY" \
	-d '{"title":"Anees Update","body":"Your appointment has been updated","url":"/en/booking"}'
```

## Roadmap

- Booking: normalized entities (patients, providers, slots, appointments, payments) with SSR-friendly flows.
- Telemedicine: WebRTC/RTC provider integration, secure tokens, waiting rooms, session lifecycle.
- Chat: WebSocket/RTC abstraction, persistence, read receipts, offline cache.
- Dashboards: role-based surfaces for patient/doctor/admin.

## Testing & Quality

- Prefer Playwright/Cypress for critical flows (locale switch, booking steps, chat send/receive).
- Lint/format before commit; keep TypeScript strict.

© 2025 Anees Health. All rights reserved.