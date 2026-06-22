-- CreateEnum
CREATE TYPE "TeamAdTaskStatus" AS ENUM ('TODO', 'DONE');

-- CreateEnum
CREATE TYPE "TeamCreativeSource" AS ENUM ('DRIVE_LINK', 'INSTAGRAM', 'UPLOAD', 'NONE');

-- CreateTable
CREATE TABLE "TeamAdTask" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "creativeUrl" TEXT,
    "creativeSource" "TeamCreativeSource" NOT NULL DEFAULT 'NONE',
    "uploadedUrl" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "status" "TeamAdTaskStatus" NOT NULL DEFAULT 'TODO',
    "createdBy" TEXT NOT NULL,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamAdTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamAdTask_outletId_idx" ON "TeamAdTask"("outletId");

-- CreateIndex
CREATE INDEX "TeamAdTask_status_idx" ON "TeamAdTask"("status");

-- CreateIndex
CREATE INDEX "TeamAdTask_startDate_idx" ON "TeamAdTask"("startDate");

-- CreateIndex
CREATE INDEX "TeamAdTask_endDate_idx" ON "TeamAdTask"("endDate");

-- CreateIndex
CREATE INDEX "TeamAdTask_createdAt_idx" ON "TeamAdTask"("createdAt");
