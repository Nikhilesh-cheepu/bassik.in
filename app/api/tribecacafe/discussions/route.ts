import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { currentYearMonth } from "@/lib/tribeca";
import { ensureTribecaMonthId } from "@/lib/tribeca-db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function PATCH(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const yearMonth =
    typeof body.yearMonth === "string" && body.yearMonth.trim()
      ? body.yearMonth.trim()
      : currentYearMonth();
  const notes = typeof body.notes === "string" ? body.notes : null;

  try {
    const monthId = await ensureTribecaMonthId(yearMonth);
    const month = await prisma.tribecaMonth.update({
      where: { id: monthId },
      data: { notes },
      select: { id: true, yearMonth: true, notes: true },
    });
    return NextResponse.json({ month });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca discussions PATCH]", error);
    return NextResponse.json({ error: "Could not save discussion" }, { status: 500 });
  }
}
