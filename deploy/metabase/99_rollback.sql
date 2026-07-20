-- =============================================================================
-- Anees Health · Metabase · Phase 1 ROLLBACK (full, clean teardown)
-- =============================================================================
-- Removes everything 01 + 02 created. Run as the database owner / superuser.
-- Safe: it only drops the `bi` schema and the two Metabase roles — it never
-- touches `public` or any real data.
-- =============================================================================

BEGIN;

-- Drop the read-only surface (views only live here).
DROP SCHEMA IF EXISTS bi CASCADE;

-- Remove the roles. DROP OWNED first clears any residual grants they hold.
DROP OWNED BY metabase_bi;
DROP OWNED BY metabase_ro;
DROP ROLE IF EXISTS metabase_bi;
DROP ROLE IF EXISTS metabase_ro;

COMMIT;
