import { NextRequest, NextResponse } from "next/server";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { currentYearMonth } from "@/lib/tribeca";
import { ensureTribecaMonth, listTribecaYearMonths } from "@/lib/tribeca-db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yearMonth = req.nextUrl.searchParams.get("month")?.trim() || currentYearMonth();
  try {
    const { month, progress } = await ensureTribecaMonth(yearMonth);
    const months = await listTribecaYearMonths();
    const firstMonth = months[0] ?? yearMonth;
    return NextResponse.json({ month, progress, months, firstMonth });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca month GET]", error);
    return NextResponse.json({ error: "Could not load month" }, { status: 500 });
  }
}
