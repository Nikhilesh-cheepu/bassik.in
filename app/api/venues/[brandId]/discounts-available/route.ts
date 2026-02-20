import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function formatTo12Hour(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")}${period}`;
}

function timeInWindow(slot: string, start: string | null, end: string | null): boolean {
  if (!start && !end) return true;
  if (start && slot < start) return false;
  if (end && slot >= end) return false;
  return true;
}

/**
 * GET ?date=YYYY-MM-DD&timeSlot=HH:MM&session=lunch|dinner
 * Returns discounts available for the given date, time slot, and session.
 * Slots are per-day; availability = limitPerDay - usedCount for that date.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const date = req.nextUrl.searchParams.get("date");
    const timeSlot = req.nextUrl.searchParams.get("timeSlot");
    const session = req.nextUrl.searchParams.get("session"); // "lunch" | "dinner"

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !timeSlot || !/^\d{2}:\d{2}$/.test(timeSlot)) {
      return NextResponse.json(
        { error: "date and timeSlot query params required (YYYY-MM-DD, HH:MM)" },
        { status: 400 }
      );
    }

    const venue = await prisma.venue.findUnique({ where: { brandId } });
    if (!venue) {
      return NextResponse.json({ discounts: [] });
    }

    const all = await prisma.discount.findMany({
      where: { venueId: venue.id, active: true },
    });
    const discountIds = all.map((d) => d.id);
    const usages = await prisma.discountDailyUsage.findMany({
      where: {
        discountId: { in: discountIds },
        date,
      },
    });
    const usageMap = new Map(usages.map((u) => [u.discountId, u.usedCount]));
    const sessionUpper = session === "lunch" ? "LUNCH" : session === "dinner" ? "DINNER" : null;

    const filtered = all.filter((d) => {
      const used = usageMap.get(d.id) ?? 0;
      if (used >= d.limitPerDay) return false;
      if (sessionUpper) {
        if (d.session && d.session !== "BOTH" && d.session !== sessionUpper) return false;
      }
      if (!timeInWindow(timeSlot, d.startTime, d.endTime)) return false;
      return true;
    });

    const items = filtered.map((d) => {
      const used = usageMap.get(d.id) ?? 0;
      const slotsLeft = Math.max(0, d.limitPerDay - used);
      return {
        id: d.id,
        title: d.title,
        description: d.description ?? "",
        limitPerDay: d.limitPerDay,
        slotsLeft,
        soldOut: used >= d.limitPerDay,
        startTime: d.startTime,
        endTime: d.endTime,
        timeWindowLabel: d.startTime && d.endTime
          ? `${formatTo12Hour(d.startTime)}–${formatTo12Hour(d.endTime)}`
          : null,
        session: d.session,
      };
    });

    return NextResponse.json(
      { discounts: items },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("[discounts-available GET]", error);
    return NextResponse.json({ error: "Failed to load discounts" }, { status: 500 });
  }
}
