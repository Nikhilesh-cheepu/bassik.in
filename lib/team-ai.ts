import OpenAI from "openai";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { TEAM_PLANNING_LABELS } from "@/lib/team-planning";
import { teamMemberName } from "@/lib/team-members";
import type { TeamPlanningNote, TeamAdTask } from "@prisma/client";

const TEAM_GOALS = `You help the Bassik.in internal marketing team (Hyderabad nightlife & dining outlets).
Goals: ship ad creatives on time, SEO/performance marketing, clear briefs, outlet-specific campaigns.
Outlets: ${TEAM_AD_OUTLETS.map((o) => o.label).join(", ")}.
Be concise, practical, India/Hyderabad context. Suggest priorities, summarize threads, flag risks.
No fluff. Bullet points when listing actions.

To create ad tasks in bulk, paste a brief in the AI tab with outlet names, Instagram/Drive links, event date, and "start ASAP". Tasks are auto-created when the parser runs (admin only).
Never say you created tasks unless the system confirms creation — if the user asks to create tasks, tell them to paste the full brief in one message with assignee and links.`;

export type TeamAiMessage = { role: "user" | "assistant"; content: string };

export async function runTeamAiChat(
  messages: TeamAiMessage[],
  context: { openTasks: TeamAdTask[]; planningNotes: TeamPlanningNote[] }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return "AI is not configured yet (missing OPENAI_API_KEY). Add it in Vercel env to enable suggestions.";
  }

  const taskLines = context.openTasks.slice(0, 12).map((t) => {
    const assignee = teamMemberName(t.assigneeId);
    return `- [${t.priority}] ${t.title} (${assignee}, ${t.outletId})${t.deadlineDate ? ` due ${t.deadlineDate}` : ""}`;
  });

  const noteLines = context.planningNotes.slice(0, 8).map((n) => {
    return `- ${TEAM_PLANNING_LABELS[n.type]}: ${n.title}${n.body ? ` — ${n.body.slice(0, 120)}` : ""}`;
  });

  const contextBlock = [
    taskLines.length ? `Open ad tasks:\n${taskLines.join("\n")}` : "No open ad tasks loaded.",
    noteLines.length ? `Recent planning/discussion:\n${noteLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.5,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content: `${TEAM_GOALS}\n\nCurrent board snapshot:\n${contextBlock}`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || "No response — try again.";
}
