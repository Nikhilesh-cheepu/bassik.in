import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import {
  SHOOT_CATEGORIES,
  EVENT_CATEGORIES,
  defaultStageForKind,
  nextStageForKind,
  stagesForKind,
  isStageBackward,
  TRIBECA_STAGE_BACK_PASSWORD,
  yearMonthFromDateKey,
  type CalendarKind,
} from "@/lib/tribeca";
import { ensureTribecaMonthId } from "@/lib/tribeca-db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

const KINDS = new Set(["shoot", "event", "other"]);
const SHOOT_IDS = new Set<string>(SHOOT_CATEGORIES.map((c) => c.id));
const EVENT_IDS = new Set<string>(EVENT_CATEGORIES.map((c) => c.id));

function resolveCategory(kind: string, rawCat: unknown): string | null | undefined {
  if (rawCat === undefined) return undefined;
  if (rawCat === null || rawCat === "") return null;
  if (typeof rawCat !== "string") return undefined;
  if (kind === "shoot" && SHOOT_IDS.has(rawCat)) return rawCat;
  if (kind === "event" && EVENT_IDS.has(rawCat)) return rawCat;
  if (kind === "other") return null;
  return undefined;
}

export async function POST(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : "";
  const kind = (typeof body.kind === "string" ? body.kind : "") as CalendarKind;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const rawCat = typeof body.category === "string" ? body.category : null;
  const notes = typeof body.notes === "string" ? body.notes : null;

  if (!date || !title || !KINDS.has(kind)) {
    return NextResponse.json({ error: "date, kind, title required" }, { status: 400 });
  }

  let category: string | null = null;
  if (kind === "shoot") {
    if (!rawCat || !SHOOT_IDS.has(rawCat)) {
      return NextResponse.json({ error: "Shoot needs a category" }, { status: 400 });
    }
    category = rawCat;
  } else if (kind === "event") {
    if (!rawCat || !EVENT_IDS.has(rawCat)) {
      return NextResponse.json({ error: "Event needs a type (live / workshop)" }, { status: 400 });
    }
    category = rawCat;
  }

  try {
    const ym = yearMonthFromDateKey(date);
    const monthId = await ensureTribecaMonthId(ym);
    const row = await prisma.tribecaCalendarItem.create({
      data: {
        monthId,
        date,
        kind,
        title,
        category,
        stage: defaultStageForKind(kind),
        notes,
      },
    });
    return NextResponse.json({ item: row, yearMonth: ym });
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
    } else if (typeof body.stage === "string") {
      const kind = current.kind as CalendarKind;
      const allowed = stagesForKind(kind);
      if (!allowed.includes(body.stage)) {
        return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
      }
      if (isStageBackward(kind, current.stage, body.stage)) {
        const pass =
          typeof body.stageBackPassword === "string" ? body.stageBackPassword.trim() : "";
        if (pass !== TRIBECA_STAGE_BACK_PASSWORD) {
          return NextResponse.json(
            { error: "Password required to move stage back" },
            { status: 403 }
          );
        }
      }
      stage = body.stage;
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : undefined;
    const category = resolveCategory(current.kind, body.category);
    const nextDate =
      typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())
        ? body.date.trim()
        : undefined;

    let monthId: string | undefined;
    if (nextDate && nextDate !== current.date) {
      monthId = await ensureTribecaMonthId(yearMonthFromDateKey(nextDate));
    }

    const row = await prisma.tribecaCalendarItem.update({
      where: { id },
      data: {
        stage,
        ...(title !== undefined ? { title } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
        ...(nextDate ? { date: nextDate } : {}),
        ...(monthId ? { monthId } : {}),
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
