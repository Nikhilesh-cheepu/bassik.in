import { prisma } from "@/lib/db";
import { addDaysYmd, dayIdForYmd, getTodayKey } from "@/lib/team-checklists";
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
export const NO_START_MINUTE_IST = 30;
/** Admin “queue changed” Send-now looks back this far. */
export const QUEUE_UPDATE_LOOKBACK_MS = 30 * 60 * 1000;
const QUEUE_UPDATE_JOB_ID = "batch";

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

/** IST greeting — morning / afternoon / evening (no “night”). */
function greetingForHourIst(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** One short line — don’t dump the whole queue into WhatsApp. */
function shortMissLine(jobs: ReadyJobLine[]): string | null {
  if (jobs.length === 0) return null;
  const j = jobs[0]!;
  const time = (j.dueTime || "20:00").slice(0, 5);
  const day = j.isOverdue
    ? `past due (${j.dueDate.slice(8)}/${j.dueDate.slice(5, 7)} ${time})`
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
  return `Catch up from ${formatDayLabel(m.date)} first, then today’s 4.`;
}

function isBeforeWorkStart(hour: number): boolean {
  return hour < WORK_DAY_START_HOUR_IST;
}

function sundayNote(todayYmd: string): string | null {
  if (dayIdForYmd(todayYmd) !== "sun") return null;
  return "Happy Sunday — enjoy your day.";
}

function nudgeLabel(kind: DesignerNudgeKind): string {
  switch (kind) {
    case "no_start":
      return "Friendly start nudge";
    case "slow_task":
      return "Long task check-in";
    case "behind_pace":
      return "Pace reminder";
    case "deadline_soon":
      return "Deadline reminder";
    case "missed_target":
      return "End-of-day note";
    case "priority_pause_now":
      return "Priority — pause now";
    case "priority_after_current":
      return "Priority — after current";
    case "queue_updated":
      return "Queue updated";
    case "amit_ready":
      return "New tasks · Amit";
    default:
      return kind;
  }
}

function checklistLink(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")?.trim() || "https://bassik.in";
  return `${base}/team?tab=tasks`;
}

const AMIT_BATCH_JOB_ID = "batch";

function formatIstDateTime(d = new Date()): string {
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** One generic WA when creatives are ready for Amit (timestamp refreshes on new handoffs). */
export function buildAmitReadyNudge(params: {
  asOf: Date;
  pendingCount: number;
}): DesignerSuggestedNudgeDto {
  const hour = istHourNow(params.asOf);
  const stamp = formatIstDateTime(params.asOf);
  const countNote =
    params.pendingCount > 1
      ? `New tasks are added (${params.pendingCount}) on the Daily Checklist.`
      : "New tasks are added on the Daily Checklist.";
  const body = [
    `Hey Amit — ${greetingForHourIst(hour)}.`,
    "",
    `New update as of ${stamp}.`,
    "",
    `${countNote} Please check the website and complete them. Thank you.`,
    "",
    checklistLink(),
  ].join("\n");
  const phone = designerWaPhone("amit");
  return {
    assigneeId: "amit",
    name: "Amit",
    kind: "amit_ready",
    label: "New tasks · Amit",
    body,
    shareUrl: whatsAppShareUrl(phone, body),
    jobId: AMIT_BATCH_JOB_ID,
  };
}

async function listPendingAmitHandoffJobs(): Promise<
  { id: string; uploadedAt: Date | null }[]
> {
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const jobs = await prisma.teamDesignerJob.findMany({
    where: {
      status: "DESIGN_DONE",
      fileUrl: { not: null },
      uploadedAt: { gte: since },
    },
    select: { id: true, uploadedAt: true },
    orderBy: { uploadedAt: "desc" },
    take: 40,
  });
  if (jobs.length === 0) return [];

  const ids = jobs.map((j) => j.id);
  const opened = await prisma.teamDesignerReminderLog.findMany({
    where: {
      assigneeId: "amit",
      kind: "amit_ready",
      jobId: { in: ids },
    },
    select: { jobId: true },
  });
  const openedSet = new Set(opened.map((o) => o.jobId));
  return jobs.filter((j) => !openedSet.has(j.id));
}

/** At most one Send card — regenerated when new handoffs arrive. */
export async function getAmitReadyNudge(): Promise<DesignerSuggestedNudgeDto | null> {
  const pending = await listPendingAmitHandoffJobs();
  if (pending.length === 0) return null;
  const asOf = pending[0]!.uploadedAt ?? new Date();
  return buildAmitReadyNudge({ asOf, pendingCount: pending.length });
}

export async function listAmitHandoffNudges(): Promise<DesignerSuggestedNudgeDto[]> {
  const nudge = await getAmitReadyNudge();
  return nudge ? [nudge] : [];
}

/** After admin opens Amit WA — clear all currently pending handoffs from Send now. */
async function markPendingAmitHandoffsOpened(body: string): Promise<void> {
  const pending = await listPendingAmitHandoffJobs();
  if (pending.length === 0) return;
  const dateKey = getTodayKey();
  const phone = designerWaPhone("amit");
  const shareUrl = whatsAppShareUrl(phone, body);
  await Promise.all(
    pending.map((j) =>
      prisma.teamDesignerReminderLog.upsert({
        where: {
          assigneeId_kind_dateKey_jobId: {
            assigneeId: "amit",
            kind: "amit_ready",
            dateKey,
            jobId: j.id,
          },
        },
        create: {
          assigneeId: "amit",
          kind: "amit_ready",
          dateKey,
          jobId: j.id,
          body,
          delivery: "skipped_no_config",
          shareUrl,
          error: "Opened WhatsApp share link (manual send)",
        },
        update: {
          body,
          shareUrl,
          delivery: "skipped_no_config",
          error: "Opened WhatsApp share link (manual send)",
        },
      })
    )
  );
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
  const miss = shortMissLine(params.readyJobs);
  const dayMiss = missedDaysLine(params.missedDays);
  const sun = sundayNote(params.todayYmd);

  let head: string[];
  switch (params.kind) {
    case "no_start":
      head = [
        `${params.name} — ${greetingForHourIst(params.hour)}.`,
        "Tasks are waiting for you.",
        dayMiss,
      ].filter(Boolean) as string[];
      break;
    case "slow_task":
      head = [
        `${params.name} — ${greetingForHourIst(params.hour)}.`,
        `Still on “${params.activeTitle ?? "your task"}” — wrap up when you can.`,
      ];
      break;
    case "behind_pace":
      head = [
        `${params.name} — ${greetingForHourIst(params.hour)}.`,
        "Tasks are waiting for you.",
        dayMiss,
      ].filter(Boolean) as string[];
      break;
    case "deadline_soon":
      head = [
        `${params.name} — ${greetingForHourIst(params.hour)}.`,
        miss ? `A few tasks need you: ${miss}` : "Tasks are waiting for you.",
      ];
      break;
    case "missed_target":
      head = [
        `${params.name} — ${greetingForHourIst(params.hour)}.`,
        "Tasks are waiting for you.",
        dayMiss,
      ].filter(Boolean) as string[];
      break;
    default:
      head = [
        `${params.name} — ${greetingForHourIst(params.hour)}.`,
        "Tasks are waiting for you.",
      ];
  }

  return [...head, sun, "", link]
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
      ? `Friendly start nudge — ${readyToStart} ready`
      : kind === "slow_task"
        ? `Check-in ~3h+ on ${activeTitle ?? "task"}`
        : kind === "behind_pace"
          ? `Pace note ${closedFocus}/${DESIGNER_DAILY_TARGET}`
          : kind === "deadline_soon"
            ? "Deadline reminder"
            : `End-of-day note ${closedFocus}/${DESIGNER_DAILY_TARGET}`;
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

  // Sunday = holiday — only slow-task / due-soon, no “today’s 4” nudges
  if (sunday) {
    if (hour >= NO_START_HOUR_IST && hour < 21) kinds.push("slow_task");
    kinds.push("deadline_soon");
    return kinds;
  }

  // From 11:30 IST — haven’t started
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

    const queueNudge = await buildQueueUpdatedSuggestion(assigneeId, name, phone, hour);
    if (queueNudge) out.push(queueNudge);

    // Before 11:30 IST: brief for the day
    if (beforeWork) {
      const missN = (stack.missedDays ?? []).reduce(
        (n, d) => n + (d.missed ?? 0),
        0
      );
      const miss = stack.missedDays?.[0];
      const missLabel = miss?.date ? formatDayLabel(miss.date) : null;
      const daily = sunday ? 0 : DESIGNER_DAILY_TARGET;
      if (missN > 0 || daily > 0 || perf.readyToStart > 0) {
        const lines: string[] = [
          `${name} — ${greetingForHourIst(hour)}.`,
          "Tasks are waiting for you.",
        ];
        if (missN > 0) {
          lines.push(
            `Catch up from ${missLabel ?? "earlier"} first, then today’s 4.`
          );
        }
        lines.push("", designerQueueLink());
        const body = lines.join("\n");
        out.push({
          assigneeId,
          name,
          kind: "no_start",
          label: "Morning start",
          body,
          shareUrl: whatsAppShareUrl(phone, body),
          jobId: "",
        });
      }
      continue;
    }

    // Sunday holiday — slow / due-soon only (no today’s 4 score)
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

  // Also surface WA Ready for Amit when designer uploads land on Daily
  const amitReady = await getAmitReadyNudge();
  if (amitReady) out.push(amitReady);
  return out;
}

async function buildQueueUpdatedSuggestion(
  assigneeId: string,
  name: string,
  phone: string | null,
  hour: number
): Promise<DesignerSuggestedNudgeDto | null> {
  const dateKey = getTodayKey();
  const lookback = new Date(Date.now() - QUEUE_UPDATE_LOOKBACK_MS);
  const lastOpened = await prisma.teamDesignerReminderLog.findFirst({
    where: {
      assigneeId,
      kind: "queue_updated",
      dateKey,
      jobId: QUEUE_UPDATE_JOB_ID,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const since =
    lastOpened && lastOpened.createdAt > lookback ? lastOpened.createdAt : lookback;

  const changed = await prisma.teamDesignerJob.findMany({
    where: {
      assigneeId,
      status: "READY_TO_DESIGN",
      updatedAt: { gt: since },
    },
    select: {
      id: true,
      title: true,
      priorityMode: true,
      urgent: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  if (changed.length === 0) return null;

  const priorityN = changed.filter(
    (j) => j.priorityMode === "AFTER_CURRENT" || j.priorityMode === "PAUSE_NOW" || j.urgent
  ).length;
  const newN = changed.length;

  const detail: string[] = [];
  if (newN > 0) detail.push(`• New task added (${newN})`);
  if (priorityN > 0) detail.push(`• Priority change (${priorityN})`);

  const body = [
    `${name} — ${greetingForHourIst(hour)}.`,
    "Just want to let you know — the priority queue changed. Have a look when you can.",
    "",
    ...detail,
    "",
    designerQueueLink(),
  ].join("\n");

  return {
    assigneeId,
    name,
    kind: "queue_updated",
    label: "Queue updated",
    body,
    shareUrl: whatsAppShareUrl(phone, body),
    jobId: QUEUE_UPDATE_JOB_ID,
  };
}

/** Admin clicked Open WA — log it so we don’t spam the same suggestion blindly. */
export async function markSuggestedNudgeOpened(params: {
  assigneeId: string;
  kind: DesignerNudgeKind;
  body: string;
  jobId?: string;
}): Promise<DesignerReminderLogDto> {
  if (params.assigneeId === "amit" && params.kind === "amit_ready") {
    await markPendingAmitHandoffsOpened(params.body);
  }
  const dateKey = getTodayKey();
  const jobId =
    params.assigneeId === "amit" && params.kind === "amit_ready"
      ? AMIT_BATCH_JOB_ID
      : params.kind === "queue_updated"
        ? QUEUE_UPDATE_JOB_ID
        : (params.jobId ?? "");
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
 * @deprecated Prefer Send-now `queue_updated` suggestion (30 min lookback).
 * Kept for rare force-send paths — soft copy only.
 */
export async function sendPriorityJobAlert(params: {
  jobId: string;
  assigneeId: string;
  title: string;
  outletId: string;
  postDate: string;
  priorityMode: DesignerPriorityMode;
}): Promise<NudgeRunResult | null> {
  void params.outletId;
  void params.postDate;
  const dateKey = getTodayKey();
  const name = designerDisplayName(params.assigneeId);
  const kind: DesignerNudgeKind =
    params.priorityMode === "PAUSE_NOW"
      ? "priority_pause_now"
      : params.priorityMode === "AFTER_CURRENT"
        ? "priority_after_current"
        : "queue_updated";
  const body = [
    `${name} — ${greetingForHourIst(istHourNow())}.`,
    "Just want to let you know — the priority queue changed. Have a look when you can.",
    "",
    designerQueueLink(),
  ].join("\n");

  return logAndMaybeSend({
    assigneeId: params.assigneeId,
    kind,
    dateKey,
    jobId: kind === "queue_updated" ? QUEUE_UPDATE_JOB_ID : params.jobId,
    body,
    templateParams: [name, "Priority queue changed", params.title.slice(0, 200)],
    force: true,
  });
}
