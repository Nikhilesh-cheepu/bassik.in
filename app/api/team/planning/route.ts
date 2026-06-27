import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import {
  filterPlanningNotes,
  parsePlanningPayload,
  toTeamPlanningDto,
  type TeamPlanningFilter,
} from "@/lib/team-planning";
import { prisma } from "@/lib/db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

const FILTERS = new Set<string>(["all", "PLANNING", "DISCUSSION", "FEEDBACK"]);

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filter = (req.nextUrl.searchParams.get("type") || "all") as TeamPlanningFilter;
  const safeFilter = FILTERS.has(filter) ? filter : "all";

  try {
    const rows = await prisma.teamPlanningNote.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      notes: filterPlanningNotes(rows, safeFilter).map(toTeamPlanningDto),
      filter: safeFilter,
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team planning GET]", error);
    return NextResponse.json({ error: "Could not load planning notes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parsePlanningPayload(body);
  const title =
    parsed.title ||
    parsed.sheetData?.columns.join(" · ").slice(0, 80) ||
    parsed.body?.slice(0, 80) ||
    (parsed.type === "FEEDBACK" ? "Feedback" : "Planning");
  if (title.length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }

  try {
  const row = await prisma.teamPlanningNote.create({
    data: {
      type: parsed.type,
      title,
      body: parsed.body,
      outletId: parsed.outletId,
      imageUrls: parsed.imageUrls.length ? parsed.imageUrls : undefined,
      sheetData: parsed.sheetData ?? undefined,
      attachmentUrls: parsed.attachments.length ? parsed.attachments : undefined,
      createdBy: session.username,
    },
  });

  return NextResponse.json({ note: toTeamPlanningDto(row) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team planning POST]", error);
    return NextResponse.json({ error: "Could not save note" }, { status: 500 });
  }
}
