# Enterprise Audit — Anees Health Platform

> **Date:** 2026-06-20 · **Method:** Code-grounded audit (16 dimensions, multi-agent fan-out reading the actual repository, then adversarially fact-checked). Where this audit and the other docs disagree, **trust this audit — it was traced to source files.**
> **Companion docs:** [EHR_AUDIT.md](./EHR_AUDIT.md) (clinical-core gap register), [PRODUCT_LAUNCH_AUDIT_2026-06-19.md](./PRODUCT_LAUNCH_AUDIT_2026-06-19.md) (business/product), [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md), [HIPAA_COMPLIANCE.md](./HIPAA_COMPLIANCE.md), [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md).

---

## 0. Verdict

**Overall readiness: 54 / 100.** A genuinely impressive solo/small-team build with senior-grade instincts — a coherent Next.js 16 + React 19 + strict-TypeScript codebase, a real FHIR clinical core (Medplum), a thoughtful layered RBAC matrix, bilingual EN/AR public site, a 22-state visit machine, and **three working field-clinician workspaces** (physiotherapy, nursing, doctor — more than the docs claim). It is **not yet enterprise-grade for multi-country, regulated, hospital-scale healthcare.** The gap is concentrated in **infrastructure resilience, security/compliance governance, and testing/observability** — all addressable, none yet started.

### Load-bearing "done" claims that are false in code

An investor or hospital doing diligence will find these, so they are listed first:

