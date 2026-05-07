-- Site-wide gallery (Bassik marketing), separate from VenueImage.

CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GalleryImage_url_key" ON "GalleryImage"("url");

CREATE INDEX "GalleryImage_sortOrder_idx" ON "GalleryImage"("sortOrder");
