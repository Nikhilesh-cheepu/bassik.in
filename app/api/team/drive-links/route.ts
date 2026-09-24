import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  canAccessDriveLinks,
  canCreateDriveLinks,
  driveLinkOwnerId,
  parseDriveLinkDescription,
  parseDriveLinkTitle,
  parseDriveLinkUrl,
  toTeamDriveLinkDto,
} from "@/lib/team-drive-links";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessDriveLinks(session)) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const rows = await prisma.teamDriveLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return NextResponse.json({
      links: rows.map((row) => toTeamDriveLinkDto(row, session)),
      canCreate: canCreateDriveLinks(session),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team drive-links GET]", error);
    return NextResponse.json({ error: "Could not load Drive links" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateDriveLinks(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = parseDriveLinkTitle(body.title);
  const url = parseDriveLinkUrl(body.url);
  const description = parseDriveLinkDescription(body.description);
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!url) return NextResponse.json({ error: "A valid link is required" }, { status: 400 });

  try {
    const row = await prisma.teamDriveLink.create({
      data: {
        ownerId: driveLinkOwnerId(session),
        title,
        url,
        description,
      },
    });
    return NextResponse.json({ link: toTeamDriveLinkDto(row, session) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team drive-links POST]", error);
    return NextResponse.json({ error: "Could not save Drive link" }, { status: 500 });
  }
}
