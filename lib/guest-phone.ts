/** Normalize to 10-digit Indian mobile (no +91). Returns null if invalid. */
export function normalizeGuestPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const ten =
    digits.length > 10 && (digits.startsWith("91") || digits.startsWith("0"))
      ? digits.replace(/^(91|0)+/, "").slice(0, 10)
      : digits.slice(0, 10);
  if (!/^[6-9]\d{9}$/.test(ten)) return null;
  return ten;
}

export function guestPhoneForMsg91(phone10: string): string {
  return `91${phone10}`;
}
