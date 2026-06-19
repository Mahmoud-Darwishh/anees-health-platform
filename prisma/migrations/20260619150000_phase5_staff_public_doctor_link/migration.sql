-- Phase 5: link a clinician Staff record to a public Doctor profile so an
-- approved profile-change-request can publish to the public site. Additive +
-- idempotent — a single nullable column, no changes to existing data.

ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "publicDoctorId" INTEGER;
