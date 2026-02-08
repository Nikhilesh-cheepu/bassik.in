-- Run this ONLY if "prisma migrate deploy" cannot be used (e.g. no migration history).
-- Ensures Venue table has all columns expected by the app. Safe to run multiple times.

ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "coverVideoUrl" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "contactNumbers" JSONB;
