import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTeamUserFromCookie } from "@/lib/team-auth";
import { db } from "@/lib/db";

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
    const item = await db.teamChecklistItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      dayOfWeek?: string;
    };

    const updates: {
      title?: string;
      description?: string | null;
      dayOfWeek?: string | null;
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

    if (body.dayOfWeek !== undefined) {
      updates.dayOfWeek = body.dayOfWeek.trim() || null;
    }

    const updated = await db.teamChecklistItem.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("[team/checklist-items/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update item" },
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
    const item = await db.teamChecklistItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await db.teamChecklistItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[team/checklist-items/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}
