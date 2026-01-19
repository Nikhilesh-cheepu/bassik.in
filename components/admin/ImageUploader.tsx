"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { compressImage } from "@/lib/image-compression";

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
      console.log(`[ImageUploader] Starting upload: ${files.length} file(s) for venue ${venueId}, type ${imageType}`);
      
      // Compress and convert files to base64 (one at a time to avoid memory issues)
      const base64Images: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[ImageUploader] Processing file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Check file size (limit to 10MB per image before compression)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        }

        try {
          // Compress image before converting to base64
          const compressedBase64 = await compressImage(file, {
            maxWidth: imageType === "COVER" ? 1920 : 1200,
            maxHeight: imageType === "COVER" ? 1080 : 1200,
            quality: 0.7, // Slightly more aggressive
            maxSizeKB: 300, // Reduced from 400KB to 300KB
          });
          
          const sizeKB = (compressedBase64.length / 1024).toFixed(2);
          console.log(`[ImageUploader] File ${i + 1} compressed and converted (${sizeKB} KB)`);
          base64Images.push(compressedBase64);
        } catch (error: any) {
          console.error(`[ImageUploader] Error processing file ${i + 1}:`, error);
          throw new Error(`Failed to process "${file.name}": ${error.message}`);
        }
      }
      console.log(`[ImageUploader] All ${base64Images.length} files converted to base64`);

      // Save images directly to venue (base64 is stored directly in database)
      const imageData = base64Images.map((base64, index) => ({
        url: base64,
        order: images.length + index,
      }));

      // Calculate total payload size
      const allImages = [...images.map((img, idx) => ({ url: img.url, order: idx })), ...imageData];
      const payloadSize = JSON.stringify({ type: imageType, images: allImages }).length;
      console.log(`[ImageUploader] Sending ${imageData.length} new images + ${images.length} existing images to API (payload: ${(payloadSize / 1024).toFixed(2)} KB)`);
      
      // If payload is too large, upload in batches
      const MAX_PAYLOAD_SIZE = 4 * 1024 * 1024; // 4MB limit
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        console.log(`[ImageUploader] Payload too large (${(payloadSize / 1024).toFixed(2)} KB), uploading in batches`);
        
        // Upload existing images first, then new images in batches
        const batchSize = Math.max(1, Math.floor((MAX_PAYLOAD_SIZE * 0.8) / (base64Images[0]?.length || 1)));
        console.log(`[ImageUploader] Batch size: ${batchSize} images per request`);
        
        // First, save existing images
        if (images.length > 0) {
          const existingRes = await fetch(`/api/admin/venues/${venueId}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: imageType,
              images: images.map((img, idx) => ({ url: img.url, order: idx })),
            }),
          });
          
          if (!existingRes.ok) {
            const errorData = await existingRes.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to save existing images (${existingRes.status})`);
          }
        }
        
        // Then upload new images in batches
        for (let i = 0; i < imageData.length; i += batchSize) {
          const batch = imageData.slice(i, i + batchSize);
          const batchOrder = images.length + i;
          
          const batchRes = await fetch(`/api/admin/venues/${venueId}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: imageType,
              images: batch.map((img, idx) => ({ ...img, order: batchOrder + idx })),
            }),
          });
          
          if (!batchRes.ok) {
            const errorData = await batchRes.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to upload batch (${batchRes.status})`);
          }
          
          console.log(`[ImageUploader] Batch ${Math.floor(i / batchSize) + 1} uploaded (${batch.length} images)`);
        }
        
        setMessage({ type: "success", text: `Successfully uploaded ${files.length} image(s)!` });
        onUpdate();
        return;
      }
      
      // Normal upload if payload is small enough
      const saveRes = await fetch(`/api/admin/venues/${venueId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: imageType,
          images: allImages,
        }),
      });

      console.log(`[ImageUploader] API response status: ${saveRes.status}`);

      if (saveRes.ok) {
        const result = await saveRes.json();
        console.log(`[ImageUploader] Upload successful:`, result);
        setMessage({ type: "success", text: `Successfully uploaded ${files.length} image(s)!` });
        // Reload images from the response or parent
        onUpdate();
      } else {
        const errorData = await saveRes.json().catch(() => ({ error: `HTTP ${saveRes.status}: ${saveRes.statusText}` }));
        console.error(`[ImageUploader] Upload failed:`, errorData);
        throw new Error(errorData.error || `Failed to save images (${saveRes.status})`);
      }
    } catch (error: any) {
      console.error(`[ImageUploader] Upload error:`, error);
      setMessage({
        type: "error",
        text: error.message || "Failed to upload images. Please check the console for details.",
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
