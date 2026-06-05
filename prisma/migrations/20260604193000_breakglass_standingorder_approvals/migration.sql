-- CreateTable
CREATE TABLE "standing_orders" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByStaffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standing_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standing_order_executions" (
    "id" TEXT NOT NULL,
    "standingOrderId" TEXT NOT NULL,
    "visitId" TEXT,
    "executedByStaffId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standing_order_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destructive_approval_tokens" (
    "id" TEXT NOT NULL,
    "medplumPatientId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetRecordId" TEXT NOT NULL,
    "payload" JSONB,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "consumedBy" TEXT,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destructive_approval_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "standing_orders_patientId_isActive_idx" ON "standing_orders"("patientId", "isActive");

-- CreateIndex
CREATE INDEX "standing_orders_discipline_idx" ON "standing_orders"("discipline");

-- CreateIndex
CREATE INDEX "standing_orders_validUntil_idx" ON "standing_orders"("validUntil");

-- CreateIndex
CREATE INDEX "standing_order_executions_standingOrderId_executedAt_idx" ON "standing_order_executions"("standingOrderId", "executedAt");

-- CreateIndex
CREATE INDEX "standing_order_executions_visitId_idx" ON "standing_order_executions"("visitId");

-- CreateIndex
CREATE INDEX "destructive_approval_tokens_medplumPatientId_actionType_status_idx" ON "destructive_approval_tokens"("medplumPatientId", "actionType", "status");

-- CreateIndex
CREATE INDEX "destructive_approval_tokens_targetRecordId_actionType_idx" ON "destructive_approval_tokens"("targetRecordId", "actionType");

-- CreateIndex
CREATE INDEX "destructive_approval_tokens_expiresAt_idx" ON "destructive_approval_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "standing_orders" ADD CONSTRAINT "standing_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_order_executions" ADD CONSTRAINT "standing_order_executions_standingOrderId_fkey" FOREIGN KEY ("standingOrderId") REFERENCES "standing_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standing_order_executions" ADD CONSTRAINT "standing_order_executions_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
