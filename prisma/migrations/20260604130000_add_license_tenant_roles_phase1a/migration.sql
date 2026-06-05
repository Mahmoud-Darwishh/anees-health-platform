-- Phase 1A: additive role, audit, tenant, and field-ops foundation changes.
-- Backward-compatible by keeping legacy roles (operator, finance) for now.

-- Extend existing enums.
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'medical_ops';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'insurance_coordinator';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'compliance_officer';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'hospital_partner_admin';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'read';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'override';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'export';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'access_denied';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'login';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'logout';

-- New enums.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantStatus') THEN
    CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended', 'archived');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LicenseType') THEN
    CREATE TYPE "LicenseType" AS ENUM (
      'medical_syndicate',
      'nursing_syndicate',
      'physiotherapy_syndicate',
      'pharmacy_syndicate',
      'none'
    );
  END IF;
END $$;

-- New tenant table.
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactEmail" TEXT,
  "status" "TenantStatus" NOT NULL DEFAULT 'active',
  "isPlatform" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_code_key" ON "tenants"("code");
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenants"("status");

-- Core tenant scoping columns.
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "providers" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "care_plans" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "online_bookings" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'platform';

CREATE INDEX IF NOT EXISTS "patients_tenantId_idx" ON "patients"("tenantId");
CREATE INDEX IF NOT EXISTS "providers_tenantId_idx" ON "providers"("tenantId");
CREATE INDEX IF NOT EXISTS "visits_tenantId_idx" ON "visits"("tenantId");
CREATE INDEX IF NOT EXISTS "care_plans_tenantId_idx" ON "care_plans"("tenantId");
CREATE INDEX IF NOT EXISTS "invoices_tenantId_idx" ON "invoices"("tenantId");
CREATE INDEX IF NOT EXISTS "online_bookings_tenantId_idx" ON "online_bookings"("tenantId");
CREATE INDEX IF NOT EXISTS "staff_tenantId_idx" ON "staff"("tenantId");

-- Staff license and role flags.
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "clinicalLicenseType" "LicenseType";
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "clinicalLicenseNumber" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "clinicalLicenseExpiry" TIMESTAMP(3);
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "licenseIssuingBody" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "isOnCall" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "isClinicalDirector" BOOLEAN NOT NULL DEFAULT false;

-- Visit lifecycle and geo-capture fields.
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "enRouteAt" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "checkInAt" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "checkInLat" DECIMAL(10,7);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "checkInLng" DECIMAL(10,7);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "checkInAccuracyM" INTEGER;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "checkOutAt" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "checkOutLat" DECIMAL(10,7);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "checkOutLng" DECIMAL(10,7);
