import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTeamUserFromCookie } from "@/lib/team-auth";
import { db } from "@/lib/db";
import { filterTeamTodos, sortTeamTodos, toTeamTodoDto } from "@/lib/team-todos";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

export async function GET(req: Request) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = (searchParams.get("filter") ?? "all") as "all" | "todo" | "done";
  
  const ownerId = teamPersonalNoteOwnerId(user);

  try {
    const rawTodos = await db.teamTodoItem.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });

    const filtered = filterTeamTodos(rawTodos, filter);
    const sorted = sortTeamTodos(filtered);
    const todos = sorted.map(toTeamTodoDto);

    return NextResponse.json({ todos });
  } catch (err) {
    console.error("[team/todos] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load todos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getTeamUserFromCookie(await cookies());
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = teamPersonalNoteOwnerId(user);

  try {
    const body = (await req.json()) as {
      title?: string;
      description?: string;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const todo = await db.teamTodoItem.create({
      data: {
        ownerId,
        title,
        description: body.description?.trim() || null,
        status: "TODO",
      },
    });

    return NextResponse.json({ todo: toTeamTodoDto(todo) });
  } catch (err) {
    console.error("[team/todos] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
