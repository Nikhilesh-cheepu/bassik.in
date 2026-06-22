-- AlterTable
ALTER TABLE "TeamAdTask" ADD COLUMN "deadlineDate" TEXT;
ALTER TABLE "TeamAdTask" ADD COLUMN "deadlineTime" TEXT;

-- CreateIndex
CREATE INDEX "TeamAdTask_deadlineDate_idx" ON "TeamAdTask"("deadlineDate");

-- CreateTable
CREATE TABLE "TeamReminder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "deadlineDate" TEXT,
    "deadlineTime" TEXT,
    "status" "TeamAdTaskStatus" NOT NULL DEFAULT 'TODO',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamReminder_ownerId_idx" ON "TeamReminder"("ownerId");
CREATE INDEX "TeamReminder_status_idx" ON "TeamReminder"("status");
CREATE INDEX "TeamReminder_deadlineDate_idx" ON "TeamReminder"("deadlineDate");
CREATE INDEX "TeamReminder_createdAt_idx" ON "TeamReminder"("createdAt");
