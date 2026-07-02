-- Ensure outlet columns exist (idempotent) + document fields for bills & payment proofs.
ALTER TABLE "Kiik69Purchase" ADD COLUMN IF NOT EXISTS "outlet" TEXT;
ALTER TABLE "Kiik69Purchase" ADD COLUMN IF NOT EXISTS "outletLabel" TEXT;
ALTER TABLE "Kiik69Purchase" ADD COLUMN IF NOT EXISTS "billDocType" TEXT;
ALTER TABLE "Kiik69Purchase" ADD COLUMN IF NOT EXISTS "paymentProofUrl" TEXT;
ALTER TABLE "Kiik69Purchase" ADD COLUMN IF NOT EXISTS "paymentProofFileName" TEXT;

CREATE INDEX IF NOT EXISTS "Kiik69Purchase_outlet_idx" ON "Kiik69Purchase"("outlet");
