import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { looksLikeTaskBrief, parseBriefForTasks, shouldTryTaskParse } from "@/lib/team-ai-tasks";
import { createTeamAdTasks } from "@/lib/team-task-create";
import { runTeamAiChat, type TeamAiMessage } from "@/lib/team-ai";
import { teamOutletLabel } from "@/lib/team-outlets";
import { teamMemberName } from "@/lib/team-members";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "viewer" || session.role === "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: TeamAiMessage[] = raw
    .filter(
      (m: unknown): m is TeamAiMessage =>
        Boolean(m) &&
        typeof m === "object" &&
        ((m as TeamAiMessage).role === "user" || (m as TeamAiMessage).role === "assistant") &&
        typeof (m as TeamAiMessage).content === "string"
    )
    .slice(-12);

  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Send a user message" }, { status: 400 });
  }

  const lastUser = messages[messages.length - 1]!.content;
  const userContext = messages
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => m.content)
    .join("\n");
  const isAdmin = session.role === "admin";

  try {
    if (shouldTryTaskParse(lastUser, isAdmin)) {
      const parsed = await parseBriefForTasks(lastUser, userContext);
      const willCreate = isAdmin && parsed.tasks.length > 0 && (parsed.shouldCreateTasks || looksLikeTaskBrief(lastUser));

      if (willCreate) {
        const { created, errors } = await createTeamAdTasks(parsed.tasks, session.username);
        const lines = created.map(
          (t) =>
            `• ${t.title} — ${teamOutletLabel(t.outletId)} → ${teamMemberName(t.assigneeId)} [HIGH]`
        );
        let reply = parsed.reply;
        if (created.length) {
          reply += `\n\n✓ Created ${created.length} task(s):\n${lines.join("\n")}`;
        }
        if (errors.length) {
          reply += `\n\n⚠ ${errors.length} could not be created:\n${errors.map((e) => `• ${e}`).join("\n")}`;
        }
        return NextResponse.json({ reply, createdTasks: created });
      }

      if (parsed.shouldCreateTasks && !isAdmin) {
        return NextResponse.json({
          reply: `${parsed.reply}\n\n(Only admin can auto-create tasks — ask admin to paste this brief.)`,
          previewTasks: parsed.tasks,
        });
      }

      if (parsed.tasks.length > 0 || looksLikeTaskBrief(lastUser)) {
        return NextResponse.json({ reply: parsed.reply, previewTasks: parsed.tasks });
      }
    }

    const [openTasks, planningNotes] = await Promise.all([
      prisma.teamAdTask.findMany({
        where: { status: "TODO" },
        orderBy: [{ priority: "asc" }, { sortOrder: "asc" }],
        take: 15,
      }),
      prisma.teamPlanningNote.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const reply = await runTeamAiChat(messages, { openTasks, planningNotes });
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[team ai]", e);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
