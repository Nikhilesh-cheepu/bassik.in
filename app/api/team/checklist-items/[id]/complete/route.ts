import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getTeamFromRequest } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import {
  getTodayKey,
  handoffByDateFromJson,
  handoffForDate,
  isChecklistPlatformId,
  isHandoffDownloadReady,
  parsePlatforms,
  platformsFromJson,
  readyDatesFromJson,
  serializeHandoffMap,
  type HandoffStatus,
} from "@/lib/team-checklists";
import {
  DRIVE_CHECKLIST_KIND,
  DRIVE_HABIT_ITEM_TITLE,
  parseDriveOutcome,
  platformsForDriveOutcome,
  SOCIAL_BOARD_PLATFORMS,
} from "@/lib/team-checklist-templates";
import { teamPersonalNoteOwnerId } from "@/lib/team-personal-notes";

function creativeKindsNeedingFile(kind: string): boolean {
  return kind === "stories" || kind === "posts" || kind === "ads";
}

function assertDownloadReadyOrClose(params: {
  kind: string;
  handoff: Prisma.JsonValue | null;
  readyDates: Prisma.JsonValue | null;
  date: string;
  closeWithoutCreative: boolean;
  isAdmin: boolean;
}): NextResponse | null {
  if (!creativeKindsNeedingFile(params.kind)) return null;
  if (params.closeWithoutCreative) {
    if (!params.isAdmin) {
      return NextResponse.json(
        { error: "Only admin can Close without a creative" },
        { status: 403 }
      );
    }
    return null;
  }
  const map = handoffByDateFromJson(params.handoff);
  const readyList = readyDatesFromJson(params.readyDates);
  const resolved = handoffForDate(map, readyList, params.date);
  if (!isHandoffDownloadReady(resolved)) {
    return NextResponse.json(
      {
        error:
          "Done requires a Ready creative with a file. Admin can use Close to skip posting.",
      },
      { status: 400 }
    );
  }
  return null;
}

function syncReadyDates(
  readyDates: string[],
  dateKey: string,
  status: HandoffStatus
): string[] {
  if (status === "ready") {
    return readyDates.includes(dateKey) ? readyDates : [...readyDates, dateKey];
  }
  return readyDates.filter((d) => d !== dateKey);
}

