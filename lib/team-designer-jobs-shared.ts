/** Client-safe designer job types & constants (no DB / Node imports). */

export const DESIGNER_MONTH_OUTLET_IDS = ["c53", "boiler-room", "firefly", "komma"] as const;

export const DESIGNER_ASSIGNEE_WEEKEND = "mahesh";
export const DESIGNER_ASSIGNEE_WEEKDAY = "jeslyn";

export const DESIGNER_UPLOAD_DUE_TIME = "20:00";
export const DESIGNER_LAST_WA_TIME = "19:00";
export const DESIGNER_DAILY_TARGET = 4;
/** Always schedule this many days forward from today (not calendar months). */
export const DESIGNER_WINDOW_DAYS = 30;

export type DesignerJobLane = "WEEKEND" | "WEEKDAY";
export type DesignerJobStatus =
  | "WAITING_BRIEF"
  | "READY_TO_DESIGN"
  | "IN_PROGRESS"
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
  startedAt: string | null;
  uploadedAt: string | null;
  fileUrl: string | null;
  postingNotes: string | null;
  scheduleNote: string | null;
  waApproved: boolean;
  /** ISO time when designer requested admin approve-to-edit; null if none */
  editRequestedAt: string | null;
  editRequestNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  isDueToday: boolean;
};

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
