import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import {
  mimeFromFileUrl,
  resolveTeamDownloadFilename,
} from "@/lib/team-download";

export const runtime = "nodejs";

/** Allow only our Vercel Blob / known public creative hosts. */
function isAllowedDownloadUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com") ||
      host === "public.blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() || "download";
    return (
      decodeURIComponent(base).replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120) ||
      "download"
    );
  } catch {
    return "download";
  }
}

/**
 * Force a real download (Content-Disposition: attachment) for team creatives.
 * Browser <a href=blobUrl> often opens images/videos in a new tab instead of saving.
 */
export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = req.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!url || !isAllowedDownloadUrl(url)) {
    return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
  }

  const nameParam = req.nextUrl.searchParams.get("filename")?.trim();
  const urlFallback = filenameFromUrl(url);

  try {
    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `File fetch failed (${upstream.status})` },
        { status: 502 }
      );
    }

    const upstreamType = upstream.headers.get("content-type") || "";
    const upstreamMime = upstreamType.split(";")[0]?.trim().toLowerCase() ?? "";
    const contentType =
      upstreamMime && upstreamMime !== "application/octet-stream"
        ? upstreamType
        : (mimeFromFileUrl(url) ?? upstreamType) || "application/octet-stream";
    const finalFilename = resolveTeamDownloadFilename(
      nameParam && nameParam.length > 0 ? nameParam : urlFallback,
      url,
      contentType
    );
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`
    );
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    headers.set("Cache-Control", "private, no-store");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error("[team/download]", err);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
