import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { BRANDS } from "@/lib/brands";
import { prisma } from "@/lib/db";
import { countMenuItemsForBrand } from "@/lib/admin/assistant/menu-stats";
import { normalizePhone } from "@/lib/automation/phone";

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

/** Rotating closer: plans / upcoming nights, or soft vibe + outlet suggestion + events. */
function pickOpeningCloser(): string {
  const brands = BRANDS.filter((b) => b.shortName);
  const b = brands.length ? randomPick(brands) : null;
  const vibe = b?.tag?.toLowerCase() ?? "big-night-out";

  const planClosers = [
    "Planning tonight, or something coming up? Tell me what you’re thinking 🔥",
    "What are your upcoming plans — this week, weekend, or a date you’re eyeing?",
    "Are we talking tonight, or a night you’ve got lined up later? Share the vibe and group size if you can.",
    "Got a night in mind? Chill, full send, sports, rooftop — say the mood and I’ll point you right.",
  ];

  const suggestClosers = b
    ? [
        `If that ${vibe} energy is what you want, I’d nudge you toward ${b.shortName} — strong fit. Feel free to browse our other spots too; there’s always a lot on with events.`,
        `My pick for that ${vibe} feel would be ${b.shortName} — but totally okay to explore the rest. We’ve got events and nights across the line-up.`,
        `You’d love the vibe at ${b.shortName} for a ${vibe} kind of night — that’s what I’d suggest. Peek the others as well; plenty happening week to week.`,
      ]
    : [
        "Tell me the vibe you’re after and I’ll match you to an outlet — there’s always something on across our venues.",
      ];

  const mixed = [...planClosers, ...suggestClosers];
  return randomPick(mixed);
}

/** First message: what Bassik is + what we have, then a varied closer (no numbered menu). */
function buildOpeningGreeting(userName: string): string {
  const name = userName?.trim() ? userName.trim() : "there";
  const sample = BRANDS.map((b) => b.shortName)
    .filter(Boolean)
    .slice(0, 5)
    .join(" · ");

  const lines = [
    `Hi ${name} 👋`,
    "",
    "This is Bassik — we’re about the best clubbing experience in Hyderabad.",
    "",
    "We have multiple venues under one roof: you name the vibe, we have the place. Tables, drinks, parties, and nights you can actually enjoy.",
    "",
    "Book direct with us and you unlock website-only deals — better than walking in cold.",
  ];
  if (sample) {
    lines.push("", `Across our line-up: ${sample} and more.`);
  }
  lines.push("", pickOpeningCloser());
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
      return `- ${b.shortName} (${b.tag ?? "outlet"}) — offers today: ${offersToday}\n  Booking: ${baseUrl}/${b.id}/reservations`;
    });

    // Greeting / help: lead with what we have, then ask what they need (conversational, not a phone tree).
    if (isShortGreeting(userText) || /\b(menu|options|help|start)\b/.test(t0)) {
      return new NextResponse(twiml(buildOpeningGreeting(userName)), { headers: { "Content-Type": "text/xml" } });
    }

    const assistantSystem = [
      "You are Bassik's WhatsApp AI assistant for staff-like customer conversations.",
      "Brand voice: Always represent the business as `Bassik` (never say `Twilio`).",
      "Goal: help the user choose an outlet and book a table for a great clubbing experience in Hyderabad.",
      "Rules (be human, energetic, intelligent):",
      `User name: ${userName}`,
      "If user name is not available, treat it as 'there' for greeting.",
      "Tone: act like a real manager. No robotic phrasing. Confident, friendly, energetic.",
      "Do NOT use numbered menus (1/2/3) or 'press an option' style unless the user explicitly asks for a list.",
      "When the user’s message is vague or early in the chat: first remind them what Bassik offers (Hyderabad clubbing, multiple venues, book direct + website-only deals, vibe-to-place), then sound human — e.g. tonight vs upcoming plans, or a soft suggestion (one outlet + feel free to browse others + events across venues). Avoid dry 'what do you need from us today' phrasing.",
      "Formatting rules (WhatsApp style):",
      "- Use short lines (1 sentence per line where possible).",
      "- Use emojis lightly (0-2 per message).",
      "- Use clear spacing and bullet-like separators (e.g. hyphens) instead of long paragraphs.",
      "- Do NOT use markdown; plain text only.",
      "Conversation rules:",
      "1) Always use the outlet booking links provided.",
      "2) For offers/FAQs: mention 'Book Direct. Unlock Website-Only Deals.' and that there are limited slots, but do not sound robotic—use natural wording.",
      "3) If user mentions booking intent (book/reservation/table/slot), ask which outlet and then provide booking link for that outlet.",
      "4) If user asks about a specific outlet, reply with 1 line offer info + 1 line booking link.",
      "5) If user message is unclear or general: ask ONE specific question (vibe + date/time if possible). Then show up to 2-3 outlet options with booking links—never dump the full outlet list.",
      "6) If you do mention an outlet, include its booking link immediately.",
      "7) End with at most one clear question so the chat moves forward (avoid stacking multiple questions).",
      "8) Keep replies short for WhatsApp (max ~900 characters).",
      "If the user asks what you can do: describe Bassik in human language (what we have), then invite them naturally (tonight / upcoming plans, or a light outlet suggestion + browse others + events) — still no numbered menu.",
      "",
      "Outlet list (for your reference only):",
      ...outletLines,
      "",
      "User message (for your reference only):",
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
      temperature: 0.4,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "Thanks! Which outlet would you like to book?";
    return new NextResponse(twiml(reply), { headers: { "Content-Type": "text/xml" } });
  } catch (e) {
    console.error("[twilio-whatsapp-webhook]", e);
    const msg = e instanceof Error ? e.message : "WhatsApp webhook failed.";
    return new NextResponse(twiml("Something went wrong. Please try again."), { headers: { "Content-Type": "text/xml" } });
  }
}

