import type { TeamDesignerJob, TeamDesignerJobStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addDaysYmd,
  dayIdForYmd,
  getTodayKey,
  handoffByDateFromJson,
  isWeekendPostDayId,
  previousDayYmd,
  WEEKEND_POST_LEAD_DAYS,
} from "@/lib/team-checklists";
import { CHECKLIST_DAY_LABELS, type ChecklistDayId } from "@/lib/team-checklist-templates";
import { teamOutletLabel } from "@/lib/team-outlets";
import {
  DESIGNER_ASSIGNEE_WEEKDAY,
  DESIGNER_ASSIGNEE_WEEKEND,
  DESIGNER_CALENDAR_DUE_TIME,
  DESIGNER_CALENDAR_OUTLET_IDS,
  DESIGNER_DAILY_TARGET,
  DESIGNER_MONTH_OUTLET_IDS,
  DESIGNER_UPLOAD_DUE_TIME,
  DESIGNER_WEEKDAY_DUE_TIME,
  DESIGNER_WEEKEND_DUE_TIME,
  DESIGNER_WINDOW_DAYS,
  DESIGNER_MANUAL_SORT_CEILING,
  isBoilerplateDesignerDescription,
  naturalDesignerSortOrder,
  parseDesignerLinks,
  parseDesignerPriorityMode,
  sortDesignerJobs,
  type DesignerJobDto,
  type DesignerJobStatus,
  type DesignerMetricsDto,
} from "@/lib/team-designer-jobs-shared";

export type { DesignerJobDto, DesignerJobLane, DesignerJobStatus, DesignerMetricsDto } from "@/lib/team-designer-jobs-shared";
export {
  DESIGNER_ASSIGNEE_WEEKDAY,
  DESIGNER_ASSIGNEE_WEEKEND,
  DESIGNER_DAILY_TARGET,
  DESIGNER_LAST_WA_TIME,
  DESIGNER_MANUAL_SORT_CEILING,
  DESIGNER_MONTH_OUTLET_IDS,
  DESIGNER_UPLOAD_DUE_TIME,
  DESIGNER_WEEKDAY_DUE_TIME,
  DESIGNER_WEEKEND_DUE_TIME,
  DESIGNER_WINDOW_DAYS,
  linksFromText,
  manualSortOrdersFromDragRank,
  naturalDesignerSortOrder,
  parseDesignerLinks,
  sortDesignerJobs,
} from "@/lib/team-designer-jobs-shared";

export const DESIGNER_WEEKEND_DAYS: ChecklistDayId[] = ["fri", "sat", "sun"];
export const DESIGNER_WEEKDAY_DAYS: ChecklistDayId[] = ["mon", "tue", "wed", "thu"];

const ACTIVE_STATUSES: TeamDesignerJobStatus[] = ["IN_PROGRESS"];

function parseYmdParts(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function isMonthKey(raw: string): boolean {
  return /^\d{4}-\d{2}$/.test(raw.trim());
}

export function monthKeyFromYmd(ymd: string): string {
  return ymd.slice(0, 7);
}

export function currentMonthKey(now = new Date()): string {
  return getTodayKey(now).slice(0, 7);
}

/** All YYYY-MM-DD dates in month with dayId in `days`. */
export function datesInMonthForDays(monthKey: string, days: ChecklistDayId[]): string[] {
  if (!isMonthKey(monthKey)) return [];
  const [ys, ms] = monthKey.split("-");
  const y = Number(ys);
  const month = Number(ms);
  const out: string[] = [];
  for (let day = 1; day <= 31; day++) {
    const ymd = `${ys}-${ms}-${String(day).padStart(2, "0")}`;
    const parts = parseYmdParts(ymd);
    if (!parts) continue;
    const dt = new Date(Date.UTC(parts.y, parts.m - 1, parts.d, 12, 0, 0));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== month) continue;
    const dayId = dayIdForYmd(ymd);
    if (days.includes(dayId)) out.push(ymd);
  }
  return out;
}

/** Inclusive rolling window: fromDate .. fromDate+(days-1). */
export function datesInRollingWindow(
  fromDate: string,
  days: number,
  dayFilter: ChecklistDayId[]
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || days < 1) return [];
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const ymd = addDaysYmd(fromDate, i);
    if (dayFilter.includes(dayIdForYmd(ymd))) out.push(ymd);
  }
  return out;
}

