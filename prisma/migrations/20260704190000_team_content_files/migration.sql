-- CreateEnum
CREATE TYPE "TeamContentFileKind" AS ENUM ('RAW', 'EDIT');

-- CreateEnum
CREATE TYPE "TeamContentEditStatus" AS ENUM ('TO_EDIT', 'EDITED');

-- CreateTable
CREATE TABLE "TeamContentFile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "kind" "TeamContentFileKind" NOT NULL,
    "title" TEXT,
    "driveLink" TEXT,
    "notes" TEXT,
    "outletId" TEXT,
    "shootDate" TEXT,
    "shootId" TEXT,
    "editStatus" "TeamContentEditStatus" NOT NULL DEFAULT 'TO_EDIT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamContentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamContentFile_ownerId_kind_idx" ON "TeamContentFile"("ownerId", "kind");

-- CreateIndex
CREATE INDEX "TeamContentFile_kind_editStatus_idx" ON "TeamContentFile"("kind", "editStatus");

-- CreateIndex
CREATE INDEX "TeamContentFile_shootId_idx" ON "TeamContentFile"("shootId");

-- CreateIndex
CREATE INDEX "TeamContentFile_shootDate_idx" ON "TeamContentFile"("shootDate");

-- CreateIndex
CREATE INDEX "TeamContentFile_createdAt_idx" ON "TeamContentFile"("createdAt");

-- AddForeignKey
ALTER TABLE "TeamContentFile" ADD CONSTRAINT "TeamContentFile_shootId_fkey" FOREIGN KEY ("shootId") REFERENCES "TeamShoot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
