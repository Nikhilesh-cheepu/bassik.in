-- AlterEnum
ALTER TYPE "TeamDesignerJobStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- AlterTable
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "pauseRequestedAt" TIMESTAMP(3);
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "pauseRequestNote" TEXT;

CREATE INDEX IF NOT EXISTS "TeamDesignerJob_pauseRequestedAt_idx" ON "TeamDesignerJob"("pauseRequestedAt");
