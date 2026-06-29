import OpenAI from "openai";
import type { TeamTaskPriority } from "@prisma/client";
import { TEAM_AD_OUTLETS, isTeamOutletId, type TeamOutletId } from "@/lib/team-outlets";
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
- If user mentions outlet(s) + any work (flyer, post, ad, creative, story, reel, banner, event, edit photos) → shouldCreateTasks=true
- ONE task per outlet when multiple real outlets are named (c53, boiler, firefly…)
- Swiggy and Zomato are platforms — NOT outlets. For "edit for swiggy and zomato" create ONE task with a valid outletId from the list (pick c53 if unsure) and mention swiggy/zomato in title/description
- Brand names not in the outlet list (e.g. Antervedi) → ONE task, use outletId "c53" (or closest match), put brand name in title
- outletId MUST be exactly one of the valid ids from the list above — never invent ids like "antervedi" or "swiggy"
- Links: put Google Drive / Instagram URLs in creativeUrl
- priority: NORMAL when user says normal/not high priority; LOW when they say low; else HIGH
- startDate: ASAP when user says asap/start asap/no due date
- deadlineDate: omit when user says no due date
- Put the user's full message in description when helpful
- reply: only say tasks were created if tasks array is non-empty. If unsure, say what you will create — do not claim creation in reply alone

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

const DEFAULT_TASK_OUTLET = TEAM_AD_OUTLETS[0].id;

function extractUrls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map((m) => m[0]);
}

function detectPriorityFromText(text: string): TeamTaskPriority | undefined {
  const t = text.toLowerCase();
  if (/\b(normal|not high|no high)\b/.test(t)) return "NORMAL";
  if (/\blow priority\b/.test(t)) return "LOW";
  if (/\bhigh priority\b/.test(t)) return "HIGH";
  return undefined;
}

/** Map free text to a valid outlet id; falls back to default when work has no outlet. */
export function resolveOutletId(raw: string, context = ""): string {
  const combined = `${raw} ${context}`.toLowerCase();
  const v = raw.trim().toLowerCase();

  if (v && isTeamOutletId(v)) return v;

  for (const o of TEAM_AD_OUTLETS) {
    if (v === o.id || v.replace(/\s+/g, "") === o.id.replace(/-/g, "")) return o.id;
  }

  const rules: [RegExp, TeamOutletId][] = [
    [/boiler\s*room|boilerroom/i, "boiler-room"],
    [/club\s*rogue.*jubilee|jubilee.*clubrogue/i, "clubrogue-jubilee-hills"],
    [/club\s*rogue.*kondapur|kondapur.*clubrogue/i, "clubrogue-kondapur"],
    [/club\s*rogue.*gachibowli|gachibowli.*clubrogue/i, "clubrogue-gachibowli"],
    [/club\s*rogue\s*general|clubrogue\s*general/i, "clubrogue-general"],
    [/\bbassik\b/i, "bassik"],
    [/gachibowli/i, "clubrogue-gachibowli"],
    [/kondapur/i, "clubrogue-kondapur"],
    [/jubilee/i, "clubrogue-jubilee-hills"],
    [/\bc53\b/i, "c53"],
    [/firefly/i, "firefly"],
    [/komma/i, "komma"],
    [/kiik/i, "kiik69"],
    [/asil/i, "asilmandi"],
  ];

  for (const [re, id] of rules) {
    if (re.test(combined)) return id;
  }

  for (const o of TEAM_AD_OUTLETS) {
    if (combined.includes(o.label.toLowerCase())) return o.id;
  }

  return DEFAULT_TASK_OUTLET;
}

function normalizeTask(
  raw: unknown,
  fallbackAssigneeId: string,
  userContext: string
): CreateTeamAdTaskInput | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const rawOutlet = typeof t.outletId === "string" ? t.outletId.trim() : "";
  const title = typeof t.title === "string" ? t.title.trim() : "";
  if (!title) return null;

  const outletId = resolveOutletId(rawOutlet, userContext);

  const rawAssignee =
    typeof t.assigneeId === "string" ? resolveTeamMemberRef(t.assigneeId) : undefined;
  const assigneeId =
    rawAssignee && isTeamMemberId(rawAssignee) ? rawAssignee : fallbackAssigneeId;

  const urls = extractUrls(userContext);
  const creativeUrl =
    (typeof t.creativeUrl === "string" ? t.creativeUrl.trim() : "") ||
    urls.find((u) => /drive\.google|docs\.google|instagram/i.test(u)) ||
    urls[0] ||
    undefined;

  const description =
    typeof t.description === "string" && t.description.trim()
      ? t.description.trim()
      : userContext.length > title.length
        ? userContext.slice(0, 2000)
        : undefined;

  const startRaw = typeof t.startDate === "string" ? t.startDate.trim() : "";
  const endDate = typeof t.endDate === "string" ? t.endDate.trim() : undefined;
  const endTime = typeof t.endTime === "string" ? normalizeTeamEndTime(t.endTime) ?? undefined : undefined;
  let deadlineDate = typeof t.deadlineDate === "string" ? t.deadlineDate.trim() : undefined;
  const deadlineTime =
    typeof t.deadlineTime === "string" ? normalizeTeamEndTime(t.deadlineTime) ?? undefined : undefined;

  if (/no due date|without due/i.test(userContext)) {
    deadlineDate = undefined;
  }

  const startDate = startRaw
    ? normalizeTeamStartDate(startRaw) ?? undefined
    : /asap|start asap/i.test(userContext)
      ? "ASAP"
      : undefined;

  const textPriority = detectPriorityFromText(userContext);
  const priority = normalizeTeamPriority(
    typeof t.priority === "string" ? t.priority : textPriority ?? "HIGH"
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
  /asap|deadline|due\s*date|event|ad end|flyer|creative|poster|assign|edit|photo|image|swiggy|zomato|drive\.google|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

const CREATE_TASK_COMMAND = /^(create|make|add)\s+(the\s+)?tasks?\.?$/i;

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
export function shouldTryTaskParse(
  text: string,
  isAdmin: boolean,
  conversationContext = ""
): boolean {
  const combined = [conversationContext.trim(), text.trim()].filter(Boolean).join("\n");

  if (isSummarizeQuestion(text) && !looksLikeTaskBrief(combined)) return false;
  if (CREATE_TASK_COMMAND.test(text.trim()) && looksLikeTaskBrief(combined)) return true;

  if (!isAdmin) return looksLikeTaskBrief(combined);
  if (looksLikeTaskBrief(combined)) return true;
  if (OUTLET_PATTERN.test(combined)) return true;
  if (resolveTeamMemberFromText(combined)) return true;
  if (BRIEF_CUE_PATTERN.test(combined) && combined.trim().length >= 12) return true;
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
    .map((t) => normalizeTask(t, fallbackAssignee, fullContext))
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
