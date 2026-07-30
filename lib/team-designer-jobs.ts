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
  DESIGNER_DAILY_TARGET,
  DESIGNER_MONTH_OUTLET_IDS,
  DESIGNER_UPLOAD_DUE_TIME,
  DESIGNER_WINDOW_DAYS,
  parseDesignerLinks,
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
  DESIGNER_MONTH_OUTLET_IDS,
  DESIGNER_UPLOAD_DUE_TIME,
  DESIGNER_WINDOW_DAYS,
  linksFromText,
  parseDesignerLinks,
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

export function weekdayStoryDueDate(postDate: string): string {
  return previousDayYmd(postDate);
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
    | "startedAt"
    | "uploadedAt"
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
};

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
};

export async function loadDesignerEditMetaByIds(
  ids: string[]
): Promise<Map<string, DesignerRequestMeta>> {
  const map = new Map<string, DesignerRequestMeta>();
  if (ids.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        editRequestedAt: Date | null;
        editRequestNote: string | null;
        pauseRequestedAt: Date | null;
        pauseRequestNote: string | null;
      }>
    >`
      SELECT id, "editRequestedAt", "editRequestNote", "pauseRequestedAt", "pauseRequestNote"
      FROM "TeamDesignerJob"
      WHERE id IN (${Prisma.join(ids)})
    `;
    for (const row of rows) {
      map.set(row.id, {
        editRequestedAt: row.editRequestedAt ? row.editRequestedAt.toISOString() : null,
        editRequestNote: row.editRequestNote ?? null,
        pauseRequestedAt: row.pauseRequestedAt ? row.pauseRequestedAt.toISOString() : null,
        pauseRequestNote: row.pauseRequestNote ?? null,
      });
    }
    return map;
  } catch (err) {
    // Older DBs before pause migration — still load edit meta so the queue can render.
    console.error("[designer-jobs] pause meta load failed, falling back", err);
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
      });
    }
    return map;
  }
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
  const isOverdue = open && job.dueDate < today;
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
    description: job.description,
    links: parseDesignerLinks(job.links),
    assigneeId: job.assigneeId,
    status: job.status,
    urgent: job.urgent,
    startedAt: job.startedAt?.toISOString() ?? null,
    uploadedAt: job.uploadedAt?.toISOString() ?? null,
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
    createdBy: job.createdBy,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    isOverdue,
    isDueToday,
  };
}

/** Priority sort for designer queue. */
export function sortDesignerJobs(jobs: DesignerJobDto[], today = getTodayKey()): DesignerJobDto[] {
  const outletRank = new Map(DESIGNER_MONTH_OUTLET_IDS.map((id, i) => [id, i]));
  const statusRank = (s: DesignerJobStatus) => {
    if (s === "IN_PROGRESS") return 0;
    if (s === "PAUSED") return 1;
    if (s === "READY_TO_DESIGN") return 2;
    if (s === "WAITING_BRIEF") return 3;
    return 4;
  };

  return [...jobs].sort((a, b) => {
    const aDone = a.status === "DESIGN_DONE" ? 1 : 0;
    const bDone = b.status === "DESIGN_DONE" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.isDueToday !== b.isDueToday) return a.isDueToday ? -1 : 1;
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;

    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    const sa = statusRank(a.status);
    const sb = statusRank(b.status);
    if (sa !== sb) return sa - sb;
    const oa = outletRank.get(a.outletId as (typeof DESIGNER_MONTH_OUTLET_IDS)[number]) ?? 99;
    const ob = outletRank.get(b.outletId as (typeof DESIGNER_MONTH_OUTLET_IDS)[number]) ?? 99;
    if (oa !== ob) return oa - ob;
    return a.postDate.localeCompare(b.postDate);
  });
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
  fromDate: string;
  toDate: string;
};

/** Mark open jobs whose design due date is before today as done (no backlog chase). */
export async function closePastDueDesignerJobs(today = getTodayKey()): Promise<number> {
  const result = await prisma.teamDesignerJob.updateMany({
    where: {
      dueDate: { lt: today },
      status: { in: ["WAITING_BRIEF", "READY_TO_DESIGN", "IN_PROGRESS"] },
    },
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
      const past = dueDate < today;
      for (const outletId of DESIGNER_MONTH_OUTLET_IDS) {
        rows.push({
          monthKey: monthKeyFromYmd(postDate),
          postDate,
          dueDate,
          dueTime: DESIGNER_UPLOAD_DUE_TIME,
          outletId,
          lane: "WEEKEND",
          format: "post",
          title: `${teamOutletLabel(outletId)} ${CHECKLIST_DAY_LABELS[dayId]} Post`,
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
      const dueDate = weekdayStoryDueDate(postDate);
      const past = dueDate < today;
      for (const outletId of DESIGNER_MONTH_OUTLET_IDS) {
        rows.push({
          monthKey: monthKeyFromYmd(postDate),
          postDate,
          dueDate,
          dueTime: DESIGNER_UPLOAD_DUE_TIME,
          outletId,
          lane: "WEEKDAY",
          format: "story",
          title: `${teamOutletLabel(outletId)} ${CHECKLIST_DAY_LABELS[dayId]} Story`,
          assigneeId: DESIGNER_ASSIGNEE_WEEKDAY,
          status: past ? "DESIGN_DONE" : "WAITING_BRIEF",
          createdBy: params.createdBy,
        });
      }
    }
  }

  if (rows.length === 0) {
    return { created: 0, skipped: 0, closedPast, fromDate, toDate };
  }

  // One range lookup, then insert only missing slots (no unique-constraint spam).
  const existing = await prisma.teamDesignerJob.findMany({
    where: {
      postDate: { gte: fromDate, lte: toDate },
      lane: { in: [...lanes] },
      format: { in: ["post", "story"] },
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

  return { created, skipped, closedPast, fromDate, toDate };
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

function weekStartMonday(today: string): string {
  const dayId = dayIdForYmd(today);
  const idx = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].indexOf(dayId);
  return addDaysYmd(today, -Math.max(0, idx));
}

export async function computeDesignerMetrics(assigneeId?: string): Promise<DesignerMetricsDto> {
  const today = getTodayKey();
  const weekStart = weekStartMonday(today);
  const whereAssignee = assigneeId ? { assigneeId } : {};

  const [closedToday, closedWeek, readyBriefs, inProgress, overdueOpen, weekUploads] =
    await Promise.all([
      prisma.teamDesignerJob.count({
        where: {
          ...whereAssignee,
          status: "DESIGN_DONE",
          uploadedAt: { gte: new Date(`${today}T00:00:00+05:30`) },
        },
      }),
      prisma.teamDesignerJob.count({
        where: {
          ...whereAssignee,
          status: "DESIGN_DONE",
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
      prisma.teamDesignerJob.count({
        where: {
          ...whereAssignee,
          status: { not: "DESIGN_DONE" },
          dueDate: { lt: today },
        },
      }),
      prisma.teamDesignerJob.findMany({
        where: {
          ...whereAssignee,
          status: "DESIGN_DONE",
          uploadedAt: { gte: new Date(`${weekStart}T00:00:00+05:30`) },
        },
        select: { dueDate: true, dueTime: true, uploadedAt: true },
      }),
    ]);

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
