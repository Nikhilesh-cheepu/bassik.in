import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getTeamFromRequest } from "@/lib/team-auth";
import { teamOutletLabel } from "@/lib/team-outlets";
import { filterTeamTasks, formatTeamStartDate, primaryCreativeLink, type TeamTaskFilter } from "@/lib/team-tasks";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!(await getTeamFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const filter = (sp.get("filter") as TeamTaskFilter) || "all";
  const outletId = sp.get("outletId");

  const rows = await prisma.teamAdTask.findMany({
    where: outletId ? { outletId } : undefined,
    orderBy: [{ status: "asc" }, { startDate: "asc" }, { createdAt: "desc" }],
  });

  const filtered = filterTeamTasks(rows, filter);

  const sheetRows = filtered.map((t) => ({
    Outlet: teamOutletLabel(t.outletId),
    Title: t.title,
    Description: t.description ?? "",
    Status: t.status,
    "Creative link": primaryCreativeLink(t) ?? "",
    Source: t.creativeSource,
    "Start date": formatTeamStartDate(t.startDate),
    "End date": t.endDate ?? "",
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
