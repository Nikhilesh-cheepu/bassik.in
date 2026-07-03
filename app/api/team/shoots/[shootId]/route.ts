import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  SHOOT_INCLUDE,
  canEditShoot,
  filterShootsForViewer,
  parseShootPayload,
  shootOwnerId,
  toTeamShootDto,
} from "@/lib/team-shoots";

type RouteCtx = { params: Promise<{ shootId: string }> };

async function loadShoot(shootId: string) {
  return prisma.teamShoot.findUnique({
    where: { id: shootId },
    include: SHOOT_INCLUDE,
  });
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shootId } = await ctx.params;
  try {
    const row = await loadShoot(shootId);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const viewerOwnerId = shootOwnerId(session);
    const [visible] = filterShootsForViewer([row], session, viewerOwnerId);
    if (!visible) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ shoot: toTeamShootDto(visible, viewerOwnerId, session) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team shoots GET id]", error);
    return NextResponse.json({ error: "Could not load shoot" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shootId } = await ctx.params;
  const row = await loadShoot(shootId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditShoot(session, row.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseShootPayload(body as Record<string, unknown>);
  if (!parsed.shootDate) {
    return NextResponse.json({ error: "Valid shoot date required" }, { status: 400 });
  }

  try {
    const updated = await prisma.teamShoot.update({
      where: { id: shootId },
      data: {
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
      shoot: toTeamShootDto(updated, shootOwnerId(session), session),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team shoots PATCH]", error);
    return NextResponse.json({ error: "Could not update shoot" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shootId } = await ctx.params;
  const row = await loadShoot(shootId);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditShoot(session, row.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.teamShoot.delete({ where: { id: shootId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team shoots DELETE]", error);
    return NextResponse.json({ error: "Could not delete shoot" }, { status: 500 });
  }
}
