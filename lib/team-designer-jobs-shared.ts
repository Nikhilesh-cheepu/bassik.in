/** Client-safe designer job types & constants (no DB / Node imports). */

export const DESIGNER_MONTH_OUTLET_IDS = ["c53", "boiler-room", "firefly", "komma"] as const;

export const DESIGNER_ASSIGNEE_WEEKEND = "mahesh";
export const DESIGNER_ASSIGNEE_WEEKDAY = "jeslyn";

/**
 * Designer upload deadlines (IST).
 * - Jeslyn (Mon–Thu): day before go-live @ 20:00 (Mon flyer → Sun 8 PM).
 * - Mahesh (Fri–Sat–Sun): go-live − 4 days @ 20:00 (Fri → Mon 8 PM).
 */
export const DESIGNER_UPLOAD_DUE_TIME = "20:00";
export const DESIGNER_WEEKDAY_DUE_TIME = "20:00";
export const DESIGNER_WEEKEND_DUE_TIME = "20:00";
export const DESIGNER_LAST_WA_TIME = "19:00";
export const DESIGNER_DAILY_TARGET = 4;
/** Always schedule this many days forward from today (not calendar months). */
export const DESIGNER_WINDOW_DAYS = 30;

export type DesignerJobLane = "WEEKEND" | "WEEKDAY";
export type DesignerJobStatus =
  | "WAITING_BRIEF"
  | "READY_TO_DESIGN"
  | "IN_PROGRESS"
  | "PAUSED"
  | "DESIGN_DONE";

export type DesignerJobDto = {
  id: string;
  monthKey: string;
  postDate: string;
  dueDate: string;
  dueTime: string;
  outletId: string;
  outletLabel: string;
  lane: DesignerJobLane;
  format: string;
  title: string;
  description: string | null;
  /** Drive / Instagram / reference URLs */
  links: string[];
  assigneeId: string;
  status: DesignerJobStatus;
  urgent: boolean;
  /** Admin drag priority — lower first */
  sortOrder: number;
  startedAt: string | null;
  uploadedAt: string | null;
  fileUrl: string | null;
  postingNotes: string | null;
  scheduleNote: string | null;
  waApproved: boolean;
  /** ISO time when designer requested admin approve-to-edit; null if none */
  editRequestedAt: string | null;
  editRequestNote: string | null;
  /** ISO time when designer requested admin approve-to-pause; null if none */
  pauseRequestedAt: string | null;
  pauseRequestNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  isDueToday: boolean;
};

/** Seed leftovers like "C53 Sunday Post — send to Mahesh" — treat as empty. */
export function isBoilerplateDesignerDescription(
  description: string | null | undefined,
  title?: string | null
): boolean {
  const t = description?.trim() ?? "";
  if (!t) return true;
  if (title?.trim() && t === title.trim()) return true;
  if (/[—–-]\s*send to\s+/i.test(t)) return true;
  if (/^send to\s+(mahesh|jeslyn)\b/i.test(t)) return true;
  return false;
}

/** Priority sort — admin drag uses sortOrder; In progress / Paused pin to top. */
export function sortDesignerJobs(jobs: DesignerJobDto[]): DesignerJobDto[] {
  const outletRank = new Map(DESIGNER_MONTH_OUTLET_IDS.map((id, i) => [id, i]));
  const pinRank = (s: DesignerJobStatus) => {
    if (s === "IN_PROGRESS") return 0;
    if (s === "PAUSED") return 1;
    if (s === "DESIGN_DONE") return 9;
    return 2;
  };

  return [...jobs].sort((a, b) => {
    const aDone = a.status === "DESIGN_DONE" ? 1 : 0;
    const bDone = b.status === "DESIGN_DONE" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    const pa = pinRank(a.status);
    const pb = pinRank(b.status);
    if (pa !== pb) return pa - pb;

    if ((a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }

    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.isDueToday !== b.isDueToday) return a.isDueToday ? -1 : 1;
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    const oa = outletRank.get(a.outletId as (typeof DESIGNER_MONTH_OUTLET_IDS)[number]) ?? 99;
    const ob = outletRank.get(b.outletId as (typeof DESIGNER_MONTH_OUTLET_IDS)[number]) ?? 99;
    if (oa !== ob) return oa - ob;
    return a.postDate.localeCompare(b.postDate);
  });
}

export function parseDesignerLinks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const u = item.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** Parse links from a textarea (one URL per line). */
export function linksFromText(raw: string): string[] {
  return parseDesignerLinks(
    raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export type DesignerMetricsDto = {
  closedToday: number;
  closedThisWeek: number;
  readyBriefs: number;
  inProgress: number;
  overdueOpen: number;
  onTimeUploadsWeek: number;
  lateUploadsWeek: number;
  dailyTarget: number;
  queueHealthOk: boolean;
};
