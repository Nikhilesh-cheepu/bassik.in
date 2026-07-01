import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { isTeamMemberId } from "@/lib/team-members";
import {
  buildDoneReportByDates,
  defaultDoneReportDates,
  defaultMemberDoneIds,
  filterDoneTasksByDates,
  whatsAppShareUrl,
} from "@/lib/team-whatsapp-report";
import { teamTaskCompletedDayKey } from "@/lib/team-tasks";
import { prisma } from "@/lib/db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

function mapTaskRow(t: {
  id: string;
  title: string;
  status: string;
  outletId: string | null;
  assigneeId: string;
  completedAt: Date | null;
}) {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    outletId: t.outletId,
    assigneeId: t.assigneeId,
    completedAt: t.completedAt?.toISOString() ?? null,
  };
}

async function loadDoneRows(session: NonNullable<Awaited<ReturnType<typeof getTeamFromRequest>>>, assigneeParam: string | null) {
  const where: { status: "DONE"; assigneeId?: string } = { status: "DONE" };

  if (session.role === "member" || session.role === "poc") {
    const mid = session.memberId ?? session.username;
    if (!isTeamMemberId(mid)) return null;
    where.assigneeId = mid;
  } else if (
    session.role === "admin" &&
    assigneeParam &&
    assigneeParam !== "all" &&
    isTeamMemberId(assigneeParam)
  ) {
    where.assigneeId = assigneeParam;
  } else if (session.role === "viewer") {
    return null;
  }

  return prisma.teamAdTask.findMany({
    where,
    orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
    take: 120,
  });
}

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assigneeParam = req.nextUrl.searchParams.get("assignee");

  try {
    const rows = await loadDoneRows(session, assigneeParam);
    if (!rows) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const defaultDates = defaultDoneReportDates(rows);
    return NextResponse.json({
      tasks: rows.map(mapTaskRow),
      defaultDates,
      defaultIds: defaultMemberDoneIds(rows),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team done-report GET]", error);
    return NextResponse.json({ error: "Could not load tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const taskIds = Array.isArray(body.taskIds)
    ? body.taskIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const dates = Array.isArray(body.dates)
    ? body.dates.filter((d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];

  const assignee =
    typeof body.assignee === "string"
      ? body.assignee
      : req.nextUrl.searchParams.get("assignee");

  try {
    const rows = await loadDoneRows(session, assignee ?? null);
    if (!rows) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed = new Set(rows.map((t) => t.id));
    let pool = rows;

    if (dates.length) {
      pool = filterDoneTasksByDates(pool, dates);
    }

    let ids = taskIds.length
      ? taskIds.filter((id: string) => allowed.has(id))
      : pool.map((t) => t.id);

    if (dates.length) {
      const dateSet = new Set(dates);
      ids = ids.filter((id: string) => {
        const t = rows.find((r) => r.id === id);
        if (!t) return false;
        return dateSet.has(teamTaskCompletedDayKey(t.completedAt?.toISOString() ?? t.updatedAt.toISOString()));
      });
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "No done tasks for selected dates" }, { status: 400 });
    }

    const memberAuthorId =
      session.role === "member" || session.role === "poc"
        ? (session.memberId ?? session.username)
        : undefined;

    const text = buildDoneReportByDates(rows, ids, {
      ...(memberAuthorId && isTeamMemberId(memberAuthorId)
        ? { memberAuthorId }
        : {}),
    });
    const phone = process.env.TEAM_WHATSAPP_PHONE?.trim() || null;
    return NextResponse.json({
      text,
      shareUrl: whatsAppShareUrl(text, phone),
      selectedCount: ids.length,
      dates: dates.length ? dates : [...new Set(ids.map((id: string) => {
        const t = rows.find((r) => r.id === id);
        return t ? teamTaskCompletedDayKey(t.completedAt?.toISOString() ?? t.updatedAt.toISOString()) : "";
      }).filter(Boolean))],
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team done-report POST]", error);
    return NextResponse.json({ error: "Could not build report" }, { status: 500 });
  }
}
