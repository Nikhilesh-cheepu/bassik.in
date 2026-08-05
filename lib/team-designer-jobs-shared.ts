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
/** @deprecated No fixed optional leaves — only points-unlocked leave. */
export const DESIGNER_OPTIONAL_LEAVES_PER_MONTH = 0;
/** Holiday points needed to unlock one permission leave. */
export const DESIGNER_POINTS_PER_LEAVE = 7;
/** Always schedule this many days forward from today (not calendar months). */
export const DESIGNER_WINDOW_DAYS = 30;
/** Cumulative 4/day stack starts here (IST). Misses carry forward. Sunday = break. */
export const DESIGNER_STACK_START_DATE = "2026-08-01";
/**
 * Weekend posts target due = go-live − 4 days (Fri→Mon).
 * Absolute last comfort slip for a Friday pack: +2 days (Mon→Wed). Prefer never.
 */
export const DESIGNER_WEEKEND_DEADLINE_SLIP_DAYS = 2;

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
  /** Admin released from Catch up — stays in Open even if overdue */
  catchUpExempt: boolean;
  /** Admin drag priority — lower first */
  sortOrder: number;
  startedAt: string | null;
  /** designer | admin | null */
  startedByRole: "designer" | "admin" | null;
  uploadedAt: string | null;
  /** designer | admin | null — only designer counts for 4/day */
  closedByRole: "designer" | "admin" | null;
  /** Primary creative — first of fileUrls (Amit Daily handoff). */
  fileUrl: string | null;
  /** All creatives for this job (min 1 to close). Upload one at a time. */
  fileUrls: string[];
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

/**
 * Drag / interrupt pins use negative sortOrder (see nextManualDesignerSortOrder).
 * 0 = unset / legacy → deadline order. Natural keys are YYYYMMDD*100+… (≥ ~2026010100).
 * Values in (0, ceiling) are treated as pins only if ever used; seed uses natural keys.
 */
export const DESIGNER_MANUAL_SORT_CEILING = 1_000_000;

/** Outlet rotation within the same deadline: C53 → Boiler → Firefly → Komma. */
export function designerOutletRank(outletId: string): number {
  const i = DESIGNER_MONTH_OUTLET_IDS.indexOf(
    outletId as (typeof DESIGNER_MONTH_OUTLET_IDS)[number]
  );
  return i >= 0 ? i : 99;
}

/**
 * Natural queue key from **design deadline**, then outlet, then format.
 * Fri events (due Mon) → Sat (due Tue) → Sun (due Wed). Extra tasks with an
 * earlier deadline slot ahead of later weekend work.
 */
export function naturalDesignerSortOrder(
  dueDate: string,
  outletId: string,
  format = "post"
): number {
  const day = Number(String(dueDate).replace(/-/g, ""));
  if (!Number.isFinite(day) || day <= 0) {
    return DESIGNER_MANUAL_SORT_CEILING + designerOutletRank(outletId);
  }
  const formatBump =
    format === "calendar" ? 50 : format.startsWith("adhoc") ? 20 : 0;
  return day * 100 + formatBump + designerOutletRank(outletId);
}

function priorityInsertRank(mode: DesignerPriorityMode | string | null | undefined): number {
  if (mode === "PAUSE_NOW") return 0;
  if (mode === "AFTER_CURRENT") return 1;
  return 2;
}

function isManualDesignerSortOrder(sortOrder: number | null | undefined): boolean {
  const n = sortOrder ?? 0;
  // Drag / interrupt pins are negative (see nextManualDesignerSortOrder + reorder).
  // sortOrder 0 = unset/legacy → deadline order. Natural keys are ≥ ~2026010100.
  return n < 0;
}

/** Admin drag reorder → negative pins so order sticks above deadline sort. */
export function manualSortOrdersFromDragRank(count: number): number[] {
  const n = Math.max(0, count);
  return Array.from({ length: n }, (_, index) => index - n);
}

/**
 * Queue order:
 * 1) In progress / Paused pin
 * 2) Interrupt mode (ASAP / after current)
 * 3) Manual drag pins (negative sortOrder)
 * 4) Deadline → event date → outlet → format (never random)
 */
