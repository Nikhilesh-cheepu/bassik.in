-- Per-venue chat leads + message threads for ad landing pages.

CREATE TYPE "VenueChatLeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'BOOKING_STARTED', 'BOOKED', 'HANDED_OFF', 'CLOSED');
CREATE TYPE "VenueChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'MANAGER', 'SYSTEM');

CREATE TABLE "VenueChatLead" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "venueId" TEXT,
    "displayLabel" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "guestName" TEXT,
    "contactNumber" TEXT,
    "partySize" INTEGER,
    "selectedEventId" TEXT,
    "selectedEventName" TEXT,
    "bookingDate" TEXT,
    "bookingTime" TEXT,
    "selectedDiscounts" JSONB,
    "status" "VenueChatLeadStatus" NOT NULL DEFAULT 'NEW',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "reservationId" TEXT,
    "managerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueChatLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueChatMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "role" "VenueChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VenueChatLead_sessionToken_key" ON "VenueChatLead"("sessionToken");
CREATE INDEX "VenueChatLead_brandId_idx" ON "VenueChatLead"("brandId");
CREATE INDEX "VenueChatLead_brandId_lastMessageAt_idx" ON "VenueChatLead"("brandId", "lastMessageAt");
CREATE INDEX "VenueChatLead_status_idx" ON "VenueChatLead"("status");
CREATE INDEX "VenueChatLead_sessionToken_idx" ON "VenueChatLead"("sessionToken");
CREATE INDEX "VenueChatMessage_leadId_createdAt_idx" ON "VenueChatMessage"("leadId", "createdAt");

ALTER TABLE "VenueChatLead" ADD CONSTRAINT "VenueChatLead_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VenueChatMessage" ADD CONSTRAINT "VenueChatMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "VenueChatLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
