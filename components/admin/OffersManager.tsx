"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { cropTo9x16AndCompress } from "@/lib/image-compression";

type Offer = {
  id: string;
  imageUrl: string;
  endDate: string | null;
  createdAt?: string;
};

interface OffersManagerProps {
  brandId: string;
  existingOffers: { active: Offer[]; expired: Offer[] };
  onUpdate: () => void;
}

export default function OffersManager({ brandId, existingOffers, onUpdate }: OffersManagerProps) {
  const [active, setActive] = useState<Offer[]>(existingOffers.active);
  const [expired, setExpired] = useState<Offer[]>(existingOffers.expired);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    imageUrl: "",
    endDate: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ACCEPT = "image/jpeg,image/png,image/webp";

  const loadOffers = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/offers`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActive(data.active ?? []);
        setExpired(data.expired ?? []);
      } else {
        setError(data.error || data.detail || `Failed to load offers (${res.status})`);
      }
    } catch (err) {
      console.error("Failed to load offers", err);
      setError("Network error loading offers.");
    }
  }, [brandId]);

  useEffect(() => {
    setActive(existingOffers.active);
    setExpired(existingOffers.expired);
  }, [existingOffers.active, existingOffers.expired]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const saveOffer = async (id?: string) => {
    if (!form.imageUrl?.trim()) {
      setError("Image is required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(id && { id }),
          imageUrl: form.imageUrl.trim(),
          endDate: form.endDate.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (Array.isArray(data.active) && Array.isArray(data.expired)) {
          setActive(data.active);
          setExpired(data.expired);
        } else {
          await loadOffers();
        }
        setForm({ imageUrl: "", endDate: "" });
        onUpdate();
        setEditingId(null);
      } else {
        setError(data.error || `Save failed (${res.status})`);
      }
    } catch (err) {
      console.error("Failed to save offer", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/offers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await loadOffers();
        onUpdate();
        if (editingId === id) setEditingId(null);
      }
    } catch (err) {
      console.error("Failed to delete offer", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG and WebP are allowed.");
      e.target.value = "";
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const blob = await cropTo9x16AndCompress(file);
      const fd = new FormData();
      fd.append("file", blob, "poster.webp");
      fd.append("venueSlug", brandId);
      const res = await fetch("/api/admin/upload/offer", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setForm((f) => ({ ...f, imageUrl: data.url }));
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const startEdit = (o: Offer) => {
    setEditingId(o.id);
    setForm({
      imageUrl: o.imageUrl,
      endDate: o.endDate ?? "",
    });
  };

  const allOffers = [...active, ...expired];

  return (
    <div className="space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Events &amp; Offers</h2>
      <p className="text-sm text-gray-600">Posters show in the hero carousel. Leave end date empty for no expiry.</p>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Add / Edit form */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">{editingId ? "Edit offer" : "Add offer"}</h3>
        <div className="grid gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Poster *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {uploading ? "Processing & uploading…" : "Upload poster (JPG/PNG/WebP → 9:16 WebP)"}
              </button>
              {form.imageUrl && (
                <span className="text-xs text-green-600">Poster set</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Auto-crops to 9:16 and compresses to WebP. Stored on Vercel Blob.</p>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => { setError(null); setForm((f) => ({ ...f, imageUrl: e.target.value })); }}
              placeholder="Or paste image URL"
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End date (optional)</label>
            <input
              type="datetime-local"
              value={
                form.endDate
                  ? (() => {
                      const d = new Date(form.endDate);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      const h = String(d.getHours()).padStart(2, "0");
                      const min = String(d.getMinutes()).padStart(2, "0");
                      return `${y}-${m}-${day}T${h}:${min}`;
                    })()
                  : ""
              }
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value ? new Date(e.target.value).toISOString() : "" }))}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry. Past end date = offer hidden on site, shown under Expired here.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => saveOffer(editingId ?? undefined)}
            disabled={loading || !form.imageUrl?.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? "Saving..." : editingId ? "Update" : "Add offer"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ imageUrl: "", endDate: "" });
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Active */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Active ({active.length})</h3>
        {active.length === 0 ? (
          <p className="text-sm text-gray-500">No active offers. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="relative w-14 h-14 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                  <Image
                    src={o.imageUrl}
                    alt="Offer"
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0 text-sm text-gray-600">
                  {o.endDate ? `Ends ${new Date(o.endDate).toLocaleString()}` : "No end date"}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(o)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteOffer(o.id)}
                    disabled={loading}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Expired */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Expired ({expired.length})</h3>
        {expired.length === 0 ? (
          <p className="text-sm text-gray-500">No expired offers.</p>
        ) : (
          <ul className="space-y-2">
            {expired.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-80"
              >
                <div className="relative w-14 h-14 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                  <Image
                    src={o.imageUrl}
                    alt="Offer"
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0 text-sm text-gray-500">
                  Ended {o.endDate ? new Date(o.endDate).toLocaleString() : ""}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(o)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteOffer(o.id)}
                    disabled={loading}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
