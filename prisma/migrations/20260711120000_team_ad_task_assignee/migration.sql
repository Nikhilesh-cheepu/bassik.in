-- AlterTable
ALTER TABLE "TeamAdTask" ADD COLUMN "assigneeId" TEXT NOT NULL DEFAULT 'amit';

-- CreateIndex
CREATE INDEX "TeamAdTask_assigneeId_idx" ON "TeamAdTask"("assigneeId");
