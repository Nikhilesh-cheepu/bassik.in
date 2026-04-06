"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { cropTo9x16AndCompress } from "@/lib/image-compression";
import { formatGuestEventDateLabel } from "@/lib/event-date-display";

type Offer = {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  eventContinuous?: boolean;
  entryLabel: string | null;
  capacityText: string | null;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [form, setForm] = useState({
    imageUrl: "",
    title: "",
    description: "",
    eventDate: "",
    eventContinuous: false,
    entryLabel: "",
    capacityText: "",
    endDate: "",
  });
  const [uploading, setUploading] = useState(false);
  const [aiSuggested, setAiSuggested] = useState({
    title: false,
    description: false,
    entryLabel: false,
    capacityText: false,
    eventDate: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ACCEPT = "image/jpeg,image/png,image/webp";

  const next10DateYmd = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    // Keep chips stable by using UTC date portion.
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  const activeEndDateYmd = form.endDate ? new Date(form.endDate).toISOString().slice(0, 10) : "";
  const activeEventDateYmd = form.eventDate ? new Date(form.eventDate).toISOString().slice(0, 10) : "";

  const chipLabel = (ymd: string) => {
    const d = new Date(`${ymd}T00:00:00.000Z`);
    const weekday = d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
    const day = d.toLocaleDateString("en-IN", { day: "2-digit", timeZone: "UTC" });
    const month = d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
    return `${weekday} ${day} ${month}`;
  };

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

  const selectedCount = selectedIds.size;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const clearSelection = () => setSelectedIds(new Set());

  const saveOffer = async (id?: string) => {
    if (!form.imageUrl?.trim()) {
      setError("Image is required.");
      return;
    }
    if (!form.eventContinuous && !form.eventDate.trim()) {
      setError("Pick an event night date, or turn on “Ongoing / no fixed date”.");
      return;
    }
    setError(null);
    setLoading(true);
    const normalizedEventDate = form.eventContinuous ? null : new Date(form.eventDate).toISOString();
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(id && { id }),
          imageUrl: form.imageUrl.trim(),
          title: form.title.trim() || null,
          description: form.description.trim() || null,
          eventContinuous: form.eventContinuous,
          eventDate: normalizedEventDate,
          entryLabel: form.entryLabel.trim() || null,
          capacityText: form.capacityText.trim() || null,
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
        setForm({
          imageUrl: "",
          title: "",
          description: "",
          eventDate: "",
          eventContinuous: false,
          entryLabel: "",
          capacityText: "",
          endDate: "",
        });
        setAiSuggested({ title: false, description: false, entryLabel: false, capacityText: false, eventDate: false });
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
        if (editingId === id) {
          setEditingId(null);
          setForm({
            imageUrl: "",
            title: "",
            description: "",
            eventDate: "",
            eventContinuous: false,
            entryLabel: "",
            capacityText: "",
            endDate: "",
          });
        }
      }
    } catch (err) {
      console.error("Failed to delete offer", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected offers?`)) return;
    const ids = Array.from(selectedIds);
    setLoading(true);
    try {
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`/api/admin/venues/${brandId}/offers`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          // Best-effort: stop if any delete fails.
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed deleting offer ${id}`);
        }
      }
      setSelectedIds(new Set());
      if (editingId && ids.includes(editingId)) {
        setEditingId(null);
        setForm({
          imageUrl: "",
          title: "",
          description: "",
          eventDate: "",
          eventContinuous: false,
          entryLabel: "",
          capacityText: "",
          endDate: "",
        });
      }
      await loadOffers();
      onUpdate();
    } catch (e) {
      console.error("Bulk delete offers failed:", e);
      setError(e instanceof Error ? e.message : "Bulk delete failed.");
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
        setAiSuggested({ title: false, description: false, entryLabel: false, capacityText: false, eventDate: false });
        const aiRes = await fetch(`/api/admin/venues/${brandId}/offers/analyze`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: data.url }),
        });
        if (aiRes.ok) {
          const ai = await aiRes.json().catch(() => ({}));
          const nextSuggested = {
            title: false,
            description: false,
            entryLabel: false,
            capacityText: false,
            eventDate: false,
          };
          setForm((f) => {
            const ymd =
              typeof ai.eventDateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ai.eventDateISO.trim())
                ? ai.eventDateISO.trim()
                : "";
            const aiSetsDate = !f.eventDate.trim() && Boolean(ymd);
            if (aiSetsDate) nextSuggested.eventDate = true;
            return {
              ...f,
              title: (() => {
                if (!f.title && ai.title) nextSuggested.title = true;
                return f.title || ai.title || "";
              })(),
              description: (() => {
                if (!f.description && ai.description) nextSuggested.description = true;
                return f.description || ai.description || "";
              })(),
              entryLabel: (() => {
                if (!f.entryLabel && ai.entryLabel) nextSuggested.entryLabel = true;
                return f.entryLabel || ai.entryLabel || "";
              })(),
              capacityText: (() => {
                if (!f.capacityText && ai.capacityText) nextSuggested.capacityText = true;
                return f.capacityText || ai.capacityText || "";
              })(),
              eventDate: aiSetsDate ? new Date(`${ymd}T20:00:00.000Z`).toISOString() : f.eventDate,
              eventContinuous: aiSetsDate ? false : f.eventContinuous,
            };
          });
          setAiSuggested(nextSuggested);
        } else {
          const errBody = await aiRes.json().catch(() => ({}));
          const detail =
            typeof errBody.error === "string" && errBody.error.trim()
              ? errBody.error.trim()
              : `Poster analysis failed (${aiRes.status}).`;
          setError(detail);
        }
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
    const ongoing = Boolean(o.eventContinuous);
    setForm({
      imageUrl: o.imageUrl,
      title: o.title ?? "",
      description: o.description ?? "",
      eventDate: ongoing ? "" : o.eventDate ? new Date(o.eventDate).toISOString().slice(0, 16) : "",
      eventContinuous: ongoing,
      entryLabel: o.entryLabel ?? "",
      capacityText: o.capacityText ?? "",
      endDate: o.endDate ?? "",
    });
    setAiSuggested({ title: false, description: false, entryLabel: false, capacityText: false, eventDate: false });
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Events &amp; Offers</h2>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Add / Edit form */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          {editingId ? "Edit offer" : "Add offer"}
        </h3>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
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
                className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                {uploading ? "Processing & uploading…" : "Upload poster (JPG/PNG/WebP → 9:16 WebP)"}
              </button>
              {form.imageUrl && (
                <span className="text-xs text-emerald-700">Poster set</span>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Event name
              {aiSuggested.title && <span className="ml-2 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">AI suggested</span>}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ladies Night"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Description
              {aiSuggested.description && <span className="ml-2 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">AI suggested</span>}
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Unlimited drinks for ladies till closing"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Event night (shown on site)
                {!form.eventContinuous ? (
                  <span className="text-rose-600"> *</span>
                ) : null}
                {aiSuggested.eventDate && (
                  <span className="ml-2 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                    AI suggested
                  </span>
                )}
              </label>
              <p className="mb-1.5 text-[11px] text-slate-500">
                The date guests see for this poster — not listing expiry (expiry is below). Use ongoing when there
                is no fixed night.
              </p>
              <label className="mb-2 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  checked={form.eventContinuous}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      eventContinuous: e.target.checked,
                      eventDate: e.target.checked ? "" : f.eventDate,
                    }))
                  }
                />
                <span className="text-xs text-slate-800">
                  <span className="font-medium">Ongoing / no fixed date</span>
                  <span className="block text-slate-500">Guests see “Ongoing”. You can still set listing expiry below.</span>
                </span>
              </label>
              <div
                className={`mt-2 flex flex-wrap items-center gap-2 ${form.eventContinuous ? "pointer-events-none opacity-40" : ""}`}
                aria-hidden={form.eventContinuous}
              >
                {next10DateYmd.map((ymd) => {
                  const isActive = activeEventDateYmd === ymd;
                  return (
                    <button
                      key={`event-${ymd}`}
                      type="button"
                      disabled={form.eventContinuous}
                      onClick={() => {
                        const iso = new Date(`${ymd}T20:00:00.000Z`).toISOString();
                        setForm((f) => ({ ...f, eventDate: iso, eventContinuous: false }));
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {chipLabel(ymd)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Entry / slot label
                {aiSuggested.entryLabel && <span className="ml-2 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">AI suggested</span>}
              </label>
              <input
                type="text"
                value={form.entryLabel}
                onChange={(e) => setForm((f) => ({ ...f, entryLabel: e.target.value }))}
                placeholder="Entry #12"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              People info
              {aiSuggested.capacityText && <span className="ml-2 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">AI suggested</span>}
            </label>
            <input
              type="text"
              value={form.capacityText}
              onChange={(e) => setForm((f) => ({ ...f, capacityText: e.target.value }))}
              placeholder="2-6 people"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Listing expiry (optional, admin only)
            </label>
            <p className="mb-1.5 text-[11px] text-slate-500">
              Hides this offer after this date. Not shown on the homepage or venue flyers.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, endDate: "" }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  !activeEndDateYmd
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                No expiry
              </button>
              {next10DateYmd.map((ymd) => {
                const isActive = activeEndDateYmd === ymd;
                return (
                  <button
                    key={ymd}
                    type="button"
                    onClick={() => {
                      // Set end to 23:59 UTC of that date (simple + predictable).
                      const iso = new Date(`${ymd}T23:59:00.000Z`).toISOString();
                      setForm((f) => ({ ...f, endDate: iso }));
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {chipLabel(ymd)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => saveOffer(editingId ?? undefined)}
            disabled={loading || !form.imageUrl?.trim() || (!form.eventContinuous && !form.eventDate.trim())}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Saving..." : editingId ? "Update" : "Add offer"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({
                  imageUrl: "",
                  title: "",
                  description: "",
                  eventDate: "",
                  eventContinuous: false,
                  entryLabel: "",
                  capacityText: "",
                  endDate: "",
                });
              }}
              className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
          <span className="text-sm font-medium text-slate-700">{selectedCount} selected</span>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={loading}
            onClick={clearSelection}
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
            disabled={loading}
            onClick={() => void deleteSelected()}
          >
            Delete selected
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Active */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Active ({active.length})</h3>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={active.length === 0 || loading}
              onClick={() => selectAll(active.map((o) => o.id))}
            >
              Select all active
            </button>
          </div>
          {listLoading ? (
            <p className="text-sm text-slate-600">Loading offers…</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-slate-600">No active offers. Add one above.</p>
          ) : (
            <ul className="space-y-1">
              {active.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(o.id)}
                    onChange={() => toggleSelected(o.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                  />
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                    <Image src={o.imageUrl} alt="Offer" fill className="object-cover" sizes="40px" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0 text-sm text-slate-700">
                    <div className="truncate font-medium text-slate-900">{o.title?.trim() || "Untitled event"}</div>
                    <div className="truncate text-xs text-slate-600">
                      {o.eventContinuous
                        ? "Event night: Ongoing (no fixed date)"
                        : o.eventDate
                          ? `Event night: ${formatGuestEventDateLabel(o.eventDate) ?? "—"}`
                          : "No event date"}
                    </div>
                    {o.description?.trim() && <div className="truncate text-xs text-slate-500">{o.description}</div>}
                    <div className="truncate text-xs text-slate-500">
                      {o.endDate
                        ? `Listing expires: ${formatGuestEventDateLabel(o.endDate) ?? "—"}`
                        : "No listing expiry"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(o)}
                      className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 border border-slate-200"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOffer(o.id)}
                      disabled={loading}
                      className="rounded-lg p-1.5 text-rose-700 border border-rose-100 hover:bg-rose-50"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Expired */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Expired ({expired.length})</h3>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={expired.length === 0 || loading}
              onClick={() => selectAll(expired.map((o) => o.id))}
            >
              Select all expired
            </button>
          </div>
          {listLoading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : expired.length === 0 ? (
            <p className="text-sm text-slate-600">No expired offers.</p>
          ) : (
            <ul className="space-y-1">
              {expired.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 opacity-90"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(o.id)}
                    onChange={() => toggleSelected(o.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                  />
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                    <Image src={o.imageUrl} alt="Offer" fill className="object-cover" sizes="40px" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0 text-sm text-slate-700">
                    <div className="truncate font-medium text-slate-900">{o.title?.trim() || "Untitled event"}</div>
                    <div className="truncate text-xs text-slate-500">
                      Listing expired {o.endDate ? formatGuestEventDateLabel(o.endDate) ?? "—" : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(o)}
                      className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 border border-slate-200"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteOffer(o.id)}
                      disabled={loading}
                      className="rounded-lg p-1.5 text-rose-700 border border-rose-100 hover:bg-rose-50"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
