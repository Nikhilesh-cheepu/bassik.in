/** Client-safe designer job types & constants (no DB / Node imports). */

export const DESIGNER_MONTH_OUTLET_IDS = ["c53", "boiler-room", "firefly", "komma"] as const;
/** Weekly Fri–Sun TV calendar video (one per outlet per weekend). */
export const DESIGNER_CALENDAR_OUTLET_IDS = ["c53", "boiler-room", "firefly"] as const;

export const DESIGNER_ASSIGNEE_WEEKEND = "mahesh";
export const DESIGNER_ASSIGNEE_WEEKDAY = "jeslyn";

/**
 * Designer upload deadlines (IST).
 * - Jeslyn (Mon–Thu): day before go-live @ 20:00 (Mon flyer → Sun 8 PM).
 * - Mahesh (Fri–Sat–Sun): go-live − 4 days @ 20:00 (Fri → Mon 8 PM).
 * - Weekend TV calendar: Tuesday 8 PM before that Fri–Sat–Sun weekend.
 */
export const DESIGNER_UPLOAD_DUE_TIME = "20:00";
export const DESIGNER_WEEKDAY_DUE_TIME = "20:00";
export const DESIGNER_WEEKEND_DUE_TIME = "20:00";
export const DESIGNER_CALENDAR_DUE_TIME = "20:00";
export const DESIGNER_LAST_WA_TIME = "19:00";
export const DESIGNER_DAILY_TARGET = 4;
/** Mon–Sat workdays (Sunday off target). 6 × 4 = 24. */
export const DESIGNER_WEEKLY_TARGET = DESIGNER_DAILY_TARGET * 6;
/** Optional leaves each month — use or lose (do not stack). */
export const DESIGNER_OPTIONAL_LEAVES_PER_MONTH = 2;
/** Advance closes needed to unlock one permission leave. */
export const DESIGNER_POINTS_PER_LEAVE = DESIGNER_DAILY_TARGET;
/** Always schedule this many days forward from today (not calendar months). */
export const DESIGNER_WINDOW_DAYS = 30;
/** Cumulative 4/day stack starts here (IST). Misses carry forward. Sunday = break. */
export const DESIGNER_STACK_START_DATE = "2026-08-01";

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
  /** NONE | AFTER_CURRENT | PAUSE_NOW — set by admin when sending */
  priorityMode: DesignerPriorityMode;
  /** Admin drag priority — lower first */
  sortOrder: number;
  startedAt: string | null;
  /** designer | admin | null */
  startedByRole: "designer" | "admin" | null;
  uploadedAt: string | null;
  /** designer | admin | null — only designer counts for 4/day */
  closedByRole: "designer" | "admin" | null;
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

/** ISO timestamps for first start / last upload today (IST). */
export type DesignerDaySeriesPoint = {
  date: string;
  closed: number;
  target: number;
  firstStart: string | null;
  lastEnd: string | null;
};

/** One under-target workday for miss copy. */
export type DesignerMissedDayDto = {
  date: string;
  closed: number;
  target: number;
  missed: number;
};

/** Cumulative target vs done from DESIGNER_STACK_START_DATE (Mon–Sat workdays). */
export type DesignerStackDto = {
  countFrom: string;
  monthKey: string;
  workDaysSoFar: number;
  /** 4 × Mon–Sat workdays in this month (from max(start, monthStart) → today) */
  targetSoFar: number;
  /** Designer closes counted toward stack */
  closedSoFar: number;
  /** max(0, targetSoFar − closedSoFar) this month */
  deficitSoFar: number;
  lastMonthKey: string | null;
  /** Missed count carried from previous month (0 in first stack month) */
  lastMonthDeficit: number;
  /** What they still owe overall: this-month deficit + last-month carry */
  stackedBehind: number;
  /** Extra closes beyond target (after clearing carry) */
  surplusSoFar: number;
  /** floor(surplus / POINTS) — unlocks leave that still needs permission */
  leaveDaysEarned: number;
  /** Advance points (= surplus closes after clearing behind) */
  advancePoints: number;
  /** Always true — Sunday is a fixed holiday */
  sundayHoliday: boolean;
  /** 2/month optional leaves — do not carry unused into next month */
  optionalLeavesPerMonth: number;
  /** This ISO week (Mon–Sat): target through today and closes */
  weekKey: string;
  weekTargetSoFar: number;
  weekClosed: number;
  weekTargetFull: number;
  /** Recent under-target workdays (newest first), for WA / UI */
  missedDays: DesignerMissedDayDto[];
};

