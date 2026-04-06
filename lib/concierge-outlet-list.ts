import type { Brand } from "@/lib/brands";

/** User clearly wants every outlet named (not just “suggestions”). */
export function wantsExplicitOutletListRequest(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (t.length > 200) return false;
  return (
    /\boutlets?\s+(you\s+have|do\s+you\s+have|are\s+there)\b/.test(t) ||
    /\bvenues?\s+(you\s+have|do\s+you\s+have)\b/.test(t) ||
    /\b(name|list|what|which|tell\s+me|give\s+me)\b[\s\S]{0,50}\b(the\s+)?(outlets?|venues?|places|spots)\b/.test(t) ||
    /\b(all|every)\s+(the\s+)?(outlets?|venues?|places|spots)\b/.test(t) ||
    /\bhow\s+many\s+(outlets?|venues?|places)\b/.test(t) ||
    /\bwhat\s+outlets?\b/.test(t) ||
    /\bwhich\s+outlets?\b/.test(t) ||
    /\bwhat\s+venues?\b/.test(t) ||
    /\bwhich\s+venues?\b/.test(t)
  );
}

function randomPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export type OutletListLinkStyle = "explore" | "book";

/** Plain-text roll call — sounds human, not corporate. */
export function formatOutletListRollcall(
  brands: Brand[],
  baseUrl: string,
  linkStyle: OutletListLinkStyle = "explore"
): string {
  const u = baseUrl.replace(/\/$/, "");
  const path = (id: string) =>
    linkStyle === "book" ? `${u}/${id}/book` : `${u}/${id}`;
  const intros = [
    "Yeah — here’s every venue on the list right now 👇",
    "Sure thing — full venue list 🔥",
    "Got you — below is the real roster ✨",
  ];
  const intro = randomPick(intros);
  const lines = brands
    .filter((b) => b.shortName)
    .map((b) => `- ${b.shortName} (${b.tag ?? "venue"})\n  ${path(b.id)}`);
  const closer = randomPick([
    "Which vibe are you feeling tonight?",
    "Say which one you’re eyeing and I’ll point you to book 🔥",
    "Pick a name and tell me if it’s tonight or later — I’ll help you lock it in.",
  ]);
  return [intro, "", ...lines, "", closer].join("\n");
}
