/**
 * Compress and resize image before upload
 * Reduces file size to prevent HTTP 413 errors
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeKB?: number; // Target max size in KB
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.7, // Reduced from 0.8 for better compression
    maxSizeKB = 250, // Reduced from 500KB to 250KB for smaller payloads
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Create canvas and compress
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            // If still too large, reduce quality further
            const sizeKB = blob.size / 1024;
            if (sizeKB > maxSizeKB) {
              const newQuality = Math.max(0.1, quality * (maxSizeKB / sizeKB));
              canvas.toBlob(
                (finalBlob) => {
                  if (!finalBlob) {
                    reject(new Error("Failed to compress image"));
                    return;
                  }
                  const finalReader = new FileReader();
                  finalReader.onload = () => resolve(finalReader.result as string);
                  finalReader.onerror = () => reject(new Error("Failed to read compressed image"));
                  finalReader.readAsDataURL(finalBlob);
                },
                "image/jpeg",
                newQuality
              );
            } else {
              const blobReader = new FileReader();
              blobReader.onload = () => resolve(blobReader.result as string);
              blobReader.onerror = () => reject(new Error("Failed to read compressed image"));
              blobReader.readAsDataURL(blob);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const OFFER_MAX_SIZE_BYTES = 1024 * 1024; // 1MB
const OFFER_WEBP_QUALITY = 0.82;

/** Compress offer/event image to WebP, max 1MB. Rejects if cannot get under 1MB. */
export async function compressOfferImage(file: File): Promise<Blob> {
  const accepted = ["image/jpeg", "image/png", "image/webp"];
  if (!accepted.includes(file.type)) {
    throw new Error("Only JPG, PNG and WebP are allowed.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const tryQuality = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }
              if (blob.size <= OFFER_MAX_SIZE_BYTES) {
                resolve(blob);
                return;
              }
              if (quality <= 0.2) {
                reject(new Error("Image is too large. Use a smaller image or reduce quality."));
                return;
              }
              tryQuality(Math.max(0.2, quality - 0.15));
            },
            "image/webp",
            quality
          );
        };
        tryQuality(OFFER_WEBP_QUALITY);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

const MAX_SIZE_BYTES = 1024 * 1024; // 1MB - never reject, always optimize to under this

/** Center-crop to 9:16, resize if needed, compress to WebP. Always returns blob < 1MB. */
export async function cropTo9x16AndCompress(file: File): Promise<Blob> {
  const accepted = ["image/jpeg", "image/png", "image/webp"];
  if (!accepted.includes(file.type)) {
    throw new Error("Only JPG, PNG and WebP are allowed.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const targetRatio = 9 / 16;
        const currentRatio = w / h;
        let cropW = w;
        let cropH = h;
        let sx = 0;
        let sy = 0;
        if (currentRatio > targetRatio) {
          cropW = Math.round(h * targetRatio);
          sx = (w - cropW) / 2;
        } else {
          cropH = Math.round(w / targetRatio);
          sy = (h - cropH) / 2;
        }

        const tryDimensions = (outW: number, outH: number, quality: number) => {
          const canvas = document.createElement("canvas");
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }
              if (blob.size <= MAX_SIZE_BYTES) {
                resolve(blob);
                return;
              }
              if (quality > 0.2) {
                tryDimensions(outW, outH, Math.max(0.2, quality - 0.12));
                return;
              }
              if (outW > 300) {
                const nextW = Math.max(300, Math.round(outW * 0.6));
                const nextH = Math.round(nextW / targetRatio);
                tryDimensions(nextW, nextH, 0.75);
                return;
              }
              if (outW > 200 && quality > 0.15) {
                tryDimensions(outW, outH, 0.15);
                return;
              }
              resolve(blob);
            },
            "image/webp",
            quality
          );
        };

        const outW = Math.min(cropW, 1080);
        const outH = Math.round(outW / targetRatio);
        tryDimensions(outW, outH, 0.82);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
