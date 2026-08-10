-- Work-time accounting across pause/resume + optional skip Amit handoff
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "activeWorkMs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "noPost" BOOLEAN NOT NULL DEFAULT false;
