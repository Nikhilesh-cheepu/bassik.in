import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { isTeamMemberId } from "@/lib/team-members";
import {
  DESIGNER_UPLOAD_DUE_TIME,
  DESIGNER_WINDOW_DAYS,
  linksFromText,
  loadDesignerEditMetaByIds,
  loadDesignerJobLinksByIds,
  monthKeyFromYmd,
  parseDesignerLinks,
  rollingWindowBounds,
  seedDesignerRollingWindow,
  setDesignerJobLinks,
  sortDesignerJobs,
  toDesignerJobDto,
} from "@/lib/team-designer-jobs";
import { getTodayKey } from "@/lib/team-checklists";
import { isTeamOutletId } from "@/lib/team-outlets";

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
  startedAt: true,
  uploadedAt: true,
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
  const view = req.nextUrl.searchParams.get("view") === "closed" ? "closed" : "open";

  try {
    if (view === "closed") {
      const whereClosed: {
        status: "DESIGN_DONE";
        assigneeId?: string;
        OR: Array<
          | { uploadedAt: { gte: Date } }
          | { uploadedAt: null; postDate: { gte: string } }
        >;
      } = {
        status: "DESIGN_DONE",
        // Closed in rolling window (by upload time) or recent post dates without upload stamp
        OR: [
          { uploadedAt: { gte: new Date(`${fromDate}T00:00:00+05:30`) } },
          { uploadedAt: null, postDate: { gte: fromDate } },
        ],
      };
      if (!isAdmin) whereClosed.assigneeId = memberId;

      const rows = await prisma.teamDesignerJob.findMany({
        where: whereClosed,
        select: JOB_SELECT,
        orderBy: [{ uploadedAt: "desc" }, { postDate: "desc" }, { outletId: "asc" }],
        take: 200,
      });

      const ids = rows.map((r) => r.id);
      const [linksMap, editMap] = await Promise.all([
        loadDesignerJobLinksByIds(ids),
        loadDesignerEditMetaByIds(ids),
      ]);
      const jobs = rows.map((r) => {
        const edit = editMap.get(r.id);
        return toDesignerJobDto(
          {
            ...r,
            links: linksMap.get(r.id) ?? [],
            editRequestedAt: edit?.editRequestedAt ?? null,
            editRequestNote: edit?.editRequestNote ?? null,
            pauseRequestedAt: edit?.pauseRequestedAt ?? null,
            pauseRequestNote: edit?.pauseRequestNote ?? null,
          },
          today
        );
      });

      return NextResponse.json({
        view: "closed",
        window: { fromDate, toDate, days },
        jobs,
        today,
      });
    }

    // Open queue: still-open jobs in the window. Include go-live today/future even if
    // creative dueDate already passed (e.g. Sat/Sun posts due Tue–Wed still needed Fri).
    const where: {
      postDate: { gte: string; lte: string };
      assigneeId?: string;
      status: {
        in: Array<"WAITING_BRIEF" | "READY_TO_DESIGN" | "IN_PROGRESS" | "PAUSED">;
      };
      OR: Array<{ dueDate: { gte: string } } | { postDate: { gte: string } }>;
    } = {
      postDate: { gte: fromDate, lte: toDate },
      status: { in: ["WAITING_BRIEF", "READY_TO_DESIGN", "IN_PROGRESS", "PAUSED"] },
      OR: [{ dueDate: { gte: today } }, { postDate: { gte: today } }],
    };

    if (!isAdmin) {
      where.assigneeId = memberId;
    }

    const rows = await prisma.teamDesignerJob.findMany({
      where,
      select: JOB_SELECT,
      orderBy: [{ dueDate: "asc" }, { postDate: "asc" }, { outletId: "asc" }],
    });

    const ids = rows.map((r) => r.id);
    const [linksMap, editMap] = await Promise.all([
      loadDesignerJobLinksByIds(ids),
      loadDesignerEditMetaByIds(ids),
    ]);
    const jobs = sortDesignerJobs(
      rows.map((r) => {
        const edit = editMap.get(r.id);
        return toDesignerJobDto(
          {
            ...r,
            links: linksMap.get(r.id) ?? [],
            editRequestedAt: edit?.editRequestedAt ?? null,
            editRequestNote: edit?.editRequestNote ?? null,
            pauseRequestedAt: edit?.pauseRequestedAt ?? null,
            pauseRequestNote: edit?.pauseRequestNote ?? null,
          },
          today
        );
      }),
      today
    );

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
    return NextResponse.json({ error: "Failed to load designer jobs" }, { status: 500 });
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
      title?: string;
      links?: string | string[];
      assigneeId?: string;
      adhoc?: boolean;
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

    const job = await prisma.teamDesignerJob.create({
      data: {
        monthKey: monthKeyFromYmd(today),
        postDate: today,
        dueDate: today,
        dueTime: DESIGNER_UPLOAD_DUE_TIME,
        outletId,
        lane,
        format,
        title,
        description: desc,
        assigneeId,
        status: "READY_TO_DESIGN",
        urgent: body.urgent !== false,
        createdBy: session.username,
      },
    });

    if (links.length > 0) {
      await setDesignerJobLinks(job.id, links);
    }

    return NextResponse.json({
      job: toDesignerJobDto({ ...job, links }),
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
