import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  boardDateWindow,
  getTodayKey,
  toTeamDailyChecklistDto,
} from "@/lib/team-checklists";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const today = getTodayKey();
  const dateKeys = boardDateWindow(today);

  try {
    const checklist = await prisma.teamDailyChecklist.findUnique({ where: { id } });
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      sortOrder?: number;
    };

    const updates: {
      title?: string;
      description?: string | null;
      sortOrder?: number;
    } = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: "Title required" }, { status: 400 });
      }
      updates.title = title;
    }

    if (body.description !== undefined) {
      updates.description = body.description.trim() || null;
    }

    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      updates.sortOrder = Math.round(body.sortOrder);
    }

    const updated = await prisma.teamDailyChecklist.update({
      where: { id },
      data: updates,
      include: {
        items: {
          include: {
            completions: {
              where: { date: { in: dateKeys } },
            },
          },
        },
      },
    });

    return NextResponse.json({
      checklist: toTeamDailyChecklistDto(updated, today),
    });
  } catch (err) {
    console.error("[team/checklists/[id]] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}

export async function DELETE(
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
    const checklist = await prisma.teamDailyChecklist.findUnique({ where: { id } });
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    await prisma.teamDailyChecklist.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[team/checklists/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete checklist" }, { status: 500 });
  }
}
