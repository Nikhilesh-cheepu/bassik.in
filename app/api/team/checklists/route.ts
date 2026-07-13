import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  getCurrentWeekMeta,
  getTodayKey,
  parseDayOfWeek,
  parsePlatforms,
  sortTeamChecklists,
  toTeamDailyChecklistDto,
} from "@/lib/team-checklists";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";
import { isTeamMemberId } from "@/lib/team-members";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const manageMemberId = req.nextUrl.searchParams.get("manageMemberId");
  const ownerId =
    manageMemberId && session.role === "admin" && isTeamMemberId(manageMemberId)
      ? manageMemberId
      : teamPersonalNoteOwnerId(session);

  const week = getCurrentWeekMeta();
  const today = getTodayKey();

  try {
    const rawChecklists = await prisma.teamDailyChecklist.findMany({
      where: { ownerId },
      include: {
        items: {
          include: {
            completions: {
              where: { date: { in: week.dayKeys } },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const sorted = sortTeamChecklists(rawChecklists);
    const checklists = sorted.map((c) => toTeamDailyChecklistDto(c, today));

    return NextResponse.json({ checklists, week });
  } catch (err) {
    console.error("[team/checklists] GET error:", err);
    return NextResponse.json({ error: "Failed to load checklists" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      ownerId?: string;
      title?: string;
      description?: string;
      items?: Array<{
        title?: string;
        description?: string;
        instructions?: string;
        dayOfWeek?: string;
        platforms?: unknown;
      }>;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const ownerId = body.ownerId?.trim() ?? "";
    if (!ownerId || (!isTeamMemberId(ownerId) && ownerId !== "admin")) {
      return NextResponse.json({ error: "Valid assignee required" }, { status: 400 });
    }

    const week = getCurrentWeekMeta();
    const today = getTodayKey();

    const checklist = await prisma.teamDailyChecklist.create({
      data: {
        ownerId,
        title,
        description: body.description?.trim() || null,
        createdBy: teamPersonalNoteOwnerId(session),
        items: {
          create: (body.items ?? [])
            .map((item, index) => {
              const itemTitle = item.title?.trim();
              if (!itemTitle) return null;
              return {
                title: itemTitle,
                description: item.description?.trim() || null,
                instructions: item.instructions?.trim() || null,
                dayOfWeek: parseDayOfWeek(item.dayOfWeek),
                platforms: parsePlatforms(item.platforms),
                sortOrder: index,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null),
        },
      },
      include: {
        items: {
          include: {
            completions: {
              where: { date: { in: week.dayKeys } },
            },
          },
        },
      },
    });

    return NextResponse.json({
      checklist: toTeamDailyChecklistDto(checklist, today),
      week,
    });
  } catch (err) {
    console.error("[team/checklists] POST error:", err);
    return NextResponse.json({ error: "Failed to create checklist" }, { status: 500 });
  }
}
