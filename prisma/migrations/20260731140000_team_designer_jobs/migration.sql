-- CreateEnum
CREATE TYPE "TeamDesignerJobStatus" AS ENUM ('WAITING_BRIEF', 'READY_TO_DESIGN', 'IN_PROGRESS', 'DESIGN_DONE');

-- CreateEnum
CREATE TYPE "TeamDesignerJobLane" AS ENUM ('WEEKEND', 'WEEKDAY');

-- CreateTable
CREATE TABLE "TeamDesignerJob" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "postDate" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "dueTime" TEXT NOT NULL DEFAULT '20:00',
    "outletId" TEXT NOT NULL,
    "lane" "TeamDesignerJobLane" NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" TEXT NOT NULL,
    "status" "TeamDesignerJobStatus" NOT NULL DEFAULT 'WAITING_BRIEF',
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "postingNotes" TEXT,
    "scheduleNote" TEXT,
    "waApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamDesignerJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamDesignerJob_monthKey_postDate_outletId_lane_format_key" ON "TeamDesignerJob"("monthKey", "postDate", "outletId", "lane", "format");

-- CreateIndex
CREATE INDEX "TeamDesignerJob_assigneeId_status_idx" ON "TeamDesignerJob"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "TeamDesignerJob_monthKey_idx" ON "TeamDesignerJob"("monthKey");

-- CreateIndex
CREATE INDEX "TeamDesignerJob_dueDate_idx" ON "TeamDesignerJob"("dueDate");

-- CreateIndex
CREATE INDEX "TeamDesignerJob_postDate_idx" ON "TeamDesignerJob"("postDate");

-- CreateIndex
CREATE INDEX "TeamDesignerJob_outletId_idx" ON "TeamDesignerJob"("outletId");

-- CreateIndex
CREATE INDEX "TeamDesignerJob_lane_idx" ON "TeamDesignerJob"("lane");

-- CreateIndex
CREATE INDEX "TeamDesignerJob_urgent_idx" ON "TeamDesignerJob"("urgent");

-- CreateIndex
CREATE INDEX "TeamDesignerJob_createdAt_idx" ON "TeamDesignerJob"("createdAt");
