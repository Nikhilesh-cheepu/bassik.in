import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTeamUserFromCookie } from "@/lib/team-auth";
import { db } from "@/lib/db";
import { getTodayKey, toTeamDailyChecklistDto } from "@/lib/team-checklists";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const checklist = await db.teamDailyChecklist.findUnique({ where: { id } });
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
    };

    const updates: {
      title?: string;
      description?: string | null;
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

    const updated = await db.teamDailyChecklist.update({
      where: { id },
      data: updates,
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
      checklist: toTeamDailyChecklistDto(updated, getTodayKey()),
    });
  } catch (err) {
    console.error("[team/checklists/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update checklist" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const checklist = await db.teamDailyChecklist.findUnique({ where: { id } });
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    await db.teamDailyChecklist.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[team/checklists/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete checklist" },
      { status: 500 }
    );
  }
}
