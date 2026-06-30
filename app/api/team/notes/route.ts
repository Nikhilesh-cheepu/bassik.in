import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  parsePersonalNoteBody,
  teamPersonalNoteOwnerId,
  toTeamPersonalNoteDto,
} from "@/lib/team-personal-notes";

function notesDbErrorMessage(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  ) {
    return "Notes database is not ready yet. Redeploy to apply migrations.";
  }
  return "Could not load notes";
}

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const ownerId = teamPersonalNoteOwnerId(session);
    const rows = await prisma.teamPersonalNote.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      notes: rows.map(toTeamPersonalNoteDto),
    });
  } catch (error) {
    console.error("[team notes GET]", error);
    return NextResponse.json({ error: notesDbErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsedBody = parsePersonalNoteBody(body.body);
  if (!parsedBody) {
    return NextResponse.json({ error: "Note cannot be empty." }, { status: 400 });
  }

  try {
    const row = await prisma.teamPersonalNote.create({
      data: {
        ownerId: teamPersonalNoteOwnerId(session),
        body: parsedBody,
      },
    });

    return NextResponse.json({ note: toTeamPersonalNoteDto(row) });
  } catch (error) {
    console.error("[team notes POST]", error);
    return NextResponse.json(
      { error: notesDbErrorMessage(error).replace("load", "save") },
      { status: 500 }
    );
  }
}
