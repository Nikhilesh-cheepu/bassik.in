import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { BRANDS } from "@/lib/brands";
import { prisma } from "@/lib/db";
import { countMenuItemsForBrand } from "@/lib/admin/assistant/menu-stats";
import { normalizePhone } from "@/lib/automation/phone";
import {
  wantsExplicitOutletListRequest,
  formatOutletListRollcall,
} from "@/lib/concierge-outlet-list";
import { BASSIK_DEALS_FOR_AI } from "@/lib/bassik-deals-for-ai";
import { formatVenueUniquenessForPrompt } from "@/lib/venue-uniqueness";

export const runtime = "nodejs";
export const maxDuration = 120;

function twiml(message: string) {
  const safe = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

function normalizeFromPhone(from: string): string {
  // Twilio sends something like "whatsapp:+1415..." or "whatsapp:+91..."
  const t = from.trim();
  const digits = t.replace(/^whatsapp:/i, "");
  return digits;
}

function inferSiteBaseUrl(req: NextRequest): string {
  const host = req.headers.get("host") || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  return `${proto}://${host}`;
}

function isShortGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  if (t.length <= 3) return true;
  return /^(hi|hey|hello|hlo|yo|hola|sup|good\s*morning|good\s*evening|good\s*afternoon)\b/.test(t);
}

function randomPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** Random “top picks” framing + list + “best for today” (no “across our line-up”). */
function buildTopPicksSection(): string {
  const brands = BRANDS.filter((b) => b.shortName);
  if (!brands.length) return "";

  const shuffled = shuffleInPlace([...brands]);
  const count = randomPick([3, 4, Math.min(5, shuffled.length)]);
  const picks = shuffled.slice(0, count);
  const featured = randomPick(picks);

  const intros = [
    "Here are a few top random picks for you ✨👇",
    "Quick mix — my random spotlight picks 🎉🔥",
    "Rolling some faves your way 🎧✨",
    "Top picks I’d throw at you right now ⭐🙌",
    "Fresh shuffle — venues worth a look tonight 🌙💫",
  ];

  const listEmoji = randomPick(["✨", "🔥", "🎵", "💫", "⭐"]);
  const listLines = picks.map((b) => `${listEmoji} ${b.shortName}`);

  const bestForToday = [
    `${featured.shortName} would be my strongest play for today 💯🔥`,
    `If I had to pick one for today → ${featured.shortName} hits hardest 🙌✨`,
    `For tonight’s energy, I’d start with ${featured.shortName} — that’s the one 🌙🔥`,
    `${featured.shortName} is my #1 suggestion for you for today 💎🎉`,
    `Honest take: ${featured.shortName} is the best fit for you today — try that first 🚀`,
  ];

  return [randomPick(intros), ...listLines, "", randomPick(bestForToday)].join("\n");
}

/** Rotating closer: plans / upcoming nights, or soft vibe + outlet suggestion (link lives above). */
function pickOpeningCloser(): string {
  const brands = BRANDS.filter((b) => b.shortName);
  const b = brands.length ? randomPick(brands) : null;
  const vibe = b?.tag?.toLowerCase() ?? "big-night-out";

  const planClosers = [
    "Planning tonight, or something coming up? Tell me what you’re thinking 🔥🎉",
    "What are your upcoming plans — this week, weekend, or a date you’re eyeing? 🌙✨",
    "Tonight vs later? Drop the vibe + crew size 🙌🔥",
    "Chill, full send, sports, rooftop — say the mood and I’ll point you right 🎧💫",
  ];

  const suggestClosers = b
    ? [
        `That ${vibe} energy? I’d nudge you toward ${b.shortName} — strong fit 💯✨\nFeel free to peek the others on the link above — lots of events going on 🎉🎵`,
        `${b.shortName} for that ${vibe} feel — my pick 🙌🔥\nHappy to spin other options too; there’s always something on ✨`,
        `You’d vibe ${b.shortName} for a ${vibe} night 🎉🌙\nBrowse the rest via the link — we’ve got plenty in the mix 🔥`,
      ]
    : ["Tell me your vibe and I’ll match a venue 🎵✨"];

  return randomPick([...planClosers, ...suggestClosers]);
}

