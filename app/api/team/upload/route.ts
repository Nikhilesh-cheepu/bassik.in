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
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return byExt[ext] ?? null;
}

const PLANNING_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_PREFIXES = ["image/", "video/", "application/pdf"];

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const outletField = formData?.get("outletId");
  const kindField = formData?.get("kind");
  const outletId = typeof outletField === "string" ? outletField.trim() : "general";
  const isReference = kindField === "reference";
  const isPlanning = kindField === "planning";
  const isNote = kindField === "note";

  if (!isReference && !isPlanning && !isNote && session.role !== "admin" && session.role !== "poc") {
    return NextResponse.json({ error: "Only admin can upload creatives" }, { status: 403 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mimeType = resolveMime(file);
  if (isPlanning || isNote) {
    const ok =
      mimeType?.startsWith("image/") ||
      (mimeType && PLANNING_MIMES.has(mimeType)) ||
      mimeType === "application/pdf";
    if (!ok) {
      return NextResponse.json(
        { error: "Use images, PDF, Excel, Word, or CSV for note files." },
        { status: 400 }
      );
    }
  } else if (isReference) {
    if (!mimeType?.startsWith("image/")) {
      return NextResponse.json({ error: "Reference uploads must be images." }, { status: 400 });
    }
  } else if (
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
  const folder = isPlanning ? "planning" : isNote ? "notes" : isReference ? "references" : "creatives";
  const pathname = `team/${folder}/${slug}/${Date.now()}-${safeName}`;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const blob = await put(pathname, bytes, {
      access: "public",
      contentType: mimeType ?? undefined,
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
