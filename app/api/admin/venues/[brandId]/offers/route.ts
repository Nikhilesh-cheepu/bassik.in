import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const now = () => new Date().toISOString();

// Fallback for DB that still has old VenueOffer columns (title, active, startDate, order) before migration
async function createOfferLegacy(
  venueId: string,
  imageUrl: string,
  endDate: string | null
): Promise<void> {
  const id = randomUUID();
  const ts = new Date().toISOString();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "VenueOffer" ("id", "venueId", "imageUrl", "title", "active", "startDate", "endDate", "order", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz)`,
    id,
    venueId,
    imageUrl,
    "", // title
    true, // active
    null, // startDate
    endDate,
    0, // order
    ts,
    ts
  );
}

// GET - List offers for a venue (by brandId), grouped into active and expired
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const venue = await prisma.venue.findUnique({
      where: { brandId },
      include: { offers: { orderBy: { createdAt: "desc" } } },
    });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }
    const t = now();
    const active = venue.offers.filter((o) => o.endDate == null || o.endDate > t);
    const expired = venue.offers.filter((o) => o.endDate != null && o.endDate <= t);
    return NextResponse.json({ active, expired });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : null;
    console.error("[admin offers GET]", error);
    const isMissingTable =
      typeof message === "string" &&
      (message.includes("VenueOffer") || message.includes("does not exist") || code === "P2021");
    const schemaError =
      typeof message === "string" &&
      (message.includes("title") ||
        message.includes("column") ||
        message.includes("null value") ||
        code === "P2011" ||
        code === "P2022");
    const errorMessage =
      isMissingTable || schemaError
        ? "Database schema is out of date. Run: npx prisma migrate deploy (with DATABASE_URL set)."
        : "Internal server error";
    const body: { error: string; detail?: string } = { error: errorMessage };
    if (process.env.NODE_ENV === "development" || isMissingTable || schemaError) body.detail = message;
    return NextResponse.json(body, { status: 500 });
  }
}

// POST - Create or update an offer (imageUrl required, endDate optional)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    let body: { id?: string; imageUrl?: string; endDate?: string | null } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body. Send { imageUrl, endDate? }." },
        { status: 400 }
      );
    }
    const { id, imageUrl, endDate } = body;

    const venue = await prisma.venue.findUnique({ where: { brandId } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    const data = {
      imageUrl: String(imageUrl).trim(),
      endDate: endDate != null && String(endDate).trim() ? String(endDate).trim() : null,
    };

    if (id) {
      const existing = await prisma.venueOffer.findUnique({ where: { id } });
      if (!existing || existing.venueId !== venue.id) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }
      await prisma.venueOffer.update({
        where: { id },
        data,
      });
    } else {
      try {
        await prisma.venueOffer.create({
          data: {
            venueId: venue.id,
            ...data,
          },
        });
      } catch (createErr: unknown) {
        const code = (createErr as { code?: string })?.code;
        // P2011 = null constraint violation = DB still has old schema (title NOT NULL etc.)
        if (code === "P2011") {
          await createOfferLegacy(venue.id, data.imageUrl, data.endDate);
        } else {
          throw createErr;
        }
      }
    }
    const allOffers = await prisma.venueOffer.findMany({
      where: { venueId: venue.id },
      orderBy: { createdAt: "desc" },
    });
    const t = now();
    const active = allOffers.filter((o) => o.endDate == null || o.endDate > t);
    const expired = allOffers.filter((o) => o.endDate != null && o.endDate <= t);
    return NextResponse.json({ active, expired });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; meta?: unknown };
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    const message = error instanceof Error ? (error as Error).message : String(error);
    const code = err?.code ?? null;
    console.error("[admin offers POST]", error);

    // Schema out of date: DB still has old columns (e.g. title NOT NULL) or missing new ones
    const schemaError =
      typeof message === "string" &&
      (message.includes("title") ||
        message.includes("null value") ||
        message.includes("column") && (message.includes("does not exist") || message.includes("violates")) ||
        message.includes("not-null") ||
        code === "P2011" ||
        code === "P2022");

    const isMissingTable =
      typeof message === "string" &&
      (message.includes("VenueOffer") || message.includes("does not exist") || code === "P2021");

    let errorMessage = "Internal server error";
    if (schemaError || isMissingTable) {
      errorMessage =
        "Database schema is out of date. Run: npx prisma migrate deploy (with DATABASE_URL set).";
    }

    const body: { error: string; detail?: string } = { error: errorMessage };
    if (process.env.NODE_ENV === "development" || schemaError || isMissingTable) {
      body.detail = message;
    }
    return NextResponse.json(body, { status: 500 });
  }
}

// DELETE - Remove an offer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const body = await request.json().catch(() => ({}));
    const id = body.id ?? new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Offer id is required" }, { status: 400 });
    }

    const venue = await prisma.venue.findUnique({ where: { brandId } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const existing = await prisma.venueOffer.findUnique({ where: { id: String(id) } });
    if (!existing || existing.venueId !== venue.id) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    await prisma.venueOffer.delete({
      where: { id: String(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    const message = error instanceof Error ? (error as Error).message : String(error);
    console.error("[admin offers DELETE]", error);
    const isMissingTable =
      typeof message === "string" &&
      (message.includes("VenueOffer") || message.includes("does not exist"));
    const body: { error: string; detail?: string } = {
      error: isMissingTable
        ? "Offers table not set up. Run: npx prisma migrate deploy"
        : "Internal server error",
    };
    if (process.env.NODE_ENV === "development") body.detail = message;
    return NextResponse.json(body, { status: 500 });
  }
}
