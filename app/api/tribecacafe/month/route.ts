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
    const { month, shootProgress, budget } = await ensureTribecaMonth(yearMonth);
    const months = await listTribecaYearMonths();
    return NextResponse.json({
      month: {
        id: month.id,
        yearMonth: month.yearMonth,
        setupItems: month.setupItems,
        calendarItems: month.calendarItems,
        budgetEntries: month.budgetEntries.map((e) => ({
          ...e,
          amountInr: Number(e.amountInr),
        })),
      },
      shootProgress,
      budget,
      months: months.length ? months : [yearMonth],
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca month GET]", error);
    return NextResponse.json({ error: "Could not load month" }, { status: 500 });
  }
}
