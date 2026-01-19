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
