import OpenAI from "openai";
import { TEAM_AD_OUTLETS, isTeamOutletId } from "@/lib/team-outlets";
import {
  defaultTeamMemberId,
  getTeamMemberRoster,
  isTeamMemberId,
  resolveTeamMemberFromText,
  resolveTeamMemberRef,
} from "@/lib/team-members";
import { normalizeTeamPriority } from "@/lib/team-priority";
import { normalizeTeamStartDate } from "@/lib/team-tasks";
import { normalizeTeamEndTime } from "@/lib/team-end-time";
import type { CreateTeamAdTaskInput } from "@/lib/team-task-create";

const OUTLET_MAP = TEAM_AD_OUTLETS.map((o) => `${o.label} → ${o.id}`).join("\n");

function buildParseSystem() {
  const memberLines = getTeamMemberRoster()
    .map((m) => `- ${m.name} (say "${m.name}" or "${m.id}") → assigneeId: "${m.id}"`)
    .join("\n");

  return `You parse Bassik team ad briefs into structured tasks. Be FLEXIBLE — the user speaks casually, mixes Hindi/English, uses short lines, and may skip details. Your job is to CREATE tasks, not write long briefs back.

Today is used to infer year when only day+month given (e.g. "27 june" → 2026-06-27).

Valid outlet ids (match fuzzy/short names — boilerroom → boiler-room, c53 → c53):
${OUTLET_MAP}

Team members — ALWAYS set assigneeId when the user names someone:
${memberLines}

Assignee rules:
- "assign to/for Jeslyn", "for Mahesh", "give Amit", "Jeslyn should do" → assigneeId
- One person for whole brief → same assigneeId on every task
- Different people per line → per-task assigneeId
- Only default to amit when NO member is mentioned
- assigneeId must be member id (amit, jeslyn, mahesh), not display name

Task creation rules (default: CREATE tasks):
- If user mentions outlet(s) + any work (flyer, post, ad, creative, story, reel, banner, event) → shouldCreateTasks=true
- ONE task per outlet (comma-separated = multiple tasks)
- Links optional — never block creation because a link is missing
- Infer sensible titles from context ("monday flyer" → "Monday flyer — {outlet}")
- Infer dates from "27th june", "by friday", "asap", "this weekend"
- priority: HIGH unless user says normal/low
- startDate: ASAP unless a start date is given
- Put the user's full message in description when helpful

ONLY set shouldCreateTasks=false for clear questions: "summarize", "what's pending", "who has most tasks" — with NO new work requested.

Respond with JSON only:
{
  "shouldCreateTasks": boolean,
  "defaultAssigneeId": "member id or omit",
  "tasks": [{ "outletId", "title", "description?", "creativeUrl?", "referenceUrls?", "startDate?", "endDate?", "endTime?", "deadlineDate?", "deadlineTime?", "priority?", "assigneeId?" }],
  "reply": "1-2 short sentences — confirm what you created and for whom. No markdown essays."
}`;
}

type RawParsed = {
  shouldCreateTasks?: boolean;
  defaultAssigneeId?: string;
  tasks?: unknown[];
  reply?: string;
};

export type ParsedBriefResult = {
  shouldCreateTasks: boolean;
  tasks: CreateTeamAdTaskInput[];
  reply: string;
};

function normalizeTask(
  raw: unknown,
  fallbackAssigneeId: string
): CreateTeamAdTaskInput | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const outletId = typeof t.outletId === "string" ? t.outletId.trim() : "";
  const title = typeof t.title === "string" ? t.title.trim() : "";
  if (!outletId || !title || !isTeamOutletId(outletId)) return null;

  const rawAssignee =
    typeof t.assigneeId === "string" ? resolveTeamMemberRef(t.assigneeId) : undefined;
  const assigneeId =
    rawAssignee && isTeamMemberId(rawAssignee) ? rawAssignee : fallbackAssigneeId;

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

export function isSummarizeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(summarize|summary|what|how many|list|show me|tell me|who has|status of|help)\b/.test(t);
}

const OUTLET_PATTERN =
  /club\s*rogue|gachibowli|kondapur|jubilee|boiler|firefly|c53|komma|kiik|asil|tollywood/i;

const BRIEF_CUE_PATTERN =
  /asap|deadline|due\s*date|event|ad end|flyer|creative|poster|assign|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

export function looksLikeTaskBrief(text: string): boolean {
  const t = text.trim();
  if (t.length < 15) return false;
  if (isSummarizeQuestion(t)) return false;

  const hasUrl = /https?:\/\//i.test(t);
  const hasOutlet = OUTLET_PATTERN.test(t);
  const hasBriefCue = BRIEF_CUE_PATTERN.test(t);
  const hasMemberCue = resolveTeamMemberFromText(t) !== undefined;
  const multipleOutlets = (t.match(/,/g) || []).length >= 1;

  if (hasUrl && (hasOutlet || hasBriefCue || t.split("\n").length >= 2)) return true;
  if (hasOutlet && (hasBriefCue || hasMemberCue || multipleOutlets)) return true;
  return false;
}

/** Admin: try task parser unless the message is clearly a Q&A request. */
export function shouldTryTaskParse(text: string, isAdmin: boolean): boolean {
  if (isSummarizeQuestion(text)) return false;
  if (!isAdmin) return looksLikeTaskBrief(text);
  // Admin: be flexible — try to create tasks unless it's clearly just a question
  if (looksLikeTaskBrief(text)) return true;
  if (OUTLET_PATTERN.test(text)) return true;
  if (resolveTeamMemberFromText(text)) return true;
  if (BRIEF_CUE_PATTERN.test(text) && text.trim().length >= 12) return true;
  return false;
}

export async function parseBriefForTasks(
  userText: string,
  conversationContext = ""
): Promise<ParsedBriefResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      shouldCreateTasks: false,
      tasks: [],
      reply: "AI is not configured (missing OPENAI_API_KEY).",
    };
  }

  const fullContext = [conversationContext.trim(), userText.trim()].filter(Boolean).join("\n\n");
  const textAssignee = resolveTeamMemberFromText(fullContext);

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const userPayload =
    conversationContext.trim() && conversationContext.trim() !== userText.trim()
      ? `Earlier context from this chat:\n${conversationContext.trim()}\n\nLatest brief:\n${userText}`
      : userText;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildParseSystem() },
      { role: "user", content: userPayload },
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

  const aiDefault =
    resolveTeamMemberRef(parsed.defaultAssigneeId) ??
    resolveTeamMemberFromText(userText) ??
    textAssignee;
  const fallbackAssignee = aiDefault && isTeamMemberId(aiDefault) ? aiDefault : defaultTeamMemberId();

  const tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
    .map((t) => normalizeTask(t, fallbackAssignee))
    .filter((t): t is CreateTeamAdTaskInput => t !== null);

  const reply =
    typeof parsed.reply === "string" && parsed.reply.trim()
      ? parsed.reply.trim()
      : tasks.length
        ? `Parsed ${tasks.length} task(s) for ${getTeamMemberRoster().find((m) => m.id === fallbackAssignee)?.name ?? fallbackAssignee}.`
        : "Got it.";

  return {
    shouldCreateTasks: Boolean(parsed.shouldCreateTasks) && tasks.length > 0,
    tasks,
    reply,
  };
}
