"use client";

import { useState, useEffect } from "react";
import ImageUploader from "./ImageUploader";
import MenuManager from "./MenuManager";

interface Admin {
  id: string;
  username: string;
  role: string;
  venuePermissions: string[];
}

interface Venue {
  id: string;
  brandId: string;
  name: string;
  shortName: string;
  address: string;
  mapUrl: string | null;
  images: any[];
  menus: any[];
}

interface VenueEditorProps {
  venue: Venue;
  admin: Admin;
  onBack: () => void;
  onSave: () => void;
}

export default function VenueEditor({ venue, admin, onBack, onSave }: VenueEditorProps) {
  const [formData, setFormData] = useState({
    mapUrl: venue.mapUrl || "",
  });
  const [activeTab, setActiveTab] = useState<"cover" | "gallery" | "menus" | "location">("cover");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: venue.brandId,
          mapUrl: formData.mapUrl,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Location saved successfully!" });
        onSave();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  const coverImages = venue.images?.filter((i) => i.type === "COVER") || [];
  const galleryImages = venue.images?.filter((i) => i.type === "GALLERY") || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{venue.shortName}</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage venue content</p>
            </div>
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] sm:top-[81px] z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide -mb-px">
            {[
              { id: "cover", label: "Cover Photos" },
              { id: "gallery", label: "Gallery" },
              { id: "menus", label: "Menus" },
              { id: "location", label: "Location" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2 sm:px-1 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Cover Photos Tab */}
        {activeTab === "cover" && (
          <ImageUploader
            venueId={venue.brandId}
            imageType="COVER"
            existingImages={coverImages}
            maxImages={3}
            aspectRatio="any"
            onUpdate={onSave}
          />
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <ImageUploader
            venueId={venue.brandId}
            imageType="GALLERY"
            existingImages={galleryImages}
            maxImages={50}
            aspectRatio="1:1"
            onUpdate={onSave}
          />
        )}

        {/* Menus Tab */}
        {activeTab === "menus" && (
          <MenuManager venueId={venue.brandId} existingMenus={venue.menus || []} onUpdate={onSave} />
        )}

        {/* Location Tab */}
        {activeTab === "location" && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Location</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Maps URL
              </label>
              <input
                type="url"
                value={formData.mapUrl}
                onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste the Google Maps share link for this venue
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Location"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
