/** Client-only: squeeze large photos before upload (~maxBytes cap). */

const MAX_DIMENSION = 2560;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), type, quality)
  );
}

function browserSupportsWebp(): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    return c.toDataURL("image/webp").includes("webp");
  } catch {
    return false;
  }
}

/**
 * Compress an image File to roughly under maxBytes using canvas + iterative quality/downscale.
 */
export async function compressImageToMaxBytes(
  file: File,
  maxBytes: number = 5 * 1024 * 1024
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const useWebp = browserSupportsWebp();
  const mime = useWebp ? "image/webp" : "image/jpeg";

  let w = bitmap.width;
  let h = bitmap.height;
  const maxEdge = Math.max(w, h);
  if (maxEdge > MAX_DIMENSION) {
    const s = MAX_DIMENSION / maxEdge;
    w = Math.round(w * s);
    h = Math.round(h * s);
  }

  const canvas = document.createElement("canvas");

  for (let attempt = 0; attempt < 16; attempt++) {
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const q = useWebp ? Math.max(0.45, 0.92 - attempt * 0.06) : Math.max(0.5, 0.9 - attempt * 0.05);
    const blob = await canvasToBlob(canvas, mime, q);
    if (blob && blob.size <= maxBytes) {
      bitmap.close();
      return blob;
    }
    if (Math.min(w, h) > 400) {
      w = Math.round(w * 0.88);
      h = Math.round(h * 0.88);
    }
  }

  bitmap.close();
  return file;
}

export function sanitizedFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
}
