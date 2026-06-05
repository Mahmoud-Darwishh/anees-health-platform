-- Matrix foundations: insurance, claims, controlled substances, and visit location pings

DO $$ BEGIN
  CREATE TYPE "CoverageStatus" AS ENUM ('active', 'inactive', 'expired', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PriorAuthStatus" AS ENUM ('draft', 'submitted', 'approved', 'denied', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClaimStatus" AS ENUM ('draft', 'submitted', 'adjudicating', 'paid', 'partially_paid', 'denied', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClaimLineStatus" AS ENUM ('pending', 'approved', 'denied');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ControlledSubstanceAction" AS ENUM ('prescribed', 'administered', 'reconciled', 'wasted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "insurer_profiles" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "payerType" TEXT,
  "supportsDirectBilling" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "insurer_profiles_code_key" ON "insurer_profiles"("code");
CREATE INDEX IF NOT EXISTS "insurer_profiles_isActive_idx" ON "insurer_profiles"("isActive");

CREATE TABLE IF NOT EXISTS "coverages" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "insurerProfileId" TEXT,
  "memberId" TEXT,
  "policyNumber" TEXT,
  "planName" TEXT,
  "status" "CoverageStatus" NOT NULL DEFAULT 'active',
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "metadata" JSONB,
  "tenantId" TEXT NOT NULL DEFAULT 'platform',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coverages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "coverages_patientId_status_idx" ON "coverages"("patientId", "status");
CREATE INDEX IF NOT EXISTS "coverages_insurerProfileId_idx" ON "coverages"("insurerProfileId");
CREATE INDEX IF NOT EXISTS "coverages_tenantId_idx" ON "coverages"("tenantId");

CREATE TABLE IF NOT EXISTS "prior_auths" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "insurerProfileId" TEXT,
  "referenceNumber" TEXT,
  "requestedFor" TEXT,
  "status" "PriorAuthStatus" NOT NULL DEFAULT 'draft',
  "submittedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "tenantId" TEXT NOT NULL DEFAULT 'platform',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "prior_auths_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "prior_auths_patientId_status_idx" ON "prior_auths"("patientId", "status");
CREATE INDEX IF NOT EXISTS "prior_auths_insurerProfileId_idx" ON "prior_auths"("insurerProfileId");
CREATE INDEX IF NOT EXISTS "prior_auths_tenantId_idx" ON "prior_auths"("tenantId");

CREATE TABLE IF NOT EXISTS "claims" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "insurerProfileId" TEXT,
  "priorAuthId" TEXT,
  "status" "ClaimStatus" NOT NULL DEFAULT 'draft',
  "submittedAt" TIMESTAMP(3),
  "adjudicatedAt" TIMESTAMP(3),
  "totalAmountEgp" DECIMAL(10,2) NOT NULL,
  "approvedAmountEgp" DECIMAL(10,2),
  "deniedReason" TEXT,
  "tenantId" TEXT NOT NULL DEFAULT 'platform',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "claims_code_key" ON "claims"("code");
CREATE INDEX IF NOT EXISTS "claims_patientId_status_idx" ON "claims"("patientId", "status");
CREATE INDEX IF NOT EXISTS "claims_visitId_idx" ON "claims"("visitId");
CREATE INDEX IF NOT EXISTS "claims_insurerProfileId_idx" ON "claims"("insurerProfileId");
CREATE INDEX IF NOT EXISTS "claims_priorAuthId_idx" ON "claims"("priorAuthId");
CREATE INDEX IF NOT EXISTS "claims_tenantId_idx" ON "claims"("tenantId");

CREATE TABLE IF NOT EXISTS "claim_line_items" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "serviceCode" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPriceEgp" DECIMAL(10,2) NOT NULL,
  "amountEgp" DECIMAL(10,2) NOT NULL,
  "status" "ClaimLineStatus" NOT NULL DEFAULT 'pending',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "claim_line_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "claim_line_items_claimId_idx" ON "claim_line_items"("claimId");
CREATE INDEX IF NOT EXISTS "claim_line_items_status_idx" ON "claim_line_items"("status");

CREATE TABLE IF NOT EXISTS "visit_location_pings" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "pingedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "accuracyMeters" INTEGER,
  "speedMetersPerSec" DECIMAL(8,3),
  "headingDegrees" DECIMAL(6,2),
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visit_location_pings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "visit_location_pings_visitId_pingedAt_idx" ON "visit_location_pings"("visitId", "pingedAt");

CREATE TABLE IF NOT EXISTS "controlled_substance_ledger" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "medicationName" TEXT NOT NULL,
  "dosage" TEXT,
  "route" TEXT,
  "quantity" DECIMAL(10,3),
  "unit" TEXT,
  "actionType" "ControlledSubstanceAction" NOT NULL,
  "referenceNumber" TEXT,
  "recordedBy" TEXT,
  "notes" TEXT,
  "tenantId" TEXT NOT NULL DEFAULT 'platform',
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "controlled_substance_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "controlled_substance_ledger_patientId_occurredAt_idx" ON "controlled_substance_ledger"("patientId", "occurredAt");
CREATE INDEX IF NOT EXISTS "controlled_substance_ledger_visitId_idx" ON "controlled_substance_ledger"("visitId");
CREATE INDEX IF NOT EXISTS "controlled_substance_ledger_tenantId_idx" ON "controlled_substance_ledger"("tenantId");
CREATE INDEX IF NOT EXISTS "controlled_substance_ledger_actionType_idx" ON "controlled_substance_ledger"("actionType");

DO $$ BEGIN
  ALTER TABLE "coverages"
    ADD CONSTRAINT "coverages_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "coverages"
    ADD CONSTRAINT "coverages_insurerProfileId_fkey"
    FOREIGN KEY ("insurerProfileId") REFERENCES "insurer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "prior_auths"
    ADD CONSTRAINT "prior_auths_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "prior_auths"
    ADD CONSTRAINT "prior_auths_insurerProfileId_fkey"
    FOREIGN KEY ("insurerProfileId") REFERENCES "insurer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "claims"
    ADD CONSTRAINT "claims_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "claims"
    ADD CONSTRAINT "claims_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "claims"
    ADD CONSTRAINT "claims_insurerProfileId_fkey"
    FOREIGN KEY ("insurerProfileId") REFERENCES "insurer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "claims"
    ADD CONSTRAINT "claims_priorAuthId_fkey"
    FOREIGN KEY ("priorAuthId") REFERENCES "prior_auths"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "claim_line_items"
    ADD CONSTRAINT "claim_line_items_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "visit_location_pings"
    ADD CONSTRAINT "visit_location_pings_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "controlled_substance_ledger"
    ADD CONSTRAINT "controlled_substance_ledger_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "controlled_substance_ledger"
    ADD CONSTRAINT "controlled_substance_ledger_visitId_fkey"
    FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
