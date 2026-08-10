import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { isTeamMemberId } from "@/lib/team-members";
import {
  DESIGNER_UPLOAD_DUE_TIME,
  DESIGNER_WINDOW_DAYS,
  linksFromText,
  loadDesignerEditMetaByIds,
  loadDesignerFileUrlsByIds,
  loadDesignerJobLinksByIds,
  monthKeyFromYmd,
  naturalDesignerSortOrder,
  nextManualDesignerSortOrder,
  parseDesignerLinks,
  rollingWindowBounds,
  seedDesignerRollingWindow,
  ensureDesignerNoPostColumn,
  pauseDesignerJobNow,
  setDesignerJobLinks,
  sortDesignerJobs,
  toDesignerJobDto,
  manualSortOrdersFromDragRank,
} from "@/lib/team-designer-jobs";
import { addDaysYmd, getTodayKey } from "@/lib/team-checklists";
import {
  normalizeDesignerFileUrls,
  parseDesignerPriorityMode,
} from "@/lib/team-designer-jobs-shared";
import { isTeamOutletId } from "@/lib/team-outlets";

async function jobsWithExtras(
  rows: Array<Parameters<typeof toDesignerJobDto>[0] & { id: string; fileUrl?: string | null }>,
  today: string
) {
  const ids = rows.map((r) => r.id);
  const [linksMap, editMap, filesMap] = await Promise.all([
    loadDesignerJobLinksByIds(ids),
    loadDesignerEditMetaByIds(ids),
    loadDesignerFileUrlsByIds(ids),
  ]);
  return rows.map((r) => {
    const edit = editMap.get(r.id);
    return toDesignerJobDto(
      {
        ...r,
        links: linksMap.get(r.id) ?? [],
        fileUrls:
          filesMap.get(r.id) ?? normalizeDesignerFileUrls(r.fileUrl ?? null, null),
        editRequestedAt: edit?.editRequestedAt ?? null,
        editRequestNote: edit?.editRequestNote ?? null,
        pauseRequestedAt: edit?.pauseRequestedAt ?? null,
        pauseRequestNote: edit?.pauseRequestNote ?? null,
        catchUpExempt: edit?.catchUpExempt ?? false,
        activeWorkMs: edit?.activeWorkMs ?? 0,
        pausedAt: edit?.pausedAt ?? null,
        noPost: edit?.noPost ?? false,
      },
      today
    );
  });
}

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
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer" || session.role === "content") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = getTodayKey();
  const { fromDate, toDate, days } = rollingWindowBounds(today, DESIGNER_WINDOW_DAYS);
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

      const rows = await prisma.teamDesignerJob.findMany({
        where: whereExpired,
        select: JOB_SELECT,
        orderBy: [{ postDate: "desc" }, { uploadedAt: "desc" }],
        take: 150,
      });
      const jobs = await jobsWithExtras(rows, today);
      return NextResponse.json({
        view: "expired",
        window: { fromDate, toDate, days },
        jobs,
        today,
      });
    }

    if (view === "closed") {
      // Look back 30 days — not the forward rolling window (fromDate = today would hide
      // yesterday’s closes like Mahesh’s Jul 31 uploads).
      const closedFrom = addDaysYmd(today, -(DESIGNER_WINDOW_DAYS - 1));
      const whereClosed: {
        status: "DESIGN_DONE";
        assigneeId?: string;
        OR: Array<
          | { uploadedAt: { gte: Date } }
          | { uploadedAt: null; updatedAt: { gte: Date } }
          | { uploadedAt: null; postDate: { gte: string } }
        >;
      } = {
        status: "DESIGN_DONE",
        OR: [
          { uploadedAt: { gte: new Date(`${closedFrom}T00:00:00+05:30`) } },
          {
            uploadedAt: null,
            updatedAt: { gte: new Date(`${closedFrom}T00:00:00+05:30`) },
          },
          { uploadedAt: null, postDate: { gte: closedFrom } },
        ],
      };
      if (!isAdmin) whereClosed.assigneeId = memberId;

      const rows = await prisma.teamDesignerJob.findMany({
        where: whereClosed,
        select: JOB_SELECT,
        orderBy: [{ uploadedAt: "desc" }, { updatedAt: "desc" }, { postDate: "desc" }],
        take: 200,
      });

      const jobs = await jobsWithExtras(rows, today);

      return NextResponse.json({
        view: "closed",
        window: { fromDate, toDate, days },
        jobs,
        today,
      });
    }

    // Open queue: still-open jobs in the window. Include go-live today/future even if
    // creative dueDate already passed (e.g. Sat/Sun posts due Tue–Wed still needed Fri).
    const baseWhere = {
      postDate: { gte: fromDate, lte: toDate },
      OR: [{ dueDate: { gte: today } }, { postDate: { gte: today } }] as Array<
        { dueDate: { gte: string } } | { postDate: { gte: string } }
      >,
      ...(isAdmin ? {} : { assigneeId: memberId }),
    };

    // sortOrder repair runs on Seed only — not every tab switch (was slow).

    let rows;
    try {
      // Prefer not DESIGN_DONE so PAUSED is included without listing it in `in: [...]`
      // (avoids 500s when a deploy's Prisma client is briefly out of sync with the enum).
      rows = await prisma.teamDesignerJob.findMany({
        where: { ...baseWhere, status: { not: "DESIGN_DONE" } },
        select: JOB_SELECT,
        orderBy: [{ dueDate: "asc" }, { postDate: "asc" }, { outletId: "asc" }],
      });
    } catch (primaryErr) {
      console.error("[team/designer-jobs] open query primary failed, fallback", primaryErr);
      rows = await prisma.teamDesignerJob.findMany({
        where: {
          ...baseWhere,
          status: { in: ["WAITING_BRIEF", "READY_TO_DESIGN", "IN_PROGRESS"] },
        },
        select: JOB_SELECT,
        orderBy: [{ dueDate: "asc" }, { postDate: "asc" }, { outletId: "asc" }],
      });
    }

    // Always surface stuck IN_PROGRESS / PAUSED even if outside the rolling window —
    // otherwise Start is blocked on a job the UI never lists.
    const activeWhere = {
      status: { in: ["IN_PROGRESS", "PAUSED"] as Array<"IN_PROGRESS" | "PAUSED"> },
      ...(isAdmin ? {} : { assigneeId: memberId }),
    };
    let activeRows: typeof rows = [];
    try {
      activeRows = await prisma.teamDesignerJob.findMany({
        where: activeWhere,
        select: JOB_SELECT,
      });
    } catch (activeErr) {
      console.error("[team/designer-jobs] active jobs query failed", activeErr);
    }
    const seen = new Set(rows.map((r) => r.id));
    for (const r of activeRows) {
      if (!seen.has(r.id)) {
        rows.push(r);
        seen.add(r.id);
      }
    }

    const jobs = sortDesignerJobs(await jobsWithExtras(rows, today));

    return NextResponse.json({
      view: "open",
      window: { fromDate, toDate, days },
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
    const body = (await req.json()) as {
      action?: string;
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
    };

    if (body.action === "seed" || body.action === "seed-month") {
      const result = await seedDesignerRollingWindow({
        createdBy: session.username,
        fromDate: getTodayKey(),
        days: DESIGNER_WINDOW_DAYS,
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
    const outletId = typeof body.outletId === "string" ? body.outletId.trim() : "";
    if (!isTeamOutletId(outletId)) {
      return NextResponse.json({ error: "Outlet required" }, { status: 400 });
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

    const format = `adhoc-${Date.now().toString(36)}`;
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
    const sortOrder =
      priorityMode !== "NONE"
        ? await nextManualDesignerSortOrder(assigneeId)
        : naturalDesignerSortOrder(dueYmd, outletId, format);

    const noPost = body.noPost === true;
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

    if (links.length > 0) {
      await setDesignerJobLinks(job.id, links);
    }

    if (priorityMode === "PAUSE_NOW") {
      const actives = await prisma.teamDesignerJob.findMany({
        where: { assigneeId, status: "IN_PROGRESS" },
        select: { id: true },
      });
      for (const a of actives) {
        await pauseDesignerJobNow(a.id);
      }
    }

    return NextResponse.json({
      job: toDesignerJobDto({
        ...job,
        links,
        noPost,
      }),
      message: `Sent to ${assigneeId === "jeslyn" ? "Jeslyn" : "Mahesh"}`,
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
