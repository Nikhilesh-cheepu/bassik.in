import type { TeamDesignerJob, TeamDesignerJobStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  addDaysYmd,
  dayIdForYmd,
  getTodayKey,
  handoffByDateFromJson,
  handoffCreativeUrls,
  isWeekendPostDayId,
  previousDayYmd,
  serializeHandoffMap,
  WEEKEND_POST_LEAD_DAYS,
  type ChecklistBoardDto,
  type TeamChecklistItemDto,
} from "@/lib/team-checklists";
import { CHECKLIST_DAY_LABELS, type ChecklistDayId } from "@/lib/team-checklist-templates";
import { splitDesignerOutletIds, teamOutletLabel } from "@/lib/team-outlets";
import {
  DESIGNER_ASSIGNEE_WEEKDAY,
  DESIGNER_ASSIGNEE_WEEKEND,
  DESIGNER_CALENDAR_COMBO_OUTLET_ID,
  DESIGNER_CALENDAR_DUE_TIME,
  DESIGNER_DAILY_TARGET,
  DESIGNER_MONTH_OUTLET_IDS,
  DESIGNER_UPLOAD_DUE_TIME,
  DESIGNER_WEEKDAY_DUE_TIME,
  DESIGNER_WEEKEND_DUE_TIME,
  DESIGNER_WINDOW_DAYS,
  DESIGNER_MANUAL_SORT_CEILING,
  isBoilerplateDesignerDescription,
  naturalDesignerSortOrder,
  normalizeDesignerFileUrls,
  parseDesignerLinks,
  clampDesignerTaskWeight,
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

/** Friday of a Fri–Sat–Sun weekend → Wednesday before (2 days earlier) @ 8 PM. */
export function weekendCalendarDueDate(fridayYmd: string): string {
  return addDaysYmd(fridayYmd, -2);
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
  fileUrls?: unknown;
  editRequestedAt?: Date | string | null;
  editRequestNote?: string | null;
  pauseRequestedAt?: Date | string | null;
  pauseRequestNote?: string | null;
  catchUpExempt?: boolean | null;
  activeWorkMs?: number | null;
  pausedAt?: Date | string | null;
  noPost?: boolean | null;
  taskWeight?: number | null;
};

let designerExtraColumnsReady = false;

/**
 * One cheap probe (or one ALTER batch). Avoids re-running DDL on every HMR /
 * request — that was stacking 5–20s onto every queue load against Railway.
 */
export async function ensureDesignerJobExtraColumns(): Promise<void> {
  if (designerExtraColumnsReady) return;
  try {
    await prisma.$queryRaw`
      SELECT "catchUpExempt", "fileUrls", "activeWorkMs", "pausedAt", "noPost", "taskWeight"
      FROM "TeamDesignerJob" LIMIT 0
    `;
    designerExtraColumnsReady = true;
    return;
  } catch {
    /* columns missing — add below */
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "catchUpExempt" BOOLEAN NOT NULL DEFAULT false`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "fileUrls" JSONB`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "activeWorkMs" INTEGER NOT NULL DEFAULT 0`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "noPost" BOOLEAN NOT NULL DEFAULT false`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "TeamDesignerJob" ADD COLUMN IF NOT EXISTS "taskWeight" INTEGER NOT NULL DEFAULT 1`
  );
  designerExtraColumnsReady = true;
}

/** @deprecated use ensureDesignerJobExtraColumns */
export async function ensureCatchUpExemptColumn(): Promise<void> {
  await ensureDesignerJobExtraColumns();
}

/** @deprecated use ensureDesignerJobExtraColumns */
export async function ensureDesignerFileUrlsColumn(): Promise<void> {
  await ensureDesignerJobExtraColumns();
}

/** @deprecated use ensureDesignerJobExtraColumns */
export async function ensureDesignerWorkTimingColumns(): Promise<void> {
  await ensureDesignerJobExtraColumns();
}

/** @deprecated use ensureDesignerJobExtraColumns */
export async function ensureDesignerNoPostColumn(): Promise<void> {
  await ensureDesignerJobExtraColumns();
}

/** Persist creatives — fileUrl = first (Amit), fileUrls = full list. */
export async function setDesignerJobFileUrls(
  id: string,
  urls: string[]
): Promise<void> {
  await ensureDesignerFileUrlsColumn();
  const list = normalizeDesignerFileUrls(null, urls);
  await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob" SET "fileUrl" = $1, "fileUrls" = $2::jsonb, "updatedAt" = NOW() WHERE id = $3`,
    list[0] ?? null,
    list.length > 0 ? JSON.stringify(list) : null,
    id
  );
}

export async function loadDesignerFileUrlsByIds(
  ids: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  await ensureDesignerFileUrlsColumn();
  const rows = await prisma.$queryRaw<
    Array<{ id: string; fileUrl: string | null; fileUrls: unknown }>
  >`
    SELECT id, "fileUrl", "fileUrls" FROM "TeamDesignerJob" WHERE id IN (${Prisma.join(ids)})
  `;
  for (const row of rows) {
    map.set(row.id, normalizeDesignerFileUrls(row.fileUrl, row.fileUrls));
  }
  return map;
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
  activeWorkMs: number;
  pausedAt: string | null;
  noPost: boolean;
  taskWeight: number;
};

export async function setDesignerJobTaskWeight(
  id: string,
  weight: number
): Promise<void> {
  await ensureDesignerJobExtraColumns();
  const w = clampDesignerTaskWeight(weight);
  await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob" SET "taskWeight" = $1, "updatedAt" = NOW() WHERE id = $2`,
    w,
    id
  );
}

