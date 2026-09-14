import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { TRIBECA_DISCUSSION_KEY, currentYearMonth } from "@/lib/tribeca";
import { ensureTribecaMonthId } from "@/lib/tribeca-db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

/** One shared discussion notes doc for Tribeca (not per calendar month). */
async function getOrMigrateDiscussionNotes() {
  const discussionId = await ensureTribecaMonthId(TRIBECA_DISCUSSION_KEY);
  const discussion = await prisma.tribecaMonth.findUnique({
    where: { id: discussionId },
    select: { id: true, notes: true, updatedAt: true },
  });

  let notes = discussion?.notes ?? "";

  // One-time rescue: if the shared doc is empty, pull notes saved on the current month row.
  if (!notes.trim()) {
    const ym = currentYearMonth();
    const monthRow = await prisma.tribecaMonth.findUnique({
      where: { yearMonth: ym },
      select: { notes: true },
    });
    const legacy = monthRow?.notes?.trim() || "";
    if (legacy) {
      const updated = await prisma.tribecaMonth.update({
        where: { id: discussionId },
        data: { notes: legacy },
        select: { id: true, notes: true, updatedAt: true },
      });
      return updated;
    }
  }

  return {
    id: discussionId,
    notes,
    updatedAt: discussion?.updatedAt ?? null,
  };
}

export async function GET(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await getOrMigrateDiscussionNotes();
    return NextResponse.json({
      notes: row.notes ?? "",
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca discussions GET]", error);
    return NextResponse.json({ error: "Could not load discussion" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const notes = typeof body.notes === "string" ? body.notes : "";

  try {
    const discussionId = await ensureTribecaMonthId(TRIBECA_DISCUSSION_KEY);
    const row = await prisma.tribecaMonth.update({
      where: { id: discussionId },
      data: { notes },
      select: { notes: true, updatedAt: true },
    });
    return NextResponse.json({
      notes: row.notes ?? "",
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca discussions PATCH]", error);
    return NextResponse.json({ error: "Could not save discussion" }, { status: 500 });
  }
}

/** Same as PATCH — used by keepalive / sendBeacon on page leave. */
export async function POST(req: NextRequest) {
  return PATCH(req);
}
