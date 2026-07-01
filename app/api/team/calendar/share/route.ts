import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";
import {
  calendarViewerId,
  normalizeCalendarDate,
  parseDateKeys,
  parseShareMemberIds,
  type TeamCalendarShareDto,
} from "@/lib/team-calendar";

function toShareDto(
  row: {
    id: string;
    title: string | null;
    dateKeys: unknown;
    message: string | null;
    createdBy: string;
    createdAt: Date;
    members: { memberId: string }[];
  }
): TeamCalendarShareDto {
  return {
    id: row.id,
    title: row.title,
    dateKeys: parseDateKeys(row.dateKeys),
    message: row.message,
    memberIds: row.members.map((m) => m.memberId),
    sharedBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const viewerId = calendarViewerId(session);
  const isAdmin = session.role === "admin";

  try {
    const [sent, received] = await Promise.all([
      isAdmin
        ? prisma.teamCalendarShare.findMany({
            where: { createdBy: viewerId },
            include: { members: true },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      prisma.teamCalendarShareMember.findMany({
        where: { memberId: viewerId },
        include: { share: { include: { members: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      sent: sent.map(toShareDto),
      received: received.map((r) => toShareDto(r.share)),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team calendar share GET]", error);
    return NextResponse.json({ error: "Could not load shares" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admin can share calendar dates" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dates = Array.isArray(body.dates)
    ? (body.dates as unknown[])
        .map((d) => (typeof d === "string" ? normalizeCalendarDate(d) : null))
        .filter((d): d is string => typeof d === "string" && Boolean(d))
    : [];
  const memberIds = parseShareMemberIds(body.memberIds);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : null;
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim().slice(0, 500)
      : null;

  if (!dates.length) {
    return NextResponse.json({ error: "Select at least one date" }, { status: 400 });
  }
  if (!memberIds.length) {
    return NextResponse.json({ error: "Select at least one teammate" }, { status: 400 });
  }

  const uniqueDates = [...new Set(dates)].sort();
  const viewerId = calendarViewerId(session);

  try {
    const share = await prisma.teamCalendarShare.create({
      data: {
        createdBy: viewerId,
        title,
        dateKeys: uniqueDates,
        message,
        members: {
          create: memberIds.map((memberId) => ({
            memberId,
            sharedBy: viewerId,
          })),
        },
      },
      include: { members: true },
    });
    return NextResponse.json({ share: toShareDto(share) });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[team calendar share POST]", error);
    return NextResponse.json({ error: "Could not share dates" }, { status: 500 });
  }
}
