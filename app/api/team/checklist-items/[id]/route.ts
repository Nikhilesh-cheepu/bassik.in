import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  getTodayKey,
  parseDayOfWeek,
  parsePlatforms,
  readyDatesFromJson,
  toTeamChecklistItemDto,
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

  try {
    const item = await prisma.teamChecklistItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      instructions?: string;
      dayOfWeek?: string;
      platforms?: unknown;
      sortOrder?: number;
      /** Mark creatives ready (green) for this target date */
      creativeReady?: boolean;
      date?: string;
    };

    const updates: {
      title?: string;
      description?: string | null;
      instructions?: string | null;
      dayOfWeek?: string | null;
      platforms?: string[];
      sortOrder?: number;
      readyDates?: string[];
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

    if (body.instructions !== undefined) {
      updates.instructions = body.instructions.trim() || null;
    }

    if (body.dayOfWeek !== undefined) {
      updates.dayOfWeek = parseDayOfWeek(body.dayOfWeek);
    }

    if (body.platforms !== undefined) {
      updates.platforms = parsePlatforms(body.platforms);
    }

    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      updates.sortOrder = Math.round(body.sortOrder);
    }

    if (typeof body.creativeReady === "boolean") {
      const dateRaw = typeof body.date === "string" ? body.date.trim() : getTodayKey();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        return NextResponse.json({ error: "Valid date required" }, { status: 400 });
      }
      const current = readyDatesFromJson(item.readyDates);
      if (body.creativeReady) {
        updates.readyDates = current.includes(dateRaw) ? current : [...current, dateRaw];
      } else {
        updates.readyDates = current.filter((d) => d !== dateRaw);
      }
    }

    const updated = await prisma.teamChecklistItem.update({
      where: { id },
      data: updates,
      include: { completions: true },
    });

    return NextResponse.json({
      item: toTeamChecklistItemDto(updated, getTodayKey()),
    });
  } catch (err) {
    console.error("[team/checklist-items/[id]] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
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
    const item = await prisma.teamChecklistItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.teamChecklistItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[team/checklist-items/[id]] DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
