-- KIIK 69 stock items, movements, wallet

CREATE TABLE "Kiik69StockItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL,
    "costBasisQty" DECIMAL(14,4) NOT NULL,
    "costBasisUnit" TEXT NOT NULL,
    "costInr" DECIMAL(12,2) NOT NULL,
    "bottleSizeBase" DECIMAL(14,4),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kiik69StockItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Kiik69StockMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "quantityUnit" TEXT NOT NULL,
    "quantityBase" DECIMAL(14,4) NOT NULL,
    "costInr" DECIMAL(12,2) NOT NULL,
    "movementDate" TEXT,
    "note" TEXT,
    "attachmentUrl" TEXT,
    "attachmentFileName" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kiik69StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Kiik69WalletEntry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountInr" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "entryDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kiik69WalletEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Kiik69StockItem_category_idx" ON "Kiik69StockItem"("category");
CREATE INDEX "Kiik69StockItem_name_idx" ON "Kiik69StockItem"("name");

CREATE INDEX "Kiik69StockMovement_itemId_idx" ON "Kiik69StockMovement"("itemId");
CREATE INDEX "Kiik69StockMovement_category_direction_idx" ON "Kiik69StockMovement"("category", "direction");
CREATE INDEX "Kiik69StockMovement_movementDate_idx" ON "Kiik69StockMovement"("movementDate");
CREATE INDEX "Kiik69StockMovement_createdAt_idx" ON "Kiik69StockMovement"("createdAt");

CREATE INDEX "Kiik69WalletEntry_createdAt_idx" ON "Kiik69WalletEntry"("createdAt");
CREATE INDEX "Kiik69WalletEntry_entryDate_idx" ON "Kiik69WalletEntry"("entryDate");

ALTER TABLE "Kiik69StockMovement" ADD CONSTRAINT "Kiik69StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Kiik69StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
