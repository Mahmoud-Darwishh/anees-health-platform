-- Phase A/B nursing foundations:
-- 1) MAR and incident workflows remain FHIR-native
-- 2) Add operational nurse shift assignment table
-- 3) Add per-patient handoff geofence override and temporary-away flags

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'NurseShiftAssignmentStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "NurseShiftAssignmentStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

ALTER TABLE "patients"
  ADD COLUMN IF NOT EXISTS "handoffGeofenceRadiusMeters" INTEGER,
  ADD COLUMN IF NOT EXISTS "temporarilyAwayUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "temporarilyAwayNote" TEXT;

CREATE TABLE IF NOT EXISTS "nurse_shift_assignments" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "primaryNurseStaffId" TEXT NOT NULL,
  "shiftStartAt" TIMESTAMP(3) NOT NULL,
  "shiftEndAt" TIMESTAMP(3) NOT NULL,
  "status" "NurseShiftAssignmentStatus" NOT NULL DEFAULT 'scheduled',
  "incomingNurseStaffId" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "escalationTaskId" TEXT,
  "notes" TEXT,
  "createdByStaffId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "nurse_shift_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "nurse_shift_assignments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "nurse_shift_assignments_primaryNurseStaffId_fkey" FOREIGN KEY ("primaryNurseStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "nurse_shift_assignments_incomingNurseStaffId_fkey" FOREIGN KEY ("incomingNurseStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "nurse_shift_assignments_patientId_shiftStartAt_idx"
  ON "nurse_shift_assignments"("patientId", "shiftStartAt");

CREATE INDEX IF NOT EXISTS "nurse_shift_assignments_primaryNurseStaffId_shiftStartAt_idx"
  ON "nurse_shift_assignments"("primaryNurseStaffId", "shiftStartAt");

CREATE INDEX IF NOT EXISTS "nurse_shift_assignments_incomingNurseStaffId_acknowledgedAt_idx"
  ON "nurse_shift_assignments"("incomingNurseStaffId", "acknowledgedAt");
