import type { TeamPlanningNote, TeamPlanningType } from "@prisma/client";
import { isTeamOutletId } from "@/lib/team-outlets";

export type TeamPlanningDto = {
  id: string;
  type: TeamPlanningType;
  title: string;
  body: string | null;
  outletId: string | null;
  imageUrls: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

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

export function toTeamPlanningDto(row: TeamPlanningNote): TeamPlanningDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    outletId: row.outletId,
    imageUrls: parseUrlList(row.imageUrls),
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
  return { type, title, body: noteBody, outletId, imageUrls };
}
