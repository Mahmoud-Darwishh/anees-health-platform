# GitHub Copilot — Instructions for the Anees Health Platform

> **Audience:** GitHub Copilot (and other AI coding tools using this repo's `.github/` context).
> **For the full engineering reference, read [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).** Everything below is rules-only; the architecture, route map, schema, and pitfalls live in that file.

You are contributing to a **production-grade, bilingual (EN/AR) health-tech platform** built with **Next.js 16 App Router, React 19, TypeScript strict mode, Postgres + Prisma, and Medplum (FHIR) as the clinical source of truth**. Target region: MENA, starting Egypt. The platform handles PHI; **security, audit, accessibility, and i18n are non-negotiable**.

Your output must reflect a senior engineer building a regulated, long-lived medical platform.

---

## Read these first (in this order)

1. [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — canonical engineering reference (stack, architecture, route map, schema, pitfalls).
2. [`docs/EHR_ROLE_MATRIX.md`](../docs/EHR_ROLE_MATRIX.md) — RBAC + clinical workflows + regulatory overlay.
3. [`docs/FHIR_CATALOG.md`](../docs/FHIR_CATALOG.md) — Medplum resource catalog.
4. [`docs/SECURITY_ARCHITECTURE.md`](../docs/SECURITY_ARCHITECTURE.md) — defense-in-depth + PHI handling.
5. The relevant feature module under `src/features/<domain>/` before adding anything similar.

If your suggestion would contradict any of the above, do not make the suggestion.

---

## Hard rules (do these, every time)

1. **Imports use `@/*` → `src/*`.** Never `../../` across folders.
2. **DB access goes through `import { prisma } from '@/lib/db/prisma'`.** Never `new PrismaClient()`.
3. **Medplum access goes through `getMedplumClient()`** in `src/lib/medplum/client.ts`. Prefer module-scoped helpers (e.g. `listPatientEncounters`).
4. **R2 access goes through `src/lib/storage/r2-medical.ts`.** Never construct an S3 client directly. Keys via `buildObjectKey`; filenames via `sanitizeFilename`.
5. **Server-first by default.** Add `'use client'` only when a component needs interactivity.
6. **Server actions for EHR writes**, not API routes. Follow `src/features/ehr/admin-patient/actions.ts` shape.
7. **Zod-parse every server-action input and every API JSON body.** Never trust `formData.get()` directly into a DB call.
8. **Tenant-scope every query** on `Patient`, `Provider`, `Visit`, `CarePlan`, `Invoice`, `OnlineBooking`, `Staff`, `Coverage`, `PriorAuth`, `Claim`, `ControlledSubstanceLedger`. Default tenant is `"platform"`.
9. **Every clinical write checks `canSignClinical(staff, discipline)`** for license validity.
10. **Every visit state change goes through a transition helper** that writes `VisitStateTransition`. Direct `Visit.update({ state })` is forbidden.
11. **Every restricted-data override flows through `DestructiveApprovalToken`** and emits `AuditLog.action = 'override'`.
12. **Audit every mutation.** Clinical writes mirror via `writeMedplumAuditMirror`. Postgres-only mutations call `prisma.auditLog.create(...)` explicitly — leave `// TODO(audit)` only when a centralised extension is genuinely planned.
13. **Rate-limit every mutation route** via `checkRateLimit(key, max, windowMs)`, keyed by `getClientIp(request)`.
14. **CORS on every API response** via `resolveCorsHeaders` from `@/lib/utils/cors`.

---

## Hard rules (don't do these, ever)

1. **Never log PHI** — names, addresses, phones, emails, medical content, payment payloads, JWTs, signed URLs, secrets.
2. **Never hardcode user-facing strings.** Public surface uses `next-intl` (`messages/en.json` + `messages/ar.json`). Admin + clinician surfaces are English-only.
3. **Never use `@import` in SCSS.** `@use` only.
4. **Never hard-delete clinical data.** Soft delete via `Patient.deletedAt`; FHIR resources move to `entered-in-error`.
5. **Never add tests, dependencies, or refactors that weren't requested.**
6. **Never silently delete dead code you find.** Flag it.
7. **Never expose secrets client-side.** No `NEXT_PUBLIC_*` for anything sensitive.
8. **Never trust a `patientId` from the client.** Patient-record reads must go through `getOwnPatientRecord()` (session-resolved).
9. **Never bypass the malware-scan verdict.** Medical files only become serveable after `clean`.
10. **Never put Arabic / Hebrew / RTL text in admin or clinician code.** Those surfaces are English-only.

---

## When in doubt

- **Surface-specific guidance:**
  - Public site → `src/app/[locale]/` — bilingual, `next-intl`, SCSS modules + tokens.
  - Patient portal → `src/app/[locale]/portal/` — bilingual, consent-gated for caregivers.
  - Admin / ops → `src/app/admin/` — English-only, NextAuth + RBAC, Bootstrap shell.
  - Clinician → `src/app/clinician/` — English-only, mobile-first, license-gated.
- **Feature module shape:** `features/<domain>/{components, actions.ts, data.ts, schemas/, helpers.tsx, types.ts}`.
- **For RBAC:** call `getStaffUser([roles])` at the entry of every server action / page.
- **For navigation visibility:** consult `src/lib/auth/admin-nav-policy.ts` — single source of truth.

---

## Conventions cheatsheet

| What | Where |
|---|---|
| Server logs | `@/lib/utils/app-logger` only |
| Rate limit | `@/lib/utils/rate-limit` |
| CORS | `@/lib/utils/cors` |
| Geofence policy | `@/lib/geo/presence-policy` |
| Nursing thresholds | `@/lib/config/nursing-ops-policy` + `@/lib/ehr/nursing-alerts` |
| Billing engines | `@/lib/billing/{cancellation-policy, physio-pay-policy}` |
| Malware scanner | `@/lib/security/malware-scan` |
| R2 storage | `@/lib/storage/r2-medical` |
| FHIR helpers | `@/lib/medplum/*` |
| Auth helpers | `@/lib/auth/*` |

---

## Quick start

```bash
npm run dev                  # http://localhost:3000/en
npm run build                # prisma generate + next build
npm run lint
npx tsc --noEmit
npm run db:generate          # after schema edits
npm run db:migrate           # prisma migrate dev
npm run db:migrate:deploy    # CI / prod
npm run db:migrate:status
npm run db:seed
npm run db:studio
```

`DATABASE_URL`, all `MEDPLUM_*`, all `R2_*`, and `EHR_MALWARE_SCAN_BACKEND` must be present in `.env.local`. See [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) for the full env matrix and [`docs/DEPLOYMENT_RUNBOOK.md`](../docs/DEPLOYMENT_RUNBOOK.md) for the per-environment matrix.

---

**For anything not covered here, defer to [`.claude/CLAUDE.md`](../.claude/CLAUDE.md). If that's silent too, ask.**
