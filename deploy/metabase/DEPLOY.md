# Metabase — execution guide (copy-paste)

> **Status (2026-07-20): live in production.** Phases 1–5 below are complete —
> `https://analytics.aneeshealth.com` is deployed, secured, connected, and carrying
> 3 branded dashboards. What's left is Phases 6–7 (the in-app nav link + the backup
> cron) plus Google SSO. This guide is kept accurate as a rebuild/audit reference,
> not just a to-do list.

The steps below are the parts that must happen **on the Hostinger VPS, in the
Vercel dashboard, and in the Google console** — the things an AI can't do on its
own. Follow them in order. The companion design doc is
[`../../docs/METABASE_SETUP.md`](../../docs/METABASE_SETUP.md).

Files in this folder:

| File | What it is | Where it runs |
|---|---|---|
| `01_bi_schema_and_views.sql` | The masked `bi` views (the safe surface) | Operational Postgres, as the DB owner |
| `02_readonly_role.sql` | The read-only `metabase_bi` login | Operational Postgres, as the DB owner |
| `03_verify_boundary.sql` | Proof the boundary holds | Operational Postgres, **as `metabase_bi`** |
| `99_rollback.sql` | Full teardown of the above | Operational Postgres, as the DB owner |
| `docker-compose.yml` | Metabase + its metadata DB, incl. the Traefik routing labels | `/opt/metabase/` on the VPS |
| `.env.example` | Secrets template | copy to `/opt/metabase/.env` |
| `backup-metabase-metadata.sh` | Daily backup of Metabase's *own* settings DB (not patient data) | VPS cron |
| `starter-dashboards.sql` | The 10 dashboard queries (already applied — kept as the rebuild/reference source) | Metabase SQL editor, or re-run via the connector |

There is no Nginx config in this folder — the VPS already runs **Traefik** as its
one public entrypoint (see Phase 3), so Metabase is exposed via container labels,
not a separate reverse-proxy file.

---

## Phase 1 — Database safety layer ⚠️ do first, get reviewed

> This runs against the **live production database**. Do it in a low-traffic
> window, review the SQL first, and set a real password in `02` before running.
> It is additive and fully reversible (`99_rollback.sql`).

```bash
# From a machine that can reach the DB (or on the VPS). Replace <owner> with the
# DATABASE_URL user (anees_user).
psql "host=152.239.112.57 port=5432 dbname=anees_health user=<owner> sslmode=require" \
     -f 01_bi_schema_and_views.sql

# Edit 02_readonly_role.sql: replace __SET_A_STRONG_RANDOM_PASSWORD__ (openssl rand -base64 32)
psql "host=152.239.112.57 port=5432 dbname=anees_health user=<owner> sslmode=require" \
     -f 02_readonly_role.sql

# PROVE the boundary — connect AS the Metabase user this time:
psql "host=152.239.112.57 port=5432 dbname=anees_health user=metabase_bi sslmode=require" \
     -f 03_verify_boundary.sql
```

✅ **Done when:** `bi.patients_safe` returns a count, and every `public.*` read
and every write in `03` fails. If any write/`public` read succeeds, stop and fix.

---

## Phase 2 — Deploy Metabase on the VPS

```bash
ssh <you>@152.239.112.57
sudo mkdir -p /opt/metabase && cd /opt/metabase

# Put docker-compose.yml here (scp or paste). Then create the secrets file:
cp .env.example .env
openssl rand -base64 32   # → paste as MB_DB_PASS
openssl rand -base64 32   # → paste as MB_ENCRYPTION_SECRET_KEY  (ALSO save in your password manager)
chmod 600 .env

# RAM check first — Metabase's JVM wants ~1.5 GB. Confirm headroom over Postgres + Medplum:
free -h

docker compose up -d
docker compose logs -f metabase     # wait for "Metabase Initialization COMPLETE"
curl -I http://127.0.0.1:3002/api/health   # → HTTP/1.1 200 OK
```

Do **not** open the setup wizard yet — finish Phase 3 so the first admin account
is created over HTTPS.

---

## Phase 3 — Expose it safely

