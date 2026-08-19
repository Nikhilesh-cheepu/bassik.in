import { prisma } from "@/lib/db";
import { addDaysYmd, dayIdForYmd, getTodayKey } from "@/lib/team-checklists";
import {
  loadDoneAdjustmentsByDay,
  listDesignerDoneAdjustments,
  mergeDoneAdjustmentsIntoMap,
} from "@/lib/team-designer-done-adjustments";
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
  DESIGNER_WINDOW_DAYS,
  clampDesignerTaskWeight,
  clampDesignerWindowDays,
  designerDisplayName,
  designerJobCreditYmd,
  type DesignerDaySeriesPoint,
  type DesignerHolidaySundayDto,
  type DesignerMissedDayDto,
  type DesignerMetricsDto,
  type DesignerDoneAdjustmentDto,
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
  updatedAt?: Date;
  dueDate: string;
  taskWeight?: number | null;
  closedByRole?: string | null;
};

function creditYmdFromCloseRow(row: CloseRow): string | null {
  return designerJobCreditYmd({
    uploadedAt: row.uploadedAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  });
}

/** Day strip + Done tab: count finishes on upload/start/update day (IST). */
function closesByCreditDayFromRows(
  assigneeId: string,
  rows: CloseRow[],
  fromYmd: string,
  toYmd: string
): Map<string, number> {
  const byDay = new Map<string, number>();
  if (fromYmd > toYmd) return byDay;
  for (const r of rows) {
    const creditYmd = creditYmdFromCloseRow(r);
    if (!creditYmd || creditYmd < fromYmd || creditYmd > toYmd) continue;
    if (!isStackWorkday(assigneeId, creditYmd)) continue;
    const weight = clampDesignerTaskWeight(r.taskWeight);
    byDay.set(creditYmd, (byDay.get(creditYmd) ?? 0) + weight);
  }
  return byDay;
}

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
  const rows = await prisma.$queryRaw<
    Array<{
      startedAt: Date | null;
      uploadedAt: Date | null;
      updatedAt: Date;
      dueDate: string;
      taskWeight: number | null;
      closedByRole: string | null;
    }>
  >`
    SELECT "startedAt", "uploadedAt", "updatedAt", "dueDate", "taskWeight", "closedByRole"
    FROM "TeamDesignerJob"
    WHERE "assigneeId" = ${assigneeId}
      AND status = 'DESIGN_DONE'
      AND (
        ("startedAt" IS NOT NULL AND "startedAt" >= ${start} AND "startedAt" <= ${end})
        OR ("uploadedAt" IS NOT NULL AND "uploadedAt" >= ${start} AND "uploadedAt" <= ${end})
        OR ("updatedAt" >= ${start} AND "updatedAt" <= ${end})
      )
  `;
  return rows.map((r) => ({
    startedAt: r.startedAt,
    uploadedAt: r.uploadedAt,
    updatedAt: r.updatedAt,
    dueDate: r.dueDate,
    taskWeight: clampDesignerTaskWeight(r.taskWeight),
    closedByRole: r.closedByRole,
  }));
}

function holidayPointsFromWorkday(total: number, sameDay: number): number {
  const nonSame = Math.max(0, total - sameDay);
  const targetFilledByNonSame = Math.min(DESIGNER_DAILY_TARGET, nonSame);
  const sameDayNeededForTarget = Math.max(0, DESIGNER_DAILY_TARGET - targetFilledByNonSame);
  return Math.max(0, sameDay - sameDayNeededForTarget);
}

/** Credit one close onto the oldest short workday before `beforeYmd`, if any. */
function placeCatchUpFill(
  assigneeId: string,
  byWorkday: Map<string, number>,
  fromYmd: string,
  beforeYmd: string
): boolean {
  let cur = addDaysYmd(beforeYmd, -1);
  for (let i = 0; i < 60 && cur >= fromYmd; i++) {
    if (isStackWorkday(assigneeId, cur)) {
      const have = byWorkday.get(cur) ?? 0;
      if (have < DESIGNER_DAILY_TARGET) {
        byWorkday.set(cur, have + 1);
        return true;
      }
    }
    cur = addDaysYmd(cur, -1);
  }
  return false;
}

/**
 * Build workday credits + holiday points for [fromYmd, toYmd].
 * Catch-up first: any close (weekday or Sunday start) fills oldest past shortfall
 * before it counts toward the start day’s 4/day — so Catch up work doesn’t fake “4/4 today”.
 */
