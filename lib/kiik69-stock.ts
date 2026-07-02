import type { Kiik69StockItem, Kiik69StockMovement } from "@prisma/client";
import { formatKiik69Timestamp } from "@/lib/kiik69-datetime";

export type Kiik69StockCategory = "food" | "liquor";
export type Kiik69StockDirection = "in" | "out";
export type Kiik69BaseUnit = "ml" | "g" | "piece";
export type Kiik69QtyUnit = "ml" | "l" | "g" | "kg" | "piece" | "bottle";

export const KIIK69_STOCK_CATEGORIES: { id: Kiik69StockCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "liquor", label: "Liquor" },
];

export const KIIK69_QTY_UNITS_FOOD: { id: Kiik69QtyUnit; label: string }[] = [
  { id: "g", label: "g" },
  { id: "kg", label: "kg" },
  { id: "piece", label: "piece" },
];

export const KIIK69_QTY_UNITS_LIQUOR_IN: { id: Kiik69QtyUnit; label: string }[] = [
  { id: "bottle", label: "bottles" },
  { id: "ml", label: "ml" },
  { id: "l", label: "litres (L)" },
];

export const KIIK69_QTY_UNITS_LIQUOR_OUT: { id: Kiik69QtyUnit; label: string }[] = [
  { id: "ml", label: "ml (pour)" },
  { id: "l", label: "litres (L)" },
  { id: "bottle", label: "full bottles" },
];

export const KIIK69_BOTTLE_SIZE_PRESETS_ML = [180, 375, 500, 650, 750, 1000];

export const KIIK69_QTY_UNITS_LIQUOR: { id: Kiik69QtyUnit; label: string }[] = [
  { id: "ml", label: "ml" },
  { id: "l", label: "L" },
  { id: "bottle", label: "bottle" },
  { id: "piece", label: "piece" },
];

export const KIIK69_COST_BASIS_UNITS_FOOD: { id: Kiik69QtyUnit; label: string }[] = [
  { id: "g", label: "per g" },
  { id: "kg", label: "per kg" },
  { id: "piece", label: "per piece" },
  { id: "bottle", label: "per bottle/pack" },
];

export const KIIK69_COST_BASIS_UNITS_LIQUOR: { id: Kiik69QtyUnit; label: string }[] = [
  { id: "ml", label: "per ml" },
  { id: "l", label: "per L" },
  { id: "bottle", label: "per bottle" },
  { id: "piece", label: "per piece" },
];

export type Kiik69StockItemDto = {
  id: string;
  name: string;
  category: Kiik69StockCategory;
  baseUnit: Kiik69BaseUnit;
  costBasisQty: number;
  costBasisUnit: Kiik69QtyUnit;
  costInr: number;
  bottleSizeBase: number | null;
  notes: string | null;
  remainingBase: number;
  remainingValueInr: number;
  createdAt: string;
  updatedAt: string;
};

export type Kiik69StockMovementDto = {
  id: string;
  itemId: string;
  itemName: string;
  direction: Kiik69StockDirection;
  category: Kiik69StockCategory;
  quantity: number;
  quantityUnit: Kiik69QtyUnit;
  quantityBase: number;
  costInr: number;
  movementDate: string | null;
  note: string | null;
  attachmentUrl: string | null;
  attachmentFileName: string | null;
  aiSummary: string | null;
  createdAt: string;
  /** Stock remaining immediately after this movement (computed). */
  remainingAfterBase?: number;
  remainingValueAfterInr?: number;
  itemBaseUnit?: Kiik69BaseUnit;
  itemBottleSizeBase?: number | null;
  itemCostBasisQty?: number;
  itemCostBasisUnit?: Kiik69QtyUnit;
  itemCostInr?: number;
};

export function defaultBaseUnit(category: Kiik69StockCategory): Kiik69BaseUnit {
  return category === "liquor" ? "ml" : "g";
}

export function qtyUnitsForCategory(category: Kiik69StockCategory): { id: Kiik69QtyUnit; label: string }[] {
  return category === "liquor" ? KIIK69_QTY_UNITS_LIQUOR : KIIK69_QTY_UNITS_FOOD;
}

