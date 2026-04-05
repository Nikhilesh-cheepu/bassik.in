import type { Brand } from "@/lib/brands";

const ROGUE_IDS = [
  "club-rogue-gachibowli",
  "club-rogue-kondapur",
  "club-rogue-jubilee-hills",
] as const;

/** Which brands rank highest for each vibe chip (refined from Bassik’s own mapping). */
const INTENT_TOP_BRANDS: Partial<Record<HomeIntent, ReadonlySet<string>>> = {
  rooftop: new Set<string>(["skyhy"]),
  clubbing: new Set<string>([
    ...ROGUE_IDS,
    "boiler-room",
    "alehouse",
    "sound-of-soul",
    "firefly",
  ]),
  telugu_club: new Set<string>(["firefly"]),
  day_club: new Set<string>(["firefly"]),
  dining: new Set<string>(["c53"]),
  family: new Set<string>(["c53"]),
  royal_vibes: new Set<string>(["alehouse"]),
  live_music: new Set<string>(["skyhy", "c53"]),
  sports: new Set<string>(["kiik69", "the-hub"]),
  bollywood: new Set<string>(["kiik69", "boiler-room", "club-rogue-gachibowli"]),
  tollywood: new Set<string>([...ROGUE_IDS, "firefly"]),
  outdoor: new Set<string>(["skyhy", "c53"]),
};

export type HomeIntent =
  | "all"
  | "rooftop"
  | "clubbing"
  | "telugu_club"
  | "day_club"
  | "dining"
  | "family"
  | "royal_vibes"
  | "live_music"
  | "sports"
  | "bollywood"
  | "tollywood"
  | "outdoor"
  | "not_sure";

export type HomeChip = {
  id: HomeIntent;
  label: string;
  emoji: string;
  /** Ultra-short: which venues this vibe surfaces (matches INTENT_TOP_BRANDS). */
  hint?: string;
};

export const HOME_CHIPS: HomeChip[] = [
  { id: "all", label: "All venues", emoji: "✨" },
  { id: "rooftop", label: "Rooftop", emoji: "🌆", hint: "SkyHy" },
  { id: "clubbing", label: "Clubbing", emoji: "🎧", hint: "Rogues, Boiler, Alehouse…" },
  { id: "telugu_club", label: "Telugu club", emoji: "🎬", hint: "Firefly" },
  { id: "day_club", label: "Day club", emoji: "☀️", hint: "Firefly" },
  { id: "dining", label: "Dining", emoji: "🍽️", hint: "C53" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧", hint: "C53" },
  { id: "royal_vibes", label: "Royal vibes", emoji: "👑", hint: "Alehouse" },
  { id: "live_music", label: "Live music", emoji: "🎵", hint: "SkyHy, C53" },
  { id: "sports", label: "Sports", emoji: "📺", hint: "KIIK 69" },
  { id: "bollywood", label: "Bollywood", emoji: "💃", hint: "KIIK, Boiler, Rogue GB" },
  { id: "tollywood", label: "Tollywood", emoji: "🎞️", hint: "Rogues + Firefly" },
  { id: "outdoor", label: "Outdoor", emoji: "🌿", hint: "SkyHy, C53" },
  { id: "not_sure", label: "Surprise me", emoji: "🤔", hint: "New mix" },
];

/** One tight block for the homepage AI — only these vibe → venue links. */
export function homeVibeMapForPrompt(): string {
  return HOME_CHIPS.filter((c) => c.hint && c.id !== "all")
    .map((c) => `${c.label} → ${c.hint}`)
    .join(" · ");
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function venueScore(brand: Brand, intent: HomeIntent): number {
  if (intent === "all" || intent === "not_sure") return 0;
  const set = INTENT_TOP_BRANDS[intent];
  if (!set) return 0;
  return set.has(brand.id) ? 10 : 0;
}

/** @deprecated use venueScore */
export const outletScore = venueScore;

/** Apply intent ranking; stable tiebreak so order isn’t totally flat. */
export function sortVenuesForIntent(venues: Brand[], intent: HomeIntent): Brand[] {
  if (intent === "all" || intent === "not_sure") return [...venues];
  const scored = venues.map((b) => ({ b, s: venueScore(b, intent) }));
  scored.sort((a, b) => {
    if (b.s !== a.s) return b.s - a.s;
    return hashStr(a.b.id + intent) - hashStr(b.b.id + intent);
  });
  return scored.map((x) => x.b);
}

export function shuffleVenues<T extends Brand>(venues: T[]): T[] {
  const arr = [...venues];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export const HOME_GREETINGS = [
  "Hey — welcome to Bassik ✨ Mix it up for a fresh lineup of venues.",
  "Hi! 👋 Hyderabad nights — tap Mix it up or ask us anything.",
  "Welcome 🔥 Multiple venues — new picks below, explore to book.",
  "You’re in — find your spot 🎲 Mix it up anytime for a new vibe.",
];

/** Random one per visit — all “venue” language for guests. */
export const HOME_ASK_PLACEHOLDERS = [
  "What discounts do the venues run?",
  "Which venue has the best rooftop?",
  "Name every venue you have",
  "Best venue for a big group tonight?",
  "Where’s the sports screening?",
  "Any happy-hour deals right now?",
  "Telugu night — which venue?",
  "Family dinner — where should we go?",
  "Bollywood night — where should we go?",
  "What’s good for outdoor seating?",
  "Do you run Eat & Drink @ ₹127 anywhere?",
  "Which venue for live music?",
  "Tollywood vibe — which venue?",
  "Royal / premium night — where?",
  "Day party — any venue?",
  "How do I book a table?",
  "Website-only deals — what does that mean?",
];
