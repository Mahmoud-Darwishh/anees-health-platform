# Security Architecture — Anees Health Platform

> **Audience:** engineers, hospital procurement teams, security auditors.
> **Last refresh:** 2026-06-05.
> Pairs with [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) (control mapping) and [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) (operational procedures).

This document describes how the platform protects PHI and access to it, layer by layer. Every control points to the file(s) that implement it, so an auditor can trace control → code in one click.

---

## 1. Threat model in one paragraph

We protect electronic Protected Health Information (ePHI) — Egyptian and (soon) other-MENA patients' clinical records — against: unauthorised access (external + insider), accidental disclosure, modification or destruction (intentional or accidental), and unavailability beyond agreed RPO/RTO. The platform serves home-care staff working from phones in patients' homes, internal back-office staff at desktops, patients and caregivers on their own devices, and (planned) hospital partners on dedicated tenant-scoped accounts. Each surface has a distinct identity and a distinct blast radius.

---

## 2. Defense-in-depth at a glance

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  EDGE                                                                        │
│  Cloudflare DNS + TLS  →  Next.js middleware  →  CSP / CORS / rate-limit     │
├──────────────────────────────────────────────────────────────────────────────┤
│  IDENTITY                                                                    │
│  NextAuth v5 (JWT)  →  RBAC  →  License gating  →  Case scope  →  Consent    │
│                                                  Break-glass (DAT) overrides  │
├──────────────────────────────────────────────────────────────────────────────┤
│  APPLICATION                                                                 │
│  Server actions + Zod  →  Tenant scoping  →  Visit-state guards               │
│  Audit mirror  →  Rate-limit  →  CORS  →  Structured logging                  │
├──────────────────────────────────────────────────────────────────────────────┤
│  DATA                                                                        │
│  Postgres (operational, encrypted-at-rest)  →  Medplum FHIR (clinical)        │
│  Cloudflare R2 (medical files, server-side encrypted, malware-scanned)        │
│  Soft delete only on clinical                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  AUDIT & MONITORING                                                          │
│  AuditEvent (Medplum) + AuditLog (Postgres)                                  │
│  Login + logout audit  →  /admin/compliance dashboard                         │
│  (Sentry + log aggregator: planned)                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│  SECRETS & VULN MGMT                                                          │
│  .env.local (dev) → managed env (prod) → rotation cadence                    │
│  Dependabot, npm audit, malware-scan on uploads                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Edge layer

### 3.1 TLS & DNS
- All public hostnames terminate TLS at Cloudflare. Origin connection is HTTPS over the VPS.
- HSTS is sent with `max-age=31536000; includeSubDomains; preload`. (Headers configured in `next.config.ts`.)
- No raw HTTP listener is exposed on the origin in production.

### 3.2 Content Security Policy
- CSP is set in `next.config.ts` `headers()`.
- Allow-list today: Anees domains, Kashier (payments), Cloudflare, Vercel, Chatling (chat widget), Microsoft Clarity (analytics), Facebook (pixel).
- **Adding a new third-party origin requires updating CSP.** Daily.co (telemed), Sentry, R2's public CDN, and any new ad/analytics vendor must be added explicitly.

### 3.3 CORS
- Every API route response goes through `resolveCorsHeaders` from `src/lib/utils/cors.ts`.
- Allowed origins are derived from `NEXT_PUBLIC_SITE_URL` + an explicit allow-list. Wildcards are forbidden.

### 3.4 Rate limiting
- `src/lib/utils/rate-limit.ts` provides `checkRateLimit(key, max, windowMs)`, backed by the Postgres `RateLimit` table (fixed-window counter).
- Every mutation route (booking create, OTP send/verify, patient register, logout-audit, internal scan) calls it, keyed by `getClientIp(request)`.
- Default budgets (illustrative — see the route source for exact numbers): OTP send 5/min/IP, booking create 10/min/IP, logout-audit 30/min/IP.

