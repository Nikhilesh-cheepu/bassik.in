import OpenAI from "openai";
import { TEAM_AD_OUTLETS, teamOutletLabel } from "@/lib/team-outlets";

export type NoteAiEnhancement = {
  title: string;
  summary: string;
  category: string;
  rewrittenBody: string;
};

const NOTE_CATEGORIES = [
  "Planning",
  "Creative brief",
  "References",
  "Team notes",
  "Campaign",
  "Calendar",
  "Ideas",
  "General",
] as const;

export async function enhanceTeamNote(input: {
  title?: string;
  body: string;
  outletId?: string | null;
  mode?: "summarize" | "organize";
}): Promise<NoteAiEnhancement> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI is not configured (missing OPENAI_API_KEY).");
  }

  const body = input.body.trim();
  if (body.length < 12) {
    throw new Error("Write a bit more before asking AI.");
  }

  const outlet = input.outletId ? teamOutletLabel(input.outletId) : "Direct (no outlet)";
  const existingTitle = input.title?.trim() ?? "";
  const organize = input.mode === "organize";
  const outlets = TEAM_AD_OUTLETS.map((o) => o.label).join(", ");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    temperature: organize ? 0.45 : 0.35,
    max_tokens: organize ? 900 : 320,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You help Bassik marketing team notes (Hyderabad nightlife — outlets: ${outlets}).
Return JSON only:
{
  "title": string,
  "summary": string,
  "category": string,
  "rewrittenBody": string
}

Rules:
- title: short headline ≤ 60 chars. Improve if messy; keep if already good.
- summary: 1–3 crisp sentences for the bottom of the note card.
- category: exactly one of: ${NOTE_CATEGORIES.join(", ")}
- rewrittenBody: ${
          organize
            ? "Reframe the user's raw note into clear sections with short headings (plain text, use line breaks). Keep all facts, links, dates, names, outlets. Remove repetition. Do NOT invent details."
            : "Return the original body lightly cleaned (fix typos only, same structure)."
        }
- Outlet tag context: ${outlet}
- India/Hyderabad marketing context when relevant.`,
      },
      {
        role: "user",
        content: existingTitle
          ? `Current title: ${existingTitle}\n\nNote:\n${body}`
          : `Note:\n${body}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("No AI response.");

  let parsed: {
    title?: string;
    summary?: string;
    category?: string;
    rewrittenBody?: string;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Could not parse AI response.");
  }

  const title = (parsed.title ?? existingTitle).trim().slice(0, 120);
  const summary = (parsed.summary ?? "").trim().slice(0, 600);
  const category = (parsed.category ?? "General").trim().slice(0, 80);
  const rewrittenBody = (parsed.rewrittenBody ?? body).trim().slice(0, 20000);

  if (!summary) throw new Error("AI returned an empty summary.");

  return {
    title: title || existingTitle || "Note",
    summary,
    category,
    rewrittenBody: rewrittenBody || body,
  };
}
