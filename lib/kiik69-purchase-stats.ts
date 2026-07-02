import type { Kiik69Purchase } from "@prisma/client";
import {
  KIIK69_BASSIK_SHARE,
  KIIK69_KITCHEN_OUTLETS,
  KIIK69_OUTLET_SHARE,
  KIIK69_PARTY_PLATE_RATE_INR,
  kiik69ItemLabel,
  kiik69OutletLabel,
  kiik69VendorLabel,
  toKiik69PurchaseDto,
  type Kiik69PurchaseDto,
} from "@/lib/kiik69-accounts";

export type Kiik69PurchaseStats = {
  totalLogged: number;
  purchaseCount: number;
  thisMonthTotal: number;
  thisMonthCount: number;
  last7DaysTotal: number;
  byVendor: { label: string; total: number; count: number }[];
  byItem: { label: string; total: number; count: number }[];
  byOutlet: { label: string; total: number; count: number }[];
  recent: Kiik69PurchaseDto[];
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function purchaseMonthKey(p: Kiik69Purchase): string | null {
  if (p.purchaseDate && /^\d{4}-\d{2}-\d{2}$/.test(p.purchaseDate)) {
    return p.purchaseDate.slice(0, 7);
  }
  return monthKey(p.createdAt);
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function calcPartyPlates(plates: number): {
  plates: number;
  rate: number;
  total: number;
} {
  const n = Math.max(0, Math.round(plates));
  return { plates: n, rate: KIIK69_PARTY_PLATE_RATE_INR, total: n * KIIK69_PARTY_PLATE_RATE_INR };
}

export function calcKitchenSaleSplit(
  amount: number,
  sellingOutlet = "the selling outlet"
): {
  total: number;
  bassik: number;
  outletShare: number;
  sellingOutlet: string;
  bassikPct: number;
  outletPct: number;
} {
  const total = Math.max(0, amount);
  const bassik = Math.round(total * KIIK69_BASSIK_SHARE * 100) / 100;
  const outletShare = Math.round(total * KIIK69_OUTLET_SHARE * 100) / 100;
  return {
    total,
    bassik,
    outletShare,
    sellingOutlet,
    bassikPct: KIIK69_BASSIK_SHARE,
    outletPct: KIIK69_OUTLET_SHARE,
  };
}

/** @deprecated use calcKitchenSaleSplit — kitchen sale only, not purchases */
export const calcKitchenSplit = calcKitchenSaleSplit;

export function buildKiik69PurchaseStats(rows: Kiik69Purchase[]): Kiik69PurchaseStats {
  const now = new Date();
  const thisMonth = monthKey(now);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let totalLogged = 0;
  let thisMonthTotal = 0;
  let thisMonthCount = 0;
  let last7DaysTotal = 0;

  const vendorMap = new Map<string, { total: number; count: number }>();
  const itemMap = new Map<string, { total: number; count: number }>();
  const outletMap = new Map<string, { total: number; count: number }>();

  for (const p of rows) {
    const amt = p.amount != null ? Number(p.amount) : 0;
    if (amt > 0) totalLogged += amt;

    if (purchaseMonthKey(p) === thisMonth) {
      thisMonthCount += 1;
      if (amt > 0) thisMonthTotal += amt;
    }

    const created = p.createdAt;
    if (created >= sevenDaysAgo && amt > 0) last7DaysTotal += amt;

    const vLabel = kiik69VendorLabel(p.vendor, p.vendorLabel);
    const v = vendorMap.get(vLabel) ?? { total: 0, count: 0 };
    v.count += 1;
    if (amt > 0) v.total += amt;
    vendorMap.set(vLabel, v);

    const iLabel = kiik69ItemLabel(p.item, p.itemLabel);
    const i = itemMap.get(iLabel) ?? { total: 0, count: 0 };
    i.count += 1;
    if (amt > 0) i.total += amt;
    itemMap.set(iLabel, i);

    const oLabel = kiik69OutletLabel(p.outlet, p.outletLabel);
    const o = outletMap.get(oLabel) ?? { total: 0, count: 0 };
    o.count += 1;
    if (amt > 0) o.total += amt;
    outletMap.set(oLabel, o);
  }

  const byVendor = [...vendorMap.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const byItem = [...itemMap.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const byOutlet = [...outletMap.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return {
    totalLogged,
    purchaseCount: rows.length,
    thisMonthTotal,
    thisMonthCount,
    last7DaysTotal,
    byVendor,
    byItem,
    byOutlet,
    recent: rows.slice(0, 15).map(toKiik69PurchaseDto),
  };
}

export function kiik69StatsContextBlock(stats: Kiik69PurchaseStats): string {
  const outlets = KIIK69_KITCHEN_OUTLETS.map((o) => o.label).join(", ");
  const vendorLines = stats.byVendor
    .slice(0, 6)
    .map((v) => `  ${v.label}: ${formatInr(v.total)} (${v.count} bills)`)
    .join("\n");
  const itemLines = stats.byItem
    .slice(0, 6)
    .map((i) => `  ${i.label}: ${formatInr(i.total)}`)
    .join("\n");
  const outletLines = stats.byOutlet
    .slice(0, 6)
    .map((o) => `  ${o.label}: ${formatInr(o.total)} (${o.count} bills)`)
    .join("\n");
  const recentLines = stats.recent
    .slice(0, 8)
    .map((p) => {
      const amt = p.amount != null ? formatInr(p.amount) : "—";
      return `  - ${p.purchaseDate ?? "?"} · ${kiik69OutletLabel(p.outlet, p.outletLabel)} · ${kiik69VendorLabel(p.vendor, p.vendorLabel)} · ${kiik69ItemLabel(p.item, p.itemLabel)} · ${amt}${p.aiSummary ? ` · ${p.aiSummary.slice(0, 60)}` : ""}`;
    })
    .join("\n");

  return `KITCHEN RULES:
- Outlets: ${outlets}
- KITCHEN SALE split ONLY (not purchases): if KIIK 69 / Sky High / Sound of Soul sells ₹1,000 from kitchen → ₹700 Bassik + ₹300 to that selling outlet
- Purchases are tagged separately — pick which outlet the bill is for (or Others)
- Party package (sales): ₹${KIIK69_PARTY_PLATE_RATE_INR} per plate (e.g. 20 plates = ₹${20 * KIIK69_PARTY_PLATE_RATE_INR})
- Daily report & Games modules are KIIK 69 only

PURCHASE LEDGER SNAPSHOT:
- Total logged: ${formatInr(stats.totalLogged)} across ${stats.purchaseCount} entries
- This month: ${formatInr(stats.thisMonthTotal)} (${stats.thisMonthCount} purchases)
- Last 7 days: ${formatInr(stats.last7DaysTotal)}

Top vendors:
${vendorLines || "  (none yet)"}

Top item categories:
${itemLines || "  (none yet)"}

Purchases by outlet:
${outletLines || "  (none tagged yet)"}

Recent purchases:
${recentLines || "  (none yet)"}`;
}
