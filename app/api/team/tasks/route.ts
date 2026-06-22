import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { isTeamOutletId } from "@/lib/team-outlets";
import {
  detectCreativeSource,
  filterTeamTasks,
  normalizeTeamStartDate,
  toTeamTaskDto,
  type TeamTaskFilter,
} from "@/lib/team-tasks";
import { prisma } from "@/lib/db";

const FILTERS = new Set<TeamTaskFilter>(["all", "todo", "done"]);

export async function GET(req: NextRequest) {
  if (!(await getTeamFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const filter = (sp.get("filter") as TeamTaskFilter) || "all";
  const outletId = sp.get("outletId");

  const rows = await prisma.teamAdTask.findMany({
    where: outletId && isTeamOutletId(outletId) ? { outletId } : undefined,
    orderBy: [{ status: "asc" }, { startDate: "asc" }, { createdAt: "desc" }],
  });

  const safeFilter = FILTERS.has(filter) ? filter : "all";
  const filtered = filterTeamTasks(rows, safeFilter);

  return NextResponse.json({
    tasks: filtered.map(toTeamTaskDto),
    filter: safeFilter,
  });
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
  const outletId = typeof body.outletId === "string" ? body.outletId.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const creativeUrl = typeof body.creativeUrl === "string" ? body.creativeUrl.trim() : "";
  const uploadedUrl = typeof body.uploadedUrl === "string" ? body.uploadedUrl.trim() : "";
  const startDate = typeof body.startDate === "string" ? body.startDate.trim() : "";
  const endDate = typeof body.endDate === "string" ? body.endDate.trim() : "";

  if (!isTeamOutletId(outletId)) {
    return NextResponse.json({ error: "Pick a valid outlet" }, { status: 400 });
  }

  const finalTitle = title || description.slice(0, 80) || `Ad — ${outletId}`;
  if (finalTitle.length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }

  let creativeSource: "DRIVE_LINK" | "INSTAGRAM" | "UPLOAD" | "NONE" = "NONE";
  if (uploadedUrl) {
    creativeSource = "UPLOAD";
  } else if (creativeUrl) {
    creativeSource = detectCreativeSource(creativeUrl);
  }

  const row = await prisma.teamAdTask.create({
    data: {
      outletId,
      title: finalTitle,
      description: description || null,
      creativeUrl: creativeUrl || null,
      creativeSource,
      uploadedUrl: uploadedUrl || null,
      startDate: normalizeTeamStartDate(startDate),
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : null,
      createdBy: session.username,
    },
  });

  return NextResponse.json({ task: toTeamTaskDto(row) });
}
