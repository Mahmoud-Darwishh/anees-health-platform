ALTER TABLE "patient_goals"
ADD COLUMN "fhir_goal_id" TEXT;

CREATE UNIQUE INDEX "patient_goals_fhir_goal_id_key"
ON "patient_goals" ("fhir_goal_id");
