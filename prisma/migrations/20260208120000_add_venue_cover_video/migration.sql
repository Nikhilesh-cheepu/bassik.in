-- AlterTable (IF NOT EXISTS so migration is idempotent)
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "coverVideoUrl" TEXT;
