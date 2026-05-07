"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { BRANDS } from "@/lib/brands";
import ImageUploader from "./ImageUploader";
import MenuManager from "./MenuManager";
import OffersManager from "./OffersManager";
import DiscountsManager from "./DiscountsManager";
import AdminShell from "./AdminShell";
import {
  mergeOutletUi,
  parseOutletUi,
  type OutletUiConfig,
  type OutletUiLocateAlignment,
} from "@/lib/outlet-ui-config";

interface Admin {
  id: string;
  username: string;
  role: string;
  venuePermissions: string[];
}

type VenueContact = { phone: string; label?: string };
type SectionVisibility = { menu: boolean; photos: boolean; spots: boolean };

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
  sectionVisibility?: SectionVisibility | null;
  images: any[];
  menus: any[];
  offers?: VenueOffer[];
  outletUi?: unknown;
}

interface VenueEditorProps {
  venue: Venue;
  admin: Admin | null;
  onBack: () => void;
  onSave: () => void;
  onSwitchBrandId?: (brandId: string) => void;
  /** When set, outlet switcher only lists these brand ids (sub-admin). */
  allowedBrandIds?: string[] | null;
  /** Card grid of all outlets (Back + “All venues”). */
  venuesOverviewHref?: string;
}

export default function VenueEditor({
  venue,
  admin,
  onBack,
  onSave,
  onSwitchBrandId,
  allowedBrandIds,
  venuesOverviewHref = "/admin/dashboard/venues/overview",
}: VenueEditorProps) {
  const activeChipRef = useRef<HTMLButtonElement | null>(null);
  const [currentVenue, setCurrentVenue] = useState(venue);
  const [formData, setFormData] = useState({
    mapUrl: venue.mapUrl || "",
    contactPhone: (venue.contactPhone ?? "").toString(),
    contactNumbers: (venue.contactNumbers && Array.isArray(venue.contactNumbers)
      ? venue.contactNumbers
      : venue.contactPhone
        ? [{ phone: String(venue.contactPhone), label: "Contact" }]
        : []) as VenueContact[],
    sectionVisibility: {
      menu: venue.sectionVisibility?.menu !== false,
      photos: venue.sectionVisibility?.photos !== false,
      spots: venue.sectionVisibility?.spots !== false,
    } as SectionVisibility,
  });
  const [activeTab, setActiveTab] = useState<
    "offers" | "gallery" | "menus" | "discounts" | "location" | "contact" | "sections" | "outletFoot"
  >("offers");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [outletUiDraft, setOutletUiDraft] = useState<OutletUiConfig>({});
  const [hideInstagramSheet, setHideInstagramSheet] = useState(false);
  const [instagramUrlInput, setInstagramUrlInput] = useState("");

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
      sectionVisibility: {
        menu: venue.sectionVisibility?.menu !== false,
        photos: venue.sectionVisibility?.photos !== false,
        spots: venue.sectionVisibility?.spots !== false,
      } as SectionVisibility,
    });
  }, [venue]);

  useEffect(() => {
    const raw =
      venue.outletUi && typeof venue.outletUi === "object" && !Array.isArray(venue.outletUi)
        ? (JSON.parse(JSON.stringify(venue.outletUi)) as OutletUiConfig)
        : {};
    setOutletUiDraft(raw);
    const rawCs = parseOutletUi(venue.outletUi)?.contactSheet;
    setHideInstagramSheet(typeof rawCs?.instagramUrl === "string" && rawCs.instagramUrl === "");
    const m = mergeOutletUi(venue.outletUi);
    setInstagramUrlInput(
      m.contactSheet.instagramUrlResolved ? m.contactSheet.instagramUrlResolved : ""
    );
  }, [venue.outletUi, venue.brandId]);

  useLayoutEffect(() => {
    activeChipRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [currentVenue.brandId]);

  const handleSave = async (payload?: { mapUrl?: string; contactPhone?: string; contactNumbers?: VenueContact[]; sectionVisibility?: SectionVisibility }) => {
    setSaving(true);
    setMessage(null);
    const dataToSend = payload ?? {
      mapUrl: formData.mapUrl,
      contactPhone: formData.contactPhone || null,
      contactNumbers: formData.contactNumbers,
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
  const handleSaveSections = () => handleSave({ sectionVisibility: formData.sectionVisibility });

  const setBottomUi = (patch: Partial<NonNullable<OutletUiConfig["bottomBar"]>>) => {
    setOutletUiDraft((d) => ({
      ...d,
      bottomBar: { ...d.bottomBar, ...patch },
    }));
  };
  const setContactSheetUi = (patch: Partial<NonNullable<OutletUiConfig["contactSheet"]>>) => {
    setOutletUiDraft((d) => ({
      ...d,
      contactSheet: { ...d.contactSheet, ...patch },
    }));
  };

  const mergedFooterDraft = mergeOutletUi(outletUiDraft);

  const handleSaveOutletUi = async () => {
    setSaving(true);
    setMessage(null);
    const cs = { ...outletUiDraft.contactSheet };
    if (hideInstagramSheet) {
      cs.instagramUrl = "";
    } else {
      const trimmed = instagramUrlInput.trim();
      if (trimmed) cs.instagramUrl = trimmed;
      else delete cs.instagramUrl;
    }
    const payload: OutletUiConfig = { ...outletUiDraft, contactSheet: cs };
    try {
      const res = await fetch("/api/admin/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: currentVenue.brandId,
          ...(currentVenue.id ? {} : { name: currentVenue.name, shortName: currentVenue.shortName, address: currentVenue.address || "Address to be updated" }),
          outletUi: payload,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Footer bar & contact popup saved." });
        onSave();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

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
      onBackHref={venuesOverviewHref}
      onBack={onBack}
    >
      {showOutletSwitcher ? (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-slate-600">Outlets</p>
              <p className="text-xs text-slate-500">Swipe chips to switch — page URL updates so refresh stays here.</p>
            </div>
            <Link
              href={venuesOverviewHref}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              All venues
            </Link>
          </div>
          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-0.5 scrollbar-hide snap-x snap-mandatory scroll-pl-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {switchableBrands.map((b) => {
              const active = b.id === currentVenue.brandId;
              return (
                <button
                  key={b.id}
                  type="button"
                  ref={active ? activeChipRef : undefined}
                  onClick={() => onSwitchBrandId?.(b.id)}
                  className={`snap-start shrink-0 rounded-full border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${
                    active ? "shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  style={
                    active
                      ? {
                          borderColor: b.accentColor,
                          backgroundColor: `${b.accentColor}33`,
                          color: "#0f172a",
                          boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${b.accentColor}`,
                        }
                      : undefined
                  }
                >
                  {b.shortName}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex justify-end">
          <Link
            href={venuesOverviewHref}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            All venues
          </Link>
        </div>
      )}

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
              { id: "sections", label: "Sections" },
              { id: "outletFoot", label: "Footer bar" },
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

        {activeTab === "outletFoot" && (
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Floating footer bar</h2>
              <p className="mt-1 text-sm text-slate-500">
                Labels, colors, and which pills appear on the outlet page (Book table, Book event, Contact us). Menu can
                show as a second row on the bar when the menu section is enabled.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["bookTableLabel", "Book table label"],
                  ["bookTableBadge", "Promo badge (empty = none)"],
                  ["bookEventLabel", "Book event label"],
                  ["contactLabel", "Contact label"],
                  ["menuLabel", "Menu row label"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">{label}</span>
                  <input
                    type="text"
                    value={(outletUiDraft.bottomBar?.[key] as string | undefined) ?? ""}
                    onChange={(e) =>
                      setBottomUi({ [key]: e.target.value } as Partial<NonNullable<OutletUiConfig["bottomBar"]>>)
                    }
                    placeholder={(mergedFooterDraft.bottomBar[key] as string) ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                  />
                </label>
              ))}
              {(
                [
                  ["bookTableBg", "Book table color"],
                  ["bookEventBg", "Book event color"],
                  ["contactBg", "Contact background"],
                  ["contactBorder", "Contact border"],
                  ["contactText", "Contact text"],
                  ["menuBg", "Menu row background"],
                  ["menuBorder", "Menu row border"],
                  ["menuText", "Menu row text"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">{label}</span>
                  <input
                    type="text"
                    value={(outletUiDraft.bottomBar?.[key] as string | undefined) ?? ""}
                    onChange={(e) =>
                      setBottomUi({ [key]: e.target.value } as Partial<NonNullable<OutletUiConfig["bottomBar"]>>)
                    }
                    placeholder={(mergedFooterDraft.bottomBar[key] as string) ?? ""}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-4">
              {(
                [
                  ["showBookTable", "Show Book table"],
                  ["showBookEvent", "Show Book event"],
                  ["showContact", "Show Contact us"],
                  ["showMenuInBar", "Menu as second row on bar"],
                  ["hideBookEventWhenEmpty", "Hide Book event when there are no offers"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={mergedFooterDraft.bottomBar[key]}
                    onChange={(e) => setBottomUi({ [key]: e.target.checked })}
                    className="h-4 w-4 accent-slate-900"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-base font-semibold text-slate-900">Contact popup</h3>
              <p className="mt-1 text-sm text-slate-500">
                Sheet title, subtitle, row labels, and the Locate us block (maps link comes from the Location tab).
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-slate-700">Sheet title</span>
                  <input
                    type="text"
                    value={outletUiDraft.contactSheet?.title ?? ""}
                    onChange={(e) => setContactSheetUi({ title: e.target.value })}
                    placeholder={mergedFooterDraft.contactSheet.title}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium text-slate-700">Subtitle (empty = hide line)</span>
                  <textarea
                    rows={2}
                    value={
                      outletUiDraft.contactSheet &&
                      Object.prototype.hasOwnProperty.call(outletUiDraft.contactSheet, "subtitle") &&
                      outletUiDraft.contactSheet.subtitle === null
                        ? ""
                        : outletUiDraft.contactSheet?.subtitle ?? mergedFooterDraft.contactSheet.subtitle ?? ""
                    }
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      if (v === "") setContactSheetUi({ subtitle: null });
                      else setContactSheetUi({ subtitle: e.target.value });
                    }}
                    placeholder={mergedFooterDraft.contactSheet.subtitle ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
                    onClick={() =>
                      setOutletUiDraft((d) => {
                        const cs = { ...d.contactSheet };
                        delete cs.subtitle;
                        return { ...d, contactSheet: cs };
                      })
                    }
                  >
                    Reset subtitle to site default (when empty in DB)
                  </button>
                </label>
                {(
                  [
                    ["callLabel", "Call row"],
                    ["whatsappLabel", "WhatsApp row"],
                    ["instagramLabel", "Instagram row"],
                    ["locateLabel", "Locate us label"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">{label}</span>
                    <input
                      type="text"
                      value={(outletUiDraft.contactSheet?.[key] as string | undefined) ?? ""}
                      onChange={(e) =>
                        setContactSheetUi({
                          [key]: e.target.value,
                        } as Partial<NonNullable<OutletUiConfig["contactSheet"]>>)
                      }
                      placeholder={(mergedFooterDraft.contactSheet[key] as string) ?? ""}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                ))}
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Locate alignment</span>
                  <select
                    value={
                      outletUiDraft.contactSheet?.locateAlign ?? mergedFooterDraft.contactSheet.locateAlign
                    }
                    onChange={(e) =>
                      setContactSheetUi({
                        locateAlign: e.target.value as OutletUiLocateAlignment,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="start">Left</option>
                    <option value="center">Center</option>
                    <option value="end">Right</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-1">
                {(
                  [
                    ["locateBg", "Locate us background (CSS color or gradient)"],
                    ["locateBorder", "Locate us border color"],
                    ["locateText", "Locate us text color"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">{label}</span>
                    <input
                      type="text"
                      value={(outletUiDraft.contactSheet?.[key] as string | undefined) ?? ""}
                      onChange={(e) =>
                        setContactSheetUi({
                          [key]: e.target.value,
                        } as Partial<NonNullable<OutletUiConfig["contactSheet"]>>)
                      }
                      placeholder={(mergedFooterDraft.contactSheet[key] as string) ?? ""}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {(
                  [
                    ["showCall", "Call"],
                    ["showWhatsApp", "WhatsApp"],
                    ["showInstagram", "Instagram"],
                    ["showLocate", "Locate us"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={mergedFooterDraft.contactSheet[key]}
                      onChange={(e) => setContactSheetUi({ [key]: e.target.checked })}
                      className="h-4 w-4 accent-slate-900"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={hideInstagramSheet}
                    onChange={(e) => {
                      setHideInstagramSheet(e.target.checked);
                      if (e.target.checked) setInstagramUrlInput("");
                    }}
                    className="h-4 w-4 accent-slate-900"
                  />
                  Hide Instagram in the contact sheet
                </label>
                {!hideInstagramSheet && (
                  <label className="mt-3 block text-sm">
                    <span className="mb-1 block text-slate-700">Custom Instagram URL (optional)</span>
                    <input
                      type="url"
                      value={instagramUrlInput}
                      onChange={(e) => setInstagramUrlInput(e.target.value)}
                      placeholder="Leave blank to use this outlet’s brand link from the catalog"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveOutletUi}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save footer & contact popup"}
            </button>
          </div>
        )}

        {activeTab === "sections" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-900 sm:text-xl">Section visibility</h2>
            <p className="text-sm text-slate-500">
              Control gallery, hubs, etc. Events stay on the hero. The floating footer stays visible unless you hide
              individual pills under Footer bar.
            </p>
            <div className="space-y-2">
              {[
                { key: "menu", label: "Menu section" },
                { key: "photos", label: "Photos section" },
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
