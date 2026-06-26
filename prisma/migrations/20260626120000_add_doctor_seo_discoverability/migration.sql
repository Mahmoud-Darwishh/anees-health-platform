-- Doctor SEO discoverability (§16): public-profile consent flag + external profile URLs.
--
-- Additive and non-destructive:
--   * "isPublic" defaults to true, so every existing doctor stays public and
--     nothing changes until the owner explicitly marks a clinician private.
--   * "externalProfiles" is nullable JSON (array of verified profile URLs),
--     emitted as schema.org `sameAs`. NULL for existing rows.
-- No existing data is modified.

ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "externalProfiles" JSONB;
