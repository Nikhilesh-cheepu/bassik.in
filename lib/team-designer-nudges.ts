import { prisma } from "@/lib/db";
import { getTodayKey } from "@/lib/team-checklists";
import {
  DESIGNER_DAILY_TARGET,
  DESIGNER_PERFORMANCE_IDS,
  designerDisplayName,
  type DesignerNudgeKind,
  type DesignerReminderLogDto,
} from "@/lib/team-designer-jobs-shared";
import {
  computeDesignerPerformance,
  istHourNow,
  listReadyToStartJobs,
  type ReadyJobLine,
} from "@/lib/team-designer-performance";
import { sendDesignerWhatsApp, whatsAppShareUrl, designerWaPhone } from "@/lib/team-wa-cloud";

function formatReadyList(jobs: ReadyJobLine[], cap = 5): string {
  if (jobs.length === 0) return "(no ready-to-start jobs)";
  const lines = jobs.slice(0, cap).map((j) => {
    const due =
      j.isOverdue ? "OVERDUE" : j.isDueToday ? "due today" : `due ${j.dueDate.slice(8)}/${j.dueDate.slice(5, 7)}`;
    return `• ${j.title} (${due})`;
  });
  const more = jobs.length > cap ? `\n+${jobs.length - cap} more` : "";
  return lines.join("\n") + more;
}

function buildNudgeBody(params: {
  kind: DesignerNudgeKind;
  name: string;
  closedToday: number;
  readyToStart: number;
  readyJobs: ReadyJobLine[];
}): string {
  const list = formatReadyList(params.readyJobs);
  const targetNote =
    "Daily target is 4 closed jobs. Ready briefs can land any day — finishing this week’s calendar does not pause work.";

  switch (params.kind) {
    case "no_start":
      return [
        `Hey ${params.name} — you haven’t started any work today.`,
        `${params.readyToStart} job(s) ready to start:`,
        list,
        "",
        targetNote,
        "Open /team → Monthly designer queue → Start Job.",
      ].join("\n");
    case "behind_pace":
      return [
        `Hey ${params.name} — only ${params.closedToday} done today (target ${DESIGNER_DAILY_TARGET}).`,
        `${params.readyToStart} still ready to start:`,
        list,
        "",
        targetNote,
      ].join("\n");
    case "deadline_soon":
      return [
        `Hey ${params.name} — deadline coming soon / overdue on ready work.`,
        list,
        "",
        `Today so far: ${params.closedToday}/${DESIGNER_DAILY_TARGET}.`,
        targetNote,
      ].join("\n");
    case "missed_target":
      return [
        `Hey ${params.name} — red flag: ${params.closedToday}/${DESIGNER_DAILY_TARGET} closed today.`,
        params.readyToStart > 0
          ? `Still ${params.readyToStart} ready to start:\n${list}`
          : "No ready-to-start jobs right now — stay available if new briefs land.",
        "",
        targetNote,
      ].join("\n");
    default:
      return `Hey ${params.name} — check your designer queue.`;
  }
}

function templateParamsFor(
  kind: DesignerNudgeKind,
  name: string,
  closedToday: number,
  readyToStart: number,
  readyJobs: ReadyJobLine[]
): [string, string, string] {
  const summary =
    kind === "no_start"
      ? `Haven't started — ${readyToStart} ready`
      : kind === "behind_pace"
        ? `Only ${closedToday}/${DESIGNER_DAILY_TARGET} done`
        : kind === "deadline_soon"
          ? "Deadline soon on ready jobs"
          : `Missed target ${closedToday}/${DESIGNER_DAILY_TARGET}`;
  const jobList = formatReadyList(readyJobs, 3).replace(/\n/g, " | ").slice(0, 200) || "-";
  return [name, summary, jobList];
}

export async function kindsDueNow(opts?: {
  forceKinds?: DesignerNudgeKind[];
  hour?: number;
}): Promise<DesignerNudgeKind[]> {
  if (opts?.forceKinds?.length) return opts.forceKinds;
  const hour = opts?.hour ?? istHourNow();
  const kinds: DesignerNudgeKind[] = [];
  // ~12:00 IST window (cron 06:30 UTC)
  if (hour >= 11 && hour < 14) kinds.push("no_start");
  // mid-afternoon
  if (hour >= 14 && hour < 17) kinds.push("behind_pace", "deadline_soon");
  // evening red flag
  if (hour >= 18) kinds.push("missed_target", "deadline_soon");
  return kinds;
}

async function alreadyLogged(
  assigneeId: string,
  kind: DesignerNudgeKind,
  dateKey: string
): Promise<boolean> {
  const existing = await prisma.teamDesignerReminderLog.findFirst({
    where: { assigneeId, kind, dateKey },
    select: { id: true },
  });
  return Boolean(existing);
}

