-- CreateTable
CREATE TABLE "ReservationPayment" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "bookingDraft" JSONB NOT NULL,
    "reservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationPayment_razorpayOrderId_key" ON "ReservationPayment"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "ReservationPayment_brandId_idx" ON "ReservationPayment"("brandId");

-- CreateIndex
CREATE INDEX "ReservationPayment_status_idx" ON "ReservationPayment"("status");