### 3.5 Bot mitigation
- Cloudflare bot fight at the edge.
- No CAPTCHA on the booking funnel today — flagged for re-evaluation if abuse rises.

---

## 4. Identity layer

### 4.1 NextAuth v5 + JWT sessions
- Configured in `src/auth.ts`.
- Adapter: `@auth/prisma-adapter`. Sessions are JWT — no server-side session table.
- JWT carries: `id`, `role` (`patient | staff`), `patientId`, `staffId`, `staffRole`, `phone`.
- `AUTH_SECRET` rotation cadence: every 90 days, see [DEPLOYMENT_RUNBOOK.md §6](DEPLOYMENT_RUNBOOK.md).

### 4.2 Providers
1. **Google OAuth** — for patient self-onboarding via web.
2. **Patient credentials** — phone or case-ID + password (bcrypt cost 12 by default).
3. **Staff credentials** — email + password (bcrypt). Successful login writes an `AuditLog` row via `writeLoginAudit()` (action = `login`, with provider).

### 4.3 RBAC
- Roles, scopes, and the per-module permission matrix are in [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md).
- Helpers in `src/lib/auth/rbac.ts`:
  - `getStaffUser([allowedRoles])` — enforces the role list at the entry of every server action or admin page.
  - `CLINICAL_ROLES`, `CLINICAL_WRITE_ROLES`, `CASE_SCOPED_CLINICAL_READ_ROLES` — role bundles used by readers.
  - `isCaseScopedClinicalRole(role)` — flags roles whose reads must be filtered through `CareTeam` membership.
- Admin/clinician navigation visibility is centralised in `src/lib/auth/admin-nav-policy.ts` (single source of truth for which links a role sees).

### 4.4 License gating
- `Staff` carries `licenseType`, `licenseNumber`, `licenseExpiry`, `licenseIssuingBody`.
- `canSignClinical(staff, discipline)` in `rbac.ts` blocks any clinical write if the license has expired.
- **Authors of clinical notes, signers of compositions, and creators of MedicationRequests must all pass this gate.**
- Expired-license users can still read their own queue and do non-clinical admin work.

### 4.5 Case scoping
- Clinicians of the case-scoped roles (`physiotherapist`, `nurse`, `doctor`, `medical_ops`) can only see patients on whose `CareTeam` they appear.
- Resolution is server-side, in `src/features/ehr/clinician-physio/data.ts` (and equivalents). The session never trusts a `patientId` from the client.

### 4.6 Caregiver consent scopes
- A patient's caregiver gets **no** default access. Every scope (`profile | visits | vitals | notes | tasks | files | care-team | messaging`) is granted by an active FHIR `Consent` resource.
- `src/lib/medplum/consent-policy.ts` resolves an authenticated caregiver session to its current scope set on every render.
- See [FHIR_CATALOG.md §14](FHIR_CATALOG.md) for the resource shape.

### 4.7 Break-glass overrides
- For restricted-tier records (mental health, HIV, reproductive health, DV) or destructive operations (delete patient, force-close visit), the platform issues a `DestructiveApprovalToken`.
- The token records `requestedBy`, `approvedBy`, `approvedAt`, `consumedBy`, `expiresAt`, plus a free-text reason.
- The override **must** emit an `AuditLog` row with `action = override`.
- The `/admin/compliance` dashboard surfaces every issued token for review.

### 4.8 Tenancy
- All foundational tables carry a `tenantId` (default `"platform"`). Cross-tenant reads are a P0 incident.
- Tenant scoping is enforced **per query** today (no row-level security yet). See "Known gaps" below.

---

## 5. Application layer

### 5.1 Server actions over API routes
- Most EHR writes are Next.js server actions, not API routes. Reasons: smaller attack surface (no CORS, no public path), implicit session, no need to revalidate the JWT.
- Server actions live in `src/features/<domain>/actions.ts` and always do, in order: (1) `getStaffUser([roles])`, (2) Zod parse, (3) tenant/case scope check, (4) write, (5) audit, (6) revalidate path.

