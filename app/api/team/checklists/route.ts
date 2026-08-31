import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  buildChecklistBoard,
  getTodayKey,
  isChecklistKind,
} from "@/lib/team-checklists";
import {
  CHECKLIST_DEFAULT_OWNER_ID,
  postsChecklistTitle,
  SOCIAL_BOARD_PLATFORMS,
} from "@/lib/team-checklist-templates";
import { ensureOutletWeekendPosts } from "@/lib/team-ensure-outlet-posts";
import { ensureOutletWeeklyAds } from "@/lib/team-ensure-outlet-ads";
import { ensureDailyDriveHabit } from "@/lib/team-drive-habit";
import { enrichBoardHandoffFileUrls } from "@/lib/team-designer-jobs";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";
import { isTeamMemberId } from "@/lib/team-members";
import { isTeamOutletId, teamOutletLabel } from "@/lib/team-outlets";

type ChecklistRow = Awaited<ReturnType<typeof loadOwnerChecklists>>[number];

/** Single query — avoid N+1 and double loads (Railway RTT is expensive). */
async function loadOwnerChecklists(ownerId: string) {
  return prisma.teamDailyChecklist.findMany({
    where: { ownerId },
    include: {
      items: {
        include: { completions: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

/** Seed missing outlet posts/ads once — skip when already present. */
async function backfillMissingOutletExtras(
  rows: ChecklistRow[],
  ownerId: string,
  createdBy: string
): Promise<boolean> {
  const storyOutlets = [
    ...new Set(
      rows
        .filter((c) => c.kind === "stories" && c.outletId && isTeamOutletId(c.outletId))
        .map((c) => c.outletId as string)
    ),
  ];
  if (storyOutlets.length === 0) return false;

  const postOutlets = new Set(
    rows.filter((c) => c.kind === "posts" && c.outletId).map((c) => c.outletId as string)
  );
  const adOutlets = new Set(
    rows.filter((c) => c.kind === "ads" && c.outletId).map((c) => c.outletId as string)
  );

  const missing = storyOutlets.filter((id) => !postOutlets.has(id) || !adOutlets.has(id));
  if (missing.length === 0) return false;

  await Promise.all(
    missing.map(async (outletId) => {
      const outletLabel = teamOutletLabel(outletId);
      const jobs: Promise<unknown>[] = [];
      if (!postOutlets.has(outletId)) {
        jobs.push(ensureOutletWeekendPosts(prisma, { ownerId, outletId, outletLabel, createdBy }));
      }
      if (!adOutlets.has(outletId)) {
        jobs.push(ensureOutletWeeklyAds(prisma, { ownerId, outletId, outletLabel, createdBy }));
      }
      await Promise.all(jobs);
    })
  );
  return true;
}

export async function GET(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const manageMemberId = req.nextUrl.searchParams.get("manageMemberId");
  const ownerId =
    manageMemberId && session.role === "admin" && isTeamMemberId(manageMemberId)
      ? manageMemberId
      : teamPersonalNoteOwnerId(session);

  const today = getTodayKey();
  const focusRaw = req.nextUrl.searchParams.get("focusDate")?.trim() ?? today;
  const focusDate = /^\d{4}-\d{2}-\d{2}$/.test(focusRaw) ? focusRaw : today;

  try {
    let raw = await loadOwnerChecklists(ownerId);
    const createdBy = teamPersonalNoteOwnerId(session);

    let didDrive = false;
    try {
      didDrive = await ensureDailyDriveHabit(prisma, { ownerId, createdBy });
    } catch (driveErr) {
      console.error("[team/checklists] ensureDailyDriveHabit:", driveErr);
    }
    let didBackfill = false;
    try {
      didBackfill = await backfillMissingOutletExtras(raw, ownerId, createdBy);
    } catch (backfillErr) {
      console.error("[team/checklists] backfillMissingOutletExtras:", backfillErr);
    }
    if (didDrive || didBackfill) {
      raw = await loadOwnerChecklists(ownerId);
    }

    const board = await enrichBoardHandoffFileUrls(
      buildChecklistBoard(raw, focusDate)
    );
    return NextResponse.json({ board, ownerId });
  } catch (err) {
    console.error("[team/checklists] GET error:", err);
    return NextResponse.json({ error: "Failed to load checklists" }, { status: 500 });
  }
}

/** Admin: create an ad-hoc Post item for Amit (or manageMemberId). */
export async function POST(req: NextRequest) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      title?: string;
      description?: string;
      instructions?: string;
      ownerId?: string;
      outletId?: string;
      kind?: string;
    };

    const kind = body.kind && isChecklistKind(body.kind) ? body.kind : "posts";
    if (kind !== "posts") {
      return NextResponse.json({ error: "Use /ensure to create stories or habits" }, { status: 400 });
    }

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    const ownerId =
      body.ownerId && isTeamMemberId(body.ownerId) ? body.ownerId : CHECKLIST_DEFAULT_OWNER_ID;
    const createdBy = teamPersonalNoteOwnerId(session);
    const outletId =
      body.outletId && isTeamOutletId(body.outletId) ? body.outletId : null;
    const outletLabel = outletId ? teamOutletLabel(outletId) : null;
    const description = body.description?.trim() || null;

    let posts = await prisma.teamDailyChecklist.findFirst({
      where: { ownerId, kind: "posts", outletId },
      include: { items: true },
    });

    if (!posts) {
      posts = await prisma.teamDailyChecklist.create({
        data: {
          ownerId,
          kind: "posts",
          title: outletLabel ? `${outletLabel} Posts` : postsChecklistTitle(),
          description: null,
          outletId,
          createdBy,
        },
        include: { items: true },
      });
    }

    const maxSort = Math.max(...posts.items.map((i) => i.sortOrder), -1);
    const item = await prisma.teamChecklistItem.create({
      data: {
        checklistId: posts.id,
        title,
        description,
        instructions: body.instructions?.trim() || null,
        dayOfWeek: null,
        platforms: [...SOCIAL_BOARD_PLATFORMS],
        sortOrder: maxSort + 1,
      },
      include: { completions: true },
    });

    return NextResponse.json({ item, checklistId: posts.id });
  } catch (err) {
    console.error("[team/checklists] POST error:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
