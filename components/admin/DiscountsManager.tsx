"use client";

import { useState, useEffect, useCallback } from "react";

type DiscountItem = {
  id: string;
  title: string;
  description: string;
  limitPerDay: number;
  startTime: string | null;
  endTime: string | null;
};

const TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = [{ value: "", label: "All day" }];
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    startTime: "" as string,
    endTime: "" as string,
    limitPerDay: 20,
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

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openEdit = (item: DiscountItem) => {
    setEditingId(item.id);
    setForm({
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
      limitPerDay: item.limitPerDay,
    });
    setMessage(null);
  };

  const closeEdit = () => {
    setEditingId(null);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      setMessage({ type: "error", text: "End time must be after start time" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/discounts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          startTime: form.startTime || null,
          endTime: form.endTime || null,
          limitPerDay: form.limitPerDay,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      setMessage({ type: "success", text: "Saved" });
      await fetchItems();
      onUpdate?.();
      closeEdit();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-[120px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-sm text-gray-500">No discounts for this venue.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Discounts</h2>
      <p className="text-xs text-gray-500">Edit time window and slots per day. Slots reset at midnight.</p>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3 border border-gray-200 rounded-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-gray-900">{item.title}</div>
                {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
              </div>
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded hover:bg-orange-100"
              >
                Edit
              </button>
            </div>

            {editingId === item.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start time</label>
                    <select
                      value={form.startTime}
                      onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    >
                      {TIME_OPTIONS.map((o) => (
                        <option key={o.value || "s"} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End time</label>
                    <select
                      value={form.endTime}
                      onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                    >
                      {TIME_OPTIONS.map((o) => (
                        <option key={o.value || "e"} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slots per day</label>
                  <input
                    type="number"
                    min={1}
                    value={form.limitPerDay}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, limitPerDay: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                    }
                    className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 rounded hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
