"use client";

import { useState } from "react";
import {
  defaultBaseUnit,
  formatInr,
  formatItemCostLabel,
  formatLiquorCostLabel,
  KIIK69_BOTTLE_SIZE_PRESETS_ML,
  KIIK69_ITEM_UNITS,
  KIIK69_STOCK_CATEGORIES,
  KIIK69_UNIT_NUMBER_PRESETS,
  type Kiik69QtyUnit,
  type Kiik69StockCategory,
} from "@/lib/kiik69-stock";
import { KIIK69_BTN, KIIK69_INPUT, KIIK69_SHEET_BODY, KIIK69_SHEET_OVERLAY, KIIK69_SHEET_PANEL_FLEX, Kiik69SheetPortal, kiik69FilterChip } from "./Kiik69Nav";

const FOOD_ITEM_UNITS = KIIK69_ITEM_UNITS.filter((u) => u.id === "g" || u.id === "kg" || u.id === "piece");

export default function Kiik69AddItemSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState<Kiik69StockCategory | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setCategory("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const saveItem = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kiik69accounts/stock/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Kiik69SheetPortal>
      <div className={KIIK69_SHEET_OVERLAY} onClick={handleClose} role="presentation">
        <div
          className={`${KIIK69_SHEET_PANEL_FLEX} max-w-md md:max-w-lg`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kiik69-add-item-title"
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
          <h2 id="kiik69-add-item-title" className="text-lg font-semibold">
            Add item
          </h2>
        <p className="mt-1 text-xs text-white/40">Step 1 — pick Food or Liquor.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {KIIK69_STOCK_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`min-h-[48px] rounded-xl border px-3 py-2.5 text-sm font-medium touch-manipulation ${
                category === c.id
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                  : "border-white/10 text-white/50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className={KIIK69_SHEET_BODY}>
          {!category ? (
            <p className="py-8 text-center text-sm text-white/35">Select Food or Liquor to continue</p>
          ) : category === "liquor" ? (
            <LiquorItemForm saving={saving} error={error} onSave={saveItem} />
          ) : (
            <FoodItemForm saving={saving} error={error} onSave={saveItem} />
          )}
        </div>
        </div>
      </div>
    </Kiik69SheetPortal>
  );
}

function LiquorItemForm({
  onSave,
  saving,
  error,
}: {
  onSave: (p: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [bottleSizeMl, setBottleSizeMl] = useState("750");
  const [costPerBottle, setCostPerBottle] = useState("");
  const [notes, setNotes] = useState("");
  const size = Number(bottleSizeMl) || 0;
  const cost = Number(costPerBottle) || 0;

  return (
    <div className="space-y-3 border-t border-white/[0.06] pt-4">
      <p className="text-[11px] text-amber-300/60">
        Tracked in ml · stock in by bottles · stock out by ml pours.
      </p>
      <label className="block">
        <span className="text-xs text-white/45">Item name</span>
        <input className={`${KIIK69_INPUT} mt-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kingfisher" />
      </label>
      <label className="block">
        <span className="text-xs text-white/45">Bottle size (ml)</span>
        <input className={`${KIIK69_INPUT} mt-1`} inputMode="decimal" value={bottleSizeMl} onChange={(e) => setBottleSizeMl(e.target.value)} />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {KIIK69_BOTTLE_SIZE_PRESETS_ML.map((n) => (
            <button key={n} type="button" onClick={() => setBottleSizeMl(String(n))} className={kiik69FilterChip(bottleSizeMl === String(n))}>
              {n}
            </button>
          ))}
        </div>
      </label>
      <label className="block">
        <span className="text-xs text-white/45">Cost per bottle (₹)</span>
        <input className={`${KIIK69_INPUT} mt-1`} inputMode="decimal" value={costPerBottle} onChange={(e) => setCostPerBottle(e.target.value)} />
      </label>
      {size > 0 && cost > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <p className="text-sm font-medium text-amber-50">{formatLiquorCostLabel(size, cost)}</p>
          <p className="mt-1 text-xs text-amber-200/80">60 ml pour ≈ {formatInr((cost / size) * 60)}</p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        disabled={saving || !name.trim() || size <= 0 || cost <= 0}
        onClick={() => void onSave({ category: "liquor", name, bottleSizeMl: size, costPerBottle: cost, notes })}
        className={`${KIIK69_BTN} min-h-[48px] w-full`}
      >
        {saving ? "Saving…" : "Save liquor item"}
      </button>
    </div>
  );
}

function FoodItemForm({
  onSave,
  saving,
  error,
}: {
  onSave: (p: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Kiik69QtyUnit>("g");
  const [unitNumber, setUnitNumber] = useState("100");
  const [totalCost, setTotalCost] = useState("");
  const presets = KIIK69_UNIT_NUMBER_PRESETS[unit] ?? [1];
  const unitNum = Number(unitNumber) || 0;
  const costNum = Number(totalCost) || 0;

  return (
    <div className="space-y-3 border-t border-white/[0.06] pt-4">
      <p className="text-[11px] text-amber-300/60">Tracked in grams · stock in/out in g or kg.</p>
      <label className="block">
        <span className="text-xs text-white/45">Item name</span>
        <input className={`${KIIK69_INPUT} mt-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Basmati rice" />
      </label>
      <label className="block">
        <span className="text-xs text-white/45">Unit</span>
        <select
          className={`${KIIK69_INPUT} mt-1`}
          value={unit}
          onChange={(e) => {
            const next = e.target.value as Kiik69QtyUnit;
            setUnit(next);
            const p = KIIK69_UNIT_NUMBER_PRESETS[next];
            if (p?.length) setUnitNumber(String(p[0]));
          }}
        >
          {FOOD_ITEM_UNITS.map((u) => (
            <option key={u.id} value={u.id}>{u.label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-white/45">Unit number</span>
        <input className={`${KIIK69_INPUT} mt-1`} inputMode="decimal" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {presets.map((n) => (
            <button key={n} type="button" onClick={() => setUnitNumber(String(n))} className={kiik69FilterChip(unitNumber === String(n))}>
              {n}
            </button>
          ))}
        </div>
      </label>
      <label className="block">
        <span className="text-xs text-white/45">Total cost (₹)</span>
        <input className={`${KIIK69_INPUT} mt-1`} inputMode="decimal" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
      </label>
      {unitNum > 0 && costNum > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <p className="text-sm font-medium text-amber-50">
            {formatItemCostLabel({ costInr: costNum, costBasisQty: unitNum, costBasisUnit: unit })}
          </p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="button"
        disabled={saving || !name.trim() || unitNum <= 0 || costNum <= 0}
        onClick={() =>
          void onSave({
            category: "food",
            name,
            baseUnit: defaultBaseUnit("food"),
            costBasisQty: unitNum,
            costBasisUnit: unit,
            costInr: costNum,
            notes: "",
          })
        }
        className={`${KIIK69_BTN} min-h-[48px] w-full`}
      >
        {saving ? "Saving…" : "Save food item"}
      </button>
    </div>
  );
}
