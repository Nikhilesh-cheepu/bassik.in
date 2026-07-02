-- Flexible multi-document attachments per purchase.
ALTER TABLE "Kiik69Purchase" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