/** Split open queue into catch-up / today's 4 / later (extras spill out of today). */
export function partitionOpenDesignerQueue(
  jobs: DesignerJobDto[],
  dailyTarget = DESIGNER_DAILY_TARGET
): {
  catchUp: DesignerJobDto[];
  todayPack: DesignerJobDto[];
  upNext: DesignerJobDto[];
} {
  const sorted = sortDesignerJobs(jobs.filter((j) => j.status !== "DESIGN_DONE"));
  const catchUp = sorted.filter((j) => j.isOverdue);
  const rest = sorted.filter((j) => !j.isOverdue);
  const todayPack = rest.slice(0, dailyTarget);
  const upNext = rest.slice(dailyTarget);
  return { catchUp, todayPack, upNext };
}

export function designerFormatLabel(format: string): string {
  if (format === "story") return "Story";
  if (format === "calendar") return "TV calendar";
  if (format === "ad") return "Ad";
  return "Post";
}

export type DesignerPerformanceDto = {
  assigneeId: string;
  name: string;
  today: string;
  closedToday: number;
  dailyTarget: number;
  readyToStart: number;
  inProgress: number;
  overdueReady: number;
  closedThisWeek: number;
  /** Min startedAt today IST */
  firstStartedAt: string | null;
  /** Max uploadedAt today IST */
  lastEndedAt: string | null;
  /** Under daily target (always) */
  underTarget: boolean;
  /** Strict red after 18:00 IST when still under target */
  redFlag: boolean;
  /** closedToday progressing toward target before evening */
  onPace: boolean;
  series: DesignerDaySeriesPoint[];
  /** Cumulative stack from 1 Aug 2026 */
  stack: DesignerStackDto;
};

export type DesignerPriorityMode = "NONE" | "AFTER_CURRENT" | "PAUSE_NOW";

export function parseDesignerPriorityMode(raw: unknown): DesignerPriorityMode {
  if (raw === "AFTER_CURRENT" || raw === "PAUSE_NOW" || raw === "NONE") return raw;
  return "NONE";
}

export type DesignerNudgeKind =
  | "no_start"
  | "behind_pace"
  | "deadline_soon"
  | "missed_target"
  | "slow_task"
  | "priority_pause_now"
  | "priority_after_current";

export type DesignerReminderLogDto = {
  id: string;
  assigneeId: string;
  kind: DesignerNudgeKind;
  dateKey: string;
  body: string;
  delivery: "sent" | "skipped_no_config" | "failed";
  metaMessageId: string | null;
  shareUrl: string | null;
  createdAt: string;
};

/** Live click-to-send WA suggestions (works before Cloud API is configured). */
export type DesignerSuggestedNudgeDto = {
  assigneeId: string;
  name: string;
  kind: DesignerNudgeKind;
  label: string;
  body: string;
  shareUrl: string;
  jobId: string;
};

export const DESIGNER_PERFORMANCE_IDS = [
  DESIGNER_ASSIGNEE_WEEKEND,
  DESIGNER_ASSIGNEE_WEEKDAY,
] as const;

export function designerDisplayName(assigneeId: string): string {
  if (assigneeId === "mahesh") return "Mahesh";
  if (assigneeId === "jeslyn") return "Jeslyn";
  return assigneeId;
}
