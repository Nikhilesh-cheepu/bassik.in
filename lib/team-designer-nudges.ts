import { prisma } from "@/lib/db";
import { getTodayKey } from "@/lib/team-checklists";
import { findActiveDesignerJob } from "@/lib/team-designer-jobs";
import {
  DESIGNER_DAILY_TARGET,
  DESIGNER_PERFORMANCE_IDS,
  designerDisplayName,
  type DesignerNudgeKind,
  type DesignerPriorityMode,
  type DesignerReminderLogDto,
  type DesignerSuggestedNudgeDto,
} from "@/lib/team-designer-jobs-shared";
import {
  computeDesignerPerformance,
  istHourNow,
  istMinuteNow,
  listReadyToStartJobs,
  type ReadyJobLine,
} from "@/lib/team-designer-performance";
import { sendDesignerWhatsApp, whatsAppShareUrl, designerWaPhone } from "@/lib/team-wa-cloud";
import { teamOutletLabel } from "@/lib/team-outlets";

const PAUSE_SUGGEST_MAX_MS = 45 * 60 * 1000;
const FINISH_ASAP_MIN_MS = 60 * 60 * 1000;
/** Follow up when a single job has been In progress this long. */
export const SLOW_TASK_MS = 3 * 60 * 60 * 1000;
/** Morning “haven’t started” window starts (IST). */
export const NO_START_HOUR_IST = 11;
export const NO_START_MINUTE_IST = 20;

