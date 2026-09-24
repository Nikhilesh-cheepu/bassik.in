import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  canEditDriveLink,
  parseDriveLinkDescription,
  parseDriveLinkTitle,
  parseDriveLinkUrl,
  toTeamDriveLinkDto,
} from "@/lib/team-drive-links";

type RouteCtx = { params: Promise<{ linkId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { linkId } = await ctx.params;
  const existing = await prisma.teamDriveLink.findUnique({ where: { id: linkId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditDriveLink(session, existing.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: { title?: string; url?: string; description?: string | null } = {};
  if ("title" in body) {
    const title = parseDriveLinkTitle(body.title);
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    data.title = title;
  }
  if ("url" in body) {
    const url = parseDriveLinkUrl(body.url);
    if (!url) return NextResponse.json({ error: "A valid link is required" }, { status: 400 });
    data.url = url;
  }
  if ("description" in body) {
    data.description = parseDriveLinkDescription(body.description);
  }

  try {
    const updated = await prisma.teamDriveLink.update({
      where: { id: linkId },
      data,
    });
    return NextResponse.json({ link: toTeamDriveLinkDto(updated, session) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team drive-links PATCH]", error);
    return NextResponse.json({ error: "Could not update Drive link" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { linkId } = await ctx.params;
  const existing = await prisma.teamDriveLink.findUnique({ where: { id: linkId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditDriveLink(session, existing.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.teamDriveLink.delete({ where: { id: linkId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team drive-links DELETE]", error);
    return NextResponse.json({ error: "Could not delete Drive link" }, { status: 500 });
  }
}
