import OpenAI from "openai";
import { sanitizeGuestName } from "@/lib/venue-chat-guest";

/** Light PR touch-up for manager sends — keeps facts/links, warms tone. */
export async function polishManagerMessage(
  draft: string,
  context?: { guestName?: string | null; venueName?: string }
): Promise<string> {
  const text = draft.trim();
  if (!text || text.length < 8) return text;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return text;

  const guestName = sanitizeGuestName(context?.guestName);
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.65,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content: [
            "You polish venue PR / guest-relations messages for WhatsApp-style chat.",
            "Keep the same meaning, links, and names. Sound warm and human — not robotic.",
            guestName ? `Guest name: ${guestName} — use it naturally if appropriate.` : "",
            context?.venueName ? `Venue: ${context.venueName}` : "",
            "Return ONLY the polished message text — no quotes or explanation.",
          ]
            .filter(Boolean)
            .join(" "),
        },
        { role: "user", content: text },
      ],
    });
    const out = completion.choices[0]?.message?.content?.trim();
    return out && out.length >= 4 ? out.slice(0, 1200) : text;
  } catch (e) {
    console.error("[polishManagerMessage]", e);
    return text;
  }
}