### 5.2 Input validation
- Zod schemas live in `src/features/ehr/schemas/`.
- Every server action parses input with a schema; no raw `formData.get()` reaches the database.
- API routes that still take JSON bodies (bookings, OTP, scan) Zod-parse on entry too.

### 5.3 Tenant scoping
- New queries on `Patient`, `Provider`, `Visit`, `CarePlan`, `Invoice`, `OnlineBooking`, `Staff`, `Coverage`, `PriorAuth`, `Claim`, `ControlledSubstanceLedger` **must** filter by `tenantId`.
- The "platform" tenant is the default for back-compat. Hospital partners will get their own tenant codes.

### 5.4 Visit state machine
- `Visit.state` has 22 states. Direct `prisma.visit.update({ state })` is **forbidden**.
- All transitions go through a helper that: validates the transition is legal from the current state, writes a `VisitStateTransition` audit row (with actor, reason, geo, override metadata), and emits an `AuditLog` row.

### 5.5 Outbound calls
- Wapilot (OTP), Kashier (payments), Medplum (clinical), Cloudflare R2 (files), the malware scanner (HTTP) — every outbound call has a typed client in `src/lib/<vendor>/`.
- Timeouts are set (no infinite retries). Secrets are read once at module load.

---

## 6. Data layer

### 6.1 Postgres (operational + financial)
- Hosted alongside the application on the VPS today; managed Postgres on OVH is the next step.
- Encryption at rest: **dependent on filesystem-level encryption on Hostinger today; managed Postgres on OVH provides native encryption-at-rest**. Tracked in [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md).
- TLS in transit: required for production (`?sslmode=require`). Local dev uses unencrypted localhost connections.
- Backups: nightly logical dumps today; planned: PITR on managed Postgres with 30-day retention. See [DEPLOYMENT_RUNBOOK.md §7](DEPLOYMENT_RUNBOOK.md).

### 6.2 Medplum (clinical / FHIR)
- Self-hosted on the same VPS today (target: dedicated host on OVH).
- Uses HTTPS + client-credentials OAuth (`MEDPLUM_CLIENT_ID` + `MEDPLUM_CLIENT_SECRET`). The shared client (`src/lib/medplum/client.ts`) caches the access token and auto-retries on 401.
- Audit trail is dual: a FHIR `AuditEvent` resource for every write, mirrored to Postgres `AuditLog` via `writeMedplumAuditMirror`.

### 6.3 Cloudflare R2 (medical files)
- Bucket holds **all** medical document bytes (lab PDFs, scans, photos).
- Object keying: `ehr/YYYY/MM/{uuid}-{sanitized-name}` — see `buildObjectKey` + `sanitizeFilename` in `src/lib/storage/r2-medical.ts`.
- Server-side encryption: enabled by default on R2 (AES-256, R2-managed keys).
- TLS for all uploads/downloads. No public URLs — every retrieval is a short-lived signed URL (≤10 min) issued by the streaming endpoint.
- **Signed URLs must never be logged.** They effectively grant access to PHI for their lifetime.

### 6.4 Malware scanning
- New uploads land with `BinaryMalwareState = pending` (via FHIR extension on the `Binary`).
- The cron job `POST /api/internal/ehr/documents/scan` (called with `x-ehr-scan-key` or `Bearer ${CRON_SECRET}`) iterates unscanned binaries, fetches the bytes from R2, sends them to the configured scanner (`src/lib/security/malware-scan.ts`).
- Verdicts: `clean | infected | scan_failed`. Infected files are quarantined; serving requires `clean`.
- Dev backend (`mock_clean`) returns `clean` unconditionally. **Production must use the HTTP backend pointed at a real engine** (ClamAV, Bitdefender, Cloudflare Email Security, etc.).

### 6.5 Soft delete
- Clinical records are **never** hard-deleted. `Patient.deletedAt` is the gate; FHIR resources move to `entered-in-error` rather than being removed.
- Operational rows (`Promocode`, `Service`, etc.) can be hard-deleted with admin role + audit row.

