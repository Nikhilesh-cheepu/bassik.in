/**
 * Static discount options per brand (simple, no admin controls).
 * Used in booking flow - Eat & Drink @128, 10% off, 50% off liquor, etc.
 */
export type StaticDiscount = {
  id: string;
  label: string;
  description?: string;
  /** When true, UI should not show remaining slot count; only SOLD OUT vs normal. */
  hideSlotsLeft?: boolean;
  /** Optional time window for the offer (24h). */
  startTime?: string;
  endTime?: string;
};

const DISCOUNTS_BY_BRAND: Record<string, StaticDiscount[]> = {
  // ₹128 offer (12PM–8PM)
  "kiik69": [
    {
      id: "kiik-128",
      label: "Eat & Drink Anything @ ₹128",
      description: "12PM – 8PM",
      startTime: "12:00",
      endTime: "20:00",
    },
  ],
  "skyhy": [
    {
      id: "skyhy-128",
      label: "Eat & Drink Anything @ ₹128",
      description: "12PM – 8PM",
      startTime: "12:00",
      endTime: "20:00",
    },
    {
      id: "skyhy-flat-30",
      label: "30% Flat Discount",
      description: "12PM – 10PM",
      hideSlotsLeft: true,
      startTime: "12:00",
      endTime: "22:00",
    },
  ],

  // ₹127 offer (12PM–7PM)
  "alehouse": [
    {
      id: "alehouse-127",
      label: "Eat & Drink Anything @ ₹127",
      description: "12PM – 7PM",
      startTime: "12:00",
      endTime: "19:00",
    },
    {
      id: "alehouse-flat-30",
      label: "30% Flat Discount",
      description: "12PM – 10PM",
      hideSlotsLeft: true,
      startTime: "12:00",
      endTime: "22:00",
    },
  ],
  "c53": [
    {
      id: "c53-127",
      label: "Eat & Drink Anything @ ₹127",
      description: "12PM – 7PM",
      startTime: "12:00",
      endTime: "19:00",
    },
    {
      id: "c53-flat-25",
      label: "25% Flat Discount",
      description: "12PM – 10PM",
      hideSlotsLeft: true,
      startTime: "12:00",
      endTime: "22:00",
    },
  ],
  "boiler-room": [
    {
      id: "boiler-127",
      label: "Eat & Drink Anything @ ₹127",
      description: "12PM – 7PM",
      startTime: "12:00",
      endTime: "19:00",
    },
    {
      id: "boiler-flat-30",
      label: "30% Flat Discount",
      description: "12PM – 10PM",
      hideSlotsLeft: true,
      startTime: "12:00",
      endTime: "22:00",
    },
  ],

  // Additional flat discount only
  "sound-of-soul": [
    {
      id: "sos-flat-30",
      label: "30% Flat Discount",
      description: "12PM – 10PM",
      hideSlotsLeft: true,
      startTime: "12:00",
      endTime: "22:00",
    },
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
