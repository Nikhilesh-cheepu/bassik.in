import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getTeamFromRequest } from "@/lib/team-auth";
import { isTeamOutletId } from "@/lib/team-outlets";

export const runtime = "nodejs";

const MAX_SIZE = 25 * 1024 * 1024;

function resolveMime(file: File): string | null {
  const type = file.type?.trim();
  if (type && type !== "application/octet-stream") return type;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    pdf: "application/pdf",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return byExt[ext] ?? null;
}

const ALLOWED_PREFIXES = ["image/", "video/", "application/pdf"];

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admin can upload creatives" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const outletField = formData?.get("outletId");
  const outletId = typeof outletField === "string" ? outletField.trim() : "general";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mimeType = resolveMime(file);
  if (
    !mimeType ||
    !ALLOWED_PREFIXES.some((p) => mimeType.startsWith(p) || mimeType === "application/pdf")
  ) {
    return NextResponse.json(
      { error: `File type not allowed (${file.type || file.name}). Use image, PDF, or MP4/MOV.` },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max 25MB.` },
      { status: 400 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty — try a smaller file or different format." }, { status: 400 });
  }

  const slug = isTeamOutletId(outletId) ? outletId : "general";
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = (file.name || `creative.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const pathname = `team/creatives/${slug}/${Date.now()}-${safeName}`;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const blob = await put(pathname, bytes, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    });

    return NextResponse.json({
      url: blob.url,
      fileName: file.name,
      mimeType,
      siteSaved: true,
    });
  } catch (e) {
    console.error("[team upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
