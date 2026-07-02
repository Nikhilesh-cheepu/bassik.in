-- Item + custom labels on purchases
ALTER TABLE "Kiik69Purchase" ADD COLUMN "item" TEXT;
ALTER TABLE "Kiik69Purchase" ADD COLUMN "itemLabel" TEXT;
ALTER TABLE "Kiik69Purchase" ADD COLUMN "vendorLabel" TEXT;
ALTER TABLE "Kiik69Purchase" ADD COLUMN "paymentLabel" TEXT;

CREATE INDEX "Kiik69Purchase_item_idx" ON "Kiik69Purchase"("item");

-- Saved custom vendors / payments / items for reuse
CREATE TABLE "Kiik69CustomOption" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kiik69CustomOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Kiik69CustomOption_kind_slug_key" ON "Kiik69CustomOption"("kind", "slug");
CREATE UNIQUE INDEX "Kiik69CustomOption_kind_label_key" ON "Kiik69CustomOption"("kind", "label");
CREATE INDEX "Kiik69CustomOption_kind_idx" ON "Kiik69CustomOption"("kind");