export type NudgeRunResult = {
  assigneeId: string;
  kind: DesignerNudgeKind;
  skipped: boolean;
  reason?: string;
  delivery?: DesignerReminderLogDto["delivery"];
  logId?: string;
};

export async function evaluateAndSendDesignerNudges(opts?: {
  assigneeIds?: string[];
  forceKinds?: DesignerNudgeKind[];
  /** Bypass dedupe (manual admin send) */
  force?: boolean;
  hour?: number;
}): Promise<{ ok: true; results: NudgeRunResult[]; dateKey: string }> {
  const dateKey = getTodayKey();
  const assignees = opts?.assigneeIds?.length
    ? opts.assigneeIds
    : [...DESIGNER_PERFORMANCE_IDS];
  const kinds = await kindsDueNow({ forceKinds: opts?.forceKinds, hour: opts?.hour });
  const results: NudgeRunResult[] = [];

  for (const assigneeId of assignees) {
    const perf = await computeDesignerPerformance(assigneeId);
    const readyJobs = await listReadyToStartJobs(assigneeId);
    const name = designerDisplayName(assigneeId);

    for (const kind of kinds) {
      let shouldSend = false;
      let reason = "";

      if (kind === "no_start") {
        shouldSend = !perf.firstStartedAt && perf.readyToStart > 0 && perf.closedToday === 0;
        reason = shouldSend ? "" : "already started or no ready work";
      } else if (kind === "behind_pace") {
        shouldSend = perf.closedToday < 2 && perf.readyToStart > 0;
        reason = shouldSend ? "" : "on pace or no ready work";
      } else if (kind === "deadline_soon") {
        const hot = readyJobs.filter((j) => j.isOverdue || j.isDueToday);
        shouldSend = hot.length > 0;
        reason = shouldSend ? "" : "no due-soon ready jobs";
      } else if (kind === "missed_target") {
        shouldSend = perf.closedToday < DESIGNER_DAILY_TARGET;
        reason = shouldSend ? "" : "hit daily target";
      }

      if (!shouldSend) {
        results.push({ assigneeId, kind, skipped: true, reason });
        continue;
      }

      if (!opts?.force && (await alreadyLogged(assigneeId, kind, dateKey))) {
        results.push({ assigneeId, kind, skipped: true, reason: "already sent today" });
        continue;
      }

      const jobsForBody =
        kind === "deadline_soon"
          ? readyJobs.filter((j) => j.isOverdue || j.isDueToday)
          : readyJobs;

      const body = buildNudgeBody({
        kind,
        name,
        closedToday: perf.closedToday,
        readyToStart: perf.readyToStart,
        readyJobs: jobsForBody.length ? jobsForBody : readyJobs,
      });

      const send = await sendDesignerWhatsApp({
        assigneeId,
        body,
        templateParams: templateParamsFor(
          kind,
          name,
          perf.closedToday,
          perf.readyToStart,
          jobsForBody.length ? jobsForBody : readyJobs
        ),
      });

      const delivery: DesignerReminderLogDto["delivery"] = send.ok
        ? "sent"
        : send.skipped
          ? "skipped_no_config"
          : "failed";

      const log = await prisma.teamDesignerReminderLog.upsert({
        where: {
          assigneeId_kind_dateKey: { assigneeId, kind, dateKey },
        },
        create: {
          assigneeId,
          kind,
          dateKey,
          body,
          delivery,
          metaMessageId: send.ok ? send.messageId : null,
          shareUrl: send.shareUrl,
          error: send.ok ? null : send.error,
        },
        update: {
          body,
          delivery,
          metaMessageId: send.ok ? send.messageId : null,
          shareUrl: send.shareUrl,
          error: send.ok ? null : send.error,
        },
      });

      results.push({
        assigneeId,
        kind,
        skipped: false,
        delivery,
        logId: log.id,
        reason: send.ok ? undefined : send.error,
      });
    }
  }

  return { ok: true, results, dateKey };
}

export function toReminderLogDto(row: {
  id: string;
  assigneeId: string;
  kind: string;
  dateKey: string;
  body: string;
  delivery: string;
  metaMessageId: string | null;
  shareUrl: string | null;
  createdAt: Date;
}): DesignerReminderLogDto {
  return {
    id: row.id,
    assigneeId: row.assigneeId,
    kind: row.kind as DesignerNudgeKind,
    dateKey: row.dateKey,
    body: row.body,
    delivery: row.delivery as DesignerReminderLogDto["delivery"],
    metaMessageId: row.metaMessageId,
    shareUrl:
      row.shareUrl ||
      whatsAppShareUrl(designerWaPhone(row.assigneeId), row.body),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listRecentReminderLogs(limit = 40): Promise<DesignerReminderLogDto[]> {
  const rows = await prisma.teamDesignerReminderLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toReminderLogDto);
}
