"use client";

import { useState, useEffect } from "react";
import ImageUploader from "./ImageUploader";
import MenuManager from "./MenuManager";
import OffersManager from "./OffersManager";

interface Admin {
  id: string;
  username: string;
  role: string;
  venuePermissions: string[];
}

type VenueContact = { phone: string; label?: string };

type VenueOffer = {
  id: string;
  imageUrl: string;
  endDate: string | null;
  createdAt?: string;
};

interface Venue {
  id: string;
  brandId: string;
  name: string;
  shortName: string;
  address: string;
  mapUrl: string | null;
  contactPhone?: string | null;
  contactNumbers?: VenueContact[] | null;
  images: any[];
  menus: any[];
  offers?: VenueOffer[];
}

interface VenueEditorProps {
  venue: Venue;
  admin: Admin | null;
  onBack: () => void;
  onSave: () => void;
}

export default function VenueEditor({ venue, admin, onBack, onSave }: VenueEditorProps) {
  const [currentVenue, setCurrentVenue] = useState(venue);
  const [formData, setFormData] = useState({
    mapUrl: venue.mapUrl || "",
    contactPhone: (venue.contactPhone ?? "").toString(),
    contactNumbers: (venue.contactNumbers && Array.isArray(venue.contactNumbers)
      ? venue.contactNumbers
      : venue.contactPhone
        ? [{ phone: String(venue.contactPhone), label: "Contact" }]
        : []) as VenueContact[],
  });
  const [activeTab, setActiveTab] = useState<"offers" | "gallery" | "menus" | "location" | "contact">("offers");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Update currentVenue when venue prop changes (after onSave refreshes data)
  useEffect(() => {
    setCurrentVenue(venue);
    setFormData({
      mapUrl: venue.mapUrl || "",
      contactPhone: (venue.contactPhone ?? "").toString(),
      contactNumbers: (venue.contactNumbers && Array.isArray(venue.contactNumbers)
        ? venue.contactNumbers
        : venue.contactPhone
          ? [{ phone: String(venue.contactPhone), label: "Contact" }]
          : []) as VenueContact[],
    });
  }, [venue]);

  const handleSave = async (payload?: { mapUrl?: string; contactPhone?: string; contactNumbers?: VenueContact[] }) => {
    setSaving(true);
    setMessage(null);
    const dataToSend = payload ?? {
      mapUrl: formData.mapUrl,
      contactPhone: formData.contactPhone || null,
      contactNumbers: formData.contactNumbers,
    };

    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: currentVenue.brandId,
          ...(currentVenue.id ? {} : { name: currentVenue.name, shortName: currentVenue.shortName, address: currentVenue.address || "Address to be updated" }),
          ...(dataToSend.mapUrl !== undefined && { mapUrl: dataToSend.mapUrl }),
          ...(dataToSend.contactPhone !== undefined && { contactPhone: dataToSend.contactPhone || "" }),
          ...(dataToSend.contactNumbers !== undefined && { contactNumbers: dataToSend.contactNumbers }),
        }),
      });

      if (res.ok) {
        const msg = payload?.contactNumbers !== undefined || payload?.contactPhone !== undefined ? "Contact numbers saved!" : "Location saved successfully!";
        setMessage({ type: "success", text: msg });
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

  const handleSaveContacts = () => handleSave({ contactNumbers: formData.contactNumbers });

  const addContact = () => {
    setFormData((prev) => ({ ...prev, contactNumbers: [...prev.contactNumbers, { phone: "", label: "" }] }));
  };

  const updateContact = (index: number, field: "phone" | "label", value: string) => {
    setFormData((prev) => {
      const next = [...prev.contactNumbers];
      next[index] = { ...next[index], [field]: field === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value };
      return { ...prev, contactNumbers: next };
    });
  };

  const removeContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contactNumbers: prev.contactNumbers.filter((_, i) => i !== index),
    }));
  };

  const galleryImages = currentVenue.images?.filter((i) => i.type === "GALLERY") || [];
  const rawOffers = (currentVenue.offers ?? []) as VenueOffer[];
  const nowIso = new Date().toISOString();
  const venueOffers = {
    active: rawOffers.filter((o) => o.endDate == null || o.endDate > nowIso),
    expired: rawOffers.filter((o) => o.endDate != null && o.endDate <= nowIso),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{currentVenue.shortName}</h1>
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
              { id: "offers", label: "Events & Offers" },
              { id: "gallery", label: "Gallery" },
              { id: "menus", label: "Menus" },
              { id: "location", label: "Location" },
              { id: "contact", label: "Contact" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

        {/* Events & Offers Tab */}
        {activeTab === "offers" && (
          <OffersManager
            brandId={currentVenue.brandId}
            existingOffers={venueOffers}
            onUpdate={onSave}
          />
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <ImageUploader
            venueId={currentVenue.brandId}
            imageType="GALLERY"
            existingImages={galleryImages}
            maxImages={50}
            aspectRatio="1:1"
            onUpdate={onSave}
          />
        )}

        {/* Menus Tab */}
        {activeTab === "menus" && (
          <MenuManager venueId={currentVenue.brandId} existingMenus={currentVenue.menus || []} onUpdate={onSave} />
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
              onClick={() => handleSave({ mapUrl: formData.mapUrl })}
              disabled={saving}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Location"}
            </button>
          </div>
        )}

        {/* Contact Tab - Multiple contact numbers */}
        {activeTab === "contact" && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Contact numbers</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add one or more numbers. On the outlet page, visitors see a dropdown to choose which number to call or WhatsApp. Use 10 digits (e.g. 7013884485). Label is optional (e.g. Main, Reservations).
            </p>
            <div className="space-y-3">
              {formData.contactNumbers.map((contact, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="text"
                    value={contact.label ?? ""}
                    onChange={(e) => updateContact(index, "label", e.target.value)}
                    placeholder="Label (optional)"
                    className="w-28 sm:w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={contact.phone}
                    onChange={(e) => updateContact(index, "phone", e.target.value)}
                    placeholder="10-digit number"
                    className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addContact}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                + Add number
              </button>
              <button
                onClick={handleSaveContacts}
                disabled={saving || formData.contactNumbers.every((c) => !c.phone.trim())}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save contact numbers"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
