import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  getTodayKey,
  parseDayOfWeek,
  parsePlatforms,
  toTeamChecklistItemDto,
} from "@/lib/team-checklists";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const checklist = await prisma.teamDailyChecklist.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      instructions?: string;
      dayOfWeek?: string;
      platforms?: unknown;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const maxSortOrder = Math.max(...checklist.items.map((i) => i.sortOrder), -1);

    const item = await prisma.teamChecklistItem.create({
      data: {
        checklistId: id,
        title,
        description: body.description?.trim() || null,
        instructions: body.instructions?.trim() || null,
        dayOfWeek: parseDayOfWeek(body.dayOfWeek),
        platforms: parsePlatforms(body.platforms),
        sortOrder: maxSortOrder + 1,
      },
      include: { completions: true },
    });

    return NextResponse.json({
      item: toTeamChecklistItemDto(item, getTodayKey()),
    });
  } catch (err) {
    console.error("[team/checklists/[id]/items] POST error:", err);
    return NextResponse.json({ error: "Failed to create checklist item" }, { status: 500 });
  }
}
