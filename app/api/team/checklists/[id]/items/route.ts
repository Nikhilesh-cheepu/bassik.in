import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTeamUserFromCookie } from "@/lib/team-auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const checklist = await db.teamDailyChecklist.findUnique({
      where: { id },
      include: { items: true },
    });
    
    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      dayOfWeek?: string;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const maxSortOrder = Math.max(...checklist.items.map((i) => i.sortOrder), -1);

    const item = await db.teamChecklistItem.create({
      data: {
        checklistId: id,
        title,
        description: body.description?.trim() || null,
        dayOfWeek: body.dayOfWeek?.trim() || null,
        sortOrder: maxSortOrder + 1,
      },
    });

    return NextResponse.json({ item });
  } catch (err) {
    console.error("[team/checklists/[id]/items] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 }
    );
  }
}
