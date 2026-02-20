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
    const available = all.filter((d) => d.slotsUsed < d.totalSlots);

    const sessionUpper = session === "lunch" ? "LUNCH" : session === "dinner" ? "DINNER" : null;

    const filtered = available.filter((d) => {
      if (sessionUpper) {
        if (d.session && d.session !== "BOTH" && d.session !== sessionUpper) return false;
      }
      if (!timeInWindow(timeSlot, d.startTime, d.endTime)) return false;
      return true;
    });

    const items = filtered.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description ?? "",
      totalSlots: d.totalSlots,
      slotsUsed: d.slotsUsed,
      slotsLeft: Math.max(0, d.totalSlots - d.slotsUsed),
      soldOut: d.slotsUsed >= d.totalSlots,
      startTime: d.startTime,
      endTime: d.endTime,
      timeWindowLabel: d.startTime && d.endTime
        ? `${formatTo12Hour(d.startTime)}–${formatTo12Hour(d.endTime)}`
        : null,
      session: d.session,
    }));

    return NextResponse.json(
      { discounts: items },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch (error) {
    console.error("[discounts-available GET]", error);
    return NextResponse.json({ error: "Failed to load discounts" }, { status: 500 });
  }
}
