import type { Kiik69StockItem, Kiik69StockMovement } from "@prisma/client";
import {
  formatInr,
  formatItemRemaining,
  liquorBottleSizeMl,
  toKiik69StockItemDto,
  type Kiik69StockCategory,
  type Kiik69StockItemDto,
} from "@/lib/kiik69-stock";

export type Kiik69StockAlertSeverity = "critical" | "warning";

export type Kiik69StockAlert = {
  id: string;
  severity: Kiik69StockAlertSeverity;
  category: Kiik69StockCategory;
  itemId: string;
  itemName: string;
  message: string;
  remainingLabel: string;
};

export type Kiik69StockStats = {
  foodValueInr: number;
  liquorValueInr: number;
  totalValueInr: number;
  foodItems: number;
  liquorItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayStockInCost: number;
  todayStockOutCost: number;
  alerts: Kiik69StockAlert[];
  topItems: { name: string; category: Kiik69StockCategory; valueInr: number; remainingLabel: string }[];
};

const IST = "Asia/Kolkata";

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

function movementOnDate(m: { movementDate: string | null; createdAt: Date }, ymd: string): boolean {
  if (m.movementDate === ymd) return true;
  return m.createdAt.toLocaleDateString("en-CA", { timeZone: IST }) === ymd;
}

export function buildStockAlerts(items: Kiik69StockItemDto[]): Kiik69StockAlert[] {
  const alerts: Kiik69StockAlert[] = [];

  for (const item of items) {
    const remainingLabel = formatItemRemaining(item);

    if (item.remainingBase <= 0) {
      alerts.push({
        id: `out-${item.id}`,
        severity: "critical",
        category: item.category,
        itemId: item.id,
        itemName: item.name,
        message: "Out of stock — reorder or stock in",
        remainingLabel,
      });
      continue;
    }

    if (item.category === "liquor") {
      const bottle = liquorBottleSizeMl(item);
      const lowMl = Math.max(100, bottle * 0.2);
      if (item.remainingBase < lowMl) {
        alerts.push({
          id: `low-${item.id}`,
          severity: "warning",
          category: item.category,
          itemId: item.id,
          itemName: item.name,
          message: `Low liquor — under ${Math.round(lowMl)} ml left`,
          remainingLabel,
        });
      }
    } else {
      const lowG = item.baseUnit === "piece" ? 3 : 250;
      if (item.remainingBase < lowG) {
        alerts.push({
          id: `low-${item.id}`,
          severity: "warning",
          category: item.category,
          itemId: item.id,
          itemName: item.name,
          message: item.baseUnit === "piece" ? "Low — few pieces left" : "Low — under 250 g left",
          remainingLabel,
        });
      }
    }
  }

  return alerts.sort((a, b) => {
    const rank = (s: Kiik69StockAlertSeverity) => (s === "critical" ? 0 : 1);
    return rank(a.severity) - rank(b.severity) || a.itemName.localeCompare(b.itemName);
  });
}

export function buildKiik69StockStats(
  itemRows: (Kiik69StockItem & {
    movements: Pick<Kiik69StockMovement, "direction" | "quantityBase" | "costInr">[];
  })[],
  movementRows: Pick<
    Kiik69StockMovement,
    "direction" | "costInr" | "movementDate" | "createdAt"
  >[]
): Kiik69StockStats {
  const items = itemRows.map((i) => toKiik69StockItemDto(i, i.movements));
  const today = todayKey();

  let foodValueInr = 0;
  let liquorValueInr = 0;
  let foodItems = 0;
  let liquorItems = 0;

  for (const item of items) {
    if (item.category === "food") {
      foodItems += 1;
      foodValueInr += item.remainingValueInr;
    } else {
      liquorItems += 1;
      liquorValueInr += item.remainingValueInr;
    }
  }

  let todayStockInCost = 0;
  let todayStockOutCost = 0;
  for (const m of movementRows) {
    if (!movementOnDate(m, today)) continue;
    const c = Number(m.costInr);
    if (m.direction === "in") todayStockInCost += c;
    else todayStockOutCost += c;
  }

  const alerts = buildStockAlerts(items);
  const lowStockCount = alerts.filter((a) => a.severity === "warning").length;
  const outOfStockCount = alerts.filter((a) => a.severity === "critical").length;

  const topItems = [...items]
    .sort((a, b) => b.remainingValueInr - a.remainingValueInr)
    .slice(0, 6)
    .map((i) => ({
      name: i.name,
      category: i.category,
      valueInr: i.remainingValueInr,
      remainingLabel: formatItemRemaining(i),
    }));

  return {
    foodValueInr: Math.round(foodValueInr * 100) / 100,
    liquorValueInr: Math.round(liquorValueInr * 100) / 100,
    totalValueInr: Math.round((foodValueInr + liquorValueInr) * 100) / 100,
    foodItems,
    liquorItems,
    lowStockCount,
    outOfStockCount,
    todayStockInCost: Math.round(todayStockInCost * 100) / 100,
    todayStockOutCost: Math.round(todayStockOutCost * 100) / 100,
    alerts,
    topItems,
  };
}

export function kiik69StockContextBlock(stats: Kiik69StockStats): string {
  const alertLines = stats.alerts
    .slice(0, 10)
    .map((a) => `  - [${a.severity.toUpperCase()}] ${a.category} · ${a.itemName}: ${a.message} (${a.remainingLabel})`)
    .join("\n");

  const topLines = stats.topItems
    .map((i) => `  - ${i.name} (${i.category}): ${formatInr(i.valueInr)} · ${i.remainingLabel}`)
    .join("\n");

  return `INVENTORY / STOCK SNAPSHOT:
- Total stock value on hand: ${formatInr(stats.totalValueInr)} (food ${formatInr(stats.foodValueInr)} · liquor ${formatInr(stats.liquorValueInr)})
- SKUs: ${stats.foodItems} food · ${stats.liquorItems} liquor
- Today stock in cost: ${formatInr(stats.todayStockInCost)} · stock out cost: ${formatInr(stats.todayStockOutCost)}
- Alerts: ${stats.outOfStockCount} out of stock · ${stats.lowStockCount} low stock

Stock alerts:
${alertLines || "  (none — all items look OK)"}

Top items by value:
${topLines || "  (no items yet)"}

Stock rules:
- Liquor tracked in ml — stock in by bottles, stock out by ml pours
- Food tracked in grams — stock in/out in g or kg
- Each stock out records cost used and remaining balance`;
}
