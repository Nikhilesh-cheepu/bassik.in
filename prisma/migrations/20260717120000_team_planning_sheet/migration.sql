-- Flexible planning sheets + file attachments on team planning notes
ALTER TABLE "TeamPlanningNote" ADD COLUMN IF NOT EXISTS "sheetData" JSONB;
ALTER TABLE "TeamPlanningNote" ADD COLUMN IF NOT EXISTS "attachmentUrls" JSONB;