export function qtyUnitsStockIn(category: Kiik69StockCategory): { id: Kiik69QtyUnit; label: string }[] {
  return category === "liquor" ? KIIK69_QTY_UNITS_LIQUOR_IN : KIIK69_QTY_UNITS_FOOD;
}

export function qtyUnitsStockOut(category: Kiik69StockCategory): { id: Kiik69QtyUnit; label: string }[] {
  return category === "liquor" ? KIIK69_QTY_UNITS_LIQUOR_OUT : KIIK69_QTY_UNITS_FOOD;
}

export function liquorBottleSizeMl(item: {
  bottleSizeBase: number | null;
  costBasisQty: number;
  costBasisUnit: string;
}): number {
  return bottleSizeForItem(item);
}

/** e.g. "2 bottles + 60 ml (1560 ml)" */
export function formatLiquorRemaining(item: Kiik69StockItemDto): string {
  const ml = item.remainingBase;
  const bottleMl = liquorBottleSizeMl(item);
  if (bottleMl <= 0) return formatStockQty(ml, "ml");
  const full = Math.floor(ml / bottleMl);
  const partial = Math.round((ml - full * bottleMl) * 10) / 10;
  if (ml <= 0) return "0 ml";
  if (full === 0) return `${partial} ml`;
  if (partial < 0.5) return `${full} bottle${full !== 1 ? "s" : ""} · ${ml} ml`;
  return `${full} bottle${full !== 1 ? "s" : ""} + ${partial} ml · ${ml} ml total`;
}

export function formatItemRemaining(item: Kiik69StockItemDto): string {
  if (item.category === "liquor") return formatLiquorRemaining(item);
  return formatStockQty(item.remainingBase, item.baseUnit);
}

export function formatLiquorCostLabel(bottleSizeMl: number, costPerBottle: number): string {
  return `${formatInr(costPerBottle)} per ${bottleSizeMl} ml bottle`;
}

export function costBasisUnitsForCategory(category: Kiik69StockCategory): { id: Kiik69QtyUnit; label: string }[] {
  return category === "liquor" ? KIIK69_COST_BASIS_UNITS_LIQUOR : KIIK69_COST_BASIS_UNITS_FOOD;
}

function num(v: unknown): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

export function bottleSizeForItem(item: {
  bottleSizeBase: unknown;
  costBasisQty: unknown;
  costBasisUnit: string;
}): number {
  const stored = item.bottleSizeBase != null ? num(item.bottleSizeBase) : 0;
  if (stored > 0) return stored;
  if (item.costBasisUnit === "bottle") return num(item.costBasisQty);
  if (item.costBasisUnit === "ml" || item.costBasisUnit === "l") return num(item.costBasisQty);
  return num(item.costBasisQty) || 1;
}

/** Convert entered quantity to item base unit (ml, g, or piece). */
export function toBaseQuantity(
  qty: number,
  unit: Kiik69QtyUnit,
  item: {
    baseUnit: string;
    costBasisQty: unknown;
    costBasisUnit: string;
    bottleSizeBase: unknown;
  }
): number {
  const q = Math.max(0, qty);
  const base = item.baseUnit as Kiik69BaseUnit;

  if (unit === "bottle") {
    return q * bottleSizeForItem(item);
  }
  if (unit === base) return q;
  if (unit === "l" && base === "ml") return q * 1000;
  if (unit === "ml" && base === "ml") return q;
  if (unit === "kg" && base === "g") return q * 1000;
  if (unit === "g" && base === "g") return q;
  if (unit === "piece" && base === "piece") return q;
  return q;
}

/** Cost basis amount expressed in base units. */
export function costBasisInBase(item: {
  baseUnit: string;
  costBasisQty: unknown;
  costBasisUnit: string;
  bottleSizeBase: unknown;
}): number {
  return toBaseQuantity(num(item.costBasisQty), item.costBasisUnit as Kiik69QtyUnit, item);
}

/** INR cost for a quantity in base units. */
export function costForBaseQty(
  baseQty: number,
  item: { costInr: unknown; costBasisQty: unknown; costBasisUnit: string; baseUnit: string; bottleSizeBase: unknown }
): number {
  const basis = costBasisInBase(item);
  if (basis <= 0) return 0;
  const rate = num(item.costInr) / basis;
  return Math.round(baseQty * rate * 100) / 100;
}

