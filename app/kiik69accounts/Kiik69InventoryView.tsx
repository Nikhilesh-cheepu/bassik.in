"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TeamDatePicker } from "@/app/team/TeamDatePicker";
import {
  formatInr,
  formatItemCostLabel,
  formatItemRemaining,
  formatLiquorCostLabel,
  formatMovementQty,
  formatMovementRemainingAfter,
  formatMovementTime,
  groupMovementsByDate,
  liquorBottleSizeMl,
  qtyUnitsStockIn,
  qtyUnitsStockOut,
  type Kiik69QtyUnit,
  type Kiik69StockCategory,
  type Kiik69StockDirection,
  type Kiik69StockItemDto,
  type Kiik69StockMovementDto,
} from "@/lib/kiik69-stock";
import Kiik69AddItemSheet from "./Kiik69AddItemSheet";
import Kiik69InventoryInsights from "./Kiik69InventoryInsights";
import {
  KIIK69_BTN,
  KIIK69_INPUT,
  KIIK69_SHEET_OVERLAY,
  KIIK69_SHEET_PANEL,
  Kiik69SheetPortal,
} from "./Kiik69Nav";

type StockTab = "in" | "out";
type InventoryPane = "onhand" | "history";

const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function PillToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div role="group" className="inline-flex shrink-0 rounded-full bg-white/[0.04] p-0.5 ring-1 ring-white/[0.08]">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition touch-manipulation ${
              active ? "bg-amber-500 text-stone-950 shadow-sm" : "text-white/45 hover:text-white/65"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SegmentSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; hint?: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Inventory view"
      className="flex w-full rounded-full bg-white/[0.04] p-0.5 ring-1 ring-white/[0.08]"
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`min-h-[40px] flex-1 rounded-full px-2 py-2 text-center text-xs font-semibold transition touch-manipulation ${
              active ? "bg-amber-500 text-stone-950 shadow-sm" : "text-white/45 hover:text-white/65"
            }`}
          >
            <span className="block">{o.label}</span>
            {o.hint ? (
              <span className={`mt-0.5 block text-[10px] font-normal ${active ? "text-stone-800/70" : "text-white/30"}`}>
                {o.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function Kiik69InventoryView({
  category,
  stockTab,
  onCategoryChange,
  onStockTabChange,
  addItemSignal = 0,
  stockSignal = 0,
  onAskAi,
}: {
  category: Kiik69StockCategory;
  stockTab: StockTab;
  onCategoryChange: (category: Kiik69StockCategory) => void;
  onStockTabChange: (tab: StockTab) => void;
  addItemSignal?: number;
  stockSignal?: number;
  onAskAi?: (prompt: string) => void;
}) {
  const [items, setItems] = useState<Kiik69StockItemDto[]>([]);
  const [movements, setMovements] = useState<Kiik69StockMovementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteItem, setDeleteItem] = useState<Kiik69StockItemDto | null>(null);
  const [showClearHistory, setShowClearHistory] = useState(false);
  const [pane, setPane] = useState<InventoryPane>("onhand");

  const direction: Kiik69StockDirection = stockTab === "in" ? "in" : "out";

  const load = useCallback(async () => {
    setError(null);
    try {
      const [itemsRes, movRes] = await Promise.all([
        fetch(`/api/kiik69accounts/stock/items?category=${category}`),
        fetch(`/api/kiik69accounts/stock/movements?category=${category}&direction=${direction}`),
      ]);
      const itemsData = await itemsRes.json();
      const movData = await movRes.json();
      if (!itemsRes.ok) throw new Error(itemsData.error || "Could not load items");
      if (!movRes.ok) throw new Error(movData.error || "Could not load movements");
      setItems(itemsData.items ?? []);
      setMovements(movData.movements ?? []);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [category, direction]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (addItemSignal > 0) setShowAddItem(true);
  }, [addItemSignal]);

  useEffect(() => {
    if (stockSignal > 0) setShowMoveForm(true);
  }, [stockSignal]);

  useEffect(() => {
    if (!showAddItem && !showMoveForm && !deleteItem && !showClearHistory) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showAddItem, showMoveForm, deleteItem, showClearHistory]);

  const removeItem = async (item: Kiik69StockItemDto) => {
    const res = await fetch(`/api/kiik69accounts/stock/items/${item.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not remove item");
    setDeleteItem(null);
    await load();
  };

  const clearHistory = async (deletePassword: string, scope: "tab" | "category") => {
    const res = await fetch("/api/kiik69accounts/stock/movements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deletePassword,
        category,
        ...(scope === "tab" ? { direction } : { scope: "category" }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not clear history");
    setShowClearHistory(false);
    await load();
  };

  const stockOutTotals = useMemo(() => {
    if (direction !== "out") return null;
    const usedBase = movements.reduce((s, m) => s + m.quantityBase, 0);
    const usedCost = movements.reduce((s, m) => s + m.costInr, 0);
    return { count: movements.length, usedBase, usedCost };
  }, [direction, movements]);

  const historyLabel = stockTab === "in" ? "Stock in" : "Stock out";
  const totalOnHand = useMemo(() => items.reduce((s, i) => s + i.remainingValueInr, 0), [items]);

  return (
    <div className="space-y-4 pb-2">
      {onAskAi ? (
        <Kiik69InventoryInsights onAskAi={onAskAi} refreshKey={refreshKey} categoryFilter={category} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PillToggle
            value={category}
            options={[
              { id: "liquor", label: "Liquor" },
              { id: "food", label: "Food" },
            ]}
            onChange={onCategoryChange}
          />
          <PillToggle
            value={stockTab}
            options={[
              { id: "in", label: "In" },
              { id: "out", label: "Out" },
            ]}
            onChange={onStockTabChange}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddItem(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/75 touch-manipulation transition hover:bg-white/[0.07]"
        >
          <span className="text-sm leading-none text-amber-400">+</span>
          Item
        </button>
      </div>

      <SegmentSwitch
        value={pane}
        options={[
          {
            id: "onhand",
            label: "On hand",
            hint: loading ? "…" : `${items.length} · ${formatInr(totalOnHand)}`,
          },
          {
            id: "history",
            label: historyLabel,
            hint: loading ? "…" : `${movements.length} entries`,
          },
        ]}
        onChange={setPane}
      />

      {error ? (
        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{error}</p>
      ) : null}

      {loading ? (
        <div className="space-y-3 py-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <>
          {pane === "onhand" ? (
            <OnHandSection items={items} category={category} onDelete={setDeleteItem} />
          ) : (
            <>
              {direction === "out" && stockOutTotals && stockOutTotals.count > 0 ? (
                <StockOutSummary totals={stockOutTotals} category={category} />
              ) : null}
              <MovementsTimeline
                movements={movements}
                direction={direction}
                category={category}
                onClearHistory={() => setShowClearHistory(true)}
              />
            </>
          )}
        </>
      )}

      <div className="hidden pt-1 xl:block">
        <button
          type="button"
          onClick={() => setShowMoveForm(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:brightness-105"
        >
          <span className="text-lg leading-none">+</span>
          {stockTab === "in" ? "Stock in" : "Stock out"}
        </button>
      </div>

      <Kiik69AddItemSheet open={showAddItem} onClose={() => setShowAddItem(false)} onSaved={load} />

      {showMoveForm ? (
        <MovementFormSheet
          key={`${category}-${direction}`}
          category={category}
          direction={direction}
          items={items}
          onClose={() => setShowMoveForm(false)}
          onSaved={load}
        />
      ) : null}

      {deleteItem ? (
        <DeleteItemSheet
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={() => removeItem(deleteItem)}
        />
      ) : null}

      {showClearHistory ? (
        <ClearHistorySheet
          category={category}
          direction={direction}
          onClose={() => setShowClearHistory(false)}
          onConfirm={clearHistory}
        />
      ) : null}
    </div>
  );
}

function DeleteItemSheet({
  item,
  onClose,
  onConfirm,
}: {
  item: Kiik69StockItemDto;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Kiik69SheetPortal>
      <div className={KIIK69_SHEET_OVERLAY} onClick={onClose} role="presentation">
        <div className={`${KIIK69_SHEET_PANEL} max-w-sm`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <h2 className="text-lg font-semibold">Remove item?</h2>
          <p className="mt-2 text-sm text-white/55">
            <span className="font-medium text-white/80">{item.name}</span> will disappear from on-hand. Stock in &amp; out
            history stays until you clear it with password <span className="text-white/70">9550</span>.
          </p>
          {err ? <p className="mt-3 text-sm text-red-300">{err}</p> : null}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose} className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setErr(null);
                void onConfirm()
                  .catch((e) => setErr(e instanceof Error ? e.message : "Failed"))
                  .finally(() => setBusy(false));
              }}
              className="min-h-[48px] flex-1 rounded-xl bg-red-500/90 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Removing…" : "Remove item"}
            </button>
          </div>
        </div>
      </div>
    </Kiik69SheetPortal>
  );
}

function ClearHistorySheet({
  category,
  direction,
  onClose,
  onConfirm,
}: {
  category: Kiik69StockCategory;
  direction: Kiik69StockDirection;
  onClose: () => void;
  onConfirm: (password: string, scope: "tab" | "category") => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [scope, setScope] = useState<"tab" | "category">("tab");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tabLabel = direction === "in" ? "stock in" : "stock out";

  return (
    <Kiik69SheetPortal>
      <div className={KIIK69_SHEET_OVERLAY} onClick={onClose} role="presentation">
        <div className={`${KIIK69_SHEET_PANEL} max-w-sm`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <h2 className="text-lg font-semibold">Clear history</h2>
          <p className="mt-1 text-xs text-white/40">For learning / reset — cannot be undone.</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setScope("tab")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                scope === "tab" ? "bg-amber-500 text-stone-950" : "bg-white/[0.06] text-white/50"
              }`}
            >
              This tab ({tabLabel})
            </button>
            <button
              type="button"
              onClick={() => setScope("category")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                scope === "category" ? "bg-amber-500 text-stone-950" : "bg-white/[0.06] text-white/50"
              }`}
            >
              All {category} history
            </button>
          </div>

          <label className="mt-4 block">
            <span className="text-xs text-white/45">Delete password</span>
            <input
              type="password"
              inputMode="numeric"
              className={`${KIIK69_INPUT} mt-1`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="9550"
              autoComplete="off"
            />
          </label>

          {err ? <p className="mt-3 text-sm text-red-300">{err}</p> : null}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose} className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !password.trim()}
              onClick={() => {
                setBusy(true);
                setErr(null);
                void onConfirm(password, scope)
                  .catch((e) => setErr(e instanceof Error ? e.message : "Failed"))
                  .finally(() => setBusy(false));
              }}
              className="min-h-[48px] flex-1 rounded-xl bg-red-500/90 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Clearing…" : "Clear"}
            </button>
          </div>
        </div>
      </div>
    </Kiik69SheetPortal>
  );
}

function OnHandSection({
  items,
  category,
  onDelete,
}: {
  items: Kiik69StockItemDto[];
  category: Kiik69StockCategory;
  onDelete: (item: Kiik69StockItemDto) => void;
}) {
  const totalValue = items.reduce((s, i) => s + i.remainingValueInr, 0);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
        <p className="text-sm text-white/50">No {category} items yet</p>
        <p className="mt-1 text-xs text-white/30">Tap Add item to create your first SKU</p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-2.5 flex items-end justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/35">On hand</h3>
        <p className="text-xs text-white/40">
          {items.length} item{items.length !== 1 ? "s" : ""} · <span className="font-medium text-emerald-300/90">{formatInr(totalValue)}</span>
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const pct =
            item.remainingValueInr > 0 && totalValue > 0
              ? Math.min(100, Math.round((item.remainingValueInr / totalValue) * 100))
              : 0;
          return (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#12121a] to-[#0c0c12] p-3.5 ring-1 ring-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-white">{item.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/38">
                    {item.category === "liquor"
                      ? formatLiquorCostLabel(liquorBottleSizeMl(item), item.costInr)
                      : formatItemCostLabel(item)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-amber-200">{formatItemRemaining(item)}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-emerald-300/85">{formatInr(item.remainingValueInr)}</p>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="mt-2 text-[10px] font-medium text-red-300/70 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {pct > 0 ? (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500/80 to-orange-400/70" style={{ width: `${pct}%` }} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StockOutSummary({
  totals,
  category,
}: {
  totals: { count: number; usedBase: number; usedCost: number };
  category: Kiik69StockCategory;
}) {
  const unit = category === "liquor" ? "ml" : "g";
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="rounded-2xl bg-[#0e0e14] px-3.5 py-3 ring-1 ring-white/[0.06]">
        <p className="text-[10px] uppercase tracking-wide text-white/35">Entries</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-white">{totals.count}</p>
      </div>
      <div className="rounded-2xl bg-[#0e0e14] px-3.5 py-3 ring-1 ring-orange-500/15">
        <p className="text-[10px] uppercase tracking-wide text-white/35">Total used</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-orange-200">
          {totals.usedBase >= 1000 && category === "liquor"
            ? `${(totals.usedBase / 1000).toFixed(2)} L`
            : `${totals.usedBase.toFixed(0)} ${unit}`}
        </p>
      </div>
      <div className="col-span-2 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 px-3.5 py-3 ring-1 ring-orange-500/20 sm:col-span-1">
        <p className="text-[10px] uppercase tracking-wide text-white/35">Cost used</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-orange-300">{formatInr(totals.usedCost)}</p>
      </div>
    </div>
  );
}

function MovementsTimeline({
  movements,
  direction,
  category,
  onClearHistory,
}: {
  movements: Kiik69StockMovementDto[];
  direction: Kiik69StockDirection;
  category: Kiik69StockCategory;
  onClearHistory: () => void;
}) {
  const groups = groupMovementsByDate(movements);

  if (movements.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
        <p className="text-sm text-white/45">No {category} {direction === "in" ? "stock in" : "stock out"} yet</p>
        <p className="mt-1 text-xs text-white/28">Use the + button to record your first entry</p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onClearHistory}
          className="text-[10px] font-medium text-red-300/60 hover:text-red-300"
        >
          Clear history…
        </button>
      </div>
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 sticky top-0 z-[1] inline-flex rounded-full bg-[#06060a]/90 px-2.5 py-1 text-[11px] font-semibold text-white/50 backdrop-blur-sm">
              {group.label}
            </p>
            <ul className="space-y-2">
              {group.items.map((m) =>
                direction === "out" ? (
                  <StockOutCard key={m.id} movement={m} />
                ) : (
                  <StockInCard key={m.id} movement={m} />
                )
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function StockOutCard({ movement: m }: { movement: Kiik69StockMovementDto }) {
  return (
    <li className="overflow-hidden rounded-2xl bg-[#0e0e14] ring-1 ring-white/[0.07]">
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white">{m.itemName}</p>
          <p className="mt-0.5 text-xs text-orange-300/90">
            Used <span className="font-semibold">{formatMovementQty(m)}</span>
            <span className="text-white/30"> · </span>
            {formatMovementTime(m.createdAt)}
          </p>
          {m.note ? <p className="mt-1 text-[11px] text-white/38">{m.note}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums text-orange-300">−{formatInr(m.costInr)}</p>
          <p className="mt-0.5 text-[10px] text-white/30">cost used</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
        <div className="bg-[#0e0e14] px-3.5 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/32">Stock left</p>
          <p className="mt-0.5 text-xs font-medium text-amber-200/95">{formatMovementRemainingAfter(m)}</p>
        </div>
        <div className="bg-[#0e0e14] px-3.5 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/32">Value left</p>
          <p className="mt-0.5 text-xs font-medium tabular-nums text-emerald-300/90">
            {m.remainingValueAfterInr != null ? formatInr(m.remainingValueAfterInr) : "—"}
          </p>
        </div>
      </div>
    </li>
  );
}

function StockInCard({ movement: m }: { movement: Kiik69StockMovementDto }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl bg-[#0e0e14] px-3.5 py-3 ring-1 ring-white/[0.07]">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-white">{m.itemName}</p>
        <p className="mt-0.5 text-xs text-white/45">
          +{formatMovementQty(m)}
          <span className="text-white/25"> · </span>
          {formatMovementTime(m.createdAt)}
        </p>
        {m.note ? <p className="mt-1 text-[11px] text-white/35">{m.note}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-emerald-300">+{formatInr(m.costInr)}</p>
        {m.remainingValueAfterInr != null ? (
          <p className="mt-0.5 text-[10px] text-white/32">bal {formatInr(m.remainingValueAfterInr)}</p>
        ) : null}
      </div>
    </li>
  );
}

function MovementFormSheet({
  category,
  direction,
  items,
  onClose,
  onSaved,
}: {
  category: Kiik69StockCategory;
  direction: Kiik69StockDirection;
  items: Kiik69StockItemDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const unitOptions = direction === "in" ? qtyUnitsStockIn(category) : qtyUnitsStockOut(category);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState<Kiik69QtyUnit>(
    category === "liquor" ? (direction === "in" ? "bottle" : "ml") : "g"
  );
  const [movementDate, setMovementDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = items.find((i) => i.id === itemId);

  useEffect(() => {
    setQuantityUnit(category === "liquor" ? (direction === "in" ? "bottle" : "ml") : "g");
    setItemId(items[0]?.id ?? "");
  }, [category, direction, items]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/kiik69accounts/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          category,
          direction,
          quantity: Number(quantity),
          quantityUnit,
          movementDate,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Kiik69SheetPortal>
      <div className={KIIK69_SHEET_OVERLAY} onClick={onClose} role="presentation">
        <div
          className={`${KIIK69_SHEET_PANEL} max-w-md`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
          <h2 className="text-lg font-semibold capitalize">
            {category} · stock {direction === "in" ? "in" : "out"}
          </h2>
          {category === "liquor" ? (
            <p className="mt-1 text-xs text-white/40">
              {direction === "in" ? "Bottles or ml" : "Pours in ml (e.g. 60)"}
            </p>
          ) : null}

          {items.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">Add a {category} item first.</p>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs text-white/45">Item</span>
                <select className={`${KIIK69_INPUT} mt-1`} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({formatItemRemaining(i)})
                    </option>
                  ))}
                </select>
              </label>
              {selected ? (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/50">
                  <div className="flex justify-between gap-2">
                    <span>On hand</span>
                    <span className="font-medium text-amber-200/90">{formatItemRemaining(selected)}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-2">
                    <span>Value</span>
                    <span className="font-medium text-emerald-300/85">{formatInr(selected.remainingValueInr)}</span>
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs text-white/45">Qty</span>
                  <input
                    className={`${KIIK69_INPUT} mt-1`}
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={direction === "out" && category === "liquor" ? "60" : "1"}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-white/45">Unit</span>
                  <select
                    className={`${KIIK69_INPUT} mt-1`}
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value as Kiik69QtyUnit)}
                  >
                    {unitOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-white/45">Date</span>
                <div className="mt-1">
                  <TeamDatePicker value={movementDate} onChange={setMovementDate} compact accent="amber" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-white/45">Note</span>
                <input className={`${KIIK69_INPUT} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </div>
          )}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || items.length === 0 || !quantity.trim()}
              onClick={() => void save()}
              className={`${KIIK69_BTN} min-h-[48px] flex-1 rounded-xl`}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Kiik69SheetPortal>
  );
}
