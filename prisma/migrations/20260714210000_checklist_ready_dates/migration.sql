-- AlterTable
ALTER TABLE "TeamChecklistItem" ADD COLUMN IF NOT EXISTS "readyDates" JSONB;