async function computeCloseLedger(
  assigneeId: string,
  fromYmd: string,
  toYmd: string,
  prefetched?: CloseRow[]
): Promise<CloseLedger> {
  const byWorkday = new Map<string, number>();
  const buckets = new Map<string, DayBucket>();
  let holidayPoints = 0;
  if (fromYmd > toYmd) return { byWorkday, holidayPoints };

  const rows =
    prefetched ?? (await fetchCloseRows(assigneeId, fromYmd, toYmd));
  const designerRows = rows.filter((r) => r.closedByRole === "designer");
  // Chronological: earlier finishes apply to catch-up debt first
  designerRows.sort((a, b) => {
    const at = (a.uploadedAt ?? a.startedAt)?.getTime() ?? 0;
    const bt = (b.uploadedAt ?? b.startedAt)?.getTime() ?? 0;
    return at - bt;
  });

  const sundayPool: string[] = [];
  type Pending = { creditYmd: string; sameDay: boolean; dueDate: string };
  const pendingWorkdays: Pending[] = [];

  for (const r of designerRows) {
    const c = classifyDesignerClose(r);
    if (c.kind === "skip") continue;
    const weight = clampDesignerTaskWeight(r.taskWeight);
    if (c.kind === "sunday_work") {
      if (c.sundayYmd >= fromYmd && c.sundayYmd <= toYmd) {
        for (let i = 0; i < weight; i++) sundayPool.push(c.sundayYmd);
      }
      continue;
    }
    if (c.creditYmd < fromYmd || c.creditYmd > toYmd) continue;
    if (!isStackWorkday(assigneeId, c.creditYmd)) continue;
    for (let i = 0; i < weight; i++) {
      pendingWorkdays.push({
        creditYmd: c.creditYmd,
        sameDay: c.sameDay,
        dueDate: r.dueDate || "",
      });
    }
  }

  // Weekday closes: (1) fill past 4/day holes (2) past-due deadlines ≠ today’s 4 (3) else today
  for (const p of pendingWorkdays) {
    if (placeCatchUpFill(assigneeId, byWorkday, fromYmd, p.creditYmd)) {
      continue; // calendar catch-up — not today’s pack
    }
    // Design due before the start day = missed-deadline catch-up (e.g. Mon story due Sun)
    if (p.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(p.dueDate) && p.dueDate < p.creditYmd) {
      const dueDay = previousStackWorkday(p.dueDate);
      if (
        dueDay >= fromYmd &&
        dueDay < p.creditYmd &&
        isStackWorkday(assigneeId, dueDay)
      ) {
        const have = byWorkday.get(dueDay) ?? 0;
        if (have < DESIGNER_DAILY_TARGET) {
          byWorkday.set(dueDay, have + 1);
          continue;
        }
      }
      // Still catch-up work — do not inflate today’s 4/4
      continue;
    }
    const b = buckets.get(p.creditYmd) ?? { total: 0, sameDay: 0 };
    b.total += 1;
    if (p.sameDay) b.sameDay += 1;
    buckets.set(p.creditYmd, b);
    byWorkday.set(p.creditYmd, (byWorkday.get(p.creditYmd) ?? 0) + 1);
  }

  // Same-day extras on a day’s own pack → holiday points
  for (const b of buckets.values()) {
    holidayPoints += holidayPointsFromWorkday(b.total, b.sameDay);
  }

  // Sunday-started work → catch-up on oldest short workdays, else holiday points
  sundayPool.sort();
  for (const sundayYmd of sundayPool) {
    if (!placeCatchUpFill(assigneeId, byWorkday, fromYmd, sundayYmd)) {
      holidayPoints += 1;
    }
  }

  return { byWorkday, holidayPoints };
}

/**
 * @deprecated — use closesByCreditDayFromRows (upload/start/update day, matches Done tab).
 */
function closesByStartDayFromRows(
  assigneeId: string,
  rows: CloseRow[],
  fromYmd: string,
  toYmd: string
): Map<string, number> {
  return closesByCreditDayFromRows(assigneeId, rows, fromYmd, toYmd);
}

