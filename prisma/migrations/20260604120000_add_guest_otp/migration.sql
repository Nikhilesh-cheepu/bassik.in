-- Guest OTP identity (verified mobile)
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Guest_phone_key" ON "Guest"("phone");
CREATE INDEX "Guest_phone_idx" ON "Guest"("phone");
CREATE INDEX "Guest_lastSeenAt_idx" ON "Guest"("lastSeenAt");

ALTER TABLE "Reservation" ADD COLUMN "guestId" TEXT;
CREATE INDEX "Reservation_guestId_idx" ON "Reservation"("guestId");
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VenueChatLead" ADD COLUMN "guestId" TEXT;
ALTER TABLE "VenueChatLead" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
CREATE INDEX "VenueChatLead_guestId_idx" ON "VenueChatLead"("guestId");
ALTER TABLE "VenueChatLead" ADD CONSTRAINT "VenueChatLead_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
