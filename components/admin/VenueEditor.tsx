"use client";

import { useState, useEffect } from "react";
import { BRANDS } from "@/lib/brands";
import ImageUploader from "./ImageUploader";
import MenuManager from "./MenuManager";
import OffersManager from "./OffersManager";
import DiscountsManager from "./DiscountsManager";
import AdminShell from "./AdminShell";

interface Admin {
  id: string;
  username: string;
  role: string;
  venuePermissions: string[];
}

type VenueContact = { phone: string; label?: string };
type SectionVisibility = { menu: boolean; photos: boolean; amenities: boolean; spots: boolean };

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
  amenities?: string[] | null;
  sectionVisibility?: SectionVisibility | null;
  images: any[];
  menus: any[];
  offers?: VenueOffer[];
}

interface VenueEditorProps {
  venue: Venue;
  admin: Admin | null;
  onBack: () => void;
  onSave: () => void;
  onSwitchBrandId?: (brandId: string) => void;
  /** When set, outlet switcher only lists these brand ids (sub-admin). */
  allowedBrandIds?: string[] | null;
}

export default function VenueEditor({
  venue,
  admin,
  onBack,
  onSave,
  onSwitchBrandId,
  allowedBrandIds,
}: VenueEditorProps) {
  const [currentVenue, setCurrentVenue] = useState(venue);
  const [formData, setFormData] = useState({
    mapUrl: venue.mapUrl || "",
    contactPhone: (venue.contactPhone ?? "").toString(),
    contactNumbers: (venue.contactNumbers && Array.isArray(venue.contactNumbers)
      ? venue.contactNumbers
      : venue.contactPhone
        ? [{ phone: String(venue.contactPhone), label: "Contact" }]
        : []) as VenueContact[],
    amenities: (venue.amenities && Array.isArray(venue.amenities)
      ? venue.amenities.filter((x) => typeof x === "string")
      : []) as string[],
    sectionVisibility: {
      menu: venue.sectionVisibility?.menu !== false,
      photos: venue.sectionVisibility?.photos !== false,
      amenities: venue.sectionVisibility?.amenities !== false,
      spots: venue.sectionVisibility?.spots !== false,
    } as SectionVisibility,
  });
  const [activeTab, setActiveTab] = useState<"offers" | "gallery" | "menus" | "discounts" | "location" | "contact" | "amenities" | "sections">("offers");
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
      amenities: (venue.amenities && Array.isArray(venue.amenities)
        ? venue.amenities.filter((x) => typeof x === "string")
        : []) as string[],
      sectionVisibility: {
        menu: venue.sectionVisibility?.menu !== false,
        photos: venue.sectionVisibility?.photos !== false,
        amenities: venue.sectionVisibility?.amenities !== false,
        spots: venue.sectionVisibility?.spots !== false,
      } as SectionVisibility,
    });
  }, [venue]);

  const handleSave = async (payload?: { mapUrl?: string; contactPhone?: string; contactNumbers?: VenueContact[]; amenities?: string[]; sectionVisibility?: SectionVisibility }) => {
    setSaving(true);
    setMessage(null);
    const dataToSend = payload ?? {
      mapUrl: formData.mapUrl,
      contactPhone: formData.contactPhone || null,
      contactNumbers: formData.contactNumbers,
      amenities: formData.amenities,
      sectionVisibility: formData.sectionVisibility,
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
          ...(dataToSend.amenities !== undefined && { amenities: dataToSend.amenities }),
          ...(dataToSend.sectionVisibility !== undefined && { sectionVisibility: dataToSend.sectionVisibility }),
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
  const handleSaveAmenities = () => handleSave({ amenities: formData.amenities });
  const handleSaveSections = () => handleSave({ sectionVisibility: formData.sectionVisibility });

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

  const switchableBrands =
    allowedBrandIds && allowedBrandIds.length > 0
      ? BRANDS.filter((b) => allowedBrandIds.includes(b.id))
      : BRANDS;
  const showOutletSwitcher = switchableBrands.length > 1;

  return (
    <AdminShell
      title={currentVenue.shortName}
      showBack
      onBackHref="/admin/dashboard/venues"
      onBack={onBack}
    >
      {/* Tabs */}
      {showOutletSwitcher ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-slate-600">Switch outlet</p>
              <p className="text-xs text-slate-500">Jump to another outlet without going back.</p>
            </div>
            <select
              value={currentVenue.brandId}
              onChange={(e) => onSwitchBrandId?.(e.target.value)}
              className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {switchableBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="mb-4 sm:sticky sm:top-[100px] z-20">
        <div className="flex justify-start">
          <div className="inline-flex overflow-x-auto rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {[
              { id: "offers", label: "Events & Offers" },
              { id: "gallery", label: "Gallery" },
              { id: "menus", label: "Menus" },
              { id: "discounts", label: "Discounts" },
              { id: "location", label: "Location" },
              { id: "contact", label: "Contact" },
              { id: "amenities", label: "Amenities" },
              { id: "sections", label: "Sections" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium sm:px-4 sm:text-sm ${
                  activeTab === tab.id
                    ? "bg-slate-100 text-slate-900 shadow"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="pb-10 pt-2">
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Events & Offers Tab */}
        {activeTab === "offers" && (
          <OffersManager brandId={currentVenue.brandId} onUpdate={onSave} />
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

        {/* Discounts Tab */}
        {activeTab === "discounts" && (
          <DiscountsManager brandId={currentVenue.brandId} onUpdate={onSave} />
        )}

        {/* Location Tab */}
        {activeTab === "location" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-900 sm:text-xl">Location</h2>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Google Maps URL
              </label>
              <input
                type="url"
                value={formData.mapUrl}
                onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <p className="mt-1 text-xs text-slate-500">
                Paste the Google Maps share link for this venue
              </p>
            </div>

            <button
              onClick={() => handleSave({ mapUrl: formData.mapUrl })}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Location"}
            </button>
          </div>
        )}

        {/* Contact Tab - Multiple contact numbers */}
        {activeTab === "contact" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-900 sm:text-xl">
              Contact numbers
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Add one or more numbers. On the outlet page, visitors see a dropdown to choose which number to call or WhatsApp. Use 10 digits (e.g. 7013884485). Label is optional (e.g. Main, Reservations).
            </p>
            <div className="space-y-3">
              {formData.contactNumbers.map((contact, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <input
                    type="text"
                    value={contact.label ?? ""}
                    onChange={(e) => updateContact(index, "label", e.target.value)}
                    placeholder="Label (optional)"
                    className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-32"
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={contact.phone}
                    onChange={(e) => updateContact(index, "phone", e.target.value)}
                    placeholder="10-digit number"
                    className="flex-1 min-w-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="rounded-lg p-2 text-rose-700 transition-colors hover:bg-rose-50 border border-rose-100"
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
                className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                + Add number
              </button>
              <button
                onClick={handleSaveContacts}
                disabled={saving || formData.contactNumbers.every((c) => !c.phone.trim())}
                className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save contact numbers"}
              </button>
            </div>
          </div>
        )}

        {/* Amenities Tab */}
        {activeTab === "amenities" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-900 sm:text-xl">Amenities</h2>
            <p className="mb-4 text-sm text-slate-500">
              Add visitor-facing amenities shown below the gallery.
            </p>
            <div className="space-y-3">
              {formData.amenities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <input
                    type="text"
                    value={amenity}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData((prev) => {
                        const next = [...prev.amenities];
                        next[index] = value;
                        return { ...prev, amenities: next };
                      });
                    }}
                    placeholder={`Amenity ${index + 1}`}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        amenities: prev.amenities.filter((_, i) => i !== index),
                      }))
                    }
                    className="rounded-lg p-2 text-rose-700 transition-colors hover:bg-rose-50 border border-rose-100"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    amenities: [...prev.amenities, `Amenity ${prev.amenities.length + 1}`],
                  }))
                }
                className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                + Add amenity
              </button>
              <button
                onClick={handleSaveAmenities}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save amenities"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "sections" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-900 sm:text-xl">Section visibility</h2>
            <p className="text-sm text-slate-500">
              Control optional sections. Events and bottom sticky buttons always stay visible.
            </p>
            <div className="space-y-2">
              {[
                { key: "menu", label: "Menu section" },
                { key: "photos", label: "Photos section" },
                { key: "amenities", label: "Amenities section" },
                { key: "spots", label: "Spots section (The Hub)" },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <span className="text-sm text-slate-800">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(formData.sectionVisibility[item.key as keyof SectionVisibility])}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        sectionVisibility: {
                          ...prev.sectionVisibility,
                          [item.key]: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 accent-slate-900"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={handleSaveSections}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save section visibility"}
            </button>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
