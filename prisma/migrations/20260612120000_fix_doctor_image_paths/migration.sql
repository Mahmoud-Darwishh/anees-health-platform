-- Fix doctor profile image paths that used spaces and capital letters.
-- Those work on case-insensitive local dev (Windows/macOS) but fail on the
-- case-sensitive Linux production server, so the photos went missing in
-- deployment. Renaming the files alone is not enough — the stored paths in the
-- database must match the new web-safe filenames.
--
-- Idempotent: each UPDATE only matches the OLD value, so re-running does nothing.
-- This applies automatically on `prisma migrate deploy` (i.e. on every deploy),
-- so production is fixed without anyone running SQL by hand.

UPDATE "doctors" SET "image" = 'assets/img/doctor-grid-optimized/reem-rajab.webp'
  WHERE "image" = 'assets/img/doctor-grid-optimized/Reem Rajab.webp';

UPDATE "doctors" SET "image" = 'assets/img/doctor-grid-optimized/menna-yahia.webp'
  WHERE "image" = 'assets/img/doctor-grid-optimized/Menna Yahia.webp';

UPDATE "doctors" SET "image" = 'assets/img/doctor-grid-optimized/hamza.webp'
  WHERE "image" = 'assets/img/doctor-grid-optimized/Hamza.webp';
