import type { TeamAdTask, TeamAdTaskStatus } from "@prisma/client";

export type TeamTaskDto = {
  id: string;
  outletId: string;
  title: string;
  description: string | null;
  creativeUrl: string | null;
  creativeSource: string;
  uploadedUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  endTime: string | null;
  status: TeamAdTaskStatus;
  createdBy: string;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toTeamTaskDto(row: TeamAdTask): TeamTaskDto {
  return {
    id: row.id,
    outletId: row.outletId,
    title: row.title,
    description: row.description,
    creativeUrl: row.creativeUrl,
    creativeSource: row.creativeSource,
    uploadedUrl: row.uploadedUrl,
    startDate: row.startDate,
    endDate: row.endDate,
    endTime: row.endTime,
    status: row.status,
    createdBy: row.createdBy,
    completedBy: row.completedBy,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type TeamTaskFilter = "all" | "todo" | "done";

export const TEAM_START_ASAP = "ASAP";

export function isAsapStartDate(startDate: string | null | undefined): boolean {
  return startDate?.trim().toUpperCase() === TEAM_START_ASAP;
}

export function formatTeamStartDate(startDate: string | null | undefined): string {
  if (!startDate) return "—";
  if (isAsapStartDate(startDate)) return "ASAP";
  const [y, m, d] = startDate.split("-").map(Number);
  if (!y || !m || !d) return startDate;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function normalizeTeamStartDate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.toUpperCase() === TEAM_START_ASAP) return TEAM_START_ASAP;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function filterTeamTasks(tasks: TeamAdTask[], filter: TeamTaskFilter): TeamAdTask[] {
  switch (filter) {
    case "todo":
      return tasks.filter((t) => t.status === "TODO");
    case "done":
      return tasks.filter((t) => t.status === "DONE");
    default:
      return tasks;
  }
}

export function detectCreativeSource(url: string): "DRIVE_LINK" | "INSTAGRAM" | "NONE" {
  const u = url.trim().toLowerCase();
  if (!u) return "NONE";
  if (u.includes("drive.google.com") || u.includes("docs.google.com")) return "DRIVE_LINK";
  if (u.includes("instagram.com")) return "INSTAGRAM";
  return "DRIVE_LINK";
}

export { formatTeamEndDateTime, normalizeTeamEndTime } from "@/lib/team-end-time";

export function primaryCreativeLink(task: Pick<TeamTaskDto, "uploadedUrl" | "creativeUrl">): string | null {
  return task.uploadedUrl?.trim() || task.creativeUrl?.trim() || null;
}
