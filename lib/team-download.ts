const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "text/csv": ".csv",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext.slice(1), mime])
);

const KNOWN_EXTENSIONS = Object.keys(MIME_BY_EXT);

/** Extension from blob pathname (handles Vercel random suffixes). */
export function extensionFromFileUrl(url: string): string | null {
  try {
    const base = decodeURIComponent(new URL(url).pathname.split("/").pop() || "").toLowerCase();
    for (const ext of KNOWN_EXTENSIONS) {
      if (base.includes(`.${ext}`)) return `.${ext}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function extensionFromMime(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return EXT_BY_MIME[mime] ?? null;
}

export function mimeFromFileUrl(url: string): string | null {
  const ext = extensionFromFileUrl(url)?.slice(1);
  return ext ? MIME_BY_EXT[ext] ?? null : null;
}

export function hasFileExtension(name: string): boolean {
  const ext = extensionFromFileUrl(`https://x/${name}`);
  return ext ? name.toLowerCase().endsWith(ext) : false;
}

function sanitizeDownloadName(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120) || "download";
}

/** Ensure download names keep the real file extension (mp4, mov, jpg, …). */
export function resolveTeamDownloadFilename(
  baseName: string,
  fileUrl: string,
  contentType?: string | null
): string {
  const safe = sanitizeDownloadName(baseName);
  if (hasFileExtension(safe)) return safe;
  const ext =
    extensionFromFileUrl(fileUrl) ?? extensionFromMime(contentType) ?? "";
  return `${safe}${ext}`;
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() || "download";
    return sanitizeDownloadName(decodeURIComponent(base));
  } catch {
    return "download";
  }
}

/** Same-origin proxy that forces Content-Disposition: attachment. */
export function teamDownloadHref(fileUrl: string, filename?: string): string {
  const qs = new URLSearchParams({ url: fileUrl });
  if (filename?.trim()) qs.set("filename", filename.trim());
  return `/api/team/download?${qs.toString()}`;
}

/** Trigger a browser download via the team proxy (works for large videos + mobile). */
export function downloadTeamFile(fileUrl: string, filenameBase?: string): void {
  const filename = resolveTeamDownloadFilename(
    filenameBase?.trim() || filenameFromUrl(fileUrl),
    fileUrl,
    mimeFromFileUrl(fileUrl)
  );
  const a = document.createElement("a");
  a.href = teamDownloadHref(fileUrl, filenameBase);
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Download one or many creatives (sequential so browsers don't block). */
export async function downloadTeamFiles(
  urls: string[],
  filenameBase: string
): Promise<void> {
  for (let i = 0; i < urls.length; i++) {
    const name = urls.length > 1 ? `${filenameBase}-${i + 1}` : filenameBase;
    downloadTeamFile(urls[i]!, name);
    if (i < urls.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