| Documented as done | Reality in the code |
|---|---|
| Multi-tenant isolation client | `tenant-prisma.ts` is fully built but has **zero importers** — scoping is 100% manual per query. |
| GPS breadcrumb tracking | `VisitLocationPing` has **zero code references** — never written/read. |
| On-arrival identity/safety verification | `identityConfirmed` / `consentReaffirmed` / `safetyClearance` columns are **never written**. |
| Signed-URL R2 medical-file delivery | Not implemented — PHI bytes **proxy through the app server**. |
| Provider payouts | `ProviderPayout` table is **never written** — earnings computed live, no settlement record. |
| Insurance & claims | A **read-only dashboard** — no eligibility/claim/adjudication logic exists. |
| "39 unit tests" gating safety logic | 42 tests exist, but **CI never ran them** (fixed in this audit's quick-wins). |
| Sentry observability | `src/instrumentation.ts` **exists and is correct** (a synthesis pass wrongly called it missing — verified false); it is simply **inert until `SENTRY_DSN` is set**. |

---

## 1. Scorecard

| # | Dimension | Score | |  # | Dimension | Score |
|---|---|---|---|---|---|---|
| 1 | Code Quality | **76** | | 9 | GEO (AI discoverability) | **61** |
| 2 | Architecture | **68** | | 10 | Product & Business Logic | **58** |
| 3 | Information Architecture / Nav | **68** | | 11 | Home Care Operations | **52** |
| 4 | SEO | **62** | | 12 | Compliance & Governance | **52** |
| 5 | Security & HIPAA (tech) | **62** | | 13 | Engineering Practices | **38** |
| 6 | Technology Stack | **62** | | 14 | Scalability & Infrastructure | **34** |
| 7 | Clinical & EHR Completeness | **61** | | 15 | Analytics & Reporting | **34** |
| 8 | User Journeys & UX | **61** | | 16 | AI & Future Readiness | **34** |

### Department view (risk-weighted)

| Department | Score | One-line |
|---|---|---|
| Clinical | 61 | Real coded FHIR core; missing immunizations, surgical/family history, e-prescribing, real DDI data. |
| User Experience | 61 | Polished bilingual UI; no admin patient search, read-only portal, no offline field path. |
| SEO | 62 | Strong foundation; sitemap points crawlers at non-existent pages (mass 404s). |
| GEO | 60 | Good schema scaffolding, thin citable content, orphaned service/specialty subsystem. |
| Product | 58 | Excellent booking→visit spine; insurance/claims + payouts non-functional. |
| Engineering | 52 | Clean code, but tests never ran in CI, no PR review, copy-paste security drift. |
| Operations | 52 | Solid visit execution; no offline, no GPS trail, no route optimization, no lead pipeline. |
| Security | 52 | Good app-layer RBAC; no data-tier control, servable un-scanned files, fail-open limiter, plaintext secrets. |
| Compliance | 48 | No signed BAAs/DPAs, tamper-able audit log, no breach drill/pen-test, no DSAR export. |
| Infrastructure | 34 | One VPS running app+DB+Medplum: SPOF with untested DR. |

---

## 2. Critical blockers (P0 — before any hospital go-live)

1. **Single-VPS SPOF.** App + Postgres + Medplum co-located on one Hostinger box; backups are nightly `pg_dump` (24h RPO), restore never drilled.
2. **No data-tier access control.** App talks to Medplum as one superuser; all RBAC is app-layer only — one missed guard = full PHI breach with no backstop.
3. **Tests never gated.** CI ran lint/typecheck/build but not `npm test`; zero integration/webhook/auth/E2E coverage. *(Quick-win: `test` job added — see §7.)*
4. **No signed BAAs/DPAs** with Medplum, Cloudflare, or host — a hard legal blocker (HIPAA + Egypt DPL) and procurement non-starter.
5. **Un-scanned files servable.** Documents defaulted to `clean`/`pending` and the serving gate only blocked `infected`/`scan_failed`. *(Quick-win: fail-closed serving + scan-on-upload — see §7.)*
6. **Tenant isolation unenforced** — `tenant-prisma` has zero importers; cross-tenant leak one query away.
7. **Observability inert** — Sentry wired but switched off; ops is SSH + pm2 logs.
8. **Audit log tamper-able** — append-only by convention only (no WORM/hash-chain), with coverage gaps.
9. **No caching/queue; clinical data truncates silently** — capped single-shot Medplum reads can drop allergies/meds off the chart (a safety bug).
10. **Insurance/claims + provider payouts are non-functional shells.**
11. **No offline mode + unenforced on-site verification** for field clinicians in low-signal homes.
12. **Sitemap advertised non-existent `/services` and `/specialties`** (mass 404s) + broken doctor-profile links. *(Quick-win: removed — see §7.)*

---

## 3. Findings by dimension (high-signal)

**Architecture (68):** disciplined feature-module monolith (correct at this scale), no surviving god-files, sound transactional visit state machine. *Fix:* single Medplum superuser, no event bus/queue, Medplum reads capped single-shot (silent truncation), tenant client unused, doctor/nurse couple to the `clinician-physio` namespace.

**Code Quality (76):** near-perfect `@/*` hygiene, excellent type safety (3 `any` in all of `src`), healthy decomposition. *Fix:* three clinician disciplines are copy-pasted not abstracted — and that duplication **already caused a security divergence** (doctor strips client `encounterId`, nurse copy doesn't).

**Engineering Practices (38):** 42 well-designed unit tests that CI didn't run; zero integration/E2E; **no PR/review process** (160 commits, one placeholder author, direct-to-master); guards exist but weren't in CI. Documentation is the standout strength.

**Security & HIPAA (62/52):** strong — fixed task IDOR, dual-store audit, constant-time webhook HMAC, defense-in-depth document route, thorough CSP. *Fix:* Medplum superuser, servable un-scanned PHI, **fail-open rate limiter** (`rate-limit.ts:63-68`), plaintext secrets on the PHI host, non-constant-time internal-scan key compare.

**Scalability & Infrastructure (34):** mature, well-indexed schema; otherwise early-MVP — single VPS, no cache/queue, no pagination, SSH build-on-prod, dev `DATABASE_URL` → **shared prod Postgres**, unbounded `AuditLog`/`VisitLocationPing`.

**Product & Business Logic (58):** booking→payment→visit→lifecycle→refund spine is production-grade. *Fix:* insurance read-only, dead `ProviderPayout`, package bookings create only one visit, **webhook never reconciles charged amount**, cancellation fee overloads the `discount` field, no per-customer promo cap.

**Clinical & EHR (61):** real coded FHIR (conditions, labs, vitals, 6 validated instruments, wired med-safety gate, signed notes w/ Provenance). *Fix:* no immunizations / procedures / family / social history, **no e-prescribing** (free-text meds bypass the safety screen), DDI is a **19-rule hardcoded placeholder**, no PHQ-9/CAM/Barthel, no OT/speech/dietitian docs, free-text notes (not SOAP), unsigned nursing/physio reports.

**Home Care Operations (52):** strong audited visit machine, real geofenced check-in/out, three live disciplines. *Fix:* identity/safety verification unenforced, **no offline mode**, **no lead/CRM** and paid-booking-with-no-patient **silently no-ops**, no GPS trail, no route optimization, no double-booking guard, one-shot staff-only messaging.

**User Journeys & UX (61):** strong field "My Journey", first-class disruption paths. *Fix:* **admin patient directory has no search/pagination** (loads all, filters client-side), no staff intake UI, booking takes payment before address/coverage, **read-only portal**, doctors bounced to desktop to prescribe, uneven discipline parity.

**Information Architecture (68):** single deny-by-default route policy drives gate + nav. *Fix:* flat 11-item top bar, **no global patient search**, cross-surface terminology drift, portal tab labels wired to **mismatched i18n keys**, stale "physio-only" copy.

**SEO (62):** DRY metadata, correct bilingual hreflang, rich valid JSON-LD, AI-crawler robots. *Fix:* sitemap + doctor links → **non-existent `/services` `/specialties`** (404s), thin content surface, **no Search Console/analytics**, duplicate sitemaps. *(404 routes fixed — §7.)*

**GEO (61):** cross-linked entity graph, 20+ AI crawlers allow-listed, real FAQ content. *Fix:* entire service/specialty subsystem **built but orphaned**, Physician schema **omits `aggregateRating`/`review`**, thin citable prose, no `llms.txt`, fabricated `SEO_GEO_STATUS.md`.

**Analytics & Reporting (34):** six real dashboards but **no BI/warehouse/ETL** — live aggregate queries per request; no charting library; revenue-only point-in-time exec reporting; no clinical-outcome reporting; one export in the whole app; the avg-rating KPI is **structurally dead** (`Visit.patientRating` never written).

**Compliance & Governance (52):** dual-store audit, full break-glass workflow, consent-gated caregiver access. *Fix:* **no signed BAAs/DPAs**, tamper-able audit log, false signed-URL claim, no breach drill/pen-test/SOC2/DPO, compliance dashboard audit query **has no tenant filter**, no DSAR export, no MFA.

**Technology Stack (62):** sound modern choices; FHIR-native is a real differentiator. *Fix:* single VPS, no Redis/queue/search, inert observability, **two bleeding-edge deps in critical paths** (NextAuth `5.0.0-beta.31`, Next `^16.1`), no dependency/supply-chain scanning in CI.

**AI & Future Readiness (34):** zero AI runtime, but genuinely ML-ready data. *Blocking prerequisite:* a PHI-to-LLM governance layer (de-id, model-provider BAA, audit hook). *Highest-ROI first move:* operational optimization (no-show prediction + route/assignment) — works on operational data, sidesteps clinical liability.

---

## 4. Consolidated gap analysis (top items)

| # | Problem | Risk | Fix | Priority | Effort |
|---|---|---|---|---|---|
| 1 | Single-VPS SPOF, untested DR | Critical | Split tiers (managed PG+PITR, isolated Medplum, LB'd app); drill restore | P0 | High |
| 2 | Medplum single superuser | Critical | AccessPolicies / per-user scoping; central guarded gateway | P0 | High |
| 3 | Tests/guards never in CI | Critical | `test` job + required checks | P0 | Low |
| 4 | No BAAs/DPAs | Critical | Execute Anees-specific DPAs; name a DPO | P0 | Med (lead time) |
| 5 | Un-scanned docs servable | High | Fail-closed serving + scan-on-upload | P0 | Med |
| 6 | Rate limiter fails open | High | Fail closed for auth; move to Redis | P1 | Med |
| 7 | Tenant client unused | High | Adopt `$extends` client + CI guard | P1 | Med |
| 8 | Observability inert | High | Set Sentry DSN + alerting | P1 | Low |
| 9 | Audit log not tamper-evident | High | Hash-chain / append-only trigger | P1 | Med |
| 10 | Silent Medplum truncation | High | Cursor pagination + read cache | P1 | Med |
| 11 | Insurance/payouts non-functional | High | Claim + payout settlement workflows | P1 | High |
| 12 | Admin list no search/pagination | High | Server-side search + paging | P1 | Med |
| 13 | Webhook no amount reconciliation | Med | Compare gateway amount to booked price | P1 | Low |
| 14 | Sitemap/links → 404 routes | High (SEO) | Remove or ship the pages | P1 | Low |
| 15 | Copy-paste clinician security drift | High | Extract `clinician-shared`; backport `encounterId` strip | P1 | Med |

---

## 5. Master missing-features list

**Clinical:** immunizations · procedure/surgical history · family history · coded social history · e-prescribing (MedicationRequest + structured dose) · licensed DDI DB · dose-range/renal/pediatric/Beers checks · PHQ-9/GDS · CAM · Barthel/Katz · OT/speech/dietitian/RT docs · wound staging · structured SOAP · sign lifecycle for nursing/physio reports · trainee co-sign · imaging orders · care-gap/disease-management/risk engine · multiple emergency contacts/proxy · critical-value closed-loop alerting.

**Operations:** offline-first capture · GPS breadcrumb tracking · on-site identity/safety verification · route optimization · capacity/utilization planning · referral/lead CRM · auto-recovery for unmatched paid bookings · double-booking guard · threaded real-time + family messaging · staff intake UI · map dispatch.

**Patient:** transactional portal (reschedule/cancel, messaging, consent self-service, upload) · booking slot + address/coverage gate · in-app clinician notifications.

**Revenue:** insurance eligibility + claim lifecycle + adjudication · payout settlement ledger · program-entitlement tracking · gateway amount reconciliation · per-customer promo caps · claims analytics.

**Platform/security:** Redis cache + job queue · cursor pagination · search engine · containers/IaC · secrets vault + rotation · tamper-evident audit · MFA + idle timeout · field-level encryption · partitioning/retention · DSAR export · dependency/supply-chain scanning · SMS/email OTP fallback (remove single-vendor Wapilot dependency) · WCAG pass.

**Analytics/AI:** BI warehouse/replica · time-series + profitability reporting · clinical-quality dashboards · report export everywhere · AI inference gateway + PHI de-id + eval/guardrails · ambient scribing · visit summarization · no-show/falls/readmission models · scheduling/route optimization.

**Committed but unbuilt:** telemedicine (Daily.co) · hospital-partner portal (MOU signed).

---

## 6. 12-month roadmap

**Phase 1 — 0–30 days:** wire tests + guards into CI ✓ · fail-closed malware serving ✓ · fail-closed auth rate limiting ✓ · activate Sentry (set DSN) · start BAA/DPA + name DPO · admin patient search/pagination · remove 404 sitemap routes ✓.

**Phase 2 — 30–90 days:** managed Postgres + PITR in a second AZ + real restore drill · Medplum AccessPolicies · **tenant scoping enforced on flagged queries + `lint:tenant` CI gate ✓** (full `tenant-prisma` `$extends` adoption still pending) · **tamper-evident audit hash-chain ✓** (DB-level WORM/serialization still pending) · **cursor/offset pagination on safety-critical reads ✓** (Redis cache + observations/labs paging still pending) · **route integration-test harness ✓** (DB-backed tier + broader coverage still pending) · offline field mode · **webhook amount reconciliation ✓**. (See §8.)

**Phase 3 — 3–6 months:** Docker + Terraform + blue-green · durable job queue + outbox · extract `clinician-shared` · e-prescribing + immunizations/procedures/family/social history · licensed DDI DB · insurance claims + payout settlement · ship `/services` `/specialties` + geo landing pages · PHQ-9/CAM/Barthel · pen-test + SOC2/ISO gap assessment.

**Phase 4 — 6–12 months:** BI replica/warehouse + clinical-outcome reporting · PHI de-id + AI governance gateway · AI scribing + summarization · scheduling/route/no-show optimization · wire GPS tracking + enforce on-site verification · bilingual content engine + `llms.txt` · transactional portal · retention/partitioning + DSAR export.

---

## 7. Phase-1 quick wins implemented (2026-06-20)

Shipped in this audit pass, verified green (`tsc --noEmit`, `vitest` 42 passed, `eslint` 0 errors, `lint:rbac` + `test:security-policy` pass):

1. **CI now gates on tests.** Added a `test` job to `.github/workflows/ci.yml` running `npm run test` (vitest), `lint:rbac`, and `test:security-policy` on every PR/push.
   - `lint:tenant` was **intentionally left out** of CI: it currently fails on pre-existing unscoped queries on master (`staff.update` ×3, `patient.findFirst` ×2, `onlineBooking.update`). Adding it would make every PR red. **These 6 are live evidence of the "tenant scoping unenforced" finding** and must be reviewed/resolved (not silently baselined) before the guard can gate.

2. **Document serving is fail-closed.** `src/app/api/ehr/documents/[documentId]/route.ts` now serves **only** documents with malware status `clean`; a never-scanned `pending` document is blocked (HTTP 409) just like `infected`/`scan_failed` (423).

3. **Documents are scanned at upload time.** `src/lib/medplum/documents.ts#createPatientDocument` now runs `scanMedicalDocument` on the uploaded bytes and records the real verdict (`clean`/`infected`/`scan_failed`) plus engine/signature/scanned-at — instead of hard-coding `clean`. A scanner outage yields `scan_failed` → blocked (fail closed). The background scan job still re-checks on its cadence.

4. **Auth/OTP rate limiting fails closed.** `src/lib/utils/rate-limit.ts#checkRateLimit` gained an opt-in `failClosed` parameter (default `false` = unchanged for non-security funnels). Applied `failClosed: true` to WhatsApp OTP send (IP + recipient), OTP verify, patient password reset, and patient registration — so a DB hiccup can no longer silently disable brute-force/credential-stuffing protection on auth paths.

5. **Sitemap + internal links no longer 404.** Removed the non-existent `/services` and `/specialties` (and their slug loops) from `src/app/sitemap.ts`, and the two broken `RelatedLinks` on every doctor profile (`src/app/[locale]/doctors/[slug]/page.tsx`). Re-add when the landing pages ship.

**Still owner/ops actions (not code):** set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` to activate observability; begin BAA/DPA execution and name a DPO.

---

## 8. Phase-2 progress implemented (2026-06-20)

Two code-tractable Phase-2 items completed and verified green (`tsc --noEmit`, `vitest` **48 passed**, `eslint` 0 errors, `lint:tenant` + `lint:rbac` + `test:security-policy` pass). Infra-dependent Phase-2 items (managed Postgres + PITR, second AZ, Redis, Medplum AccessPolicies server config, offline field mode) remain owner/ops work.

### 8.1 Tenant isolation enforced + `lint:tenant` CI gate enabled

Triaged **all** non-baselined tenant-model queries (the first-turn `tail` had hidden most of them — there were 7 distinct sites, not 2):

- **Scoped (real gaps closed)** — added `tenantId: booking.tenantId` so a shared phone can never resolve a patient in another tenant:
  - `src/lib/billing/create-visit-from-booking.ts` (`patient.findFirst`)
  - `src/lib/billing/portal-invite.ts` (`patient.findFirst`; added `tenantId` to the booking select)
  - `src/app/admin/billing/receipt/[bookingRef]/page.tsx` (`patient.findFirst`)
  - `src/features/admin/billing/actions.ts` (`patient.findFirst`)
  - `src/features/admin/profile-requests/data.ts` (`staff.findMany` — pinned `tenantId`)
  - **Bonus consistency:** scoped the webhook's two `tx.patient.findFirst` lookups (a guard blind spot — `tx.` not `prisma.`).
- **Baselined (reviewed safe-by-construction)** — verify-then-update on a tenant-checked row, or update by a unique key just fetched (same pattern already accepted for `auth.ts`/`practitioners.ts`): `admin/staff/actions.ts:staff.update`, `admin/ops/actions.ts:visit.update`, `admin/billing/actions.ts:onlineBooking.update`, `lib/billing/portal-invite.ts:onlineBooking.update`.
- **`lint:tenant` is now a required CI step** (`.github/workflows/ci.yml`), green at 15 baselined call sites.
- **Verified no regression:** every `tenantId` column is `String @default("platform")` (non-nullable, no `NULL` rows), so the new filters match exactly the same rows in single-tenant mode.

> Known guard limitation (follow-up): the baseline id is file+model+op, not line-level — a *future* unscoped `staff.update` added to an already-baselined file would not be caught. Consider making the guard line-granular. Also: full `tenant-prisma` `$extends` adoption (so scoping is automatic, not per-query) is still the larger Phase-2 goal.

### 8.2 Payment-webhook amount reconciliation

- New pure, unit-tested helper `src/lib/billing/payment-reconciliation.ts` compares the HMAC-signed gateway amount/currency against the booked price. It tolerates gateway unit ambiguity (1× / 100× / 1÷100×) to avoid false-positive floods; **once the live Kashier unit is confirmed, tighten `scaleFactors` to `[1]`** for maximum sensitivity.
- The Kashier webhook (`pay`/SUCCESS) now reconciles before writing the ledger: on any mismatch it **flags + audits** (a `reconciliation` `AuditLog` row), appends a `[REVIEW: …]` marker to the invoice/payment notes, and logs an alert — it never rejects (money was received) and never silently books the expected figure.
- 6 unit tests in `tests/unit/payment-reconciliation.test.ts` (exact match, minor-units, underpayment, currency mismatch, missing amount, float tolerance).

### 8.3 Cursor/offset pagination on safety-critical Medplum reads (silent-truncation fix)

- New `searchAllResources()` helper in `src/lib/medplum/client.ts` paginates a search to completeness (offset-based, with a safety cap). Offset paging is deliberate — it composes with the resilient client proxy that wraps every method and would break a `for await` over an async generator.
- Converted the three readers whose truncation is a **patient-safety** risk to fetch to completeness (cap 1000): `listPatientAllergies`, `listPatientMedications`, `listPatientConditions`. These feed the chart safety header and the medication-safety interaction screen, and entered-in-error rows are filtered *after* the fetch — so a single fixed page could hide active allergies/meds behind corrected ones.
- Still pending: paginating high-volume readers (observations/vitals, labs, tasks) — better served by bounded date windows + a read cache; tracked for the Redis-cache pass.

### 8.4 Tamper-evident audit log (hash-chain)

- Migration `20260620000000_audit_hash_chain` adds nullable `hash` + `prevHash` to `audit_logs` (additive/back-fillable; existing rows unaffected).
- Pure, tested primitives in `src/lib/utils/audit-hash.ts`: `computeAuditHash` (SHA-256 of canonical row content + the prior hash) and `verifyAuditChainRows` (detects in-place edits via hash mismatch, and deletions/reordering via broken `prevHash` links). 6 unit tests.
- Wired into the single audit write path (`writeAuditLog`) **best-effort**: a hashing/read failure can never block the write. Crucially, the columns are written with `?? undefined` so Prisma omits them when absent — making the code **safe to deploy before *or* after the migration** (no deploy-ordering hazard; this matters because dev shares the prod DB).
- Runnable verifier: `npm run audit:verify-chain` (`scripts/verify-audit-chain.ts`) — loads `.env`, verifies the most-recent N rows (default 10k, `--limit=` to widen), exits non-zero on any break. Owner/scheduled use.
- **Status:** the migration was applied to production (`anees_health`) on 2026-06-21 (`prisma migrate deploy`; "Database schema is up to date"). Columns confirmed live/queryable; the verifier reports the existing 230 rows intact (legacy null-hash, expected). New audit writes are hashed going forward. The code also degrades gracefully if run anywhere the migration is not yet applied (audit rows still write, just without integrity metadata).
- Known limitation (follow-up): the chain may fork under highly concurrent writes (two rows observing the same `prevHash`); per-row content hashes remain authoritative for in-place tampering. A DB-trigger WORM / serialized writer is the production-grade hardening.

### 8.5 Route integration-test harness

- `tests/integration/document-route.test.ts` exercises the real `GET /api/ehr/documents/[id]` handler with its data dependencies mocked (no DB/Medplum/R2), validating the §7 fail-closed gate end-to-end: 401 unauthenticated, 403 unauthorized, **409 never-scanned (`pending`)**, **423 infected**, 200 clean. Runs in the existing CI `test` job.
- This establishes the route-handler test pattern; extend it to the payment webhook and visit transitions. A DB-backed integration tier (CI Postgres service + seeded fixtures) is the larger follow-up.