export function formatStockQty(baseQty: number, baseUnit: Kiik69BaseUnit): string {
  if (baseUnit === "ml") {
    if (baseQty >= 1000) return `${(baseQty / 1000).toFixed(2)} L`;
    return `${baseQty.toFixed(baseQty % 1 ? 1 : 0)} ml`;
  }
  if (baseUnit === "g") {
    if (baseQty >= 1000) return `${(baseQty / 1000).toFixed(2)} kg`;
    return `${baseQty.toFixed(baseQty % 1 ? 1 : 0)} g`;
  }
  return `${baseQty.toFixed(0)} pcs`;
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

export function formatItemCostLabel(item: {
  costInr: number;
  costBasisQty: number;
  costBasisUnit: string;
}): string {
  const q = item.costBasisQty;
  const u = item.costBasisUnit;
  if (q === 1 && (u === "bottle" || u === "piece")) {
    return `${formatInr(item.costInr)} per ${u}`;
  }
  return `${formatInr(item.costInr)} for ${q} ${u}`;
}

/** Units when defining an item's cost basis. */
export const KIIK69_ITEM_UNITS: { id: Kiik69QtyUnit; label: string }[] = [
  { id: "g", label: "grams (g)" },
  { id: "kg", label: "kilograms (kg)" },
  { id: "ml", label: "millilitres (ml)" },
  { id: "l", label: "litres (L)" },
  { id: "bottle", label: "bottle" },
  { id: "piece", label: "piece" },
];

export const KIIK69_UNIT_NUMBER_PRESETS: Record<string, number[]> = {
  g: [50, 100, 200, 500, 1000],
  kg: [1, 2, 5],
  ml: [50, 60, 100, 200, 750],
  l: [1],
  bottle: [1],
  piece: [1],
};


export function toKiik69StockItemDto(
  item: Kiik69StockItem,
  movements: Pick<Kiik69StockMovement, "direction" | "quantityBase" | "costInr">[]
): Kiik69StockItemDto {
  let remainingBase = 0;
  let valueIn = 0;
  let valueOut = 0;
  for (const m of movements) {
    const b = num(m.quantityBase);
    const c = num(m.costInr);
    if (m.direction === "in") {
      remainingBase += b;
      valueIn += c;
    } else {
      remainingBase -= b;
      valueOut += c;
    }
  }
  remainingBase = Math.max(0, Math.round(remainingBase * 10000) / 10000);
  const remainingValueInr = Math.max(0, Math.round((valueIn - valueOut) * 100) / 100);

  return {
    id: item.id,
    name: item.name,
    category: item.category as Kiik69StockCategory,
    baseUnit: item.baseUnit as Kiik69BaseUnit,
    costBasisQty: num(item.costBasisQty),
    costBasisUnit: item.costBasisUnit as Kiik69QtyUnit,
    costInr: num(item.costInr),
    bottleSizeBase: item.bottleSizeBase != null ? num(item.bottleSizeBase) : null,
    notes: item.notes,
    remainingBase,
    remainingValueInr,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toKiik69StockMovementDto(
  row: Kiik69StockMovement & { item: { name: string } }
): Kiik69StockMovementDto {
  return {
    id: row.id,
    itemId: row.itemId,
    itemName: row.item.name,
    direction: row.direction as Kiik69StockDirection,
    category: row.category as Kiik69StockCategory,
    quantity: num(row.quantity),
    quantityUnit: row.quantityUnit as Kiik69QtyUnit,
    quantityBase: num(row.quantityBase),
    costInr: num(row.costInr),
    movementDate: row.movementDate,
    note: row.note,
    attachmentUrl: row.attachmentUrl,
    attachmentFileName: row.attachmentFileName,
    aiSummary: row.aiSummary,
    createdAt: row.createdAt.toISOString(),
  };
}

type MovementBalanceInput = {
  id: string;
  itemId: string;
  direction: Kiik69StockDirection;
  quantityBase: number;
  costInr: number;
  createdAt: string;
};

/** Running stock + value after each movement (chronological per item). */
export function computeMovementBalances(
  movements: MovementBalanceInput[]
): Map<string, { remainingAfterBase: number; remainingValueAfterInr: number }> {
  const byItem = new Map<string, MovementBalanceInput[]>();
  for (const m of movements) {
    const list = byItem.get(m.itemId) ?? [];
    list.push(m);
    byItem.set(m.itemId, list);
  }

  const result = new Map<string, { remainingAfterBase: number; remainingValueAfterInr: number }>();

  for (const list of byItem.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    let base = 0;
    let value = 0;
    for (const m of list) {
      const q = m.quantityBase;
      const c = m.costInr;
      if (m.direction === "in") {
        base += q;
        value += c;
      } else {
        base -= q;
        value -= c;
      }
      base = Math.max(0, Math.round(base * 10000) / 10000);
      value = Math.max(0, Math.round(value * 100) / 100);
      result.set(m.id, { remainingAfterBase: base, remainingValueAfterInr: value });
    }
  }
  return result;
}

export function enrichStockMovementDto(
  dto: Kiik69StockMovementDto,
  balance: { remainingAfterBase: number; remainingValueAfterInr: number } | undefined,
  item: {
    baseUnit: string;
    bottleSizeBase: unknown;
    costBasisQty: unknown;
    costBasisUnit: string;
    costInr: unknown;
  } | null
): Kiik69StockMovementDto {
  if (!balance || !item) return dto;
  return {
    ...dto,
    remainingAfterBase: balance.remainingAfterBase,
    remainingValueAfterInr: balance.remainingValueAfterInr,
    itemBaseUnit: item.baseUnit as Kiik69BaseUnit,
    itemBottleSizeBase: item.bottleSizeBase != null ? num(item.bottleSizeBase) : null,
    itemCostBasisQty: num(item.costBasisQty),
    itemCostBasisUnit: item.costBasisUnit as Kiik69QtyUnit,
    itemCostInr: num(item.costInr),
  };
}

export function formatMovementRemainingAfter(m: Kiik69StockMovementDto): string {
  if (m.remainingAfterBase == null) return "—";
  return formatItemRemaining({
    id: m.itemId,
    name: m.itemName,
    category: m.category,
    baseUnit: m.itemBaseUnit ?? (m.category === "liquor" ? "ml" : "g"),
    costBasisQty: m.itemCostBasisQty ?? 1,
    costBasisUnit: m.itemCostBasisUnit ?? (m.category === "liquor" ? "ml" : "g"),
    costInr: m.itemCostInr ?? 0,
    bottleSizeBase: m.itemBottleSizeBase ?? null,
    notes: null,
    remainingBase: m.remainingAfterBase,
    remainingValueInr: m.remainingValueAfterInr ?? 0,
    createdAt: m.createdAt,
    updatedAt: m.createdAt,
  });
}

export function formatMovementQty(m: Kiik69StockMovementDto): string {
  const u = m.quantityUnit;
  const q = m.quantity;
  if (u === "bottle") return `${q} bottle${q !== 1 ? "s" : ""}`;
  if (u === "ml" || u === "g" || u === "piece") return `${q} ${u}`;
  if (u === "l") return `${q} L`;
  if (u === "kg") return `${q} kg`;
  return `${q} ${u}`;
}

const IST = "Asia/Kolkata";

export function movementDisplayDate(m: Kiik69StockMovementDto): string {
  return m.movementDate ?? m.createdAt.slice(0, 10);
}

export function formatMovementTime(iso: string, movementDate?: string | null): string {
  return formatKiik69Timestamp(iso, movementDate);
}

export function movementDateGroupKey(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "Earlier";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: IST });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: IST });
  if (ymd === today) return "Today";
  if (ymd === yesterday) return "Yesterday";
  return new Date(ymd + "T12:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: ymd.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined,
  });
}

