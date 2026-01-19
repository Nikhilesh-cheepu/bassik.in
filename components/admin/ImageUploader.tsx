"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface ImageUploaderProps {
  venueId: string;
  imageType: "COVER" | "GALLERY";
  existingImages: any[];
  maxImages: number;
  aspectRatio: string;
  onUpdate: () => void;
}

export default function ImageUploader({
  venueId,
  imageType,
  existingImages,
  maxImages,
  aspectRatio,
  onUpdate,
}: ImageUploaderProps) {
  const [images, setImages] = useState(existingImages);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update images when existingImages changes (after parent reloads data)
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
      const uploadPromises = Array.from(files).map(async (file) => {
        // Convert to base64 (no aspect ratio validation)
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(uploadPromises);

      // Upload each image
      const uploadResults = await Promise.all(
        base64Images.map(async (base64) => {
          const res = await fetch("/api/admin/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, venueId }),
          });
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Upload failed: ${res.statusText}`);
          }
          return res.json();
        })
      );

      // Save images to venue
      const imageData = uploadResults.map((result, index) => ({
        url: result.url,
        order: images.length + index,
      }));

      const saveRes = await fetch(`/api/admin/venues/${venueId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: imageType,
          images: [...images.map((img, idx) => ({ url: img.url, order: idx })), ...imageData],
        }),
      });

      if (saveRes.ok) {
        setMessage({ type: "success", text: "Images uploaded successfully!" });
        // Reload images from the response or parent
        onUpdate();
      } else {
        const errorData = await saveRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save images");
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to upload images",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const res = await fetch(
        `/api/admin/venues/${venueId}/images?ids=${imageId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        setImages(images.filter((img) => img.id !== imageId));
        setMessage({ type: "success", text: "Image deleted successfully!" });
        onUpdate();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete image" });
    }
  };

  const handleReorder = async (newOrder: any[]) => {
    try {
      const res = await fetch(`/api/admin/venues/${venueId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: imageType,
          images: newOrder.map((img, idx) => ({ url: img.url, order: idx })),
        }),
      });

      if (res.ok) {
        setImages(newOrder);
        onUpdate();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to reorder images" });
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
            {imageType === "COVER"
              ? "Upload up to 3 cover images (any aspect ratio)"
              : "Upload gallery images (1:1 recommended)"}
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className="w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
        >
          {uploading ? "Uploading..." : `Upload (${images.length}/${maxImages})`}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center">
          <svg
            className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm sm:text-base text-gray-600">No images uploaded yet</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Click &quot;Upload&quot; to add images</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {images.map((image, index) => (
            <div key={image.id} className="relative group">
              <div className={`${imageType === "COVER" ? "aspect-video" : "aspect-square"} rounded-lg overflow-hidden bg-gray-100 relative`}>
                <Image
                  src={image.url}
                  alt={`${imageType} ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <button
                onClick={() => handleDelete(image.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 sm:p-2 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                aria-label="Delete image"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
