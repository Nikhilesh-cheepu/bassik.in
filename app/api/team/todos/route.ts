import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { filterTeamTodos, sortTeamTodos, toTeamTodoDto } from "@/lib/team-todos";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filter = (req.nextUrl.searchParams.get("filter") ?? "all") as "all" | "todo" | "done";
  const ownerId = teamPersonalNoteOwnerId(session);

  try {
    const rawTodos = await prisma.teamTodoItem.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });

    const filtered = filterTeamTodos(rawTodos, filter);
    const sorted = sortTeamTodos(filtered);
    const todos = sorted.map(toTeamTodoDto);

    return NextResponse.json({ todos });
  } catch (err) {
    console.error("[team/todos] GET error:", err);
    return NextResponse.json({ error: "Failed to load todos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ownerId = teamPersonalNoteOwnerId(session);

  try {
    const body = (await req.json()) as {
      title?: string;
      description?: string;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const todo = await prisma.teamTodoItem.create({
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
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
