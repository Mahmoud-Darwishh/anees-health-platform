-- Fast case-insensitive substring search for the ICD-10 problem picker.
-- A GIN trigram index makes `display ILIKE '%term%'` index-accelerated instead
-- of a sequential scan over ~71k rows.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "icd10_codes_display_trgm_idx"
  ON "icd10_codes" USING gin ("display" gin_trgm_ops);
