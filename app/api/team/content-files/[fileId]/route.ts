import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  canEditContentFile,
  parseContentFilePayload,
  parseEditStatus,
  toTeamContentFileDto,
} from "@/lib/team-content-files";
import { shootOwnerId } from "@/lib/team-shoots";

type RouteCtx = { params: Promise<{ fileId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await ctx.params;
  const existing = await prisma.teamContentFile.findUnique({ where: { id: fileId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditContentFile(session, existing.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseContentFilePayload({ ...body, kind: existing.kind });

  const data: {
    title?: string | null;
    driveLink?: string | null;
    notes?: string | null;
    outletId?: string | null;
    shootDate?: string | null;
    shootId?: string | null;
    editStatus?: ReturnType<typeof parseEditStatus>;
  } = {};

  if ("title" in body) data.title = parsed.title;
  if ("notes" in body) data.notes = parsed.notes;
  if ("driveLink" in body) data.driveLink = parsed.driveLink;
  if ("outletId" in body) data.outletId = parsed.outletId;
  if ("shootDate" in body) data.shootDate = parsed.shootDate;
  if ("shootId" in body) data.shootId = parsed.shootId;
  if ("editStatus" in body && existing.kind === "EDIT") {
    data.editStatus = parseEditStatus(body.editStatus);
  }

  try {
    const updated = await prisma.teamContentFile.update({
      where: { id: fileId },
      data,
    });
    return NextResponse.json({
      file: toTeamContentFileDto(updated, shootOwnerId(session), session),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team content-files PATCH]", error);
    return NextResponse.json({ error: "Could not update file entry" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await ctx.params;
  const existing = await prisma.teamContentFile.findUnique({ where: { id: fileId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditContentFile(session, existing.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.teamContentFile.delete({ where: { id: fileId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team content-files DELETE]", error);
    return NextResponse.json({ error: "Could not delete file entry" }, { status: 500 });
  }
}
