import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  getCurrentWeekMeta,
  getTodayKey,
  isChecklistPlatformId,
  itemDateKeyForWeek,
  parsePlatforms,
  platformsFromJson,
} from "@/lib/team-checklists";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const completedBy = teamPersonalNoteOwnerId(session);
  const week = getCurrentWeekMeta();
  const today = getTodayKey();

  try {
    const body = (await req.json().catch(() => ({}))) as {
      date?: string;
      togglePlatform?: string;
      platforms?: unknown;
      markComplete?: boolean;
    };

    const item = await prisma.teamChecklistItem.findUnique({
      where: { id },
      include: { checklist: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.checklist.ownerId !== completedBy && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dateRaw = typeof body.date === "string" ? body.date.trim() : "";
    const date =
      /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) && week.dayKeys.includes(dateRaw)
        ? dateRaw
        : itemDateKeyForWeek(item.dayOfWeek, week, today);

    const existing = await prisma.teamChecklistCompletion.findUnique({
      where: { itemId_date: { itemId: id, date } },
    });

    // Explicit mark complete toggle (no platform change)
    if (typeof body.markComplete === "boolean" && body.togglePlatform === undefined && body.platforms === undefined) {
      if (body.markComplete) {
        const platforms =
          existing
            ? platformsFromJson(existing.completedPlatforms)
            : platformsFromJson(item.platforms);
        const row = await prisma.teamChecklistCompletion.upsert({
          where: { itemId_date: { itemId: id, date } },
          create: {
            itemId: id,
            completedBy,
            date,
            completedPlatforms: platforms.length ? platforms : platformsFromJson(item.platforms),
          },
          update: {
            completedBy,
            completedPlatforms:
              platforms.length > 0 ? platforms : platformsFromJson(item.platforms),
          },
        });
        return NextResponse.json({
          completed: true,
          date,
          completedPlatforms: platformsFromJson(row.completedPlatforms),
        });
      }

      if (existing) {
        await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
      }
      return NextResponse.json({ completed: false, date, completedPlatforms: [] });
    }

    // Toggle a single platform
    if (typeof body.togglePlatform === "string") {
      const platform = body.togglePlatform.trim().toLowerCase();
      if (!isChecklistPlatformId(platform)) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
      }

      let next = existing ? platformsFromJson(existing.completedPlatforms) : [];
      if (next.includes(platform)) {
        next = next.filter((p) => p !== platform);
      } else {
        next = [...next, platform];
      }

      if (next.length === 0 && !existing?.completedPlatforms) {
        // If nothing left and we never marked complete with empty set, delete
        if (existing) {
          await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
        }
        return NextResponse.json({ completed: false, date, completedPlatforms: [] });
      }

      // Keep row if platforms remain OR item was previously marked (row exists with empty after uncheck all — delete)
      if (next.length === 0) {
        if (existing) {
          await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
        }
        return NextResponse.json({ completed: false, date, completedPlatforms: [] });
      }

      const row = await prisma.teamChecklistCompletion.upsert({
        where: { itemId_date: { itemId: id, date } },
        create: {
          itemId: id,
          completedBy,
          date,
          completedPlatforms: next,
        },
        update: {
          completedBy,
          completedPlatforms: next,
        },
      });

      return NextResponse.json({
        completed: true,
        date,
        completedPlatforms: platformsFromJson(row.completedPlatforms),
      });
    }

    // Replace full platforms list
    if (body.platforms !== undefined) {
      const next = parsePlatforms(body.platforms);
      if (next.length === 0) {
        if (existing) {
          await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
        }
        return NextResponse.json({ completed: false, date, completedPlatforms: [] });
      }

      const row = await prisma.teamChecklistCompletion.upsert({
        where: { itemId_date: { itemId: id, date } },
        create: {
          itemId: id,
          completedBy,
          date,
          completedPlatforms: next,
        },
        update: {
          completedBy,
          completedPlatforms: next,
        },
      });

      return NextResponse.json({
        completed: true,
        date,
        completedPlatforms: platformsFromJson(row.completedPlatforms),
      });
    }

    // Legacy toggle: no body → flip completion for date
    if (existing) {
      await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
      return NextResponse.json({ completed: false, date, completedPlatforms: [] });
    }

    const platforms = platformsFromJson(item.platforms);
    const row = await prisma.teamChecklistCompletion.create({
      data: {
        itemId: id,
        completedBy,
        date,
        completedPlatforms: platforms,
      },
    });

    return NextResponse.json({
      completed: true,
      date,
      completedPlatforms: platformsFromJson(row.completedPlatforms),
    });
  } catch (err) {
    console.error("[team/checklist-items/[id]/complete] POST error:", err);
    return NextResponse.json({ error: "Failed to toggle completion" }, { status: 500 });
  }
}