export function rollingWindowBounds(fromDate = getTodayKey(), days = DESIGNER_WINDOW_DAYS) {
  return {
    fromDate,
    toDate: addDaysYmd(fromDate, days - 1),
    days,
  };
}

export function weekendDueDate(postDate: string): string {
  return addDaysYmd(postDate, -WEEKEND_POST_LEAD_DAYS);
}

/** Jeslyn: Mon–Thu flyer/story due the calendar day before go-live. */
export function weekdayStoryDueDate(postDate: string): string {
  return previousDayYmd(postDate);
}

/** Friday of a Fri–Sat–Sun weekend → Tuesday before (3 days earlier) @ 8 PM. */
export function weekendCalendarDueDate(fridayYmd: string): string {
  return addDaysYmd(fridayYmd, -3);
}

/** IST due instant for a designer job (uses lane-specific clock). */
export function designerJobDueAtMs(dueDate: string, dueTime: string): number {
  const time = /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : DESIGNER_UPLOAD_DUE_TIME;
  return Date.parse(`${dueDate}T${time}:00+05:30`);
}

export function isDesignerJobPastDue(params: {
  dueDate: string;
  dueTime: string;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  const dueMs = designerJobDueAtMs(params.dueDate, params.dueTime);
  return Number.isFinite(dueMs) && now.getTime() > dueMs;
}

type DesignerJobRow = Omit<
  Pick<
    TeamDesignerJob,
    | "id"
    | "monthKey"
    | "postDate"
    | "dueDate"
    | "dueTime"
    | "outletId"
    | "lane"
    | "format"
    | "title"
    | "description"
    | "assigneeId"
    | "status"
    | "urgent"
    | "priorityMode"
    | "sortOrder"
    | "startedAt"
    | "startedByRole"
    | "uploadedAt"
    | "closedByRole"
    | "fileUrl"
    | "postingNotes"
    | "scheduleNote"
    | "waApproved"
    | "createdBy"
    | "createdAt"
    | "updatedAt"
  >,
  never
> & {
  links?: unknown;
  editRequestedAt?: Date | string | null;
  editRequestNote?: string | null;
  pauseRequestedAt?: Date | string | null;
  pauseRequestNote?: string | null;
  catchUpExempt?: boolean | null;
};

let catchUpExemptColumnReady = false;

/** Prod-safe: add column if migration hasn’t run yet. */
export async function ensureCatchUpExemptColumn(): Promise<void> {
  if (catchUpExemptColumnReady) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "catchUpExempt" BOOLEAN NOT NULL DEFAULT false`
  );
  catchUpExemptColumnReady = true;
}

/** Raw SQL — safe when a stale Prisma client hasn't learned the `links` column yet. */
export async function loadDesignerJobLinksByIds(
  ids: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  const rows = await prisma.$queryRaw<Array<{ id: string; links: unknown }>>`
    SELECT id, links FROM "TeamDesignerJob" WHERE id IN (${Prisma.join(ids)})
  `;
  for (const row of rows) {
    map.set(row.id, parseDesignerLinks(row.links));
  }
  return map;
}

export async function setDesignerJobLinks(id: string, links: string[]): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob" SET links = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
    links.length > 0 ? JSON.stringify(links) : null,
    id
  );
}

export type DesignerRequestMeta = {
  editRequestedAt: string | null;
  editRequestNote: string | null;
  pauseRequestedAt: string | null;
  pauseRequestNote: string | null;
  catchUpExempt: boolean;
};

export async function loadDesignerEditMetaByIds(
  ids: string[]
): Promise<Map<string, DesignerRequestMeta>> {
  const map = new Map<string, DesignerRequestMeta>();
  if (ids.length === 0) return map;
  try {
    await ensureCatchUpExemptColumn();
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        editRequestedAt: Date | null;
        editRequestNote: string | null;
        pauseRequestedAt: Date | null;
        pauseRequestNote: string | null;
        catchUpExempt: boolean | null;
      }>
    >`
      SELECT id, "editRequestedAt", "editRequestNote", "pauseRequestedAt", "pauseRequestNote",
             "catchUpExempt"
      FROM "TeamDesignerJob"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, {
        editRequestedAt: row.editRequestedAt ? row.editRequestedAt.toISOString() : null,
        editRequestNote: row.editRequestNote ?? null,
        pauseRequestedAt: row.pauseRequestedAt ? row.pauseRequestedAt.toISOString() : null,
        pauseRequestNote: row.pauseRequestNote ?? null,
        catchUpExempt: Boolean(row.catchUpExempt),
      });
    }
    return map;
  } catch (err) {
    // Older DBs before pause / catch-up-exempt migration — still load edit meta.
    console.error("[designer-jobs] meta load failed, falling back", err);
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        editRequestedAt: Date | null;
        editRequestNote: string | null;
      }>
    >`
      SELECT id, "editRequestedAt", "editRequestNote"
      FROM "TeamDesignerJob"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, {
        editRequestedAt: row.editRequestedAt ? row.editRequestedAt.toISOString() : null,
        editRequestNote: row.editRequestNote ?? null,
        pauseRequestedAt: null,
        pauseRequestNote: null,
        catchUpExempt: false,
      });
    }
    return map;
  }
}

/** Admin only: leave Catch up → Open, sorted by normal deadline priority (no auto-drop). */
export async function releaseDesignerJobFromCatchUp(id: string): Promise<void> {
  await ensureCatchUpExemptColumn();
  const job = await prisma.teamDesignerJob.findUnique({
    where: { id },
    select: { dueDate: true, outletId: true, format: true },
  });
  if (!job) throw new Error("Not found");
  // Keep natural deadline key so it interleaves with seeded jobs by due date.
  const sortOrder = naturalDesignerSortOrder(job.dueDate, job.outletId, job.format);
  await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob" SET "catchUpExempt" = true, "sortOrder" = $1, "updatedAt" = NOW() WHERE id = $2`,
    sortOrder,
    id
  );
}

