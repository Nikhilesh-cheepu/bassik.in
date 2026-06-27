import type { TeamPlanningNote, TeamPlanningType } from "@prisma/client";
import { isTeamOutletId } from "@/lib/team-outlets";

export type PlanningSheetData = {
  columns: string[];
  rows: string[][];
};

export type PlanningAttachment = {
  url: string;
  fileName: string;
  mimeType: string;
};

export type TeamPlanningDto = {
  id: string;
  type: TeamPlanningType;
  title: string;
  body: string | null;
  outletId: string | null;
  imageUrls: string[];
  sheetData: PlanningSheetData | null;
  attachments: PlanningAttachment[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_PLANNING_COLUMNS = ["Date", "Item", "Notes"];

export function emptyPlanningSheet(): PlanningSheetData {
  return {
    columns: [...DEFAULT_PLANNING_COLUMNS],
    rows: [["", "", ""]],
  };
}

export const TEAM_PLANNING_TYPES: TeamPlanningType[] = ["PLANNING", "DISCUSSION", "FEEDBACK"];

export const TEAM_PLANNING_LABELS: Record<TeamPlanningType, string> = {
  PLANNING: "Planning",
  DISCUSSION: "Discussion",
  FEEDBACK: "Feedback",
};

export function parseUrlList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && Boolean(u.trim()));
}

export function parseSheetData(raw: unknown): PlanningSheetData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const columns = Array.isArray(o.columns)
    ? o.columns.map((c) => (typeof c === "string" ? c.trim() : "")).filter(Boolean).slice(0, 20)
    : [];
  if (!columns.length) return null;
  const rows = Array.isArray(o.rows)
    ? o.rows
        .filter((r): r is unknown[] => Array.isArray(r))
        .map((r) => columns.map((_, i) => (typeof r[i] === "string" ? r[i] : "")))
        .slice(0, 200)
    : [];
  return { columns, rows };
}

export function parseAttachments(raw: unknown): PlanningAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Record<string, unknown> => Boolean(a) && typeof a === "object")
    .map((a) => ({
      url: typeof a.url === "string" ? a.url : "",
      fileName: typeof a.fileName === "string" ? a.fileName : "file",
      mimeType: typeof a.mimeType === "string" ? a.mimeType : "application/octet-stream",
    }))
    .filter((a) => a.url)
    .slice(0, 20);
}

export function toTeamPlanningDto(row: TeamPlanningNote): TeamPlanningDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    outletId: row.outletId,
    imageUrls: parseUrlList(row.imageUrls),
    sheetData: parseSheetData(row.sheetData),
    attachments: parseAttachments(row.attachmentUrls),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type TeamPlanningFilter = "all" | TeamPlanningType;

export function filterPlanningNotes(
  rows: TeamPlanningNote[],
  filter: TeamPlanningFilter
): TeamPlanningNote[] {
  if (filter === "all") return rows;
  return rows.filter((r) => r.type === filter);
}

export function normalizePlanningType(raw: string | null | undefined): TeamPlanningType {
  const v = raw?.trim().toUpperCase();
  if (v === "PLANNING" || v === "DISCUSSION" || v === "FEEDBACK") return v;
  return "PLANNING";
}

export function parsePlanningPayload(body: Record<string, unknown>) {
  const type = normalizePlanningType(typeof body.type === "string" ? body.type : undefined);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const noteBody =
    typeof body.body === "string" && body.body.trim() ? body.body.trim().slice(0, 8000) : null;
  const outletRaw = typeof body.outletId === "string" ? body.outletId.trim() : "";
  const outletId = outletRaw && isTeamOutletId(outletRaw) ? outletRaw : null;
  const imageUrls = parseUrlList(body.imageUrls);
  const sheetData = parseSheetData(body.sheetData);
  const attachments = parseAttachments(body.attachmentUrls ?? body.attachments);
  return { type, title, body: noteBody, outletId, imageUrls, sheetData, attachments };
}
