# Deployment & Operations Runbook — Anees Health Platform

> **Audience:** lead engineer, on-call engineer, and the owner (so they know what's involved).
> **Last refresh:** 2026-06-05.
> Pairs with [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) (controls) and [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) (compliance posture).

This runbook is the answer to "how do we rebuild from scratch in under two hours" and "what do we do when something is on fire". Keep it current; it is the single document the on-call engineer reads during an incident.

---

## 1. Current infrastructure (as of 2026-06-05)

| Layer | Where | Notes |
|---|---|---|
| DNS + TLS + CDN + WAF | **Cloudflare** | All public domains. |
| Application (Next.js) | **Hostinger VPS** (single instance) | Node 22, PM2 process manager. |
| Postgres | **Hostinger VPS** (same host) | Postgres 16, local socket + TCP. |
| Medplum (FHIR) | **Hostinger VPS** (same host) | Self-hosted Medplum stack via Docker Compose. |
| Medical files | **Cloudflare R2** | Bucket per environment (dev / staging / prod). |
| Push notifications | **web-push** (VAPID) | App-managed. |
| WhatsApp OTP | **Wapilot** (external) | api.wapilot.net/api/v2. |
| Payments | **Kashier** (external) | test + live modes. |
| Source code + CI | **GitHub** | CI via GitHub Actions; release via SSH + PM2 reload. |

This is a single-host architecture with one obvious risk: the host is also the database, the Medplum server, and the app. We migrate this in §3.

---

## 2. Target infrastructure (in flight)

| Layer | Target | Why |
|---|---|---|
| DNS / WAF | Cloudflare (unchanged) | Already good. |
| Application (Next.js) | **OVH Bahrain** bare-metal or High-Grade Instance | Closer to MENA, HDS + ISO 27001 + 27018 + 27701 certified, EU-aligned legal regime. |
| Postgres | **OVH Managed Postgres** (separate from app host) | Native at-rest encryption, point-in-time recovery, managed backups. |
| Medplum (FHIR) | **OVH dedicated host** (separate from app) | Isolates clinical data from app crashes; lets us scale independently. |
| Medical files | **Cloudflare R2** (unchanged) | Already encrypted, signed-URL-only. |
| Logs / metrics | **Sentry** (web + server) + **Better Stack / Grafana Cloud** (planned) | No central observability today. |
| Backups | **Postgres PITR (managed) + R2 versioning + nightly snapshots to OVH cold storage** | Off-site retention. |

Migration plan and decision rationale: see [CTO_STRATEGY.md §8 Phase 0](CTO_STRATEGY.md) and [EHR_NOW.md Sprint 0](EHR_NOW.md).

---

## 3. Migration plan (Hostinger → OVH)

**Objective:** zero-downtime cutover, full backup-and-rollback path, no PHI exposure during transit.

### 3.1 Sequence

1. **Stand up OVH hosts** (app, Postgres-managed, Medplum).
2. **Provision secrets** in OVH (env file or a managed secret store).
3. **Set up replication from Hostinger Postgres → OVH Postgres** using `pg_dump` + `pglogical` (or `pgcopydb`). Verify lag.
4. **Sync Medplum data** via the Medplum bulk export → import flow. Verify resource counts.
5. **Cut over R2** — same bucket, just new credentials per environment. R2 is location-agnostic.
6. **DNS cut-over with low TTL** (60s) the night before; flip the A record during low traffic.
7. **Monitor** for 48 hours with both hosts up. Decommission Hostinger only after the no-issue window passes.

### 3.2 Pre-cutover checklist

- [ ] All env vars in OVH match Hostinger (per §6 secrets matrix).
- [ ] Database migrations applied on OVH Postgres.
- [ ] `npm run build` succeeds on OVH.
- [ ] Medplum responds at the new internal URL.
- [ ] R2 buckets accessible from OVH IPs.
- [ ] Smoke test: log in as staff, log in as patient, render the portal, open one EHR detail page, write one Observation.
- [ ] Cloudflare DNS A-record TTL dropped to 60s **at least 1 hour before** cutover.
- [ ] Status page (or email) drafted: "scheduled maintenance window".

### 3.3 Rollback

- DNS flip back to Hostinger A-record. Postgres replication direction was bidirectional during the window? If not: replay the `AuditLog` rows from OVH back to Hostinger.
- R2 is unchanged.

---

## 4. Environment matrix

Three environments. Local dev runs on a developer machine; staging mirrors prod on the same host today (will be a separate OVH instance post-migration).

| Variable | dev (local) | staging | prod |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | http://localhost:3000 | https://staging.anees.health | https://anees.health |
| `NEXT_PUBLIC_API_URL` | http://localhost:3000 | https://staging.anees.health | https://anees.health |
| `DATABASE_URL` | local Postgres | staging managed Postgres | prod managed Postgres |
| `MEDPLUM_BASE_URL` | http://localhost:8103 | https://medplum-staging.anees.health | https://medplum.anees.health |
| `R2_BUCKET` | anees-medical-dev | anees-medical-staging | anees-medical-prod |
| `KASHIER_MODE` | test (or unset) | test | live |
| `EHR_MALWARE_SCAN_BACKEND` | mock_clean | http | http |
| `AUTH_SECRET` | dev-only secret | staging secret | prod secret |
| `CRON_SECRET` | dev secret | staging secret | prod secret |

---

## 5. First-run setup (rebuild from scratch in under 2 hours)

> The goal: a new engineer with cloud credentials can stand up a working staging or prod environment in under two hours.

### 5.1 Provision compute

1. Spin up the OVH host (or any Linux VM with Node 22 + Docker).
2. Open ports 80 / 443 only. SSH on a non-default port behind Cloudflare Tunnel (recommended).

### 5.2 Provision Postgres

1. Create the managed Postgres instance.
2. Capture the connection string into `DATABASE_URL`.

### 5.3 Provision Medplum

1. `git clone https://github.com/medplum/medplum`.
2. Configure `medplum.config.json` with the Postgres URL (separate database from the app, or schema-isolated).
3. `docker compose up -d`.
4. Wait for health to be green; create the first project + client; capture `MEDPLUM_CLIENT_ID` + `MEDPLUM_CLIENT_SECRET`.

### 5.4 Provision Cloudflare R2

1. Create R2 bucket per environment.
2. Generate API token (read + write).
3. Capture credentials.

### 5.5 Deploy the app

1. `git clone` the repo.
2. `nvm use 22` (or system Node 22).
3. `npm ci`.
4. Create `.env.local` (or `/etc/anees.env`) with every variable from §6.
5. `npm run db:migrate:deploy` — applies every migration in `prisma/migrations/`.
6. `npm run db:seed` — seeds lookup tables, areas, doctors.
7. `npm run build`.
8. Start with PM2: `pm2 start npm --name anees -- start`.
9. Configure Cloudflare to point the public hostname at the host's IP.

### 5.6 Smoke test

- `curl https://anees.health/en` returns 200 with home page HTML.
- Log in as staff (the seed includes one superadmin account).
- Open `/admin/patients` — should render a patient list.
- Open `/api/medplum/health` — should return `{ ok: true }`.
- Submit a test booking with `KASHIER_MODE=test`.
- Trigger one upload and confirm the malware scan reaches `clean`.

---

## 6. Secrets matrix and rotation

| Secret | Used by | Rotation | Rotation procedure |
|---|---|---|---|
| `AUTH_SECRET` | NextAuth JWT signing | 90 days, or after any P0/P1 | Generate new secret, deploy, restart app. All sessions invalidate. |
| `MEDPLUM_CLIENT_SECRET` | Medplum API auth | 180 days | Rotate in Medplum admin; update env; restart app. |
| `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` | R2 client | 180 days | Issue new pair in Cloudflare; update env; restart. Then delete old pair after 24h verification. |
| `KASHIER_SECRET_KEY` + `KASHIER_API_KEY` | Payments | Per Kashier policy | Coordinate with Kashier support. |
| `WAPILOT_API_TOKEN` | OTP | 365 days | Generate new in Wapilot dashboard; update env; restart. |
| `CRON_SECRET` | Internal API routes | 90 days | Generate UUIDv4; update scheduler env; update app env; restart. |
| `EHR_DOCUMENT_SCAN_KEY` | Document scan job (header `x-ehr-scan-key`) | 90 days | Same pattern. |
| `EHR_MALWARE_SCAN_HTTP_TOKEN` | Malware scanner client | 180 days | Coordinate with scanner vendor. |
| `HASH_SALT` | IP hashing in `CoverageCheck` | **Do not rotate** without a plan | Rotation invalidates existing IP hashes. Plan separately. |

Every rotation event must produce an `AuditLog` row with `action = update` and a free-text reason.

---

## 7. Backups

### 7.1 What gets backed up

| Source | Method | Retention | Verified by |
|---|---|---|---|
| Postgres (operational) | Managed PITR (target) + nightly `pg_dump` (today) | 30 days PITR + 90 days dumps | Monthly restore drill |
| Medplum (FHIR resources) | Bulk export via `$export` job + Postgres backing-store backup | 30 days + 90 days | Monthly restore drill |
| R2 medical files | R2 bucket versioning + monthly snapshot to OVH cold storage | Versioning indefinite + 7 years cold | Quarterly restore spot-check |
| Audit log | Postgres `AuditLog` (FHIR `AuditEvent` not built yet — EHR_AUDIT Phase 1) | Same as above + planned archive | Annual review |
| Application code | GitHub | Forever | n/a |
| `.env.local` (and equivalents) | Out-of-band — printed, sealed, locked. **Never** in cloud storage outside a secret manager. | Forever | Owner |

### 7.2 Restore procedure (high level)

1. Spin up a fresh host (§5).
2. Restore Postgres from the most recent dump (or fast-forward via PITR).
3. Restore Medplum's Postgres backing store.
4. Verify R2 access (no restore needed unless a delete happened — then version-history restore).
5. Deploy the app pointed at the restored stores.
6. Smoke test (§5.6).
7. Communicate restore time to stakeholders.

**RPO target:** 24 hours (will be 1 hour after PITR is live).
**RTO target:** 4 hours (will be 1 hour after the restore is drilled).

---

## 8. Deploys

### 8.1 Normal release

1. Open PR. CI runs `lint + tsc --noEmit + build`.
2. Review.
3. Merge to `master`.
4. CI builds, copies the build to staging, runs smoke tests.
5. Owner / lead approves the prod step.
6. SSH to prod host, `git pull`, `npm ci --omit=dev`, `npm run db:migrate:deploy`, `npm run build`, `pm2 reload anees`.
7. Watch logs + the app for 15 minutes.

**Always migrate DB first, then deploy.** Never the reverse. Migrations are written to be backward-compatible.

### 8.2 Emergency rollback

- `pm2 reload` to the last known-good build (PM2 keeps the previous version in `~/.pm2/...`).
- If a migration was applied: revert it via a *forward* migration that undoes the change. **Never** `prisma migrate reset`.

---

## 9. Routine maintenance

| Task | Cadence | Owner |
|---|---|---|
| Patch OS / kernel updates | Monthly | Engineer |
| Apply security updates to deps (`npm audit`) | Weekly review, monthly bump | Engineer |
| Review `/admin/compliance` audit log | Weekly | Compliance Officer |
| Rotate `CRON_SECRET` + `EHR_DOCUMENT_SCAN_KEY` | Quarterly | Engineer |
| Rotate `AUTH_SECRET` | Quarterly | Engineer |
| Restore drill | Quarterly | Engineer + Owner |
| Pen test | Annual | External + Owner |
| HIPAA / DPL quarterly review | Quarterly | Compliance Officer + Owner |

---

## 10. On-call and incident response

### 10.1 Detection
- Cloudflare WAF alerts (planned).
- Sentry (planned).
- Manual: server logs on the VPS (`pm2 logs anees`).

### 10.2 Triage
- P0 — page founder + lead engineer immediately.
- P1 — page on-call engineer.
- P2 — file a ticket within 24h.

Detailed severities and playbook are in [SECURITY_ARCHITECTURE.md §10](SECURITY_ARCHITECTURE.md).

### 10.3 Common runbooks

#### "Site is down (5xx everywhere)"
1. `ssh` to the prod host.
2. `pm2 status` — is the app up?
3. `pm2 logs anees --lines 200` — any startup errors?
4. `systemctl status postgresql` — is the DB up?
5. `curl http://localhost:8103/` — is Medplum up?
6. If app crash: `pm2 reload anees`.
7. If DB down: check disk space (`df -h`), check Postgres logs, restart if safe.
8. If Medplum down: `docker compose -f /opt/medplum/docker-compose.yml restart`.
9. If all up and site still 5xx: check Cloudflare status, check DNS.

#### "R2 returns 403 / 404 on every download"
1. Check `R2_ACCESS_KEY_ID` is valid in Cloudflare dashboard.
2. Check `R2_BUCKET` exists.
3. Confirm signed-URL generation in code is using the right credentials.

#### "Document upload fails with 413 and the page shows a generic load error"
1. Confirm browser network tab shows `413 Payload Too Large` on the upload request.
2. Increase reverse-proxy request size above the app limit (`next.config.ts` server action limit is `30mb`).
3. On Nginx, set these directives in the TLS server block and reload:

```nginx
client_max_body_size 35M;
proxy_request_buffering on;
proxy_read_timeout 120s;

location / {
	proxy_pass http://127.0.0.1:3000;
	proxy_http_version 1.1;
	proxy_set_header Host $host;
	proxy_set_header X-Forwarded-Host $host;
	proxy_set_header X-Forwarded-Proto $scheme;
	proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	proxy_set_header Upgrade $http_upgrade;
	proxy_set_header Connection "upgrade";
}
```

4. If Cloudflare is in front, verify there is no custom WAF/body-size rule forcing a lower cap.
5. After deploy, hard-refresh once (and clear service worker cache if stale bundles persist).

#### "Medplum returns 401 on every call"
1. The token expired — `getMedplumClient()` should auto-retry. If it doesn't:
2. Restart the app (drops cached token).
3. Verify `MEDPLUM_CLIENT_SECRET` is correct.

#### "A patient says they can see another patient's record"
P0. **Stop the site immediately** (rollback to last known-good, or set a maintenance page).
1. Capture the user ID + session JWT (carefully — JWT is sensitive).
2. Identify the leak path (RBAC bug, case-scope bug, consent bug, tenant scope bug).
3. Rotate `AUTH_SECRET` to invalidate all sessions.
4. Patch + redeploy.
5. Notify affected users per [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) §8.
6. Post-mortem within 5 business days.

#### "Cron / scan job stopped running"
1. Check the scheduler logs (cron / Cloudflare Workers cron / OVH Tasks).
2. Confirm `CRON_SECRET` matches.
3. Manually trigger: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://anees.health/api/internal/ehr/documents/scan`.

---

## 11. Cost reference (rough, USD/month, prod scale)

| Item | Cost |
|---|---|
| OVH Bahrain — app host | $80–250 |
| OVH Managed Postgres | $50–200 |
| OVH — Medplum host | $80–250 |
| Cloudflare (DNS + WAF + R2 storage + egress) | $20–150 |
| Sentry | $50–250 |
| Wapilot (OTP) | per-message; ~$30 baseline |
| Kashier | per-transaction; no fixed |
| Domains | $20/year |

Total infra at MVP-scale: ~USD 350–1100/mo. The number rises with patient volume; R2 egress + Sentry events are the variable drivers.

---

## 12. See also

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) — controls and IR.
- [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) — compliance gaps.
- [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) — engineering overview.
- [EHR_NOW.md](EHR_NOW.md) — sprint sequencing of the migration.
- [CTO_STRATEGY.md](CTO_STRATEGY.md) — long-term infra plan.