> **Real-topology note (found during the 2026-07-20 live deploy):** this VPS already
> runs **Traefik** as the one public door on 80/443 for every service on the box
> (net: host, `providers.docker=true`, auto Let's Encrypt via HTTP challenge). Plain
> Nginx is installed but **not** running/bound — starting it would collide with
> Traefik on 80/443. So Metabase is exposed via **Traefik labels** (already added to
> `docker-compose.yml`), which also gets it its HTTPS certificate automatically — no
> Nginx config and no manual `certbot` step needed.

1. **DNS (Vercel dashboard):** aneeshealth.com → DNS → add an **A record**:
   name `analytics`, value `152.239.112.57`.
2. **Apply the Traefik labels** (already in `docker-compose.yml` — `traefik.enable=true`,
   host rule `analytics.aneeshealth.com`, entrypoint `websecure`, certresolver
   `letsencrypt`, target port `3000`):
   ```bash
   docker compose up -d      # re-creates the container with the labels applied
   docker compose logs -f traefik 2>/dev/null || true   # (traefik is a separate stack; skip if not reachable here)
   ```
3. **Firewall:** already open — Traefik already serves Medplum on 80/443, so no `ufw`
   change is needed for Metabase.
4. **(Recommended) lock-down:** if staff IPs are stable, add an IP allow-list via a
   Traefik IPAllowList middleware label instead of the Nginx `allow`/`deny` block.
   Otherwise rely on SSO + short sessions (Phase 4).

✅ **Done when:** `https://analytics.aneeshealth.com` loads with a valid cert.

---

## Phase 4 — Configure Metabase (in the browser, one-time) 🟡 partly done

1. ✅ **Setup wizard complete**; owner admin account created.
2. ⬜ **Google SSO** — not yet configured (needs a Google OAuth client —
   [console.cloud.google.com](https://console.cloud.google.com); redirect URL
   `https://analytics.aneeshealth.com/auth/sso`. Admin → Settings → Authentication →
   Google; restrict to your Workspace domain). Currently using plain Metabase
   password login for the one admin account.
3. ✅ **Database connected** (Admin → Databases → PostgreSQL → `Anees Health (BI)`):
   - Host `host.docker.internal`, port `5432`, database `anees_health`
   - User `metabase_bi`, password (from `02`)
   - **SSL:** left off — not required for this host-to-container connection in
     practice; the plan originally called for `require`, revisit only as an
     optional later hardening step
   - **Schemas:** ⚠️ currently "all", not restricted to "only these → `bi`" as
     planned. PHI is still protected (the database itself refuses any `public.*`
     read regardless), but restricting sync is the cleaner intended state —
     fix via Edit connection details → Schemas → "Only these..." → `bi` → Sync
   - Actions, Uploads, model persistence: OFF
4. ⬜ **Groups & permissions** — not yet created:
   - Create groups `Owner`, `Finance`, `Ops`; add staff.
   - Data permissions on `anees_health` → **"Create queries: Query builder only"**
     for every non-admin group (no raw SQL editor — the free tier can't sandbox SQL).
   - One collection per group; grant each group View on its own collection only.
5. ✅ **Hardened:** Public Sharing OFF, embedding OFF, 8-hour session (all via env).

✅ **Done when:** a non-admin test user sees only their collection, can use the
visual query builder, cannot open a SQL editor, and cannot see any schema but `bi`.
*(Pending — no non-admin users exist yet.)*

---

## Phase 5 — First dashboards ✅ done (2026-07-20)

All 10 queries in `starter-dashboards.sql` are live as saved questions in the
**"BI Dashboards"** collection, styled with the Anees brand palette (navy
`#132c4d` / gold `#a68341` / teal `#0E9384`, sourced from
`src/assets/scss/utils/variables.scss`), and assembled into 3 full dashboards
(not one chart per page):

- **Booking Funnel & Demand** — funnel status, conversion trend, demand by
  governorate, coverage checks, promocode effectiveness
- **Visit Operations** — completed visits + rating trend, top clinicians
- **Finance & Insurance** — revenue by month, AR aging, insurance approval rate

Each question's description documents its metric definition so the numbers
agree with the app. To rebuild from scratch, re-run the queries in
`starter-dashboards.sql` (via the Metabase SQL editor or the Metabase MCP
connector) against database `Anees Health (BI)`.

## Phase 6 — Admin nav link (already in code) ⬜ env var not yet set

The `/admin` nav shows a **Metabase ↗** link for `superadmin, admin, finance,
medical_ops, operator` — **automatically, once you set this env var in Vercel**.
It's named "Metabase" specifically (not "Analytics") because `/admin` already has
a separate, older, hand-coded "Analytics" page — the two are distinct:

```
NEXT_PUBLIC_METABASE_URL=https://analytics.aneeshealth.com
```

Until it's set, the link stays hidden (no dead link). Set it in Vercel project
settings and redeploy.

## Phase 7 — Operate ⬜ backup cron not yet installed

```bash
# daily metadata backup (cron) — backs up Metabase's OWN settings DB, not patient data
0 2 * * *  /opt/metabase/backup-metabase-metadata.sh >> /var/log/metabase-backup.log 2>&1
```
Upgrades: back up → bump the pinned image tag in `docker-compose.yml` → `docker compose up -d`.
Buy Pro only when a dashboard must show identifiable PHI, or for the hospital portal.
