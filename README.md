# Anees Health Platform

> Production-grade bilingual (EN/AR) home-care platform serving Egypt today, planned for MENA expansion. FHIR-native clinical layer (Medplum), Postgres operational core, Next.js + TypeScript application surface.
>
> **Last refresh:** 2026-06-05.

---

## In one paragraph

Anees lets patients book a doctor, nurse, or physiotherapist visit to their home, pays Egyptian clinicians a fair share, gives the medical team an EHR built around the FHIR standard, gives the back-office an ops console, gives partner hospitals a referral surface (in flight), and is designed from day one to satisfy Egypt's data-protection law and the HIPAA-style requirements that future hospital partners and insurers will demand. The platform runs on a self-hosted regional VPS today (Hostinger → OVH Bahrain in flight), uses Cloudflare R2 + malware scanning for medical files, and audits every clinical action.

---

## Who this is for

| You are… | Open this |
|---|---|
| The **owner**, reading this for the first time | this README, then [docs/HIPAA_COMPLIANCE.md](docs/HIPAA_COMPLIANCE.md) (owner action list at the top), then [docs/CTO_STRATEGY.md](docs/CTO_STRATEGY.md) |
| A **new engineer** | [.claude/CLAUDE.md](.claude/CLAUDE.md) (engineering reference) |
| A **hospital partner / procurement** | [docs/HIPAA_COMPLIANCE.md](docs/HIPAA_COMPLIANCE.md) + [docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md) + [docs/FHIR_CATALOG.md](docs/FHIR_CATALOG.md) |
| An **investor / advisor** | [docs/CTO_STRATEGY.md](docs/CTO_STRATEGY.md) + [docs/EHR_NOW.md](docs/EHR_NOW.md) |
| A **clinical / compliance lead** | [docs/EHR_ROLE_MATRIX.md](docs/EHR_ROLE_MATRIX.md) + [docs/HIPAA_COMPLIANCE.md](docs/HIPAA_COMPLIANCE.md) |
| A **physiotherapist** | [docs/EHR_PHYSIO_SPEC.md](docs/EHR_PHYSIO_SPEC.md) |

A guided tour of all docs lives in [docs/README.md](docs/README.md).

---

## What's live today

| Surface | Where | Status |
|---|---|---|
| Public marketing site (EN/AR) | `/[locale]/...` | ✅ Live |
| Online booking + Kashier payments | `/[locale]/booking` → `/api/bookings/*` | ✅ Live (Egypt only) |
| WhatsApp OTP (Wapilot) | `/api/auth/otp/whatsapp/*` | ✅ Live |
| Patient portal (bilingual, consent-gated) | `/[locale]/portal?tab=...` | ✅ Live, 8-tab workspace |
| Admin EHR + patient detail (30+ server actions) | `/admin/patients/[id]` | ✅ Live |
| Nursing dashboard + escalations | `/admin/nursing/dashboard`, `/admin/escalations` | ✅ Live |
| Clinician workspace (physiotherapy pilot) | `/clinician/today, /patients, /visits, /tasks, /earnings, /profile` | ✅ Live |
| Admin ops + insurance + compliance dashboards | `/admin/ops, /admin/insurance, /admin/compliance` | 🟡 Skeletons live; depth incoming |
| FHIR clinical layer (Medplum, 24 modules) | `src/lib/medplum/*` | ✅ Live |
| Medical-file storage (R2 + DocumentReference + Binary) | `src/lib/storage/r2-medical.ts` | ✅ Live |
| Malware scanning (background job) | `/api/internal/ehr/documents/scan` | ✅ Live (mock backend in dev — production engine selection pending) |
| Multi-tenancy foundations (Phase 1A) | `Tenant` model + `tenantId` columns | ✅ Foundations only |
| PWA + VAPID push | `/[locale]/settings/pwa`, `/api/pwa/*` | ✅ Live |
| Sentry / log aggregator | — | ❌ Planned (Sprint 5) |
| Tests (Vitest / Playwright) | — | ❌ None yet |
| Hospital partner portal | — | ❌ Planned (Sprint 3) |
| Telemedicine (Daily.co) | — | ❌ Planned (Sprint 4) |
| Mobile app (Expo / React Native) | — | ❌ Planned (Phase 2) |

---

