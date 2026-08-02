import { prisma } from "@/lib/db";
import { addDaysYmd, dayIdForYmd, getTodayKey } from "@/lib/team-checklists";
import { teamOutletLabel } from "@/lib/team-outlets";
import {
  DESIGNER_ASSIGNEE_WEEKDAY,
  DESIGNER_ASSIGNEE_WEEKEND,
  DESIGNER_DAILY_TARGET,
  DESIGNER_OPTIONAL_LEAVES_PER_MONTH,
  DESIGNER_PERFORMANCE_IDS,
  DESIGNER_POINTS_PER_LEAVE,
  DESIGNER_STACK_START_DATE,
  DESIGNER_WEEKLY_TARGET,
  designerDisplayName,
  type DesignerDaySeriesPoint,
  type DesignerHolidaySundayDto,
  type DesignerMissedDayDto,
  type DesignerMetricsDto,
  type DesignerPerformanceDto,
  type DesignerStackDto,
} from "@/lib/team-designer-jobs-shared";
import {
  computeDesignerMetrics,
  isDesignerJobPastDue,
  DESIGNER_UPLOAD_DUE_TIME,
  weekStartMonday,
} from "@/lib/team-designer-jobs";

/**
 * Target workdays by role (queue ownership):
 * - Jeslyn (weekday): Mon–Fri — Saturday is Mahesh’s lane, not her miss.
 * - Mahesh (weekend): Mon–Sat — Sunday off the stacked target.
 */
function isStackWorkday(assigneeId: string, ymd: string): boolean {
  const day = dayIdForYmd(ymd);
  if (day === "sun") return false;
  if (assigneeId === DESIGNER_ASSIGNEE_WEEKDAY) {
    return day !== "sat";
  }
  // Mahesh + generic helpers (assigneeId "") — Mon–Sat
  if (assigneeId === DESIGNER_ASSIGNEE_WEEKEND || !assigneeId) {
    return true;
  }
  return day !== "sat";
}

const TZ = "Asia/Kolkata";
const SERIES_DAYS = 14;
/** After this IST hour, under-target becomes a hard red flag. */
export const DESIGNER_RED_FLAG_HOUR_IST = 18;
/**
 * Cumulative “Behind / Reached” stack is scored for the day only after this hour.
 * Catch-up from past missed days still shows earlier.
 */
export const DESIGNER_STACK_SCORE_HOUR_IST = 20;


function monthKeyFromYmd(ymd: string): string {
  return ymd.slice(0, 7);
}

function monthStartYmd(monthKey: string): string {
  return `${monthKey}-01`;
}

function prevMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthEndYmd(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m!, 0)); // last day of month
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function countWorkdaysInclusive(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): number {
  if (fromYmd > toYmd) return 0;
  let n = 0;
  let cur = fromYmd;
  // hard cap ~400 days
  for (let i = 0; i < 400 && cur <= toYmd; i++) {
    if (isStackWorkday(assigneeId, cur)) n += 1;
    cur = addDaysYmd(cur, 1);
  }
  return n;
}

function istYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Snap non Mon–Sat days back to the previous stack workday. */
function previousStackWorkday(ymd: string): string {
  let cur = ymd;
  for (let i = 0; i < 14; i++) {
    if (isStackWorkday("", cur)) return cur;
    cur = addDaysYmd(cur, -1);
  }
  return ymd;
}

type CloseRow = {
  startedAt: Date | null;
  uploadedAt: Date | null;
  dueDate: string;
};

type ClassifiedClose =
  | { kind: "workday"; creditYmd: string; sameDay: boolean }
  | { kind: "sunday_work"; sundayYmd: string }
  | { kind: "skip" };

/**
 * Attribution:
 * - Start Mon–Sat → credit that workday. Points only if Start+Close same day (extras).
 * - Start Sunday → Sunday work (even if closed Monday): catch-up first, else holiday point.
 * - No start stamp → credit close workday, no points.
 */
