/**
 * Static discount options per brand (simple, no admin controls).
 * Used in booking flow - Eat & Drink @128, 10% off, 50% off liquor, etc.
 */
export type StaticDiscount = {
  id: string;
  label: string;
  description?: string;
};

const DISCOUNTS_BY_BRAND: Record<string, StaticDiscount[]> = {
  "kiik69": [
    { id: "kiik-10-percent", label: "10% off on total bill" },
    { id: "kiik-lunch", label: "Lunch Special @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "alehouse": [
    { id: "alehouse-lunch", label: "Lunch Special @ ₹128", description: "Eat & drink anything @ ₹128" },
    { id: "alehouse-liquor", label: "50% off on liquor" },
  ],
  "skyhy": [
    { id: "skyhy-lunch", label: "Lunch Special @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "c53": [
    { id: "lunch-special", label: "Lunch Special @ ₹127", description: "Eat & drink anything 12PM–7PM" },
  ],
  "boiler-room": [
    { id: "eat-drink-128", label: "Eat & Drink @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "firefly": [
    { id: "eat-drink-128", label: "Eat & Drink @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "club-rogue-gachibowli": [
    { id: "eat-drink-128", label: "Eat & Drink @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "club-rogue-kondapur": [
    { id: "eat-drink-128", label: "Eat & Drink @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "club-rogue-jubilee-hills": [
    { id: "eat-drink-128", label: "Eat & Drink @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "sound-of-soul": [
    { id: "eat-drink-128", label: "Eat & Drink @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "thezenzspot": [
    { id: "eat-drink-128", label: "Eat & Drink @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
  "the-hub": [
    { id: "eat-drink-128", label: "Eat & Drink @ ₹128", description: "Eat & drink anything @ ₹128" },
  ],
};

export function getDiscountsForBrand(brandId: string): StaticDiscount[] {
  return DISCOUNTS_BY_BRAND[brandId] ?? [];
}

export function getDiscountLabel(brandId: string, discountId: string): string | null {
  const list = getDiscountsForBrand(brandId);
  const d = list.find((x) => x.id === discountId);
  return d?.label ?? null;
}

export function isValidDiscountId(brandId: string, discountId: string): boolean {
  const list = getDiscountsForBrand(brandId);
  return list.some((x) => x.id === discountId);
}
