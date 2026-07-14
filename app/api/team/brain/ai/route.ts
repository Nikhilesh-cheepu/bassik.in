import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { teamBrainOwnerId, toTeamBrainItemDto } from "@/lib/team-brain";
import { getTodayKey } from "@/lib/team-checklists";

/** Summarize / explain open HQ brain notes + today's reminders. */
export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { mode?: string };
  const mode = body.mode === "explain" ? "explain" : "summarize";
  const ownerId = teamBrainOwnerId(session);
  const today = getTodayKey();

  const rows = await prisma.teamBrainItem.findMany({
    where: {
      ownerId,
      OR: [{ done: false }, { kind: "reminder", remindOn: today }],
    },
    orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
    take: 80,
  });

  const open = rows.filter((r) => !r.done).map(toTeamBrainItemDto);
  if (open.length === 0) {
    return NextResponse.json({
      summary: "Nothing open in your HQ brain right now. Dump thoughts or set a reminder anytime.",
      bullets: [] as string[],
    });
  }

  const notes = open.filter((i) => i.kind === "note");
  const reminders = open.filter((i) => i.kind === "reminder");
  const list = open
    .map((i) => {
      const tags = i.tags.length ? ` [${i.tags.join(", ")}]` : "";
      const when = i.kind === "reminder" && i.remindOn ? ` (due ${i.remindOn})` : "";
      return `- (${i.kind})${when}${tags} ${i.body}`;
    })
    .join("\n");

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You help Nikhilesh run Bassik HQ (Hyderabad nightlife / multi-outlet ops).
Return JSON only:
{ "summary": string, "bullets": string[] }

${
  mode === "explain"
    ? "Explain clearly what he has captured and what needs attention. Plain language, direct."
    : "Write a short executive summary of open notes + reminders. Group by theme when useful."
}
- summary: 2–5 sentences
- bullets: 3–8 short action / memory points
- Do not invent facts not in the list.
- Today is ${today}. Open notes: ${notes.length}. Open reminders: ${reminders.length}.`,
        },
        { role: "user", content: list },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: { summary?: unknown; bullets?: unknown } = {};
    try {
      parsed = JSON.parse(raw) as { summary?: unknown; bullets?: unknown };
    } catch {
      parsed = {};
    }
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "Here’s what’s on your plate from HQ.";
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0).slice(0, 10)
      : [];

    return NextResponse.json({ summary, bullets, count: open.length });
  } catch (err) {
    console.error("[team/brain/ai]", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
