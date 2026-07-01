-- AlterTable
ALTER TABLE "TeamPersonalNote" ADD COLUMN "title" TEXT;
ALTER TABLE "TeamPersonalNote" ADD COLUMN "outletId" TEXT;

-- CreateIndex
CREATE INDEX "TeamPersonalNote_outletId_idx" ON "TeamPersonalNote"("outletId");
