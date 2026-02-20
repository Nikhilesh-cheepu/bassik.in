"use client";

import { useState, useEffect, useCallback } from "react";

type DiscountItem = {
  id: string;
  title: string;
  description: string;
  limitPerDay: number;
  slotsLeft: number;
  startTime: string | null;
  endTime: string | null;
  session: string | null;
  active: boolean;
  createdAt: string;
};

function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")}${period}`;
}

// Time options for 12-hour picker: 12:00 AM - 11:30 PM, 30-min increments
const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = [{ value: "", label: "—" }];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const h24 = h;
      const period = h24 >= 12 ? "PM" : "AM";
      const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
      opts.push({
        value: `${h24.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        label: `${h12}:${m.toString().padStart(2, "0")} ${period}`,
      });
    }
  }
  return opts;
})();

interface DiscountsManagerProps {
  brandId: string;
  onUpdate?: () => void;
}

export default function DiscountsManager({ brandId, onUpdate }: DiscountsManagerProps) {
  const [items, setItems] = useState<DiscountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    limitPerDay: 20,
    startTime: "" as string,
    endTime: "" as string,
    session: "" as "" | "LUNCH" | "DINNER" | "BOTH",
    active: true,
  });

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/discounts`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      limitPerDay: 20,
      startTime: "",
      endTime: "",
      session: "",
      active: true,
    });
    setEditingId(null);
    setFormOpen(false);
  };

  const openEdit = (item: DiscountItem) => {
    setForm({
      title: item.title,
      description: item.description ?? "",
      limitPerDay: item.limitPerDay,
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
      session: (item.session as "" | "LUNCH" | "DINNER" | "BOTH") ?? "",
      active: item.active,
    });
    setEditingId(item.id);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setMessage({ type: "error", text: "Title is required." });
      return;
    }
    const startTime = form.startTime || null;
    const endTime = form.endTime || null;
    if (startTime && endTime && endTime <= startTime) {
      setMessage({ type: "error", text: "End time must be after start time." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        title: form.title.trim(),
        description: form.description.trim() || null,
        limitPerDay: form.limitPerDay,
        startTime,
        endTime,
        session: form.session || null,
        active: form.active,
      };
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(`/api/admin/venues/${brandId}/discounts`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      setMessage({ type: "success", text: editingId ? "Discount updated." : "Discount created." });
      await fetchItems();
      onUpdate?.();
      resetForm();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/discounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMessage({ type: "success", text: "Discount deleted." });
      await fetchItems();
      onUpdate?.();
      if (editingId === id) resetForm();
    } catch {
      setMessage({ type: "error", text: "Failed to delete" });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Discounts</h2>
        <button
          type="button"
          onClick={() => { resetForm(); setFormOpen(!formOpen); }}
          className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
        >
          {formOpen ? "Cancel" : "+ New discount"}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="p-4 border border-gray-200 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (required)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Lunch Special @ ₹128"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="e.g. Eat & drink anything @ ₹128"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total slots per day (required)</label>
            <input
              type="number"
              min={1}
              value={form.limitPerDay}
              onChange={(e) => setForm((p) => ({ ...p, limitPerDay: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start time (optional)</label>
              <select
                value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {TIME_OPTIONS.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End time (optional)</label>
              <select
                value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {TIME_OPTIONS.map((o) => (
                  <option key={o.value || "empty2"} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session (optional)</label>
            <select
              value={form.session}
              onChange={(e) => setForm((p) => ({ ...p, session: e.target.value as "" | "LUNCH" | "DINNER" | "BOTH" }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Both</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update" : "Create"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {items.length === 0 && !formOpen ? (
          <p className="text-sm text-gray-500">No discounts yet. Create one to show in the booking flow.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{item.title}</div>
                {item.description && <div className="text-xs text-gray-600 mt-0.5">{item.description}</div>}
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs text-gray-500">{item.slotsLeft} left today</span>
                  {item.startTime && item.endTime && (
                    <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">{formatTime(item.startTime)}–{formatTime(item.endTime)}</span>
                  )}
                  {item.session && <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">{item.session}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded hover:bg-orange-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
