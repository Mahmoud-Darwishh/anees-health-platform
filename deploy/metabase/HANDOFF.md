# Metabase / Analytics — Work Order (for the engineer doing the installation)

**Hiring the person:** any backend/DevOps freelancer comfortable with Linux, Docker,
Nginx, Postgres, and Let's Encrypt can do this. Scope ≈ **half a day**. No app code
to write — everything is prepared in this folder.

**What we're building:** a self-hosted Metabase (open-source) BI app at
`https://analytics.aneeshealth.com`, reporting on the **operational** Postgres only,
through masked read-only views. It must **never** touch Medplum (clinical/PHI) and
must **never** read raw patient tables.

**The full design doc is [`../../docs/METABASE_SETUP.md`](../../docs/METABASE_SETUP.md).
The click-by-click runbook is [`DEPLOY.md`](DEPLOY.md). This file is the summary + acceptance tests.**

---

## Access the engineer needs from the owner (Madyoss)
- [ ] SSH access to the Hostinger VPS `152.239.112.57` (sudo).
- [ ] The operational DB owner connection string (the `DATABASE_URL` user) — **share via a
      password manager or secure channel, never plain email/chat.**
- [ ] Access to add a DNS record in the **Vercel** dashboard for `aneeshealth.com`.
- [ ] Ability to create a **Google OAuth client** (Google Cloud console) for staff login.
- [ ] Ability to set one env var in Vercel and redeploy.

## Hard safety rules (do not deviate)
1. Metabase connects **only** as the read-only `metabase_bi` user, **only** to the `bi`
   schema. Prove it with `03_verify_boundary.sql` before connecting anything.
2. **Never** add Medplum's database as a data source.
3. **RAM check first** (`free -h`): Metabase's JVM wants ~1.5 GB. If the VPS doesn't have
   ≥ 2 GB free *after* Postgres + Medplum, **stop and resize the VPS** — do not risk
   OOM-killing the clinical system.
4. Public sharing + embedding stay **OFF**. Sessions 8h. Google SSO restricted to the
   company domain.
5. **Escrow** the `MB_ENCRYPTION_SECRET_KEY` in the owner's password manager.

---

## The 6 steps (detail in DEPLOY.md)

| # | Step | Where | Done when |
|---|---|---|---|
| 1 | Run `01`+`02` SQL, then `03` as `metabase_bi` | operational Postgres | `bi.patients_safe` returns a count; **every** `public.*` read and every write in `03` FAILS |
| 2 | `docker compose up -d` (after `free -h` RAM check) | `/opt/metabase/` on VPS | `curl -I http://127.0.0.1:3001/api/health` → 200 |
| 3 | DNS A-record `analytics` → `152.239.112.57`; Nginx + `certbot` | Vercel + VPS | `https://analytics.aneeshealth.com` loads with valid TLS |
| 4 | Setup wizard, Google SSO, add DB (schema = `bi` only), groups/permissions | browser | non-admin test user sees only their collection, query-builder only, only the `bi` schema |
| 5 | Build the 5 starter dashboards from `starter-dashboards.sql` | browser | revenue / funnel / visits / AR aging / insurance dashboards live |
| 6 | Set `NEXT_PUBLIC_METABASE_URL=https://analytics.aneeshealth.com` in Vercel, redeploy | Vercel | "Analytics ↗" link appears in `/admin` for owner/finance/ops roles |

## Final acceptance (owner sign-off)
- [ ] Boundary proof (step 1) passed — screenshots of the failed `public.*` reads.
- [ ] Site only reachable at `https://analytics.aneeshealth.com`, valid cert, public sharing OFF.
- [ ] Google SSO on; non-admins query-builder-only; only `bi` schema visible.
- [ ] 5 dashboards live with metric definitions documented in each description.
- [ ] Admin nav link live. Daily metadata backup cron installed. Encryption key escrowed.

**Do NOT** buy Metabase Pro. Free open-source covers all of the above. Pro is only for
later (identifiable-PHI dashboards or the hospital-partner portal).
