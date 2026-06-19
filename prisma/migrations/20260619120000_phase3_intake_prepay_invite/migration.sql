-- Phase 3 (Intake → prepay → invite): additive columns on online_bookings.
-- Strictly additive + idempotent — every column is nullable, so existing rows,
-- the card/Kashier flow, and the running app are unaffected. No drops, no renames,
-- no NOT NULL on existing data.

ALTER TABLE "online_bookings" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "online_bookings" ADD COLUMN IF NOT EXISTS "instapayReference" TEXT;
ALTER TABLE "online_bookings" ADD COLUMN IF NOT EXISTS "instapaySenderName" TEXT;
ALTER TABLE "online_bookings" ADD COLUMN IF NOT EXISTS "paymentConfirmedAt" TIMESTAMP(3);
ALTER TABLE "online_bookings" ADD COLUMN IF NOT EXISTS "paymentConfirmedBy" TEXT;
ALTER TABLE "online_bookings" ADD COLUMN IF NOT EXISTS "governorate" TEXT;
ALTER TABLE "online_bookings" ADD COLUMN IF NOT EXISTS "inviteSentAt" TIMESTAMP(3);
