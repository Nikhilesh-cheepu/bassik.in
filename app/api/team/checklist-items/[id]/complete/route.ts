import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTeamUserFromCookie } from "@/lib/team-auth";
import { db } from "@/lib/db";
import { getTodayKey } from "@/lib/team-checklists";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const today = getTodayKey();
  const completedBy = teamPersonalNoteOwnerId(user);

  try {
    const item = await db.teamChecklistItem.findUnique({
      where: { id },
      include: {
        checklist: true,
        completions: {
          where: { date: today },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.checklist.ownerId !== completedBy && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = item.completions[0];

    if (existing) {
      await db.teamChecklistCompletion.delete({ where: { id: existing.id } });
      return NextResponse.json({ completed: false });
    } else {
      await db.teamChecklistCompletion.create({
        data: {
          itemId: id,
          completedBy,
          date: today,
        },
      });
      return NextResponse.json({ completed: true });
    }
  } catch (err) {
    console.error("[team/checklist-items/[id]/complete] POST error:", err);
    return NextResponse.json(
      { error: "Failed to toggle completion" },
      { status: 500 }
    );
  }
}
