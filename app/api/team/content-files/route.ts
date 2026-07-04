import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  canAccessContentFiles,
  canCreateContentFiles,
  filterContentFilesForViewer,
  parseContentFileKind,
  parseContentFilePayload,
  parseEditStatus,
  toTeamContentFileDto,
} from "@/lib/team-content-files";
import { shootOwnerId } from "@/lib/team-shoots";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessContentFiles(session)) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const kind = parseContentFileKind(sp.get("kind"));
  if (!kind) return NextResponse.json({ error: "kind=raw or kind=edit required" }, { status: 400 });

  const outletId = sp.get("outletId")?.trim() || undefined;
  const editStatusRaw = sp.get("editStatus");
  const editStatus = editStatusRaw ? parseEditStatus(editStatusRaw) : undefined;

  try {
    const rows = await prisma.teamContentFile.findMany({
      where: {
        kind,
        ...(outletId ? { outletId } : {}),
        ...(kind === "EDIT" && editStatusRaw ? { editStatus } : {}),
      },
      orderBy: [{ shootDate: "desc" }, { updatedAt: "desc" }],
      take: 500,
    });

    const viewerOwnerId = shootOwnerId(session);
    const filtered = filterContentFilesForViewer(rows, session, viewerOwnerId);
    const files = filtered.map((row) => toTeamContentFileDto(row, viewerOwnerId, session));

    return NextResponse.json({ files, canCreate: canCreateContentFiles(session) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team content-files GET]", error);
    return NextResponse.json({ error: "Could not load files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateContentFiles(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseContentFilePayload(body as Record<string, unknown>);
  if (!parsed.kind) {
    return NextResponse.json({ error: "kind required (raw or edit)" }, { status: 400 });
  }

  try {
    const row = await prisma.teamContentFile.create({
      data: {
        ownerId: shootOwnerId(session),
        kind: parsed.kind,
        title: parsed.title,
        driveLink: parsed.driveLink,
        notes: parsed.notes,
        outletId: parsed.outletId,
        shootDate: parsed.shootDate,
        shootId: parsed.shootId,
        editStatus: parsed.kind === "EDIT" ? parsed.editStatus : "TO_EDIT",
      },
    });
    return NextResponse.json({
      file: toTeamContentFileDto(row, shootOwnerId(session), session),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team content-files POST]", error);
    return NextResponse.json({ error: "Could not create file entry" }, { status: 500 });
  }
}
