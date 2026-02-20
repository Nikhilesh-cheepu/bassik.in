-- AlterTable: rename totalSlots to limitPerDay, drop slotsUsed
ALTER TABLE "Discount" RENAME COLUMN "totalSlots" TO "limitPerDay";
ALTER TABLE "Discount" DROP COLUMN "slotsUsed";

-- CreateTable
CREATE TABLE "DiscountDailyUsage" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiscountDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountDailyUsage_discountId_date_key" ON "DiscountDailyUsage"("discountId", "date");
CREATE INDEX "DiscountDailyUsage_discountId_idx" ON "DiscountDailyUsage"("discountId");
CREATE INDEX "DiscountDailyUsage_discountId_date_idx" ON "DiscountDailyUsage"("discountId", "date");

-- AddForeignKey
ALTER TABLE "DiscountDailyUsage" ADD CONSTRAINT "DiscountDailyUsage_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
