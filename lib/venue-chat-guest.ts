/** Guest is asking something — not sharing their name or booking details. */
export function looksLikeChatQuestion(text: string): boolean {
  const t = text.trim().replace(/[!.\s]+$/g, "").trim();
  if (!t) return false;
  if (/\?/.test(text)) return true;
  if (/^(can|could|are|is|am|do|does|did|will|would|what|how|where|when|why|who|which|any|tell me|is there|may i)\b/i.test(t)) {
    return true;
  }
  if (
    /\b(allowed|welcome|permitted|can i|can we|can men|can women|can ladies|can guys|what about|how much|how many|do you|does the|is it only|is it just|are you|will there|shall i)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /\b(men|guys|boys|women|ladies|girls|cover|charge|price|menu|timing|location|parking|entry|dress code|offer|event|vibe)\b/i.test(
      t
    ) &&
    /^(can|are|is|do|what|how|when|where|tell|any|will|would|could)/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Casual chat / Telugu-Hinglish — not a name share (e.g. vasta = "coming"). */
export function looksLikeCasualNonNameMessage(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[!?.]+$/g, "").trim();
  if (!t) return false;

  const words = t.split(/\s+/).filter(Boolean);
  const first = words[0] ?? t;

  const casual = new Set([
    "vasta",
    "vastha",
    "vastanu",
    "vastunna",
    "vachesta",
    "vachey",
    "randi",
    "ra",
    "raa",
    "repu",
    "mem",
    "nenu",
    "naaku",
    "em",
    "enti",
    "eppudu",
    "ela",
    "bagundi",
    "chalo",
    "ok",
    "okay",
    "okkasari",
    "bro",
    "anna",
    "cheppu",
    "cheppandi",
    "tell",
    "coming",
    "tomorrow",
    "today",
    "tonight",
    "weekend",
  ]);

  if (casual.has(t) || casual.has(first)) return true;
  if (words.length <= 2 && words.every((w) => casual.has(w))) return true;
  if (/^(vasta|vastha|vachesta|randi|repu)\b/i.test(t) && words.length <= 3) return true;

  return false;
}

/** Plausible human name — rejects keyboard mash and random strings. */
export function looksLikePlausibleGuestName(raw: string): boolean {
  const n = raw.trim().replace(/[.,;:!?]+$/g, "").trim();
  if (looksLikeChatQuestion(n)) return false;
  if (n.length < 2 || n.length > 48) return false;
  if (!/^[A-Za-z][A-Za-z\s.'-]*$/.test(n)) return false;

  const words = n.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return false;

  const letters = n.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return false;
  if (!/[aeiouAEIOU]/.test(letters)) return false;
  if (/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}/.test(letters)) return false;
  if (/^(asdf|qwer|zxcv|hjkl|dfgh|sdfg|ghjk|fghj|jklk|lkjh|hgfd|fdsa|qwerty)/i.test(letters)) return false;
  if (words.length === 1 && letters.length > 14) return false;

  for (const w of words) {
    if (w.length >= 3 && !/[aeiouAEIOU]/.test(w)) return false;
  }

  return true;
}

function rejectBadGuestName(name: string | undefined): string | undefined {
  if (!name?.trim()) return undefined;
  const n = name.trim().replace(/[.,;:!?]+$/g, "").trim();
  if (!looksLikePlausibleGuestName(n)) return undefined;
  if (looksLikeChatQuestion(n)) return undefined;
  if (looksLikeCasualNonNameMessage(n)) return undefined;
  if (/^(i'?m|interested|book|table|hi|hello|yes|yeah|yep|yup|ok|okay|k|sure|thanks|thank you|fine|cool|great|done|alright|right)$/i.test(n)) return undefined;
  if (/interested in/i.test(n)) return undefined;
  if (/\bDJ\b/i.test(n) && n.split(/\s+/).length > 2) return undefined;
  if (/^\d/.test(n)) return undefined;
  if (/^(mon|tue|wed|thu|fri|sat|sun)/i.test(n)) return undefined;
  return n;
}

/** Valid guest name only — strips AI/event-title corruption from lead state. */
export function sanitizeGuestName(name: string | null | undefined): string | null {
  const ok = rejectBadGuestName(name ?? undefined);
  return ok ?? null;
}

export function rejectExtractedGuestName(name: string | undefined): string | undefined {
  return rejectBadGuestName(name);
}

/** Short, human label for chat copy (not the full poster line). */
export function friendlyEventLabel(name: string | null | undefined): string {
  if (!name?.trim()) return "this night";
  const s = name.split(" · ")[0]?.trim() || name.trim();
  const afterDash = s.match(/[-–—]\s*(DJ\s.+)$/i);
  if (afterDash?.[1]) return afterDash[1].trim();
  const dj = s.match(/(DJ\s[\w.]+(?:\s+[\w.]+)?)/i);
  if (dj?.[1]) return dj[1];
  if (s.length > 32) return `${s.slice(0, 29)}…`;
  return s;
}
