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
  onUpdate: () => void;
}

export default function OffersManager({ brandId, onUpdate }: OffersManagerProps) {
  const [active, setActive] = useState<Offer[]>([]);
  const [expired, setExpired] = useState<Offer[]>([]);
  const [listLoading, setListLoading] = useState(true);
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
    setListLoading(true);
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/offers`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActive(Array.isArray(data.active) ? data.active : []);
        setExpired(Array.isArray(data.expired) ? data.expired : []);
      } else {
        setError(data.error || data.detail || `Failed to load offers (${res.status})`);
      }
    } catch (err) {
      console.error("Failed to load offers", err);
      setError("Network error loading offers.");
    } finally {
      setListLoading(false);
    }
  }, [brandId]);

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
          loadOffers();
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
        loadOffers();
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">Events &amp; Offers</h2>
      <p className="text-sm text-slate-400">
        Posters show in the hero carousel on the outlet page. Leave end date empty for no expiry.
      </p>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {/* Add / Edit form */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.9)] sm:p-6">
        <h3 className="text-sm font-semibold text-slate-50">
          {editingId ? "Edit offer" : "Add offer"}
        </h3>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-200">
              Poster *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                {uploading ? "Processing & uploading…" : "Upload poster (JPG/PNG/WebP → 9:16 WebP)"}
              </button>
              {form.imageUrl && (
                <span className="text-xs text-emerald-300">Poster set</span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Auto-crops to 9:16 and compresses to WebP. Stored on Vercel Blob storage.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-200">
              End date (optional)
            </label>
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
              className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Leave empty for no expiry. Past end date hides the offer on site and shows it under
              Expired here.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => saveOffer(editingId ?? undefined)}
            disabled={loading || !form.imageUrl?.trim()}
            className="rounded-lg bg-fuchsia-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-fuchsia-400 disabled:opacity-50"
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
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Active */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-100">
          Active ({active.length})
        </h3>
        {listLoading ? (
          <p className="text-sm text-slate-500">Loading offers…</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-slate-500">No active offers. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            {active.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3"
              >
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
                  <Image
                    src={o.imageUrl}
                    alt="Offer"
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0 text-sm text-slate-300">
                  {o.endDate ? `Ends ${new Date(o.endDate).toLocaleString()}` : "No end date"}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(o)}
                    className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteOffer(o.id)}
                    disabled={loading}
                    className="rounded-lg p-2 text-rose-300 transition-colors hover:bg-rose-500/10"
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
        <h3 className="text-sm font-semibold text-slate-100">
          Expired ({expired.length})
        </h3>
        {listLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : expired.length === 0 ? (
          <p className="text-sm text-slate-500">No expired offers.</p>
        ) : (
          <ul className="space-y-2">
            {expired.map((o) => (
              <li
                key={o.id}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3 opacity-80"
              >
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
                  <Image
                    src={o.imageUrl}
                    alt="Offer"
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0 text-sm text-slate-400">
                  Ended {o.endDate ? new Date(o.endDate).toLocaleString() : ""}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(o)}
                    className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteOffer(o.id)}
                    disabled={loading}
                    className="rounded-lg p-2 text-rose-300 transition-colors hover:bg-rose-500/10"
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