export async function loadDesignerEditMetaByIds(
  ids: string[]
): Promise<Map<string, DesignerRequestMeta>> {
  const map = new Map<string, DesignerRequestMeta>();
  if (ids.length === 0) return map;
  try {
    await ensureDesignerJobExtraColumns();
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        editRequestedAt: Date | null;
        editRequestNote: string | null;
        pauseRequestedAt: Date | null;
        pauseRequestNote: string | null;
        catchUpExempt: boolean | null;
        activeWorkMs: number | null;
        pausedAt: Date | null;
        noPost: boolean | null;
        taskWeight: number | null;
      }>
    >`
      SELECT id, "editRequestedAt", "editRequestNote", "pauseRequestedAt", "pauseRequestNote",
             "catchUpExempt", "activeWorkMs", "pausedAt", "noPost", "taskWeight"
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
        activeWorkMs: Math.max(0, Number(row.activeWorkMs) || 0),
        pausedAt: row.pausedAt ? row.pausedAt.toISOString() : null,
        noPost: Boolean(row.noPost),
        taskWeight: clampDesignerTaskWeight(row.taskWeight),
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
        activeWorkMs: 0,
        pausedAt: null,
        noPost: false,
        taskWeight: 1,
      });
    }
    return map;
  }
}

/** Bank the live IN_PROGRESS segment into activeWorkMs (does not change status). */
export async function bankDesignerActiveSegment(jobId: string): Promise<void> {
  await ensureDesignerWorkTimingColumns();
  await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob"
     SET
       "activeWorkMs" = "activeWorkMs" + CASE
         WHEN status = 'IN_PROGRESS' AND "startedAt" IS NOT NULL
         THEN GREATEST(0, (EXTRACT(EPOCH FROM (NOW() - "startedAt")) * 1000)::int)
         ELSE 0
       END,
       "updatedAt" = NOW()
     WHERE id = $1 AND status = 'IN_PROGRESS'`,
    jobId
  );
}

/**
 * Pause an in-progress job and bank the current work segment into activeWorkMs.
 */
