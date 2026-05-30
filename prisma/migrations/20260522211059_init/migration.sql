-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "DnrStatus" AS ENUM ('full_code', 'dnr', 'unknown');

-- CreateEnum
CREATE TYPE "FamilyStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "InvoiceLinkedType" AS ENUM ('visit', 'care_plan');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('issued', 'partial', 'paid', 'overdue', 'cancelled');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'ar');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('single', 'married', 'divorced', 'widowed', 'separated', 'other');

-- CreateEnum
CREATE TYPE "OnlineBookingStatus" AS ENUM ('pending', 'payment_pending', 'payment_completed', 'payment_failed', 'confirmed', 'cancelled', 'converted', 'refunded');

-- CreateEnum
CREATE TYPE "OnlinePackageType" AS ENUM ('haraka', 'wai', 'amal', 'sanad');

-- CreateEnum
CREATE TYPE "OnlineServiceType" AS ENUM ('doctorVisit', 'physiotherapy', 'nursing');

-- CreateEnum
CREATE TYPE "OnlineVisitType" AS ENUM ('homeVisit', 'telemedicine', 'package');

-- CreateEnum
CREATE TYPE "PatientGender" AS ENUM ('M', 'F', 'other');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('new', 'active', 'lapsed', 'inactive');

-- CreateEnum
CREATE TYPE "PromocodeKind" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "ProviderPaymentType" AS ENUM ('per_visit', 'package', 'salary', 'commission');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('active', 'inactive', 'on_leave');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('active', 'inactive', 'discontinued');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('superadmin', 'admin', 'operator', 'finance', 'viewer', 'doctor', 'physiotherapist', 'nurse');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('patient', 'staff');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('in_home', 'telemedicine');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "governorate" TEXT NOT NULL,
    "serviceActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changedFields" JSONB,
    "previousData" JSONB,
    "newData" JSONB,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_prices" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceEgp" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalVisitsPlanned" INTEGER NOT NULL,
    "totalPriceEgp" DECIMAL(10,2) NOT NULL,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "iconClass" TEXT NOT NULL,
    "landingSlug" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "content_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_checks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "covered" BOOLEAN NOT NULL,
    "areaName" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "coverage_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "gender" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL,
    "successRate" TEXT NOT NULL,
    "avgWaitTime" TEXT NOT NULL,
    "totalPatients" TEXT NOT NULL,
    "availabilityStatus" TEXT NOT NULL,
    "availabilityBadgeClass" TEXT NOT NULL,
    "specialityColorClass" TEXT NOT NULL,
    "specialityTextClass" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "languages" JSONB NOT NULL,
    "clinics" JSONB NOT NULL,
    "areaCoverage" JSONB NOT NULL,
    "clinicDetails" JSONB NOT NULL,
    "testimonials" JSONB NOT NULL,
    "workHistory" JSONB,
    "priceTelemedicine" TEXT NOT NULL,
    "priceHomeVisit" TEXT NOT NULL,
    "priceClinicVisit" TEXT NOT NULL,
    "consultationFee" TEXT NOT NULL,
    "maxConsultationFee" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "specialityEn" TEXT NOT NULL,
    "professionalTitleEn" TEXT NOT NULL,
    "bioEn" TEXT,
    "certificationsEn" JSONB NOT NULL,
    "educationEn" JSONB NOT NULL,
    "nameAr" TEXT NOT NULL,
    "specialityAr" TEXT NOT NULL,
    "professionalTitleAr" TEXT NOT NULL,
    "bioAr" TEXT,
    "certificationsAr" JSONB NOT NULL,
    "educationAr" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expenseDate" DATE NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategory" TEXT,
    "vendorPayee" TEXT,
    "amountEgp" DECIMAL(10,2) NOT NULL,
    "paymentMethodId" TEXT,
    "linkedVisitId" TEXT,
    "linkedProviderId" TEXT,
    "receiptRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "primaryContactName" TEXT,
    "primaryContactPhone" TEXT,
    "relationToPatients" TEXT,
    "areaId" TEXT,
    "registrationDate" DATE NOT NULL,
    "status" "FamilyStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "invoiceDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedType" "InvoiceLinkedType" NOT NULL,
    "linkedVisitId" TEXT,
    "linkedCarePlanId" TEXT,
    "grossAmountEgp" DECIMAL(10,2) NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "netAmountEgp" DECIMAL(10,2) NOT NULL,
    "dueDate" DATE,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'issued',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_bookings" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "visitType" "OnlineVisitType" NOT NULL,
    "serviceType" "OnlineServiceType",
    "specialty" TEXT,
    "packageType" "OnlinePackageType",
    "preferredDate" DATE,
    "timePreference" TEXT,
    "sessionCount" TEXT,
    "caseType" TEXT,
    "nursingType" TEXT,
    "nursingHoursPerDay" TEXT,
    "nursingDuration" TEXT,
    "amountEgp" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "status" "OnlineBookingStatus" NOT NULL DEFAULT 'pending',
    "kashierSessionId" TEXT,
    "kashierOrderId" TEXT,
    "kashierTransactionId" TEXT,
    "paymentCompletedAt" TIMESTAMP(3),
    "convertedVisitId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "locale" "Locale" NOT NULL DEFAULT 'ar',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "baseAmountEgp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "confirmationSentAt" TIMESTAMP(3),
    "discountEgp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "promocodeCode" TEXT,
    "promocodeId" TEXT,
    "packageDuration" TEXT,

    CONSTRAINT "online_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "familyId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" "PatientGender",
    "dateOfBirth" DATE,
    "areaId" TEXT,
    "addressDetail" TEXT,
    "registrationDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "primaryCaregiver" TEXT,
    "caregiverRelation" TEXT,
    "chiefComplaint" TEXT,
    "referralSourceId" TEXT,
    "status" "PatientStatus" NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "addressMapUrl" TEXT,
    "arabicName" TEXT,
    "bloodGroup" "BloodGroup",
    "dnrStatus" "DnrStatus",
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "gpsLatitude" DECIMAL(10,7),
    "gpsLongitude" DECIMAL(10,7),
    "insuranceExpiry" DATE,
    "insuranceMemberId" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceProvider" TEXT,
    "landmark" TEXT,
    "maritalStatus" "MaritalStatus",
    "nationalId" TEXT,
    "occupation" TEXT,
    "passportNumber" TEXT,
    "preferredLanguage" "Locale",
    "primaryCaregiverEmail" TEXT,
    "primaryCaregiverPhone" TEXT,
    "primaryCaregiverWhatsapp" TEXT,
    "religion" TEXT,
    "medplumPatientId" TEXT,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountEgp" DECIMAL(10,2) NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "receivedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promocodes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "kind" "PromocodeKind" NOT NULL DEFAULT 'percentage',
    "value" DECIMAL(10,2) NOT NULL,
    "minAmountEgp" DECIMAL(10,2),
    "maxDiscountEgp" DECIMAL(10,2),
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promocodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_payouts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "payoutDate" DATE NOT NULL,
    "totalVisits" INTEGER NOT NULL,
    "grossAmountEgp" DECIMAL(10,2) NOT NULL,
    "deductionsEgp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmountEgp" DECIMAL(10,2) NOT NULL,
    "paymentMethodId" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "specialty" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "joiningDate" DATE NOT NULL,
    "paymentType" "ProviderPaymentType" NOT NULL DEFAULT 'per_visit',
    "baseRateEgp" DECIMAL(10,2) NOT NULL,
    "commissionPct" DECIMAL(5,2),
    "primaryAreaId" TEXT,
    "status" "ProviderStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'ar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultProviderRole" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "requiredRoleId" TEXT,
    "durationMins" INTEGER NOT NULL,
    "listPriceEgp" DECIMAL(10,2) NOT NULL,
    "defaultProviderPayoutEgp" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'viewer',
    "status" "StaffStatus" NOT NULL DEFAULT 'active',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT,
    "medplumPractitionerId" TEXT,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'patient',
    "patientId" TEXT,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT,
    "serviceId" TEXT NOT NULL,
    "carePlanId" TEXT,
    "bookedDate" DATE NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TEXT,
    "completedDatetime" TIMESTAMP(3),
    "durationActualMin" INTEGER,
    "status" "VisitStatus" NOT NULL DEFAULT 'scheduled',
    "areaId" TEXT,
    "visitType" "VisitType" NOT NULL DEFAULT 'in_home',
    "servicePriceEgp" DECIMAL(10,2) NOT NULL,
    "discountEgp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netPriceEgp" DECIMAL(10,2) NOT NULL,
    "providerPayoutEgp" DECIMAL(10,2) NOT NULL,
    "patientRating" INTEGER,
    "bookedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "areas_code_key" ON "areas"("code" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_changedAt_idx" ON "audit_logs"("changedAt" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_changedBy_idx" ON "audit_logs"("changedBy" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_tableName_recordId_idx" ON "audit_logs"("tableName" ASC, "recordId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "booking_prices_key_key" ON "booking_prices"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "care_plans_code_key" ON "care_plans"("code" ASC);

-- CreateIndex
CREATE INDEX "care_plans_patientId_idx" ON "care_plans"("patientId" ASC);

-- CreateIndex
CREATE INDEX "care_plans_status_idx" ON "care_plans"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "content_services_code_key" ON "content_services"("code" ASC);

-- CreateIndex
CREATE INDEX "coverage_checks_areaName_idx" ON "coverage_checks"("areaName" ASC);

-- CreateIndex
CREATE INDEX "coverage_checks_covered_idx" ON "coverage_checks"("covered" ASC);

-- CreateIndex
CREATE INDEX "coverage_checks_createdAt_idx" ON "coverage_checks"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "doctors_isActive_idx" ON "doctors"("isActive" ASC);

-- CreateIndex
CREATE INDEX "doctors_slug_idx" ON "doctors"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "doctors_slug_key" ON "doctors"("slug" ASC);

-- CreateIndex
CREATE INDEX "doctors_specialityEn_idx" ON "doctors"("specialityEn" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_code_key" ON "expense_categories"("code" ASC);

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_code_key" ON "expenses"("code" ASC);

-- CreateIndex
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate" ASC);

-- CreateIndex
CREATE INDEX "expenses_linkedProviderId_idx" ON "expenses"("linkedProviderId" ASC);

-- CreateIndex
CREATE INDEX "expenses_linkedVisitId_idx" ON "expenses"("linkedVisitId" ASC);

-- CreateIndex
CREATE INDEX "families_areaId_idx" ON "families"("areaId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "families_code_key" ON "families"("code" ASC);

-- CreateIndex
CREATE INDEX "families_status_idx" ON "families"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_code_key" ON "invoices"("code" ASC);

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate" ASC);

-- CreateIndex
CREATE INDEX "invoices_linkedCarePlanId_idx" ON "invoices"("linkedCarePlanId" ASC);

-- CreateIndex
CREATE INDEX "invoices_linkedVisitId_idx" ON "invoices"("linkedVisitId" ASC);

-- CreateIndex
CREATE INDEX "invoices_patientId_idx" ON "invoices"("patientId" ASC);

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status" ASC);

-- CreateIndex
CREATE INDEX "online_bookings_bookingRef_idx" ON "online_bookings"("bookingRef" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "online_bookings_bookingRef_key" ON "online_bookings"("bookingRef" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "online_bookings_convertedVisitId_key" ON "online_bookings"("convertedVisitId" ASC);

-- CreateIndex
CREATE INDEX "online_bookings_createdAt_idx" ON "online_bookings"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "online_bookings_phoneNumber_idx" ON "online_bookings"("phoneNumber" ASC);

-- CreateIndex
CREATE INDEX "online_bookings_promocodeId_idx" ON "online_bookings"("promocodeId" ASC);

-- CreateIndex
CREATE INDEX "online_bookings_status_idx" ON "online_bookings"("status" ASC);

-- CreateIndex
CREATE INDEX "patients_areaId_idx" ON "patients"("areaId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "patients_code_key" ON "patients"("code" ASC);

-- CreateIndex
CREATE INDEX "patients_familyId_idx" ON "patients"("familyId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "patients_medplumPatientId_key" ON "patients"("medplumPatientId" ASC);

-- CreateIndex
CREATE INDEX "patients_nationalId_idx" ON "patients"("nationalId" ASC);

-- CreateIndex
CREATE INDEX "patients_passportNumber_idx" ON "patients"("passportNumber" ASC);

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone" ASC);

-- CreateIndex
CREATE INDEX "patients_referralSourceId_idx" ON "patients"("referralSourceId" ASC);

-- CreateIndex
CREATE INDEX "patients_status_idx" ON "patients"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_code_key" ON "payments"("code" ASC);

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId" ASC);

-- CreateIndex
CREATE INDEX "payments_patientId_idx" ON "payments"("patientId" ASC);

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "promocodes_code_key" ON "promocodes"("code" ASC);

-- CreateIndex
CREATE INDEX "promocodes_isActive_expiresAt_idx" ON "promocodes"("isActive" ASC, "expiresAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "provider_payouts_code_key" ON "provider_payouts"("code" ASC);

-- CreateIndex
CREATE INDEX "provider_payouts_payoutDate_idx" ON "provider_payouts"("payoutDate" ASC);

-- CreateIndex
CREATE INDEX "provider_payouts_providerId_idx" ON "provider_payouts"("providerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "provider_roles_code_key" ON "provider_roles"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "providers_code_key" ON "providers"("code" ASC);

-- CreateIndex
CREATE INDEX "providers_primaryAreaId_idx" ON "providers"("primaryAreaId" ASC);

-- CreateIndex
CREATE INDEX "providers_roleId_idx" ON "providers"("roleId" ASC);

-- CreateIndex
CREATE INDEX "providers_status_idx" ON "providers"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "push_subscriptions_locale_idx" ON "push_subscriptions"("locale" ASC);

-- CreateIndex
CREATE INDEX "rate_limits_expiresAt_idx" ON "rate_limits"("expiresAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "referral_sources_code_key" ON "referral_sources"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_code_key" ON "service_categories"("code" ASC);

-- CreateIndex
CREATE INDEX "services_categoryId_idx" ON "services"("categoryId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code" ASC);

-- CreateIndex
CREATE INDEX "services_status_idx" ON "services"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "specialties_code_key" ON "specialties"("code" ASC);

-- CreateIndex
CREATE INDEX "specialties_isActive_sortOrder_idx" ON "specialties"("isActive" ASC, "sortOrder" ASC);

-- CreateIndex
CREATE INDEX "staff_email_idx" ON "staff"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email" ASC);

-- CreateIndex
CREATE INDEX "staff_medplumPractitionerId_idx" ON "staff"("medplumPractitionerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_medplumPractitionerId_key" ON "staff"("medplumPractitionerId" ASC);

-- CreateIndex
CREATE INDEX "staff_providerId_idx" ON "staff"("providerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_providerId_key" ON "staff"("providerId" ASC);

-- CreateIndex
CREATE INDEX "staff_role_idx" ON "staff"("role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_patientId_key" ON "users"("patientId" ASC);

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone" ASC);

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_staffId_key" ON "users"("staffId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "visits_areaId_idx" ON "visits"("areaId" ASC);

-- CreateIndex
CREATE INDEX "visits_carePlanId_idx" ON "visits"("carePlanId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "visits_code_key" ON "visits"("code" ASC);

-- CreateIndex
CREATE INDEX "visits_patientId_idx" ON "visits"("patientId" ASC);

-- CreateIndex
CREATE INDEX "visits_providerId_idx" ON "visits"("providerId" ASC);

-- CreateIndex
CREATE INDEX "visits_scheduledDate_idx" ON "visits"("scheduledDate" ASC);

-- CreateIndex
CREATE INDEX "visits_serviceId_idx" ON "visits"("serviceId" ASC);

-- CreateIndex
CREATE INDEX "visits_status_idx" ON "visits"("status" ASC);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_linkedProviderId_fkey" FOREIGN KEY ("linkedProviderId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_linkedVisitId_fkey" FOREIGN KEY ("linkedVisitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_linkedCarePlanId_fkey" FOREIGN KEY ("linkedCarePlanId") REFERENCES "care_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_linkedVisitId_fkey" FOREIGN KEY ("linkedVisitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_bookings" ADD CONSTRAINT "online_bookings_convertedVisitId_fkey" FOREIGN KEY ("convertedVisitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_bookings" ADD CONSTRAINT "online_bookings_promocodeId_fkey" FOREIGN KEY ("promocodeId") REFERENCES "promocodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_referralSourceId_fkey" FOREIGN KEY ("referralSourceId") REFERENCES "referral_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_payouts" ADD CONSTRAINT "provider_payouts_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_payouts" ADD CONSTRAINT "provider_payouts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_primaryAreaId_fkey" FOREIGN KEY ("primaryAreaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "provider_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_requiredRoleId_fkey" FOREIGN KEY ("requiredRoleId") REFERENCES "provider_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