async function loadClosesByStartDay(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<Map<string, number>> {
  if (fromYmd > toYmd) return new Map();
  const rows = await fetchCloseRows(assigneeId, fromYmd, toYmd);
  return closesByStartDayFromRows(assigneeId, rows, fromYmd, toYmd);
}

/** @deprecated name — now start-day counts (see loadClosesByStartDay). */
async function loadClosesByCreditDay(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<Map<string, number>> {
  return loadClosesByStartDay(assigneeId, fromYmd, toYmd);
}

function countWorkdayClosesInRange(
  assigneeId: string,
  byDay: Map<string, number>,
  fromYmd: string,
  toYmd: string
): number {
  if (fromYmd > toYmd) return 0;
  let n = 0;
  for (const [ymd, v] of byDay) {
    if (ymd < fromYmd || ymd > toYmd) continue;
    if (isStackWorkday(assigneeId, ymd)) n += v;
  }
  return n;
}

async function countDesignerCloses(
  assigneeId: string,
  fromYmd: string,
  toYmd: string
): Promise<number> {
  const byDay = await loadClosesByStartDay(assigneeId, fromYmd, toYmd);
  return countWorkdayClosesInRange(assigneeId, byDay, fromYmd, toYmd);
}

function listMissedWorkdaysFromMap(
  assigneeId: string,
  fromYmd: string,
  toYmd: string,
  closedByDay: Map<string, number>,
  cap = 8
): DesignerMissedDayDto[] {
  if (fromYmd > toYmd) return [];
  const lastCompletable = addDaysYmd(toYmd, -1);
  if (fromYmd > lastCompletable) return [];
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
  const lastCompletable = addDaysYmd(toYmd, -1);
  if (fromYmd > lastCompletable) return [];
  const closedByDay = await loadClosesByCreditDay(
    assigneeId,
    fromYmd,
    lastCompletable
  );
  return listMissedWorkdaysFromMap(
    assigneeId,
    fromYmd,
    toYmd,
    closedByDay,
    cap
  );
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
  // Stack / behind only counts fully finished calendar days (same rule as Catch up).
  // Today’s 4 don’t enter the deficit until tomorrow 12:00 AM IST.
  const scoreThrough = addDaysYmd(effectiveToday, -1);

  let lastMonthKey: string | null = null;
  let lmStart = "";
  let lmEnd = "";
  if (monthKey > monthKeyFromYmd(countFrom)) {
    lastMonthKey = prevMonthKey(monthKey);
    const lmStartRaw = monthStartYmd(lastMonthKey);
    lmStart = lmStartRaw < countFrom ? countFrom : lmStartRaw;
    lmEnd = monthEndYmd(lastMonthKey);
  }

  const weekStart = weekStartMonday(today);
  const weekKey = weekStart;
  const weekRangeStart = weekStart < countFrom ? countFrom : weekStart;
  const weekScoreThrough =
    scoreThrough < weekRangeStart ? addDaysYmd(weekRangeStart, -1) : scoreThrough;

  const ledgerFrom = rangeStart < countFrom ? countFrom : rangeStart;
  const missFrom = ledgerFrom;
  // One close-rows fetch covers month / last-month / week / ledger / missed
  const wideFrom = [ledgerFrom, lmStart || ledgerFrom, weekRangeStart, countFrom]
    .filter(Boolean)
    .sort()[0]!;
  const closeRows = await fetchCloseRows(assigneeId, wideFrom, effectiveToday);
  const byDay = closesByCreditDayFromRows(
    assigneeId,
    closeRows,
    wideFrom,
    effectiveToday
  );
  const stackAdjustments = await loadDoneAdjustmentsByDay(
    assigneeId,
    wideFrom,
    effectiveToday
  );
  mergeDoneAdjustmentsIntoMap(byDay, stackAdjustments);

  const workDaysSoFar =
    scoreThrough < rangeStart
      ? 0
      : countWorkdaysInclusive(assigneeId, rangeStart, scoreThrough);
  const targetSoFar = workDaysSoFar * DESIGNER_DAILY_TARGET;
  const closedSoFar =
    scoreThrough < rangeStart
      ? 0
      : countWorkdayClosesInRange(assigneeId, byDay, rangeStart, scoreThrough);
  const deficitSoFar = Math.max(0, targetSoFar - closedSoFar);

  let lastMonthDeficit = 0;
  if (lastMonthKey && lmStart && lmEnd && lmStart <= lmEnd) {
    const lmDays = countWorkdaysInclusive(assigneeId, lmStart, lmEnd);
    const lmTarget = lmDays * DESIGNER_DAILY_TARGET;
    const lmClosed = countWorkdayClosesInRange(
      assigneeId,
      byDay,
      lmStart,
      lmEnd
    );
    lastMonthDeficit = Math.max(0, lmTarget - lmClosed);
  }

  const net = closedSoFar - targetSoFar - lastMonthDeficit;
  const stackedBehind = Math.max(0, -net);
  const surplusSoFar = Math.max(0, net);

  const ledger = await computeCloseLedger(
    assigneeId,
    ledgerFrom,
    effectiveToday,
    closeRows
  );
  const holidayPoints = ledger.holidayPoints;
  const leaveDaysEarned = Math.floor(holidayPoints / DESIGNER_POINTS_PER_LEAVE);
  const advancePoints = holidayPoints;

  const weekDaysSoFar =
    weekScoreThrough < weekRangeStart
      ? 0
      : countWorkdaysInclusive(assigneeId, weekRangeStart, weekScoreThrough);
  const weekTargetSoFar = weekDaysSoFar * DESIGNER_DAILY_TARGET;
  const weekClosed =
    weekScoreThrough < weekRangeStart
      ? 0
      : countWorkdayClosesInRange(
          assigneeId,
          byDay,
          weekRangeStart,
          weekScoreThrough
        );

  const missedDays = listMissedWorkdaysFromMap(
    assigneeId,
    missFrom,
    effectiveToday,
    byDay
  );

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

/** Designer closes credited to a workday (finish day + manual admin credits). */
export async function designerClosesOnDay(
  assigneeId: string,
  ymd: string
): Promise<number> {
  const byDay = await loadClosesByCreditDay(assigneeId, ymd, ymd);
  const adj = await loadDoneAdjustmentsByDay(assigneeId, ymd, ymd);
  mergeDoneAdjustmentsIntoMap(byDay, adj);
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
    prisma.$queryRaw<
      Array<{
        startedAt: Date | null;
        uploadedAt: Date | null;
        dueDate: string;
        taskWeight: number | null;
      }>
    >`
      SELECT "startedAt", "uploadedAt", "dueDate", "taskWeight"
      FROM "TeamDesignerJob"
      WHERE "assigneeId" = ${assigneeId}
        AND status = 'DESIGN_DONE'
        AND "closedByRole" = 'designer'
        AND "uploadedAt" >= ${start}
        AND "uploadedAt" <= ${end}
      ORDER BY "uploadedAt" DESC
    `,
  ]);
  // Uploads today that were catch-up (Sunday start, or design due before start day)
  let sundaySameDayCloses = 0;
  for (const e of ends) {
    const weight = clampDesignerTaskWeight(e.taskWeight);
    const c = classifyDesignerClose(e);
    if (c.kind === "sunday_work") {
      sundaySameDayCloses += weight;
      continue;
    }
    if (c.kind === "workday" && e.dueDate && e.dueDate < c.creditYmd) {
      sundaySameDayCloses += weight; // reused as catch-up closes today (UI label)
    }
  }
  return {
    closed: creditClosed,
    sundaySameDayCloses,
    firstStart: starts[0]?.startedAt ?? null,
    lastEnd: ends[0]?.uploadedAt ?? null,
  };
}

async function buildSeries(
  assigneeId: string,
  today: string,
  opts?: { includeStarts?: boolean; windowDays?: number }
): Promise<DesignerDaySeriesPoint[]> {
  const windowDays = clampDesignerWindowDays(opts?.windowDays ?? DESIGNER_WINDOW_DAYS);
  const windowFrom = addDaysYmd(today, -(windowDays - 1));
  const from =
    windowFrom < DESIGNER_STACK_START_DATE ? DESIGNER_STACK_START_DATE : windowFrom;
  const { start } = istDayBounds(from);
  const { end } = istDayBounds(today);
  const includeStarts = opts?.includeStarts !== false;

  const rows = await fetchCloseRows(assigneeId, from, today);
  const closedByCreditDay = closesByCreditDayFromRows(
    assigneeId,
    rows,
    from,
    today
  );

  // Sunday extras (any finish credited to Sunday)
  for (const r of rows) {
    const creditYmd = creditYmdFromCloseRow(r);
    if (!creditYmd || creditYmd < from || creditYmd > today) continue;
    if (dayIdForYmd(creditYmd) !== "sun") continue;
    const weight = clampDesignerTaskWeight(r.taskWeight);
    closedByCreditDay.set(
      creditYmd,
      (closedByCreditDay.get(creditYmd) ?? 0) + weight
    );
  }

  const adjustments = await loadDoneAdjustmentsByDay(assigneeId, from, today);
  mergeDoneAdjustmentsIntoMap(closedByCreditDay, adjustments);

  const firstStartByDay = new Map<string, Date>();
  const lastEndByDay = new Map<string, Date>();

  for (const r of rows) {
    const creditYmd = creditYmdFromCloseRow(r);
    if (!creditYmd || creditYmd < from || creditYmd > today) continue;
    const when = r.uploadedAt ?? r.startedAt ?? r.updatedAt;
    if (when) {
      const prev = lastEndByDay.get(creditYmd);
      if (!prev || when > prev) lastEndByDay.set(creditYmd, when);
    }
  }

  if (includeStarts) {
    const starts = await prisma.teamDesignerJob.findMany({
      where: {
        assigneeId,
        startedAt: { gte: start, lte: end },
      },
      select: { startedAt: true },
    });
    for (const s of starts) {
      if (!s.startedAt) continue;
      const key = istYmd(s.startedAt);
      const prev = firstStartByDay.get(key);
      if (!prev || s.startedAt < prev) firstStartByDay.set(key, s.startedAt);
    }
  }

  const series: DesignerDaySeriesPoint[] = [];
  let cur = from;
  for (let i = 0; i < windowDays + 7 && cur <= today; i++) {
    const workday = isStackWorkday(assigneeId, cur);
    series.push({
      date: cur,
      closed: closedByCreditDay.get(cur) ?? 0,
      target: workday ? DESIGNER_DAILY_TARGET : 0,
      firstStart: firstStartByDay.get(cur)?.toISOString() ?? null,
      lastEnd: lastEndByDay.get(cur)?.toISOString() ?? null,
      manualDelta: adjustments.get(cur) ?? 0,
    });
    cur = addDaysYmd(cur, 1);
  }
  return series;
}

function decoratePerformance(
  assigneeId: string,
  today: string,
  parts: {
    closedToday: number;
    uploadedToday: number;
    uploadedTotal: number;
    catchUpClosedToday: number;
    readyToStart: number;
    inProgress: number;
    overdueReady: number;
    closedThisWeek: number;
    firstStartedAt: string | null;
    lastEndedAt: string | null;
    series: DesignerDaySeriesPoint[];
    stack: DesignerStackDto;
    doneAdjustments: DesignerDoneAdjustmentDto[];
  }
): DesignerPerformanceDto {
  const hour = istHourNow();
  const isSunday = dayIdForYmd(today) === "sun";
  const dailyTarget = isSunday ? 0 : DESIGNER_DAILY_TARGET;
  const underTarget = !isSunday && parts.closedToday < DESIGNER_DAILY_TARGET;
  const pastCatchUp = (parts.stack.missedDays ?? []).reduce(
    (n, d) => n + (d.missed ?? 0),
    0
  );
  const redFlag =
    (underTarget && hour >= DESIGNER_RED_FLAG_HOUR_IST) ||
    pastCatchUp > 0 ||
    (hour >= DESIGNER_STACK_SCORE_HOUR_IST && parts.stack.stackedBehind > 0);
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
    isSunday ||
    parts.closedToday >= Math.min(DESIGNER_DAILY_TARGET, expectedByNow);

  return {
    assigneeId,
    name: designerDisplayName(assigneeId),
    today,
    closedToday: parts.closedToday,
    uploadedToday: parts.uploadedToday,
    uploadedTotal: parts.uploadedTotal,
    dailyTarget,
    isSundayHoliday: isSunday,
    catchUpClosedToday: parts.catchUpClosedToday,
    readyToStart: parts.readyToStart,
    inProgress: parts.inProgress,
    overdueReady: parts.overdueReady,
    closedThisWeek: parts.closedThisWeek,
    firstStartedAt: parts.firstStartedAt,
    lastEndedAt: parts.lastEndedAt,
    underTarget,
    redFlag,
    onPace,
    series: parts.series,
    stack: parts.stack,
    doneAdjustments: parts.doneAdjustments,
  };
}

/** Home cards: stack + day strip + in-progress — skips heavy metrics counts. */
export async function computeDesignerPerformanceLite(
  assigneeId: string,
  windowDays = DESIGNER_WINDOW_DAYS
): Promise<DesignerPerformanceDto> {
  const today = getTodayKey();
  const isSunday = dayIdForYmd(today) === "sun";
  const days = clampDesignerWindowDays(windowDays);
  const windowFrom = addDaysYmd(today, -(days - 1));
  const seriesFrom =
    windowFrom < DESIGNER_STACK_START_DATE ? DESIGNER_STACK_START_DATE : windowFrom;
  const [series, stack, inProgress, closedTodayRaw, doneAdjustments] =
    await Promise.all([
    buildSeries(assigneeId, today, { includeStarts: false, windowDays: days }),
    computeDesignerStack(assigneeId, today),
    prisma.teamDesignerJob.count({
      where: { assigneeId, status: "IN_PROGRESS" },
    }),
    isSunday
      ? Promise.resolve(0)
      : designerClosesOnDay(assigneeId, today),
    listDesignerDoneAdjustments({
      assigneeId,
      fromYmd: seriesFrom,
      toYmd: today,
      limit: 12,
    }),
  ]);
  const uploadedToday = series.find((p) => p.date === today)?.closed ?? 0;
  const uploadedTotal = series.reduce((n, p) => n + p.closed, 0);
  return decoratePerformance(assigneeId, today, {
    closedToday: closedTodayRaw,
    uploadedToday,
    uploadedTotal,
    catchUpClosedToday: 0,
    readyToStart: 0,
    inProgress,
    overdueReady: 0,
    closedThisWeek: stack.weekClosed,
    firstStartedAt: null,
    lastEndedAt: null,
    series,
    stack,
    doneAdjustments,
  });
}

export async function computeDesignerPerformance(
  assigneeId: string,
  windowDays = DESIGNER_WINDOW_DAYS
): Promise<DesignerPerformanceDto> {
  const today = getTodayKey();
  const days = clampDesignerWindowDays(windowDays);
  const windowFrom = addDaysYmd(today, -(days - 1));
  const seriesFrom =
    windowFrom < DESIGNER_STACK_START_DATE ? DESIGNER_STACK_START_DATE : windowFrom;
  const [metrics, activity, readyToStart, readyDueRows, series, stack, doneAdjustments] =
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
      buildSeries(assigneeId, today, { windowDays: days }),
      computeDesignerStack(assigneeId, today),
      listDesignerDoneAdjustments({
        assigneeId,
        fromYmd: seriesFrom,
        toYmd: today,
        limit: 12,
      }),
    ]);
  const overdueReady = readyDueRows.filter((r) =>
    isDesignerJobPastDue({
      dueDate: r.dueDate,
      dueTime: r.dueTime || DESIGNER_UPLOAD_DUE_TIME,
    })
  ).length;

  const isSunday = dayIdForYmd(today) === "sun";
  const closedToday = isSunday ? 0 : activity.closed;
  const uploadedToday = series.find((p) => p.date === today)?.closed ?? 0;
  const uploadedTotal = series.reduce((n, p) => n + p.closed, 0);

  return decoratePerformance(assigneeId, today, {
    closedToday,
    uploadedToday,
    uploadedTotal,
    catchUpClosedToday: activity.sundaySameDayCloses,
    readyToStart,
    inProgress: metrics.inProgress,
    overdueReady,
    closedThisWeek: metrics.closedThisWeek,
    firstStartedAt: activity.firstStart?.toISOString() ?? null,
    lastEndedAt: activity.lastEnd?.toISOString() ?? null,
    series,
    stack,
    doneAdjustments,
  });
}

const LITE_CACHE_TTL_MS = 15_000;
let litePerfCache: {
  at: number;
  windowDays: number;
  data: DesignerPerformanceDto[];
} | null = null;

export async function computeAllDesignerPerformanceLite(
  windowDays = DESIGNER_WINDOW_DAYS
): Promise<DesignerPerformanceDto[]> {
  const days = clampDesignerWindowDays(windowDays);
  if (
    litePerfCache &&
    Date.now() - litePerfCache.at < LITE_CACHE_TTL_MS &&
    litePerfCache.windowDays === days
  ) {
    return litePerfCache.data;
  }
  const data = await Promise.all(
    DESIGNER_PERFORMANCE_IDS.map((id) => computeDesignerPerformanceLite(id, days))
  );
  litePerfCache = { at: Date.now(), windowDays: days, data };
  return data;
}

export function invalidateDesignerPerformanceLiteCache(): void {
  litePerfCache = null;
}

export async function computeAllDesignerPerformance(): Promise<DesignerPerformanceDto[]> {
  return Promise.all(
    DESIGNER_PERFORMANCE_IDS.map((id) => computeDesignerPerformance(id))
  );
}

export { computeDesignerMetrics };
export type { DesignerMetricsDto };
