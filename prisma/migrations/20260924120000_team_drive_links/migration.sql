-- CreateTable
CREATE TABLE "TeamDriveLink" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamDriveLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamDriveLink_createdAt_idx" ON "TeamDriveLink"("createdAt");

-- CreateIndex
CREATE INDEX "TeamDriveLink_ownerId_idx" ON "TeamDriveLink"("ownerId");
