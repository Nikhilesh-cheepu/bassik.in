import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTeamUserFromCookie } from "@/lib/team-auth";
import { db } from "@/lib/db";
import {
  getTodayKey,
  sortTeamChecklists,
  toTeamDailyChecklistDto,
} from "@/lib/team-checklists";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

export async function GET(req: Request) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const manageMemberId = searchParams.get("manageMemberId");
  
  const ownerId = manageMemberId && user.role === "admin" 
    ? manageMemberId 
    : teamPersonalNoteOwnerId(user);

  const today = getTodayKey();

  try {
    const rawChecklists = await db.teamDailyChecklist.findMany({
      where: { ownerId },
      include: {
        items: {
          include: {
            completions: {
              where: { date: today },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const sorted = sortTeamChecklists(rawChecklists);
    const checklists = sorted.map((c) => toTeamDailyChecklistDto(c, today));

    return NextResponse.json({ checklists });
  } catch (err) {
    console.error("[team/checklists] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load checklists" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      ownerId: string;
      title?: string;
      description?: string;
      items?: Array<{
        title: string;
        description?: string;
        dayOfWeek?: string;
      }>;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    if (!body.ownerId?.trim()) {
      return NextResponse.json({ error: "Owner required" }, { status: 400 });
    }

    const checklist = await db.teamDailyChecklist.create({
      data: {
        ownerId: body.ownerId,
        title,
        description: body.description?.trim() || null,
        createdBy: teamPersonalNoteOwnerId(user),
        items: {
          create: (body.items ?? []).map((item, index) => ({
            title: item.title.trim(),
            description: item.description?.trim() || null,
            dayOfWeek: item.dayOfWeek?.trim() || null,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: {
          include: {
            completions: {
              where: { date: getTodayKey() },
            },
          },
        },
      },
    });

    return NextResponse.json({
      checklist: toTeamDailyChecklistDto(checklist, getTodayKey()),
    });
  } catch (err) {
    console.error("[team/checklists] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create checklist" },
      { status: 500 }
    );
  }
}
