/**
 * Contact parsing + conversation memory for venue chat (no DB — safe everywhere).
 * Scans any guest message format and merges facts across the whole thread.
 */
import {
  looksLikeChatQuestion,
  looksLikePlausibleGuestName,
  rejectExtractedGuestName,
  sanitizeGuestName,
} from "@/lib/venue-chat-guest";

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "").slice(-10);
  return d.length === 10 && /^[6-9]/.test(d) ? d : null;
}

function findPhoneInText(text: string): { phone: string; span: string } | null {
  const structured = text.match(
    /(?:^|\n)\s*(?:contact\s*(?:num|number|no)?|mobile|phone|number|whatsapp|wa)\s*[:-]+\s*([\d\s+-]{10,})/im
  );
  if (structured?.[1]) {
    const phone = normalizePhone(structured[1]);
    if (phone) return { phone, span: structured[0] };
  }

  const callMe = text.match(
    /(?:call|reach|whatsapp|text|ping)\s+(?:me\s+)?(?:at|on|@)?\s*([\d\s+-]{10,})/i
  );
  if (callMe?.[1]) {
    const phone = normalizePhone(callMe[1]);
    if (phone) return { phone, span: callMe[0] };
  }

  for (const m of text.matchAll(/\d[\d\s+-]{8,}\d/g)) {
    const phone = normalizePhone(m[0]);
    if (phone) return { phone, span: m[0] };
  }

  for (const m of text.matchAll(/\d[\d\s+-]*/g)) {
    const phone = normalizePhone(m[0]);
    if (phone) return { phone, span: m[0] };
  }

  return null;
}

function stripPhoneFromText(text: string, phone: string): string {
  let out = text;
  for (const m of text.matchAll(/\d[\d\s+-]*/g)) {
    if (normalizePhone(m[0]) === phone) {
      out = out.replace(m[0], " ");
    }
  }
  return out;
}

function cleanExtractedName(raw: string): string | undefined {
  const n = raw
    .trim()
    .replace(/\s+hai$/i, "")
    .replace(/\s+(and|mobile|phone|number|no|num)$/i, "")
    .trim();
  return rejectExtractedGuestName(n);
}

