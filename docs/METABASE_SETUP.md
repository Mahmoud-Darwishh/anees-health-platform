# Metabase Setup & Implementation Runbook — Anees Health Platform

> **Owner:** CTO / lead engineer · **Audience:** the engineer who implements this, plus the owner (so they know what's involved).
> **Created:** 2026-07-13 · **Status:** artifacts built; **not yet executed on the server** (needs DB/VPS/Vercel access).
> **Decision context:** staying on the current infrastructure (Vercel app + Hostinger VPS backend) for now — this runbook is written for that reality, **not** the outdated "OVH Bahrain / Cloudflare edge" topology in older docs.

> **Ready-to-run artifacts live in [`../deploy/metabase/`](../deploy/metabase/)** — the masked-view SQL, the read-only role, a verification script, a rollback script, `docker-compose.yml`, the Nginx config, the backup script, starter dashboard queries, and a copy-paste [`DEPLOY.md`](../deploy/metabase/DEPLOY.md). **Phase 6 (the admin nav link) is already implemented in code** (`admin-nav-policy.ts` + `AdminNav.tsx`), gated on `NEXT_PUBLIC_METABASE_URL` so it stays hidden until Metabase is live. The remaining work is running the artifacts on the DB/VPS and configuring Metabase in the browser.

---

## 0. What this is (plain language)

Metabase is a ready-made **business-intelligence app** — you run it as its own service and build charts by pointing and clicking, no code. It will give you self-serve dashboards over your **operational data** (bookings, visits, invoices, payments, coverage) that your current hand-coded admin pages can't: trends over time, ad-hoc questions, scheduled reports.

**The one rule that governs everything below:** Metabase talks *directly* to the database, which means it **bypasses every safety rule the app enforces** — tenant scoping, role checks, PHI masking, audit logging. So we move the safety down into the database itself: Metabase logs in as a **read-only user that can physically only see pre-masked views** with patient names, phones, GPS, national IDs, and insurance numbers stripped out — and it **never touches the clinical records in Medplum**.

---

## 1. Architecture (real current topology)

```
Staff browser
   │  https (Google SSO + MFA)
   ▼
analytics.aneeshealth.com   ── DNS A-record added in Vercel DNS → the VPS IP
   │
   ▼  (on the Hostinger VPS, 152.239.112.57)
Nginx (TLS via Let's Encrypt)  ──►  Metabase container (127.0.0.1:3000)
                                        │              │
                                        │              └─► its OWN metadata Postgres (container) — dashboards/users/settings
                                        │
                                        └─► operational Postgres (anees_health)
                                              via read-only user `metabase_bi`
                                              SELECT only on the `bi` schema (masked views)
                                              ✗ never public tables · ✗ never Medplum
```

Key facts this design depends on:
- The **app runs on Vercel**; the **operational Postgres + Medplum run on the Hostinger VPS**. Metabase is a new Docker service **on the VPS**, next to (not inside) the existing Medplum Docker stack.
- Metabase's **own metadata database** is a separate small Postgres container — never the app DB, never Medplum's DB.
- Metabase reports **only** on `anees_health` (operational). **Medplum's clinical database is never added as a data source.**
- DNS for `aneeshealth.com` is managed in **Vercel** (not Cloudflare), so the subdomain record is added there.

---

## 2. Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Edition | **Open-source (free)** | Covers a read-only ops dashboard fully. Buy Pro only later (see §10). |
| Hosting | **Self-host on the Hostinger VPS** (Docker) | Keeps data on your own box; matches the "stay as we are" decision. |
| Surface | **Standalone app, linked from the admin nav** — not embedded | Embedding needs paid Pro and loses per-user audit; standalone gives every feature free. |
| Data source | **Operational Postgres only, via masked `bi` views** | Clinical data is in Medplum and out of scope; operational Postgres still holds PHI that must be masked. |
| Security boundary | **Read-only DB user + `bi` schema views** | Metabase bypasses app-layer security, so the DB grant is the real boundary. |
| Audience | `superadmin, admin, finance, medical_ops, operator` | Mirrors the existing `/admin/analytics` access list. |

---

## 3. Prerequisites (do these before Phase 1)

- [ ] **VPS headroom check.** Metabase's JVM wants ~1.5 GB RAM. Confirm the VPS has **≥ 2 GB free** *after* Postgres + Medplum are running (`free -h`). If not, resize the VPS first — **do not risk OOM-killing the box that runs your clinical system.**
- [ ] **A subdomain** decided: `analytics.aneeshealth.com` (used throughout).
- [ ] **A Google OAuth client** for SSO (reuse the pattern from the app's Google login; a separate client ID is cleaner). Note the redirect URL will be `https://analytics.aneeshealth.com/auth/sso`.
- [ ] **Access-control method chosen** (§6): SSO-only, or SSO + IP allow-list, or SSO + VPN. Pick based on whether staff have stable IPs.
- [ ] **Secrets generated:** a metadata-DB password and an encryption key — `openssl rand -base64 32` for each. **Escrow the encryption key** (password manager) — if it's lost, Metabase can't decrypt its stored DB credentials.

---

## 4. Phase 1 — The security foundation (database) ⚠️ do this first, get it reviewed

This is the most important phase. Nothing connects until the read-only user provably cannot read `public` or write anything.

> **camelCase warning:** columns are camelCase and **must be double-quoted** in SQL (`"gpsLatitude"`, `"deletedAt"`). Un-quoted `gpslatitude` will error or, worse, resolve wrong. Table names are snake_case (`patients`, `visits`, `online_bookings`).

### 4.1 Create the masked `bi` schema + views

Run as the DB owner (`anees_user`). Views execute with the **owner's** privileges on the underlying tables, so the read-only user never needs any grant on `public`.

```sql
CREATE SCHEMA IF NOT EXISTS bi;

-- Patients: identity-free. Age band instead of birth date; no name/phone/ID/GPS/insurance/contacts.
CREATE OR REPLACE VIEW bi.patients_safe AS
SELECT
  p.id, p.code, p."areaId", p."gender",
  CASE
    WHEN p."dateOfBirth" IS NULL THEN 'unknown'
    WHEN date_part('year', age(p."dateOfBirth")) < 18 THEN '0-17'
    WHEN date_part('year', age(p."dateOfBirth")) < 40 THEN '18-39'
    WHEN date_part('year', age(p."dateOfBirth")) < 60 THEN '40-59'
    WHEN date_part('year', age(p."dateOfBirth")) < 80 THEN '60-79'
    ELSE '80+'
  END AS age_band,
  p."status", p."referralSourceId", p."privacyTier",
  p."tenantId", p."registrationDate", p."createdAt"
FROM public.patients p
WHERE p."deletedAt" IS NULL;                       -- respect soft-delete

-- Visits: financials, timing, status. GPS + identity + media stripped.
CREATE OR REPLACE VIEW bi.visits_safe AS
SELECT
  v.id, v.code, v."patientId", v."providerId", v."serviceId", v."carePlanId", v."areaId",
  v."bookedDate", v."scheduledDate", v."completedDatetime",
  v."status", v."state", v."visitType", v."primaryDisruptionCode",
  v."servicePriceEgp", v."discountEgp", v."netPriceEgp", v."providerPayoutEgp",
  v."cashCollectedEgp", v."cashGratuityEgp", v."patientRating",
  v."tenantId", v."createdAt"
FROM public.visits v;
-- deliberately omitted: checkInLat/Lng, checkOutLat/Lng, identityConfirmedBy,
-- companionsPresent, overridePhotoMediaId, patientAcknowledgementMediaId, notes

-- Online bookings: funnel + payment rail. Name/phone/IP/UA/sender stripped.
CREATE OR REPLACE VIEW bi.bookings_safe AS
SELECT
  b.id, b."bookingRef",
  b."visitType", b."serviceType", b."packageType", b."specialty",
  b."baseAmountEgp", b."discountEgp", b."amountEgp", b."currency",
  b."status", b."paymentMethod", b."governorate", b."promocodeCode",
  b."convertedVisitId", b."convertedAt", b."paymentCompletedAt",
  b."locale", b."tenantId", b."createdAt"
FROM public.online_bookings b;
-- omitted: fullName, phoneNumber, countryCode, ipAddress, userAgent,
-- instapaySenderName, instapayReference, notes, kashier* ids

-- Insurance: expose status/dates/amounts; drop member/policy identifiers + free-text.
CREATE OR REPLACE VIEW bi.coverages_safe AS
SELECT c.id, c."patientId", c."insurerProfileId", c."status",
       c."effectiveDate", c."expiryDate", c."tenantId", c."createdAt"
FROM public.coverages c;   -- verify exact columns against schema before running
```

**Clean financial + lookup tables** (no PHI) are exposed as simple pass-through views so that *everything Metabase can see lives in `bi`* — one boundary, easy to reason about:

```sql
CREATE OR REPLACE VIEW bi.invoices        AS SELECT * FROM public.invoices;
CREATE OR REPLACE VIEW bi.payments        AS SELECT * FROM public.payments;
CREATE OR REPLACE VIEW bi.expenses        AS SELECT * FROM public.expenses;
CREATE OR REPLACE VIEW bi.provider_payouts AS SELECT * FROM public.provider_payouts;
CREATE OR REPLACE VIEW bi.promocodes      AS SELECT * FROM public.promocodes;
CREATE OR REPLACE VIEW bi.claims          AS SELECT * FROM public.claims;
CREATE OR REPLACE VIEW bi.claim_line_items AS SELECT * FROM public.claim_line_items;
CREATE OR REPLACE VIEW bi.coverage_checks AS SELECT * FROM public.coverage_checks;   -- already PII-free (ipHash only)
CREATE OR REPLACE VIEW bi.services        AS SELECT * FROM public.services;
CREATE OR REPLACE VIEW bi.areas           AS SELECT * FROM public.areas;
CREATE OR REPLACE VIEW bi.service_categories AS SELECT * FROM public.service_categories;
CREATE OR REPLACE VIEW bi.referral_sources AS SELECT * FROM public.referral_sources;
CREATE OR REPLACE VIEW bi.insurer_profiles AS SELECT * FROM public.insurer_profiles;
CREATE OR REPLACE VIEW bi.tenants         AS SELECT * FROM public.tenants;
-- providers: drop phone/email
CREATE OR REPLACE VIEW bi.providers AS
SELECT p.id, p.code, p."fullName", p."roleId", p."specialty",
       p."primaryAreaId", p."status", p."tenantId", p."createdAt"
FROM public.providers p;
```

> **Never expose** (no view, no grant): `users`, `accounts`, `verification_tokens`, `push_subscriptions`, `staff` (password hashes, licence numbers), `physio_profiles`, `visit_location_pings`, `visit_state_transitions` (raw GPS), `controlled_substance_ledger`, `standing_orders`, `patient_goals`, `destructive_approval_tokens`, `profile_change_requests`, `rate_limits`, and **`audit_logs`** (its JSON snapshots can contain any PHI). And of course **nothing from Medplum**.

### 4.2 Create the read-only login and lock it down

```sql
CREATE ROLE metabase_ro NOLOGIN;
CREATE USER metabase_bi WITH PASSWORD '‹strong-random-password›';
GRANT metabase_ro TO metabase_bi;

GRANT CONNECT ON DATABASE anees_health TO metabase_ro;
GRANT USAGE  ON SCHEMA bi TO metabase_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA bi TO metabase_ro;          -- views included
ALTER DEFAULT PRIVILEGES IN SCHEMA bi GRANT SELECT ON TABLES TO metabase_ro;  -- future views auto-covered

-- belt & braces: never public, never writable, and protect prod from runaway queries
ALTER ROLE metabase_ro SET default_transaction_read_only = on;
ALTER ROLE metabase_bi SET statement_timeout = '60s';
-- Do NOT grant metabase_ro anything on schema public. It has no SELECT there, so it cannot read the base tables.
```

### 4.3 Prove the boundary (definition of done for Phase 1)

Connect **as `metabase_bi`** (`psql "host=... dbname=anees_health user=metabase_bi ..."`) and confirm:

```sql
SELECT count(*) FROM bi.patients_safe;      -- ✅ works, returns a number
SELECT * FROM public.patients LIMIT 1;       -- ❌ MUST fail: permission denied
SELECT * FROM public.audit_logs LIMIT 1;     -- ❌ MUST fail
CREATE TABLE bi.x(i int);                     -- ❌ MUST fail: read-only / no privilege
UPDATE bi.invoices SET "status"='paid';       -- ❌ MUST fail
```

Also eyeball each `*_safe` view (`SELECT * FROM bi.patients_safe LIMIT 5`) and confirm **no name, phone, national ID, or GPS column is present.** ✅ Phase 1 done only when all four ❌ checks genuinely fail.

---

## 5. Phase 2 — Deploy Metabase (Docker on the VPS)

Create `/opt/metabase/` on the VPS with a `.env` (root-only, `chmod 600`):

```dotenv
# /opt/metabase/.env
MB_DB_PASS=‹metadata-db-password›
MB_ENCRYPTION_SECRET_KEY=‹openssl rand -base64 32 — ESCROW THIS›
```

`/opt/metabase/docker-compose.yml`:

```yaml
services:
  metabase:
    image: metabase/metabase:v0.54.0        # PIN a tag; check the current stable release first
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"               # localhost only — Nginx terminates TLS
    environment:
      MB_DB_TYPE: postgres
      MB_DB_HOST: metabase-db
      MB_DB_PORT: 5432
      MB_DB_DBNAME: metabaseapp
      MB_DB_USER: metabaseapp
      MB_DB_PASS: ${MB_DB_PASS}
      MB_ENCRYPTION_SECRET_KEY: ${MB_ENCRYPTION_SECRET_KEY}
      MB_SITE_URL: https://analytics.aneeshealth.com
      MB_ENABLE_PUBLIC_SHARING: "false"     # no anonymous public links, ever
      MB_ENABLE_EMBEDDING: "false"
      MB_SESSION_MAX_AGE: "480"             # 8-hour absolute session
      MB_SESSION_COOKIES: "true"            # also expire on browser close
      JAVA_TIMEZONE: Africa/Cairo
      JAVA_TOOL_OPTIONS: -Xmx1500m          # ~80% of this container's RAM
    extra_hosts:
      - "host.docker.internal:host-gateway" # so Metabase can reach the host's Postgres
    depends_on:
      metabase-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "--fail", "-I", "http://localhost:3000/api/health"]
      interval: 20s
      timeout: 5s
      retries: 6
    networks: [metanet]

  metabase-db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: metabaseapp
      POSTGRES_USER: metabaseapp
      POSTGRES_PASSWORD: ${MB_DB_PASS}
    volumes:
      - metabase_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U metabaseapp -d metabaseapp"]
      interval: 10s
      timeout: 5s
      retries: 6
    networks: [metanet]

volumes:
  metabase_pgdata:
networks:
  metanet:
```

Bring it up: `cd /opt/metabase && docker compose up -d`, then `docker compose logs -f metabase` until healthy. **Do not run the setup wizard over plain HTTP** — finish Phase 3 first so the first admin account is created over HTTPS.

**Definition of done:** `curl -I http://127.0.0.1:3000/api/health` returns `200` on the VPS.

---

## 6. Phase 3 — Expose it safely

1. **DNS:** in the **Vercel** dashboard → `aneeshealth.com` → DNS, add an **A record**: `metabase` → `152.239.112.57`.
2. **TLS + reverse proxy** on the VPS (Nginx). Add a server block for `analytics.aneeshealth.com` proxying to `127.0.0.1:3000`, then issue a cert:
   ```bash
   sudo certbot --nginx -d analytics.aneeshealth.com
   ```
   ```nginx
   server {
     listen 443 ssl http2;
     server_name analytics.aneeshealth.com;
     ssl_certificate     /etc/letsencrypt/live/analytics.aneeshealth.com/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/analytics.aneeshealth.com/privkey.pem;

     # OPTIONAL hard lock-down — uncomment if staff have stable IPs:
     # allow 197.x.x.x;   # office / known egress IP
     # deny all;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_read_timeout 90s;
     }
   }
   ```
3. **Firewall:** `ufw` allows 80/443 only; Metabase's 3000 stays bound to localhost. (Separately, review that Postgres `5432` is firewalled to only the IPs that need it — see §11.)
4. **Access control** — pick one, strongest you can operate:
   - **Baseline (always):** Google SSO restricted to your Google Workspace domain + the short session settings above + public sharing off.
   - **Better:** the Nginx **IP allow-list** above (if staff IPs are stable).
   - **Strongest:** put the VPS admin surface behind a **WireGuard VPN** and allow Metabase only from the VPN subnet.

**Definition of done:** `https://analytics.aneeshealth.com` loads with a valid certificate; HTTP redirects to HTTPS; the setup wizard appears **only** over HTTPS.

---

## 7. Phase 4 — Connect the data & set permissions

1. Finish the **setup wizard** over HTTPS; create the first **admin** account (your own).
2. **Add the database:** Admin → Databases → PostgreSQL.
   - Host `host.docker.internal` (or the VPS private IP), port `5432`, database `anees_health`, user `metabase_bi`, **SSL on** (`require`).
   - **Schemas:** restrict sync to the **`bi`** schema only.
   - Turn **off** "Actions", "Uploads", and model persistence (all need write access we didn't grant).
3. **Turn on Google SSO** (Admin → Authentication) with the OAuth client from §3; restrict to your domain.
4. **Groups & permissions:**
   - Create groups `Owner`, `Finance`, `Ops`. Map staff to groups.
   - **Data permissions** on the `anees_health` connection: **"Create queries → Query builder only"** for all non-admin groups (no raw SQL editor initially — the free tier can't sandbox SQL, so denying it keeps the masking intact). Admins keep native SQL.
   - **Collections:** one per audience (e.g. "Finance", "Operations", "Owner"). Grant each group View on its own collection only.
5. **Harden:** confirm public sharing is off; set password complexity to `strong`; confirm the 8-hour session.

**Definition of done:** a non-admin test user in `Finance` can open the Finance collection, can use the visual query builder, **cannot** open a SQL editor, and **cannot** see any other database or schema.

---

## 8. Phase 5 — Build the first dashboards

Target the wins the hand-coded pages can't do. Build in this order:

1. **Revenue over time** — monthly `payments` (card + confirmed InstaPay), with month-over-month.
2. **Booking → paid funnel** — `bookings_safe` by `status`, conversion %, by `governorate`.
3. **Visit operations** — completed visits/month, no-show & disruption rates, avg `patientRating`, clinician utilization from `visits_safe`.
4. **Money aging** — `invoices` by `status`/`dueDate` (AR aging); `provider_payouts` pending vs paid.
5. **Insurance** — claim approval rate over time, denied-reason mix (`claims`).
6. **Demand & marketing** — `coverage_checks` covered vs uncovered by area; promocode redemption/effectiveness.

> **Definitions parity (critical):** re-encode the app's business rules in your questions so numbers *agree* with the app. From the current code: **revenue** = confirmed card + confirmed-InstaPay `payments` only; a **"delivered" visit** = `status='completed'` OR `checkOutAt` set OR (disruption + payout > 0); **completion-rate denominator excludes cancelled**. Document each metric's definition in the dashboard description.

Once a Metabase dashboard reliably reproduces a hand-coded `/admin/analytics` page, you can retire that page to remove the "two definitions of revenue" maintenance risk.

---

## 9. Phase 6 — Link it from the admin app (small code change, on Vercel)

Add a nav item to the admin chrome linking to `https://analytics.aneeshealth.com`, visible only to `superadmin, admin, finance, medical_ops, operator` (reuse `admin-nav-policy.ts` / the existing analytics access list). Opens in a new tab. No embedding, no CSP change needed (it's a link, not an iframe).

---

## 10. Phase 7 — Operate it

| Task | Cadence | Notes |
|---|---|---|
| Back up Metabase's **metadata DB** | daily | `docker exec metabase-db pg_dump -U metabaseapp -Fc metabaseapp > /backups/metabase_$(date +%F).dump`. Keep the **encryption key** escrowed separately — a dump is useless without it. |
| Version upgrade | as releases land | Back up first → bump the pinned tag → `docker compose up -d` (migrations run on start). Never `:latest`. |
| Watch VPS RAM/CPU | weekly | Metabase + Postgres + Medplum share one box. If load rises, resize or add a read replica. |
| Review who has access | monthly | Groups + collections still match staff roster. |

**When to buy Pro (~$6k/yr) — not before:** the moment a dashboard must show **identifiable** patient data. Pro adds the three things the free tier can't: **audit logging** (who viewed which PHI), **row/column sandboxing** (real masking inside Metabase), and **forced SSO / idle timeout**. Also the trigger for the eventual **hospital-partner portal** (external, multi-tenant → embedding + sandboxing). Until then, the masked-views approach on free OSS is the correct posture.

---

## 11. Security invariants (never violate)

1. Metabase connects **only** as `metabase_bi`, **only** to the `bi` schema, **only** read-only. It is never given `public` or write grants, and **never** pointed at Medplum's database.
2. **Public sharing and embedding stay OFF.**
3. Every new reporting need is met by **adding a masked `bi` view**, reviewed for PHI leakage — never by granting `public` access or handing out the SQL editor to non-admins.
4. The `MB_ENCRYPTION_SECRET_KEY` is escrowed and never rotated casually.
5. Any change to what's exposed is a **PHI review**, because Metabase has no audit trail on the free tier.

---

## 12. Cost

- **Software:** $0 (open-source).
- **Infra:** runs on the existing VPS — needs ~1.5–2 GB RAM headroom (resize the VPS if it's tight; do not starve Postgres/Medplum).
- **Engineer time:** Phases 1–4 ≈ 1–2 days; dashboards ongoing.
- **Later:** Pro ~$6,200/yr **only** when identifiable PHI or the hospital portal forces it.

---

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| A masked view accidentally exposes a PHI column | Phase 1 review + the "eyeball each view" check; keep the never-expose list in §4.1. |
| Metabase OOM-kills the box running the clinical system | Prereq RAM check; `-Xmx1500m` cap; monitor; resize before it's tight. |
| A heavy report slows the shared prod DB | `statement_timeout=60s` on the role; deny native SQL to non-admins; consider a read replica later. |
| No audit of who viewed what (free tier) | Keep PHI out of the views; treat exposure changes as reviews; buy Pro before identifiable PHI. |
| Metadata DB lost | Daily `pg_dump` + escrowed encryption key. |
| **Pre-existing (not Metabase):** prod Postgres is reachable on a public IP | Firewall `5432` to only the IPs that need it (Vercel egress + the VPS itself); strong creds + SSL. Tracked separately. |

---

## 14. Definition of done (whole project)

- [ ] Read-only user provably cannot read `public` or write anything (§4.3).
- [ ] Metabase reachable only at `https://analytics.aneeshealth.com`, valid TLS, public sharing off.
- [ ] Google SSO on; non-admins are query-builder-only; each group sees only its collection.
- [ ] The five core dashboards live, with documented, app-matching metric definitions.
- [ ] Nav link live for the allowed roles.
- [ ] Daily metadata backup running; encryption key escrowed.
- [ ] Stale "OVH Bahrain / Cloudflare edge" references corrected in the other docs.
```
