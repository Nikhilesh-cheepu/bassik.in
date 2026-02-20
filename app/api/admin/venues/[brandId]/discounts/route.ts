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
      orderBy: { createdAt: "desc" },
    });
    const items = discounts.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description ?? "",
      totalSlots: d.totalSlots,
      slotsUsed: d.slotsUsed,
      slotsLeft: Math.max(0, d.totalSlots - d.slotsUsed),
      startTime: d.startTime,
      endTime: d.endTime,
      session: d.session,
      active: d.active,
      createdAt: d.createdAt,
    }));
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[admin discounts GET]", error);
    return NextResponse.json({ error: "Failed to load discounts" }, { status: 500 });
  }
}

/** POST - Create discount */
export async function POST(
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
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const totalSlots = Math.max(1, Math.floor(Number(body.totalSlots) || 1));
    const description = typeof body.description === "string" ? body.description.trim() || null : null;
    const startTime = typeof body.startTime === "string" && /^\d{2}:\d{2}$/.test(body.startTime) ? body.startTime : null;
    const endTime = typeof body.endTime === "string" && /^\d{2}:\d{2}$/.test(body.endTime) ? body.endTime : null;
    const session = ["LUNCH", "DINNER", "BOTH"].includes(body.session) ? body.session : null;
    const active = body.active !== false;

    const discount = await prisma.discount.create({
      data: {
        venueId: venue.id,
        title,
        description,
        totalSlots,
        slotsUsed: 0,
        startTime,
        endTime,
        session: session as "LUNCH" | "DINNER" | "BOTH" | null,
        active,
      },
    });
    return NextResponse.json(discount);
  } catch (error) {
    console.error("[admin discounts POST]", error);
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
  }
}

/** PATCH - Update discount */
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
    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      updates.title = t;
    }
    if (body.description !== undefined) updates.description = typeof body.description === "string" ? body.description.trim() || null : null;
    if (body.totalSlots !== undefined) updates.totalSlots = Math.max(existing.slotsUsed, Math.max(1, Math.floor(Number(body.totalSlots) || 1)));
    if (body.startTime !== undefined) updates.startTime = typeof body.startTime === "string" && /^\d{2}:\d{2}$/.test(body.startTime) ? body.startTime : null;
    if (body.endTime !== undefined) updates.endTime = typeof body.endTime === "string" && /^\d{2}:\d{2}$/.test(body.endTime) ? body.endTime : null;
    if (body.session !== undefined) updates.session = ["LUNCH", "DINNER", "BOTH"].includes(body.session) ? body.session : null;
    if (typeof body.active === "boolean") updates.active = body.active;

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