export function classifyDesignerClose(row: CloseRow): ClassifiedClose {
  const startYmd = row.startedAt ? istYmd(row.startedAt) : null;
  const closeYmd = row.uploadedAt ? istYmd(row.uploadedAt) : startYmd;
  if (!closeYmd && !startYmd) {
    if (row.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(row.dueDate)) {
      return {
        kind: "workday",
        creditYmd: previousStackWorkday(row.dueDate),
        sameDay: false,
      };
    }
    return { kind: "skip" };
  }

  const startSun = startYmd ? dayIdForYmd(startYmd) === "sun" : false;

  // Any job started on Sunday = Sunday work → catch-up or holiday point
  if (startSun && startYmd) {
    return { kind: "sunday_work", sundayYmd: startYmd };
  }

  if (startYmd && !startSun) {
    return {
      kind: "workday",
      creditYmd: previousStackWorkday(startYmd),
      // Extra points only when opened + closed the same calendar day
      sameDay: Boolean(closeYmd && startYmd === closeYmd),
    };
  }

  // No designer start stamp — credit close day, never award points
  if (closeYmd) {
    return {
      kind: "workday",
      creditYmd: previousStackWorkday(closeYmd),
      sameDay: false,
    };
  }
  return { kind: "skip" };
}

/** @deprecated — prefer classifyDesignerClose + ledger */
export function creditWorkdayYmd(
  startedAt: Date | null | undefined,
  uploadedAt: Date | null | undefined,
  dueDate?: string | null
): string | null {
  const c = classifyDesignerClose({
    startedAt: startedAt ?? null,
    uploadedAt: uploadedAt ?? null,
    dueDate: dueDate ?? "",
  });
  if (c.kind === "workday") return c.creditYmd;
  if (c.kind === "sunday_work") return previousStackWorkday(addDaysYmd(c.sundayYmd, -1));
  return null;
}

type DayBucket = { total: number; sameDay: number };

type CloseLedger = {
  byWorkday: Map<string, number>;
  holidayPoints: number;
};

