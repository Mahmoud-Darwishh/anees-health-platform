-- Drop the Home Exercise Program (HEP) workspace.
-- The HEP suite was scaffolded ahead of clinical protocols; product direction
-- is to remove it until proper protocols and guidelines exist. These tables
-- were never created via a prior migration (they may have been pushed via
-- `prisma db push` during scaffolding), so every DROP is guarded with IF EXISTS.

DROP TABLE IF EXISTS "hep_reminder_states" CASCADE;
DROP TABLE IF EXISTS "hep_adherence_entries" CASCADE;
DROP TABLE IF EXISTS "patient_hep_items" CASCADE;
DROP TABLE IF EXISTS "patient_heps" CASCADE;
DROP TABLE IF EXISTS "exercises" CASCADE;

DROP TYPE IF EXISTS "HEPStatus";
