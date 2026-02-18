import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

/** Offer poster upload: Vercel Blob only. Save returned URL in Postgres (no image bytes in DB). */
export const runtime = "nodejs";
const MAX_SIZE = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const venueSlug = (formData.get("venueSlug") as string) || (formData.get("brandId") as string);
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!venueSlug || typeof venueSlug !== "string") {
      return NextResponse.json({ error: "venueSlug (or brandId) is required" }, { status: 400 });
    }
    const slug = venueSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "venue";
    if (!ALLOWED_TYPES.includes(file.type) && file.type !== "image/webp") {
      return NextResponse.json(
        { error: "Only JPG, PNG and WebP are allowed." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File must be 1MB or smaller. Use the auto-compress in admin (crop 9:16 + WebP)." },
        { status: 400 }
      );
    }

    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`;
    const pathname = `offers/${slug}/${name}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err: unknown) {
    console.error("[upload/offer]", err);
    const message =
      err instanceof Error ? err.message : "Upload failed";
    if (message.includes("BLOB_READ_WRITE_TOKEN") || message.includes("token")) {
      return NextResponse.json(
        { error: "Storage not configured. Add Vercel Blob (or set BLOB_READ_WRITE_TOKEN)." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
