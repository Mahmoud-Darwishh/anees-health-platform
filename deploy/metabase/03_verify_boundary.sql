-- =============================================================================
-- Anees Health · Metabase · Phase 1 verification — PROVE the boundary
-- =============================================================================
-- Run this CONNECTED AS `metabase_bi` (NOT as the owner):
--
--   psql "host=127.0.0.1 port=5432 dbname=anees_health user=metabase_bi \
--         password=... sslmode=require" -f 03_verify_boundary.sql
--
-- Phase 1 is DONE only when the ✅ query returns a number and EVERY ❌ query
-- fails with "permission denied" / "read-only transaction". If any ❌ succeeds,
-- STOP — the boundary is broken and Metabase must not be connected yet.
-- =============================================================================

-- ✅ MUST SUCCEED — the masked views are readable.
SELECT count(*) AS patients_visible_via_bi FROM bi.patients_safe;
SELECT count(*) AS bookings_visible_via_bi FROM bi.bookings_safe;

-- 👁  Eyeball: confirm NO name/phone/nationalId/GPS column is present.
SELECT * FROM bi.patients_safe LIMIT 3;

-- ❌ MUST FAIL — cannot read raw PHI tables in public.
SELECT * FROM public.patients LIMIT 1;      -- expect: permission denied for table patients
SELECT * FROM public.audit_logs LIMIT 1;    -- expect: permission denied for table audit_logs
SELECT * FROM public.staff LIMIT 1;         -- expect: permission denied for table staff
SELECT * FROM public.visit_location_pings LIMIT 1;  -- expect: permission denied

-- ❌ MUST FAIL — cannot write anywhere (read-only).
UPDATE bi.invoices_safe SET "status" = 'paid';  -- expect: cannot ... in a read-only transaction / not updatable
CREATE TABLE bi.should_not_exist (i int);        -- expect: permission denied for schema bi
INSERT INTO public.payments (id) VALUES ('x');   -- expect: permission denied for table payments
