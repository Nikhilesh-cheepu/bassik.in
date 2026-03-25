import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getPublicBrands } from "@/lib/brands";
import {
  wantsExplicitOutletListRequest,
  formatOutletListRollcall,
} from "@/lib/concierge-outlet-list";
import { BASSIK_DEALS_FOR_AI } from "@/lib/bassik-deals-for-ai";
import { homeVibeMapForPrompt } from "@/lib/home-intents";
import { formatVenueUniquenessForPrompt } from "@/lib/venue-uniqueness";

export const runtime = "nodejs";

const MAX_REPLY_CHARS = 2800;

function normalizeSiteUrl(raw: unknown, req: Request): string {
  if (typeof raw === "string" && /^https?:\/\//i.test(raw.trim())) {
    return raw.trim().replace(/\/$/, "");
  }
  const host = req.headers.get("host");
  if (host) {
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return "https://bassik.in";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      intent?: string;
      message?: string;
      siteUrl?: string;
    };

    const siteUrl = normalizeSiteUrl(body.siteUrl, req);
    const brands = getPublicBrands();

    const trimmedMessage =
      typeof body.message === "string" ? body.message.trim() : "";

    const userMessage =
      trimmedMessage ||
      (body.intent === "not_sure"
        ? "I’m not sure what to pick — suggest where to start tonight."
        : "");

    if (!userMessage) {
      return NextResponse.json(
        { reply: null, error: "Send `message` text or intent `not_sure`." },
        { status: 400 }
      );
    }

    if (wantsExplicitOutletListRequest(userMessage)) {
      const list = formatOutletListRollcall(brands, siteUrl);
      const dealsHint =
        "\n\nDeals vary by venue — common ones: Eat & Drink @ ₹127/128 windows, up to ~15% off à la carte at select venues, book direct on the site for the best slots 🔥";
      return NextResponse.json({
        reply: list + dealsHint,
        ai: false,
        source: "rollcall",
      });
    }

    const catalogBlock = brands
      .map((b) => `${b.shortName} | id: ${b.id} | ${b.tag ?? "venue"} | ${siteUrl}/${b.id}`)
      .join("\n");

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({
        reply:
          "I’d love to chat properly — add OPENAI_API_KEY on the server for full answers. Meanwhile tap the quick picks above or open any venue card to explore 🔥",
        ai: false,
        source: "no_key",
      });
    }

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.75,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: [
            "You are a real Bassik host texting a guest (Hyderabad: clubs, lounges, sports bars).",
            "Sound human: natural contractions, short lines, like WhatsApp — not corporate, not ‘As an AI’. No markdown.",
            "Say venue(s), not ‘outlet(s)’ — guests understand that better.",
            "The user’s ACTUAL question comes in their message — answer that first. Do not ignore it to push a generic pitch.",
            "If they ask what venues you have, how many, or to name/list them: list EVERY venue from the catalog by shortName (one per line, optional tag). Then one short line + site link:",
            siteUrl,
            "Venue catalog (only these exist — do not invent names):",
            catalogBlock,
            "When they ask about discounts, deals, prices, or offers: use the deal summary below in plain language, say it varies by venue and date, and nudge them to open the venue page for exact timings. Mention book-direct / website-only value when it fits.",
            BASSIK_DEALS_FOR_AI,
            "When they ask which venue fits a vibe (rooftop, dining, live music, etc.), ONLY suggest from this homepage mapping — do not invent other pairings:",
            homeVibeMapForPrompt(),
            "Each venue’s positioning (use when they ask what’s unique / different / best for X):",
            formatVenueUniquenessForPrompt(),
            "For other questions (booking, which place): stay within the catalog. Light emoji is ok (0–2 for the whole reply). Keep answers compact unless they asked for a full list.",
            `Cap the reply around ${MAX_REPLY_CHARS} characters.`,
          ].join("\n\n"),
        },
        { role: "user", content: userMessage },
      ],
    });

    let reply =
      completion.choices[0]?.message?.content?.trim() ||
      `Ask me anything about our venues — or browse ${siteUrl} 🔥`;
    if (reply.length > MAX_REPLY_CHARS) reply = reply.slice(0, MAX_REPLY_CHARS - 1) + "…";

    return NextResponse.json({ reply, ai: true, source: "openai" });
  } catch (e) {
    console.error("[home-concierge]", e);
    return NextResponse.json(
      {
        reply:
          "Something glitched on our side — refresh and try again, or browse the venue cards above ✨",
        ai: false,
        error: "fallback",
      },
      { status: 200 }
    );
  }
}