export function groupMovementsByDate(movements: Kiik69StockMovementDto[]): { label: string; items: Kiik69StockMovementDto[] }[] {
  const map = new Map<string, Kiik69StockMovementDto[]>();
  for (const m of movements) {
    const key = movementDateGroupKey(movementDisplayDate(m));
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  const order = ["Today", "Yesterday"];
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      const ad = movements.find((m) => movementDateGroupKey(movementDisplayDate(m)) === a)?.createdAt ?? "";
      const bd = movements.find((m) => movementDateGroupKey(movementDisplayDate(m)) === b)?.createdAt ?? "";
      return bd.localeCompare(ad);
    })
    .map(([label, items]) => ({ label, items }));
}

export function parseStockItemPayload(body: unknown): {
  name: string;
  category: Kiik69StockCategory;
  baseUnit: Kiik69BaseUnit;
  costBasisQty: number;
  costBasisUnit: Kiik69QtyUnit;
  costInr: number;
  bottleSizeBase: number | null;
  notes: string | null;
} {
  const b = body as Record<string, unknown>;
  const category = b.category === "liquor" ? "liquor" : "food";
  if (category !== "liquor" && category !== "food") {
    throw new Error("Select Food or Liquor");
  }

  // Liquor: bottle size + cost per bottle (tracks everything in ml)
  if (category === "liquor" && (b.bottleSizeMl != null || b.costPerBottle != null)) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) throw new Error("Item name is required");
    const bottleSizeMl = num(b.bottleSizeMl);
    const costPerBottle = num(b.costPerBottle);
    if (bottleSizeMl <= 0) throw new Error("Bottle size (ml) is required");
    if (costPerBottle < 0) throw new Error("Cost must be zero or more");
    return {
      name,
      category: "liquor",
      baseUnit: "ml",
      costBasisQty: bottleSizeMl,
      costBasisUnit: "ml",
      costInr: costPerBottle,
      bottleSizeBase: bottleSizeMl,
      notes: typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null,
    };
  }

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) throw new Error("Item name is required");

  const baseUnit = (b.baseUnit === "piece" ? "piece" : b.baseUnit === "g" ? "g" : "ml") as Kiik69BaseUnit;
  if (category === "food" && baseUnit !== "g" && baseUnit !== "piece") {
    throw new Error("Food items must use grams (g) or piece");
  }
  if (category === "liquor" && baseUnit !== "ml") {
    throw new Error("Liquor items must use ml");
  }

  const costBasisQty = num(b.costBasisQty);
  if (costBasisQty <= 0) throw new Error("Cost basis quantity must be greater than 0");

  const costBasisUnit = (typeof b.costBasisUnit === "string" ? b.costBasisUnit : baseUnit === "ml" ? "ml" : "g") as Kiik69QtyUnit;
  const costInr = num(b.costInr);
  if (costInr < 0) throw new Error("Cost must be zero or more");

  let bottleSizeBase: number | null = b.bottleSizeBase != null && String(b.bottleSizeBase).trim() !== "" ? num(b.bottleSizeBase) : null;
  if (costBasisUnit === "bottle" && !bottleSizeBase && baseUnit === "ml") {
    bottleSizeBase = costBasisQty;
  }

  return {
    name,
    category,
    baseUnit,
    costBasisQty,
    costBasisUnit,
    costInr,
    bottleSizeBase,
    notes: typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null,
  };
}

