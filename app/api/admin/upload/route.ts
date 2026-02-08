import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const user = await currentUser();
    const role = user?.publicMetadata?.role as string;
    if (role !== "admin" && role !== "main_admin") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { image, video } = body;

    // Video upload: accept data:video/* (e.g. MP4, WebM) for cover video
    if (video && typeof video === "string" && video.startsWith("data:video/")) {
      const maxVideoSize = 80 * 1024 * 1024; // 80MB for base64
      if (video.length > maxVideoSize) {
        return NextResponse.json({ error: "Video too large. Maximum size is 80MB." }, { status: 400 });
      }
      return NextResponse.json({ url: video });
    }

    // Image upload
    if (!image || !image.startsWith("data:image")) {
      return NextResponse.json({ error: "Invalid image or video data" }, { status: 400 });
    }

    // Store base64 data URL directly in database
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
