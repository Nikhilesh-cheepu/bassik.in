import type { TeamAdTask, TeamAdTaskStatus, TeamTaskPriority } from "@prisma/client";
import { parseUrlList } from "@/lib/team-planning";
import { priorityRank } from "@/lib/team-priority";

export type TeamTaskDto = {
  id: string;
  outletId: string;
  title: string;
  description: string | null;
  creativeUrl: string | null;
  creativeSource: string;
  uploadedUrl: string | null;
  referenceUrls: string[];
  startDate: string | null;
  endDate: string | null;
  endTime: string | null;
  deadlineDate: string | null;
  deadlineTime: string | null;
  assigneeId: string;
  priority: TeamTaskPriority;
  sortOrder: number;
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
    referenceUrls: parseUrlList(row.referenceUrls),
    startDate: row.startDate,
    endDate: row.endDate,
    endTime: row.endTime,
    deadlineDate: row.deadlineDate,
    deadlineTime: row.deadlineTime,
    assigneeId: row.assigneeId,
    priority: row.priority,
    sortOrder: row.sortOrder,
    status: row.status,
    createdBy: row.createdBy,
    completedBy: row.completedBy,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type TeamTaskFilter = "all" | "todo" | "done" | "pending";

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

export function filterTeamTasks(
  tasks: TeamAdTask[],
  filter: TeamTaskFilter,
  role?: "admin" | "member" | "viewer"
): TeamAdTask[] {
  switch (filter) {
    case "todo":
      return tasks.filter(
        (t) =>
          t.status === "TODO" || (role === "member" && t.status === "PENDING_APPROVAL")
      );
    case "done":
      return tasks.filter((t) => t.status === "DONE");
    case "pending":
      return tasks.filter((t) => t.status === "PENDING_APPROVAL");
    default:
      if (role === "member") return tasks;
      return tasks.filter((t) => t.status !== "PENDING_APPROVAL");
  }
}

export function sortTeamTasks(tasks: TeamAdTask[]): TeamAdTask[] {
  return [...tasks].sort((a, b) => {
    const statusOrder = (s: TeamAdTaskStatus) => {
      if (s === "TODO") return 0;
      if (s === "PENDING_APPROVAL") return 1;
      return 2;
    };
    const statusCmp = statusOrder(a.status) - statusOrder(b.status);
    if (statusCmp !== 0) return statusCmp;
    const pri = priorityRank(a.priority) - priorityRank(b.priority);
    if (pri !== 0) return pri;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
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

const TZ = "Asia/Kolkata";

export function teamTaskCompletedDayKey(iso: string | Date | null | undefined): string {
  if (!iso) return "unknown";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function formatTeamCompletedDayLabel(
  dayKey: string,
  sampleIso?: string | Date | null
): string {
  if (dayKey === "unknown") return "Earlier";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: TZ });
  if (dayKey === today) return "Today";
  if (dayKey === yesterday) return "Yesterday";
  const sample =
    sampleIso != null
      ? typeof sampleIso === "string"
        ? new Date(sampleIso)
        : sampleIso
      : new Date(`${dayKey}T12:00:00+05:30`);
  if (Number.isNaN(sample.getTime())) return dayKey;
  const yearNow = new Date().toLocaleDateString("en-CA", { timeZone: TZ, year: "numeric" });
  const yearSample = sample.toLocaleDateString("en-CA", { timeZone: TZ, year: "numeric" });
  return sample.toLocaleDateString("en-IN", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(yearSample !== yearNow ? { year: "numeric" as const } : {}),
  });
}

export function formatTeamRecordDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date}, ${time}`;
}

export function formatTeamRecordDayHeading(iso: string | null | undefined): string {
  if (!iso) return "Earlier";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDay.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function completedDayKey(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type TeamTaskDayGroup = {
  key: string;
  label: string;
  tasks: TeamTaskDto[];
};

export function groupTasksByCompletedDay(tasks: TeamTaskDto[]): TeamTaskDayGroup[] {
  const map = new Map<string, TeamTaskDto[]>();
  for (const t of tasks) {
    const key = completedDayKey(t.completedAt ?? t.updatedAt);
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return b.localeCompare(a);
  });

  return keys.map((key) => {
    const groupTasks = (map.get(key) ?? []).sort((a, b) => {
      const ta = new Date(a.completedAt ?? a.updatedAt).getTime();
      const tb = new Date(b.completedAt ?? b.updatedAt).getTime();
      return tb - ta;
    });
    const sample = groupTasks[0]?.completedAt ?? groupTasks[0]?.updatedAt;
    return {
      key,
      label: key === "unknown" ? "Earlier" : formatTeamRecordDayHeading(sample),
      tasks: groupTasks,
    };
  });
}
