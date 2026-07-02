import type { Kiik69Purchase } from "@prisma/client";
import {
  attachmentsFromLegacyPurchase,
  parseKiik69Attachments,
  syncLegacyAttachmentFields,
  type Kiik69PurchaseAttachment,
} from "@/lib/kiik69-purchase-attachments";
import {
  isKiik69CustomId,
  kiik69CustomId,
  kiik69Slugify,
  type Kiik69OptionChip,
} from "@/lib/kiik69-custom-options";

/** Outlets served by the shared kitchen — used for purchase tagging and kitchen sale splits. */
export const KIIK69_KITCHEN_OUTLETS = [
  { id: "kiik69", label: "KIIK 69" },
  { id: "sky-high", label: "Sky High" },
  { id: "sound-of-soul", label: "Sound of Soul" },
] as const;

/** Purchases can be tagged to an outlet or Others (free text). */
export const KIIK69_PURCHASE_OUTLETS = [
  ...KIIK69_KITCHEN_OUTLETS,
  { id: "other", label: "Others" },
] as const;

/** Kitchen **sale** split only — not applied to purchases. */
export const KIIK69_BASSIK_SHARE = 0.7;
export const KIIK69_OUTLET_SHARE = 0.3;
export const KIIK69_PARTY_PLATE_RATE_INR = 750;

export const KIIK69_PURCHASE_VENDORS = [
  { id: "zepto", label: "Zepto" },
  { id: "instamart", label: "Instamart" },
  { id: "blinkit", label: "Blinkit" },
  { id: "spar", label: "SPAR" },
  { id: "croma", label: "Croma" },
  { id: "hyperpu", label: "HyperPU" },
  { id: "geomart", label: "Geomart" },
  { id: "mrp", label: "MRP" },
  { id: "bottles", label: "Bottles" },
  { id: "mrp_bottles", label: "MRP Bottles" },
  { id: "other", label: "Others" },
] as const;

export const KIIK69_PAYMENT_METHODS = [
  { id: "upi", label: "UPI" },
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "credit", label: "Credit / pay later" },
  { id: "other", label: "Others" },
] as const;

export const KIIK69_PURCHASE_ITEMS = [
  { id: "groceries", label: "Groceries" },
  { id: "vegetables", label: "Vegetables" },
  { id: "meat", label: "Meat & seafood" },
  { id: "dairy", label: "Dairy" },
  { id: "beverages", label: "Beverages" },
  { id: "packaging", label: "Packaging" },
  { id: "cleaning", label: "Cleaning" },
  { id: "kitchen", label: "Kitchen supplies" },
  { id: "other", label: "Others" },
] as const;

export type Kiik69PurchaseVendorId = (typeof KIIK69_PURCHASE_VENDORS)[number]["id"];
export type Kiik69PaymentMethodId = (typeof KIIK69_PAYMENT_METHODS)[number]["id"];
export type Kiik69PurchaseItemId = (typeof KIIK69_PURCHASE_ITEMS)[number]["id"];

export type Kiik69AccountsModule =
  | "purchases"
  | "ai"
  | "sales"
  | "inventory"
  | "wallet"
  | "utilities"
  | "daily"
  | "games";

export const KIIK69_ACCOUNTS_MODULES: {
  id: Kiik69AccountsModule;
  label: string;
  shortLabel: string;
  hint: string;
  live: boolean;
}[] = [
  { id: "purchases", label: "Purchases", shortLabel: "Buy", hint: "Log bills · tag outlet", live: true },
  { id: "ai", label: "AI accountant", shortLabel: "AI", hint: "Ask, calculate, summarize", live: true },
  { id: "sales", label: "Sales", shortLabel: "Sales", hint: "Kitchen sale 70/30 by outlet", live: false },
  { id: "inventory", label: "Inventory", shortLabel: "Stock", hint: "Food & liquor stock in/out", live: true },
  { id: "wallet", label: "Wallet", shortLabel: "Cash", hint: "KIIK 69 petty cash", live: true },
  { id: "utilities", label: "Utilities", shortLabel: "Bills", hint: "Repairs & utilities", live: false },
  { id: "daily", label: "Daily report", shortLabel: "Report", hint: "KIIK 69 end-of-day only", live: false },
  { id: "games", label: "Games", shortLabel: "Games", hint: "KIIK 69 game purchases only", live: false },
];

export type Kiik69PurchaseDto = {
  id: string;
  outlet: string | null;
  outletLabel: string | null;
  vendor: string;
  vendorLabel: string | null;
  paymentMethod: string;
  paymentLabel: string | null;
  item: string | null;
  itemLabel: string | null;
  amount: number | null;
  purchaseDate: string | null;
  title: string | null;
  description: string | null;
  aiSummary: string | null;
  billUrl: string | null;
  billFileName: string | null;
  billDocType: string | null;
  paymentProofUrl: string | null;
  paymentProofFileName: string | null;
  attachments: Kiik69PurchaseAttachment[];
  purchaseLink: string | null;
  createdAt: string;
  updatedAt: string;
};

