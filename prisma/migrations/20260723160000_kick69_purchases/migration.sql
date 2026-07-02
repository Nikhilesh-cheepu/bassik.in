-- CreateTable
CREATE TABLE "Kick69Purchase" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "purchaseDate" TEXT,
    "title" TEXT,
    "description" TEXT,
    "aiSummary" TEXT,
    "billUrl" TEXT,
    "billFileName" TEXT,
    "purchaseLink" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kick69Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Kick69Purchase_vendor_idx" ON "Kick69Purchase"("vendor");

-- CreateIndex
CREATE INDEX "Kick69Purchase_purchaseDate_idx" ON "Kick69Purchase"("purchaseDate");

-- CreateIndex
CREATE INDEX "Kick69Purchase_createdAt_idx" ON "Kick69Purchase"("createdAt");
