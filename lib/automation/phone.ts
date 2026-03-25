/**
 * Best-effort E.164-style normalization for India-heavy sheets.
 */
export function normalizePhone(raw: string): string {
  const t = raw.trim();
  if (!t) return "";

  const digits = t.replace(/\D/g, "");
  if (!digits) return "";

  if (t.startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length >= 10) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function toTwilioWhatsAppAddress(e164: string): string {
  const n = normalizePhone(e164);
  if (!n) return "";
  const body = n.startsWith("+") ? n.slice(1) : n;
  return `whatsapp:+${body}`;
}
