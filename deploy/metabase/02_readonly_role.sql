-- =============================================================================
-- Anees Health · Metabase · Phase 1 (part 2 of 2): the read-only login
-- =============================================================================
-- Creates the ONLY database identity Metabase ever uses:
--   • role  `metabase_ro`  — bundles the read privileges (NOLOGIN)
--   • user  `metabase_bi`  — the login Metabase connects with
--
-- It can CONNECT, can SELECT ONLY the `bi` schema (the masked views), and can do
-- nothing else — no writes, no DDL, no `public`, no other schema. Run as the
-- database owner / a superuser AFTER 01_bi_schema_and_views.sql.
--
-- SET THE PASSWORD before running (replace the placeholder). Use a long random
-- value, e.g.  openssl rand -base64 32
-- =============================================================================

BEGIN;

-- Role + login user, created idempotently so this file is safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metabase_ro') THEN
    CREATE ROLE metabase_ro NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metabase_bi') THEN
    CREATE ROLE metabase_bi LOGIN PASSWORD '__SET_A_STRONG_RANDOM_PASSWORD__';
  END IF;
END
$$;

GRANT metabase_ro TO metabase_bi;

-- Reach the database, and USE + READ only the bi schema.
GRANT CONNECT ON DATABASE anees_health TO metabase_ro;   -- adjust DB name if different
GRANT USAGE  ON SCHEMA bi TO metabase_ro;
GRANT SELECT  ON ALL TABLES IN SCHEMA bi TO metabase_ro;  -- views count as "tables"

-- Any future bi view is auto-readable (so new reports don't silently break),
-- but still ONLY in bi.
ALTER DEFAULT PRIVILEGES IN SCHEMA bi GRANT SELECT ON TABLES TO metabase_ro;

-- Hard guarantees:
--  • read-only at the transaction level (defence in depth on top of "no write grants")
ALTER ROLE metabase_ro SET default_transaction_read_only = on;
--  • kill runaway queries so a heavy dashboard can't hurt the shared prod DB
ALTER ROLE metabase_bi SET statement_timeout = '60s';
ALTER ROLE metabase_bi SET idle_in_transaction_session_timeout = '30s';

-- NOTE: we deliberately grant NOTHING on schema `public`. Even though every role
-- inherits the built-in PUBLIC pseudo-role's USAGE on `public`, no SELECT is
-- granted on the base tables, so metabase_ro cannot read a single row of raw PHI.
-- 03_verify_boundary.sql proves this.

COMMIT;

-- Next: run 03_verify_boundary.sql AS metabase_bi and confirm the ❌ checks fail.