async function fetchCloseRows(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<CloseRow[]> {
  const fetchFrom = addDaysYmd(fromYmd, -14);
  const fetchTo = addDaysYmd(toYmd, 2);
  const { start } = istDayBounds(fetchFrom);
  const { end } = istDayBounds(fetchTo);
  return prisma.teamDesignerJob.findMany({
    where: {
      assigneeId,
      status: "DESIGN_DONE",
      closedByRole: "designer",
      OR: [
        { startedAt: { gte: start, lte: end } },
        { uploadedAt: { gte: start, lte: end } },
      ],
    },
    select: { startedAt: true, uploadedAt: true, dueDate: true },
  });
}

function holidayPointsFromWorkday(total: number, sameDay: number): number {
  const nonSame = Math.max(0, total - sameDay);
  const targetFilledByNonSame = Math.min(DESIGNER_DAILY_TARGET, nonSame);
  const sameDayNeededForTarget = Math.max(0, DESIGNER_DAILY_TARGET - targetFilledByNonSame);
  return Math.max(0, sameDay - sameDayNeededForTarget);
}

/**
 * Build workday credits + holiday points for [fromYmd, toYmd].
 * Sunday same-day closes fill oldest deficits first, then become points.
 */
async function computeCloseLedger(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<CloseLedger> {
  const byWorkday = new Map<string, number>();
  const buckets = new Map<string, DayBucket>();
  let holidayPoints = 0;
  if (fromYmd > toYmd) return { byWorkday, holidayPoints };

  const rows = await fetchCloseRows(assigneeId, fromYmd, toYmd);
  const sundayPool: string[] = [];

  for (const r of rows) {
    const c = classifyDesignerClose(r);
    if (c.kind === "skip") continue;
    if (c.kind === "sunday_work") {
      if (c.sundayYmd >= fromYmd && c.sundayYmd <= toYmd) sundayPool.push(c.sundayYmd);
      continue;
    }
    if (c.creditYmd < fromYmd || c.creditYmd > toYmd) continue;
    // Don't credit onto Sunday
    if (!isStackWorkday(assigneeId, c.creditYmd)) continue;
    const b = buckets.get(c.creditYmd) ?? { total: 0, sameDay: 0 };
    b.total += 1;
    if (c.sameDay) b.sameDay += 1;
    buckets.set(c.creditYmd, b);
  }

  for (const [ymd, b] of buckets) {
    byWorkday.set(ymd, b.total);
  }

  // Workday same-day extras → holiday points (before Sunday catch-up mutates totals)
  for (const b of buckets.values()) {
    holidayPoints += holidayPointsFromWorkday(b.total, b.sameDay);
  }

  // Sunday-started work → catch-up on oldest short workdays, else holiday points
  sundayPool.sort();
  for (const sundayYmd of sundayPool) {
    let placed = false;
    let cur = addDaysYmd(sundayYmd, -1);
    for (let i = 0; i < 60 && cur >= fromYmd; i++) {
      if (isStackWorkday(assigneeId, cur)) {
        const have = byWorkday.get(cur) ?? 0;
        if (have < DESIGNER_DAILY_TARGET) {
          byWorkday.set(cur, have + 1);
          placed = true;
          break;
        }
      }
      cur = addDaysYmd(cur, -1);
    }
    if (!placed) holidayPoints += 1;
  }

  return { byWorkday, holidayPoints };
}

async function loadClosesByCreditDay(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<Map<string, number>> {
  const { byWorkday } = await computeCloseLedger(assigneeId, fromYmd, toYmd);
  return byWorkday;
}

async function countDesignerCloses(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<number> {
  const byDay = await loadClosesByCreditDay(assigneeId, fromYmd, toYmd);
  let n = 0;
  for (const v of byDay.values()) n += v;
  return n;
}

function listMonthSundays(monthKey: string, today: string): DesignerHolidaySundayDto[] {
  const start = `${monthKey}-01`;
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  const out: DesignerHolidaySundayDto[] = [];
  for (let d = 1; d <= last; d++) {
    const ymd = `${monthKey}-${String(d).padStart(2, "0")}`;
    if (dayIdForYmd(ymd) !== "sun") continue;
    const label = new Date(`${ymd}T12:00:00+05:30`).toLocaleDateString("en-GB", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    out.push({
      date: ymd,
      label,
      isPast: ymd < today,
      isToday: ymd === today,
    });
  }
  return out;
}

/**
 * Past workdays where closes &lt; 4.
 * A day only counts after it fully ends (IST calendar: after 11:59 PM → next day).
 * Today is never “missed” until tomorrow 12:00 AM.
 */
async function listMissedWorkdays(
  assigneeId: string,
  fromYmd: string,
  toYmd: string,
  cap = 8
): Promise<DesignerMissedDayDto[]> {
  if (fromYmd > toYmd) return [];
  // Only score days strictly before today — full 00:00–23:59 window must be over
  const lastCompletable = addDaysYmd(toYmd, -1);
  if (fromYmd > lastCompletable) return [];
  const closedByDay = await loadClosesByCreditDay(assigneeId, fromYmd, lastCompletable);
  const missed: DesignerMissedDayDto[] = [];
  let cur = lastCompletable;
  for (let i = 0; i < 400 && cur >= fromYmd; i++) {
    if (isStackWorkday(assigneeId, cur)) {
      const closed = closedByDay.get(cur) ?? 0;
      if (closed < DESIGNER_DAILY_TARGET) {
        missed.push({
          date: cur,
          closed,
          target: DESIGNER_DAILY_TARGET,
          missed: DESIGNER_DAILY_TARGET - closed,
        });
        if (missed.length >= cap) break;
      }
    }
    cur = addDaysYmd(cur, -1);
  }
  return missed;
}

export async function computeDesignerStack(
  assigneeId: string,
  today = getTodayKey()
): Promise<DesignerStackDto> {
  const countFrom = DESIGNER_STACK_START_DATE;
  const monthKey = monthKeyFromYmd(today);
  const thisMonthStart = monthStartYmd(monthKey);
  const rangeStart =
    thisMonthStart < countFrom ? countFrom : thisMonthStart;
  const effectiveToday = today < countFrom ? countFrom : today;

  const workDaysSoFar =
    effectiveToday < rangeStart
      ? 0
      : countWorkdaysInclusive(assigneeId, rangeStart, effectiveToday);
  const targetSoFar = workDaysSoFar * DESIGNER_DAILY_TARGET;
  const closedSoFar =
    effectiveToday < rangeStart
      ? 0
      : await countDesignerCloses(assigneeId, rangeStart, effectiveToday);
  const deficitSoFar = Math.max(0, targetSoFar - closedSoFar);

  let lastMonthKey: string | null = null;
  let lastMonthDeficit = 0;
  if (monthKey > monthKeyFromYmd(countFrom)) {
    lastMonthKey = prevMonthKey(monthKey);
    const lmStartRaw = monthStartYmd(lastMonthKey);
    const lmStart = lmStartRaw < countFrom ? countFrom : lmStartRaw;
    const lmEnd = monthEndYmd(lastMonthKey);
    if (lmStart <= lmEnd) {
      const lmDays = countWorkdaysInclusive(assigneeId, lmStart, lmEnd);
      const lmTarget = lmDays * DESIGNER_DAILY_TARGET;
      const lmClosed = await countDesignerCloses(assigneeId, lmStart, lmEnd);
      lastMonthDeficit = Math.max(0, lmTarget - lmClosed);
    }
  }

  const net = closedSoFar - targetSoFar - lastMonthDeficit;
  const stackedBehind = Math.max(0, -net);
  const surplusSoFar = Math.max(0, net);

  // Holiday points from ledger (same-day extras + Sunday extras after catch-up)
  const ledgerFrom = rangeStart < countFrom ? countFrom : rangeStart;
  const ledger = await computeCloseLedger(assigneeId, ledgerFrom, effectiveToday);
  const holidayPoints = ledger.holidayPoints;
  const leaveDaysEarned = Math.floor(holidayPoints / DESIGNER_POINTS_PER_LEAVE);
  const advancePoints = holidayPoints;

  const weekStart = weekStartMonday(today);
  const weekKey = weekStart;
  const weekRangeStart = weekStart < countFrom ? countFrom : weekStart;
  const weekDaysSoFar =
    effectiveToday < weekRangeStart
      ? 0
      : countWorkdaysInclusive(assigneeId, weekRangeStart, effectiveToday);
  const weekTargetSoFar = weekDaysSoFar * DESIGNER_DAILY_TARGET;
  const weekClosed =
    effectiveToday < weekRangeStart
      ? 0
      : await countDesignerCloses(assigneeId, weekRangeStart, effectiveToday);

  const missFrom = rangeStart < countFrom ? countFrom : rangeStart;
  const missedDays = await listMissedWorkdays(assigneeId, missFrom, effectiveToday);

  return {
    countFrom,
    monthKey,
    workDaysSoFar,
    targetSoFar,
    closedSoFar,
    deficitSoFar,
    lastMonthKey,
    lastMonthDeficit,
    stackedBehind,
    surplusSoFar,
    holidayPoints,
    leaveDaysEarned,
    advancePoints,
    sundayHoliday: true,
    optionalLeavesPerMonth: DESIGNER_OPTIONAL_LEAVES_PER_MONTH,
    monthSundays: listMonthSundays(monthKey, today),
    pointsPerLeave: DESIGNER_POINTS_PER_LEAVE,
    weekKey,
    weekTargetSoFar,
    weekClosed,
    weekTargetFull: DESIGNER_WEEKLY_TARGET,
    missedDays,
  };
}

export function istHourNow(d = new Date()): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(d)
  );
  return Number.isFinite(hour) ? hour : 0;
}

export function istMinuteNow(d = new Date()): number {
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      minute: "2-digit",
    }).format(d)
  );
  return Number.isFinite(minute) ? minute : 0;
}