export async function setDesignerEditRequest(
  id: string,
  opts: { at: Date | null; note: string | null }
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob" SET "editRequestedAt" = $1, "editRequestNote" = $2, "updatedAt" = NOW() WHERE id = $3`,
    opts.at,
    opts.note,
    id
  );
}

export async function setDesignerPauseRequest(
  id: string,
  opts: { at: Date | null; note: string | null }
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob" SET "pauseRequestedAt" = $1, "pauseRequestNote" = $2, "updatedAt" = NOW() WHERE id = $3`,
    opts.at,
    opts.note,
    id
  );
}

export function toDesignerJobDto(job: DesignerJobRow, today = getTodayKey()): DesignerJobDto {
  const open =
    job.status === "WAITING_BRIEF" ||
    job.status === "READY_TO_DESIGN" ||
    job.status === "IN_PROGRESS" ||
    job.status === "PAUSED";
  const isDueToday = open && job.dueDate === today;
  const isOverdue =
    open &&
    isDesignerJobPastDue({
      dueDate: job.dueDate,
      dueTime: job.dueTime || DESIGNER_UPLOAD_DUE_TIME,
    });
  return {
    id: job.id,
    monthKey: job.monthKey,
    postDate: job.postDate,
    dueDate: job.dueDate,
    dueTime: job.dueTime,
    outletId: job.outletId,
    outletLabel: teamOutletLabel(job.outletId),
    lane: job.lane,
    format: job.format,
    title: job.title,
    description: isBoilerplateDesignerDescription(job.description, job.title)
      ? null
      : job.description,
    links: parseDesignerLinks(job.links),
    assigneeId: job.assigneeId,
    status: job.status,
    urgent: job.urgent,
    priorityMode: parseDesignerPriorityMode(job.priorityMode),
    sortOrder: typeof job.sortOrder === "number" ? job.sortOrder : 0,
    startedAt: job.startedAt?.toISOString() ?? null,
    startedByRole:
      job.startedByRole === "designer" || job.startedByRole === "admin"
        ? job.startedByRole
        : null,
    uploadedAt: job.uploadedAt?.toISOString() ?? null,
    closedByRole:
      job.closedByRole === "designer" || job.closedByRole === "admin"
        ? job.closedByRole
        : null,
    fileUrl: job.fileUrl,
    postingNotes: job.postingNotes,
    scheduleNote: job.scheduleNote,
    waApproved: job.waApproved,
    editRequestedAt: job.editRequestedAt
      ? typeof job.editRequestedAt === "string"
        ? job.editRequestedAt
        : job.editRequestedAt.toISOString()
      : null,
    editRequestNote: job.editRequestNote ?? null,
    pauseRequestedAt: job.pauseRequestedAt
      ? typeof job.pauseRequestedAt === "string"
        ? job.pauseRequestedAt
        : job.pauseRequestedAt.toISOString()
      : null,
    pauseRequestNote: job.pauseRequestNote ?? null,
    catchUpExempt: Boolean(job.catchUpExempt),
    createdBy: job.createdBy,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    isOverdue,
    isDueToday,
  };
}