## Stack at a glance

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack dev) |
| Language | **TypeScript 5** strict |
| i18n | **next-intl** 4.6 — `en` + `ar` (public + portal); admin + clinician are English-only |
| Operational DB | **Postgres + Prisma 5.22** — 9 migrations applied |
| Clinical DB | **Medplum (FHIR)**, self-hosted — 24 modules |
| Auth | **NextAuth v5** + Prisma adapter + JWT — Google + patient creds + staff creds + WhatsApp OTP + login/logout audit |
| Medical files | **Cloudflare R2** (S3-compatible) + FHIR `DocumentReference`/`Binary` + malware scanning |
| Payments | **Kashier** (test + live, Egypt) |
| Styling | SCSS modules + design tokens + Bootstrap on admin/portal/clinician shells |
| PWA | `@ducanh2912/next-pwa` + custom worker |
| Validation | **Zod 4.4** |
| Hosting | Hostinger VPS today → **OVH Bahrain** in flight |

Full detail and the schema overview is in [.claude/CLAUDE.md](.claude/CLAUDE.md).

---

## Where things are

```
.claude/CLAUDE.md          # Engineering reference (read first if you write code)
.github/copilot-instructions.md  # AI tooling rules (read if you write code through Copilot)

docs/                      # All long-form documents (see docs/README.md for the map)
  ├── README.md            # Doc-set guided tour
  ├── CTO_STRATEGY.md      # 3-year plan + phases + decision log
  ├── EHR_NOW.md           # Current-quarter sprint plan
  ├── EHR_ROLE_MATRIX.md   # RBAC + clinical workflows
  ├── EHR_PHYSIO_SPEC.md   # Physiotherapist workspace spec
  ├── FHIR_CATALOG.md      # Medplum resource catalog
  ├── HIPAA_COMPLIANCE.md  # HIPAA + Egypt DPL control map
  ├── SECURITY_ARCHITECTURE.md  # Defense-in-depth
  ├── DEPLOYMENT_RUNBOOK.md     # Infra + secrets + IR
  └── SEO_GEO_STATUS.md    # SEO / GEO snapshot

prisma/
  ├── schema.prisma        # Source of truth for the DB
  ├── migrations/          # 9 applied migrations
  └── seed.ts

src/
  ├── auth.ts              # NextAuth v5
  ├── app/
  │   ├── [locale]/...     # Public site + patient portal (bilingual)
  │   ├── admin/...        # Staff EHR + ops + insurance + compliance
  │   ├── clinician/...    # Discipline-scoped clinician workspace (physio pilot)
  │   └── api/...          # API routes (auth, bookings, ehr, internal, medplum, pwa)
  ├── features/            # Feature modules (admin-patient, clinician-physio, etc.)
  ├── components/          # Shared, app-wide UI only
  └── lib/                 # Cross-cutting libs (medplum, auth, billing, security, storage, ...)
```

---

## Local development

```bash
nvm use 22                   # Node 22
npm ci
cp .env.example .env.local   # then fill in real values (see [.claude/CLAUDE.md](.claude/CLAUDE.md) for the matrix)

npm run dev                  # http://localhost:3000/en  (and /ar)
npm run build                # prisma generate + next build
npm run lint                 # ESLint
npx tsc --noEmit             # Type check

# Database
npm run db:generate          # after schema.prisma edits
npm run db:migrate           # prisma migrate dev
npm run db:migrate:deploy    # CI / prod
npm run db:migrate:status
npm run db:seed
npm run db:studio
```

