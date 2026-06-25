import OpenAI from "openai";
import { TEAM_AD_OUTLETS, isTeamOutletId } from "@/lib/team-outlets";
import { getTeamMemberRoster, isTeamMemberId } from "@/lib/team-members";
import { normalizeTeamPriority } from "@/lib/team-priority";
import { normalizeTeamStartDate } from "@/lib/team-tasks";
import { normalizeTeamEndTime } from "@/lib/team-end-time";
import type { CreateTeamAdTaskInput } from "@/lib/team-task-create";

const OUTLET_MAP = TEAM_AD_OUTLETS.map((o) => `${o.label} → ${o.id}`).join("\n");

const PARSE_SYSTEM = `You parse Bassik team ad briefs into structured tasks. Today is used to infer year when only day+month given (e.g. "26 June" → 2026-06-26 if June 2026 is upcoming).

Valid outlet ids (match fuzzy names like "Club Rogue Gachibowli"):
${OUTLET_MAP}

Team members: ${getTeamMemberRoster().map((m) => `${m.name} → ${m.id}`).join(", ")}

When the user pastes a brief with outlets + links + event/deadline dates, set shouldCreateTasks=true and fill tasks (one per outlet/creative line).
Defaults unless overridden:
- priority: HIGH
- startDate: ASAP
- endDate + deadlineDate: event date
- endTime + deadlineTime: "evening" when they say evening/11pm/11
- assigneeId: amit (SEO) unless specified
- creativeUrl: Instagram/Drive link on that line
- title: shared campaign title + outlet/theme suffix when multiple lines

If the message is a normal question (summarize, advice), set shouldCreateTasks=false and tasks=[].

Respond with JSON only:
{
  "shouldCreateTasks": boolean,
  "tasks": [{ "outletId", "title", "description?", "creativeUrl?", "referenceUrls?", "startDate?", "endDate?", "endTime?", "deadlineDate?", "deadlineTime?", "priority?", "assigneeId?" }],
  "reply": "short friendly message — list what you created or answer the question"
}`;

type RawParsed = {
  shouldCreateTasks?: boolean;
  tasks?: unknown[];
  reply?: string;
};

export type ParsedBriefResult = {
  shouldCreateTasks: boolean;
  tasks: CreateTeamAdTaskInput[];
  reply: string;
};

function normalizeTask(raw: unknown): CreateTeamAdTaskInput | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const outletId = typeof t.outletId === "string" ? t.outletId.trim() : "";
  const title = typeof t.title === "string" ? t.title.trim() : "";
  if (!outletId || !title || !isTeamOutletId(outletId)) return null;

  const assigneeId =
    typeof t.assigneeId === "string" && isTeamMemberId(t.assigneeId.trim())
      ? t.assigneeId.trim()
      : undefined;

  const creativeUrl = typeof t.creativeUrl === "string" ? t.creativeUrl.trim() : undefined;
  const description = typeof t.description === "string" ? t.description.trim() : undefined;
  const startRaw = typeof t.startDate === "string" ? t.startDate.trim() : "";
  const endDate = typeof t.endDate === "string" ? t.endDate.trim() : undefined;
  const endTime = typeof t.endTime === "string" ? normalizeTeamEndTime(t.endTime) ?? undefined : undefined;
  const deadlineDate = typeof t.deadlineDate === "string" ? t.deadlineDate.trim() : undefined;
  const deadlineTime =
    typeof t.deadlineTime === "string" ? normalizeTeamEndTime(t.deadlineTime) ?? undefined : undefined;

  const startDate = startRaw ? normalizeTeamStartDate(startRaw) ?? undefined : undefined;
  const priority = normalizeTeamPriority(
    typeof t.priority === "string" ? t.priority : "HIGH"
  );

  const referenceUrls = Array.isArray(t.referenceUrls)
    ? t.referenceUrls.filter((u): u is string => typeof u === "string" && Boolean(u.trim()))
    : undefined;

  return {
    outletId,
    title,
    description,
    creativeUrl,
    referenceUrls,
    startDate: startDate ?? undefined,
    endDate: endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : undefined,
    endTime,
    deadlineDate: deadlineDate && /^\d{4}-\d{2}-\d{2}$/.test(deadlineDate) ? deadlineDate : undefined,
    deadlineTime,
    priority,
    assigneeId,
  };
}

export function looksLikeTaskBrief(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) return false;
  const hasUrl = /https?:\/\//i.test(t);
  const hasOutlet =
    /club\s*rogue|gachibowli|kondapur|jubilee|boiler|firefly|c53|komma|kiik|asil/i.test(t);
  const hasBriefCue = /asap|deadline|event|ad end|friday|outlet/i.test(t);
  return hasUrl && (hasOutlet || hasBriefCue || t.split("\n").length >= 3);
}

export async function parseBriefForTasks(userText: string): Promise<ParsedBriefResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      shouldCreateTasks: false,
      tasks: [],
      reply: "AI is not configured (missing OPENAI_API_KEY).",
    };
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PARSE_SYSTEM },
      { role: "user", content: userText },
    ],
  });

  const rawText = completion.choices[0]?.message?.content?.trim() ?? "{}";
  let parsed: RawParsed = {};
  try {
    parsed = JSON.parse(rawText) as RawParsed;
  } catch {
    return {
      shouldCreateTasks: false,
      tasks: [],
      reply: "Could not parse that brief — try again with outlet names and links on separate lines.",
    };
  }

  const tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
    .map(normalizeTask)
    .filter((t): t is CreateTeamAdTaskInput => t !== null);

  const reply =
    typeof parsed.reply === "string" && parsed.reply.trim()
      ? parsed.reply.trim()
      : tasks.length
        ? `Parsed ${tasks.length} task(s).`
        : "Got it.";

  return {
    shouldCreateTasks: Boolean(parsed.shouldCreateTasks) && tasks.length > 0,
    tasks,
    reply,
  };
}
