/**
 * Default contact numbers and WhatsApp messages per outlet.
 * Admin can override contactPhone per venue in the dashboard (stored in DB).
 */

const DEFAULT_NUMBER = "7013884485";

export const OUTLET_CONTACTS: Record<
  string,
  { phone: string; whatsappMessage: string }
> = {
  kiik69: {
    phone: "9274696969",
    whatsappMessage: `Hi! I'd like to know more about KIIK 69 Sports Bar — reservations, events, or menu.`,
  },
  alehouse: {
    phone: "8096060606",
    whatsappMessage: `Hi! I'd like to know more about Alehouse — reservations, events, or menu.`,
  },
  c53: {
    phone: "9484535353",
    whatsappMessage: `Hi! I'd like to know more about C53 World Cuisine — reservations, events, or menu.`,
  },
  "boiler-room": {
    phone: "7073456789",
    whatsappMessage: `Hi! I'd like to know more about Boiler Room — reservations, events, or menu.`,
  },
  "club-rogue-gachibowli": {
    phone: "8328576564",
    whatsappMessage: `Hi! I'd like to know more about Club Rogue Gachibowli — reservations, events, or table booking.`,
  },
  "the-hub": {
    phone: "7013884485",
    whatsappMessage: `Hi! I'd like to know more about The Hub — live screening, table booking, or events.`,
  },
};

export function getContactForBrand(brandId: string): string {
  return OUTLET_CONTACTS[brandId]?.phone ?? DEFAULT_NUMBER;
}

export function getWhatsAppMessageForBrand(brandId: string, brandName?: string): string {
  const custom = OUTLET_CONTACTS[brandId]?.whatsappMessage;
  if (custom) return custom;
  const name = brandName || "your outlet";
  return `Hi! I'd like to know more about ${name} — reservations, events, or menu.`;
}

export function getFullPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return `91${digits.slice(-10)}`;
}