### 6.6 Logging hygiene
- `@/lib/utils/app-logger` is the only place that should write logs.
- **Never log:** PHI, names, addresses, contact details, full bodies of bookings, full bodies of payment webhooks, JWTs, R2 signed URLs, Medplum access tokens, `MEDPLUM_CLIENT_SECRET`, `AUTH_SECRET`, full request headers.
- The coverage-check JSONL writer (`@/lib/utils/logger`) is **only** for coverage-check analytics and writes pseudonymised data (IP is SHA-256 hashed). Do not repurpose it.

---

## 7. Audit & monitoring

### 7.1 What gets audited

| Event | Where | Status |
|---|---|---|
| Clinical create / update / delete | `writeMedplumAuditMirror` (every medplum module) | ✅ |
| Patient document download | `/api/ehr/documents/[documentId]` | ✅ |
| Login (staff + patient credentials) | `writeLoginAudit` in `src/auth.ts` | ✅ |
| Logout | `/api/auth/logout-audit` | ✅ |
| Break-glass token issue + consume | `DestructiveApprovalToken` flow | ✅ schema, 🟡 UI |
| Restricted-tier read attempt | clinical readers | ✅ |
| Visit state transition | `VisitStateTransition` ledger | ✅ |
| Postgres-only mutations (Invoice, ProviderPayout, Promocode, demographics edits) | per-call `prisma.auditLog.create()` | 🟡 partial — see [EHR_NOW.md](EHR_NOW.md) Sprint 1 |
| Failed permission check (`access_denied`) | RBAC helpers | 🟡 — emitted in newer code, retro-fit pending |
| Export / report download | export routes | ❌ — to be added when export functionality lands |

### 7.2 Where audit lives
- Primary: FHIR `AuditEvent` in Medplum.
- Mirror: Postgres `AuditLog` table.
- Retention: indefinite (regulatory). Archival to cold storage is a Phase 2 task.

### 7.3 What the compliance dashboard shows
- `/admin/compliance` lets a `compliance_officer` (or `admin`) browse: recent break-glass overrides, restricted-tier access events, login/logout history, and failed access attempts. It is read-only over `AuditLog`.

### 7.4 Observability gap
- **No Sentry, no log aggregator, no APM today.** Errors surface only in server logs on the VPS.
- Targeted for EHR_NOW Sprint 5. The CSP must be widened to allow Sentry once we adopt it.

---

## 8. Secrets management

### 8.1 Where secrets live
- Local dev: `.env.local` (gitignored, dotenv-loaded).
- Production: managed environment variables on the host (Hostinger today, OVH-native or Doppler/Vault soon).
- Secrets are read once at server start. No client-side bundle ever sees a secret.

### 8.2 Required secrets (and rotation cadence)

See `.env.local` template in [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) and [DEPLOYMENT_RUNBOOK.md §6](DEPLOYMENT_RUNBOOK.md). Default rotation:

| Secret | Rotation |
|---|---|
| `AUTH_SECRET` | 90 days |
| `MEDPLUM_CLIENT_SECRET` | 180 days |
| `R2_SECRET_ACCESS_KEY` | 180 days |
| `KASHIER_SECRET_KEY` / `KASHIER_API_KEY` | per Kashier contract |
| `WAPILOT_API_TOKEN` | 365 days |
| `CRON_SECRET` / `EHR_SCAN_KEY` | 90 days |
| `EHR_MALWARE_SCAN_HTTP_TOKEN` | 180 days |
| `HASH_SALT` | **never rotate without a planned migration** (would invalidate IP hashes in `CoverageCheck`) |

### 8.3 Operational rules
- Never commit secrets. Pre-commit hook (planned) will scan for high-entropy strings.
- Never log secrets, even partially.
- `$` characters in dotenv values must be escaped (`\$`) — Kashier secrets are the usual offender.

---

## 9. Vulnerability management

### 9.1 Dependencies
- Renovate / Dependabot is planned (EHR_NOW Sprint 5). Today, `npm audit` is run manually before each release.
- Lockfile (`package-lock.json`) is committed and version-pinned.

