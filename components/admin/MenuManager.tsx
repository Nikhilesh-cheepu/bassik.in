"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface MenuManagerProps {
  venueId: string;
  existingMenus: any[];
  onUpdate: () => void;
}

export default function MenuManager({ venueId, existingMenus, onUpdate }: MenuManagerProps) {
  const [menus, setMenus] = useState(existingMenus);
  const [editingMenu, setEditingMenu] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateMenu = () => {
    setEditingMenu({
      id: null,
      name: "",
      thumbnailUrl: "",
      images: [],
    });
  };

  const handleEditMenu = (menu: any) => {
    setEditingMenu(menu);
  };

  const handleThumbnailUpload = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, venueId }),
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  };

  const handleMenuImagesUpload = async (files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, venueId }),
      });

      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    });

    return Promise.all(uploadPromises);
  };

  const handleSaveMenu = async () => {
    if (!editingMenu.name || !editingMenu.thumbnailUrl || editingMenu.images.length === 0) {
      setMessage({ type: "error", text: "Please fill all fields and upload at least one menu image" });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const imageData = editingMenu.images.map((img: any, idx: number) => ({
        url: typeof img === "string" ? img : img.url,
        order: idx,
      }));

      const res = await fetch(`/api/admin/venues/${venueId}/menus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuId: editingMenu.id,
          name: editingMenu.name,
          thumbnailUrl: editingMenu.thumbnailUrl,
          images: imageData,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Menu saved successfully!" });
        setEditingMenu(null);
        onUpdate();
      } else {
        throw new Error("Failed to save menu");
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to save menu" });
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
        setMessage({ type: "success", text: "Menu deleted successfully!" });
        onUpdate();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete menu" });
    }
  };

  if (editingMenu) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingMenu.id ? "Edit Menu" : "Create Menu"}
          </h2>
          <button
            onClick={() => setEditingMenu(null)}
            className="text-gray-600 hover:text-gray-900"
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
              Menu Name (e.g., &quot;Food Menu&quot;, &quot;Liquor Menu&quot;)
            </label>
            <input
              type="text"
              value={editingMenu.name}
              onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Food Menu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail Image
            </label>
            {editingMenu.thumbnailUrl ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden mb-2">
                <Image
                  src={editingMenu.thumbnailUrl}
                  alt="Thumbnail"
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => setEditingMenu({ ...editingMenu, thumbnailUrl: "" })}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center w-full hover:border-orange-500 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const url = await handleThumbnailUpload(file);
                        setEditingMenu({ ...editingMenu, thumbnailUrl: url });
                      } catch (error) {
                        setMessage({ type: "error", text: "Failed to upload thumbnail" });
                      }
                    }
                  }}
                  className="hidden"
                />
                Click to upload thumbnail
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Menu Pages (Upload multiple images)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (!files) return;
                try {
                  const results = await handleMenuImagesUpload(files);
                  setEditingMenu({
                    ...editingMenu,
                    images: [...editingMenu.images, ...results.map((r) => r.url)],
                  });
                } catch (error) {
                  setMessage({ type: "error", text: "Failed to upload images" });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {editingMenu.images.map((img: string, idx: number) => (
                <div key={idx} className="relative group aspect-[3/4] rounded-lg overflow-hidden">
                  <Image
                    src={img}
                    alt={`Page ${idx + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setEditingMenu({
                        ...editingMenu,
                        images: editingMenu.images.filter((_: any, i: number) => i !== idx),
                      });
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Page {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveMenu}
            disabled={uploading}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {uploading ? "Saving..." : "Save Menu"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Menus</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage Food Menu and Liquor Menu
          </p>
        </div>
        <button
          onClick={handleCreateMenu}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          + Create Menu
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
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-600">No menus created yet</p>
          <p className="text-sm text-gray-500 mt-1">Click &quot;Create Menu&quot; to add a menu</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menus.map((menu) => (
            <div key={menu.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{menu.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditMenu(menu)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMenu(menu.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-2 relative">
                <Image
                  src={menu.thumbnailUrl}
                  alt={menu.name}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-sm text-gray-600">{menu.images?.length || 0} pages</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
