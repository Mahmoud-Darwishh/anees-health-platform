-- Recreated missing migration referenced by target database history.
-- Keeps local migration directory aligned with applied production migration id.

ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "doctorCode" TEXT;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

UPDATE "doctors"
SET "doctorCode" = COALESCE("doctorCode", CONCAT('DOC-', LPAD(CAST("id" AS TEXT), 4, '0')))
WHERE "doctorCode" IS NULL OR "doctorCode" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "doctors_doctorCode_key" ON "doctors"("doctorCode");
CREATE INDEX IF NOT EXISTS "doctors_isActive_sortOrder_idx" ON "doctors"("isActive", "sortOrder");
