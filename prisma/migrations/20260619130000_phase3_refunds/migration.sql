-- Phase 3: refunds ledger. Additive — a brand-new table only, no changes to
-- existing tables. Idempotent so a re-run is safe.

CREATE TABLE IF NOT EXISTS "refunds" (
  "id" TEXT NOT NULL,
  "bookingRef" TEXT NOT NULL,
  "patientId" TEXT,
  "amountPaidEgp" DECIMAL(10,2) NOT NULL,
  "feeEgp" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "refundEgp" DECIMAL(10,2) NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "reasonNote" TEXT,
  "method" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requestedByStaffId" TEXT,
  "completedAt" TIMESTAMP(3),
  "tenantId" TEXT NOT NULL DEFAULT 'platform',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "refunds_bookingRef_idx" ON "refunds"("bookingRef");
CREATE INDEX IF NOT EXISTS "refunds_status_idx" ON "refunds"("status");
CREATE INDEX IF NOT EXISTS "refunds_tenantId_idx" ON "refunds"("tenantId");
