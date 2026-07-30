-- Per-date creative handoff for Daily board (approve → upload → ready for Amit).
ALTER TABLE "TeamChecklistItem" ADD COLUMN IF NOT EXISTS "handoff" JSONB;