export function istDayBounds(ymd: string): { start: Date; end: Date } {
  return {
    start: new Date(`${ymd}T00:00:00+05:30`),
    end: new Date(`${ymd}T23:59:59.999+05:30`),
  };
}

export type ReadyJobLine = {
  id: string;
  title: string;
  outletLabel: string;
  postDate: string;
  dueDate: string;
  dueTime: string;
  isOverdue: boolean;
  isDueToday: boolean;
};

export async function listReadyToStartJobs(assigneeId: string): Promise<ReadyJobLine[]> {
  const today = getTodayKey();
  const rows = await prisma.teamDesignerJob.findMany({
    where: { assigneeId, status: "READY_TO_DESIGN" },
    orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }, { postDate: "asc" }],
    take: 40,
    select: {
      id: true,
      title: true,
      outletId: true,
      postDate: true,
      dueDate: true,
      dueTime: true,
    },
  });
  return rows.map((r) => {
    const dueTime = r.dueTime || DESIGNER_UPLOAD_DUE_TIME;
    const past = isDesignerJobPastDue({ dueDate: r.dueDate, dueTime });
    return {
      id: r.id,
      title: r.title,
      outletLabel: teamOutletLabel(r.outletId),
      postDate: r.postDate,
      dueDate: r.dueDate,
      dueTime,
      isOverdue: past,
      isDueToday: r.dueDate === today && !past,
    };
  });
}

