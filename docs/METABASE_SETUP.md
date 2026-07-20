# Metabase Setup & Implementation Runbook — Anees Health Platform

> **Owner:** CTO / lead engineer · **Audience:** the engineer who implements this, plus the owner (so they know what's involved).
> **Created:** 2026-07-13 · **Status (2026-07-20): live in production** at `https://analytics.aneeshealth.com`, with 3 branded dashboards. Remaining: Google SSO, the Vercel nav-link env var, and the daily backup cron.
> **Decision context:** staying on the current infrastructure (Vercel app + Hostinger VPS backend) for now — this runbook is written for that reality, **not** the outdated "OVH Bahrain / Cloudflare edge" topology in older docs.

> **This is the design doc.** The executable artifacts — masked-view SQL, read-only role, verification script, rollback script, `docker-compose.yml`, backup script, dashboard queries — live in [`../deploy/metabase/`](../deploy/metabase/), with a copy-paste runbook at [`DEPLOY.md`](../deploy/metabase/DEPLOY.md). **Where this doc and that folder could drift, the folder is the source of truth** — this doc summarizes and explains; it doesn't duplicate the SQL/YAML inline. **Phase 6 (the admin nav link) is already implemented in code** (`admin-nav-policy.ts` + `AdminNav.tsx`), gated on `NEXT_PUBLIC_METABASE_URL` so it stays hidden until the env var is set.

---

## 0. What this is (plain language)

Metabase is a ready-made **business-intelligence app** — you run it as its own service and build charts by pointing and clicking, no code. It will give you self-serve dashboards over your **operational data** (bookings, visits, invoices, payments, coverage) that your current hand-coded admin pages can't: trends over time, ad-hoc questions, scheduled reports.

**The one rule that governs everything below:** Metabase talks *directly* to the database, which means it **bypasses every safety rule the app enforces** — tenant scoping, role checks, PHI masking, audit logging. So we move the safety down into the database itself: Metabase logs in as a **read-only user that can physically only see pre-masked views** with patient names, phones, GPS, national IDs, and insurance numbers stripped out — and it **never touches the clinical records in Medplum**.

---

## 1. Architecture (real current topology)

```
Staff browser
   │  https (Google login; SSO not yet wired — see §7)
   ▼
analytics.aneeshealth.com   ── DNS A-record added in Vercel DNS → the VPS IP
   │
   ▼  (on the Hostinger VPS, 152.239.112.57)
Traefik (already running on the box; TLS via Let's Encrypt, auto-issued from
container labels — NOT Nginx/certbot; see deploy/metabase/DEPLOY.md Phase 3
for why the plan changed once the real box was inspected)
   │
   ▼
Metabase container (host debug port 127.0.0.1:3002 → container's internal 3000;
Traefik reaches it directly over the Docker network, not via that host port)
                                        │              │
                                        │              └─► its OWN metadata Postgres (container) — dashboards/users/settings
                                        │
                                        └─► operational Postgres (anees_health)
                                              via read-only user `metabase_bi`
                                              SELECT only on the `bi` schema (masked views)
                                              ✗ never public tables · ✗ never Medplum
```

Key facts this design depends on:
- The **app runs on Vercel**; the **operational Postgres + Medplum run on the Hostinger VPS**. Metabase is a Docker service **on the VPS**, next to (not inside) the existing Medplum Docker stack.
- The VPS already runs **Traefik** as its one public entrypoint for every service on the box (Medplum included) — Metabase is discovered via Docker labels, not a dedicated Nginx config.
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

## 4. Phase 1 — The security foundation (database) ✅ done, proven 2026-07-20

This was the most important phase. The read-only user provably cannot read `public` or write anything — see the live proof transcript summarized below.

> **camelCase warning:** columns are camelCase and **must be double-quoted** in SQL (`"gpsLatitude"`, `"deletedAt"`). Un-quoted `gpslatitude` will error or, worse, resolve wrong. Table names are snake_case (`patients`, `visits`, `online_bookings`).

### 4.1 The masked `bi` schema + views

**The exact, current SQL is [`deploy/metabase/01_bi_schema_and_views.sql`](../deploy/metabase/01_bi_schema_and_views.sql)** — 27 views, run once as the DB owner (`anees_user`). It is not duplicated here to avoid two copies drifting apart; that file is the single source of truth. In summary: PHI-bearing tables (`patients`, `visits`, `online_bookings`, `coverages`, `prior_auths`, `claims`, `claim_line_items`, `insurer_profiles`, `providers`, and the money tables) get **curated `*_safe` views** with identifiers stripped (age band instead of birth date, no name/phone/GPS/national ID/insurance numbers, no free-text notes); PHI-free lookup tables are exposed as plain pass-through views. Views execute with the **owner's** privileges, so the read-only role below never needs any grant on `public`.

> **Never expose** (no view, no grant): `users`, `accounts`, `verification_tokens`, `push_subscriptions`, `staff` (password hashes, licence numbers), `physio_profiles`, `visit_location_pings`, `visit_state_transitions` (raw GPS), `controlled_substance_ledger`, `standing_orders`, `patient_goals`, `destructive_approval_tokens`, `profile_change_requests`, `rate_limits`, and **`audit_logs`** (its JSON snapshots can contain any PHI). And of course **nothing from Medplum**.

### 4.2 The read-only login

**Exact SQL: [`deploy/metabase/02_readonly_role.sql`](../deploy/metabase/02_readonly_role.sql).** Creates a `metabase_ro` role (bundles the grants) and a `metabase_bi` login user. Grants: `CONNECT` on the database, `USAGE` + `SELECT` on schema `bi` only (default privileges so future views auto-covered) — nothing on `public`. Hardened with `default_transaction_read_only = on`, a `statement_timeout`, and an idle-transaction timeout so a runaway query can't hurt the shared prod DB.

### 4.3 The boundary proof (Phase 1's definition of done)

**Exact SQL: [`deploy/metabase/03_verify_boundary.sql`](../deploy/metabase/03_verify_boundary.sql)**, run connected **as `metabase_bi`**. It asserts: reading `bi.patients_safe`/`bi.bookings_safe` succeeds; reading `public.patients`, `public.audit_logs`, `public.staff`, `public.visit_location_pings` all fail with `permission denied`; and writing anywhere (`UPDATE`, `CREATE TABLE`, `INSERT`) fails.

**Actually run against production on 2026-07-20 — real result:** all three success checks passed (`bi.patients_safe` → 6 rows, `bi.bookings_safe` → 7 rows, eyeballed columns confirmed no name/phone/GPS/national ID), and **all seven** must-fail checks failed exactly as required (`permission denied for schema public` ×4, `permission denied for view invoices_safe`, `permission denied for schema bi`, `permission denied for schema public`). The boundary holds.

---

## 5. Phase 2 — Deploy Metabase (Docker on the VPS) ✅ done, live on 2026-07-20

**The exact, current config is [`deploy/metabase/docker-compose.yml`](../deploy/metabase/docker-compose.yml)** — not duplicated here. Key facts, including two corrections found only by actually deploying (the value of a live deploy over a paper plan):

- **Image:** `metabase/metabase:v0.63.1.2` — the originally-planned `v0.54.0` **does not exist** on Docker Hub (404 on pull); verified against the real registry before fixing.
- **Port:** host `127.0.0.1:3002` (local debug only) → container's internal `3000`. Ports `3000` and `3001` were **already in use** by unrelated existing processes on this VPS, discovered live via `ss -tlnp` during the deploy. Non-destructive fix — the container-internal port and the app's own understanding of itself are unaffected; only the host-side publish moved.
- **Routing labels:** `traefik.*` labels are baked into the compose file (see Phase 3) — no separate reverse-proxy file.
- Own metadata Postgres container (`anees-metabase-db`), `MB_ENABLE_PUBLIC_SHARING`/`MB_ENABLE_EMBEDDING` both `false`, 8-hour session, `Africa/Cairo` timezone, `-Xmx1500m` JVM cap.

Secrets live in `/opt/metabase/.env` (root-only, `chmod 600`) — template at [`deploy/metabase/.env.example`](../deploy/metabase/.env.example).

**Definition of done:** `curl -I http://127.0.0.1:3002/api/health` returns `200` on the VPS. ✅ Confirmed — `Metabase Initialization COMPLETE in 48.6s`.

---

## 6. Phase 3 — Expose it safely ✅ done, live on 2026-07-20

**The plan changed once the real box was inspected — this is the actual, working setup, not the original design.** The VPS turned out to already run **Traefik** (net: host, `providers.docker=true`, auto Let's Encrypt via HTTP challenge) as the *one* public entrypoint on 80/443 for every service on the box, Medplum included. Nginx was installed but not running. Starting a second thing on 80/443 would have collided with Traefik, so Metabase is exposed via **Traefik-reads-Docker-labels** instead — genuinely simpler than the original Nginx+certbot plan, since Traefik issues and renews the HTTPS certificate on its own:

1. **DNS:** in the **Vercel** dashboard → `aneeshealth.com` → DNS, add an **A record**: `analytics` → `152.239.112.57`.
2. **Routing + TLS:** already declared as labels on the `metabase` service in `docker-compose.yml` — `traefik.enable=true`, host rule `analytics.aneeshealth.com`, entrypoint `websecure`, cert resolver `letsencrypt`, target port `3000`. Traefik discovers it automatically on `docker compose up -d`; no config file, no `certbot` command.
3. **Firewall:** already open — Traefik already serves Medplum on 80/443. (Separately, review that Postgres `5432` is firewalled to only the IPs that need it — see §11.)
4. **Access control** — pick one, strongest you can operate:
   - **Baseline (current):** Google login + the short session settings + public sharing off. (Google *SSO* — domain-restricted login — is still pending; see §7.)
   - **Better:** a Traefik `IPAllowList` middleware label, if staff IPs are stable.
   - **Strongest:** put the VPS admin surface behind a **WireGuard VPN** and allow Metabase only from the VPN subnet.

**Definition of done:** `https://analytics.aneeshealth.com` loads with a valid certificate; HTTP redirects to HTTPS. ✅ Confirmed — `HTTP/2 200`, valid Let's Encrypt cert, one entry for the domain in Traefik's ACME store.

---

## 7. Phase 4 — Connect the data & set permissions 🟡 partly done

1. ✅ Setup wizard complete; owner admin account created.
2. ✅ **Database connected:** Admin → Databases → PostgreSQL → `Anees Health (BI)`. Host `host.docker.internal`, port `5432`, database `anees_health`, user `metabase_bi`. **SSL was left off** — the planned `require` setting wasn't needed in practice (this is host-to-container traffic, not public internet) and the connection works cleanly; revisit only if a future hardening pass wants to force it. Actions/Uploads/model persistence are off (the account has no write grant anyway).
   - ⚠️ **Open item:** schema sync is currently set to "all", not restricted to `bi` only. The actual PHI protection is unaffected — the database itself still refuses any read of `public.*` regardless of what Metabase's UI lists — but restricting sync is still the cleaner, intended state before other staff get access. Fix: Admin → Databases → Anees Health (BI) → Edit connection details → Schemas → "Only these..." → `bi` → Save → Sync database schema.
3. ⬜ **Google SSO** — not yet configured. Needs a Google OAuth client (console.cloud.google.com), restricted to the company Workspace domain. Until then, the owner admin account uses a plain Metabase password login.
4. ⬜ **Groups & permissions** — not yet created. Only the owner admin account exists so far; `Owner`/`Finance`/`Ops` groups and per-collection restrictions are needed before other staff are given access.
5. ✅ Public sharing off, embedding off, 8-hour session (all set via `docker-compose.yml` env vars).

**Definition of done:** a non-admin test user in `Finance` can open the Finance collection, can use the visual query builder, **cannot** open a SQL editor, and **cannot** see any other database or schema. *(Pending — no non-admin users exist yet.)*

---

## 8. Phase 5 — Build the first dashboards ✅ done (2026-07-20)

Built via the Metabase MCP connector, from the queries in [`deploy/metabase/starter-dashboards.sql`](../deploy/metabase/starter-dashboards.sql), organized into **3 full dashboards** (deliberately consolidated rather than one chart per page) inside a **"BI Dashboards"** collection, and styled with the Anees brand palette — navy `#132c4d`, gold `#a68341`, teal `#0E9384` — sourced from `src/assets/scss/utils/variables.scss`, not invented:

1. **Booking Funnel & Demand** — funnel status, booking→visit conversion by month, demand by governorate, coverage-check outcomes, promocode effectiveness (5 charts).
2. **Visit Operations** — completed visits + average rating by month, top clinicians by completed visits (2 charts).
3. **Finance & Insurance** — revenue by month, accounts-receivable aging, insurance claim approval rate (3 charts).

> **Definitions parity (already applied):** revenue = confirmed card + confirmed-InstaPay `payments` only (matches the app); AR aging bucket order is `not yet due → 1-30 → 31-60 → 60+ → no due date` (fixed from the source SQL's default alphabetical order, which would have sorted nonsensically). Each question's description documents its own definition.

Once these dashboards are trusted in daily use, the hand-coded `/admin/analytics` page can be retired to remove the "two definitions of revenue" maintenance risk — not done yet, left for the owner's call.

---

## 9. Phase 6 — Link it from the admin app ✅ coded, ⬜ not yet switched on

The code is already in place (`admin-nav-policy.ts` + `AdminNav.tsx`) — a **"Metabase"** nav item, deliberately named after the tool rather than reusing the word "Analytics", since `/admin` already has its own separate, older, hand-coded **"Analytics"** page (`/admin/analytics`) — the two are distinct and shouldn't be confused. It's visible only to `superadmin, admin, finance, medical_ops, operator`, opens in a new tab, and stays **hidden** until one Vercel env var is set:

```
NEXT_PUBLIC_METABASE_URL=https://analytics.aneeshealth.com
```

Set it in the Vercel project settings and redeploy. No embedding, no CSP change needed — it's a plain link, not an iframe.

---

## 10. Phase 7 — Operate it ⬜ backup cron not yet installed

| Task | Cadence | Notes |
|---|---|---|
| Back up Metabase's **metadata DB** | daily | Run [`deploy/metabase/backup-metabase-metadata.sh`](../deploy/metabase/backup-metabase-metadata.sh) via cron (`0 2 * * *`). Backs up Metabase's own settings container (`anees-metabase-db`) — never the patient database. Keep the **encryption key** escrowed separately — a dump is useless without it. |
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

## 14. Definition of done (whole project) — status as of 2026-07-20

- [x] Read-only user provably cannot read `public` or write anything (§4.3) — proven against production.
- [x] Metabase reachable only at `https://analytics.aneeshealth.com`, valid TLS, public sharing off.
- [ ] Google SSO on; non-admins are query-builder-only; each group sees only its collection. *(No SSO, no groups yet — only the owner admin account exists.)*
- [x] Core dashboards live, with documented, app-matching metric definitions — 3 dashboards, 10 charts, branded.
- [ ] Nav link live for the allowed roles. *(Coded; `NEXT_PUBLIC_METABASE_URL` not yet set in Vercel.)*
- [ ] Daily metadata backup running; encryption key escrowed. *(Script ready; cron not yet installed.)*
- [x] Stale "OVH Bahrain / Cloudflare edge" references corrected in the other docs.
- [ ] Schema sync restricted to `bi` only (currently "all" — see §7 open item; PHI protection is unaffected either way, this is a cleanliness item).