export async function pauseDesignerJobNow(jobId: string): Promise<void> {
  await ensureDesignerWorkTimingColumns();
  await prisma.$executeRawUnsafe(
    `UPDATE "TeamDesignerJob"
     SET
       "activeWorkMs" = "activeWorkMs" + CASE
         WHEN status = 'IN_PROGRESS' AND "startedAt" IS NOT NULL
         THEN GREATEST(0, (EXTRACT(EPOCH FROM (NOW() - "startedAt")) * 1000)::int)
         ELSE 0
       END,
       status = 'PAUSED',
       "pausedAt" = NOW(),
       "pauseRequestedAt" = NULL,
       "pauseRequestNote" = NULL,
       "updatedAt" = NOW()
     WHERE id = $1 AND status = 'IN_PROGRESS'`,
    jobId
  );
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
    activeWorkMs: Math.max(0, Number(job.activeWorkMs) || 0),
    pausedAt: job.pausedAt
      ? typeof job.pausedAt === "string"
        ? job.pausedAt
        : job.pausedAt.toISOString()
      : null,
    startedByRole:
      job.startedByRole === "designer" || job.startedByRole === "admin"
        ? job.startedByRole
        : null,
    uploadedAt: job.uploadedAt?.toISOString() ?? null,
    closedByRole:
      job.closedByRole === "designer" || job.closedByRole === "admin"
        ? job.closedByRole
        : null,
    fileUrl: normalizeDesignerFileUrls(job.fileUrl, job.fileUrls)[0] ?? null,
    fileUrls: normalizeDesignerFileUrls(job.fileUrl, job.fileUrls),
    noPost: Boolean(job.noPost),
    taskWeight: clampDesignerTaskWeight(job.taskWeight),
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
  /** Bad combo post/story rows removed (calendar-only outlet) */
  purgedCombo?: number;
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

/**
 * Previously auto-marked past-due open jobs as DESIGN_DONE (no file).
 * That hid unfinished Catch up work (e.g. Jeslyn Monday stories).
 * Kept as a no-op so Seed never deletes/closes real queue work.
 */
export async function closePastDueDesignerJobs(_today = getTodayKey()): Promise<number> {
  return 0;
}

/**
 * Seed Mahesh (weekend) + Jeslyn (weekday) for the next DESIGNER_WINDOW_DAYS
 * from `fromDate` (default today).
 * Never auto-closes existing open jobs — overdue work stays in Open / Catch up.
 * Always inserts new slots as WAITING_BRIEF — never invents fake Done / never closes open work.
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

  const closedPast = 0;

  let created = 0;
  let skipped = 0;
  const rows: Prisma.TeamDesignerJobCreateManyInput[] = [];

  if (lanes.includes("WEEKEND")) {
    for (const postDate of datesInRollingWindow(fromDate, days, DESIGNER_WEEKEND_DAYS)) {
      const dayId = dayIdForYmd(postDate);
      const dueDate = weekendDueDate(postDate);
      const dueTime = DESIGNER_WEEKEND_DUE_TIME;
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
          status: "WAITING_BRIEF",
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
          status: "WAITING_BRIEF",
          createdBy: params.createdBy,
        });
      }
    }
  }

  // One weekly TV calendar for C53 + Boiler + Firefly (Fri–Sat–Sun together) — Mahesh, due Wednesday.
  if (lanes.includes("WEEKEND")) {
    const fridays = datesInRollingWindow(fromDate, days, ["fri"]);
    const outletId = DESIGNER_CALENDAR_COMBO_OUTLET_ID;
    for (const friday of fridays) {
      const dueDate = weekendCalendarDueDate(friday);
      const dueTime = DESIGNER_CALENDAR_DUE_TIME;
      rows.push({
        monthKey: monthKeyFromYmd(friday),
        postDate: friday,
        dueDate,
        dueTime,
        outletId,
        lane: "WEEKEND",
        format: "calendar",
        title: "C53 · Boiler Room · Firefly — Weekend TV Calendar (Fri–Sun)",
        description:
          "One TV-size calendar for C53, Boiler Room and Firefly together — covers Friday + Saturday + Sunday. Due Wednesday.",
        sortOrder: naturalDesignerSortOrder(dueDate, outletId, "calendar"),
        assigneeId: DESIGNER_ASSIGNEE_WEEKEND,
        status: "READY_TO_DESIGN",
        createdBy: params.createdBy,
      });
    }
  }

  // Combo outlet is TV-calendar only — never post/story (old seeds created duplicates).
  const purgedCombo = await prisma.teamDesignerJob.deleteMany({
    where: {
      outletId: DESIGNER_CALENDAR_COMBO_OUTLET_ID,
      format: { not: "calendar" },
      status: { in: ["WAITING_BRIEF", "READY_TO_DESIGN"] },
    },
  });

  if (rows.length === 0) {
    const repairedEmpty = await repairNaturalDesignerSortOrders();
    return {
      created: 0,
      skipped: 0,
      closedPast,
      repaired: repairedEmpty,
      purgedCombo: purgedCombo.count,
      fromDate,
      toDate,
    };
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
    (r) =>
      !(
        r.outletId === DESIGNER_CALENDAR_COMBO_OUTLET_ID &&
        r.format !== "calendar"
      ) &&
      !existingKeys.has(`${r.monthKey}|${r.postDate}|${r.outletId}|${r.lane}|${r.format}`)
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
  return {
    created,
    skipped,
    closedPast,
    repaired,
    purgedCombo: purgedCombo.count,
    fromDate,
    toDate,
  };
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
  fileUrls?: string[];
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

  const fileUrls = normalizeDesignerFileUrls(params.fileUrl, params.fileUrls);
  const map = handoffByDateFromJson(item.handoff);
  map[params.postDate] = {
    status: "ready",
    format: params.format,
    fileUrl: fileUrls[0] ?? params.fileUrl,
    fileUrls,
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

  await prisma.teamChecklistItem.update({
    where: { id: item.id },
    data: {
      handoff: serializeHandoffMap(map),
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
  // Admin "no post" tasks: creative done in Design queue only
  const meta = (await loadDesignerEditMetaByIds([job.id])).get(job.id);
  if (meta?.noPost) return;
  const dayId = dayIdForYmd(job.postDate);
  const uploadedAt = job.uploadedAt?.toISOString() ?? new Date().toISOString();
  const fileUrls = (
    await loadDesignerFileUrlsByIds([job.id])
  ).get(job.id) ?? normalizeDesignerFileUrls(job.fileUrl, null);
  if (fileUrls.length === 0) return;
  const outletIds = splitDesignerOutletIds(job.outletId);
  const ids = outletIds.length > 0 ? outletIds : [job.outletId];

  for (const outletId of ids) {
    const base = {
      outletId,
      dayId,
      postDate: job.postDate,
      fileUrl: fileUrls[0]!,
      fileUrls,
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
    } else {
      await writeChecklistHandoffReady({
        ...base,
        kind: "stories",
        format: "story",
      });
    }
  }
}

/** Fill missing handoff.fileUrls from designer Done jobs (for jobs synced before multi-file). */
export async function enrichBoardHandoffFileUrls(
  board: ChecklistBoardDto
): Promise<ChecklistBoardDto> {
  const collect = (items: TeamChecklistItemDto[]) => items;
  const allItems = [
    ...collect(board.focusStories),
    ...collect(board.overdueStories),
    ...collect(board.openPosts),
    ...collect(board.generalPosts),
    ...collect(board.doneItems),
    ...board.outlets.flatMap((o) => [
      ...o.stories,
      ...o.openPosts,
      ...o.ads,
    ]),
  ];
  const keys = new Set<string>();
  for (const item of allItems) {
    const outletId = item.outletId?.trim();
    const postDate = item.targetDate?.trim();
    if (!outletId || !postDate) continue;
    if (handoffCreativeUrls(item.handoff).length > 1) continue;
    keys.add(`${outletId}\0${postDate}`);
  }
  if (keys.size === 0) return board;

  const pairs = [...keys].map((k) => {
    const [outletId, postDate] = k.split("\0");
    return { outletId: outletId!, postDate: postDate! };
  });
  const rows = await prisma.teamDesignerJob.findMany({
    where: {
      status: "DESIGN_DONE",
      OR: pairs.map((p) => ({ outletId: p.outletId, postDate: p.postDate })),
    },
    select: { id: true, outletId: true, postDate: true, fileUrl: true },
  });
  if (rows.length === 0) return board;
  const filesMap = await loadDesignerFileUrlsByIds(rows.map((r) => r.id));
  const byKey = new Map<string, string[]>();
  for (const r of rows) {
    const urls = filesMap.get(r.id) ?? normalizeDesignerFileUrls(r.fileUrl, null);
    if (urls.length === 0) continue;
    byKey.set(`${r.outletId}\0${r.postDate}`, urls);
  }

  const patchItem = (item: TeamChecklistItemDto): TeamChecklistItemDto => {
    const outletId = item.outletId?.trim();
    const postDate = item.targetDate?.trim();
    if (!outletId || !postDate || !item.handoff) return item;
    const urls = byKey.get(`${outletId}\0${postDate}`);
    if (!urls || urls.length === 0) return item;
    const existing = handoffCreativeUrls(item.handoff);
    if (existing.length >= urls.length) return item;
    return {
      ...item,
      handoff: {
        ...item.handoff,
        fileUrl: urls[0] ?? item.handoff.fileUrl,
        fileUrls: urls,
      },
    };
  };

  return {
    ...board,
    focusStories: board.focusStories.map(patchItem),
    overdueStories: board.overdueStories.map(patchItem),
    openPosts: board.openPosts.map(patchItem),
    generalPosts: board.generalPosts.map(patchItem),
    doneItems: board.doneItems.map(patchItem),
    outlets: board.outlets.map((o) => ({
      ...o,
      stories: o.stories.map(patchItem),
      openPosts: o.openPosts.map(patchItem),
      ads: o.ads.map(patchItem),
    })),
  };
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

  await prisma.teamChecklistItem.update({
    where: { id: item.id },
    data: {
      handoff: serializeHandoffMap(map),
      readyDates: nextReady,
    },
  });
}

/** Remove Ready handoff from Amit's Daily when admin clears / deletes an upload. */
export async function clearDesignerJobChecklistHandoff(job: TeamDesignerJob): Promise<void> {
  if (job.format === "calendar") return;
  const dayId = dayIdForYmd(job.postDate);
  const outletIds = splitDesignerOutletIds(job.outletId);
  const ids = outletIds.length > 0 ? outletIds : [job.outletId];

  for (const outletId of ids) {
    const base = { outletId, dayId, postDate: job.postDate };
    if (job.lane === "WEEKEND") {
      await Promise.all([
        clearChecklistHandoffReady({ ...base, kind: "stories" }),
        clearChecklistHandoffReady({ ...base, kind: "posts" }),
        clearChecklistHandoffReady({ ...base, kind: "ads" }),
      ]);
    } else {
      await clearChecklistHandoffReady({ ...base, kind: "stories" });
    }
  }
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
  await setDesignerJobFileUrls(job.id, []);
}
