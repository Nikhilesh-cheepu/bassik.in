import { upload as blobClientUpload } from "@vercel/blob/client";

/** Vercel Functions reject bodies over ~4.5 MB with 413. */
export const TEAM_SERVER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

export type TeamUploadKind = "handoff" | "creative" | "reference" | "planning" | "note";

function safeSegment(value: string, fallback: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
  return cleaned || fallback;
}

function safeFilename(name: string) {
  return (name || "file.bin").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

/**
 * Upload a team file. Large payloads go browser → Vercel Blob (client upload);
 * small ones use `/api/team/upload` for simpler local/dev paths.
 */
export async function uploadTeamFile(
  file: File,
  opts: { kind: TeamUploadKind; outletId?: string }
): Promise<string> {
  if (file.size === 0) {
    throw new Error("File is empty — pick another.");
  }

  const outlet = safeSegment(opts.outletId || "general", "general");
  const safeName = safeFilename(file.name);

  if (file.size > TEAM_SERVER_UPLOAD_MAX_BYTES) {
    const folder =
      opts.kind === "handoff"
        ? "team/handoff"
        : opts.kind === "reference"
          ? "team/reference"
          : opts.kind === "planning" || opts.kind === "note"
            ? "team/planning"
            : "team/creatives";
    const pathname = `${folder}/${outlet}/${Date.now()}-${safeName}`;
    const blob = await blobClientUpload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/team/upload/blob",
      multipart: file.size > 8 * 1024 * 1024,
    });
    return blob.url;
  }

  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", opts.kind);
  if (opts.outletId) fd.set("outletId", opts.outletId);
  const res = await fetch("/api/team/upload", { method: "POST", body: fd });
  const text = await res.text();
  let data: { url?: string; error?: string } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { url?: string; error?: string };
    } catch {
      if (res.status === 413) {
        throw new Error(
          "File too large for this upload path (Vercel max ~4.5 MB). Try again."
        );
      }
      throw new Error(text.replace(/\s+/g, " ").trim().slice(0, 140) || "Upload failed");
    }
  }
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  return data.url;
}
