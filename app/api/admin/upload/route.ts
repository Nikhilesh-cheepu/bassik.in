import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {

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
    // Vercel serverless has ~4.5MB body limit; larger uploads get 413 before we run.
    if (error?.message?.includes("body") || error?.message?.includes("413") || error?.code === "ECONNRESET") {
      return NextResponse.json(
        { error: "File too large. Use a video URL for files over ~4MB, or use a smaller file." },
        { status: 413 }
      );
    }
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
