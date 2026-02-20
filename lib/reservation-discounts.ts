/**
 * Shared discount IDs per brand for reservation flow and admin.
 * Used by ReservationForm (options) and admin discount limits UI.
 */

const BRAND_DISCOUNT_IDS: Record<string, { id: string; label: string }[]> = {
  kiik69: [
    { id: "kiik-10-percent", label: "10% off on total bill" },
    { id: "kiik-lunch", label: "Lunch Special @ ₹128" },
  ],
  c53: [{ id: "lunch-special", label: "Lunch Special @ ₹127" }],
  "boiler-room": [{ id: "lunch-special", label: "Lunch Special @ ₹127" }],
  alehouse: [
    { id: "alehouse-lunch", label: "Lunch Special @ ₹128" },
    { id: "alehouse-liquor", label: "50% off on liquor" },
  ],
  skyhy: [{ id: "skyhy-lunch", label: "Lunch Special @ ₹128" }],
};

export function getDiscountIdsForBrand(brandId: string): { id: string; label: string }[] {
  return BRAND_DISCOUNT_IDS[brandId] ?? [];
}
