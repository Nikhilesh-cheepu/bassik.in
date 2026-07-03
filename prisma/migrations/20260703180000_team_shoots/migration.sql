-- Content creator shoot calendar with drive links and note links.

CREATE TABLE "TeamShoot" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "shootDate" TEXT NOT NULL,
    "outletId" TEXT,
    "title" TEXT,
    "shootNotes" TEXT,
    "rawFilesDriveLink" TEXT,
    "editFilesDriveLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamShoot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamShootNoteLink" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamShootNoteLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamShootShare" (
    "id" TEXT NOT NULL,
    "shootId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamShootShare_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamShoot_ownerId_idx" ON "TeamShoot"("ownerId");
CREATE INDEX "TeamShoot_shootDate_idx" ON "TeamShoot"("shootDate");
CREATE INDEX "TeamShoot_outletId_idx" ON "TeamShoot"("outletId");
CREATE INDEX "TeamShoot_createdAt_idx" ON "TeamShoot"("createdAt");

CREATE UNIQUE INDEX "TeamShootNoteLink_shootId_noteId_key" ON "TeamShootNoteLink"("shootId", "noteId");
CREATE INDEX "TeamShootNoteLink_shootId_idx" ON "TeamShootNoteLink"("shootId");
CREATE INDEX "TeamShootNoteLink_noteId_idx" ON "TeamShootNoteLink"("noteId");

CREATE UNIQUE INDEX "TeamShootShare_shootId_memberId_key" ON "TeamShootShare"("shootId", "memberId");
CREATE INDEX "TeamShootShare_memberId_idx" ON "TeamShootShare"("memberId");
CREATE INDEX "TeamShootShare_shootId_idx" ON "TeamShootShare"("shootId");

ALTER TABLE "TeamShootNoteLink" ADD CONSTRAINT "TeamShootNoteLink_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "TeamShoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamShootNoteLink" ADD CONSTRAINT "TeamShootNoteLink_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "TeamPersonalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamShootShare" ADD CONSTRAINT "TeamShootShare_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "TeamShoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
