-- CreateTable
CREATE TABLE "DiscountLimit" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "maxPerDay" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountUsage" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountLimit_brandId_discountId_key" ON "DiscountLimit"("brandId", "discountId");

-- CreateIndex
CREATE INDEX "DiscountLimit_brandId_idx" ON "DiscountLimit"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountUsage_brandId_discountId_date_key" ON "DiscountUsage"("brandId", "discountId", "date");

-- CreateIndex
CREATE INDEX "DiscountUsage_brandId_idx" ON "DiscountUsage"("brandId");

-- CreateIndex
CREATE INDEX "DiscountUsage_brandId_date_idx" ON "DiscountUsage"("brandId", "date");

-- AddForeignKey
ALTER TABLE "DiscountLimit" ADD CONSTRAINT "DiscountLimit_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Venue"("brandId") ON DELETE CASCADE ON UPDATE CASCADE;
