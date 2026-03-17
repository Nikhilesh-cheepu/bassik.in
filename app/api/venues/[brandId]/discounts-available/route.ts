import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDiscountsForBrand } from "@/lib/reservation-discounts";

export const runtime = "nodejs";

function timeInWindow(slot: string, start: string | null, end: string | null): boolean {
  if (!start && !end) return true;
  if (start && slot < start) return false;
  if (end && slot >= end) return false;
  return true;
}

/**
 * GET ?date=YYYY-MM-DD&timeSlot=HH:MM
 * Returns discounts: DB first (with slots, time window), fallback to static.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  let timeSlot: string | null = null;
  const date = req.nextUrl.searchParams.get("date");
  timeSlot = req.nextUrl.searchParams.get("timeSlot");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !timeSlot || !/^\d{2}:\d{2}$/.test(timeSlot)) {
    return NextResponse.json({ discounts: [] });
  }

  // Temporarily run in "static-only" mode so we don't depend on
  // the Discount tables existing in the production database.
  return fallbackStatic(brandId, timeSlot);
}

function format12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")}${period}`;
}

function fallbackStatic(brandId: string, timeSlot?: string | null) {
  const list = getDiscountsForBrand(brandId);
  const timeForFilter =
    timeSlot && /^\d{2}:\d{2}$/.test(timeSlot) ? timeSlot : null;
  const filteredList =
    timeForFilter == null
      ? list
      : list.filter((d) =>
          timeInWindow(
            timeForFilter,
            d.startTime ?? null,
            d.endTime ?? null
          )
        );
  const discounts = filteredList.map((d) => ({
    id: d.id,
    title: d.label,
    description: d.description ?? "",
    slotsLeft: 999,
    soldOut: false,
    hideSlotsLeft: d.hideSlotsLeft ?? false,
    timeWindowLabel:
      d.startTime && d.endTime ? `${format12(d.startTime)}–${format12(d.endTime)}` : null,
  }));
  return NextResponse.json(
    { discounts },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
