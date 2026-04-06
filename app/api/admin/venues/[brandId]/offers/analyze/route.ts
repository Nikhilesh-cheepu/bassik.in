import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { guardBrandRoute } from "@/lib/admin-api-guard";

export const runtime = "nodejs";

/** OpenAI’s servers fetch image_url themselves; some CDNs block that. We fetch here and send base64. */
function isAllowedPosterImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com")
    ) {
      return true;
    }
    const extra =
      process.env.OFFER_ANALYZE_IMAGE_HOSTS?.split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) ?? [];
    return extra.includes(host);
  } catch {
    return false;
  }
}

async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    throw new Error(`Could not load poster image (${res.status}).`);
  }
  const mime =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  if (!mime.startsWith("image/")) {
    throw new Error("Poster URL did not return an image.");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4 * 1024 * 1024) {
    throw new Error("Image is too large for analysis.");
  }
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function parseModelJsonObject(raw: string): Record<string, unknown> {
  let s = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(s);
  if (fence) s = fence[1].trim();
  return JSON.parse(s) as Record<string, unknown>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const denied = await guardBrandRoute(request, brandId);
    if (denied) return denied;

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }
    if (!isAllowedPosterImageUrl(imageUrl)) {
      return NextResponse.json(
        { error: "imageUrl must be a hosted poster from this site’s storage (Vercel Blob)." },
        { status: 400 }
      );
    }

    let imageForVision: string;
    try {
      imageForVision = await fetchImageAsDataUrl(imageUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load poster for AI.";
      return NextResponse.json({ error: msg }, { status: 422 });
    }

    const client = new OpenAI({ apiKey });
    // Do not use OPENAI_MODEL here — it may be a text-only model; vision needs 4o family.
    const model =
      process.env.OPENAI_OFFER_VISION_MODEL?.trim() ||
      process.env.OPENAI_VISION_MODEL?.trim() ||
      "gpt-4o-mini";

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You read nightclub / lounge event posters and return strict JSON only.

Keys (all strings; use "" if unknown):
- title: main event name as on the poster.
- description: one line, max 18 words.
- entryLabel: entry/cover/slot line if visible (e.g. "Happy hours ₹99").
- capacityText: crowd/table hint if visible.
- eventDateISO: the **night the event happens** (show / doors / party date the poster is advertising).

Rules for eventDateISO:
- Format YYYY-MM-DD only (calendar date in the poster's locale; if year missing, infer the next occurrence from "today" context as the upcoming instance).
- Use the **primary headline date** (large/bold date, "Sunday 6th April", "06-04-2026").
- Do NOT use: "valid till", "last day", "offer ends", "expires", fine-print promo end dates, or the **closing** day of a multi-day range — for "Fri–Sun" use the **first** day (Friday).
- If the poster shows only a time range on one night, still output that night as YYYY-MM-DD.
- If no reliable event night date appears, return "".

Do not confuse listing/expiry dates with the event night. endDate / expiry is never eventDateISO.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Extract fields for outlet "${brandId}". Return JSON only.` },
            { type: "image_url", image_url: { url: imageForVision } },
          ] as OpenAI.Chat.ChatCompletionContentPart[],
        },
      ],
      max_tokens: 280,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    let parsed: {
      title?: string;
      description?: string;
      entryLabel?: string;
      capacityText?: string;
      eventDateISO?: string;
    };
    try {
      parsed = parseModelJsonObject(raw) as typeof parsed;
    } catch {
      return NextResponse.json(
        { error: "AI returned unreadable JSON. Try again or shorten the poster text." },
        { status: 502 }
      );
    }

    let eventDateISO = "";
    if (typeof parsed.eventDateISO === "string") {
      const t = parsed.eventDateISO.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) eventDateISO = t;
    }

    return NextResponse.json({
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      description: typeof parsed.description === "string" ? parsed.description.trim() : "",
      entryLabel: typeof parsed.entryLabel === "string" ? parsed.entryLabel.trim() : "",
      capacityText: typeof parsed.capacityText === "string" ? parsed.capacityText.trim() : "",
      eventDateISO,
    });
  } catch (error) {
    console.error("[offers analyze]", error);
    const msg =
      error instanceof OpenAI.APIError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Failed to analyze poster.";
    const status =
      error instanceof OpenAI.APIError && error.status ? error.status : 500;
    return NextResponse.json({ error: msg }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}