/** First message: value prop + random top picks + link + varied closer (no numbered menu). */
function buildOpeningGreeting(userName: string, siteBaseUrl: string): string {
  const name = userName?.trim() ? userName.trim() : "there";
  const url = siteBaseUrl.replace(/\/$/, "");

  const lines = [
    `Hi ${name} 👋✨`,
    "",
    "This is Bassik 🎉 — we’re here for the best clubbing experience in Hyderabad 🔥",
    "",
    "Multiple venues under one roof 🏙️🎵 — name the vibe, we’ve got the place. Tables, drinks, parties, nights that actually hit 💃🥂",
    "",
    "Book direct with us and unlock website-only deals 💎 — better than walking in cold 🙌",
    "",
    buildTopPicksSection(),
    "",
    `Explore more — venues, menus & what’s on 🔗✨\n${url}`,
    "",
    pickOpeningCloser(),
  ].filter((block) => block.trim().length > 0);

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const from = form.get("From");
    const body = form.get("Body");

    if (typeof from !== "string" || typeof body !== "string") {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const userText = body.trim();
    const userPhoneRaw = normalizeFromPhone(from); // e.g. +91...
    const userPhone = normalizePhone(userPhoneRaw);

    console.log("[twilio-whatsapp-webhook]", { from, userText: userText.slice(0, 200), userPhone });

    const contact = userPhone
      ? await prisma.automationContact.findFirst({
          where: { phone: userPhone },
          select: { fullName: true },
        })
      : null;
    const userName = contact?.fullName?.trim() ? contact.fullName.trim() : "there";

    const t0 = userText.trim().toLowerCase();

    // Identify possible venue from message.
    const nt = userText.toLowerCase();
    const brandHit = BRANDS.find((b) => nt.includes(b.id.toLowerCase()) || nt.includes(b.shortName.toLowerCase()));

    // Fast path: menu count question
    if (brandHit && /\bmenu(s)?\b/.test(nt) && (/\bhow many\b/.test(nt) || /\bcount\b/.test(nt) || /\bitems?\b/.test(nt))) {
      const menuStats = await countMenuItemsForBrand(brandHit.id);
      const publicLink = `${inferSiteBaseUrl(request)}/${brandHit.id}`;
      const text = menuStats.venueExists
        ? `${brandHit.shortName} has ${menuStats.menuCount} menu type(s) and ${menuStats.menuImageCount} menu page image(s) saved.\nView here: ${publicLink}`
        : `I can’t find ${brandHit.shortName} menus in the database yet. Please check later or ask admin.`;
      return new NextResponse(twiml(text), { headers: { "Content-Type": "text/xml" } });
    }

    // Build outlet list (offers status + booking links).
    const baseUrl = inferSiteBaseUrl(request);
    const brandIds = BRANDS.map((b) => b.id);
    const venues = await prisma.venue.findMany({
      where: { brandId: { in: brandIds } },
      select: { id: true, brandId: true },
    });
    const venueIdToBrand = new Map<string, string>();
    for (const v of venues) venueIdToBrand.set(v.id, v.brandId);

    const nowIso = new Date().toISOString();
    const activeOffers = await prisma.venueOffer.findMany({
      where: {
        venueId: { in: venues.map((v) => v.id) },
        OR: [{ endDate: null }, { endDate: { gt: nowIso } }],
      },
      select: { venueId: true },
    });
    const offersCountByVenueId = new Map<string, number>();
    for (const o of activeOffers) {
      offersCountByVenueId.set(o.venueId, (offersCountByVenueId.get(o.venueId) ?? 0) + 1);
    }

    const outletLines = BRANDS.map((b) => {
      const venue = venues.find((v) => v.brandId === b.id);
      const offersToday = venue ? offersCountByVenueId.get(venue.id) ?? 0 : 0;
      return `- ${b.shortName} (${b.tag ?? "venue"}) — offers today: ${offersToday}\n  Booking: ${baseUrl}/${b.id}/reservations`;
    });

    if (wantsExplicitOutletListRequest(userText)) {
      const list = formatOutletListRollcall(BRANDS, baseUrl, "book");
      const dealsTail =
        "\n\nDeals vary by venue — common: Eat & Drink @ ₹127/128, up to ~15% off at select venues, book direct for best slots 🔥";
      return new NextResponse(twiml(list + dealsTail), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Greeting / help: lead with what we have, then ask what they need (conversational, not a phone tree).
    if (isShortGreeting(userText) || /\b(menu|options|help|start)\b/.test(t0)) {
      return new NextResponse(twiml(buildOpeningGreeting(userName, baseUrl)), { headers: { "Content-Type": "text/xml" } });
    }

    const assistantSystem = [
      "You are Bassik's WhatsApp assistant — you text like a real venue host/manager, not a bot.",
      "Brand: always `Bassik` (never `Twilio`). Hyderabad nightlife: clubs, lounges, sports bars.",
      `You may use the guest name: ${userName} (if it’s literally “there”, skip using a name).`,
      "CRITICAL — answer their actual question first in plain language. Do not dodge with generic marketing if they asked something specific.",
      "Prefer the word venue(s) over outlet(s) for guests.",
      "If they ask to name, list, or count ALL venues: the app may already handle it — but if you reply yourself, you MUST list every venue from the data below with booking link per line. Never say you cannot list them.",
      "If they did NOT ask for a full list: you can suggest 2–3 venues with links — don’t wall-of-text unless they want the full roster.",
      "When they ask about discounts, deals, or offers: summarize using this (say timing varies by venue):",
      BASSIK_DEALS_FOR_AI,
      "When they ask what makes a venue unique or which fits a mood, use this roster (do not contradict):",
      formatVenueUniquenessForPrompt({ allBrands: true }),
      "Tone: warm, confident, short lines — contractions ok, light emoji (0–2 per message). No markdown. No ‘As an AI’.",
      "Do NOT use numbered phone-tree menus (1/2/3) unless they explicitly ask for options in that style.",
      "When the message is vague: one quick take on what Bassik offers, then ONE natural follow-up (tonight vs later, vibe, group size).",
      "Booking intent: confirm venue (or suggest), then give that venue’s booking link from the data.",
      "Specific venue: 1 line vibe/offer + booking link.",
      "Keep under ~900 characters when possible; if they asked for a long list, prioritize completeness over the cap.",
      "",
      "Venue list (authoritative — only these exist):",
      ...outletLines,
    ].join("\n");

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return new NextResponse(twiml("Admin hasn’t configured OpenAI yet."), {
        headers: { "Content-Type": "text/xml" },
        status: 503,
      });
    }

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: assistantSystem },
        { role: "user", content: userText },
      ],
      temperature: 0.65,
      max_tokens: 450,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "Thanks! Which venue should we book?";
    return new NextResponse(twiml(reply), { headers: { "Content-Type": "text/xml" } });
  } catch (e) {
    console.error("[twilio-whatsapp-webhook]", e);
    const msg = e instanceof Error ? e.message : "WhatsApp webhook failed.";
    return new NextResponse(twiml("Something went wrong. Please try again."), { headers: { "Content-Type": "text/xml" } });
  }
}

