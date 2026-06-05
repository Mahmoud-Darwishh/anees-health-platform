/*
  Warnings:

  - You are about to drop the column `doctorCode` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `doctors` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VisitState" AS ENUM ('draft', 'scheduled', 'acknowledged', 'declined_by_physio', 'cancelled_by_patient', 'cancelled_by_med_ops', 'reassigned_to_other_physio', 'en_route', 'diverted_in_transit', 'arrived', 'refused_at_door', 'patient_not_home', 'checked_in', 'documenting', 'session_interrupted', 'rescheduled_in_place', 'signed', 'amended', 'checked_out', 'completed', 'disputed', 'force_closed_by_admin', 'abandoned');

-- CreateEnum
CREATE TYPE "VisitDisruptionCode" AS ENUM ('patient_late_cancel', 'patient_no_show', 'patient_refused_care', 'patient_hospitalised', 'patient_deceased', 'family_blocked_access', 'unsafe_environment', 'physio_personal_emergency', 'physio_vehicle_breakdown', 'physio_traffic_blocked', 'weather', 'med_ops_reassignment', 'equipment_failure', 'internet_blackout', 'other');

-- CreateEnum
CREATE TYPE "PhysioOnboardingState" AS ENUM ('invited', 'documents_pending', 'documents_submitted', 'interview_scheduled', 'trial_visit_scheduled', 'approved', 'suspended', 'off_boarded');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('in_progress', 'met', 'discontinued');

-- CreateEnum
CREATE TYPE "VisitParticipantRole" AS ENUM ('primary_clinician', 'secondary_clinician', 'observer', 'trainer', 'trainee', 'family_witness');

-- CreateEnum
CREATE TYPE "TrialVisitOutcome" AS ENUM ('pending', 'passed', 'failed', 'needs_re_trial');

-- DropIndex
DROP INDEX "doctors_doctorCode_key";

-- DropIndex
DROP INDEX "doctors_isActive_sortOrder_idx";

-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "doctorCode",
DROP COLUMN "sortOrder";

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "addressFidelity" TEXT,
ADD COLUMN     "addressVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "privacyTier" TEXT DEFAULT 'standard',
ADD COLUMN     "safetyFlags" JSONB,
ADD COLUMN     "temporarilyAwayAddress" TEXT;

-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "cashCollectedEgp" DECIMAL(10,2),
ADD COLUMN     "cashGratuityEgp" DECIMAL(10,2),
ADD COLUMN     "checkOutAccuracyM" INTEGER,
ADD COLUMN     "companionsPresent" JSONB,
ADD COLUMN     "consentReaffirmed" BOOLEAN,
ADD COLUMN     "geofenceOverrideMethod" TEXT,
ADD COLUMN     "geofencePassed" BOOLEAN,
ADD COLUMN     "identityConfirmedBy" TEXT,
ADD COLUMN     "overridePhotoMediaId" TEXT,
ADD COLUMN     "patientAcknowledgementMediaId" TEXT,
ADD COLUMN     "primaryDisruptionCode" "VisitDisruptionCode",
ADD COLUMN     "receiptDeliveryChannels" JSONB,
ADD COLUMN     "safetyClearance" BOOLEAN,
ADD COLUMN     "state" "VisitState" DEFAULT 'scheduled';

-- CreateTable
CREATE TABLE "physio_profiles" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "syndicateNumber" TEXT,
    "syndicateIssuedAt" TIMESTAMP(3),
    "syndicateExpiresAt" TIMESTAMP(3),
    "nationalId" TEXT,
    "passportNumber" TEXT,
    "yearsOfExperience" INTEGER,
    "degree" TEXT,
    "graduationYear" INTEGER,
    "postGradQualifications" JSONB,
    "certifications" JSONB,
    "specialties" JSONB,
    "languages" JSONB,
    "yearsInHomeCare" INTEGER,
    "onboardingState" "PhysioOnboardingState" NOT NULL DEFAULT 'invited',
    "documentsSubmittedAt" TIMESTAMP(3),
    "interviewedAt" TIMESTAMP(3),
    "trialVisitCompletedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByStaffId" TEXT,
    "primaryAreaCodes" JSONB,
    "preferredVisitTimes" JSONB,
    "maxVisitsPerDay" INTEGER,
    "canAcceptUrgent" BOOLEAN NOT NULL DEFAULT true,
    "bioEn" TEXT,
    "bioAr" TEXT,
    "publicPhotoUrl" TEXT,
    "publicSlug" TEXT,
    "publicRating" DECIMAL(3,2),
    "publicReviewCount" INTEGER NOT NULL DEFAULT 0,
    "publicVisitCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "acceptingNewPatients" BOOLEAN NOT NULL DEFAULT true,
    "outOfOfficeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physio_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_visit_scorecards" (
    "id" TEXT NOT NULL,
    "physioStaffId" TEXT NOT NULL,
    "scorerStaffId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "clinicalReasoning" INTEGER,
    "handsOnTechnique" INTEGER,
    "documentationCompleteness" INTEGER,
    "patientRapport" INTEGER,
    "timeManagement" INTEGER,
    "safetyAdherence" INTEGER,
    "professionalism" INTEGER,
    "meanScore" DECIMAL(3,2),
    "minDomainScore" INTEGER,
    "outcome" "TrialVisitOutcome" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trial_visit_scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_state_transitions" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "fromState" "VisitState",
    "toState" "VisitState" NOT NULL,
    "actorStaffId" TEXT,
    "actorPatientId" TEXT,
    "actorSystem" BOOLEAN NOT NULL DEFAULT false,
    "reasonCode" "VisitDisruptionCode",
    "reasonNote" TEXT,
    "contextJson" JSONB,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "accuracyMeters" INTEGER,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_state_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_participants" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" "VisitParticipantRole" NOT NULL DEFAULT 'primary_clinician',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_goals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "carePlanId" TEXT,
    "authorStaffId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "baselineValue" TEXT,
    "currentValue" TEXT,
    "targetValue" TEXT,
    "measurementUnit" TEXT,
    "targetDate" DATE,
    "status" "GoalStatus" NOT NULL DEFAULT 'in_progress',
    "metAt" TIMESTAMP(3),
    "discontinuedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "physio_profiles_staffId_key" ON "physio_profiles"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "physio_profiles_publicSlug_key" ON "physio_profiles"("publicSlug");

-- CreateIndex
CREATE INDEX "physio_profiles_onboardingState_idx" ON "physio_profiles"("onboardingState");

-- CreateIndex
CREATE INDEX "physio_profiles_isPublic_idx" ON "physio_profiles"("isPublic");

-- CreateIndex
CREATE INDEX "trial_visit_scorecards_physioStaffId_idx" ON "trial_visit_scorecards"("physioStaffId");

-- CreateIndex
CREATE INDEX "trial_visit_scorecards_scorerStaffId_idx" ON "trial_visit_scorecards"("scorerStaffId");

-- CreateIndex
CREATE INDEX "trial_visit_scorecards_outcome_idx" ON "trial_visit_scorecards"("outcome");

-- CreateIndex
CREATE INDEX "visit_state_transitions_visitId_createdAt_idx" ON "visit_state_transitions"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "visit_state_transitions_toState_idx" ON "visit_state_transitions"("toState");

-- CreateIndex
CREATE INDEX "visit_state_transitions_actorStaffId_idx" ON "visit_state_transitions"("actorStaffId");

-- CreateIndex
CREATE INDEX "visit_participants_staffId_idx" ON "visit_participants"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "visit_participants_visitId_staffId_key" ON "visit_participants"("visitId", "staffId");

-- CreateIndex
CREATE INDEX "patient_goals_patientId_status_idx" ON "patient_goals"("patientId", "status");

-- CreateIndex
CREATE INDEX "patient_goals_authorStaffId_idx" ON "patient_goals"("authorStaffId");

-- CreateIndex
CREATE INDEX "audit_logs_tableName_recordId_changedAt_idx" ON "audit_logs"("tableName", "recordId", "changedAt");

-- CreateIndex
CREATE INDEX "nurse_shift_assignments_escalationTaskId_idx" ON "nurse_shift_assignments"("escalationTaskId");

-- CreateIndex
CREATE INDEX "online_bookings_kashierTransactionId_idx" ON "online_bookings"("kashierTransactionId");

-- CreateIndex
CREATE INDEX "online_bookings_kashierSessionId_idx" ON "online_bookings"("kashierSessionId");

-- CreateIndex
CREATE INDEX "online_bookings_kashierOrderId_idx" ON "online_bookings"("kashierOrderId");

-- CreateIndex
CREATE INDEX "patients_deletedAt_idx" ON "patients"("deletedAt");

-- CreateIndex
CREATE INDEX "visits_state_idx" ON "visits"("state");

-- AddForeignKey
ALTER TABLE "physio_profiles" ADD CONSTRAINT "physio_profiles_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_visit_scorecards" ADD CONSTRAINT "trial_visit_scorecards_physioStaffId_fkey" FOREIGN KEY ("physioStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_visit_scorecards" ADD CONSTRAINT "trial_visit_scorecards_scorerStaffId_fkey" FOREIGN KEY ("scorerStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_state_transitions" ADD CONSTRAINT "visit_state_transitions_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_state_transitions" ADD CONSTRAINT "visit_state_transitions_actorStaffId_fkey" FOREIGN KEY ("actorStaffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_state_transitions" ADD CONSTRAINT "visit_state_transitions_actorPatientId_fkey" FOREIGN KEY ("actorPatientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_participants" ADD CONSTRAINT "visit_participants_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_participants" ADD CONSTRAINT "visit_participants_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_authorStaffId_fkey" FOREIGN KEY ("authorStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "destructive_approval_tokens_medplumPatientId_actionType_status_" RENAME TO "destructive_approval_tokens_medplumPatientId_actionType_sta_idx";
