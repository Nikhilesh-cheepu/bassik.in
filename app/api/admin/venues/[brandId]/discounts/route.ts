import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** GET - List discounts for venue (by brandId) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const venue = await prisma.venue.findUnique({ where: { brandId } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }
    const discounts = await prisma.discount.findMany({
      where: { venueId: venue.id },
      orderBy: { createdAt: "asc" },
    });
    const items = discounts.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description ?? "",
      limitPerDay: d.limitPerDay,
      startTime: d.startTime,
      endTime: d.endTime,
    }));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[admin discounts GET]", error);
    return NextResponse.json({ error: "Failed to load discounts" }, { status: 500 });
  }
}

/** PATCH - Update discount (time window + slots per day only) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const venue = await prisma.venue.findUnique({ where: { brandId } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "Discount id is required" }, { status: 400 });
    }
    const existing = await prisma.discount.findFirst({
      where: { id, venueId: venue.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.limitPerDay !== undefined) {
      const limit = Math.max(1, Math.floor(Number(body.limitPerDay) || 1));
      updates.limitPerDay = limit;
    }
    if (body.startTime !== undefined) {
      updates.startTime = typeof body.startTime === "string" && /^\d{2}:\d{2}$/.test(body.startTime)
        ? body.startTime
        : null;
    }
    if (body.endTime !== undefined) {
      updates.endTime = typeof body.endTime === "string" && /^\d{2}:\d{2}$/.test(body.endTime)
        ? body.endTime
        : null;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existing);
    }
    const st = (updates.startTime ?? existing.startTime) as string | null;
    const et = (updates.endTime ?? existing.endTime) as string | null;
    if (st && et && et <= st) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const discount = await prisma.discount.update({
      where: { id },
      data: updates as Parameters<typeof prisma.discount.update>[0]["data"],
    });
    return NextResponse.json(discount);
  } catch (error) {
    console.error("[admin discounts PATCH]", error);
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
  }
}
