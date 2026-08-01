import { prisma } from "@/lib/db";
import { addDaysYmd, dayIdForYmd, getTodayKey } from "@/lib/team-checklists";
import { findActiveDesignerJob } from "@/lib/team-designer-jobs";
import {
  DESIGNER_DAILY_TARGET,
  DESIGNER_PERFORMANCE_IDS,
  DESIGNER_STACK_START_DATE,
  designerDisplayName,
  type DesignerNudgeKind,
  type DesignerPriorityMode,
  type DesignerReminderLogDto,
  type DesignerSuggestedNudgeDto,
} from "@/lib/team-designer-jobs-shared";
import {
  computeDesignerPerformance,
  computeDesignerStack,
  designerClosesOnDay,
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

/** Designers typically start ~11 AM IST — before that, talk about yesterday. */
export const WORK_DAY_START_HOUR_IST = NO_START_HOUR_IST;

function designerQueueLink(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")?.trim() || "https://bassik.in";
  return `${base}/team?tab=designer`;
}

function formatDayLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00+05:30`);
  return d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** One short line — don’t dump the whole queue into WhatsApp. */
function shortMissLine(jobs: ReadyJobLine[]): string | null {
  if (jobs.length === 0) return null;
  const j = jobs[0]!;
  const time = (j.dueTime || "20:00").slice(0, 5);
  const day = j.isOverdue
    ? `OVERDUE (was ${j.dueDate.slice(8)}/${j.dueDate.slice(5, 7)} ${time})`
    : j.isDueToday
      ? `due today by ${time}`
      : `due ${j.dueDate.slice(8)}/${j.dueDate.slice(5, 7)} ${time}`;
  const extra = jobs.length > 1 ? ` +${jobs.length - 1} more` : "";
  return `${j.title} — ${day}${extra}`;
}

function missedDaysLine(
  missedDays: { date: string; closed: number; missed: number }[] | undefined
): string | null {
  if (!missedDays?.length) return null;
  const m = missedDays[0]!;
  return `Missed on ${formatDayLabel(m.date)}: closed ${m.closed}/4 (short ${m.missed}). Do that catch-up now.`;
}

function isBeforeWorkStart(hour: number): boolean {
  return hour < WORK_DAY_START_HOUR_IST;
}

function sundayNote(todayYmd: string): string | null {
  if (dayIdForYmd(todayYmd) !== "sun") return null;
  return "Happy holiday — enjoy your day. If you work the next-day pack, it earns holiday points (after catch-up).";
}

function seriousCloser(): string {
  return [
    "This can lead to a serious issue if it continues.",
    "Reply with the reason you haven’t done this.",
  ].join("\n");
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
      return "Missed daily target";
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
  todayYmd: string;
  closedToday: number;
  closedYesterday: number;
  readyToStart: number;
  readyJobs: ReadyJobLine[];
  stackedBehind: number;
  leaveDaysEarned?: number;
  missedDays?: { date: string; closed: number; missed: number }[];
  hour: number;
  activeTitle?: string | null;
  activeAgeMs?: number | null;
}): string {
  const link = designerQueueLink();
  const yesterday = addDaysYmd(params.todayYmd, -1);
  const beforeWork = isBeforeWorkStart(params.hour);
  const focusYmd = beforeWork ? yesterday : params.todayYmd;
  const focusClosed = beforeWork ? params.closedYesterday : params.closedToday;
  const focusLabel = formatDayLabel(focusYmd);
  const miss = shortMissLine(params.readyJobs);
  const dayMiss = missedDaysLine(params.missedDays);
  const sun = sundayNote(params.todayYmd);
  const leave = params.leaveDaysEarned ?? 0;
  const stackBit =
    params.stackedBehind > 0
      ? `From ${formatDayLabel(DESIGNER_STACK_START_DATE)} you’re ${params.stackedBehind} behind (Mon–Sat × 4 = 24/week). Clear it ASAP.`
      : leave > 0
        ? `On track — leave banked: ${leave} day(s) (+4 over target = 1 leave).`
        : "Target: 4/day Mon–Sat (24/week). Extra closes bank leave.";

  const focusLine = `On ${focusLabel} you only closed ${focusClosed}/${DESIGNER_DAILY_TARGET}.`;
  const pendingBit = miss ? `Pending: ${miss}` : null;

  let head: string[];
  switch (params.kind) {
    case "no_start":
      head = [
        `${params.name} — work has started and you haven’t begun today’s queue.`,
        dayMiss,
        pendingBit ?? `${params.readyToStart} job(s) waiting.`,
        stackBit,
      ].filter(Boolean) as string[];
      break;
    case "slow_task":
      head = [
        `${params.name} — you’ve been on “${params.activeTitle ?? "this job"}” for ~${formatDuration(params.activeAgeMs ?? SLOW_TASK_MS)}.`,
        `Today so far: ${params.closedToday}/${DESIGNER_DAILY_TARGET}. Finish and move — don’t let this stack up.`,
      ];
      break;
    case "behind_pace":
      head = [
        `${params.name} — you’re behind.`,
        dayMiss ?? focusLine,
        pendingBit,
        stackBit,
      ].filter(Boolean) as string[];
      break;
    case "deadline_soon":
      head = [
        `${params.name} — you missed / are late on this:`,
        pendingBit ?? "Ready work past its 8 PM due time.",
        dayMiss ?? (beforeWork ? focusLine : null),
        stackBit,
      ].filter(Boolean) as string[];
      break;
    case "missed_target":
      head = [
        `${params.name} — missed target.`,
        dayMiss ?? focusLine,
        pendingBit,
        stackBit,
      ].filter(Boolean) as string[];
      break;
    default:
      head = [
        `${params.name} — clear pending designer work ASAP.`,
        dayMiss ?? focusLine,
        stackBit,
      ].filter(Boolean) as string[];
  }

  return [
    ...head,
    sun,
    "",
    seriousCloser(),
    "",
    `Open & complete: ${link}`,
  ]
    .filter((line): line is string => line != null && line !== undefined)
    .join("\n");
}

function templateParamsFor(
  kind: DesignerNudgeKind,
  name: string,
  closedFocus: number,
  readyToStart: number,
  readyJobs: ReadyJobLine[],
  activeTitle?: string | null
): [string, string, string] {
  const summary =
    kind === "no_start"
      ? `Haven't started — ${readyToStart} waiting`
      : kind === "slow_task"
        ? `Stuck ~3h+ on ${activeTitle ?? "task"}`
        : kind === "behind_pace"
          ? `Behind ${closedFocus}/${DESIGNER_DAILY_TARGET}`
          : kind === "deadline_soon"
            ? "Missed / late on due work"
            : `Missed target ${closedFocus}/${DESIGNER_DAILY_TARGET}`;
  const miss = shortMissLine(readyJobs)?.slice(0, 200) || "-";
  return [name, summary, miss];
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
  const sunday = dayIdForYmd(getTodayKey()) === "sun";

  // Sunday = holiday — only slow-task / overdue catch-up, no “today’s 4” nudges
  if (sunday) {
    if (hour >= NO_START_HOUR_IST && hour < 21) kinds.push("slow_task");
    kinds.push("deadline_soon");
    return kinds;
  }

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

  const hour = opts?.hour ?? istHourNow();

  for (const assigneeId of assignees) {
    const perf = await computeDesignerPerformance(assigneeId);
    const stack = await computeDesignerStack(assigneeId, dateKey);
    const yesterday = addDaysYmd(dateKey, -1);
    const closedYesterday = await designerClosesOnDay(assigneeId, yesterday);
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

      const jobs = jobsForBody.length ? jobsForBody : readyJobs;
      const body = buildNudgeBody({
        kind,
        name,
        todayYmd: dateKey,
        closedToday: perf.closedToday,
        closedYesterday,
        readyToStart: perf.readyToStart,
        readyJobs: jobs,
        stackedBehind: stack.stackedBehind,
        leaveDaysEarned: stack.leaveDaysEarned,
        missedDays: stack.missedDays,
        hour,
        activeTitle: active?.title,
        activeAgeMs,
      });
      const focusClosed = isBeforeWorkStart(hour) ? closedYesterday : perf.closedToday;

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
            focusClosed,
            perf.readyToStart,
            jobs,
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
  const today = getTodayKey();
  const yesterday = addDaysYmd(today, -1);
  const afterNoStart =
    hour > NO_START_HOUR_IST ||
    (hour === NO_START_HOUR_IST && minute >= NO_START_MINUTE_IST);
  const beforeWork = isBeforeWorkStart(hour);

  for (const assigneeId of DESIGNER_PERFORMANCE_IDS) {
    const perf = await computeDesignerPerformance(assigneeId);
    const stack = await computeDesignerStack(assigneeId, today);
    const closedYesterday = await designerClosesOnDay(assigneeId, yesterday);
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

    const bodyFor = (kind: DesignerNudgeKind, jobs: ReadyJobLine[], extra?: {
      activeTitle?: string | null;
      activeAgeMs?: number | null;
    }) =>
      buildNudgeBody({
        kind,
        name,
        todayYmd: today,
        closedToday: perf.closedToday,
        closedYesterday,
        readyToStart: perf.readyToStart,
        readyJobs: jobs,
        stackedBehind: stack.stackedBehind,
        leaveDaysEarned: stack.leaveDaysEarned,
        missedDays: stack.missedDays,
        hour,
        activeTitle: extra?.activeTitle,
        activeAgeMs: extra?.activeAgeMs,
      });

    const sunday = dayIdForYmd(today) === "sun";

    // Overnight / early morning: only ask about yesterday + stack — not “today”
    if (beforeWork) {
      const missedYesterday = closedYesterday < DESIGNER_DAILY_TARGET;
      if (missedYesterday || stack.stackedBehind > 0) {
        push("missed_target", "", bodyFor("missed_target", readyJobs));
      }
      continue;
    }

    // Sunday holiday — catch-up / slow only (no today’s 4 score)
    if (sunday) {
      if (active && activeAgeMs != null && activeAgeMs >= SLOW_TASK_MS) {
        push(
          "slow_task",
          active.id,
          bodyFor("slow_task", readyJobs, {
            activeTitle: active.title,
            activeAgeMs,
          })
        );
      }
      const hotSun = readyJobs.filter((j) => j.isOverdue || j.isDueToday);
      if (hotSun.length > 0 || stack.stackedBehind > 0) {
        push("deadline_soon", "", bodyFor("deadline_soon", hotSun.length ? hotSun : readyJobs));
      }
      continue;
    }

    if (afterNoStart && !perf.firstStartedAt && perf.readyToStart > 0 && perf.closedToday === 0) {
      push("no_start", "", bodyFor("no_start", readyJobs));
    }

    if (active && activeAgeMs != null && activeAgeMs >= SLOW_TASK_MS) {
      push(
        "slow_task",
        active.id,
        bodyFor("slow_task", readyJobs, {
          activeTitle: active.title,
          activeAgeMs,
        })
      );
    }

    if (perf.closedToday < 2 && perf.readyToStart > 0 && afterNoStart && hour >= 14) {
      push("behind_pace", "", bodyFor("behind_pace", readyJobs));
    }

    const hot = readyJobs.filter((j) => j.isOverdue || j.isDueToday);
    if (hot.length > 0) {
      push("deadline_soon", "", bodyFor("deadline_soon", hot));
    }

    if (hour >= 18 && perf.closedToday < DESIGNER_DAILY_TARGET) {
      push("missed_target", "", bodyFor("missed_target", readyJobs));
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
      `${name} — PRIORITY. Start this now:`,
      jobLine,
      activeBit,
      "",
      "This can lead to a serious issue if delayed.",
      "Reply if you can’t — with the reason.",
      "",
      `Open & complete: ${designerQueueLink()}`,
    ].join("\n");
  } else {
    const activeBit = active
      ? activeAgeMs != null && activeAgeMs >= FINISH_ASAP_MIN_MS
        ? `Finish “${active.title}” ASAP (already ~${formatDuration(activeAgeMs)}), then Start this next.`
        : `Complete your current job “${active.title}” first, then Start this priority task.`
      : "No job in progress — you can Start this when ready.";
    body = [
      `${name} — PRIORITY (after your current job):`,
      jobLine,
      activeBit,
      "",
      "This can lead to a serious issue if delayed.",
      "Reply if you can’t — with the reason.",
      "",
      `Open & complete: ${designerQueueLink()}`,
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