function formatDuration(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

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

function nudgeLabel(kind: DesignerNudgeKind): string {
  switch (kind) {
    case "no_start":
      return "Haven’t started today";
    case "slow_task":
      return "Task over 3 hours";
    case "behind_pace":
      return "Behind daily pace";
    case "deadline_soon":
      return "Deadline soon";
    case "missed_target":
      return "Missed 4/day target";
    case "priority_pause_now":
      return "Priority — pause now";
    case "priority_after_current":
      return "Priority — after current";
    default:
      return kind;
  }
}

function buildNudgeBody(params: {
  kind: DesignerNudgeKind;
  name: string;
  closedToday: number;
  readyToStart: number;
  readyJobs: ReadyJobLine[];
  activeTitle?: string | null;
  activeAgeMs?: number | null;
}): string {
  const list = formatReadyList(params.readyJobs);
  const targetNote =
    "Daily target is 4 closed jobs. Ready briefs can land any day — finishing this week’s calendar does not pause work.";

  switch (params.kind) {
    case "no_start":
      return [
        `Hey ${params.name} — you haven’t started any task today.`,
        `${params.readyToStart} job(s) ready to start:`,
        list,
        "",
        targetNote,
        "Open /team → Monthly designer queue → Start Job.",
      ].join("\n");
    case "slow_task":
      return [
        `Hey ${params.name} — follow-up: you’ve been on “${params.activeTitle ?? "this job"}” for ~${formatDuration(params.activeAgeMs ?? SLOW_TASK_MS)}.`,
        "Please wrap this up and move faster so we can hit today’s target.",
        params.readyToStart > 0 ? `\nStill ready after this:\n${list}` : "",
        "",
        `Today so far: ${params.closedToday}/${DESIGNER_DAILY_TARGET}.`,
        targetNote,
      ]
        .filter(Boolean)
        .join("\n");
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
  readyJobs: ReadyJobLine[],
  activeTitle?: string | null
): [string, string, string] {
  const summary =
    kind === "no_start"
      ? `Haven't started — ${readyToStart} ready`
      : kind === "slow_task"
        ? `Over 3h on ${activeTitle ?? "task"} — move faster`
        : kind === "behind_pace"
          ? `Only ${closedToday}/${DESIGNER_DAILY_TARGET} done`
          : kind === "deadline_soon"
            ? "Deadline soon on ready jobs"
            : `Missed target ${closedToday}/${DESIGNER_DAILY_TARGET}`;
  const jobList = formatReadyList(readyJobs, 3).replace(/\n/g, " | ").slice(0, 200) || "-";
  return [name, summary, jobList];
}

/** Cron windows (IST). */
export async function kindsDueNow(opts?: {
  forceKinds?: DesignerNudgeKind[];
  hour?: number;
  minute?: number;
}): Promise<DesignerNudgeKind[]> {
  if (opts?.forceKinds?.length) return opts.forceKinds;
  const hour = opts?.hour ?? istHourNow();
  const minute = opts?.minute ?? istMinuteNow();
  const kinds: DesignerNudgeKind[] = [];

  // From 11:20 IST — haven’t started
  const afterNoStart =
    hour > NO_START_HOUR_IST ||
    (hour === NO_START_HOUR_IST && minute >= NO_START_MINUTE_IST);
  if (afterNoStart && hour < 14) kinds.push("no_start");

  // Slow task check whenever we’re in work hours after morning start
  if (afterNoStart && hour < 21) kinds.push("slow_task");

  if (hour >= 14 && hour < 18) kinds.push("behind_pace", "deadline_soon");
  if (hour >= 18) kinds.push("missed_target", "deadline_soon", "behind_pace");
  return kinds;
}

async function alreadyLogged(
  assigneeId: string,
  kind: DesignerNudgeKind,
  dateKey: string,
  jobId = ""
): Promise<boolean> {
  const existing = await prisma.teamDesignerReminderLog.findFirst({
    where: { assigneeId, kind, dateKey, jobId },
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
  shareUrl?: string;
};

async function logAndMaybeSend(params: {
  assigneeId: string;
  kind: DesignerNudgeKind;
  dateKey: string;
  jobId: string;
  body: string;
  templateParams: [string, string, string];
  force?: boolean;
}): Promise<NudgeRunResult> {
  if (!params.force && (await alreadyLogged(params.assigneeId, params.kind, params.dateKey, params.jobId))) {
    return {
      assigneeId: params.assigneeId,
      kind: params.kind,
      skipped: true,
      reason: "already sent today",
    };
  }

  const send = await sendDesignerWhatsApp({
    assigneeId: params.assigneeId,
    body: params.body,
    templateParams: params.templateParams,
  });

  const delivery: DesignerReminderLogDto["delivery"] = send.ok
    ? "sent"
    : send.skipped
      ? "skipped_no_config"
      : "failed";

  const log = await prisma.teamDesignerReminderLog.upsert({
    where: {
      assigneeId_kind_dateKey_jobId: {
        assigneeId: params.assigneeId,
        kind: params.kind,
        dateKey: params.dateKey,
        jobId: params.jobId,
      },
    },
    create: {
      assigneeId: params.assigneeId,
      kind: params.kind,
      dateKey: params.dateKey,
      jobId: params.jobId,
      body: params.body,
      delivery,
      metaMessageId: send.ok ? send.messageId : null,
      shareUrl: send.shareUrl,
      error: send.ok ? null : send.error,
    },
    update: {
      body: params.body,
      delivery,
      metaMessageId: send.ok ? send.messageId : null,
      shareUrl: send.shareUrl,
      error: send.ok ? null : send.error,
    },
  });

  return {
    assigneeId: params.assigneeId,
    kind: params.kind,
    skipped: false,
    delivery,
    logId: log.id,
    shareUrl: send.shareUrl,
    reason: send.ok ? undefined : send.error,
  };
}

export async function evaluateAndSendDesignerNudges(opts?: {
  assigneeIds?: string[];
  forceKinds?: DesignerNudgeKind[];
  force?: boolean;
  hour?: number;
  minute?: number;
}): Promise<{ ok: true; results: NudgeRunResult[]; dateKey: string }> {
  const dateKey = getTodayKey();
  const assignees = opts?.assigneeIds?.length
    ? opts.assigneeIds
    : [...DESIGNER_PERFORMANCE_IDS];
  const kinds = await kindsDueNow({
    forceKinds: opts?.forceKinds,
    hour: opts?.hour,
    minute: opts?.minute,
  });
  const results: NudgeRunResult[] = [];

  for (const assigneeId of assignees) {
    const perf = await computeDesignerPerformance(assigneeId);
    const readyJobs = await listReadyToStartJobs(assigneeId);
    const name = designerDisplayName(assigneeId);
    const active = await findActiveDesignerJob(assigneeId);
    const activeAgeMs =
      active?.startedAt != null ? Date.now() - active.startedAt.getTime() : null;

    for (const kind of kinds) {
      let shouldSend = false;
      let reason = "";
      let jobId = "";
      let jobsForBody = readyJobs;

      if (kind === "no_start") {
        shouldSend = !perf.firstStartedAt && perf.readyToStart > 0 && perf.closedToday === 0;
        reason = shouldSend ? "" : "already started or no ready work";
      } else if (kind === "slow_task") {
        shouldSend = Boolean(active && activeAgeMs != null && activeAgeMs >= SLOW_TASK_MS);
        jobId = active?.id ?? "";
        reason = shouldSend ? "" : "no job over 3 hours";
      } else if (kind === "behind_pace") {
        shouldSend = perf.closedToday < 2 && perf.readyToStart > 0;
        reason = shouldSend ? "" : "on pace or no ready work";
      } else if (kind === "deadline_soon") {
        jobsForBody = readyJobs.filter((j) => j.isOverdue || j.isDueToday);
        shouldSend = jobsForBody.length > 0;
        reason = shouldSend ? "" : "no due-soon ready jobs";
      } else if (kind === "missed_target") {
        shouldSend = perf.closedToday < DESIGNER_DAILY_TARGET;
        reason = shouldSend ? "" : "hit daily target";
      }

      if (!shouldSend) {
        results.push({ assigneeId, kind, skipped: true, reason });
        continue;
      }

      const body = buildNudgeBody({
        kind,
        name,
        closedToday: perf.closedToday,
        readyToStart: perf.readyToStart,
        readyJobs: jobsForBody.length ? jobsForBody : readyJobs,
        activeTitle: active?.title,
        activeAgeMs,
      });

      results.push(
        await logAndMaybeSend({
          assigneeId,
          kind,
          dateKey,
          jobId,
          body,
          templateParams: templateParamsFor(
            kind,
            name,
            perf.closedToday,
            perf.readyToStart,
            jobsForBody.length ? jobsForBody : readyJobs,
            active?.title
          ),
          force: opts?.force,
        })
      );
    }
  }

  return { ok: true, results, dateKey };
}

/**
 * Live suggestions for admin click-to-WhatsApp (no Cloud API required).
 * Shows whenever conditions are true — not only inside cron windows.
 */
export async function listSuggestedDesignerNudges(): Promise<DesignerSuggestedNudgeDto[]> {
  const out: DesignerSuggestedNudgeDto[] = [];
  const hour = istHourNow();
  const minute = istMinuteNow();
  const afterNoStart =
    hour > NO_START_HOUR_IST ||
    (hour === NO_START_HOUR_IST && minute >= NO_START_MINUTE_IST);

  for (const assigneeId of DESIGNER_PERFORMANCE_IDS) {
    const perf = await computeDesignerPerformance(assigneeId);
    const readyJobs = await listReadyToStartJobs(assigneeId);
    const name = designerDisplayName(assigneeId);
    const active = await findActiveDesignerJob(assigneeId);
    const activeAgeMs =
      active?.startedAt != null ? Date.now() - active.startedAt.getTime() : null;
    const phone = designerWaPhone(assigneeId);

    const push = (kind: DesignerNudgeKind, jobId: string, body: string) => {
      out.push({
        assigneeId,
        name,
        kind,
        label: nudgeLabel(kind),
        body,
        shareUrl: whatsAppShareUrl(phone, body),
        jobId,
      });
    };

    if (afterNoStart && !perf.firstStartedAt && perf.readyToStart > 0 && perf.closedToday === 0) {
      push(
        "no_start",
        "",
        buildNudgeBody({
          kind: "no_start",
          name,
          closedToday: perf.closedToday,
          readyToStart: perf.readyToStart,
          readyJobs,
        })
      );
    }

    if (active && activeAgeMs != null && activeAgeMs >= SLOW_TASK_MS) {
      push(
        "slow_task",
        active.id,
        buildNudgeBody({
          kind: "slow_task",
          name,
          closedToday: perf.closedToday,
          readyToStart: perf.readyToStart,
          readyJobs,
          activeTitle: active.title,
          activeAgeMs,
        })
      );
    }

    if (perf.closedToday < 2 && perf.readyToStart > 0 && afterNoStart && hour >= 14) {
      push(
        "behind_pace",
        "",
        buildNudgeBody({
          kind: "behind_pace",
          name,
          closedToday: perf.closedToday,
          readyToStart: perf.readyToStart,
          readyJobs,
        })
      );
    }

    const hot = readyJobs.filter((j) => j.isOverdue || j.isDueToday);
    if (hot.length > 0) {
      push(
        "deadline_soon",
        "",
        buildNudgeBody({
          kind: "deadline_soon",
          name,
          closedToday: perf.closedToday,
          readyToStart: perf.readyToStart,
          readyJobs: hot,
        })
      );
    }

    if (hour >= 18 && perf.closedToday < DESIGNER_DAILY_TARGET) {
      push(
        "missed_target",
        "",
        buildNudgeBody({
          kind: "missed_target",
          name,
          closedToday: perf.closedToday,
          readyToStart: perf.readyToStart,
          readyJobs,
        })
      );
    }
  }

  return out;
}

/** Admin clicked Open WA — log it so we don’t spam the same suggestion blindly. */
export async function markSuggestedNudgeOpened(params: {
  assigneeId: string;
  kind: DesignerNudgeKind;
  body: string;
  jobId?: string;
}): Promise<DesignerReminderLogDto> {
  const dateKey = getTodayKey();
  const jobId = params.jobId ?? "";
  const phone = designerWaPhone(params.assigneeId);
  const shareUrl = whatsAppShareUrl(phone, params.body);
  const log = await prisma.teamDesignerReminderLog.upsert({
    where: {
      assigneeId_kind_dateKey_jobId: {
        assigneeId: params.assigneeId,
        kind: params.kind,
        dateKey,
        jobId,
      },
    },
    create: {
      assigneeId: params.assigneeId,
      kind: params.kind,
      dateKey,
      jobId,
      body: params.body,
      delivery: "skipped_no_config",
      shareUrl,
      error: "Opened WhatsApp share link (manual send)",
    },
    update: {
      body: params.body,
      shareUrl,
      delivery: "skipped_no_config",
      error: "Opened WhatsApp share link (manual send)",
    },
  });
  return toReminderLogDto(log);
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

/**
 * When admin sends a priority Ready job — WA the designer with interrupt instructions.
 * Only READY_TO_DESIGN (this job) is mentioned; never Waiting brief.
 */
export async function sendPriorityJobAlert(params: {
  jobId: string;
  assigneeId: string;
  title: string;
  outletId: string;
  postDate: string;
  priorityMode: DesignerPriorityMode;
}): Promise<NudgeRunResult | null> {
  if (params.priorityMode !== "PAUSE_NOW" && params.priorityMode !== "AFTER_CURRENT") {
    return null;
  }

  const dateKey = getTodayKey();
  const name = designerDisplayName(params.assigneeId);
  const outlet = teamOutletLabel(params.outletId);
  const jobLine = `• ${params.title} (${outlet} · ${params.postDate})`;
  const active = await findActiveDesignerJob(params.assigneeId);
  const activeAgeMs =
    active?.startedAt != null ? Date.now() - active.startedAt.getTime() : null;

  const kind: DesignerNudgeKind =
    params.priorityMode === "PAUSE_NOW" ? "priority_pause_now" : "priority_after_current";

  let body: string;
  if (params.priorityMode === "PAUSE_NOW") {
    const activeBit = active
      ? activeAgeMs != null && activeAgeMs < PAUSE_SUGGEST_MAX_MS
        ? `You have “${active.title}” in progress (~${formatDuration(activeAgeMs)}). Send a pause request on it, then Start this priority job.`
        : activeAgeMs != null && activeAgeMs >= FINISH_ASAP_MIN_MS
          ? `You’ve been on “${active.title}” for ~${formatDuration(activeAgeMs)}. Wrap a safe pause / handoff, then Start this priority job now.`
          : `Pause “${active.title}” (or request pause), then Start this priority job immediately.`
      : "Nothing in progress — Start this priority job now.";
    body = [
      `Hey ${name} — NEW PRIORITY task (start immediately):`,
      jobLine,
      "",
      activeBit,
      "",
      "Open /team → Monthly designer queue.",
    ].join("\n");
  } else {
    const activeBit = active
      ? activeAgeMs != null && activeAgeMs >= FINISH_ASAP_MIN_MS
        ? `Finish “${active.title}” ASAP (already ~${formatDuration(activeAgeMs)}), then Start this next.`
        : `Complete your current job “${active.title}” first, then Start this priority task.`
      : "No job in progress — you can Start this when ready.";
    body = [
      `Hey ${name} — NEW PRIORITY task (after current):`,
      jobLine,
      "",
      activeBit,
      "",
      "Open /team → Monthly designer queue.",
    ].join("\n");
  }

  return logAndMaybeSend({
    assigneeId: params.assigneeId,
    kind,
    dateKey,
    jobId: params.jobId,
    body,
    templateParams: [
      name,
      params.priorityMode === "PAUSE_NOW" ? "Priority — pause & start now" : "Priority — after current",
      params.title.slice(0, 200),
    ],
    force: true,
  });
}
