-- CreateEnum
CREATE TYPE "TeamPlanningType" AS ENUM ('PLANNING', 'DISCUSSION', 'FEEDBACK');

-- AlterTable
ALTER TABLE "TeamAdTask" ADD COLUMN "referenceUrls" JSONB;

-- CreateTable
CREATE TABLE "TeamPlanningNote" (
    "id" TEXT NOT NULL,
    "type" "TeamPlanningType" NOT NULL DEFAULT 'PLANNING',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "outletId" TEXT,
    "imageUrls" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamPlanningNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamPlanningNote_type_idx" ON "TeamPlanningNote"("type");
CREATE INDEX "TeamPlanningNote_outletId_idx" ON "TeamPlanningNote"("outletId");
CREATE INDEX "TeamPlanningNote_createdAt_idx" ON "TeamPlanningNote"("createdAt");
