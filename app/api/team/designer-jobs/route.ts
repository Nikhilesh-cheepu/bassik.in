import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { isTeamMemberId } from "@/lib/team-members";
import {
  DESIGNER_UPLOAD_DUE_TIME,
  DESIGNER_WINDOW_DAYS,
  linksFromText,
  monthKeyFromYmd,
  naturalDesignerSortOrder,
  nextManualDesignerSortOrder,
  parseDesignerLinks,
  rollingWindowBounds,
  seedDesignerRollingWindow,
  ensureDesignerNoPostColumn,
  ensureUpcomingTvCalendars,
  pauseDesignerJobNow,
  setDesignerJobLinks,
  setDesignerJobTaskWeight,
  sortDesignerJobs,
  toDesignerJobDto,
  manualSortOrdersFromDragRank,
} from "@/lib/team-designer-jobs";
import { addDaysYmd, getTodayKey } from "@/lib/team-checklists";
import {
  clampDesignerTaskWeight,
  clampDesignerWindowDays,
  parseDesignerPriorityMode,
} from "@/lib/team-designer-jobs-shared";
import { joinDesignerOutletIds, normalizeDesignerOutletId, teamOutletLabel } from "@/lib/team-outlets";
import { invalidateDesignerPerformanceLiteCache } from "@/lib/team-designer-performance";
import { isTeamDesignerQueueFrozen } from "@/lib/team-maintenance";

