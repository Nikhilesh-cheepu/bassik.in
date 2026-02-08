-- AlterTable (IF NOT EXISTS so migration is idempotent)
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "contactNumbers" JSONB;
