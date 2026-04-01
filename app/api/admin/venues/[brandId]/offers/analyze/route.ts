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
          content:
            "You extract event details from nightclub event posters. Return strict JSON with keys: title, description, entryLabel, capacityText. Keep description short (max 18 words). If missing, return empty string.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Extract event details for outlet ${brandId}.` },
            { type: "image_url", image_url: { url: imageUrl } },
          ] as any,
        },
      ],
      max_tokens: 220,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw) as {
      title?: string;
      description?: string;
      entryLabel?: string;
      capacityText?: string;
    };

    return NextResponse.json({
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      description: typeof parsed.description === "string" ? parsed.description.trim() : "",
      entryLabel: typeof parsed.entryLabel === "string" ? parsed.entryLabel.trim() : "",
      capacityText: typeof parsed.capacityText === "string" ? parsed.capacityText.trim() : "",
    });
  } catch (error) {
    console.error("[offers analyze]", error);
    return NextResponse.json({ error: "Failed to analyze poster." }, { status: 500 });
  }
}

