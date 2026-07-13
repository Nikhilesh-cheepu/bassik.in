import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  CHECKLIST_DEFAULT_OWNER_ID,
  defaultStoryItems,
  postsChecklistTitle,
  storiesChecklistTitle,
} from "@/lib/team-checklist-templates";
import { ensureOutletWeekendPosts } from "@/lib/team-ensure-outlet-posts";
import { ensureOutletWeeklyAds } from "@/lib/team-ensure-outlet-ads";
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
      const existingStories = await prisma.teamDailyChecklist.findFirst({
        where: { ownerId, kind: "stories", outletId },
      });
      if (existingStories) {
        await prisma.teamDailyChecklist.delete({ where: { id: existingStories.id } });
      }
      const existingPosts = await prisma.teamDailyChecklist.findFirst({
        where: { ownerId, kind: "posts", outletId },
      });
      if (existingPosts) {
        await prisma.teamDailyChecklist.delete({ where: { id: existingPosts.id } });
      }
      const existingAds = await prisma.teamDailyChecklist.findFirst({
        where: { ownerId, kind: "ads", outletId },
      });
      if (existingAds) {
        await prisma.teamDailyChecklist.delete({ where: { id: existingAds.id } });
      }
      return NextResponse.json({ ok: true, disabled: true, outletId });
    }

    // Habits removed from Daily Checklist UI — skip creating new habit lists.

    // General ad-hoc posts bucket — once per owner
    let generalPosts = await prisma.teamDailyChecklist.findFirst({
      where: { ownerId, kind: "posts", outletId: null },
    });
    if (!generalPosts) {
      generalPosts = await prisma.teamDailyChecklist.create({
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

    // Fri / Sat / Sun posts for outlet (due 4 days before)
    const outletPosts = await ensureOutletWeekendPosts(prisma, {
      ownerId,
      outletId,
      outletLabel: label,
      createdBy,
    });

    // Weekly Mon–Sun ads for outlet
    const outletAds = await ensureOutletWeeklyAds(prisma, {
      ownerId,
      outletId,
      outletLabel: label,
      createdBy,
    });

    return NextResponse.json({
      ok: true,
      outletId,
      storiesId: stories.id,
      postsId: generalPosts.id,
      outletPostsId: outletPosts.id,
      outletAdsId: outletAds.id,
    });
  } catch (err) {
    console.error("[team/checklists/ensure] POST error:", err);
    return NextResponse.json({ error: "Failed to enable outlet checklist" }, { status: 500 });
  }
}
