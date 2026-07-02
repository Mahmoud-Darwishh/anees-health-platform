-- Notifications v1: attach an optional owner (User) to a push subscription so
-- clinical/ops events can target one person's devices instead of broadcasting.
-- Additive + idempotent — a single nullable column + index. Anonymous marketing
-- opt-in subscriptions keep userId = NULL and are unaffected.

ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'push_subscriptions_userId_fkey'
  ) THEN
    ALTER TABLE "push_subscriptions"
      ADD CONSTRAINT "push_subscriptions_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
