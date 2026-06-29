import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getTeamFromRequest } from "@/lib/team-auth";
import { teamOutletLabel } from "@/lib/team-outlets";
import { teamMemberName } from "@/lib/team-members";
import { TEAM_PRIORITY_LABELS } from "@/lib/team-priority";
import { filterTeamTasks, formatTeamEndDateTime, formatTeamStartDate, primaryCreativeLink, sortTeamTasks, type TeamTaskFilter } from "@/lib/team-tasks";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const filter = (sp.get("filter") as TeamTaskFilter) || "all";
  const outletId = sp.get("outletId");
  const assigneeParam = sp.get("assignee");

  let assigneeId: string | undefined;
  if (session.role === "member" || session.role === "poc") {
    assigneeId = session.memberId ?? session.username;
  } else if (assigneeParam && assigneeParam !== "all") {
    assigneeId = assigneeParam;
  }

  const rows = await prisma.teamAdTask.findMany({
    where: {
      ...(outletId ? { outletId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
    },
    orderBy: [{ priority: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const filtered = sortTeamTasks(filterTeamTasks(rows, filter));

  const sheetRows = filtered.map((t) => ({
    Outlet: teamOutletLabel(t.outletId),
    Title: t.title,
    Description: t.description ?? "",
    Status: t.status,
    "Creative link": primaryCreativeLink(t) ?? "",
    Source: t.creativeSource,
    Assignee: teamMemberName(t.assigneeId),
    Priority: TEAM_PRIORITY_LABELS[t.priority],
    "Start date": formatTeamStartDate(t.startDate),
    "End date": formatTeamEndDateTime(t.endDate, t.endTime),
    Deadline: formatTeamEndDateTime(t.deadlineDate, t.deadlineTime),
    "Created by": t.createdBy,
    "Completed by": t.completedBy ?? "",
    "Completed at": t.completedAt?.toISOString() ?? "",
    "Created at": t.createdAt.toISOString(),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, "Ad tasks");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bassik-ad-tasks-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
