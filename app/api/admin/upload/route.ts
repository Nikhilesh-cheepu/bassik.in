import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Legacy upload route. Image/video storage is now Vercel Blob only.
 * - Offer posters: POST /api/admin/upload/offer (multipart file + venueSlug)
 * - Gallery: POST /api/admin/upload/gallery (multipart file + venueSlug)
 * - Menus: POST /api/admin/upload/menu (multipart file + venueSlug)
 * Do NOT store base64 or raw bytes in PostgreSQL.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { image, video } = body;

  if (video && typeof video === "string" && video.startsWith("data:video/")) {
    return NextResponse.json(
      { error: "Video upload is deprecated. Use a public video URL in your content instead." },
      { status: 400 }
    );
  }

  if (image || video) {
    return NextResponse.json(
      {
        error:
          "Image/video upload here is deprecated. Use Vercel Blob: /api/admin/upload/offer, /api/admin/upload/gallery, or /api/admin/upload/menu with multipart file + venueSlug.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "No image or video data" }, { status: 400 });
}
