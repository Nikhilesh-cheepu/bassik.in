"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { compressImage } from "@/lib/image-compression";

interface MenuManagerProps {
  venueId: string;
  existingMenus: any[];
  onUpdate: () => void;
}

const MAX_MENU_SECTIONS = 5;

export default function MenuManager({ venueId, existingMenus, onUpdate }: MenuManagerProps) {
  const [menus, setMenus] = useState(existingMenus);
  const [editingMenu, setEditingMenu] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuImagesInputRef = useRef<HTMLInputElement>(null);

  // Update menus when existingMenus changes
  useEffect(() => {
    setMenus(existingMenus);
  }, [existingMenus]);

  const handleCreateMenu = () => {
    if (menus.length >= MAX_MENU_SECTIONS) {
      setMessage({
        type: "error",
        text: `Maximum ${MAX_MENU_SECTIONS} menu sections allowed. Please delete one before creating a new section.`,
      });
      return;
    }
    setEditingMenu({
      id: null,
      name: "",
      thumbnailUrl: "",
      images: [],
    });
    setMessage(null);
  };

  const handleEditMenu = (menu: any) => {
    setEditingMenu(menu);
  };

  const handleThumbnailUpload = async (file: File) => {
    console.log(`[MenuManager] Uploading thumbnail: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Check file size (limit to 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`File "${file.name}" is too large. Maximum size is 10MB.`);
    }

    try {
      // Compress thumbnail (smaller size for thumbnails)
      const compressedBase64 = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        maxSizeKB: 200, // Thumbnails should be smaller
      });
      
      const sizeKB = (compressedBase64.length / 1024).toFixed(2);
      console.log(`[MenuManager] Thumbnail compressed and converted (${sizeKB} KB)`);
      return compressedBase64;
    } catch (error: any) {
      console.error(`[MenuManager] Error compressing thumbnail:`, error);
      throw new Error(`Failed to compress thumbnail: ${error.message}`);
    }
  };

  const handleMenuImagesUpload = async (files: FileList) => {
    console.log(`[MenuManager] Uploading ${files.length} menu image(s)`);
    
    // Process images one at a time to avoid memory issues
    const results: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[MenuManager] Processing file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Check file size (limit to 10MB per image before compression)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`File "${file.name}" is too large. Maximum size is 10MB.`);
      }

      try {
        // Compress menu images
        const compressedBase64 = await compressImage(file, {
          maxWidth: 1600,
          maxHeight: 2400, // Menu images can be taller
          quality: 0.75,
          maxSizeKB: 400,
        });
        
        const sizeKB = (compressedBase64.length / 1024).toFixed(2);
        console.log(`[MenuManager] File ${i + 1} compressed and converted (${sizeKB} KB)`);
        results.push(compressedBase64);
      } catch (error: any) {
        console.error(`[MenuManager] Error processing file ${i + 1}:`, error);
        throw new Error(`Failed to process "${file.name}": ${error.message}`);
      }
    }
    
    console.log(`[MenuManager] All ${results.length} menu images compressed and converted`);
    return results;
  };

  const handleSaveMenu = async () => {
    if (!editingMenu.name || !editingMenu.thumbnailUrl) {
      setMessage({ type: "error", text: "Please enter a menu section name and upload a thumbnail image" });
      return;
    }
    if (editingMenu.images.length === 0) {
      setMessage({ type: "error", text: "Please upload at least one image for this menu section" });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      console.log(`[MenuManager] Saving menu section: "${editingMenu.name}" with ${editingMenu.images.length} image(s) for venue ${venueId}`);
      
      const imageData = editingMenu.images.map((img: any, idx: number) => ({
        url: typeof img === "string" ? img : img.url,
        order: idx,
      }));

      // Calculate payload size
      const payload = {
        menuId: editingMenu.id,
        name: editingMenu.name,
        thumbnailUrl: editingMenu.thumbnailUrl,
        images: imageData,
      };
      const payloadSize = JSON.stringify(payload).length;
      
      console.log(`[MenuManager] Sending menu data to API:`, {
        menuId: editingMenu.id,
        name: editingMenu.name,
        thumbnailUrl: editingMenu.thumbnailUrl.substring(0, 50) + "...",
        imageCount: imageData.length,
        payloadSize: `${(payloadSize / 1024).toFixed(2)} KB`,
      });

      // Check if payload is too large (4MB limit)
      const MAX_PAYLOAD_SIZE = 4 * 1024 * 1024;
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        throw new Error(`Menu data is too large (${(payloadSize / 1024).toFixed(2)} KB). Please reduce the number of images or their size.`);
      }

      const res = await fetch(`/api/admin/venues/${venueId}/menus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log(`[MenuManager] API response status: ${res.status}`);

      if (res.ok) {
        const result = await res.json();
        console.log(`[MenuManager] Menu saved successfully:`, result);
        setMessage({ type: "success", text: "Menu section saved successfully!" });
        setEditingMenu(null);
        await onUpdate();
      } else {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
        console.error(`[MenuManager] Save failed:`, errorData);
        throw new Error(errorData.error || `Failed to save menu section (${res.status})`);
      }
    } catch (error: any) {
      console.error(`[MenuManager] Save error:`, error);
      setMessage({ type: "error", text: error.message || "Failed to save menu. Please check the console for details." });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm("Are you sure you want to delete this menu?")) return;

    try {
      const res = await fetch(`/api/admin/venues/${venueId}/menus?menuId=${menuId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMenus(menus.filter((m) => m.id !== menuId));
        setMessage({ type: "success", text: "Menu section deleted successfully!" });
        await onUpdate();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete menu" });
    }
  };

  if (editingMenu) {
    return (
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            {editingMenu.id ? "Edit Menu Section" : "Create Menu Section"}
          </h2>
          <button
            onClick={() => {
              setEditingMenu(null);
              setMessage(null);
            }}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section Name (e.g., &quot;Food Menu&quot;, &quot;Liquor Menu&quot;)
            </label>
            <input
              type="text"
              value={editingMenu.name}
              onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Food Menu"
            />
            <p className="text-xs text-gray-500 mt-1">Give this menu section a name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail Image
            </label>
            {editingMenu.thumbnailUrl ? (
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden mb-2 border-2 border-gray-200">
                <Image
                  src={editingMenu.thumbnailUrl}
                  alt="Thumbnail"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  onClick={() => setEditingMenu({ ...editingMenu, thumbnailUrl: "" })}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Remove thumbnail"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center w-full hover:border-orange-500 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        setUploading(true);
                        const url = await handleThumbnailUpload(file);
                        setEditingMenu({ ...editingMenu, thumbnailUrl: url });
                        setMessage(null);
                      } catch (error: any) {
                        console.error(`[MenuManager] Thumbnail upload error:`, error);
                        setMessage({ type: "error", text: error.message || "Failed to upload thumbnail. Please check the console for details." });
                      } finally {
                        setUploading(false);
                      }
                    }
                  }}
                  className="hidden"
                />
                <p className="text-sm text-gray-600">Click to upload thumbnail</p>
                <p className="text-xs text-gray-500 mt-1">This image will be shown in the menu list</p>
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Menu Images (Upload multiple images)
            </label>
            <button
              onClick={() => menuImagesInputRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2 mb-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base"
            >
              + Add Images
            </button>
            <input
              ref={menuImagesInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (!files) return;
                try {
                  setUploading(true);
                  const results = await handleMenuImagesUpload(files);
                  setEditingMenu({
                    ...editingMenu,
                    images: [...editingMenu.images, ...results],
                  });
                  setMessage(null);
                } catch (error: any) {
                  setMessage({ type: "error", text: error.message || "Failed to upload images" });
                } finally {
                  setUploading(false);
                }
              }}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mb-3">Upload any number of images for this menu section</p>
            {editingMenu.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
                {editingMenu.images.map((img: string, idx: number) => (
                  <div key={idx} className="relative group aspect-[3/4] rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={img}
                      alt={`Image ${idx + 1}`}
                      fill
                      className="object-cover rounded-lg"
                      unoptimized
                    />
                    <button
                      onClick={() => {
                        setEditingMenu({
                          ...editingMenu,
                          images: editingMenu.images.filter((_: any, i: number) => i !== idx),
                        });
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Delete image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {editingMenu.images.length === 0 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-sm text-gray-600">No images uploaded yet</p>
                <p className="text-xs text-gray-500 mt-1">Click &quot;Add Images&quot; to upload menu images</p>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveMenu}
            disabled={uploading}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
          >
            {uploading ? "Saving..." : "Save Menu Section"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex-1">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Menu Sections</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Create up to {MAX_MENU_SECTIONS} menu sections (e.g., Food Menu, Liquor Menu)
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {menus.length}/{MAX_MENU_SECTIONS} sections created
          </p>
        </div>
        <button
          onClick={handleCreateMenu}
          disabled={menus.length >= MAX_MENU_SECTIONS}
          className="w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          + Create Section {menus.length >= MAX_MENU_SECTIONS ? "(Max Reached)" : ""}
        </button>
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

      {menus.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 sm:p-12 text-center">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm sm:text-base text-gray-600">No menu sections created yet</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Click &quot;Create Section&quot; to add a menu section</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menus.map((menu) => (
            <div key={menu.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate flex-1">{menu.name}</h3>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleEditMenu(menu)}
                    className="px-2 py-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    aria-label="Edit section"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMenu(menu.id)}
                    className="px-2 py-1 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    aria-label="Delete section"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-2 relative border-2 border-gray-200">
                <Image
                  src={menu.thumbnailUrl}
                  alt={menu.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-600">{menu.images?.length || 0} images</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