/** Designer closes credited to a workday (by start day, Sunday → prior Sat). */
export async function designerClosesOnDay(
  assigneeId: string,
  ymd: string
): Promise<number> {
  const byDay = await loadClosesByCreditDay(assigneeId, ymd, ymd);
  return byDay.get(ymd) ?? 0;
}

async function dayActivity(assigneeId: string, ymd: string): Promise<{
  closed: number;
  sundaySameDayCloses: number;
  firstStart: Date | null;
  lastEnd: Date | null;
}> {
  const { start, end } = istDayBounds(ymd);
  const [creditClosed, starts, ends] = await Promise.all([
    designerClosesOnDay(assigneeId, ymd),
    prisma.teamDesignerJob.findMany({
      where: {
        assigneeId,
        startedByRole: "designer",
        startedAt: { gte: start, lte: end },
      },
      select: { startedAt: true },
      orderBy: { startedAt: "asc" },
      take: 1,
    }),
    prisma.teamDesignerJob.findMany({
      where: {
        assigneeId,
        status: "DESIGN_DONE",
        closedByRole: "designer",
        uploadedAt: { gte: start, lte: end },
      },
      select: { startedAt: true, uploadedAt: true, dueDate: true },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);
  let sundaySameDayCloses = 0;
  for (const e of ends) {
    const c = classifyDesignerClose(e);
    if (c.kind === "sunday_work") sundaySameDayCloses += 1;
  }
  return {
    closed: creditClosed,
    sundaySameDayCloses,
    firstStart: starts[0]?.startedAt ?? null,
    lastEnd: ends[0]?.uploadedAt ?? null,
  };
}

async function buildSeries(assigneeId: string, today: string): Promise<DesignerDaySeriesPoint[]> {
  const from = addDaysYmd(today, -(SERIES_DAYS - 1));
  const { start } = istDayBounds(from);
  const { end } = istDayBounds(today);

  const [closedByDay, starts, uploads] = await Promise.all([
    loadClosesByCreditDay(assigneeId, from, today),
    prisma.teamDesignerJob.findMany({
      where: {
        assigneeId,
        startedByRole: "designer",
        startedAt: { gte: start, lte: end },
      },
      select: { startedAt: true },
    }),
    prisma.teamDesignerJob.findMany({
      where: {
        assigneeId,
        status: "DESIGN_DONE",
        closedByRole: "designer",
        uploadedAt: { gte: start, lte: end },
      },
      select: { uploadedAt: true },
    }),
  ]);

  const firstStartByDay = new Map<string, Date>();
  const lastEndByDay = new Map<string, Date>();

  for (const u of uploads) {
    if (!u.uploadedAt) continue;
    const key = istYmd(u.uploadedAt);
    const prev = lastEndByDay.get(key);
    if (!prev || u.uploadedAt > prev) lastEndByDay.set(key, u.uploadedAt);
  }
  for (const s of starts) {
    if (!s.startedAt) continue;
    const key = istYmd(s.startedAt);
    const prev = firstStartByDay.get(key);
    if (!prev || s.startedAt < prev) firstStartByDay.set(key, s.startedAt);
  }

  const series: DesignerDaySeriesPoint[] = [];
  for (let i = 0; i < SERIES_DAYS; i++) {
    const date = addDaysYmd(from, i);
    const workday = isStackWorkday("", date);
    series.push({
      date,
      closed: workday ? closedByDay.get(date) ?? 0 : 0,
      target: workday ? DESIGNER_DAILY_TARGET : 0,
      firstStart: firstStartByDay.get(date)?.toISOString() ?? null,
      lastEnd: lastEndByDay.get(date)?.toISOString() ?? null,
    });
  }
  return series;
}

export async function computeDesignerPerformance(
  assigneeId: string
): Promise<DesignerPerformanceDto> {
  const today = getTodayKey();
  const hour = istHourNow();
  const [metrics, activity, readyToStart, readyDueRows, series, stack] =
    await Promise.all([
      computeDesignerMetrics(assigneeId),
      dayActivity(assigneeId, today),
      prisma.teamDesignerJob.count({
        where: { assigneeId, status: "READY_TO_DESIGN" },
      }),
      prisma.teamDesignerJob.findMany({
        where: { assigneeId, status: "READY_TO_DESIGN" },
        select: { dueDate: true, dueTime: true },
      }),
      buildSeries(assigneeId, today),
      computeDesignerStack(assigneeId, today),
    ]);
  const overdueReady = readyDueRows.filter((r) =>
    isDesignerJobPastDue({
      dueDate: r.dueDate,
      dueTime: r.dueTime || DESIGNER_UPLOAD_DUE_TIME,
    })
  ).length;

  const isSunday = dayIdForYmd(today) === "sun";
  // Credit by start day — Sunday never has a daily target / closedToday score
  const closedToday = isSunday ? 0 : activity.closed;
  // Sunday: uploads that started+closed today (true catch-up / holiday-point work)
  const catchUpClosedToday = isSunday ? activity.sundaySameDayCloses : 0;
  const dailyTarget = isSunday ? 0 : DESIGNER_DAILY_TARGET;
  const underTarget = !isSunday && closedToday < DESIGNER_DAILY_TARGET;
  const pastCatchUp = (stack.missedDays ?? []).reduce(
    (n, d) => n + (d.missed ?? 0),
    0
  );
  const redFlag =
    (underTarget && hour >= DESIGNER_RED_FLAG_HOUR_IST) ||
    pastCatchUp > 0 ||
    (hour >= DESIGNER_STACK_SCORE_HOUR_IST && stack.stackedBehind > 0);
  const expectedByNow = isSunday
    ? 0
    : hour < 11
      ? 0
      : hour < 14
        ? 1
        : hour < 17
          ? 2
          : hour < DESIGNER_RED_FLAG_HOUR_IST
            ? 3
            : 4;
  const onPace =
    isSunday || closedToday >= Math.min(DESIGNER_DAILY_TARGET, expectedByNow);

  return {
    assigneeId,
    name: designerDisplayName(assigneeId),
    today,
    closedToday,
    dailyTarget,
    isSundayHoliday: isSunday,
    catchUpClosedToday,
    readyToStart,
    inProgress: metrics.inProgress,
    overdueReady,
    closedThisWeek: metrics.closedThisWeek,
    firstStartedAt: activity.firstStart?.toISOString() ?? null,
    lastEndedAt: activity.lastEnd?.toISOString() ?? null,
    underTarget,
    redFlag,
    onPace,
    series,
    stack,
  };
}

export async function computeAllDesignerPerformance(): Promise<DesignerPerformanceDto[]> {
  return Promise.all(
    DESIGNER_PERFORMANCE_IDS.map((id) => computeDesignerPerformance(id))
  );
}

export { computeDesignerMetrics };
export type { DesignerMetricsDto };