export async function findActiveDesignerJob(assigneeId: string): Promise<TeamDesignerJob | null> {
  return prisma.teamDesignerJob.findFirst({
    where: { assigneeId, status: { in: ACTIVE_STATUSES } },
    orderBy: { startedAt: "desc" },
  });
}

type SeedResult = {
  created: number;
  skipped: number;
  closedPast: number;
  /** Open NONE jobs re-keyed to event-date order */
  repaired: number;
  fromDate: string;
  toDate: string;
};

/**
 * Rewrite natural-band sortOrder from design deadline.
 * Skips interrupt/drag pins (sortOrder &lt; 1e6) and priorityMode inserts.
 */
export async function repairNaturalDesignerSortOrders(): Promise<number> {
  const open = await prisma.teamDesignerJob.findMany({
    where: {
      status: { not: "DESIGN_DONE" },
      priorityMode: "NONE",
      sortOrder: { gte: DESIGNER_MANUAL_SORT_CEILING },
    },
    select: {
      id: true,
      postDate: true,
      dueDate: true,
      outletId: true,
      format: true,
      sortOrder: true,
    },
  });

  let repaired = 0;
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const j of open) {
    const next = naturalDesignerSortOrder(j.dueDate, j.outletId, j.format);
    if (j.sortOrder === next) continue;
    repaired += 1;
    ops.push(
      prisma.teamDesignerJob.update({
        where: { id: j.id },
        data: { sortOrder: next },
      })
    );
  }
  const chunk = 40;
  for (let i = 0; i < ops.length; i += chunk) {
    await prisma.$transaction(ops.slice(i, i + chunk));
  }
  return repaired;
}

/** Next sortOrder in the manual/interrupt band (always &lt; DESIGNER_MANUAL_SORT_CEILING). */
export async function nextManualDesignerSortOrder(assigneeId: string): Promise<number> {
  const minRow = await prisma.teamDesignerJob.findFirst({
    where: {
      assigneeId,
      status: { not: "DESIGN_DONE" },
      sortOrder: { lt: DESIGNER_MANUAL_SORT_CEILING },
    },
    orderBy: { sortOrder: "asc" },
    select: { sortOrder: true },
  });
  return (minRow?.sortOrder ?? 0) - 1;
}

/** Mark open jobs past their design due datetime (date + 8 PM IST), not midnight. */
export async function closePastDueDesignerJobs(today = getTodayKey()): Promise<number> {
  const open = await prisma.teamDesignerJob.findMany({
    where: {
      // Only consider due calendar day ≤ today; then filter by 20:00 IST
      dueDate: { lte: today },
      status: { in: ["WAITING_BRIEF", "READY_TO_DESIGN", "IN_PROGRESS"] },
    },
    select: { id: true, dueDate: true, dueTime: true },
  });
  const pastIds = open
    .filter((j) =>
      isDesignerJobPastDue({
        dueDate: j.dueDate,
        dueTime: j.dueTime || DESIGNER_UPLOAD_DUE_TIME,
      })
    )
    .map((j) => j.id);
  if (pastIds.length === 0) return 0;
  const result = await prisma.teamDesignerJob.updateMany({
    where: { id: { in: pastIds } },
    data: {
      status: "DESIGN_DONE",
      uploadedAt: null,
      waApproved: false,
    },
  });
  return result.count;
}

