-- ICD-10-CM reference terminology for the EHR problem-list picker (NOT PHI).
-- Seeded via `npm run db:seed:icd10`.
CREATE TABLE "icd10_codes" (
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icd10_codes_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "icd10_codes_display_idx" ON "icd10_codes"("display");