/** One Prisma select — columns are in schema (no follow-up raw queries). */
const JOB_SELECT = {
  id: true,
  monthKey: true,
  postDate: true,
  dueDate: true,
  dueTime: true,
  outletId: true,
  lane: true,
  format: true,
  title: true,
  description: true,
  links: true,
  assigneeId: true,
  status: true,
  urgent: true,
  priorityMode: true,
  catchUpExempt: true,
  sortOrder: true,
  startedAt: true,
  activeWorkMs: true,
  pausedAt: true,
  startedByRole: true,
  uploadedAt: true,
  closedByRole: true,
  fileUrl: true,
  fileUrls: true,
  noPost: true,
  taskWeight: true,
  postingNotes: true,
  scheduleNote: true,
  waApproved: true,
  editRequestedAt: true,
  editRequestNote: true,
  pauseRequestedAt: true,
  pauseRequestNote: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Stale Prisma clients (pre–taskWeight) — still load the queue. */
const JOB_SELECT_COMPAT = {
  id: true,
  monthKey: true,
  postDate: true,
  dueDate: true,
  dueTime: true,
  outletId: true,
  lane: true,
  format: true,
  title: true,
  description: true,
  links: true,
  assigneeId: true,
  status: true,
  urgent: true,
  priorityMode: true,
  sortOrder: true,
  startedAt: true,
  startedByRole: true,
  uploadedAt: true,
  closedByRole: true,
  fileUrl: true,
  postingNotes: true,
  scheduleNote: true,
  waApproved: true,
  editRequestedAt: true,
  editRequestNote: true,
  pauseRequestedAt: true,
  pauseRequestNote: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

function isUnknownPrismaFieldError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Unknown field|Unknown arg/i.test(msg);
}

async function findJobs(
  args: {
    where: Record<string, unknown>;
    orderBy?: unknown;
    take?: number;
  }
) {
  try {
    return await prisma.teamDesignerJob.findMany({
      ...args,
      select: JOB_SELECT,
    } as Parameters<typeof prisma.teamDesignerJob.findMany>[0]);
  } catch (err) {
    if (!isUnknownPrismaFieldError(err)) throw err;
    console.warn(
      "[team/designer-jobs] stale Prisma client — using compat select"
    );
    return prisma.teamDesignerJob.findMany({
      ...args,
      select: JOB_SELECT_COMPAT,
    } as Parameters<typeof prisma.teamDesignerJob.findMany>[0]);
  }
}

function jobsToDto(
  rows: Array<Parameters<typeof toDesignerJobDto>[0]>,
  today: string
) {
  return rows.map((r) => toDesignerJobDto(r, today));
}

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer" || session.role === "content") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = getTodayKey();
  const days = clampDesignerWindowDays(
    req.nextUrl.searchParams.get("days") ?? DESIGNER_WINDOW_DAYS
  );
  const { fromDate, toDate } = rollingWindowBounds(today, days);
  const memberId = session.memberId ?? session.username;
  const isAdmin = session.role === "admin";
  const viewParam = req.nextUrl.searchParams.get("view");
  const view =
    viewParam === "closed" || viewParam === "expired" ? viewParam : "open";

  try {
    if (view === "expired") {
      // Event date passed, or adhoc upload older than 3 days — clear blob storage
      const adhocCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const whereExpired: {
        status: "DESIGN_DONE";
        assigneeId?: string;
        OR: Array<
          | { postDate: { lt: string }; fileUrl: { not: null } }
          | {
              format: { startsWith: string };
              uploadedAt: { lte: Date };
              fileUrl: { not: null };
            }
        >;
      } = {
        status: "DESIGN_DONE",
        OR: [
          { postDate: { lt: today }, fileUrl: { not: null } },
          {
            format: { startsWith: "adhoc" },
            uploadedAt: { lte: adhocCutoff },
            fileUrl: { not: null },
          },
        ],
      };
      if (!isAdmin) whereExpired.assigneeId = memberId;

      const rows = await findJobs({
        where: whereExpired,
        orderBy: [{ postDate: "desc" }, { uploadedAt: "desc" }],
        take: 150,
      });
      return NextResponse.json({
        view: "expired",
        window: { fromDate, toDate, days },
        jobs: jobsToDto(rows, today),
        today,
      });
    }

    if (view === "closed") {
      // Everything he actually finished — Sun/weekday, designer or admin close, old or new.
      // Exclude seed auto-closed rows with no file.
      const closedFrom = addDaysYmd(today, -(days - 1));
      const fromTs = new Date(`${closedFrom}T00:00:00+05:30`);
      const whereClosed: {
        status: "DESIGN_DONE";
        assigneeId?: string;
        OR: Array<
          | { uploadedAt: { gte: Date } }
          | { uploadedAt: null; fileUrl: { not: null }; updatedAt: { gte: Date } }
        >;
      } = {
        status: "DESIGN_DONE",
        OR: [
          { uploadedAt: { gte: fromTs } },
          {
            uploadedAt: null,
            fileUrl: { not: null },
            updatedAt: { gte: fromTs },
          },
        ],
      };
      if (!isAdmin) whereClosed.assigneeId = memberId;

      const rows = await findJobs({
        where: whereClosed,
        orderBy: [
          { uploadedAt: "desc" },
          { updatedAt: "desc" },
          { postDate: "desc" },
        ],
        take: 300,
      });

      // TV calendars often have no fileUrl (admin mark-done / not posted) — still list them.
      const calendarDone = await findJobs({
        where: {
          format: "calendar",
          status: "DESIGN_DONE",
          ...(isAdmin ? {} : { assigneeId: memberId }),
        },
        orderBy: [{ postDate: "desc" }],
        take: 50,
      });
      const closedSeen = new Set(rows.map((r) => r.id));
      for (const r of calendarDone) {
        if (!closedSeen.has(r.id)) rows.push(r);
      }

      // assigneeId asc puts jeslyn before mahesh — reorder in memory
      const jobs = jobsToDto(rows, today).sort((a, b) => {
        const rank = (id: string) =>
          id === "mahesh" ? 0 : id === "jeslyn" ? 1 : 2;
        const ar = rank(a.assigneeId);
        const br = rank(b.assigneeId);
        if (ar !== br) return ar - br;
        const au = a.uploadedAt || "";
        const bu = b.uploadedAt || "";
        return bu.localeCompare(au);
      });

      return NextResponse.json({
        view: "closed",
        window: { fromDate, toDate, days },
        jobs,
        today,
      });
    }

    // Open + To send: unfinished work stays until someone marks Done.
    // Look BACK as well as forward — past due / past go-live must not vanish.
    // Make sure this weekend's TV calendar exists (Fri–Sun), not only later weeks.
    if (!isTeamDesignerQueueFrozen()) {
      try {
        await ensureUpcomingTvCalendars(session.username, days);
      } catch (ensureErr) {
        console.error("[team/designer-jobs] ensure TV calendars", ensureErr);
      }
    }

    const lookbackFrom = addDaysYmd(today, -(days - 1));
    const assigneeFilter = isAdmin ? {} : { assigneeId: memberId };
    const windowOpen = {
      postDate: { gte: lookbackFrom, lte: toDate },
      status: { not: "DESIGN_DONE" as const },
      ...assigneeFilter,
    };
    const activeStuck = {
      status: { in: ["IN_PROGRESS", "PAUSED"] as Array<"IN_PROGRESS" | "PAUSED"> },
      ...assigneeFilter,
    };
    const openCalendars = {
      format: "calendar",
      status: { not: "DESIGN_DONE" as const },
      ...assigneeFilter,
    };

    let rows;
    try {
      rows = await findJobs({
        where: { OR: [windowOpen, activeStuck, openCalendars] },
        orderBy: [{ dueDate: "asc" }, { postDate: "asc" }, { outletId: "asc" }],
      });
    } catch (primaryErr) {
      console.error("[team/designer-jobs] open query primary failed, fallback", primaryErr);
      rows = await findJobs({
        where: {
          OR: [
            {
              postDate: { gte: lookbackFrom, lte: toDate },
              status: {
                in: ["WAITING_BRIEF", "READY_TO_DESIGN", "IN_PROGRESS", "PAUSED"],
              },
              ...assigneeFilter,
            },
            {
              status: { in: ["IN_PROGRESS", "PAUSED"] },
              ...assigneeFilter,
            },
            {
              format: "calendar",
              status: { not: "DESIGN_DONE" },
              ...assigneeFilter,
            },
          ],
        },
        orderBy: [{ dueDate: "asc" }, { postDate: "asc" }, { outletId: "asc" }],
      });
    }

    // OR can theoretically return duplicates — keep first
    const seen = new Set<string>();
    const deduped = rows.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const jobs = sortDesignerJobs(jobsToDto(deduped, today));

    return NextResponse.json({
      view: "open",
      window: { fromDate: lookbackFrom, toDate, days },
      jobs,
      today,
      lastWaTime: "19:00",
      uploadDueTime: DESIGNER_UPLOAD_DUE_TIME,
    });
  } catch (err) {
    console.error("[team/designer-jobs] GET", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to load designer jobs",
        // Helps diagnose prod without exposing stack traces
        detail: detail.slice(0, 240),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    invalidateDesignerPerformanceLiteCache();
    const body = (await req.json()) as {
      action?: string;
      days?: number;
      lanes?: Array<"WEEKEND" | "WEEKDAY">;
      outletId?: string;
      description?: string;
      urgent?: boolean;
      priorityMode?: string;
      title?: string;
      links?: string | string[];
      assigneeId?: string;
      adhoc?: boolean;
      orderedIds?: string[];
      /** Event / go-live date (YYYY-MM-DD) */
      postDate?: string;
      /** Design due date (YYYY-MM-DD); defaults to postDate */
      dueDate?: string;
      /** Upload/done only — do not send creative to Amit Daily */
      noPost?: boolean;
      /** How many daily slots this job counts as when done (1–4) */
      taskWeight?: number;
      /** Multi-outlet assign (one job per outlet) */
      outletIds?: string[];
      /** Typed custom footlights / outlet names */
      customOutlets?: string[];
    };

    if (body.action === "seed" || body.action === "seed-month") {
      if (isTeamDesignerQueueFrozen()) {
        return NextResponse.json(
          { error: "Designer queue is frozen for maintenance" },
          { status: 503 }
        );
      }
      const seedDays = clampDesignerWindowDays(body.days ?? DESIGNER_WINDOW_DAYS);
      const result = await seedDesignerRollingWindow({
        createdBy: session.username,
        fromDate: getTodayKey(),
        days: seedDays,
        lanes: body.lanes,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (body.action === "reorder") {
      const ids = Array.isArray(body.orderedIds)
        ? body.orderedIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        : [];
      if (ids.length === 0) {
        return NextResponse.json({ error: "orderedIds required" }, { status: 400 });
      }
      // Negative pins + clear interrupt mode so drag order is the source of truth.
      // Sequential updates (no $transaction) — pool max 1 can't start txs on Vercel/Railway.
      const ranks = manualSortOrdersFromDragRank(ids.length);
      for (let i = 0; i < ids.length; i++) {
        await prisma.teamDesignerJob.update({
          where: { id: ids[i]! },
          data: {
            sortOrder: ranks[i]!,
            priorityMode: "NONE",
            urgent: false,
          },
        });
      }
      return NextResponse.json({ ok: true, count: ids.length });
    }

    const today = getTodayKey();
    const outletIdsRaw: string[] = [];
    if (Array.isArray(body.outletIds)) {
      for (const o of body.outletIds) {
        if (typeof o === "string" && o.trim()) outletIdsRaw.push(o.trim());
      }
    }
    if (typeof body.outletId === "string" && body.outletId.trim()) {
      outletIdsRaw.push(body.outletId.trim());
    }
    if (Array.isArray(body.customOutlets)) {
      for (const o of body.customOutlets) {
        if (typeof o === "string" && o.trim()) outletIdsRaw.push(o.trim());
      }
    }
    const outletIds: string[] = [];
    const seenOutlet = new Set<string>();
    for (const raw of outletIdsRaw) {
      const id = normalizeDesignerOutletId(raw);
      if (!id || seenOutlet.has(id)) continue;
      seenOutlet.add(id);
      outletIds.push(id);
    }
    if (outletIds.length === 0) {
      return NextResponse.json(
        { error: "Pick at least one outlet (or type a custom footlight)" },
        { status: 400 }
      );
    }

    const assigneeRaw =
      typeof body.assigneeId === "string" ? body.assigneeId.trim().toLowerCase() : "";
    const assigneeId =
      assigneeRaw === "jeslyn" || assigneeRaw === "mahesh" ? assigneeRaw : "mahesh";
    if (!isTeamMemberId(assigneeId)) {
      return NextResponse.json({ error: "Designer required" }, { status: 400 });
    }

    const lane = assigneeId === "jeslyn" ? "WEEKDAY" : "WEEKEND";
    const title =
      typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }
    const desc =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
    const links =
      typeof body.links === "string"
        ? linksFromText(body.links)
        : parseDesignerLinks(body.links);

    const priorityMode = parseDesignerPriorityMode(body.priorityMode);
    const dueYmdRaw =
      typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate.trim())
        ? body.dueDate.trim()
        : null;
    const postYmdRaw =
      typeof body.postDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.postDate.trim())
        ? body.postDate.trim()
        : null;
    // ASAP → due today so it competes at the front of the deadline queue too
    const dueYmd =
      priorityMode === "PAUSE_NOW" ? dueYmdRaw ?? today : dueYmdRaw ?? postYmdRaw ?? today;
    const postYmd = postYmdRaw ?? dueYmd;
    const urgent =
      typeof body.urgent === "boolean" ? body.urgent : priorityMode !== "NONE";
    const noPost = body.noPost === true;
    const taskWeight = clampDesignerTaskWeight(body.taskWeight);
    const stamp = Date.now().toString(36);
    const outletId = joinDesignerOutletIds(outletIds);
    const format = `adhoc-${stamp}`.slice(0, 64);
    const sortOrder =
      priorityMode !== "NONE"
        ? await nextManualDesignerSortOrder(assigneeId)
        : naturalDesignerSortOrder(dueYmd, outletId, format);

    const job = await prisma.teamDesignerJob.create({
      data: {
        monthKey: monthKeyFromYmd(postYmd),
        postDate: postYmd,
        dueDate: dueYmd,
        dueTime: DESIGNER_UPLOAD_DUE_TIME,
        outletId,
        lane,
        format,
        title,
        description: desc,
        sortOrder,
        assigneeId,
        status: "READY_TO_DESIGN",
        urgent,
        priorityMode,
        createdBy: session.username,
      },
    });

    if (noPost) {
      await ensureDesignerNoPostColumn();
      await prisma.$executeRawUnsafe(
        `UPDATE "TeamDesignerJob" SET "noPost" = true, "updatedAt" = NOW() WHERE id = $1`,
        job.id
      );
    }
    if (taskWeight !== 1) {
      await setDesignerJobTaskWeight(job.id, taskWeight);
    }

    if (links.length > 0) {
      await setDesignerJobLinks(job.id, links);
    }

    const createdDto = toDesignerJobDto({ ...job, links, noPost, taskWeight });

    if (priorityMode === "PAUSE_NOW") {
      const actives = await prisma.teamDesignerJob.findMany({
        where: { assigneeId, status: "IN_PROGRESS" },
        select: { id: true },
      });
      for (const a of actives) {
        await pauseDesignerJobNow(a.id);
      }
    }

    const outletLabels = teamOutletLabel(outletId);
    const who = assigneeId === "jeslyn" ? "Jeslyn" : "Mahesh";
    return NextResponse.json({
      job: createdDto,
      jobs: [createdDto],
      message: `Sent to ${who} · ${outletLabels}`,
    });
  } catch (err) {
    console.error("[team/designer-jobs] POST", err);
    const msg = err instanceof Error ? err.message : "Failed to create";
    if (msg.includes("Unique") || (err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Job already exists for that slot" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