Required env vars (full list in [.claude/CLAUDE.md](.claude/CLAUDE.md) and [docs/DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md)):
- `DATABASE_URL`
- `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`
- `MEDPLUM_BASE_URL`, `MEDPLUM_CLIENT_ID/SECRET`
- `WAPILOT_*` (WhatsApp OTP)
- `KASHIER_*` (payments — Egypt local)
- `R2_*` (Cloudflare R2 medical-file storage)
- `EHR_MALWARE_SCAN_BACKEND` (`mock_clean` in dev, `http` in prod) + `EHR_MALWARE_SCAN_HTTP_*`
- `CRON_SECRET`, `EHR_SCAN_KEY` (internal API auth)
- `HASH_SALT`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`

To log in locally as staff: create a `User` + `Staff` row with a bcrypt password hash, then visit `/en/auth/login`. For the clinician workspace, also create a `PhysioProfile` linked to that staff.

---

## Security & compliance posture (short version)

- Clinical data lives in **Medplum (FHIR)**. Operational + financial data in **Postgres**. Medical-file bytes in **Cloudflare R2**. Three layers, three concerns.
- **Every clinical write is audited.** FHIR `AuditEvent` + Postgres `AuditLog` row, in lock step.
- **Every medical file is malware-scanned.** Files that have not reached `clean` cannot be served.
- **Every PHI read is RBAC + case-scope + consent-checked.** Caregivers have zero default access — every scope is a FHIR `Consent`.
- **Break-glass overrides** flow through `DestructiveApprovalToken` and produce `AuditLog.action = 'override'` rows. Reviewed weekly via `/admin/compliance`.
- **Multi-tenancy** is in the schema as `Tenant` + `tenantId` columns; today everything sits in the `"platform"` tenant.
- We design **to** HIPAA principles. We are not formally HIPAA-certified — see [docs/HIPAA_COMPLIANCE.md](docs/HIPAA_COMPLIANCE.md) for the full control map and gap list.
- We operate under **Egypt DPL 151/2020** today.

---

## What to do exactly (for the owner)

These are the actions only you can take. Each is doable in a week or less. The full version, with reasons and links, is in [docs/HIPAA_COMPLIANCE.md](docs/HIPAA_COMPLIANCE.md).

### This week

1. **Sign the Medplum BAA.** Without it, Medplum is DPA-only — fine for Egypt today, blocking for any US patient ever.
2. **Request quotes from OVH Bahrain** — bare-metal app host, managed Postgres, dedicated Medplum host. Plan from [docs/DEPLOYMENT_RUNBOOK.md §3](docs/DEPLOYMENT_RUNBOOK.md).
3. **Brief the medical director on break-glass.** Show them `/admin/compliance` and `DestructiveApprovalToken`. Agree on who approves and the SLA.
4. **Appoint a Privacy Officer + Security Officer** (you can hold both initially, but the names must appear in writing).

### This month

5. **Engage an Egyptian law firm** specialising in DPL 151/2020 — DPA templates, privacy-policy review, consent-form review.
6. **Commission a pen test** before hospital go-live (local Egyptian firm or international healthcare specialist, USD 8–25k).
7. **Decide on the production malware scanner** (ClamAV self-hosted, Cloudflare Email Security, Bitdefender, etc.).
8. **Approve the observability budget** (Sentry web + server + log retention — ~USD 50–250/mo).

### Next quarter (engineering does, you approve)

9. Multi-tenant query-level enforcement (Postgres row-level security).
10. Sentry + log aggregator wired ([docs/EHR_NOW.md](docs/EHR_NOW.md) Sprint 5).
11. Automated dependency scanning + SAST in CI.
12. Encrypted backups with off-site retention.
13. Incident-response tabletop with the medical director + lead engineer.

### Outside help

| Need | Who | When |
|---|---|---|
| BAA / DPA templates | Egyptian law firm | This month |
| Pen test | Security firm | Before hospital go-live |
| HIPAA-readiness assessment | US/EU healthcare specialist | Pre-MENA expansion |
| Cyber-liability insurance | Insurance broker | Before hospital go-live |
| Egypt DPL registration | DPO + law firm | This quarter |

---

## Engineering "what to do" (next 12 weeks)

Pulled from [docs/EHR_NOW.md](docs/EHR_NOW.md). Sequencing matters; the migration gates everything.

1. **Sprint 0 (in flight):** finish the Hostinger → OVH migration. Stand up staging + prod on the new infra. Verify smoke tests.
2. **Sprint 1:** close the Postgres audit gap on operational tables (login + logout already done); move secrets to a managed store.
3. **Sprint 2:** tenant-scope every Prisma query through a helper; clinician portal hardening (audit writes, Prisma over raw SQL, end-of-day card, map view); R2 lifecycle policies + real malware-scan backend.
4. **Sprint 3:** hospital partner portal MVP at `/hospital/[tenantCode]/*` — login, referrals, discharge summaries, audit view.
5. **Sprint 4:** telemedicine via Daily.co — room creation, signed join tokens, Encounter wiring, CSP update.
6. **Sprint 5:** observability — Sentry + log aggregator + status page. Compliance pack. DR drill.
7. **Sprint 6:** insurance integration spike (Egypt UPA), pen test, second hospital LOI.

---

## Contributing

- Read [.claude/CLAUDE.md](.claude/CLAUDE.md) before opening a PR — every convention and pitfall is in there.
- Read the relevant feature module before adding similar code (`src/features/<domain>/`).
- Tenant-scope every query on tenant-aware tables. License-check every clinical write. Audit every mutation. Sanitise every R2 key.
- Never log PHI. Never hardcode user-facing strings. Never hard-delete clinical data.
- Don't add tests, deps, or refactors that weren't asked for. Flag dead code — don't silently delete.

---

## License

Proprietary. © Anees Health. All rights reserved.

---

## See also

- [docs/](docs/) — every long-form document
- [.claude/CLAUDE.md](.claude/CLAUDE.md) — engineering reference (read first)
- [prisma/schema.prisma](prisma/schema.prisma) — schema source of truth
- [src/lib/medplum/](src/lib/medplum/) — 24 FHIR modules