const BUILTIN_VENDOR_IDS = new Set<string>(KIIK69_PURCHASE_VENDORS.map((v) => v.id));
const BUILTIN_PAYMENT_IDS = new Set<string>(KIIK69_PAYMENT_METHODS.map((p) => p.id));
const BUILTIN_ITEM_IDS = new Set<string>(KIIK69_PURCHASE_ITEMS.map((i) => i.id));

export function isKiik69PurchaseVendor(id: string): id is Kiik69PurchaseVendorId {
  return BUILTIN_VENDOR_IDS.has(id) || isKiik69CustomId(id);
}

export function isKiik69PaymentMethod(id: string): id is Kiik69PaymentMethodId {
  return BUILTIN_PAYMENT_IDS.has(id) || isKiik69CustomId(id);
}

export function isKiik69PurchaseItem(id: string): boolean {
  return BUILTIN_ITEM_IDS.has(id) || isKiik69CustomId(id);
}

export function kiik69OutletLabel(id: string | null | undefined, storedLabel?: string | null): string {
  if (!id) return "—";
  if (storedLabel?.trim()) return storedLabel.trim();
  const builtin = KIIK69_PURCHASE_OUTLETS.find((o) => o.id === id);
  if (builtin) return builtin.label;
  return id.replace(/_/g, " ");
}

export function kiik69VendorLabel(id: string, storedLabel?: string | null): string {
  if (storedLabel?.trim()) return storedLabel.trim();
  const builtin = KIIK69_PURCHASE_VENDORS.find((v) => v.id === id);
  if (builtin) return builtin.label;
  if (id === "swaar") return "SPAR";
  if (id.startsWith("c_vendor_")) return id.replace(/^c_vendor_/, "").replace(/_/g, " ");
  return id.replace(/^c_/, "").replace(/_/g, " ");
}

export function kiik69PaymentLabel(id: string, storedLabel?: string | null): string {
  if (storedLabel?.trim()) return storedLabel.trim();
  const builtin = KIIK69_PAYMENT_METHODS.find((p) => p.id === id);
  if (builtin) return builtin.label;
  if (id.startsWith("c_payment_")) return id.replace(/^c_payment_/, "").replace(/_/g, " ");
  return id.replace(/^c_/, "").replace(/_/g, " ");
}

export function kiik69ItemLabel(id: string | null | undefined, storedLabel?: string | null): string {
  if (!id) return "—";
  if (storedLabel?.trim()) return storedLabel.trim();
  const builtin = KIIK69_PURCHASE_ITEMS.find((i) => i.id === id);
  if (builtin) return builtin.label;
  if (id.startsWith("c_item_")) return id.replace(/^c_item_/, "").replace(/_/g, " ");
  return id.replace(/^c_/, "").replace(/_/g, " ");
}

export function mergeKiik69OptionChips(
  builtins: readonly { id: string; label: string }[],
  customs: Kiik69OptionChip[]
): Kiik69OptionChip[] {
  const other = builtins.find((b) => b.id === "other");
  const base = builtins.filter((b) => b.id !== "other");
  const customChips = customs.filter((c) => !base.some((b) => b.id === c.id));
  return [
    ...base.map((b) => ({ id: b.id, label: b.label, custom: false })),
    ...customChips,
    ...(other ? [{ id: other.id, label: other.label, custom: false }] : []),
  ];
}

export function parseKiik69PurchaseDate(raw: unknown): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function resolveOtherField(
  idRaw: string,
  otherTextRaw: unknown,
  kind: "vendor" | "payment" | "item"
): { id: string; label: string | null } {
  if (idRaw !== "other") {
    if (isKiik69CustomId(idRaw)) {
      return { id: idRaw, label: typeof otherTextRaw === "string" ? otherTextRaw.trim() || null : null };
    }
    return { id: idRaw, label: null };
  }
  const text = typeof otherTextRaw === "string" ? otherTextRaw.trim().slice(0, 120) : "";
  if (!text) throw new Error(`Type a name for ${kind === "vendor" ? "vendor" : kind === "payment" ? "payment" : "item"}`);
  const slug = kiik69Slugify(text);
  return { id: kiik69CustomId(kind, slug), label: text };
}

