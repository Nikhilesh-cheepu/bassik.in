import OpenAI from "openai";
import { TEAM_AD_OUTLETS, teamOutletLabel } from "@/lib/team-outlets";
import { linkDisplayLabel } from "@/lib/team-personal-notes";

export type VaultAiSuggestion = {
  title: string;
  category: string;
};

const VAULT_CATEGORIES = [
  "Social media",
  "Ads & analytics",
  "POS & billing",
  "Email",
  "Domain & hosting",
  "Banking",
  "Vendor",
  "General",
] as const;

export async function suggestVaultTitle(input: {
  url?: string | null;
  username?: string | null;
  notes?: string | null;
  outletId?: string | null;
}): Promise<VaultAiSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI is not configured (missing OPENAI_API_KEY).");
  }

  const url = input.url?.trim() ?? "";
  const username = input.username?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  if (!url && !username && notes.length < 8) {
    throw new Error("Add a URL, username, or short note for AI.");
  }

  const outlet = input.outletId ? teamOutletLabel(input.outletId) : "Direct";
  const hostHint = url ? linkDisplayLabel(url) : "";
  const outlets = TEAM_AD_OUTLETS.map((o) => o.label).join(", ");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 120,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You label password vault entries for Bassik nightlife marketing team (Hyderabad outlets: ${outlets}).
Return JSON only: { "title": string, "category": string }
- title: short human label ≤ 50 chars (e.g. "Instagram — Club Rogue", "Meta Ads Manager"). Never include passwords.
- category: exactly one of: ${VAULT_CATEGORIES.join(", ")}
- Outlet context: ${outlet}`,
      },
      {
        role: "user",
        content: [
          url ? `URL: ${url} (${hostHint})` : null,
          username ? `Username: ${username}` : null,
          notes ? `Notes: ${notes.slice(0, 300)}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("No AI response.");

  let parsed: { title?: string; category?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Could not parse AI response.");
  }

  const title = (parsed.title ?? (hostHint || username || "Login")).trim().slice(0, 120);
  const category = (parsed.category ?? "General").trim().slice(0, 80);
  if (!title) throw new Error("AI returned an empty title.");

  return { title, category };
}
