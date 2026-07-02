-- Tag purchases by outlet (KIIK 69, Sky High, Sound of Soul, or other).
ALTER TABLE "Kiik69Purchase" ADD COLUMN "outlet" TEXT;
ALTER TABLE "Kiik69Purchase" ADD COLUMN "outletLabel" TEXT;

CREATE INDEX "Kiik69Purchase_outlet_idx" ON "Kiik69Purchase"("outlet");