export function toKiik69PurchaseDto(row: Kiik69Purchase): Kiik69PurchaseDto {
  return {
    id: row.id,
    outlet: row.outlet,
    outletLabel: row.outletLabel,
    vendor: row.vendor,
    vendorLabel: row.vendorLabel,
    paymentMethod: row.paymentMethod,
    paymentLabel: row.paymentLabel,
    item: row.item,
    itemLabel: row.itemLabel,
    amount: row.amount != null ? Number(row.amount) : null,
    purchaseDate: row.purchaseDate,
    title: row.title,
    description: row.description,
    aiSummary: row.aiSummary,
    billUrl: row.billUrl,
    billFileName: row.billFileName,
    billDocType: row.billDocType,
    paymentProofUrl: row.paymentProofUrl,
    paymentProofFileName: row.paymentProofFileName,
    attachments: attachmentsFromLegacyPurchase({
      attachments: row.attachments,
      billUrl: row.billUrl,
      billFileName: row.billFileName,
      billDocType: row.billDocType,
      paymentProofUrl: row.paymentProofUrl,
      paymentProofFileName: row.paymentProofFileName,
    }),
    purchaseLink: row.purchaseLink,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function parsePurchasePayload(body: Record<string, unknown>) {
  const outletRaw = typeof body.outlet === "string" ? body.outlet.trim() : "";
  const vendorRaw = typeof body.vendor === "string" ? body.vendor.trim() : "";
  const paymentRaw = typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "";
  const itemRaw = typeof body.item === "string" ? body.item.trim() : "";

  if (!outletRaw) throw new Error("Select which outlet this purchase is for");
  if (!vendorRaw) throw new Error("Select a vendor");
  if (!paymentRaw) throw new Error("Select a payment method");
  if (!itemRaw) throw new Error("Select what item it is");

  const vendorResolved =
    vendorRaw === "other"
      ? resolveOtherField("other", body.vendorOther, "vendor")
      : { id: vendorRaw, label: null as string | null };

  const paymentResolved =
    paymentRaw === "other"
      ? resolveOtherField("other", body.paymentOther, "payment")
      : { id: paymentRaw, label: null as string | null };

  const itemResolved =
    itemRaw === "other"
      ? resolveOtherField("other", body.itemOther, "item")
      : { id: itemRaw, label: null as string | null };

  let outlet = outletRaw;
  let outletLabel: string | null = null;
  if (outletRaw === "other") {
    const text = typeof body.outletOther === "string" ? body.outletOther.trim().slice(0, 120) : "";
    if (!text) throw new Error("Type a name for outlet");
    outlet = "other";
    outletLabel = text;
  } else if (!KIIK69_KITCHEN_OUTLETS.some((o) => o.id === outletRaw)) {
    throw new Error("Select which outlet this purchase is for");
  }

  if (!BUILTIN_VENDOR_IDS.has(vendorResolved.id) && !vendorResolved.id.startsWith("c_vendor_")) {
    throw new Error("Select a vendor");
  }
  if (!BUILTIN_PAYMENT_IDS.has(paymentResolved.id) && !paymentResolved.id.startsWith("c_payment_")) {
    throw new Error("Select a payment method");
  }
  if (!BUILTIN_ITEM_IDS.has(itemResolved.id) && !itemResolved.id.startsWith("c_item_")) {
    throw new Error("Select what item it is");
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
  const purchaseLink = typeof body.purchaseLink === "string" ? body.purchaseLink.trim().slice(0, 500) : "";
  const purchaseDate = parseKiik69PurchaseDate(body.purchaseDate);

  const attachmentInput = Array.isArray(body.attachments)
    ? parseKiik69Attachments(body.attachments)
    : attachmentsFromLegacyPurchase({
        billUrl: typeof body.billUrl === "string" ? body.billUrl : null,
        billFileName: typeof body.billFileName === "string" ? body.billFileName : null,
        billDocType: typeof body.billDocType === "string" ? body.billDocType : null,
        paymentProofUrl: typeof body.paymentProofUrl === "string" ? body.paymentProofUrl : null,
        paymentProofFileName:
          typeof body.paymentProofFileName === "string" ? body.paymentProofFileName : null,
      });
  const legacyFiles = syncLegacyAttachmentFields(attachmentInput);

  return {
    outlet,
    outletLabel,
    vendor: vendorResolved.id,
    vendorLabel: vendorResolved.label,
    paymentMethod: paymentResolved.id,
    paymentLabel: paymentResolved.label,
    item: itemResolved.id,
    itemLabel: itemResolved.label,
    amount,
    purchaseDate,
    title: title || null,
    description,
    aiSummary,
    ...legacyFiles,
    purchaseLink: purchaseLink || null,
  };
}

/** Map AI / legacy vendor ids to current builtins */
export function normalizeKiik69VendorSuggestion(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const v = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    swaar: "spar",
    spar: "spar",
    hyper: "hyperpu",
    pure: "hyperpu",
    hyperpu: "hyperpu",
    geomort: "geomart",
    geomart: "geomart",
    mrp_bottles: "mrp_bottles",
    "mrp bottles": "mrp_bottles",
  };
  if (map[v]) return map[v];
  if (BUILTIN_VENDOR_IDS.has(v)) return v;
  return undefined;
}

export function normalizeKiik69ItemSuggestion(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const v = raw.trim().toLowerCase();
  if (BUILTIN_ITEM_IDS.has(v)) return v;
  return undefined;
}
