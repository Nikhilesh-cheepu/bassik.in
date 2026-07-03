import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  SHOOT_INCLUDE,
  canEditShoot,
  filterShootsForViewer,
  parseShootShareMemberIds,
  shootOwnerId,
  toTeamShootDto,
} from "@/lib/team-shoots";

type RouteCtx = { params: Promise<{ shootId: string }> };

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shootId } = await ctx.params;
  const shoot = await prisma.teamShoot.findUnique({ where: { id: shootId } });
  if (!shoot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditShoot(session, shoot.ownerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const memberIds = parseShootShareMemberIds(body.memberIds);
  if (memberIds.length === 0) {
    return NextResponse.json({ error: "Select at least one teammate" }, { status: 400 });
  }

  const sharedBy = shootOwnerId(session);

  try {
    await prisma.$transaction(
      memberIds.map((memberId) =>
        prisma.teamShootShare.upsert({
          where: { shootId_memberId: { shootId, memberId } },
          create: { shootId, memberId, sharedBy },
          update: { sharedBy },
        })
      )
    );

    const updated = await prisma.teamShoot.findUnique({
      where: { id: shootId },
      include: SHOOT_INCLUDE,
    });
    const viewerOwnerId = shootOwnerId(session);
    const [visible] = filterShootsForViewer([updated!], session, viewerOwnerId);
    return NextResponse.json({ shoot: toTeamShootDto(visible!, viewerOwnerId, session) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team shoots share POST]", error);
    return NextResponse.json({ error: "Could not share shoot" }, { status: 500 });
  }
}
