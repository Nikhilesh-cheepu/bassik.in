-- Team calendar: custom events + date-range sharing

CREATE TYPE "TeamCalendarEventType" AS ENUM ('SHOOT', 'PLAN', 'MEETING', 'OTHER');

CREATE TABLE "TeamCalendarEvent" (
    "id" TEXT NOT NULL,
    "type" "TeamCalendarEventType" NOT NULL DEFAULT 'PLAN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TEXT NOT NULL,
    "endDate" TEXT,
    "outletId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamCalendarShare" (
    "id" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT,
    "dateKeys" JSONB NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamCalendarShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamCalendarShareMember" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamCalendarShareMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamCalendarEvent_date_idx" ON "TeamCalendarEvent"("date");
CREATE INDEX "TeamCalendarEvent_endDate_idx" ON "TeamCalendarEvent"("endDate");
CREATE INDEX "TeamCalendarEvent_outletId_idx" ON "TeamCalendarEvent"("outletId");
CREATE INDEX "TeamCalendarEvent_type_idx" ON "TeamCalendarEvent"("type");
CREATE INDEX "TeamCalendarEvent_createdAt_idx" ON "TeamCalendarEvent"("createdAt");

CREATE INDEX "TeamCalendarShare_createdBy_idx" ON "TeamCalendarShare"("createdBy");
CREATE INDEX "TeamCalendarShare_createdAt_idx" ON "TeamCalendarShare"("createdAt");

CREATE INDEX "TeamCalendarShareMember_memberId_idx" ON "TeamCalendarShareMember"("memberId");
CREATE INDEX "TeamCalendarShareMember_shareId_idx" ON "TeamCalendarShareMember"("shareId");

CREATE UNIQUE INDEX "TeamCalendarShareMember_shareId_memberId_key" ON "TeamCalendarShareMember"("shareId", "memberId");

ALTER TABLE "TeamCalendarShareMember" ADD CONSTRAINT "TeamCalendarShareMember_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "TeamCalendarShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
