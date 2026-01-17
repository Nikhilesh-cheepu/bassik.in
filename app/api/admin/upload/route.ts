import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image, venueId } = await request.json();

    if (!image || !image.startsWith("data:image")) {
      return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
    }

    // Store base64 data URL directly in database
    // The url field in VenueImage/MenuImage can store base64 data URLs
    // This works everywhere (local, Vercel, any hosting) without filesystem access
    return NextResponse.json({ url: image });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
