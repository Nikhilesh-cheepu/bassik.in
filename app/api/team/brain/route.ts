import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  isBrainKind,
  parseBrainCreate,
  teamBrainOwnerId,
  toTeamBrainItemDto,
} from "@/lib/team-brain";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ownerId = teamBrainOwnerId(session);
  const kindParam = req.nextUrl.searchParams.get("kind");
  const kind = kindParam && isBrainKind(kindParam) ? kindParam : null;
  const remindOn = req.nextUrl.searchParams.get("remindOn")?.trim() || null;
  const includeDone = req.nextUrl.searchParams.get("includeDone") === "1";

  const rows = await prisma.teamBrainItem.findMany({
    where: {
      ownerId,
      ...(kind ? { kind } : {}),
      ...(remindOn ? { kind: "reminder", remindOn } : {}),
      ...(includeDone ? {} : { done: false }),
    },
    orderBy: [{ done: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    items: rows.map(toTeamBrainItemDto),
  });
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseBrainCreate(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const ownerId = teamBrainOwnerId(session);
  const row = await prisma.teamBrainItem.create({
    data: {
      ownerId,
      kind: parsed.kind,
      body: parsed.bodyText,
      tags: parsed.tags,
      remindOn: parsed.remindOn,
      done: false,
    },
  });

  return NextResponse.json({ item: toTeamBrainItemDto(row) });
}
