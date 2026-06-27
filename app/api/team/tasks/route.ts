import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { createTeamAdTask } from "@/lib/team-task-create";
import { isTeamMemberId } from "@/lib/team-members";
import { isTeamOutletId } from "@/lib/team-outlets";
import {
  filterTeamTasks,
  sortTeamTasks,
  toTeamTaskDto,
  type TeamTaskFilter,
} from "@/lib/team-tasks";
import { prisma } from "@/lib/db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

const FILTERS = new Set<TeamTaskFilter>(["all", "todo", "done", "pending"]);

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const filter = (sp.get("filter") as TeamTaskFilter) || "all";
  const outletId = sp.get("outletId");
  const assigneeParam = sp.get("assignee");

  let assigneeId: string | undefined;
  if (session.role === "member") {
    const mid = session.memberId ?? session.username;
    if (!isTeamMemberId(mid)) {
      return NextResponse.json({ error: "Invalid member session" }, { status: 403 });
    }
    assigneeId = mid;
  } else if (assigneeParam && assigneeParam !== "all" && isTeamMemberId(assigneeParam)) {
    assigneeId = assigneeParam;
  }

  try {
    const rows = await prisma.teamAdTask.findMany({
      where: {
        ...(outletId && isTeamOutletId(outletId) ? { outletId } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
      orderBy: [{ priority: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const safeFilter = FILTERS.has(filter) ? filter : "all";
    const filtered = sortTeamTasks(filterTeamTasks(rows, safeFilter, session.role));

    return NextResponse.json({
      tasks: filtered.map(toTeamTaskDto),
      filter: safeFilter,
      assignee: assigneeId ?? "all",
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team tasks GET]", error);
    return NextResponse.json({ error: "Could not load tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admin can create tasks" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const task = await createTeamAdTask(
      {
        outletId: typeof body.outletId === "string" ? body.outletId : "",
        assigneeId: typeof body.assigneeId === "string" ? body.assigneeId : undefined,
        title: typeof body.title === "string" ? body.title : "",
        description: typeof body.description === "string" ? body.description : undefined,
        creativeUrl: typeof body.creativeUrl === "string" ? body.creativeUrl : undefined,
        uploadedUrl: typeof body.uploadedUrl === "string" ? body.uploadedUrl : undefined,
        referenceUrls: body.referenceUrls,
        startDate: typeof body.startDate === "string" ? body.startDate : undefined,
        endDate: typeof body.endDate === "string" ? body.endDate : undefined,
        endTime: typeof body.endTime === "string" ? body.endTime : undefined,
        deadlineDate: typeof body.deadlineDate === "string" ? body.deadlineDate : undefined,
        deadlineTime: typeof body.deadlineTime === "string" ? body.deadlineTime : undefined,
        priority: typeof body.priority === "string" ? body.priority : undefined,
      },
      session.username
    );
    return NextResponse.json({ task });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create failed";
    const status = message.includes("Invalid") || message.includes("long") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
