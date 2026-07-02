import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getKiik69AccountsFromRequest } from "@/lib/kiik69-auth";

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
    heic: "image/heic",
    pdf: "application/pdf",
  };
  return byExt[ext] ?? null;
}

export async function POST(req: NextRequest) {
  if (!(await getKiik69AccountsFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const kind = formData?.get("kind");
  const folder = kind === "bill" ? "bills" : "files";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mimeType = resolveMime(file);
  const ok =
    mimeType?.startsWith("image/") || mimeType === "application/pdf";
  if (!ok) {
    return NextResponse.json({ error: "Use an image or PDF for bills." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Max file size is 25MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = (file.name || `bill.${ext}`).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const pathname = `kiik69/${folder}/${Date.now()}-${safeName}`;

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const blob = await put(pathname, bytes, {
      access: "public",
      contentType: mimeType ?? undefined,
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url, fileName: file.name, mimeType });
  } catch (e) {
    console.error("[kiik69 upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
