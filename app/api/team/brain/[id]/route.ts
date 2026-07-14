import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  normalizeBrainDate,
  normalizeBrainTags,
  teamBrainOwnerId,
  toTeamBrainItemDto,
} from "@/lib/team-brain";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const ownerId = teamBrainOwnerId(session);
  const existing = await prisma.teamBrainItem.findFirst({ where: { id, ownerId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: {
    body?: string;
    tags?: string[];
    done?: boolean;
    remindOn?: string | null;
  } = {};

  if (typeof body.body === "string") {
    const text = body.body.trim();
    if (!text) return NextResponse.json({ error: "Body required" }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Too long" }, { status: 400 });
    data.body = text;
  }
  if (body.tags !== undefined) data.tags = normalizeBrainTags(body.tags);
  if (typeof body.done === "boolean") data.done = body.done;
  if (body.remindOn !== undefined) {
    data.remindOn =
      body.remindOn === null
        ? null
        : normalizeBrainDate(typeof body.remindOn === "string" ? body.remindOn : null);
  }

  const row = await prisma.teamBrainItem.update({
    where: { id },
    data,
  });

  return NextResponse.json({ item: toTeamBrainItemDto(row) });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await getTeamFromRequest(_req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const ownerId = teamBrainOwnerId(session);
  const existing = await prisma.teamBrainItem.findFirst({ where: { id, ownerId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.teamBrainItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
