-- Reconcile a schema<->migration drift that failed the CI migration-drift guard.
--
-- Two `updatedAt` columns were created by earlier migrations with a vestigial
-- `DEFAULT CURRENT_TIMESTAMP`, but schema.prisma never declared it: all 37
-- `@updatedAt` fields in the schema are default-less by convention, and Prisma
-- always sets the value on both create and update. Dropping the DB defaults
-- aligns the migration history with schema.prisma. Non-destructive and safe —
-- no raw SQL inserts these tables, so nothing relied on the DB default.

ALTER TABLE "profile_change_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "refunds" ALTER COLUMN "updatedAt" DROP DEFAULT;
