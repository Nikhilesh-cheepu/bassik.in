-- CreateEnum
CREATE TYPE "DiscountSession" AS ENUM ('LUNCH', 'DINNER', 'BOTH');

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalSlots" INTEGER NOT NULL,
    "slotsUsed" INTEGER NOT NULL DEFAULT 0,
    "startTime" TEXT,
    "endTime" TEXT,
    "session" "DiscountSession",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Discount_venueId_idx" ON "Discount"("venueId");

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
