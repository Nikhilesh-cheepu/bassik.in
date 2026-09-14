import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import {
  SHOOT_CATEGORIES,
  defaultStageForKind,
  nextStageForKind,
  type CalendarKind,
} from "@/lib/tribeca";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

const KINDS = new Set(["shoot", "event", "other"]);
const CATEGORY_IDS = new Set(SHOOT_CATEGORIES.map((c) => c.id));

export async function POST(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const monthId = typeof body.monthId === "string" ? body.monthId : "";
  const date = typeof body.date === "string" ? body.date : "";
  const kind = (typeof body.kind === "string" ? body.kind : "") as CalendarKind;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category =
    typeof body.category === "string" && CATEGORY_IDS.has(body.category) ? body.category : null;
  const notes = typeof body.notes === "string" ? body.notes : null;

  if (!monthId || !date || !title || !KINDS.has(kind)) {
    return NextResponse.json({ error: "monthId, date, kind, title required" }, { status: 400 });
  }
  if (kind === "shoot" && !category) {
    return NextResponse.json({ error: "Shoot needs a category" }, { status: 400 });
  }

  try {
    const row = await prisma.tribecaCalendarItem.create({
      data: {
        monthId,
        date,
        kind,
        title,
        category: kind === "shoot" ? category : null,
        stage: defaultStageForKind(kind),
        notes,
      },
    });
    return NextResponse.json({ item: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca calendar POST]", error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const current = await prisma.tribecaCalendarItem.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let stage = typeof body.stage === "string" ? body.stage : current.stage;
    if (body.advance === true) {
      stage = nextStageForKind(current.kind as CalendarKind, current.stage);
    }

    const row = await prisma.tribecaCalendarItem.update({
      where: { id },
      data: {
        stage,
        ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
        ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
      },
    });
    return NextResponse.json({ item: row });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca calendar PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id")?.trim() || "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await prisma.tribecaCalendarItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
