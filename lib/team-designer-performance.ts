import { prisma } from "@/lib/db";
import { addDaysYmd, getTodayKey } from "@/lib/team-checklists";
import { teamOutletLabel } from "@/lib/team-outlets";
import {
  DESIGNER_DAILY_TARGET,
  DESIGNER_PERFORMANCE_IDS,
  designerDisplayName,
  type DesignerDaySeriesPoint,
  type DesignerMetricsDto,
  type DesignerPerformanceDto,
} from "@/lib/team-designer-jobs-shared";
import { computeDesignerMetrics } from "@/lib/team-designer-jobs";

const TZ = "Asia/Kolkata";
const SERIES_DAYS = 14;
/** After this IST hour, under-target becomes a hard red flag. */
export const DESIGNER_RED_FLAG_HOUR_IST = 18;

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
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    outletLabel: teamOutletLabel(r.outletId),
    postDate: r.postDate,
    dueDate: r.dueDate,
    dueTime: r.dueTime || "20:00",
    isOverdue: r.dueDate < today,
    isDueToday: r.dueDate === today,
  }));
}

async function dayActivity(assigneeId: string, ymd: string): Promise<{
  closed: number;
  firstStart: Date | null;
  lastEnd: Date | null;
}> {
  const { start, end } = istDayBounds(ymd);
  const [closed, starts, ends] = await Promise.all([
    prisma.teamDesignerJob.count({
      where: {
        assigneeId,
        status: "DESIGN_DONE",
        closedByRole: "designer",
        uploadedAt: { gte: start, lte: end },
      },
    }),
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
      take: 1,
    }),
  ]);
  return {
    closed,
    firstStart: starts[0]?.startedAt ?? null,
    lastEnd: ends[0]?.uploadedAt ?? null,
  };
}

async function buildSeries(assigneeId: string, today: string): Promise<DesignerDaySeriesPoint[]> {
  const from = addDaysYmd(today, -(SERIES_DAYS - 1));
  const { start } = istDayBounds(from);
  const { end } = istDayBounds(today);

  const [uploads, starts] = await Promise.all([
    prisma.teamDesignerJob.findMany({
      where: {
        assigneeId,
        status: "DESIGN_DONE",
        closedByRole: "designer",
        uploadedAt: { gte: start, lte: end },
      },
      select: { uploadedAt: true },
    }),
    prisma.teamDesignerJob.findMany({
      where: {
        assigneeId,
        startedByRole: "designer",
        startedAt: { gte: start, lte: end },
      },
      select: { startedAt: true },
    }),
  ]);

  const closedByDay = new Map<string, number>();
  const firstStartByDay = new Map<string, Date>();
  const lastEndByDay = new Map<string, Date>();

  for (const u of uploads) {
    if (!u.uploadedAt) continue;
    const key = u.uploadedAt.toLocaleDateString("en-CA", { timeZone: TZ });
    closedByDay.set(key, (closedByDay.get(key) ?? 0) + 1);
    const prev = lastEndByDay.get(key);
    if (!prev || u.uploadedAt > prev) lastEndByDay.set(key, u.uploadedAt);
  }
  for (const s of starts) {
    if (!s.startedAt) continue;
    const key = s.startedAt.toLocaleDateString("en-CA", { timeZone: TZ });
    const prev = firstStartByDay.get(key);
    if (!prev || s.startedAt < prev) firstStartByDay.set(key, s.startedAt);
  }

  const series: DesignerDaySeriesPoint[] = [];
  for (let i = 0; i < SERIES_DAYS; i++) {
    const date = addDaysYmd(from, i);
    series.push({
      date,
      closed: closedByDay.get(date) ?? 0,
      target: DESIGNER_DAILY_TARGET,
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
  const [metrics, activity, readyToStart, overdueReady, series] = await Promise.all([
    computeDesignerMetrics(assigneeId),
    dayActivity(assigneeId, today),
    prisma.teamDesignerJob.count({
      where: { assigneeId, status: "READY_TO_DESIGN" },
    }),
    prisma.teamDesignerJob.count({
      where: {
        assigneeId,
        status: "READY_TO_DESIGN",
        dueDate: { lt: today },
      },
    }),
    buildSeries(assigneeId, today),
  ]);

  const closedToday = activity.closed;
  const underTarget = closedToday < DESIGNER_DAILY_TARGET;
  const redFlag = underTarget && hour >= DESIGNER_RED_FLAG_HOUR_IST;
  // On pace if at least ~1 job per ~4.5 working hours toward 4 by evening (rough)
  const expectedByNow =
    hour < 11 ? 0 : hour < 14 ? 1 : hour < 17 ? 2 : hour < DESIGNER_RED_FLAG_HOUR_IST ? 3 : 4;
  const onPace = closedToday >= Math.min(DESIGNER_DAILY_TARGET, expectedByNow);

  return {
    assigneeId,
    name: designerDisplayName(assigneeId),
    today,
    closedToday,
    dailyTarget: DESIGNER_DAILY_TARGET,
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
  };
}

export async function computeAllDesignerPerformance(): Promise<DesignerPerformanceDto[]> {
  return Promise.all(
    DESIGNER_PERFORMANCE_IDS.map((id) => computeDesignerPerformance(id))
  );
}

export { computeDesignerMetrics };
export type { DesignerMetricsDto };