export function parseStockMovementPayload(
  body: unknown,
  item: Kiik69StockItem
): {
  direction: Kiik69StockDirection;
  quantity: number;
  quantityUnit: Kiik69QtyUnit;
  quantityBase: number;
  costInr: number;
  movementDate: string | null;
  note: string | null;
  attachmentUrl: string | null;
  attachmentFileName: string | null;
  aiSummary: string | null;
} {
  const b = body as Record<string, unknown>;
  const direction = b.direction === "out" ? "out" : "in";
  const quantity = num(b.quantity);
  if (quantity <= 0) throw new Error("Quantity must be greater than 0");

  const quantityUnit = (typeof b.quantityUnit === "string" ? b.quantityUnit : item.baseUnit) as Kiik69QtyUnit;
  const quantityBase = toBaseQuantity(quantity, quantityUnit, item);

  if (direction === "out") {
    // checked at API layer against remaining
  }

  const costInr = costForBaseQty(quantityBase, item);
  const movementDate =
    typeof b.movementDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.movementDate) ? b.movementDate : null;

  return {
    direction,
    quantity,
    quantityUnit,
    quantityBase,
    costInr,
    movementDate,
    note: typeof b.note === "string" && b.note.trim() ? b.note.trim() : null,
    attachmentUrl: typeof b.attachmentUrl === "string" ? b.attachmentUrl : null,
    attachmentFileName: typeof b.attachmentFileName === "string" ? b.attachmentFileName : null,
    aiSummary: typeof b.aiSummary === "string" && b.aiSummary.trim() ? b.aiSummary.trim() : null,
  };
}