### 9.2 Uploads
- Every medical-file upload is malware-scanned (§6.4). Files that have not reached `clean` cannot be served.
- Allowed MIME types are enforced server-side at the upload endpoint.

### 9.3 SAST / DAST
- Not yet in place. Planned: ESLint security plugin, `npm audit --omit=dev` in CI, optional Snyk for prod scans.

---

## 10. Incident response — one-pager

> **Goal:** detect within 1 hour, contain within 4 hours, notify regulators / partners within the deadlines required by Egypt's DPL 151/2020 (72 hours).

### 10.1 Detection
- Server logs + (planned) Sentry + (planned) Cloudflare WAF alerts.
- `/admin/compliance` daily review by the compliance officer.
- Any unscheduled `override` audit row triggers an email to the on-call engineer.

### 10.2 Severities

| Sev | Definition | Examples | Response |
|---|---|---|---|
| **P0** | Active breach / PHI exposed publicly | Public dump, leaked DB credentials | Page founder + lead engineer immediately. Rotate all secrets. Take affected surfaces offline. |
| **P1** | Imminent breach / loss of integrity | Working exploit, infected file served | Page on-call engineer. Quarantine affected resources. |
| **P2** | Vulnerability without exploit | Dependency CVE, weak config | File a ticket within 24h. Patch within the sprint. |
| **P3** | Hygiene gap | Missing rate limit on a non-critical route | Backlog item. |

### 10.3 Containment
- **Account compromise:** invalidate JWTs (rotate `AUTH_SECRET`), force re-login.
- **R2 key compromise:** rotate `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` immediately.
- **Medplum compromise:** rotate `MEDPLUM_CLIENT_SECRET`, audit recent writes.
- **Infected file detected after serving:** quarantine in R2, notify affected users, audit access log for downloads.

### 10.4 Notification timelines
- **Internal:** founder + lead engineer + compliance officer within 1 hour of P0/P1.
- **Patients:** if PHI was exposed, within 72 hours per Egypt DPL 151/2020.
- **Hospital partners:** per BAA / DPA terms (usually 24–72 hours).
- **Regulators:** Egypt DPL data-protection authority within 72 hours; HIPAA timelines apply once we onboard US patients (60 days from discovery for individuals; 60 days for HHS for breaches ≥ 500 people).

### 10.5 Post-mortem
- Within 5 business days. Lives in `docs/incidents/YYYY-MM-DD-<slug>.md` (folder to be created on first incident).
- Mandatory sections: timeline, root cause, contributing factors, what worked, what didn't, action items with owners.

---

## 11. Known gaps (track in EHR_NOW.md)

| Gap | Severity | Owner | Target |
|---|---|---|---|
| No Sentry / log aggregator | Medium | Engineering | EHR_NOW Sprint 5 |
| Postgres-only audit coverage incomplete | Medium | Engineering | EHR_NOW Sprint 1 (continuation) |
| Multi-tenancy enforced per query (no RLS) | Medium | Engineering | When hospital #2 onboards |
| Production malware scanner not yet wired | High | Engineering + Ops | Before hospital go-live |
| No automated SAST / dep scanning | Medium | Engineering | EHR_NOW Sprint 5 |
| No formal pen test | Medium | External + Owner | Before MENA expansion |
| No DDoS load test | Low | Engineering | Pre Series-A |
| `HASH_SALT` rotation strategy not defined | Low | Engineering | Backlog |
| Medplum self-hosted on shared VPS today | Medium | Ops | Migration to OVH (in flight) |

---

## 12. See also

- [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) — how these controls map to §164.308/310/312.
- [EHR_ROLE_MATRIX.md](EHR_ROLE_MATRIX.md) — role × module permission matrix.
- [FHIR_CATALOG.md](FHIR_CATALOG.md) — resource-level RBAC notes.
- [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) — secrets rotation, backups, IR procedure execution.
- [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — engineering conventions + pitfalls.
