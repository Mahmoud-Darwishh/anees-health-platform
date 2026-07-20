-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('hospital', 'lab', 'imaging', 'insurer');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('referral', 'fulfillment_arm', 'lab_partner', 'insurer_billing');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('active', 'expired', 'terminated');

-- CreateEnum
CREATE TYPE "ServiceModality" AS ENUM ('home', 'video', 'partner_site');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('active', 'retired');

-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('patient', 'insurer', 'organization');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "payerOrganizationId" TEXT,
ADD COLUMN     "payerType" "PayerType" NOT NULL DEFAULT 'patient';

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "modality" "ServiceModality" NOT NULL DEFAULT 'home',
ADD COLUMN     "sellableStandalone" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "modality" "ServiceModality" NOT NULL DEFAULT 'home',
ADD COLUMN     "packageTermId" TEXT;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "medplumOrganizationId" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'platform',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "engagementType" "EngagementType" NOT NULL,
    "startsAt" DATE NOT NULL,
    "endsAt" DATE,
    "status" "ContractStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'platform',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialtyId" TEXT,
    "description" TEXT,
    "status" "PackageStatus" NOT NULL DEFAULT 'active',
    "tenantId" TEXT NOT NULL DEFAULT 'platform',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_terms" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "priceEgp" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_components" (
    "id" TEXT NOT NULL,
    "packageTermId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cadenceNote" TEXT,

    CONSTRAINT "package_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_medplumOrganizationId_key" ON "organizations"("medplumOrganizationId");

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "organizations"("type");

-- CreateIndex
CREATE INDEX "organizations_tenantId_idx" ON "organizations"("tenantId");

-- CreateIndex
CREATE INDEX "contracts_organizationId_idx" ON "contracts"("organizationId");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_tenantId_idx" ON "contracts"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "packages_code_key" ON "packages"("code");

-- CreateIndex
CREATE INDEX "packages_status_idx" ON "packages"("status");

-- CreateIndex
CREATE INDEX "packages_tenantId_idx" ON "packages"("tenantId");

-- CreateIndex
CREATE INDEX "package_terms_packageId_idx" ON "package_terms"("packageId");

-- CreateIndex
CREATE INDEX "package_components_packageTermId_idx" ON "package_components"("packageTermId");

-- CreateIndex
CREATE INDEX "package_components_serviceId_idx" ON "package_components"("serviceId");

-- CreateIndex
CREATE INDEX "invoices_payerOrganizationId_idx" ON "invoices"("payerOrganizationId");

-- CreateIndex
CREATE INDEX "visits_contractId_idx" ON "visits"("contractId");

-- CreateIndex
CREATE INDEX "visits_packageTermId_idx" ON "visits"("packageTermId");

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_packageTermId_fkey" FOREIGN KEY ("packageTermId") REFERENCES "package_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payerOrganizationId_fkey" FOREIGN KEY ("payerOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_terms" ADD CONSTRAINT "package_terms_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_packageTermId_fkey" FOREIGN KEY ("packageTermId") REFERENCES "package_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
