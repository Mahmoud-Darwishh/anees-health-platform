# Metabase — execution guide (copy-paste)

Everything in this folder is ready to run. The steps below are the parts that
must happen **on your Hostinger VPS, in your Vercel dashboard, and in the Google
console** — the things an AI can't do for you. Follow them in order. The
companion design doc is [`../../docs/METABASE_SETUP.md`](../../docs/METABASE_SETUP.md).

Files in this folder:

| File | What it is | Where it runs |
|---|---|---|
| `01_bi_schema_and_views.sql` | The masked `bi` views (the safe surface) | Operational Postgres, as the DB owner |
| `02_readonly_role.sql` | The read-only `metabase_bi` login | Operational Postgres, as the DB owner |
| `03_verify_boundary.sql` | Proof the boundary holds | Operational Postgres, **as `metabase_bi`** |
| `99_rollback.sql` | Full teardown of the above | Operational Postgres, as the DB owner |
| `docker-compose.yml` | Metabase + its metadata DB | `/opt/metabase/` on the VPS |
| `.env.example` | Secrets template | copy to `/opt/metabase/.env` |
| `nginx-metabase.conf` | Reverse proxy | `/etc/nginx/sites-available/` |
| `backup-metabase.sh` | Daily metadata backup | VPS cron |
| `starter-dashboards.sql` | Ready dashboard queries | Metabase SQL editor |

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

1. **DNS (Vercel dashboard):** aneeshealth.com → DNS → add an **A record**:
   name `metabase`, value `152.239.112.57`.
2. **TLS + proxy (VPS):**
   ```bash
   sudo cp nginx-metabase.conf /etc/nginx/sites-available/analytics.aneeshealth.com
   sudo ln -s /etc/nginx/sites-available/analytics.aneeshealth.com /etc/nginx/sites-enabled/
   sudo certbot --nginx -d analytics.aneeshealth.com   # fills in the TLS lines
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. **Firewall:** `sudo ufw allow 'Nginx Full'` (80/443). Metabase's 3002 stays on localhost.
4. **(Recommended) lock-down:** if staff IPs are stable, uncomment the `allow`/`deny`
   block in `nginx-metabase.conf`. Otherwise rely on SSO + short sessions (Phase 4).

✅ **Done when:** `https://analytics.aneeshealth.com` loads with a valid cert.

---

## Phase 4 — Configure Metabase (in the browser, one-time)

1. Finish the **setup wizard** over HTTPS; create your **admin** account.
2. **Google SSO** (needs a Google OAuth client — [console.cloud.google.com](https://console.cloud.google.com));
   redirect URL `https://analytics.aneeshealth.com/auth/sso`. Admin → Settings →
   Authentication → Google; restrict to your Workspace domain.
3. **Add the database** (Admin → Databases → PostgreSQL):
   - Host `host.docker.internal`, port `5432`, database `anees_health`
   - User `metabase_bi`, password (from `02`), **SSL: on**
   - **Schemas:** choose "only these" → **`bi`**
   - Turn **OFF** Actions, Uploads, and model persistence
4. **Groups & permissions:**
   - Create groups `Owner`, `Finance`, `Ops`; add staff.
   - Data permissions on `anees_health` → **"Create queries: Query builder only"**
     for every non-admin group (no raw SQL editor — the free tier can't sandbox SQL).
   - One collection per group; grant each group View on its own collection only.
5. **Harden:** confirm Public Sharing is OFF (Admin → Settings → Public Sharing);
   password complexity `strong`; the 8-hour session is set via env.

✅ **Done when:** a non-admin test user sees only their collection, can use the
visual query builder, cannot open a SQL editor, and cannot see any schema but `bi`.

---

## Phase 5 — First dashboards

Paste the queries from `starter-dashboards.sql` as SQL questions (as admin), save
them into the right collections, and assemble dashboards. Document each metric's
definition in its description so the numbers match the app.

## Phase 6 — Admin nav link (already in code)

The `/admin` nav shows a **Metabase ↗** link for `superadmin, admin, finance,
medical_ops, operator` — **automatically, once you set this env var in Vercel**:

```
NEXT_PUBLIC_METABASE_URL=https://analytics.aneeshealth.com
```

Until it's set, the link stays hidden (no dead link). Set it after Phase 3, redeploy.

## Phase 7 — Operate

```bash
# daily metadata backup (cron)
0 2 * * *  /opt/metabase/backup-metabase.sh >> /var/log/metabase-backup.log 2>&1
```
Upgrades: back up → bump the pinned image tag in `docker-compose.yml` → `docker compose up -d`.
Buy Pro only when a dashboard must show identifiable PHI, or for the hospital portal.
