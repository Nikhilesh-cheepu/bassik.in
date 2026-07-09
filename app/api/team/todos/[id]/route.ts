import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTeamUserFromCookie } from "@/lib/team-auth";
import { db } from "@/lib/db";
import { toTeamTodoDto } from "@/lib/team-todos";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";
import type { TeamAdTaskStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ownerId = teamPersonalNoteOwnerId(user);

  try {
    const todo = await db.teamTodoItem.findUnique({ where: { id } });
    if (!todo || todo.ownerId !== ownerId) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      title?: string;
      description?: string;
      status?: TeamAdTaskStatus;
    };

    const updates: {
      title?: string;
      description?: string | null;
      status?: TeamAdTaskStatus;
      completedAt?: Date | null;
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

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "DONE" && todo.status !== "DONE") {
        updates.completedAt = new Date();
      } else if (body.status === "TODO" && todo.status === "DONE") {
        updates.completedAt = null;
      }
    }

    const updated = await db.teamTodoItem.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ todo: toTeamTodoDto(updated) });
  } catch (err) {
    console.error("[team/todos/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ownerId = teamPersonalNoteOwnerId(user);

  try {
    const todo = await db.teamTodoItem.findUnique({ where: { id } });
    if (!todo || todo.ownerId !== ownerId) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    await db.teamTodoItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[team/todos/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}
