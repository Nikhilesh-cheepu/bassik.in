import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    // Check if we're on Vercel (read-only filesystem)
    const isVercel = process.env.VERCEL === "1";
    
    if (isVercel) {
      // For Vercel, store base64 data URL directly in database
      // The url field in VenueImage can store base64 data URLs
      // Note: This works but base64 images are larger than file URLs
      // For production, consider using Vercel Blob Storage or AWS S3
      return NextResponse.json({ url: image });
    }

    // Extract base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}-${randomStr}.jpg`;

    // Create venue-specific folder structure
    const venueFolder = venueId || "default";
    const uploadsDir = join(process.cwd(), "public", "uploads", venueFolder);
    
    try {
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Save file in venue-specific folder
      const filepath = join(uploadsDir, filename);
      await writeFile(filepath, buffer);

      // Return public URL with venue folder
      const url = `/uploads/${venueFolder}/${filename}`;

      return NextResponse.json({ url });
    } catch (fsError: any) {
      console.error("File system error:", fsError);
      // If filesystem write fails, return a more descriptive error
      return NextResponse.json(
        { 
          error: `File system error: ${fsError.message || "Unable to write file. Check server permissions or use cloud storage."}`,
          code: fsError.code
        },
        { status: 500 }
      );
    }
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