/** Reopen Done → also drop Ready so Amit doesn’t see it until uploaded again. */
async function clearReadyForDate(
  item: {
    id: string;
    handoff: Prisma.JsonValue | null;
    readyDates: Prisma.JsonValue | null;
  },
  date: string
) {
  const map = handoffByDateFromJson(item.handoff);
  map[date] = { status: "wait" };
  await prisma.teamChecklistItem.update({
    where: { id: item.id },
    data: {
      handoff: serializeHandoffMap(map),
      readyDates: syncReadyDates(readyDatesFromJson(item.readyDates), date, "wait"),
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getTeamFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const completedBy = teamPersonalNoteOwnerId(session);
  const today = getTodayKey();

  try {
    const body = (await req.json().catch(() => ({}))) as {
      date?: string;
      togglePlatform?: string;
      platforms?: unknown;
      markComplete?: boolean;
      /** Admin skip — close without Ready/download */
      closeWithoutCreative?: boolean;
      /** Drive habit: done (posted) | nothing_new */
      driveOutcome?: string;
    };

    const item = await prisma.teamChecklistItem.findUnique({
      where: { id },
      include: { checklist: true, completions: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.checklist.ownerId !== completedBy && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isAdmin = session.role === "admin";
    const closeWithoutCreative = Boolean(body.closeWithoutCreative);
    const kind = item.checklist.kind;
    const isDriveHabit =
      kind === DRIVE_CHECKLIST_KIND ||
      (kind === "habits" && item.title === DRIVE_HABIT_ITEM_TITLE);
    const isPost = kind === "posts";
    const isRecurringPost = isPost && Boolean(item.dayOfWeek);
    const bodyDateRaw = typeof body.date === "string" ? body.date.trim() : "";
    const bodyDate = /^\d{4}-\d{2}-\d{2}$/.test(bodyDateRaw) ? bodyDateRaw : null;

    // Compulsory Drive photo check — Done or Nothing new (no Ready creative).
    if (isDriveHabit) {
      const date = bodyDate ?? today;
      const existing = await prisma.teamChecklistCompletion.findUnique({
        where: { itemId_date: { itemId: id, date } },
      });

      if (body.markComplete === false) {
        if (existing) {
          await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
        }
        return NextResponse.json({
          completed: false,
          date,
          completedPlatforms: [],
          driveOutcome: null,
        });
      }

      const outcomeRaw =
        body.driveOutcome === "nothing_new"
          ? "nothing_new"
          : body.driveOutcome === "done"
            ? "done"
            : null;
      if (!outcomeRaw && body.markComplete !== true) {
        return NextResponse.json(
          { error: "driveOutcome must be done or nothing_new" },
          { status: 400 }
        );
      }
      const outcome = outcomeRaw ?? "done";
      const platforms = platformsForDriveOutcome(outcome);
      const row = await prisma.teamChecklistCompletion.upsert({
        where: { itemId_date: { itemId: id, date } },
        create: { itemId: id, completedBy, date, completedPlatforms: platforms },
        update: { completedBy, completedPlatforms: platforms },
      });
      return NextResponse.json({
        completed: true,
        date,
        completedPlatforms: platformsFromJson(row.completedPlatforms),
        driveOutcome: parseDriveOutcome(platformsFromJson(row.completedPlatforms)),
      });
    }

    // One-shot posts (no dayOfWeek): single completion
    if (isPost && !isRecurringPost) {
      const existing = item.completions[0] ?? null;
      const date = bodyDate ?? existing?.date ?? today;

      if (typeof body.markComplete === "boolean" && body.togglePlatform === undefined) {
        if (body.markComplete) {
          const deny = assertDownloadReadyOrClose({
            kind,
            handoff: item.handoff,
            readyDates: item.readyDates,
            date,
            closeWithoutCreative,
            isAdmin,
          });
          if (deny) return deny;
          const platforms = [...SOCIAL_BOARD_PLATFORMS];
          const row = existing
            ? await prisma.teamChecklistCompletion.update({
                where: { id: existing.id },
                data: { completedBy, completedPlatforms: platforms },
              })
            : await prisma.teamChecklistCompletion.create({
                data: {
                  itemId: id,
                  completedBy,
                  date,
                  completedPlatforms: platforms,
                },
              });
          return NextResponse.json({
            completed: true,
            date: row.date,
            completedPlatforms: platformsFromJson(row.completedPlatforms),
            closedWithoutCreative: closeWithoutCreative || undefined,
          });
        }
        if (existing) {
          await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
        }
        await clearReadyForDate(item, date);
        return NextResponse.json({ completed: false, date, completedPlatforms: [], readyCleared: true });
      }

      if (typeof body.togglePlatform === "string") {
        const platform = body.togglePlatform.trim().toLowerCase();
        if (!isChecklistPlatformId(platform)) {
          return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
        }
        let next = existing ? platformsFromJson(existing.completedPlatforms) : [];
        next = next.includes(platform) ? next.filter((p) => p !== platform) : [...next, platform];
        if (next.length === 0) {
          if (existing) await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
          return NextResponse.json({ completed: false, date, completedPlatforms: [] });
        }
        const row = existing
          ? await prisma.teamChecklistCompletion.update({
              where: { id: existing.id },
              data: { completedBy, completedPlatforms: next },
            })
          : await prisma.teamChecklistCompletion.create({
              data: { itemId: id, completedBy, date, completedPlatforms: next },
            });
        return NextResponse.json({
          completed: true,
          date: row.date,
          completedPlatforms: platformsFromJson(row.completedPlatforms),
        });
      }

      // default toggle complete
      if (existing) {
        await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
        return NextResponse.json({ completed: false, date, completedPlatforms: [] });
      }
      {
        const deny = assertDownloadReadyOrClose({
          kind,
          handoff: item.handoff,
          readyDates: item.readyDates,
          date: today,
          closeWithoutCreative,
          isAdmin,
        });
        if (deny) return deny;
      }
      const row = await prisma.teamChecklistCompletion.create({
        data: {
          itemId: id,
          completedBy,
          date: today,
          completedPlatforms: [...SOCIAL_BOARD_PLATFORMS],
        },
      });
      return NextResponse.json({
        completed: true,
        date: row.date,
        completedPlatforms: platformsFromJson(row.completedPlatforms),
      });
    }

    // Stories / habits / recurring weekend posts: date-keyed
    const date = bodyDate ?? today;

    const existing = await prisma.teamChecklistCompletion.findUnique({
      where: { itemId_date: { itemId: id, date } },
    });

    if (
      typeof body.markComplete === "boolean" &&
      body.togglePlatform === undefined &&
      body.platforms === undefined
    ) {
      if (body.markComplete) {
        const deny = assertDownloadReadyOrClose({
          kind,
          handoff: item.handoff,
          readyDates: item.readyDates,
          date,
          closeWithoutCreative,
          isAdmin,
        });
        if (deny) return deny;
        const platforms =
          existing && platformsFromJson(existing.completedPlatforms).length
            ? platformsFromJson(existing.completedPlatforms)
            : [...SOCIAL_BOARD_PLATFORMS];
        const row = await prisma.teamChecklistCompletion.upsert({
          where: { itemId_date: { itemId: id, date } },
          create: { itemId: id, completedBy, date, completedPlatforms: platforms },
          update: { completedBy, completedPlatforms: platforms },
        });
        return NextResponse.json({
          completed: true,
          date,
          completedPlatforms: platformsFromJson(row.completedPlatforms),
          closedWithoutCreative: closeWithoutCreative || undefined,
        });
      }
      if (existing) {
        await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
      }
      await clearReadyForDate(item, date);
      return NextResponse.json({ completed: false, date, completedPlatforms: [], readyCleared: true });
    }

    if (typeof body.togglePlatform === "string") {
      const platform = body.togglePlatform.trim().toLowerCase();
      if (!isChecklistPlatformId(platform)) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
      }
      let next = existing ? platformsFromJson(existing.completedPlatforms) : [];
      next = next.includes(platform) ? next.filter((p) => p !== platform) : [...next, platform];
      if (next.length === 0) {
        if (existing) await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
        return NextResponse.json({ completed: false, date, completedPlatforms: [] });
      }
      const row = await prisma.teamChecklistCompletion.upsert({
        where: { itemId_date: { itemId: id, date } },
        create: { itemId: id, completedBy, date, completedPlatforms: next },
        update: { completedBy, completedPlatforms: next },
      });
      return NextResponse.json({
        completed: true,
        date,
        completedPlatforms: platformsFromJson(row.completedPlatforms),
      });
    }

    if (body.platforms !== undefined) {
      const next = parsePlatforms(body.platforms);
      if (next.length === 0) {
        if (existing) await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
        return NextResponse.json({ completed: false, date, completedPlatforms: [] });
      }
      const row = await prisma.teamChecklistCompletion.upsert({
        where: { itemId_date: { itemId: id, date } },
        create: { itemId: id, completedBy, date, completedPlatforms: next },
        update: { completedBy, completedPlatforms: next },
      });
      return NextResponse.json({
        completed: true,
        date,
        completedPlatforms: platformsFromJson(row.completedPlatforms),
      });
    }

    if (existing) {
      await prisma.teamChecklistCompletion.delete({ where: { id: existing.id } });
      return NextResponse.json({ completed: false, date, completedPlatforms: [] });
    }

    {
      const deny = assertDownloadReadyOrClose({
        kind,
        handoff: item.handoff,
        readyDates: item.readyDates,
        date,
        closeWithoutCreative,
        isAdmin,
      });
      if (deny) return deny;
    }

    const row = await prisma.teamChecklistCompletion.create({
      data: {
        itemId: id,
        completedBy,
        date,
        completedPlatforms: [...SOCIAL_BOARD_PLATFORMS],
      },
    });
    return NextResponse.json({
      completed: true,
      date,
      completedPlatforms: platformsFromJson(row.completedPlatforms),
    });
  } catch (err) {
    console.error("[team/checklist-items/[id]/complete] POST error:", err);
    return NextResponse.json({ error: "Failed to toggle completion" }, { status: 500 });
  }
}
