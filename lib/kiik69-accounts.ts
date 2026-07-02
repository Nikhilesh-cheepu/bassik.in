import type { Kiik69Purchase } from "@prisma/client";

/** Shared kitchen serves these outlets — 70% Bassik / 30% outlet (future sales modules). */
export const KIIK69_KITCHEN_OUTLETS = [
  { id: "sky-high", label: "Sky High" },
  { id: "sound-of-soul", label: "Sound of Soul" },
  { id: "kiik69", label: "KIIK 69" },
] as const;

export const KIIK69_BASSIK_SHARE = 0.7;
export const KIIK69_OUTLET_SHARE = 0.3;
export const KIIK69_PARTY_PLATE_RATE_INR = 750;

export const KIIK69_PURCHASE_VENDORS = [
  { id: "zepto", label: "Zepto" },
  { id: "instamart", label: "Instamart" },
  { id: "blinkit", label: "Blinkit" },
  { id: "swaar", label: "Swaar" },
  { id: "croma", label: "Croma" },
  { id: "hyper", label: "Hyper" },
  { id: "pure", label: "Pure" },
  { id: "mrp", label: "MRP" },
  { id: "bottles", label: "Bottles" },
  { id: "other", label: "Others" },
] as const;

export const KIIK69_PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "credit", label: "Credit / pay later" },
  { id: "other", label: "Other" },
] as const;

export type Kiik69PurchaseVendorId = (typeof KIIK69_PURCHASE_VENDORS)[number]["id"];
export type Kiik69PaymentMethodId = (typeof KIIK69_PAYMENT_METHODS)[number]["id"];

export type Kiik69AccountsModule =
  | "purchases"
  | "sales"
  | "inventory"
  | "utilities"
  | "daily"
  | "games";

export const KIIK69_ACCOUNTS_MODULES: { id: Kiik69AccountsModule; label: string; hint: string }[] = [
  { id: "purchases", label: "Purchases", hint: "Vendors, bills & payments" },
  { id: "sales", label: "Kitchen & outlet sales", hint: "70/30 split · party plates ₹750" },
  { id: "inventory", label: "Inventory", hint: "Stock in / out · items" },
  { id: "utilities", label: "Utilities", hint: "Repairs & bills" },
  { id: "daily", label: "Daily report", hint: "End-of-day sales" },
  { id: "games", label: "Games", hint: "Game purchases" },
];

export type Kiik69PurchaseDto = {
  id: string;
  vendor: string;
  paymentMethod: string;
  amount: number | null;
  purchaseDate: string | null;
  title: string | null;
  description: string | null;
  aiSummary: string | null;
  billUrl: string | null;
  billFileName: string | null;
  purchaseLink: string | null;
  createdAt: string;
  updatedAt: string;
};

const VENDOR_IDS = new Set<string>(KIIK69_PURCHASE_VENDORS.map((v) => v.id));
const PAYMENT_IDS = new Set<string>(KIIK69_PAYMENT_METHODS.map((p) => p.id));

export function isKiik69PurchaseVendor(id: string): id is Kiik69PurchaseVendorId {
  return VENDOR_IDS.has(id);
}

export function isKiik69PaymentMethod(id: string): id is Kiik69PaymentMethodId {
  return PAYMENT_IDS.has(id);
}

export function kiik69VendorLabel(id: string): string {
  return KIIK69_PURCHASE_VENDORS.find((v) => v.id === id)?.label ?? id;
}

export function kiik69PaymentLabel(id: string): string {
  return KIIK69_PAYMENT_METHODS.find((p) => p.id === id)?.label ?? id;
}

export function parseKiik69PurchaseDate(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function toKiik69PurchaseDto(row: Kiik69Purchase): Kiik69PurchaseDto {
  return {
    id: row.id,
    vendor: row.vendor,
    paymentMethod: row.paymentMethod,
    amount: row.amount != null ? Number(row.amount) : null,
    purchaseDate: row.purchaseDate,
    title: row.title,
    description: row.description,
    aiSummary: row.aiSummary,
    billUrl: row.billUrl,
    billFileName: row.billFileName,
    purchaseLink: row.purchaseLink,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function parsePurchasePayload(body: Record<string, unknown>) {
  const vendorRaw = typeof body.vendor === "string" ? body.vendor.trim() : "";
  const paymentRaw = typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "";
  if (!isKiik69PurchaseVendor(vendorRaw)) {
    throw new Error("Select a vendor");
  }
  if (!isKiik69PaymentMethod(paymentRaw)) {
    throw new Error("Select a payment method");
  }
  const amountRaw = body.amount;
  let amount: number | null = null;
  if (amountRaw !== undefined && amountRaw !== null && amountRaw !== "") {
    const n = typeof amountRaw === "number" ? amountRaw : Number(String(amountRaw).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
    amount = Math.round(n * 100) / 100;
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 4000)
      : null;
  const aiSummary =
    typeof body.aiSummary === "string" && body.aiSummary.trim()
      ? body.aiSummary.trim().slice(0, 2000)
      : null;
  const billUrl = typeof body.billUrl === "string" ? body.billUrl.trim() : "";
  const billFileName = typeof body.billFileName === "string" ? body.billFileName.trim().slice(0, 200) : "";
  const purchaseLink = typeof body.purchaseLink === "string" ? body.purchaseLink.trim().slice(0, 500) : "";
  const purchaseDate = parseKiik69PurchaseDate(body.purchaseDate);

  return {
    vendor: vendorRaw,
    paymentMethod: paymentRaw,
    amount,
    purchaseDate,
    title: title || null,
    description,
    aiSummary,
    billUrl: billUrl || null,
    billFileName: billFileName || null,
    purchaseLink: purchaseLink || null,
  };
}
