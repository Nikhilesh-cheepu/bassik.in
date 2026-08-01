import { prisma } from "@/lib/db";
import { addDaysYmd, dayIdForYmd, getTodayKey } from "@/lib/team-checklists";
import { teamOutletLabel } from "@/lib/team-outlets";
import {
  DESIGNER_DAILY_TARGET,
  DESIGNER_OPTIONAL_LEAVES_PER_MONTH,
  DESIGNER_PERFORMANCE_IDS,
  DESIGNER_POINTS_PER_LEAVE,
  DESIGNER_STACK_START_DATE,
  DESIGNER_WEEKLY_TARGET,
  designerDisplayName,
  type DesignerDaySeriesPoint,
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
 * Target workdays for every designer: Mon–Sat (6 × 4 = 24/week).
 * Sunday is off the stacked target — queue/Sunday posts can still exist.
 */
function isStackWorkday(_assigneeId: string, ymd: string): boolean {
  return dayIdForYmd(ymd) !== "sun";
}

const TZ = "Asia/Kolkata";
const SERIES_DAYS = 14;
/** After this IST hour, under-target becomes a hard red flag. */
export const DESIGNER_RED_FLAG_HOUR_IST = 18;


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

/** Snap Sunday (and any non Mon–Sat day) back to the previous stack workday. */
function previousStackWorkday(ymd: string): string {
  let cur = ymd;
  for (let i = 0; i < 14; i++) {
    if (isStackWorkday("", cur)) return cur;
    cur = addDaysYmd(cur, -1);
  }
  return ymd;
}

/**
 * Credit day for a close = day the designer started the job (IST).
 * Sunday starts/closes never credit Sunday — they land on the prior workday (catch-up).
 */
export function creditWorkdayYmd(
  startedAt: Date | null | undefined,
  uploadedAt: Date | null | undefined,
  dueDate?: string | null
): string | null {
  const anchor = startedAt ?? uploadedAt;
  if (anchor) return previousStackWorkday(istYmd(anchor));
  if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return previousStackWorkday(dueDate);
  }
  return null;
}

async function loadClosesByCreditDay(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<Map<string, number>> {
  const byDay = new Map<string, number>();
  if (fromYmd > toYmd) return byDay;
  const fetchFrom = addDaysYmd(fromYmd, -14);
  const fetchTo = addDaysYmd(toYmd, 2);
  const { start } = istDayBounds(fetchFrom);
  const { end } = istDayBounds(fetchTo);
  const rows = await prisma.teamDesignerJob.findMany({
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
  for (const r of rows) {
    const credit = creditWorkdayYmd(r.startedAt, r.uploadedAt, r.dueDate);
    if (!credit || credit < fromYmd || credit > toYmd) continue;
    byDay.set(credit, (byDay.get(credit) ?? 0) + 1);
  }
  return byDay;
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

async function listMissedWorkdays(
  assigneeId: string,
  fromYmd: string,
  toYmd: string,
  cap = 8
): Promise<DesignerMissedDayDto[]> {
  if (fromYmd > toYmd) return [];
  const closedByDay = await loadClosesByCreditDay(assigneeId, fromYmd, toYmd);
  const missed: DesignerMissedDayDto[] = [];
  let cur = toYmd;
  for (let i = 0; i < 400 && cur >= fromYmd; i++) {
    if (isStackWorkday(assigneeId, cur)) {
      const closed = closedByDay.get(cur) ?? 0;
      if (closed < DESIGNER_DAILY_TARGET) {
        // Grace only while that workday is still in progress (not on Sunday / after)
        const stillToday =
          cur === toYmd &&
          isStackWorkday(assigneeId, toYmd) &&
          istHourNow() < DESIGNER_RED_FLAG_HOUR_IST;
        if (!stillToday) {
          missed.push({
            date: cur,
            closed,
            target: DESIGNER_DAILY_TARGET,
            missed: DESIGNER_DAILY_TARGET - closed,
          });
          if (missed.length >= cap) break;
        }
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
  const advancePoints = surplusSoFar;
  const leaveDaysEarned = Math.floor(advancePoints / DESIGNER_POINTS_PER_LEAVE);

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
    leaveDaysEarned,
    advancePoints,
    sundayHoliday: true,
    optionalLeavesPerMonth: DESIGNER_OPTIONAL_LEAVES_PER_MONTH,
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
  uploadsOnCalendarDay: number;
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
      select: { uploadedAt: true },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);
  return {
    closed: creditClosed,
    uploadsOnCalendarDay: ends.length,
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
  const catchUpClosedToday = isSunday ? activity.uploadsOnCalendarDay : 0;
  const dailyTarget = isSunday ? 0 : DESIGNER_DAILY_TARGET;
  const underTarget = !isSunday && closedToday < DESIGNER_DAILY_TARGET;
  const redFlag =
    (underTarget && hour >= DESIGNER_RED_FLAG_HOUR_IST) || stack.stackedBehind > 0;
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
