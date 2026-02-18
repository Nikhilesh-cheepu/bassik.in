import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, OFFERS_BUCKET } from "@/lib/supabase-server";

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

    const supabase = getSupabaseServer();
    if (supabase) {
      const ext = file.type === "image/webp" ? "webp" : "webp";
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const path = `offers/${slug}/${name}`;
      const { data, error } = await supabase.storage
        .from(OFFERS_BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (error) {
        console.error("[upload/offer] Supabase storage error:", error);
        return NextResponse.json(
          { error: error.message || "Storage upload failed" },
          { status: 500 }
        );
      }
      const { data: urlData } = supabase.storage.from(OFFERS_BUCKET).getPublicUrl(data.path);
      return NextResponse.json({ url: urlData.publicUrl });
    }

    return NextResponse.json(
      { error: "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  } catch (err: unknown) {
    console.error("[upload/offer]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