/**
 * Seed Mahesh (weekend) + Jeslyn (weekday) for the next DESIGNER_WINDOW_DAYS
 * from `fromDate` (default today). Slots with dueDate before today are created as DESIGN_DONE.
 */
export async function seedDesignerRollingWindow(params: {
  createdBy: string;
  fromDate?: string;
  days?: number;
  lanes?: Array<"WEEKEND" | "WEEKDAY">;
}): Promise<SeedResult> {
  const today = getTodayKey();
  const fromDate = params.fromDate?.trim() || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) throw new Error("Invalid fromDate");
  const days = params.days ?? DESIGNER_WINDOW_DAYS;
  const { toDate } = rollingWindowBounds(fromDate, days);
  const lanes = params.lanes?.length ? params.lanes : (["WEEKEND", "WEEKDAY"] as const);

  const closedPast = await closePastDueDesignerJobs(today);

  let created = 0;
  let skipped = 0;
  const rows: Prisma.TeamDesignerJobCreateManyInput[] = [];

  if (lanes.includes("WEEKEND")) {
    for (const postDate of datesInRollingWindow(fromDate, days, DESIGNER_WEEKEND_DAYS)) {
      const dayId = dayIdForYmd(postDate);
      const dueDate = weekendDueDate(postDate);
      const dueTime = DESIGNER_WEEKEND_DUE_TIME;
      const past = isDesignerJobPastDue({ dueDate, dueTime });
      for (let oi = 0; oi < DESIGNER_MONTH_OUTLET_IDS.length; oi++) {
        const outletId = DESIGNER_MONTH_OUTLET_IDS[oi]!;
        rows.push({
          monthKey: monthKeyFromYmd(postDate),
          postDate,
          dueDate,
          dueTime,
          outletId,
          lane: "WEEKEND",
          format: "post",
          title: `${teamOutletLabel(outletId)} ${CHECKLIST_DAY_LABELS[dayId]} Post`,
          description: null,
          sortOrder: naturalDesignerSortOrder(dueDate, outletId, "post"),
          assigneeId: DESIGNER_ASSIGNEE_WEEKEND,
          status: past ? "DESIGN_DONE" : "WAITING_BRIEF",
          createdBy: params.createdBy,
        });
      }
    }
  }

  if (lanes.includes("WEEKDAY")) {
    for (const postDate of datesInRollingWindow(fromDate, days, DESIGNER_WEEKDAY_DAYS)) {
      const dayId = dayIdForYmd(postDate);
      // Jeslyn: Mon flyer due Sun 8 PM (always go-live − 1 day @ 20:00).
      const dueDate = weekdayStoryDueDate(postDate);
      const dueTime = DESIGNER_WEEKDAY_DUE_TIME;
      const past = isDesignerJobPastDue({ dueDate, dueTime });
      for (let oi = 0; oi < DESIGNER_MONTH_OUTLET_IDS.length; oi++) {
        const outletId = DESIGNER_MONTH_OUTLET_IDS[oi]!;
        rows.push({
          monthKey: monthKeyFromYmd(postDate),
          postDate,
          dueDate,
          dueTime,
          outletId,
          lane: "WEEKDAY",
          format: "story",
          title: `${teamOutletLabel(outletId)} ${CHECKLIST_DAY_LABELS[dayId]} Story`,
          description: null,
          sortOrder: naturalDesignerSortOrder(dueDate, outletId, "story"),
          assigneeId: DESIGNER_ASSIGNEE_WEEKDAY,
          status: past ? "DESIGN_DONE" : "WAITING_BRIEF",
          createdBy: params.createdBy,
        });
      }
    }
  }

  // Weekly TV calendar (Fri–Sat–Sun together) for C53 / Boiler / Firefly — Mahesh, due Tuesday.
  if (lanes.includes("WEEKEND")) {
    const fridays = datesInRollingWindow(fromDate, days, ["fri"]);
    for (const friday of fridays) {
      const dueDate = weekendCalendarDueDate(friday);
      const dueTime = DESIGNER_CALENDAR_DUE_TIME;
      const past = isDesignerJobPastDue({ dueDate, dueTime });
      for (let oi = 0; oi < DESIGNER_CALENDAR_OUTLET_IDS.length; oi++) {
        const outletId = DESIGNER_CALENDAR_OUTLET_IDS[oi]!;
        rows.push({
          monthKey: monthKeyFromYmd(friday),
          postDate: friday,
          dueDate,
          dueTime,
          outletId,
          lane: "WEEKEND",
          format: "calendar",
          title: `${teamOutletLabel(outletId)} Weekend TV Calendar (Fri–Sun)`,
          description:
            "One TV-size calendar video covering Friday + Saturday + Sunday for this weekend.",
          sortOrder: naturalDesignerSortOrder(dueDate, outletId, "calendar"),
          assigneeId: DESIGNER_ASSIGNEE_WEEKEND,
          status: past ? "DESIGN_DONE" : "WAITING_BRIEF",
          createdBy: params.createdBy,
        });
      }
    }
  }

  if (rows.length === 0) {
    const repairedEmpty = await repairNaturalDesignerSortOrders();
    return { created: 0, skipped: 0, closedPast, repaired: repairedEmpty, fromDate, toDate };
  }

  // One range lookup, then insert only missing slots (no unique-constraint spam).
  const existing = await prisma.teamDesignerJob.findMany({
    where: {
      postDate: { gte: fromDate, lte: toDate },
      lane: { in: [...lanes] },
      format: { in: ["post", "story", "calendar"] },
    },
    select: {
      monthKey: true,
      postDate: true,
      outletId: true,
      lane: true,
      format: true,
    },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.monthKey}|${e.postDate}|${e.outletId}|${e.lane}|${e.format}`)
  );
  const toInsert = rows.filter(
    (r) => !existingKeys.has(`${r.monthKey}|${r.postDate}|${r.outletId}|${r.lane}|${r.format}`)
  );
  skipped = rows.length - toInsert.length;

  if (toInsert.length > 0) {
    const result = await prisma.teamDesignerJob.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
    created = result.count;
    skipped += Math.max(0, toInsert.length - created);
  }

  const repaired = await repairNaturalDesignerSortOrders();
  return { created, skipped, closedPast, repaired, fromDate, toDate };
}

/** @deprecated use seedDesignerRollingWindow — kept for compatibility */
export async function seedDesignerMonth(params: {
  monthKey: string;
  createdBy: string;
  lanes?: Array<"WEEKEND" | "WEEKDAY">;
}): Promise<SeedResult> {
  return seedDesignerRollingWindow({
    createdBy: params.createdBy,
    fromDate: getTodayKey(),
    days: DESIGNER_WINDOW_DAYS,
    lanes: params.lanes,
  });
}

export function weekStartMonday(today: string): string {
  const dayId = dayIdForYmd(today);
  const idx = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(dayId);
  return addDaysYmd(today, -Math.max(0, idx));
}

export async function computeDesignerMetrics(assigneeId?: string): Promise<DesignerMetricsDto> {
  const today = getTodayKey();
  const weekStart = weekStartMonday(today);
  const whereAssignee = assigneeId ? { assigneeId } : {};

  const [closedToday, closedWeek, readyBriefs, inProgress, openDueRows, weekUploads] =
    await Promise.all([
      prisma.teamDesignerJob.count({
        where: {
          ...whereAssignee,
          status: "DESIGN_DONE",
          closedByRole: "designer",
          uploadedAt: { gte: new Date(`${today}T00:00:00+05:30`) },
        },
      }),
      prisma.teamDesignerJob.count({
        where: {
          ...whereAssignee,
          status: "DESIGN_DONE",
          closedByRole: "designer",
          uploadedAt: { gte: new Date(`${weekStart}T00:00:00+05:30`) },
        },
      }),
      prisma.teamDesignerJob.count({
        where: {
          ...whereAssignee,
          status: "READY_TO_DESIGN",
          dueDate: { gte: today },
        },
      }),
      prisma.teamDesignerJob.count({
        where: { ...whereAssignee, status: "IN_PROGRESS" },
      }),
      prisma.teamDesignerJob.findMany({
        where: {
          ...whereAssignee,
          status: { not: "DESIGN_DONE" },
          dueDate: { lte: today },
        },
        select: { dueDate: true, dueTime: true },
      }),
      prisma.teamDesignerJob.findMany({
        where: {
          ...whereAssignee,
          status: "DESIGN_DONE",
          closedByRole: "designer",
          uploadedAt: { gte: new Date(`${weekStart}T00:00:00+05:30`) },
        },
        select: { dueDate: true, dueTime: true, uploadedAt: true },
      }),
    ]);

  const overdueOpen = openDueRows.filter((j) =>
    isDesignerJobPastDue({
      dueDate: j.dueDate,
      dueTime: j.dueTime || DESIGNER_UPLOAD_DUE_TIME,
    })
  ).length;

  let onTime = 0;
  let late = 0;
  for (const u of weekUploads) {
    if (!u.uploadedAt) continue;
    const dueMs = Date.parse(`${u.dueDate}T${u.dueTime || DESIGNER_UPLOAD_DUE_TIME}:00+05:30`);
    if (!Number.isFinite(dueMs)) continue;
    if (u.uploadedAt.getTime() <= dueMs) onTime += 1;
    else late += 1;
  }

  return {
    closedToday,
    closedThisWeek: closedWeek,
    readyBriefs,
    inProgress,
    overdueOpen,
    onTimeUploadsWeek: onTime,
    lateUploadsWeek: late,
    dailyTarget: DESIGNER_DAILY_TARGET,
    queueHealthOk: readyBriefs + inProgress >= DESIGNER_DAILY_TARGET,
  };
}

type HandoffKind = "stories" | "posts" | "ads";

async function writeChecklistHandoffReady(params: {
  outletId: string;
  kind: HandoffKind;
  dayId: string;
  postDate: string;
  format: "story" | "post" | "ad";
  fileUrl: string;
  postingNotes: string | null;
  scheduleNote: string | null;
  uploadedAt: string;
}): Promise<void> {
  const checklist = await prisma.teamDailyChecklist.findFirst({
    where: { outletId: params.outletId, kind: params.kind },
    include: { items: true },
  });
  if (!checklist) return;

  const item = checklist.items.find((i) => i.dayOfWeek === params.dayId);
  if (!item) return;

  const map = handoffByDateFromJson(item.handoff);
  map[params.postDate] = {
    status: "ready",
    format: params.format,
    fileUrl: params.fileUrl,
    postingNotes: params.postingNotes,
    scheduleNote: params.scheduleNote,
    uploadedAt: params.uploadedAt,
  };

  const readyDates = Array.isArray(item.readyDates)
    ? (item.readyDates as unknown[]).filter((d): d is string => typeof d === "string")
    : [];
  const nextReady = readyDates.includes(params.postDate)
    ? readyDates
    : [...readyDates, params.postDate];

  const handoffJson: Record<string, Record<string, string>> = {};
  for (const [date, entry] of Object.entries(map)) {
    handoffJson[date] = {
      status: entry.status,
      ...(entry.format ? { format: entry.format } : {}),
      ...(entry.fileUrl ? { fileUrl: entry.fileUrl } : {}),
      ...(entry.postingNotes ? { postingNotes: entry.postingNotes } : {}),
      ...(entry.scheduleNote ? { scheduleNote: entry.scheduleNote } : {}),
      ...(entry.uploadedAt ? { uploadedAt: entry.uploadedAt } : {}),
    };
  }

  await prisma.teamChecklistItem.update({
    where: { id: item.id },
    data: {
      handoff: handoffJson,
      readyDates: nextReady,
    },
  });
}

/**
 * Push final creative onto Amit's Daily checklist.
 * Weekend (Mahesh): same file → Story + Post + Ad for that go-live day.
 * Weekday (Jeslyn): Story only.
 */
export async function syncDesignerJobToChecklistHandoff(job: TeamDesignerJob): Promise<void> {
  if (!job.fileUrl) return;
  // TV calendars are not Amit story/post handoffs
  if (job.format === "calendar") return;
  const dayId = dayIdForYmd(job.postDate);
  const uploadedAt = job.uploadedAt?.toISOString() ?? new Date().toISOString();
  const base = {
    outletId: job.outletId,
    dayId,
    postDate: job.postDate,
    fileUrl: job.fileUrl,
    postingNotes: job.postingNotes,
    scheduleNote: job.scheduleNote,
    uploadedAt,
  };

  if (job.lane === "WEEKEND") {
    await Promise.all([
      writeChecklistHandoffReady({ ...base, kind: "stories", format: "story" }),
      writeChecklistHandoffReady({ ...base, kind: "posts", format: "post" }),
      writeChecklistHandoffReady({ ...base, kind: "ads", format: "ad" }),
    ]);
    return;
  }

  await writeChecklistHandoffReady({
    ...base,
    kind: "stories",
    format: "story",
  });
}

async function clearChecklistHandoffReady(params: {
  outletId: string;
  kind: "stories" | "posts" | "ads";
  dayId: string;
  postDate: string;
}): Promise<void> {
  const checklist = await prisma.teamDailyChecklist.findFirst({
    where: { outletId: params.outletId, kind: params.kind },
    include: { items: true },
  });
  if (!checklist) return;

  const item = checklist.items.find((i) => i.dayOfWeek === params.dayId);
  if (!item) return;

  const map = handoffByDateFromJson(item.handoff);
  delete map[params.postDate];

  const readyDates = Array.isArray(item.readyDates)
    ? (item.readyDates as unknown[]).filter((d): d is string => typeof d === "string")
    : [];
  const nextReady = readyDates.filter((d) => d !== params.postDate);

  const handoffJson: Record<string, Record<string, string>> = {};
  for (const [date, entry] of Object.entries(map)) {
    handoffJson[date] = {
      status: entry.status,
      ...(entry.format ? { format: entry.format } : {}),
      ...(entry.fileUrl ? { fileUrl: entry.fileUrl } : {}),
      ...(entry.postingNotes ? { postingNotes: entry.postingNotes } : {}),
      ...(entry.scheduleNote ? { scheduleNote: entry.scheduleNote } : {}),
      ...(entry.uploadedAt ? { uploadedAt: entry.uploadedAt } : {}),
    };
  }

  await prisma.teamChecklistItem.update({
    where: { id: item.id },
    data: {
      handoff: handoffJson,
      readyDates: nextReady,
    },
  });
}

/** Remove Ready handoff from Amit's Daily when admin clears / deletes an upload. */
export async function clearDesignerJobChecklistHandoff(job: TeamDesignerJob): Promise<void> {
  if (job.format === "calendar") return;
  const dayId = dayIdForYmd(job.postDate);
  const base = { outletId: job.outletId, dayId, postDate: job.postDate };

  if (job.lane === "WEEKEND") {
    await Promise.all([
      clearChecklistHandoffReady({ ...base, kind: "stories" }),
      clearChecklistHandoffReady({ ...base, kind: "posts" }),
      clearChecklistHandoffReady({ ...base, kind: "ads" }),
    ]);
    return;
  }

  await clearChecklistHandoffReady({ ...base, kind: "stories" });
}

/**
 * Admin Unready from Daily: clear Story/Post/Ad for that go-live (weekend shares one creative),
 * and reset matching designer job so it leaves Done and needs a real upload again.
 */
export async function unreadyOutletGoLiveHandoff(params: {
  outletId: string;
  postDate: string;
  dayId?: string | null;
}): Promise<void> {
  const dayId = params.dayId && params.dayId.trim()
    ? params.dayId.trim()
    : dayIdForYmd(params.postDate);
  const base = {
    outletId: params.outletId,
    dayId,
    postDate: params.postDate,
  };

  if (isWeekendPostDayId(dayId)) {
    await Promise.all([
      clearChecklistHandoffReady({ ...base, kind: "stories" }),
      clearChecklistHandoffReady({ ...base, kind: "posts" }),
      clearChecklistHandoffReady({ ...base, kind: "ads" }),
    ]);
  } else {
    await clearChecklistHandoffReady({ ...base, kind: "stories" });
  }

  const job = await prisma.teamDesignerJob.findFirst({
    where: { outletId: params.outletId, postDate: params.postDate },
  });
  if (!job) return;
  if (!job.fileUrl && job.status !== "DESIGN_DONE") return;

  await prisma.teamDesignerJob.update({
    where: { id: job.id },
    data: {
      status: "READY_TO_DESIGN",
      startedAt: null,
      uploadedAt: null,
      fileUrl: null,
      postingNotes: null,
      scheduleNote: null,
      waApproved: false,
    },
  });
}
