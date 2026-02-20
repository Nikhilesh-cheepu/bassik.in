"use client";

import { useState, useEffect, useCallback } from "react";

interface DiscountLimitItem {
  discountId: string;
  label: string;
  maxPerDay: number;
  used: number;
  available: boolean;
}

interface DiscountLimitsManagerProps {
  brandId: string;
  onUpdate?: () => void;
}

export default function DiscountLimitsManager({ brandId, onUpdate }: DiscountLimitsManagerProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<DiscountLimitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchLimits = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/discount-limits?date=${date}`);
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
  }, [brandId, date]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const handleSaveMax = async (discountId: string, maxPerDay: number) => {
    setSaving(discountId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/discount-limits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountId, maxPerDay }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Limit saved." });
        await fetchLimits();
        onUpdate?.();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Request failed" });
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (discountId: string | "all") => {
    setResetting(discountId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/venues/${brandId}/discount-limits/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          ...(discountId !== "all" ? { discountId } : {}),
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Usage reset for selected date." });
        await fetchLimits();
        onUpdate?.();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to reset" });
      }
    } catch {
      setMessage({ type: "error", text: "Request failed" });
    } finally {
      setResetting(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Reservation discount limits</h2>
        <p className="text-sm text-gray-600">
          No bookable discounts are configured for this venue. Discount options are defined per brand in the reservation flow.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Reservation discount limits</h2>
      <p className="text-sm text-gray-600">
        Set max redemptions per day per offer. When the limit is reached, that discount shows as &quot;Sold out&quot; in the reservation form. Use &quot;Reset&quot; to clear usage for a date (e.g. start of day).
      </p>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">View usage for date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.discountId}
            className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex-1 min-w-[180px]">
              <div className="font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                ID: {item.discountId}
                {!item.available && (
                  <span className="ml-2 text-amber-600 font-medium">Sold out for this date</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {item.used} / {item.maxPerDay <= 0 ? "∞" : item.maxPerDay} used
              </span>
              <input
                type="number"
                min={0}
                value={item.maxPerDay <= 0 ? "" : item.maxPerDay}
                onChange={(e) => {
                  const v = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                  setItems((prev) =>
                    prev.map((i) =>
                      i.discountId === item.discountId
                        ? { ...i, maxPerDay: isNaN(v) ? 0 : Math.max(0, v) }
                        : i
                    )
                  );
                }}
                onBlur={(e) => {
                  const v = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                  const num = isNaN(v) ? 0 : Math.max(0, v);
                  if (num !== item.maxPerDay) handleSaveMax(item.discountId, num);
                }}
                placeholder="∞"
                className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-xs text-gray-500">max/day</span>
            </div>
            <button
              type="button"
              onClick={() => handleSaveMax(item.discountId, item.maxPerDay)}
              disabled={saving === item.discountId}
              className="px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 disabled:opacity-50"
            >
              {saving === item.discountId ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => handleReset(item.discountId)}
              disabled={resetting !== null}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {resetting === item.discountId ? "Resetting..." : "Reset this date"}
            </button>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-gray-200">
        <button
          type="button"
          onClick={() => handleReset("all")}
          disabled={resetting !== null}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          {resetting === "all" ? "Resetting..." : "Reset all discounts for this date"}
        </button>
      </div>
    </div>
  );
}
