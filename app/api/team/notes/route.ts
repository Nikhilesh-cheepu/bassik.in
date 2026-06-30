import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  parsePersonalNoteBody,
  teamPersonalNoteOwnerId,
  toTeamPersonalNoteDto,
} from "@/lib/team-personal-notes";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ownerId = teamPersonalNoteOwnerId(session);
  const rows = await prisma.teamPersonalNote.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    notes: rows.map(toTeamPersonalNoteDto),
  });
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

  const row = await prisma.teamPersonalNote.create({
    data: {
      ownerId: teamPersonalNoteOwnerId(session),
      body: parsedBody,
    },
  });

  return NextResponse.json({ note: toTeamPersonalNoteDto(row) });
}
