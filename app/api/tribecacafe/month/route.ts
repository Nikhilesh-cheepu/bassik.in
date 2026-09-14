import { NextRequest, NextResponse } from "next/server";
import { getTribecaFromRequest } from "@/lib/tribeca-auth";
import { addDaysToDateKey, currentYearMonth, toDateKey } from "@/lib/tribeca";
import { ensureTribecaMonth, listTribecaCalendarInRange } from "@/lib/tribeca-db";
import { prismaSchemaErrorResponse } from "@/lib/prisma-schema-error";

export async function GET(req: NextRequest) {
  if (!(await getTribecaFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yearMonth = req.nextUrl.searchParams.get("month")?.trim() || currentYearMonth();
  const from =
    req.nextUrl.searchParams.get("from")?.trim() || addDaysToDateKey(toDateKey(), -45);
  const to = req.nextUrl.searchParams.get("to")?.trim() || addDaysToDateKey(toDateKey(), 90);

  try {
    const [{ month, shootProgress, budget }, rangeItems] = await Promise.all([
      ensureTribecaMonth(yearMonth),
      listTribecaCalendarInRange(from, to),
    ]);

    return NextResponse.json({
      month: {
        id: month.id,
        yearMonth: month.yearMonth,
        notes: month.notes,
        setupItems: month.setupItems,
        calendarItems: month.calendarItems,
        budgetEntries: month.budgetEntries.map((e) => ({
          ...e,
          amountInr: Number(e.amountInr),
        })),
      },
      rangeItems: rangeItems.map((i) => ({
        id: i.id,
        date: i.date,
        kind: i.kind,
        title: i.title,
        category: i.category,
        stage: i.stage,
        notes: i.notes,
      })),
      shootProgress,
      budget,
      today: toDateKey(),
    });
  } catch (error) {
    const schema = prismaSchemaErrorResponse(error);
    if (schema) return schema;
    console.error("[tribeca month GET]", error);
    return NextResponse.json({ error: "Could not load month" }, { status: 500 });
  }
}
