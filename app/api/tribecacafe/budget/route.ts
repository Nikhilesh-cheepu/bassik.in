import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function POST(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const monthId = typeof body.monthId === "string" ? body.monthId : "";
  const type = body.type === "use" ? "use" : "add";
  const amount = Number(body.amountInr);
  const note = typeof body.note === "string" ? body.note.trim() : null;
  const entryDate = typeof body.entryDate === "string" ? body.entryDate : null;

  if (!monthId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "monthId and positive amount required" }, { status: 400 });
  }

  try {
    const row = await prisma.tribecaBudgetEntry.create({
      data: {
        monthId,
        type,
        amountInr: amount,
        note,
        entryDate,
      },
    });
    return NextResponse.json({
      entry: { ...row, amountInr: Number(row.amountInr) },
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca budget POST]", error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id")?.trim() || "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await prisma.tribecaBudgetEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
