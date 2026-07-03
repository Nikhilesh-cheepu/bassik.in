import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import { normalizeCalendarDate } from "@/lib/team-calendar";
import {
  SHOOT_INCLUDE,
  canAccessShootsTab,
  canCreateShoots,
  filterShootsForViewer,
  parseShootPayload,
  shootOwnerId,
  toTeamShootDto,
} from "@/lib/team-shoots";

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessShootsTab(session)) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const from = normalizeCalendarDate(sp.get("from")) ?? "";
  const to = normalizeCalendarDate(sp.get("to")) ?? "";
  const outletId = sp.get("outletId")?.trim() || undefined;

  try {
    const rows = await prisma.teamShoot.findMany({
      where: {
        ...(from && to ? { shootDate: { gte: from, lte: to } } : {}),
        ...(outletId ? { outletId } : {}),
      },
      include: SHOOT_INCLUDE,
      orderBy: [{ shootDate: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

    const viewerOwnerId = shootOwnerId(session);
    const filtered = filterShootsForViewer(rows, session, viewerOwnerId);
    const shoots = filtered.map((row) => toTeamShootDto(row, viewerOwnerId, session));

    return NextResponse.json({ shoots, canCreate: canCreateShoots(session) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team shoots GET]", error);
    return NextResponse.json({ error: "Could not load shoots" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateShoots(session)) {
    return NextResponse.json({ error: "Only content creators can add shoots" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseShootPayload(body as Record<string, unknown>);
  if (!parsed.shootDate) {
    return NextResponse.json({ error: "Valid shoot date required" }, { status: 400 });
  }

  try {
    const row = await prisma.teamShoot.create({
      data: {
        ownerId: shootOwnerId(session),
        shootDate: parsed.shootDate,
        outletId: parsed.outletId,
        title: parsed.title,
        shootNotes: parsed.shootNotes,
        rawFilesDriveLink: parsed.rawFilesDriveLink,
        editFilesDriveLink: parsed.editFilesDriveLink,
      },
      include: SHOOT_INCLUDE,
    });
    return NextResponse.json({
      shoot: toTeamShootDto(row, shootOwnerId(session), session),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team shoots POST]", error);
    return NextResponse.json({ error: "Could not create shoot" }, { status: 500 });
  }
}
