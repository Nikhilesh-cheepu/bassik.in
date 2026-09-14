import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { FLYER_STATUSES, nextFlyerStatus } from "@/lib/tribeca";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function POST(req: NextRequest) {
  const session = await getTribecaFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "bassik") {
    return NextResponse.json({ error: "Only Bassik can add events" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const monthId = typeof body.monthId === "string" ? body.monthId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const type = body.type === "live_music" ? "live_music" : "workshop";
  const eventDate = typeof body.eventDate === "string" ? body.eventDate : null;
  const notes = typeof body.notes === "string" ? body.notes : null;
  if (!monthId || !title) {
    return NextResponse.json({ error: "monthId and title required" }, { status: 400 });
  }

  try {
    const row = await prisma.tribecaEvent.create({
      data: { monthId, title, type, eventDate, notes },
    });
    return NextResponse.json({ event: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca event POST]", error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getTribecaFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "bassik") {
    return NextResponse.json({ error: "Only Bassik can update events" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    let flyerStatus = typeof body.flyerStatus === "string" ? body.flyerStatus : "";
    if (body.advance === true) {
      const current = await prisma.tribecaEvent.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
      flyerStatus = nextFlyerStatus(current.flyerStatus);
    }
    if (flyerStatus && !FLYER_STATUSES.includes(flyerStatus as (typeof FLYER_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid flyer status" }, { status: 400 });
    }

    const row = await prisma.tribecaEvent.update({
      where: { id },
      data: {
        ...(flyerStatus ? { flyerStatus } : {}),
        ...(typeof body.title === "string" ? { title: body.title } : {}),
        ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
        ...(typeof body.eventDate === "string" ? { eventDate: body.eventDate } : {}),
      },
    });
    return NextResponse.json({ event: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca event PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
