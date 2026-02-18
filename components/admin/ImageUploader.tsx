"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

function isBlobOrHttpUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const t = url.trim().toLowerCase();
  return t.startsWith("https://") || t.startsWith("http://");
}

interface ImageUploaderProps {
  venueId: string;
  imageType: "COVER" | "GALLERY";
  existingImages: { id: string; url: string }[];
  maxImages: number;
  aspectRatio: string;
  onUpdate: () => void;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

export default function ImageUploader({
  venueId,
  imageType,
  existingImages,
  maxImages,
  onUpdate,
}: ImageUploaderProps) {
  const [images, setImages] = useState(existingImages);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      setMessage({
        type: "error",
        text: `Maximum ${maxImages} images allowed. You can upload ${maxImages - images.length} more.`,
      });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`"${file.name}" is too large. Maximum 3MB per image.`);
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("venueSlug", venueId);
        const res = await fetch("/api/admin/upload/gallery", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Upload failed");
        }
        newUrls.push(data.url);
      }

      const existingWithValidUrls = images.filter((img) => isBlobOrHttpUrl(img.url));
      const allImages = [
        ...existingWithValidUrls.map((img, idx) => ({ url: img.url, order: idx })),
        ...newUrls.map((url, idx) => ({ url, order: existingWithValidUrls.length + idx })),
      ];

      const saveRes = await fetch(`/api/admin/venues/${venueId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: imageType, images: allImages }),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.error || `Save failed (${saveRes.status})`);
      }
      setMessage({ type: "success", text: `Uploaded ${files.length} image(s). Stored in Vercel Blob.` });
      onUpdate();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    try {
      const res = await fetch(`/api/admin/venues/${venueId}/images?ids=${imageId}`, { method: "DELETE" });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        setMessage({ type: "success", text: "Image deleted." });
        onUpdate();
      } else {
        setMessage({ type: "error", text: "Failed to delete image" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete image" });
    }
  };

  const handleReorder = async (newOrder: { id: string; url: string }[]) => {
    const valid = newOrder.filter((img) => isBlobOrHttpUrl(img.url));
    if (valid.length !== newOrder.length) {
      setMessage({ type: "error", text: "Some images have invalid URLs. Re-upload them from Admin." });
      return;
    }
    try {
      const res = await fetch(`/api/admin/venues/${venueId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: imageType,
          images: valid.map((img, idx) => ({ url: img.url, order: idx })),
        }),
      });
      if (res.ok) {
        setImages(newOrder);
        onUpdate();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error || "Failed to reorder" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to reorder" });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {imageType === "COVER" ? "Cover Photos" : "Gallery Images"}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {imageType === "GALLERY"
              ? "Upload to Vercel Blob. JPG/PNG/WebP, max 3MB each. Only Blob URLs are stored in the database."
              : "Use Events & Offers tab for hero posters."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm sm:text-base touch-manipulation"
        >
          {uploading ? "Uploading…" : `Upload (${images.length}/${maxImages})`}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center">
          <p className="text-sm sm:text-base text-gray-600">No images yet. Upload JPG/PNG/WebP (max 3MB each).</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {images.map((image, index) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                {isBlobOrHttpUrl(image.url) ? (
                  <Image
                    src={image.url}
                    alt={`Gallery ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs p-2 text-center">
                    Invalid URL — re-upload in Admin
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(image.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                aria-label="Delete image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
