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

    const assistantSystem = [
      "You are Bassik's WhatsApp AI assistant for staff-like customer conversations.",
      "Goal: help the user choose an outlet and book a table.",
      "Rules:",
      `User name: ${userName}`,
      "If user name is not available, treat it as 'there' for greeting.",
      "1) Always use the outlet booking links provided.",
      "2) For offers/FAQs: explain that Bassik is 'Book Direct. Unlock Website-Only Deals.' and there are limited slots.",
      "3) If user mentions booking intent (book/reservation/table/slot), ask which outlet and then provide booking link for that outlet.",
      "4) If user asks about a specific outlet, describe offers and then provide booking link.",
      "5) For unknown or unclear questions, ask a clarifying question and list outlets again.",
      "6) Keep replies short for WhatsApp (max ~900 characters).",
      "",
      "Outlet list:",
      ...outletLines,
      "",
      "User message:",
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

