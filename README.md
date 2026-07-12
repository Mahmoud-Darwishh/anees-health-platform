# Anees Health Platform

> Production-grade, bilingual (EN / AR) home-healthcare platform for Egypt and the wider MENA region — public marketing site, patient portal, staff EHR, and a discipline-scoped clinician workspace, all in one Next.js app.

**Status:** private / proprietary · pre-hospital-partner go-live · `v1.1.0`
**Last refresh:** 2026-07-12

---

## What is this, in plain language

Anees delivers elite home care — nurses, physiotherapists, and doctors who visit patients at home — and this repository is the software that runs the whole operation:

- The **public website** where families discover services and book a visit.
- The **patient portal** where patients (and consented caregivers) see their records, visits, and results.
- The **staff EHR + operations console** where back-office staff manage patients, visits, billing, insurance, and compliance.
- The **clinician workspace** that the nurse / physio / doctor uses on their phone during a home visit.

Clinical data (the actual medical record) is stored in a dedicated FHIR server (**Medplum**), the international standard for health data. Everything operational — bookings, payments, staff, scheduling — lives in a normal **Postgres** database. Medical files (lab PDFs, scans) are stored encrypted in **Cloudflare R2**, virus-scanned, and streamed only to authorized users.

Because this handles **real patient health information (PHI)**, security, audit logging, access control, and accessibility are treated as non-negotiable, not features.

---

## The four surfaces

| Surface | Route | Who uses it | Languages |
|---|---|---|---|
| Marketing site | `/[locale]` | Prospective patients / families | EN + AR |
| Patient portal | `/[locale]/portal` | Patients + consented caregivers | EN + AR |
| Staff EHR + ops | `/admin/*` | Back-office, clinical ops, compliance, insurance | English only |
| Clinician workspace | `/clinician/*` | Physiotherapists, doctors, nurses (in the field) | English only |

---

## Architecture at a glance

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack dev), React 19, TypeScript 5 strict |
| i18n | `next-intl` (locales `en`, `ar`) — public + portal bilingual; admin + clinician English-only |
| Clinical data | **Medplum (FHIR)**, self-hosted — the single source of truth for medical records |
| Operational data | **Postgres + Prisma** — bookings, payments, staff, scheduling, insurance |
| Medical files | **Cloudflare R2** (encrypted) + FHIR `DocumentReference`/`Binary` metadata + malware scan |
| Auth | **NextAuth v5** — patient credentials, staff credentials, Google OAuth, WhatsApp OTP; login/logout audited; 45-min sessions |
| Payments | Kashier (Egypt) — booking funnel + webhook |
| PWA / Push | `@ducanh2912/next-pwa` + custom worker + `web-push` (VAPID) |
| Analytics / support | Microsoft Clarity, Facebook Pixel, Chatling chat widget |
| Observability | `@sentry/nextjs` installed + wired, DSN-gated (inactive until a DSN is set) |
| Tests / CI | Vitest unit tests + GitHub Actions quality gate (lint, type-check, RBAC/security guards, migration drift) |
| Hosting | Self-hosted VPS (Hostinger today → OVH Bahrain planned) |

For the full engineering reference — architecture map, route map, schema, conventions, and pitfalls — read **[`.claude/CLAUDE.md`](.claude/CLAUDE.md)**.

---

## Repository layout

```
src/
  app/            # Routes: [locale]/ (public+portal), admin/ (EHR+ops), clinician/, api/
  features/       # Feature-first domain modules (booking, coverage, doctors, ehr, portal, pwa)
  lib/            # medplum/ (FHIR core), db/ (Prisma), auth/ (RBAC), storage/ (R2), security/, billing/, utils/
  components/     # App-wide shared UI
  assets/scss/    # Design tokens + SCSS modules
prisma/           # schema.prisma (source of truth) + migrations + seed
messages/         # en.json / ar.json translations
public/           # Static assets, PWA manifests, service worker
tests/            # Vitest unit tests (RBAC, clinical safety, catalogs, readiness)
worker/           # Custom PWA service worker
docs/             # All long-form documentation — start at docs/README.md
```

---

## Quick start

```bash
npm install
npm run dev                  # http://localhost:3000/en (and /ar)

npm run build                # prisma generate + next build
npm run lint                 # ESLint + CSS/logical-property guards
npx tsc --noEmit             # type check
npm test                     # Vitest

# Database (Prisma)
npm run db:generate          # regenerate client after schema edits
npm run db:migrate           # prisma migrate dev
npm run db:migrate:deploy    # CI / prod
npm run db:seed              # lookup tables + doctors
npm run db:studio            # Prisma Studio
```

`DATABASE_URL`, all `MEDPLUM_*`, all `R2_*`, and `EHR_MALWARE_SCAN_BACKEND` must be present in `.env.local`. See [`.claude/CLAUDE.md`](.claude/CLAUDE.md) for the full env matrix and [`docs/DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md) for the per-environment matrix and secrets rotation.

> ⚠️ Local development points at a **shared production Postgres** in some setups — confirm your `DATABASE_URL` before running migrations.

---

## Documentation

Everything long-form lives in [`docs/`](docs/). **Start at [`docs/README.md`](docs/README.md)** — it routes you (owner, engineer, hospital partner, auditor, clinician) to the right document.

Highlights:
- [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — canonical engineering reference (stack, routes, schema, conventions, pitfalls)
- [`docs/EHR_SYSTEM_BLUEPRINT.md`](docs/EHR_SYSTEM_BLUEPRINT.md) — canonical system design of record
- [`docs/EHR_ROLE_MATRIX.md`](docs/EHR_ROLE_MATRIX.md) — RBAC + clinical workflows + regulatory overlay
- [`docs/FHIR_CATALOG.md`](docs/FHIR_CATALOG.md) — Medplum resource catalog
- [`docs/SECURITY_ARCHITECTURE.md`](docs/SECURITY_ARCHITECTURE.md) + [`docs/HIPAA_COMPLIANCE.md`](docs/HIPAA_COMPLIANCE.md) — security + compliance posture
- [`docs/CTO_STRATEGY.md`](docs/CTO_STRATEGY.md) — long-term strategy · [`docs/EHR_NOW.md`](docs/EHR_NOW.md) — current sprint plan

---

## Security & PHI

This platform handles protected health information. When contributing:

- **Never** log PHI, secrets, payment payloads, JWTs, or signed URLs.
- **Never** hard-delete clinical data — soft-delete only (`Patient.deletedAt`; FHIR → `entered-in-error`).
- Every clinical write passes a discipline + license check; every visit state change goes through a transition helper; every restricted-data override flows through an approval token — **these are not optional.**
- Read [`docs/SECURITY_ARCHITECTURE.md`](docs/SECURITY_ARCHITECTURE.md) and the "Critical pitfalls" section of [`.claude/CLAUDE.md`](.claude/CLAUDE.md) before touching PHI-adjacent code.

To report a security concern, contact the lead engineer directly — do not open a public issue.

---

## License

Private and proprietary. © Anees Health. All rights reserved. Not licensed for redistribution.
