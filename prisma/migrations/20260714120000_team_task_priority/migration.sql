-- CreateEnum
CREATE TYPE "TeamTaskPriority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- AlterTable
ALTER TABLE "TeamAdTask" ADD COLUMN "priority" "TeamTaskPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "TeamAdTask" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "TeamAdTask_priority_idx" ON "TeamAdTask"("priority");
CREATE INDEX "TeamAdTask_sortOrder_idx" ON "TeamAdTask"("sortOrder");
