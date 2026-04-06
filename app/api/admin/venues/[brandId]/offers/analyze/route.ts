import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { guardBrandRoute } from "@/lib/admin-api-guard";

export const runtime = "nodejs";

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

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

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
            { type: "image_url", image_url: { url: imageUrl } },
          ] as any,
        },
      ],
      max_tokens: 280,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw) as {
      title?: string;
      description?: string;
      entryLabel?: string;
      capacityText?: string;
      eventDateISO?: string;
    };

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
    return NextResponse.json({ error: "Failed to analyze poster." }, { status: 500 });
  }
}