export function sortDesignerJobs(jobs: DesignerJobDto[]): DesignerJobDto[] {
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

    // Admin drag pins beat interrupt mode + deadline (otherwise reorder looks broken)
    const aManual = isManualDesignerSortOrder(a.sortOrder);
    const bManual = isManualDesignerSortOrder(b.sortOrder);
    if (aManual || bManual) {
      if (aManual && bManual && (a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) {
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      }
      if (aManual !== bManual) return aManual ? -1 : 1;
    }

    const pia = priorityInsertRank(a.priorityMode);
    const pib = priorityInsertRank(b.priorityMode);
    if (pia !== pib) return pia - pib;

    // Deadline queue — earliest design due first (Fri pack Mon, Sat Tue, …)
    // Released catch-up jobs sort with the normal pack, not the overdue band.
    const aLate = a.isOverdue && !a.catchUpExempt;
    const bLate = b.isOverdue && !b.catchUpExempt;
    if (aLate !== bLate) return aLate ? -1 : 1;
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.isDueToday !== b.isDueToday) return a.isDueToday ? -1 : 1;
    if (a.postDate !== b.postDate) return a.postDate.localeCompare(b.postDate);
    const oa = designerOutletRank(a.outletId);
    const ob = designerOutletRank(b.outletId);
    if (oa !== ob) return oa - ob;
    const fa = a.format === "calendar" ? 1 : a.format.startsWith("adhoc") ? 2 : 0;
    const fb = b.format === "calendar" ? 1 : b.format.startsWith("adhoc") ? 2 : 0;
    if (fa !== fb) return fa - fb;
    if ((a.sortOrder ?? 0) !== (b.sortOrder ?? 0)) {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return (a.title || "").localeCompare(b.title || "");
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

/** Merge primary fileUrl + fileUrls JSON into a de-duped list (primary first). */
export function normalizeDesignerFileUrls(
  fileUrl?: string | null,
  fileUrls?: unknown
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const u = raw.trim();
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  if (typeof fileUrl === "string") push(fileUrl);
  for (const u of parseDesignerLinks(fileUrls)) push(u);
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

export type DesignerHolidaySundayDto = {
  date: string;
  label: string;
  isPast: boolean;
  isToday: boolean;
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
  /** Extra closes beyond target (after clearing carry) — legacy alias of holidayPoints */
  surplusSoFar: number;
  /** Holiday points (same-day extras + Sunday extras after catch-up) */
  holidayPoints: number;
  /** floor(holidayPoints / 7) — unlocks leave that still needs permission */
  leaveDaysEarned: number;
  /** @deprecated use holidayPoints */
  advancePoints: number;
  /** Always true — Sunday is a fixed holiday */
  sundayHoliday: boolean;
  /** Always 0 — leave only via holiday points */
  optionalLeavesPerMonth: number;
  /** Sundays in the current month (for Holiday tab) */
  monthSundays: DesignerHolidaySundayDto[];
  pointsPerLeave: number;
  /** This ISO week (Mon–Sat): target through today and closes */
  weekKey: string;
  weekTargetSoFar: number;
  weekClosed: number;
  weekTargetFull: number;
  /** Recent under-target workdays (newest first), for WA / UI */
  missedDays: DesignerMissedDayDto[];
};

export type DesignerCatchUpMeta = {
  /** Past full workdays under 4/day (today never counts until tomorrow 12 AM) */
  catchUpSlots: number;
  /** e.g. "Saturday · 1 Aug" */
  pendingFromLabel: string | null;
  /**
   * Admin Drop catch-up forgives — count every non-done exempt job (Ready + To send).
   * Unsend must not reopen a forgiven slot / pull a replacement into Catch up.
   */
  releasedSlots?: number;
};

export function catchUpMetaFromStack(stack: {
  missedDays?: Array<{ date: string; missed: number }>;
} | null | undefined): DesignerCatchUpMeta {
  const missed = stack?.missedDays ?? [];
  const catchUpSlots = missed.reduce((n, d) => n + (d.missed ?? 0), 0);
  // missedDays is newest-first — "from" = oldest remaining shortfall
  const miss = missed.length > 0 ? missed[missed.length - 1] : undefined;
  if (!miss?.date) return { catchUpSlots, pendingFromLabel: null };
  const [y, m, d] = miss.date.split("-").map(Number);
  if (!y || !m || !d) return { catchUpSlots, pendingFromLabel: miss.date };
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayName = dt.toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });
  const dateLabel = dt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return { catchUpSlots, pendingFromLabel: `${dayName} · ${dateLabel}` };
}

/**
 * Drop catch-up forgives oldest shortfall first — debt / "from …" label start after
 * forgiven slots (no longer owed in Catch up).
 */
export function catchUpMetaAfterRelease(
  stack: {
    missedDays?: Array<{ date: string; missed: number }>;
  } | null | undefined,
  releasedSlots = 0
): DesignerCatchUpMeta {
  const raw = [...(stack?.missedDays ?? [])];
  let left = Math.max(0, releasedSlots);
  // missedDays is newest-first in perf — forgive oldest first
  const oldestFirst = [...raw].reverse();
  const keptAsc: Array<{ date: string; missed: number }> = [];
  for (const day of oldestFirst) {
    const missed = Math.max(0, day.missed ?? 0);
    if (left <= 0) {
      keptAsc.push({ date: day.date, missed });
      continue;
    }
    if (left >= missed) {
      left -= missed;
      continue;
    }
    keptAsc.push({ date: day.date, missed: missed - left });
    left = 0;
  }
  // Restore newest-first for catchUpMetaFromStack’s “from” = earliest remaining
  const remaining = keptAsc.reverse();
  return {
    ...catchUpMetaFromStack({ missedDays: remaining }),
    releasedSlots: Math.max(0, releasedSlots),
  };
}

/**
 * Split open queue into catch-up / today's 4 / later.
 * Catch up = shortfall from past calendar days (4/day target), not job deadlines.
 * Admin Drop catch-up (catchUpExempt) forgives one slot — never pull a replacement,
 * including when that job is later Unsent to To send.
 */
export function partitionOpenDesignerQueue(
  jobs: DesignerJobDto[],
  dailyTarget = DESIGNER_DAILY_TARGET,
  opts?: {
    /** Closes still owed from earlier full workdays */
    catchUpSlots?: number;
    /** e.g. "Saturday · 1 Aug" */
    pendingFromLabel?: string | null;
    /** Forgiven slots (Ready + To send exempt). Prefer this over counting only `jobs`. */
    releasedSlots?: number;
  }
): {
  catchUp: DesignerJobDto[];
  todayPack: DesignerJobDto[];
  upNext: DesignerJobDto[];
  catchUpHint: string;
  /** Debt after admin Drop catch-up */
  effectiveCatchUpSlots: number;
} {
  const sorted = sortDesignerJobs(jobs.filter((j) => j.status !== "DESIGN_DONE"));
  const releasedFromJobs = sorted.filter((j) => j.catchUpExempt).length;
  const released = Math.max(0, opts?.releasedSlots ?? releasedFromJobs);
  const owed = Math.max(0, opts?.catchUpSlots ?? 0);
  // Each Drop forgives one slot — no backfill when the job is Unsent
  const slots = Math.max(0, owed - released);
  const fillable = sorted.filter((j) => !j.catchUpExempt);
  const catchUp = fillable.slice(0, slots);
  const catchIds = new Set(catchUp.map((j) => j.id));
  const remaining = sorted.filter((j) => !catchIds.has(j.id));
  // Today = due today / overdue only — do not pull tomorrow’s jobs after closes
  const dueTodayOrLate = remaining.filter((j) => j.isDueToday || j.isOverdue);
  const laterJobs = remaining.filter((j) => !j.isDueToday && !j.isOverdue);
  const todayPack = dueTodayOrLate.slice(0, dailyTarget);
  const upNext = [...dueTodayOrLate.slice(dailyTarget), ...laterJobs];
  const from = opts?.pendingFromLabel?.trim();
  const catchUpHint =
    catchUp.length > 0
      ? from
        ? `${catchUp.length} unfinished from ${from}. Finish these first, then today’s ${dailyTarget}.`
        : `${catchUp.length} unfinished from earlier. Finish these first, then today’s ${dailyTarget}.`
      : "";
  return { catchUp, todayPack, upNext, catchUpHint, effectiveCatchUpSlots: slots };
}

/**
 * Partition open jobs per assignee (so Mahesh’s missed day doesn’t steal Jeslyn’s queue).
 */
export function partitionOpenDesignerQueueByAssignee(
  jobs: DesignerJobDto[],
  perfByAssignee: Map<string, DesignerCatchUpMeta>,
  dailyTarget = DESIGNER_DAILY_TARGET
): {
  catchUp: DesignerJobDto[];
  todayPack: DesignerJobDto[];
  upNext: DesignerJobDto[];
  catchUpHint: string;
  effectiveCatchUpSlots: number;
} {
  const byAssignee = new Map<string, DesignerJobDto[]>();
  for (const j of jobs) {
    const list = byAssignee.get(j.assigneeId) ?? [];
    list.push(j);
    byAssignee.set(j.assigneeId, list);
  }
  const catchUp: DesignerJobDto[] = [];
  const todayPack: DesignerJobDto[] = [];
  const upNext: DesignerJobDto[] = [];
  let catchUpHint = "";
  let effectiveCatchUpSlots = 0;
  for (const [assigneeId, list] of byAssignee) {
    const meta = perfByAssignee.get(assigneeId) ?? {
      catchUpSlots: 0,
      pendingFromLabel: null,
      releasedSlots: 0,
    };
    const parts = partitionOpenDesignerQueue(list, dailyTarget, {
      catchUpSlots: meta.catchUpSlots,
      pendingFromLabel: meta.pendingFromLabel,
      releasedSlots: meta.releasedSlots,
    });
    catchUp.push(...parts.catchUp);
    todayPack.push(...parts.todayPack);
    upNext.push(...parts.upNext);
    effectiveCatchUpSlots += parts.effectiveCatchUpSlots;
    if (!catchUpHint && parts.catchUp.length > 0) catchUpHint = parts.catchUpHint;
  }
  return {
    catchUp: sortDesignerJobs(catchUp),
    todayPack: sortDesignerJobs(todayPack),
    upNext: sortDesignerJobs(upNext),
    catchUpHint,
    effectiveCatchUpSlots,
  };
}

export function designerFormatLabel(format: string): string {
  if (format === "story") return "Story";
  if (format === "calendar") return "TV calendar";
  if (format === "ad") return "Ad";
  return "Post";
}

function addDaysYmdLocal(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function weekdayShortUtc(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  return dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
}

function isSundayYmd(ymd: string): boolean {
  return weekdayShortUtc(ymd) === "Sun";
}

export type DesignerFreeSlotSuggestion = {
  date: string;
  /** e.g. "Mon 4 Aug" */
  label: string;
  /** Open jobs already due that day for this designer */
  openDue: number;
  /** Remaining capacity toward 4/day */
  free: number;
  note: string;
};

/**
 * Suggest up to 3 Mon–Sat deadline days with the most free capacity (next ~2 weeks).
 * Prefer sooner light days so extras land when he’s ahead — not piled on Monday.
 */
export function suggestDesignerFreeDeadlineSlots(
  jobs: DesignerJobDto[],
  assigneeId: string,
  today: string,
  opts?: { count?: number; lookAheadDays?: number; dailyTarget?: number }
): DesignerFreeSlotSuggestion[] {
  const count = opts?.count ?? 3;
  const lookAhead = opts?.lookAheadDays ?? 14;
  const dailyTarget = opts?.dailyTarget ?? DESIGNER_DAILY_TARGET;
  const open = jobs.filter(
    (j) =>
      j.assigneeId === assigneeId &&
      j.status !== "DESIGN_DONE" &&
      /^\d{4}-\d{2}-\d{2}$/.test(j.dueDate)
  );
  const dueCount = new Map<string, number>();
  for (const j of open) {
    dueCount.set(j.dueDate, (dueCount.get(j.dueDate) ?? 0) + 1);
  }

  const candidates: DesignerFreeSlotSuggestion[] = [];
  for (let i = 0; i < lookAhead; i++) {
    const date = addDaysYmdLocal(today, i);
    if (isSundayYmd(date)) continue;
    const openDue = dueCount.get(date) ?? 0;
    const free = Math.max(0, dailyTarget - openDue);
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
    const label = `${weekdayShortUtc(date)} ${dt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })}`;
    const note =
      free >= dailyTarget
        ? "Clear — best for extras"
        : free > 0
          ? `${free} free of ${dailyTarget}`
          : openDue > dailyTarget
            ? `Overloaded (${openDue})`
            : "Full (4)";
    candidates.push({ date, label, openDue, free, note });
  }

  // Prefer free capacity, then sooner dates; always return `count` lightest options
  const withRoom = candidates
    .filter((c) => c.free > 0)
    .sort((a, b) => b.free - a.free || a.date.localeCompare(b.date));
  const picked: DesignerFreeSlotSuggestion[] = [];
  const seen = new Set<string>();
  for (const c of withRoom) {
    if (picked.length >= count) break;
    picked.push(c);
    seen.add(c.date);
  }
  if (picked.length < count) {
    const rest = [...candidates]
      .filter((c) => !seen.has(c.date))
      .sort((a, b) => a.openDue - b.openDue || a.date.localeCompare(b.date));
    for (const c of rest) {
      if (picked.length >= count) break;
      picked.push(c);
    }
  }
  return picked.sort((a, b) => a.date.localeCompare(b.date));
}

export type DesignerPerformanceDto = {
  assigneeId: string;
  name: string;
  today: string;
  /** Closes credited to today (start-day). Always 0 on Sunday. */
  closedToday: number;
  /** 0 on Sunday — no daily target on holiday */
  dailyTarget: number;
  /** True when today is Sunday (fixed holiday) */
  isSundayHoliday: boolean;
  /** Closes uploaded today that count as catch-up toward earlier workdays */
  catchUpClosedToday: number;
  readyToStart: number;
  inProgress: number;
  overdueReady: number;
  closedThisWeek: number;
  /** Min startedAt today IST */
  firstStartedAt: string | null;
  /** Max uploadedAt today IST */
  lastEndedAt: string | null;
  /** Under daily target (false on Sunday) */
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
  | "priority_after_current"
  | "queue_updated"
  | "amit_ready"
  | "amit_drive_check";

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
