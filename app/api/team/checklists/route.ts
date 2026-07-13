import { NextRequest, NextResponse } from "next/server";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  boardDateWindow,
  buildChecklistBoard,
  getTodayKey,
  isChecklistKind,
} from "@/lib/team-checklists";
import {
  CHECKLIST_DEFAULT_OWNER_ID,
  postsChecklistTitle,
  SOCIAL_BOARD_PLATFORMS,
} from "@/lib/team-checklist-templates";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";
import { isTeamMemberId } from "@/lib/team-members";
import { isTeamOutletId, teamOutletLabel } from "@/lib/team-outlets";

async function loadOwnerChecklists(ownerId: string, dateKeys: string[]) {
  return prisma.teamDailyChecklist.findMany({
    where: { ownerId },
    include: {
      items: {
        include: {
          completions: {
            where: { date: { in: dateKeys } },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
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
  const dateKeys = boardDateWindow(focusDate);

  try {
    const raw = await loadOwnerChecklists(ownerId, dateKeys);
    // Posts completions are not date-windowed the same way — reload posts with all completions
    const posts = raw.find((c) => c.kind === "posts");
    if (posts) {
      const fullPosts = await prisma.teamDailyChecklist.findUnique({
        where: { id: posts.id },
        include: {
          items: {
            include: { completions: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
      if (fullPosts) {
        const idx = raw.findIndex((c) => c.id === posts.id);
        if (idx >= 0) raw[idx] = fullPosts;
      }
    }

    const board = buildChecklistBoard(raw, focusDate);
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
    const outletLabel =
      body.outletId && isTeamOutletId(body.outletId) ? teamOutletLabel(body.outletId) : null;
    const description = [
      body.description?.trim() || "",
      outletLabel ? `Outlet: ${outletLabel}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    let posts = await prisma.teamDailyChecklist.findFirst({
      where: { ownerId, kind: "posts", outletId: null },
      include: { items: true },
    });

    if (!posts) {
      posts = await prisma.teamDailyChecklist.create({
        data: {
          ownerId,
          kind: "posts",
          title: postsChecklistTitle(),
          description: null,
          outletId: null,
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
        description: description || null,
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
