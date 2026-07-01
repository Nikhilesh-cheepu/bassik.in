-- AlterTable
ALTER TABLE "TeamPersonalNote" ADD COLUMN "category" TEXT;
ALTER TABLE "TeamPersonalNote" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "TeamPersonalNote" ADD COLUMN "attachments" JSONB;

-- CreateIndex
CREATE INDEX "TeamPersonalNote_category_idx" ON "TeamPersonalNote"("category");

-- CreateTable
CREATE TABLE "TeamNoteShare" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamNoteShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamNoteShare_noteId_memberId_key" ON "TeamNoteShare"("noteId", "memberId");
CREATE INDEX "TeamNoteShare_memberId_idx" ON "TeamNoteShare"("memberId");
CREATE INDEX "TeamNoteShare_noteId_idx" ON "TeamNoteShare"("noteId");

-- AddForeignKey
ALTER TABLE "TeamNoteShare" ADD CONSTRAINT "TeamNoteShare_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "TeamPersonalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