function extractNamePatterns(text: string): string | undefined {
  const structuredName = text.match(
    /(?:^|\n)\s*(?:name|peru|naam)\s*[:-]+\s*([A-Za-z][A-Za-z\s.'-]{1,35})/im
  )?.[1];
  if (structuredName) {
    return cleanExtractedName(structuredName);
  }

  const named =
    text.match(
      /(?:^|[\s,])(?:my name is|this is|i am|i'?m|name[:\s-]+|mera naam|naa peru|nenu|peru)\s+([A-Za-z][A-Za-z\s.'-]{1,35})/i
    ) ??
    text.match(/(?:^|[\s,])naam\s+hai\s+([A-Za-z][A-Za-z\s.'-]{1,35})/i) ??
    text.match(/^([A-Za-z][A-Za-z\s.'-]{1,35})\s*[,–—-]/);
  if (named?.[1]) {
    return cleanExtractedName(
      named[1].trim().replace(/\s+(and|mobile|phone|number|no|num).*$/i, "").trim()
    );
  }

  return undefined;
}

function extractNameFromRemainder(text: string, phone: string | undefined): string | undefined {
  const lower = text.toLowerCase();
  if (/^(?:call|reach|whatsapp|text|ping)\b/.test(lower) && phone) {
    return undefined;
  }

  let stripped = phone ? stripPhoneFromText(text, phone) : text;
  stripped = stripped
    .replace(/(?:^|\n)\s*(?:name|peru|naam|contact\s*(?:num|number|no)?|mobile|phone)\s*[:-]+[^\n]*/gim, " ")
    .replace(/[^\w\s.'-]/g, " ")
    .trim();

  const words = stripped.split(/\s+/).filter(Boolean);
  if (/^(call|reach|whatsapp|text|ping|me|at|on)$/i.test(words[0] ?? "")) {
    return undefined;
  }
  if (words.length >= 1 && words.length <= 3 && !/^(book|table|hi|hello|yes|ok|okay)$/i.test(words[0])) {
    return cleanExtractedName(words.slice(0, 3).join(" "));
  }

  if (!phone && !/\d/.test(text.trim())) {
    const candidate = text.trim();
    if (looksLikePlausibleGuestName(candidate)) {
      return cleanExtractedName(candidate);
    }
    if (words.length === 2 && looksLikePlausibleGuestName(words.join(" "))) {
      return cleanExtractedName(words.join(" "));
    }
  }

  return undefined;
}

/** Parse name and/or mobile from one guest message — any common format. */
export function tryExtractContactFromMessage(text: string): {
  guestName?: string;
  contactNumber?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return {};

  if (looksLikeChatQuestion(trimmed)) {
    const found = findPhoneInText(trimmed);
    const phone = found?.phone ?? normalizePhone(trimmed);
    return phone ? { contactNumber: phone } : {};
  }

  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    let phone: string | undefined;
    const nameParts: string[] = [];
    for (const line of lines) {
      const linePhone = findPhoneInText(line)?.phone ?? normalizePhone(line);
      if (linePhone && line.replace(/\D/g, "").length >= 10) {
        phone = linePhone;
        continue;
      }
      const fromLine = extractNamePatterns(line) ?? extractNameFromRemainder(line, undefined);
      if (fromLine) nameParts.push(fromLine);
    }
    if (phone && nameParts.length > 0) {
      return { guestName: nameParts.join(" "), contactNumber: phone };
    }
    if (phone && nameParts.length === 0) {
      const nameFromFirst = lines.find((l) => l.replace(/\D/g, "").length < 10);
      const n = nameFromFirst
        ? extractNamePatterns(nameFromFirst) ?? extractNameFromRemainder(nameFromFirst, undefined)
        : undefined;
      if (n) return { guestName: n, contactNumber: phone };
    }
  }

  const found = findPhoneInText(trimmed);
  const phone = found?.phone ?? normalizePhone(trimmed);

  let guestName = extractNamePatterns(trimmed);
  if (!guestName) {
    guestName = extractNameFromRemainder(trimmed, phone ?? undefined);
  }

  if (guestName && guestName.length < 2) guestName = undefined;
  return { guestName, contactNumber: phone ?? undefined };
}

export type MergedContact = {
  guestName?: string;
  contactNumber?: string;
  changed: boolean;
};

/** Merge contact from lead record + every guest message in the thread (memory). */
export function mergeContactFromConversation(
  lead: { guestName: string | null; contactNumber: string | null },
  userMessages: string[],
  currentMessage?: string
): MergedContact {
  let guestName = sanitizeGuestName(lead.guestName) ?? undefined;
  let contactNumber = normalizePhone(lead.contactNumber) ?? undefined;

  const texts = [...userMessages];
  if (currentMessage?.trim()) {
    const last = texts[texts.length - 1]?.trim();
    if (last !== currentMessage.trim()) texts.push(currentMessage);
  }

  for (const text of texts) {
    if (looksLikeChatQuestion(text)) {
      const ex = tryExtractContactFromMessage(text);
      if (ex.contactNumber) contactNumber = ex.contactNumber;
      continue;
    }
    const ex = tryExtractContactFromMessage(text);
    if (ex.guestName) guestName = ex.guestName;
    if (ex.contactNumber) contactNumber = ex.contactNumber;
  }

  const prevName = sanitizeGuestName(lead.guestName) ?? undefined;
  const prevPhone = normalizePhone(lead.contactNumber) ?? undefined;
  const changed = guestName !== prevName || contactNumber !== prevPhone;

  return { guestName, contactNumber, changed };
}

export function contactComplete(merged: Pick<MergedContact, "guestName" | "contactNumber">): boolean {
  return Boolean(merged.guestName && merged.contactNumber);
}

export function missingContactFields(
  merged: Pick<MergedContact, "guestName" | "contactNumber">
): ("name" | "phone")[] {
  const missing: ("name" | "phone")[] = [];
  if (!merged.guestName) missing.push("name");
  if (!merged.contactNumber) missing.push("phone");
  return missing;
}
