import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  CHECKLIST_DEFAULT_OWNER_ID,
  defaultStoryItems,
  HABIT_GROUPS_TITLE,
  habitsChecklistTitle,
  postsChecklistTitle,
  SOCIAL_BOARD_PLATFORMS,
  storiesChecklistTitle,
} from "@/lib/team-checklist-templates";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";
import { isTeamMemberId } from "@/lib/team-members";
import { isTeamOutletId, teamOutletLabel } from "@/lib/team-outlets";

/** Admin: enable Stories for an outlet + ensure habits/posts checklists for assignee. */
export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      outletId?: string;
      ownerId?: string;
      disable?: boolean;
    };

    const outletId = body.outletId?.trim() ?? "";
    if (!outletId || !isTeamOutletId(outletId)) {
      return NextResponse.json({ error: "Valid outletId required" }, { status: 400 });
    }

    const ownerId =
      body.ownerId && isTeamMemberId(body.ownerId) ? body.ownerId : CHECKLIST_DEFAULT_OWNER_ID;
    const createdBy = teamPersonalNoteOwnerId(session);
    const label = teamOutletLabel(outletId);

    if (body.disable) {
      const existing = await prisma.teamDailyChecklist.findFirst({
        where: { ownerId, kind: "stories", outletId },
      });
      if (existing) {
        await prisma.teamDailyChecklist.delete({ where: { id: existing.id } });
      }
      return NextResponse.json({ ok: true, disabled: true, outletId });
    }

    // Habits (official groups) — once per owner
    let habits = await prisma.teamDailyChecklist.findFirst({
      where: { ownerId, kind: "habits", outletId: null },
    });
    if (!habits) {
      habits = await prisma.teamDailyChecklist.create({
        data: {
          ownerId,
          kind: "habits",
          title: habitsChecklistTitle(),
          outletId: null,
          createdBy,
          items: {
            create: [
              {
                title: HABIT_GROUPS_TITLE,
                description: null,
                instructions: "Scan official groups. If a post is ready, publish on IG + YT.",
                dayOfWeek: null,
                platforms: [...SOCIAL_BOARD_PLATFORMS],
                sortOrder: 0,
              },
            ],
          },
        },
      });
    }

    // Posts bucket — once per owner
    let posts = await prisma.teamDailyChecklist.findFirst({
      where: { ownerId, kind: "posts", outletId: null },
    });
    if (!posts) {
      posts = await prisma.teamDailyChecklist.create({
        data: {
          ownerId,
          kind: "posts",
          title: postsChecklistTitle(),
          outletId: null,
          createdBy,
        },
      });
    }

    // Stories for outlet
    let stories = await prisma.teamDailyChecklist.findFirst({
      where: { ownerId, kind: "stories", outletId },
      include: { items: true },
    });

    if (!stories) {
      const template = defaultStoryItems();
      stories = await prisma.teamDailyChecklist.create({
        data: {
          ownerId,
          kind: "stories",
          title: storiesChecklistTitle(label),
          outletId,
          createdBy,
          items: {
            create: template.map((t) => ({
              title: t.title,
              instructions: t.instructions,
              dayOfWeek: t.dayOfWeek,
              platforms: t.platforms,
              sortOrder: t.sortOrder,
            })),
          },
        },
        include: { items: true },
      });
    }

    return NextResponse.json({
      ok: true,
      outletId,
      storiesId: stories.id,
      habitsId: habits.id,
      postsId: posts.id,
    });
  } catch (err) {
    console.error("[team/checklists/ensure] POST error:", err);
    return NextResponse.json({ error: "Failed to enable outlet checklist" }, { status: 500 });
  }
}
