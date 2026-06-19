-- Phase 5: clinician public-profile change requests. Additive — a brand-new
-- table only, no changes to existing tables. Idempotent so a re-run is safe.

CREATE TABLE IF NOT EXISTS "profile_change_requests" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "headline" TEXT,
  "bioEn" TEXT,
  "bioAr" TEXT,
  "specialties" TEXT,
  "languages" TEXT,
  "photoUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewedByStaffId" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "tenantId" TEXT NOT NULL DEFAULT 'platform',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "profile_change_requests_staffId_idx" ON "profile_change_requests"("staffId");
CREATE INDEX IF NOT EXISTS "profile_change_requests_status_idx" ON "profile_change_requests"("status");
CREATE INDEX IF NOT EXISTS "profile_change_requests_tenantId_idx" ON "profile_change_requests"("tenantId");
