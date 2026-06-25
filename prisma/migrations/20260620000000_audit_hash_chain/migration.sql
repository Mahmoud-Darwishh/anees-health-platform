-- Tamper-evidence for the audit trail.
-- Adds an integrity self-hash and a chain link to every audit entry. Both
-- columns are nullable and back-fillable, so existing rows are unaffected and
-- this migration is additive/safe. New rows populate them best-effort in the
-- application write path (a hashing failure must never block an audit write).
ALTER TABLE "audit_logs" ADD COLUMN "hash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "prevHash" TEXT;
