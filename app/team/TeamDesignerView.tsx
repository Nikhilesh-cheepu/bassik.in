"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DESIGNER_DAILY_TARGET,
  DESIGNER_MONTH_OUTLET_IDS,
  DESIGNER_POINTS_PER_LEAVE,
  DESIGNER_WINDOW_DAYS,
  catchUpMetaFromStack,
  designerFormatLabel,
  isBoilerplateDesignerDescription,
  partitionOpenDesignerQueueByAssignee,
  sortDesignerJobs,
  suggestDesignerFreeDeadlineSlots,
  type DesignerJobDto,
  type DesignerPerformanceDto,
  type DesignerPriorityMode,
  type DesignerReminderLogDto,
  type DesignerSuggestedNudgeDto,
} from "@/lib/team-designer-jobs-shared";
import { openWhatsAppShareUrl } from "@/lib/open-whatsapp";
import { uploadTeamFile } from "@/lib/team-client-upload";
import { teamDownloadHref } from "@/lib/team-download";
import { teamOutletLabel } from "@/lib/team-outlets";
import { IconTrash, IconUnsend, IconWhatsApp } from "./TeamIcons";

type QueueView = "open" | "toSend" | "closed" | "holiday" | "expired";

function isOpenQueueView(view: QueueView): boolean {
  return view === "open";
}

function jobsFetchKind(view: QueueView): "open" | "closed" | "expired" {
  if (view === "closed") return "closed";
  if (view === "expired") return "expired";
  // open / toSend / holiday share the open payload
  return "open";
}

function formatIstClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatIstDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDurationBetween(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  nowMs = Date.now()
): string | null {
  if (!startIso) return null;
  const start = Date.parse(startIso);
  if (!Number.isFinite(start)) return null;
  const end = endIso ? Date.parse(endIso) : nowMs;
  if (!Number.isFinite(end) || end < start) return null;
  const totalMin = Math.max(0, Math.round((end - start) / 60000));
  if (totalMin < 1) return "<1m";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function JobTimingRow({ job }: { job: DesignerJobDto }) {
  if (!job.startedAt && job.status !== "DESIGN_DONE") return null;
  const ended =
    job.status === "DESIGN_DONE" ? job.uploadedAt : null;
  const duration = formatDurationBetween(
    job.startedAt,
    ended,
    job.status === "IN_PROGRESS" || job.status === "PAUSED" ? Date.now() : undefined
  );
  if (!job.startedAt && !ended) return null;
  return (
    <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[12px] text-white/55">
      <span>
        Start{" "}
        <span className="font-medium text-white/80">
          {job.startedAt ? formatIstDateTime(job.startedAt) : "—"}
        </span>
      </span>
      <span className="text-white/25">·</span>
      <span>
        End{" "}
        <span className="font-medium text-white/80">
          {job.status === "IN_PROGRESS"
            ? "ongoing"
            : job.status === "PAUSED"
              ? "paused"
              : ended
                ? formatIstDateTime(ended)
                : "—"}
        </span>
      </span>
      {duration ? (
        <>
          <span className="text-white/25">·</span>
          <span>
            Duration{" "}
            <span className="font-semibold text-cyan-200/90">{duration}</span>
            {job.status === "IN_PROGRESS" ? (
              <span className="text-white/40"> so far</span>
            ) : null}
          </span>
        </>
      ) : null}
    </p>
  );
}

function jobBriefText(job: DesignerJobDto): string | null {
  if (isBoilerplateDesignerDescription(job.description, job.title)) return null;
  const t = job.description?.trim() ?? "";
  return t || null;
}

function SortableDesignerJob({
  id,
  children,
}: {
  id: string;
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.92 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

const HANDOFF_TTL_DAYS = 3;
/** Designers wait this long after Start before Upload & close. Admin bypasses. */
const DESIGNER_UPLOAD_WAIT_MS = 2 * 60 * 1000;

function formatWaitClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function designerUploadUnlockAt(startedAt: string | null | undefined): number | null {
  if (!startedAt) return null;
  const t = Date.parse(startedAt);
  if (!Number.isFinite(t)) return null;
  return t + DESIGNER_UPLOAD_WAIT_MS;
}

function todayYmdLocal(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isOpenDesignerStatus(s: DesignerJobDto["status"]): boolean {
  return s === "READY_TO_DESIGN" || s === "IN_PROGRESS" || s === "PAUSED";
}

/**
 * Place sudden / deadline jobs into a clean 1…N order.
 * In progress / paused stay on top; everything else by design due → post date.
 */
function orderOpenJobsByDeadline(jobs: DesignerJobDto[]): DesignerJobDto[] {
  const active = jobs.filter((j) => j.status === "IN_PROGRESS");
  const paused = jobs.filter((j) => j.status === "PAUSED");
  const rest = jobs
    .filter((j) => j.status !== "IN_PROGRESS" && j.status !== "PAUSED")
    .slice()
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.postDate !== b.postDate) return a.postDate.localeCompare(b.postDate);
      if (a.outletId !== b.outletId) return a.outletId.localeCompare(b.outletId);
      const fa = a.format === "calendar" ? 1 : a.format.startsWith("adhoc") ? 2 : 0;
      const fb = b.format === "calendar" ? 1 : b.format.startsWith("adhoc") ? 2 : 0;
      if (fa !== fb) return fa - fb;
      return (a.title || "").localeCompare(b.title || "");
    });
  return [...active, ...paused, ...rest];
}

type Props = {
  isAdmin: boolean;
  memberId: string;
};

type WindowMeta = { fromDate: string; toDate: string; days: number };

function statusLabel(s: DesignerJobDto["status"]): string {
  switch (s) {
    case "WAITING_BRIEF":
      return "Not sent";
    case "READY_TO_DESIGN":
      return "Ready for designer";
    case "IN_PROGRESS":
      return "In progress";
    case "PAUSED":
      return "Paused";
    case "DESIGN_DONE":
      return "Done";
    default:
      return s;
  }
}

function statusColor(s: DesignerJobDto["status"]): string {
  switch (s) {
    case "WAITING_BRIEF":
      return "text-white/40";
    case "READY_TO_DESIGN":
      return "text-cyan-300/90";
    case "IN_PROGRESS":
      return "text-amber-300";
    case "PAUSED":
      return "text-violet-300";
    case "DESIGN_DONE":
      return "text-emerald-300/80";
    default:
      return "text-white/50";
  }
}

/** Big readable post date + weekday (IST civil date as YYYY-MM-DD). */
function formatPostDateParts(ymd: string): { dayName: string; dateLabel: string } {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return { dayName: "—", dateLabel: ymd };
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return {
    dayName: dt.toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" }),
    dateLabel: dt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

function istYmdFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Group Done jobs by work day (Start day), then close day — newest first. */
function groupDoneJobsByDay(jobs: DesignerJobDto[]): {
  key: string;
  dayName: string;
  dateLabel: string;
  jobs: DesignerJobDto[];
}[] {
  const map = new Map<string, DesignerJobDto[]>();
  for (const j of jobs) {
    const key =
      istYmdFromIso(j.startedAt) ||
      istYmdFromIso(j.uploadedAt) ||
      istYmdFromIso(j.updatedAt) ||
      j.postDate ||
      "unknown";
    const list = map.get(key) ?? [];
    list.push(j);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => {
      const parts =
        key === "unknown"
          ? { dayName: "Unknown", dateLabel: "" }
          : formatPostDateParts(key);
      return {
        key,
        dayName: parts.dayName,
        dateLabel: parts.dateLabel,
        jobs: list,
      };
    });
}

function designerDisplayName(assigneeId: string): string {
  if (assigneeId === "mahesh") return "Mahesh";
  if (assigneeId === "jeslyn") return "Jeslyn";
  return assigneeId;
}

async function readJson(res: Response) {
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (res.status === 413) {
        throw new Error(
          "File too large for this upload path (Vercel max ~4.5 MB). Try again — large files now upload directly."
        );
      }
      const snippet = text.replace(/\s+/g, " ").trim().slice(0, 140);
      throw new Error(snippet || `Request failed (${res.status})`);
    }
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`
    );
  }
  return data;
}

export default function TeamDesignerView({ isAdmin, memberId }: Props) {
  /** Who's queue you're looking at — filters instantly (no refetch). */
  const [designerTab, setDesignerTab] = useState<"all" | "mahesh" | "jeslyn">("all");
  const [queueView, setQueueView] = useState<QueueView>("open");
  const [outletFilter, setOutletFilter] = useState<"all" | string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [allJobs, setAllJobs] = useState<DesignerJobDto[]>([]);
  const [windowMeta, setWindowMeta] = useState<WindowMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
  /** Admin upload form mode: attach only vs attach+close. Designer always close. */
  const [uploadMode, setUploadMode] = useState<"close" | "attach">("close");
  /** Shown when designer clicks Upload too early — countdown until unlock. */
  const [uploadGate, setUploadGate] = useState<{
    jobId: string;
    unlockAt: number;
  } | null>(null);
  const [, setUploadGateTick] = useState(0);
  /** Re-render so in-progress “duration so far” stays fresh. */
  const [timingTick, setTimingTick] = useState(0);
  /** Only one brief editor open — avoids 40+ textareas killing the UI. */
  const [briefJobId, setBriefJobId] = useState<string | null>(null);
  const [briefDrafts, setBriefDrafts] = useState<Record<string, string>>({});
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});
  const [pauseNoteDrafts, setPauseNoteDrafts] = useState<Record<string, string>>({});
  const [uploadForm, setUploadForm] = useState({
    postingNotes: "",
    scheduleNote: "",
    waApproved: false,
    fileUrl: "",
  });
  const [uploading, setUploading] = useState(false);
  const [adhocOpen, setAdhocOpen] = useState(false);
  const [adhoc, setAdhoc] = useState({
    outletId: "c53",
    assigneeId: "mahesh" as "mahesh" | "jeslyn",
    title: "",
    description: "",
    links: "",
    dueDate: "",
    postDate: "",
    urgent: false,
    priorityMode: "NONE" as DesignerPriorityMode,
  });
  const [priorityDrafts, setPriorityDrafts] = useState<Record<string, DesignerPriorityMode>>(
    {}
  );
  const [expiredOpen, setExpiredOpen] = useState(false);
  const [expiredBlobs, setExpiredBlobs] = useState<
    Array<{ url: string; pathname: string; uploadedAt: string; size: number }>
  >([]);
  const [expiredBusy, setExpiredBusy] = useState(false);
  const [perfDesigners, setPerfDesigners] = useState<DesignerPerformanceDto[]>([]);
  const [reminders, setReminders] = useState<DesignerReminderLogDto[]>([]);
  const [suggestedNudges, setSuggestedNudges] = useState<DesignerSuggestedNudgeDto[]>(
    []
  );
  const [nudgeBusy, setNudgeBusy] = useState<string | null>(null);
  const loadGen = useRef(0);
  const queueViewRef = useRef(queueView);
  queueViewRef.current = queueView;

  const loadPerformance = useCallback(async () => {
    try {
      const res = await fetch("/api/team/designer-performance");
      const data = await readJson(res);
      if (!res.ok) return;
      setPerfDesigners((data.designers as DesignerPerformanceDto[]) ?? []);
      setReminders((data.reminders as DesignerReminderLogDto[]) ?? []);
      const suggested = ((data.suggested as DesignerSuggestedNudgeDto[]) ?? []).filter(
        (s) => s.assigneeId === "mahesh" || s.assigneeId === "jeslyn"
      );
      setSuggestedNudges(suggested);
    } catch {
      /* non-blocking */
    }
  }, []);

  const load = useCallback(async (opts?: {
    soft?: boolean;
    /** Poll / focus refresh — no loading spinner flicker */
    quiet?: boolean;
    view?: QueueView;
  }) => {
    const view = opts?.view ?? queueViewRef.current;
    const gen = ++loadGen.current;
    if (!opts?.quiet && !opts?.soft) {
      setLoading(true);
    }
    try {
      const kind = jobsFetchKind(view);
      const qs =
        kind === "closed"
          ? "?view=closed"
          : kind === "expired"
            ? "?view=expired"
            : "";
      const res = await fetch(`/api/team/designer-jobs${qs}`, {
        cache: "no-store",
      });
      const data = await readJson(res);
      if (gen !== loadGen.current) return;
      setAllJobs((data.jobs as DesignerJobDto[]) ?? []);
      setWindowMeta((data.window as WindowMeta) ?? null);
      if (!opts?.quiet) setError(null);
      void loadPerformance();
    } catch (err) {
      if (gen !== loadGen.current) return;
      if (!opts?.quiet) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    } finally {
      if (gen === loadGen.current && !opts?.quiet && !opts?.soft) {
        setLoading(false);
      }
    }
  }, [loadPerformance]);

  const jobsFetchKindRef = useRef<"open" | "closed" | "expired" | null>(null);
  useEffect(() => {
    const next = jobsFetchKind(queueView);
    // Open ↔ Holiday share the same open payload — no refetch
    if (next === jobsFetchKindRef.current) {
      void loadPerformance();
      return;
    }
    jobsFetchKindRef.current = next;
    void load({ view: queueView });
  }, [load, queueView, loadPerformance]);

  const pauseLivePollRef = useRef(false);
  pauseLivePollRef.current = Boolean(
    uploadJobId || briefJobId || busyId || adhocOpen || uploadGate
  );

  /** Teammates Start / Done — pick up without manual refresh. */
  useEffect(() => {
    const softRefresh = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      if (pauseLivePollRef.current) return;
      void load({ soft: true, quiet: true });
    };
    const id = window.setInterval(softRefresh, 8_000);
    window.addEventListener("focus", softRefresh);
    document.addEventListener("visibilitychange", softRefresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", softRefresh);
      document.removeEventListener("visibilitychange", softRefresh);
    };
  }, [load]);

  const sendManualNudge = async (assigneeId: string, kind?: DesignerSuggestedNudgeDto["kind"]) => {
    setNudgeBusy(assigneeId);
    try {
      const res = await fetch("/api/team/designer-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nudge", assigneeId, kind }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Nudge failed");
      }
      setReminders((data.reminders as DesignerReminderLogDto[]) ?? []);
      setSuggestedNudges(
        ((data.suggested as DesignerSuggestedNudgeDto[]) ?? []).filter(
          (s) => s.assigneeId === "mahesh" || s.assigneeId === "jeslyn"
        )
      );
      const first = (
        data.results as Array<{ delivery?: string; reason?: string; shareUrl?: string }>
      )?.[0];
      const share =
        first?.shareUrl ||
        (data.reminders as DesignerReminderLogDto[])?.[0]?.shareUrl;
      if (first?.delivery === "skipped_no_config" && share) {
        openWhatsAppShareUrl(share);
      } else if (first?.delivery !== "sent" && first?.reason) {
        setError(first.reason);
      }
      void loadPerformance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nudge failed");
    } finally {
      setNudgeBusy(null);
    }
  };

  const openSuggestedWa = async (s: DesignerSuggestedNudgeDto) => {
    if (s.assigneeId === "amit" || s.kind === "amit_ready") return;
    const key = `${s.assigneeId}:${s.kind}:${s.jobId}`;
    setNudgeBusy(key);
    try {
      openWhatsAppShareUrl(s.shareUrl);
      const res = await fetch("/api/team/designer-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open-share",
          assigneeId: s.assigneeId,
          kind: s.kind,
          nudgeBody: s.body,
          jobId: s.jobId,
        }),
      });
      const data = await readJson(res);
      if (res.ok) {
        setReminders((data.reminders as DesignerReminderLogDto[]) ?? []);
        const suggested = (
          (data.suggested as DesignerSuggestedNudgeDto[]) ?? []
        ).filter((x) => x.assigneeId === "mahesh" || x.assigneeId === "jeslyn");
        setSuggestedNudges(suggested);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open WA");
    } finally {
      setNudgeBusy(null);
    }
  };

  /** Base filter by designer tab / member (before ready-only / outlet). */
  const scopedJobs = useMemo(() => {
    let list = allJobs;
    if (isAdmin && designerTab !== "all") {
      list = list.filter((j) => j.assigneeId === designerTab);
    } else if (!isAdmin) {
      list = list.filter((j) => j.assigneeId === memberId);
    }
    return list;
  }, [allJobs, designerTab, isAdmin, memberId]);

  /**
   * Open queue for designers: only Ready / In progress / Paused.
   * "Not sent" never appears here — admin handles those in a separate section.
   */
  const designerVisibleJobs = useMemo(() => {
    if (queueView === "closed" || queueView === "expired") return scopedJobs;
    if (queueView === "holiday" || queueView === "toSend") return [];
    return scopedJobs.filter(
      (j) =>
        j.status === "READY_TO_DESIGN" ||
        j.status === "IN_PROGRESS" ||
        j.status === "PAUSED"
    );
  }, [queueView, scopedJobs]);

  const jobs = useMemo(() => {
    let list = designerVisibleJobs;
    if (outletFilter !== "all") {
      list = list.filter((j) => j.outletId === outletFilter);
    }
    if (queueView === "closed" || queueView === "expired") {
      // Most recent done on top
      return [...list].sort((a, b) => {
        const au = a.uploadedAt || a.updatedAt || "";
        const bu = b.uploadedAt || b.updatedAt || "";
        if (au !== bu) return bu.localeCompare(au);
        return b.postDate.localeCompare(a.postDate);
      });
    }
    return sortDesignerJobs(list);
  }, [designerVisibleJobs, outletFilter, queueView]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sendableJobs = useMemo(
    () => scopedJobs.filter((j) => j.status === "WAITING_BRIEF"),
    [scopedJobs]
  );

  const outletCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of DESIGNER_MONTH_OUTLET_IDS) map.set(id, 0);
    const source = queueView === "toSend" ? sendableJobs : designerVisibleJobs;
    for (const j of source) {
      map.set(j.outletId, (map.get(j.outletId) ?? 0) + 1);
    }
    return map;
  }, [designerVisibleJobs, queueView, sendableJobs]);

  const visiblePerf = useMemo(() => {
    if (!isAdmin) return perfDesigners.filter((p) => p.assigneeId === memberId);
    if (designerTab === "all") return perfDesigners;
    return perfDesigners.filter((p) => p.assigneeId === designerTab);
  }, [designerTab, isAdmin, memberId, perfDesigners]);

  const patchJob = async (
    id: string,
    body: Record<string, unknown>,
    opts?: { quiet?: boolean }
  ): Promise<boolean> => {
    if (!opts?.quiet) setBusyId(id);
    try {
      const res = await fetch(`/api/team/designer-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJson(res);
      if (data.deleted === true) {
        setAllJobs((prev) => prev.filter((j) => j.id !== id));
        setSelectedIds((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        if (typeof data.message === "string") setError(data.message);
        return true;
      }
      const updated = data.job as DesignerJobDto | undefined;
      if (updated) {
        setAllJobs((prev) => {
          if (
            isOpenQueueView(queueViewRef.current) &&
            updated.status === "DESIGN_DONE"
          ) {
            return prev.filter((j) => j.id !== id);
          }
          if (queueViewRef.current === "closed" && updated.status !== "DESIGN_DONE") {
            return prev.filter((j) => j.id !== id);
          }
          return prev.map((j) => (j.id === id ? updated : j));
        });
        if (updated.status !== "WAITING_BRIEF") {
          setSelectedIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
        if (body.action === "unsend") {
          setError(
            typeof data.message === "string"
              ? data.message
              : "Unsent — moved to To send"
          );
          if (isAdmin) {
            startTransition(() => setQueueView("toSend"));
          }
        }
      } else {
        await load({ soft: true });
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      return false;
    } finally {
      if (!opts?.quiet) setBusyId(null);
    }
  };

  const unsendJob = (job: DesignerJobDto) => {
    if (
      !window.confirm(
        `Unsend “${job.title}”?\n\nPulls it off ${designerDisplayName(job.assigneeId)}’s queue and clears Amit Ready if uploaded.`
      )
    ) {
      return;
    }
    void patchJob(job.id, { action: "unsend" });
  };

  const deleteJob = (job: DesignerJobDto) => {
    if (
      !window.confirm(
        `Delete “${job.title}” permanently?\n\nThis cannot be undone. Amit Ready for this slot is cleared too.`
      )
    ) {
      return;
    }
    void patchJob(job.id, { action: "delete" });
  };

  const sendToDesigner = async (job: DesignerJobDto) => {
    const draft = briefDrafts[job.id];
    const description =
      draft !== undefined ? draft : jobBriefText(job) ?? "";
    const priorityMode =
      priorityDrafts[job.id] ?? job.priorityMode ?? "NONE";
    const ok = await patchJob(job.id, {
      action: "brief-ready",
      description,
      links:
        linkDrafts[job.id] ?? (job.links?.length ? job.links.join("\n") : ""),
      priorityMode,
      urgent: priorityMode !== "NONE" ? true : job.urgent,
    });
    if (ok) {
      setBriefJobId((cur) => (cur === job.id ? null : cur));
      // Job joined Open — slot by deadline and renumber Q1…Qn
      setAllJobs((prev) => {
        const snapshot = prev.map((j) =>
          j.id === job.id
            ? {
                ...j,
                status: "READY_TO_DESIGN" as const,
                priorityMode:
                  priorityMode === "NONE" ? ("NONE" as const) : priorityMode,
              }
            : j
        );
        queueMicrotask(() =>
          resyncAssigneeQueueByDeadline(job.assigneeId, snapshot)
        );
        return snapshot;
      });
    }
    return ok;
  };

  const persistQueueOrder = async (orderedIds: string[]) => {
    if (orderedIds.length === 0) return;
    const orderMap = new Map(
      orderedIds.map((id, i) => [id, i - orderedIds.length] as const)
    );
    setError(null);
    // Sequential pins → Q1…Qn follow this list immediately (drag + sudden inserts)
    setAllJobs((prev) =>
      sortDesignerJobs(
        prev.map((j) =>
          orderMap.has(j.id)
            ? {
                ...j,
                sortOrder: orderMap.get(j.id)!,
                priorityMode: "NONE",
                urgent: false,
              }
            : j
        )
      )
    );
    try {
      const res = await fetch("/api/team/designer-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", orderedIds }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Reorder failed"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
      void load({ soft: true });
    }
  };

  /** Re-slot one designer’s Open list by deadline so Q# matches (new task in the middle). */
  const resyncAssigneeQueueByDeadline = (
    assigneeId: string,
    jobsSnapshot: DesignerJobDto[]
  ) => {
    const open = jobsSnapshot.filter(
      (j) => j.assigneeId === assigneeId && isOpenDesignerStatus(j.status)
    );
    const ordered = orderOpenJobsByDeadline(open);
    void persistQueueOrder(ordered.map((j) => j.id));
  };

  const onQueueDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Catch up stays pinned at top — only Today + Later are sortable
    const sortableList = [...openParts.todayPack, ...openParts.upNext];
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeJob = sortableList.find((j) => j.id === activeId);
    const overJob = sortableList.find((j) => j.id === overId);
    if (!activeJob || !overJob) return;
    if (activeJob.assigneeId !== overJob.assigneeId) return;

    const fullAssignee = sortDesignerJobs(
      openJobsForPartition.filter((j) => j.assigneeId === activeJob.assigneeId)
    );
    const catchIds = new Set(
      openPartsRaw.catchUp
        .filter((j) => j.assigneeId === activeJob.assigneeId)
        .map((j) => j.id)
    );
    const pinnedCatch = fullAssignee.filter((j) => catchIds.has(j.id));
    const restFull = fullAssignee.filter((j) => !catchIds.has(j.id));
    const visibleSet = new Set(sortableList.map((j) => j.id));
    const visibleInRest = restFull.filter((j) => visibleSet.has(j.id));
    const oldIndex = visibleInRest.findIndex((j) => j.id === activeId);
    const newIndex = visibleInRest.findIndex((j) => j.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextVisible = arrayMove(visibleInRest, oldIndex, newIndex);
    let vi = 0;
    const nextRest = restFull.map((j) =>
      visibleSet.has(j.id) ? nextVisible[vi++]! : j
    );
    void persistQueueOrder([...pinnedCatch, ...nextRest].map((j) => j.id));
  };

  const sendSelected = async () => {
    const ids = sendableJobs.filter((j) => selectedIds.has(j.id)).map((j) => j.id);
    if (ids.length === 0) return;
    setBusyId("bulk-send");
    setError(null);
    let okCount = 0;
    try {
      const touchedAssignees = new Set<string>();
      for (const id of ids) {
        const job = allJobs.find((j) => j.id === id);
        if (!job || job.status !== "WAITING_BRIEF") continue;
        const draft = briefDrafts[id];
        const description =
          draft !== undefined ? draft : jobBriefText(job) ?? "";
        const ok = await patchJob(
          id,
          {
            action: "brief-ready",
            description,
            links: linkDrafts[id] ?? (job.links?.length ? job.links.join("\n") : ""),
          },
          { quiet: true }
        );
        if (ok) {
          okCount += 1;
          touchedAssignees.add(job.assigneeId);
        }
      }
      setSelectedIds(new Set());
      if (touchedAssignees.size > 0) {
        setAllJobs((prev) => {
          queueMicrotask(() => {
            for (const assigneeId of touchedAssignees) {
              resyncAssigneeQueueByDeadline(assigneeId, prev);
            }
          });
          return prev;
        });
      }
      setError(
        okCount > 0
          ? `Sent ${okCount} job${okCount === 1 ? "" : "s"} to designer.`
          : "Nothing sent"
      );
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllSendable = () => {
    const allSelected =
      sendableJobs.length > 0 && sendableJobs.every((j) => selectedIds.has(j.id));
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(sendableJobs.map((j) => j.id)));
  };

  const seedWindow = async (lanes?: Array<"WEEKEND" | "WEEKDAY">) => {
    setBusyId("seed");
    try {
      const res = await fetch("/api/team/designer-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed", lanes }),
      });
      const data = await readJson(res);
      setError(null);
      await load({ soft: true });
      if (typeof data.created === "number") {
        const closed = typeof data.closedPast === "number" ? data.closedPast : 0;
        setError(
          `Seeded next ${DESIGNER_WINDOW_DAYS} days: ${data.created} new, ${data.skipped ?? 0} existed, ${closed} past-due closed.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (!uploadGate) return;
    const id = window.setInterval(() => {
      if (Date.now() >= uploadGate.unlockAt) {
        setUploadGate(null);
        return;
      }
      setUploadGateTick((n) => n + 1);
    }, 500);
    return () => window.clearInterval(id);
  }, [uploadGate]);

  const hasInProgress = useMemo(
    () => allJobs.some((j) => j.status === "IN_PROGRESS"),
    [allJobs]
  );
  useEffect(() => {
    if (!hasInProgress) return;
    const id = window.setInterval(() => setTimingTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [hasInProgress]);

  const tryOpenUpload = (job: DesignerJobDto, mode: "close" | "attach") => {
    // Already open for this job — don't reset (wipes a file just picked).
    if (uploadJobId === job.id) return;
    if (!isAdmin && job.status === "IN_PROGRESS" && mode === "close") {
      const unlockAt = designerUploadUnlockAt(job.startedAt);
      if (!unlockAt || Date.now() < unlockAt) {
        setUploadGate({
          jobId: job.id,
          unlockAt: unlockAt ?? Date.now() + DESIGNER_UPLOAD_WAIT_MS,
        });
        setError(null);
        return;
      }
    }
    setUploadGate(null);
    setUploadMode(mode);
    setUploadJobId(job.id);
    setUploadForm({
      postingNotes: job.postingNotes ?? "",
      scheduleNote: job.scheduleNote ?? "",
      waApproved: isAdmin,
      fileUrl: job.fileUrl ?? "",
    });
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const job = jobs.find((j) => j.id === uploadJobId);
      const url = await uploadTeamFile(file, {
        kind: "handoff",
        outletId: job?.outletId,
      });
      setUploadForm((f) => ({ ...f, fileUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const closeUpload = async () => {
    if (!uploadJobId) return;
    const id = uploadJobId;
    const current = allJobs.find((j) => j.id === id);
    const replacing = current?.status === "DESIGN_DONE";
    const attachOnly = isAdmin && uploadMode === "attach" && !replacing;
    setBusyId(id);
    try {
      const res = await fetch(`/api/team/designer-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: replacing ? "replace-upload" : attachOnly ? "set-upload" : "upload-close",
          fileUrl: uploadForm.fileUrl,
          postingNotes: uploadForm.postingNotes,
          scheduleNote: uploadForm.scheduleNote,
          waApproved: uploadForm.waApproved || isAdmin,
        }),
      });
      const data = await readJson(res);
      const updated = data.job as DesignerJobDto | undefined;
      if ((replacing || attachOnly) && updated) {
        setAllJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      } else if (updated) {
        setAllJobs((prev) => prev.filter((j) => j.id !== id));
      } else {
        setAllJobs((prev) => prev.filter((j) => j.id !== id));
      }
      if (typeof data.message === "string") {
        setError(data.message);
      }
      void loadPerformance();
      setUploadJobId(null);
      setUploadForm({ postingNotes: "", scheduleNote: "", waApproved: false, fileUrl: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Close failed";
      const waitMatch = /wait (\d+)s/i.exec(msg);
      if (waitMatch && current) {
        const unlockAt = Date.now() + Number(waitMatch[1]) * 1000;
        setUploadGate({ jobId: id, unlockAt });
      }
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const createAdhoc = async () => {
    if (!adhoc.title.trim()) {
      setError("Title required for free task");
      return;
    }
    setBusyId("adhoc");
    try {
      const res = await fetch("/api/team/designer-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adhoc: true,
          outletId: adhoc.outletId,
          assigneeId: adhoc.assigneeId,
          title: adhoc.title.trim(),
          description: adhoc.description,
          links: adhoc.links,
          dueDate: adhoc.dueDate.trim() || undefined,
          postDate: adhoc.postDate.trim() || adhoc.dueDate.trim() || undefined,
          urgent: adhoc.urgent || adhoc.priorityMode !== "NONE",
          priorityMode: adhoc.priorityMode,
        }),
      });
      const data = await readJson(res);
      setAdhocOpen(false);
      setAdhoc({
        outletId: "c53",
        assigneeId: adhoc.assigneeId,
        title: "",
        description: "",
        links: "",
        dueDate: "",
        postDate: "",
        urgent: false,
        priorityMode: "NONE",
      });
      const created = data.job as DesignerJobDto | undefined;
      if (created) {
        const merged = [
          created,
          ...allJobs.filter((j) => j.id !== created.id),
        ];
        setAllJobs(merged);
        if (created.priorityMode === "PAUSE_NOW" || created.priorityMode === "AFTER_CURRENT") {
          // Jump near the top (after anything already in progress), then renumber
          const open = merged.filter(
            (j) =>
              j.assigneeId === created.assigneeId && isOpenDesignerStatus(j.status)
          );
          const active = open.filter((j) => j.status === "IN_PROGRESS");
          const rest = orderOpenJobsByDeadline(
            open.filter((j) => j.id !== created.id && j.status !== "IN_PROGRESS")
          );
          void persistQueueOrder(
            [...active, created, ...rest].map((j) => j.id)
          );
        } else {
          // Insert by deadline + renumber Q1…Qn for that designer
          resyncAssigneeQueueByDeadline(created.assigneeId, merged);
        }
      }
      setDesignerTab(adhoc.assigneeId);
      const nudge = data.priorityNudge as { delivery?: string } | null | undefined;
      const shareHint =
        nudge?.delivery === "skipped_no_config"
          ? " · WA logged (open share from follow-ups if needed)"
          : nudge?.delivery === "sent"
            ? " · priority WA sent"
            : "";
      setError(
        (typeof data.message === "string"
          ? data.message
          : `Sent to ${designerDisplayName(adhoc.assigneeId)}`) + shareHint
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusyId(null);
    }
  };

  const queue = jobs;
  /** Outlet filter is applied when rendering lists only. */
  const openJobsForPartition = useMemo(() => {
    return sortDesignerJobs(
      scopedJobs.filter(
        (j) =>
          j.status === "READY_TO_DESIGN" ||
          j.status === "IN_PROGRESS" ||
          j.status === "PAUSED"
      )
    );
  }, [scopedJobs]);

  /**
   * Catch up = unfinished count from past workdays (4/day shortfall).
   * Top N of the priority queue → Catch up; next 4 → Today; rest → Later.
   * Debt is per designer — outlet chips only filter what you see.
   */
  const openPartsRaw = useMemo(() => {
    const metaMap = new Map(
      perfDesigners.map((p) => {
        const meta = catchUpMetaFromStack(p.stack);
        const releasedSlots = allJobs.filter(
          (j) =>
            j.assigneeId === p.assigneeId &&
            j.catchUpExempt &&
            j.status !== "DESIGN_DONE"
        ).length;
        return [p.assigneeId, { ...meta, releasedSlots }] as const;
      })
    );
    return partitionOpenDesignerQueueByAssignee(
      openJobsForPartition,
      metaMap,
      DESIGNER_DAILY_TARGET
    );
  }, [openJobsForPartition, perfDesigners, allJobs]);

  const openParts = useMemo(() => {
    if (outletFilter === "all") return openPartsRaw;
    const filt = (list: DesignerJobDto[]) =>
      list.filter((j) => j.outletId === outletFilter);
    return {
      catchUp: filt(openPartsRaw.catchUp),
      todayPack: filt(openPartsRaw.todayPack),
      upNext: filt(openPartsRaw.upNext),
      catchUpHint: openPartsRaw.catchUpHint,
      effectiveCatchUpSlots: openPartsRaw.effectiveCatchUpSlots,
    };
  }, [openPartsRaw, outletFilter]);

  const catchUpDebt = openPartsRaw.effectiveCatchUpSlots;

  /**
   * Live Q# 1…N per designer from current priority order.
   * Updates whenever drag, deadline insert, send, or close reshuffles the list.
   */
  const queueNumberById = useMemo(() => {
    const map = new Map<string, number>();
    for (const assigneeId of ["mahesh", "jeslyn"] as const) {
      const list = openJobsForPartition.filter((j) => j.assigneeId === assigneeId);
      list.forEach((j, i) => map.set(j.id, i + 1));
    }
    return map;
  }, [openJobsForPartition]);

  const startJob = (
    job: DesignerJobDto,
    _opts?: { tone?: "catchUp" | "today" | "next" | "done" }
  ) => {
    void _opts;
    void patchJob(job.id, {
      action: job.status === "PAUSED" ? "resume" : "start",
    });
  };

  const canDragQueue =
    isAdmin &&
    queueView === "open" &&
    openParts.todayPack.length + openParts.upNext.length > 1;
  const toSendCount = sendableJobs.length;
  const toSendVisible = useMemo(
    () =>
      sendableJobs
        .filter((j) => outletFilter === "all" || j.outletId === outletFilter)
        .slice()
        .sort((a, b) => {
          if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          if (a.postDate !== b.postDate) return a.postDate.localeCompare(b.postDate);
          return (a.title || "").localeCompare(b.title || "");
        }),
    [sendableJobs, outletFilter]
  );

  const freeDeadlineSlots = useMemo(
    () =>
      suggestDesignerFreeDeadlineSlots(
        allJobs,
        adhoc.assigneeId,
        todayYmdLocal(),
        { count: 3 }
      ),
    [allJobs, adhoc.assigneeId]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#06060a]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 [-webkit-overflow-scrolling:touch] xl:pb-10">
      <div className="mx-auto w-full max-w-3xl space-y-4 py-3">
      <div className="relative z-[1] flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap rounded-lg bg-black/35 p-1">
          {(
            [
              [
                "open",
                catchUpDebt > 0 ? `Open · ${catchUpDebt} catch-up` : "Open",
              ],
              ...(isAdmin
                ? ([["toSend", toSendCount > 0 ? `To send (${toSendCount})` : "To send"]] as const)
                : []),
              ["closed", "Done"],
              ["holiday", "Holiday"],
              ["expired", "Expired"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                startTransition(() => {
                  setQueueView(id);
                  setBriefJobId(null);
                  setUploadJobId(null);
                  setSelectedIds(new Set());
                  setAdhocOpen(false);
                });
              }}
              className={`h-9 min-w-[4.5rem] rounded-md px-3 text-[13px] font-semibold ${
                queueView === id
                  ? id === "holiday"
                    ? "bg-violet-400 text-black"
                    : id === "expired"
                      ? "bg-amber-400 text-black"
                      : id === "toSend"
                        ? "bg-amber-300 text-black"
                        : id === "open" && catchUpDebt > 0
                          ? "bg-amber-300 text-black"
                          : "bg-white text-black"
                  : id === "toSend" && toSendCount > 0
                    ? "text-amber-200/90 hover:text-amber-100"
                    : id === "open" && catchUpDebt > 0
                      ? "text-amber-200/80 hover:text-amber-100"
                      : "text-white/50 hover:text-white/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {isAdmin ? (
          <div className="flex rounded-lg bg-black/35 p-1">
            {(
              [
                ["all", "All"],
                ["mahesh", "Mahesh"],
                ["jeslyn", "Jeslyn"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setDesignerTab(id);
                    setBriefJobId(null);
                    setUploadJobId(null);
                    setSelectedIds(new Set());
                  });
                }}
                className={`h-9 min-w-[4.5rem] rounded-md px-3 text-[13px] font-semibold ${
                  designerTab === id
                    ? "bg-cyan-500 text-black"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {isAdmin && windowMeta ? (
          <p className="text-[11px] text-white/35">
            {windowMeta.fromDate} → {windowMeta.toDate}
          </p>
        ) : null}
      </div>

      {queueView === "open" || queueView === "toSend"
        ? visiblePerf.map((p) => (
            <DesignerPerformanceCard
              key={p.assigneeId}
              perf={p}
              isAdmin={isAdmin}
              nudges={suggestedNudges.filter((s) => s.assigneeId === p.assigneeId)}
              nudgeBusy={nudgeBusy}
              onNudge={() => void sendManualNudge(p.assigneeId)}
              onOpenNudge={(s) => void openSuggestedWa(s)}
            />
          ))
        : null}

      {queueView === "holiday" ? (
        <HolidayTabPanel designers={visiblePerf} />
      ) : null}

      {queueView === "toSend" ? (
        <p className="text-[12px] text-white/45">
          Holding briefs until ready — send to join Open by deadline.
        </p>
      ) : null}

      {queueView === "expired" ? (
        <p className="text-[11px] text-white/45">
          Past go-live files. Delete clears the file — Done history stays.
        </p>
      ) : null}

      {isAdmin && (queueView === "open" || queueView === "toSend") ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAdhocOpen((v) => !v)}
            className="h-8 rounded-lg bg-amber-400 px-3 text-[12px] font-semibold text-black"
          >
            {adhocOpen ? "Close" : "+ Add task"}
          </button>
          <button
            type="button"
            disabled={busyId === "seed"}
            onClick={() => void seedWindow()}
            className="h-8 px-2 text-[11px] font-medium text-white/40 hover:text-white/70 disabled:opacity-40"
          >
            Seed {DESIGNER_WINDOW_DAYS}d
          </button>
          <button
            type="button"
            disabled={busyId === "seed"}
            onClick={() => void seedWindow(["WEEKEND"])}
            className="h-8 px-2 text-[11px] font-medium text-white/40 hover:text-white/70 disabled:opacity-40"
          >
            Seed Mahesh
          </button>
          <button
            type="button"
            disabled={busyId === "seed"}
            onClick={() => void seedWindow(["WEEKDAY"])}
            className="h-8 px-2 text-[11px] font-medium text-white/40 hover:text-white/70 disabled:opacity-40"
          >
            Seed Jeslyn
          </button>
        </div>
      ) : null}

      {queueView !== "holiday" ? (
      <>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => {
            setOutletFilter("all");
            setSelectedIds(new Set());
          }}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold ${
            outletFilter === "all"
              ? "bg-white text-black"
              : "bg-white/[0.06] text-white/65 ring-1 ring-white/10 hover:text-white"
          }`}
        >
          All
          <span
            className={`min-w-[1.15rem] rounded-md px-1 py-0.5 text-center text-[11px] font-bold tabular-nums ${
              outletFilter === "all" ? "bg-black/20 text-black" : "bg-white/10 text-white/80"
            }`}
          >
            {queueView === "toSend" ? toSendCount : designerVisibleJobs.length}
          </span>
        </button>
        {DESIGNER_MONTH_OUTLET_IDS.map((id) => {
          const count = outletCounts.get(id) ?? 0;
          const on = outletFilter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setOutletFilter(on ? "all" : id);
                setSelectedIds(new Set());
              }}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold ${
                on
                  ? "bg-cyan-400 text-black shadow-[0_0_14px_rgba(34,211,238,0.3)]"
                  : "bg-white/[0.06] text-white/70 ring-1 ring-white/10 hover:text-white"
              }`}
            >
              <OutletChipIcon outletId={id} />
              <span className="max-w-[5.5rem] truncate">{teamOutletLabel(id)}</span>
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                  on ? "bg-black/25 text-black" : "bg-cyan-400/25 text-cyan-100"
                }`}
              >
                {count > 9 ? "9+" : count}
              </span>
            </button>
          );
        })}
      </div>

      {adhocOpen && isAdmin ? (
        <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3.5">
          <div>
            <p className="text-[13px] font-semibold text-amber-50">Add task</p>
            <p className="text-[11px] text-white/45">
              Queue is ordered by design deadline (Fri posts → Mon due, Sat → Tue, Sun → Wed). Set
              a deadline so extras land in the right place when he’s free.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] text-white/50">
              Outlet
              <select
                value={adhoc.outletId}
                onChange={(e) => setAdhoc((a) => ({ ...a, outletId: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-[13px] text-white"
              >
                {DESIGNER_MONTH_OUTLET_IDS.map((id) => (
                  <option key={id} value={id}>
                    {teamOutletLabel(id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] text-white/50">
              Design deadline
              <input
                type="date"
                value={adhoc.dueDate}
                onChange={(e) => setAdhoc((a) => ({ ...a, dueDate: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-[13px] text-white"
              />
            </label>
            {adhoc.priorityMode === "NONE" ? (
              <div className="sm:col-span-2 space-y-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
                  Free slots (pick one)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {freeDeadlineSlots.map((s) => {
                    const on = adhoc.dueDate === s.date;
                    return (
                      <button
                        key={s.date}
                        type="button"
                        onClick={() =>
                          setAdhoc((a) => ({
                            ...a,
                            dueDate: s.date,
                            priorityMode: "NONE",
                          }))
                        }
                        className={`rounded-lg border px-2.5 py-1.5 text-left ${
                          on
                            ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-50"
                            : s.free > 0
                              ? "border-white/15 bg-black/30 text-white/80 hover:border-white/30"
                              : "border-amber-400/30 bg-amber-400/10 text-amber-50/90"
                        }`}
                      >
                        <span className="block text-[12px] font-semibold">{s.label}</span>
                        <span className="block text-[10px] opacity-75">{s.note}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-white/40">
                  Target: stay ahead (Fri pack by Mon; slip to Wed only if stuck). Prefer clear
                  days so sudden work has room.
                </p>
              </div>
            ) : null}
            <label className="block text-[11px] text-white/50">
              Event / go-live (optional)
              <input
                type="date"
                value={adhoc.postDate}
                onChange={(e) => setAdhoc((a) => ({ ...a, postDate: e.target.value }))}
                className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/40 px-2 text-[13px] text-white"
              />
            </label>
            <label className="block text-[11px] text-white/50">
              Send to
              <div className="mt-1 flex gap-1 rounded-lg bg-black/30 p-0.5">
                {(
                  [
                    ["mahesh", "Mahesh"],
                    ["jeslyn", "Jeslyn"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAdhoc((a) => ({ ...a, assigneeId: id }))}
                    className={`h-8 flex-1 rounded-md text-[12px] font-semibold ${
                      adhoc.assigneeId === id
                        ? "bg-cyan-500 text-black"
                        : "text-white/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <label className="block text-[11px] text-white/50">
            Title
            <input
              value={adhoc.title}
              onChange={(e) => setAdhoc((a) => ({ ...a, title: e.target.value }))}
              placeholder="e.g. Komma Saturday flyer — DJ Rahul"
              className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-[13px] text-white"
            />
          </label>
          <label className="block text-[11px] text-white/50">
            Description
            <textarea
              value={adhoc.description}
              onChange={(e) => setAdhoc((a) => ({ ...a, description: e.target.value }))}
              rows={3}
              placeholder="What to design, artist, notes…"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-white"
            />
          </label>
          <label className="block text-[11px] text-white/50">
            Links (optional — one per line)
            <textarea
              value={adhoc.links}
              onChange={(e) => setAdhoc((a) => ({ ...a, links: e.target.value }))}
              rows={2}
              placeholder="https://drive.google.com/…
https://instagram.com/…"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-white"
            />
          </label>
          <PriorityModePicker
            value={adhoc.priorityMode}
            onChange={(priorityMode) =>
              setAdhoc((a) => ({
                ...a,
                priorityMode,
                // ASAP defaults deadline to today if empty
                dueDate:
                  priorityMode === "PAUSE_NOW" && !a.dueDate.trim()
                    ? todayYmdLocal()
                    : a.dueDate,
              }))
            }
          />
          <button
            type="button"
            disabled={
              !adhoc.title.trim() ||
              busyId === "adhoc" ||
              (adhoc.priorityMode === "NONE" && !adhoc.dueDate.trim())
            }
            onClick={() => void createAdhoc()}
            className="h-9 rounded-lg bg-amber-400 px-4 text-[12px] font-semibold text-black disabled:opacity-40"
          >
            Save & send to {designerDisplayName(adhoc.assigneeId)}
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-lg border border-amber-400/25 bg-amber-400/[0.08] px-3 py-2 text-[12px] text-amber-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {loading && allJobs.length === 0 ? (
        <p className="text-[12px] text-white/35">Loading…</p>
      ) : null}

      <section className="space-y-3">
        {queue.length === 0 && !loading && queueView !== "toSend" ? (
          <p className="text-[13px] text-white/35">
            {queueView === "closed"
              ? "No done jobs for this view."
              : queueView === "expired"
                ? "No expired files — nothing to clear."
                : "Nothing ready — only Ready / In progress / Paused show here. Unsent briefs are in To send."}
          </p>
        ) : null}
        {(() => {
          const renderJob = (
            job: DesignerJobDto,
            dragHandleProps?: Record<string, unknown>,
            tone: "catchUp" | "today" | "next" | "done" = "next"
          ) => {
          const { dayName, dateLabel } = formatPostDateParts(job.postDate);
          const designer = designerDisplayName(job.assigneeId);
          const formatLabel = designerFormatLabel(job.format);
          const canSend = isAdmin && job.status === "WAITING_BRIEF";
          const selected = selectedIds.has(job.id);
          const brief = jobBriefText(job);
          const queueNo = queueNumberById.get(job.id);
          const toneClass =
            tone === "catchUp"
              ? "border-amber-400/35 bg-amber-400/[0.07] ring-1 ring-amber-400/15"
              : job.status === "IN_PROGRESS"
                ? "border-cyan-400/45 bg-cyan-400/[0.08] ring-1 ring-cyan-400/20"
                : job.status === "PAUSED"
                  ? "border-violet-400/35 bg-violet-400/[0.07]"
                  : tone === "today"
                    ? "border-white/[0.12] bg-white/[0.04]"
                    : selected
                      ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                      : "border-white/[0.08] bg-white/[0.03]";
          return (
          <article
            key={job.id}
            className={`rounded-xl border px-3.5 py-3 ${toneClass}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-2.5">
                {dragHandleProps ? (
                  <button
                    type="button"
                    className="mt-1.5 flex h-9 w-7 shrink-0 touch-none items-center justify-center text-white/30 active:text-white/55"
                    aria-label="Drag to set priority"
                    title="Drag to set priority"
                    {...dragHandleProps}
                  >
                    <span className="text-base leading-none">≡</span>
                  </button>
                ) : null}
                {canSend ? (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelected(job.id)}
                    className="mt-1.5 shrink-0 rounded border-white/30"
                    aria-label={`Select ${job.title}`}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300/75">
                  {queueNo != null ? (
                    <span
                      className="mr-2 rounded bg-cyan-400/15 px-1.5 py-0.5 tabular-nums font-bold text-cyan-100/90"
                      title="Live queue position — updates on drag or new tasks"
                    >
                      Q{queueNo}
                    </span>
                  ) : null}
                  {dayName}
                </p>
                <h3 className="mt-0.5 text-[20px] font-semibold leading-tight tracking-tight text-white">
                  {dateLabel}
                </h3>
                <p className="mt-1 text-[17px] font-semibold text-white/90">
                  {job.outletLabel}
                  <span className="ml-2 text-[13px] font-medium text-white/45">
                    {job.format.startsWith("adhoc") ? "Free task" : formatLabel}
                  </span>
                </p>
                <p className="mt-0.5 text-[15px] font-medium text-white/80">{job.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                  <span className="rounded-md bg-white/[0.07] px-2 py-0.5 font-medium text-white/75">
                    → {designer}
                  </span>
                  <span className={statusColor(job.status)}>{statusLabel(job.status)}</span>
                  {job.urgent ? (
                    <span className="font-semibold uppercase text-amber-300">Urgent</span>
                  ) : null}
                  {job.priorityMode === "PAUSE_NOW" ? (
                    <span className="font-semibold uppercase text-rose-300">
                      Pause & start now
                    </span>
                  ) : null}
                  {job.priorityMode === "AFTER_CURRENT" ? (
                    <span className="font-semibold uppercase text-orange-300">
                      After current
                    </span>
                  ) : null}
                  {job.isOverdue ? (
                    <span className="font-semibold uppercase text-amber-200/80">
                      Past due
                    </span>
                  ) : null}
                  {job.isDueToday ? (
                    <span className="font-semibold uppercase text-cyan-300">Due today</span>
                  ) : null}
                  <span className="text-white/50">
                    Design due {job.dueDate.slice(8)}/{job.dueDate.slice(5, 7)} ·{" "}
                    {(job.dueTime || "20:00").slice(0, 5)} IST
                    {job.format === "calendar"
                      ? " (Tue before weekend)"
                      : job.lane === "WEEKDAY"
                        ? " (day before)"
                        : " (−4 days)"}
                    {job.isDueToday && !job.isOverdue ? " · not overdue until 8 PM" : ""}
                  </span>
                </div>
                {/* timingTick refreshes in-progress duration */}
                <JobTimingRow key={timingTick} job={job} />
                {brief ? (
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-snug text-white/75">
                    {brief}
                  </p>
                ) : null}
                {job.links?.length ? (
                  <ul className="mt-2 space-y-1">
                    {job.links.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-[12px] text-cyan-300/90 underline-offset-2 hover:underline"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                </div>
              </div>
              <div className="relative z-[2] flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:max-w-[12rem]">
                {/* Download only on Done — Open must not keep a leftover file after reopen */}
                {job.status === "DESIGN_DONE" && job.fileUrl ? (
                  <a
                    href={teamDownloadHref(job.fileUrl, `${job.outletLabel}-${job.postDate}`)}
                    className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-lg bg-emerald-400 px-3 text-[13px] font-semibold text-black touch-manipulation sm:h-9 sm:min-h-0 sm:text-[12px]"
                  >
                    Download
                  </a>
                ) : null}
                {isAdmin ? (
                  <div className="flex gap-2">
                    {job.status !== "WAITING_BRIEF" ? (
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        title="Unsend — off designer queue, clear Amit Ready"
                        aria-label="Unsend"
                        onClick={() => unsendJob(job)}
                        className="inline-flex h-11 min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 text-[12px] font-semibold text-amber-100 touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0"
                      >
                        <IconUnsend className="h-4 w-4" />
                        Unsend
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === job.id}
                      title="Delete job permanently"
                      aria-label="Delete"
                      onClick={() => deleteJob(job)}
                      className={`inline-flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/15 text-[12px] font-semibold text-red-200 touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 ${
                        job.status === "WAITING_BRIEF" ? "flex-1" : "px-3"
                      }`}
                    >
                      <IconTrash className="h-4 w-4" />
                      {job.status === "WAITING_BRIEF" ? "Delete" : null}
                    </button>
                  </div>
                ) : null}
                {canSend ? (
                  <button
                    type="button"
                    disabled={busyId === job.id || busyId === "bulk-send"}
                    onClick={() => void sendToDesigner(job)}
                    className="h-11 min-h-[44px] rounded-lg bg-cyan-500 px-3 text-[13px] font-semibold text-black touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                  >
                    Send to {designer}
                  </button>
                ) : null}
                {job.status === "READY_TO_DESIGN" ? (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() => startJob(job, { tone })}
                    className="h-11 min-h-[44px] rounded-lg bg-cyan-500 px-3 text-[13px] font-semibold text-black touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                  >
                    Start Job
                  </button>
                ) : null}
                {isAdmin && tone === "catchUp" && job.status !== "DESIGN_DONE" ? (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    title="Drop from Catch up — forgives 1 unfinished slot"
                    onClick={() =>
                      void patchJob(job.id, { action: "release-catch-up" }).then((ok) => {
                        if (ok) {
                          setError("Dropped from Catch up — count −1. Job is in Today/Later.");
                        }
                      })
                    }
                    className="h-11 min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-3 text-[13px] font-semibold text-white/90 touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                  >
                    Drop catch-up
                  </button>
                ) : null}
                {job.status === "PAUSED" && (isAdmin || job.assigneeId === memberId) ? (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() => startJob(job, { tone })}
                    className="h-11 min-h-[44px] rounded-lg bg-cyan-500 px-3 text-[13px] font-semibold text-black touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                  >
                    Start again
                  </button>
                ) : null}
                {/* Started: pause (+ designer upload & close). No force-clear while in progress. */}
                {job.status === "IN_PROGRESS" && job.assigneeId === memberId && !isAdmin ? (
                  <>
                    {uploadJobId !== job.id ? (
                      <button
                        type="button"
                        onClick={() => tryOpenUpload(job, "close")}
                        className="h-11 min-h-[44px] rounded-lg bg-emerald-400 px-3 text-[13px] font-semibold text-black touch-manipulation sm:h-9 sm:min-h-0 sm:text-[12px]"
                      >
                        Upload & close
                      </button>
                    ) : null}
                    {!job.pauseRequestedAt ? (
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        onClick={() =>
                          void patchJob(job.id, {
                            action: "request-pause",
                            note: pauseNoteDrafts[job.id] ?? "",
                          }).then((ok) => {
                            if (ok) setError("Pause requested — waiting on admin.");
                          })
                        }
                        className="h-11 min-h-[44px] rounded-lg border border-violet-400/40 bg-violet-400/15 px-3 text-[13px] font-semibold text-violet-100 touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                      >
                        Request pause
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-violet-200/90">
                        Pause pending admin
                      </span>
                    )}
                  </>
                ) : null}
                {isAdmin && job.status === "IN_PROGRESS" ? (
                  <>
                    {uploadJobId !== job.id ? (
                      <button
                        type="button"
                        onClick={() => tryOpenUpload(job, "attach")}
                        className="h-11 min-h-[44px] rounded-lg bg-emerald-400 px-3 text-[13px] font-semibold text-black touch-manipulation sm:h-9 sm:min-h-0 sm:text-[12px]"
                      >
                        {job.fileUrl ? "Edit upload" : "Upload"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === job.id || !job.fileUrl}
                      title={!job.fileUrl ? "Upload a creative first" : undefined}
                      onClick={() =>
                        void patchJob(job.id, { action: "mark-done" }).then((ok) => {
                          if (ok) setError("Done.");
                        })
                      }
                      className="h-11 min-h-[44px] rounded-lg bg-white px-3 text-[13px] font-semibold text-black touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                    >
                      Mark done
                    </button>
                    <button
                      type="button"
                      disabled={busyId === job.id}
                      onClick={() =>
                        void patchJob(job.id, { action: "pause" }).then((ok) => {
                          if (ok) setError("Paused — Start again when ready.");
                        })
                      }
                      className="h-11 min-h-[44px] rounded-lg border border-violet-400/40 bg-violet-400/15 px-3 text-[13px] font-semibold text-violet-100 touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                    >
                      Pause
                    </button>
                    {job.pauseRequestedAt ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === job.id}
                          onClick={() =>
                            void patchJob(job.id, { action: "approve-pause" }).then((ok) => {
                              if (ok) setError("Pause approved.");
                            })
                          }
                          className="h-9 rounded-lg bg-violet-400 px-3 text-[12px] font-semibold text-black disabled:opacity-40"
                        >
                          Approve pause
                        </button>
                        <button
                          type="button"
                          disabled={busyId === job.id}
                          onClick={() => void patchJob(job.id, { action: "reject-pause" })}
                          className="h-8 rounded px-2 text-[11px] text-white/45"
                        >
                          Reject pause
                        </button>
                      </>
                    ) : null}
                  </>
                ) : null}
                {isAdmin &&
                (job.status === "READY_TO_DESIGN" || job.status === "WAITING_BRIEF") ? (
                  <>
                    {uploadJobId !== job.id ? (
                      <button
                        type="button"
                        onClick={() => tryOpenUpload(job, "attach")}
                        className="h-11 min-h-[44px] rounded-lg bg-emerald-400 px-3 text-[13px] font-semibold text-black touch-manipulation sm:h-9 sm:min-h-0 sm:text-[12px]"
                      >
                        {job.fileUrl ? "Edit upload" : "Upload"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === job.id || !job.fileUrl}
                      title={!job.fileUrl ? "Upload a creative first" : undefined}
                      onClick={() =>
                        void patchJob(job.id, { action: "mark-done" }).then((ok) => {
                          if (ok) setError("Done.");
                        })
                      }
                      className="h-11 min-h-[44px] rounded-lg bg-white px-3 text-[13px] font-semibold text-black touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                    >
                      Mark done
                    </button>
                  </>
                ) : null}
                {isAdmin && job.status === "PAUSED" ? (
                  <>
                    <button
                      type="button"
                      disabled={busyId === job.id || !job.fileUrl}
                      title={!job.fileUrl ? "Upload a creative first" : undefined}
                      onClick={() =>
                        void patchJob(job.id, { action: "mark-done" }).then((ok) => {
                          if (ok) setError("Done.");
                        })
                      }
                      className="h-9 rounded-lg bg-white px-3 text-[12px] font-semibold text-black disabled:opacity-40"
                    >
                      Mark done
                    </button>
                    <button
                      type="button"
                      disabled={busyId === job.id}
                      onClick={() =>
                        void patchJob(job.id, { action: "force-clear" }).then((ok) => {
                          if (ok) setError("Force cleared — back to Ready.");
                        })
                      }
                      className="h-8 rounded px-2 text-[11px] text-white/45"
                    >
                      Force clear
                    </button>
                  </>
                ) : null}
                {uploadGate?.jobId === job.id ? (
                  <p className="max-w-[10rem] text-right text-[11px] font-semibold leading-snug text-amber-200">
                    Please wait {formatWaitClock((uploadGate.unlockAt - Date.now()) / 1000)} before
                    you upload
                  </p>
                ) : null}
                {isAdmin && job.fileUrl && job.status === "READY_TO_DESIGN" ? (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() =>
                      void patchJob(job.id, { action: "clear-upload" }).then((ok) => {
                        if (ok) setError("Upload deleted from this Open job.");
                      })
                    }
                    className="h-9 rounded-lg border border-red-400/35 bg-red-400/10 px-3 text-[12px] font-semibold text-red-100 disabled:opacity-40"
                  >
                    Delete upload
                  </button>
                ) : null}
              </div>
            </div>

            {job.status === "IN_PROGRESS" &&
            job.assigneeId === memberId &&
            !isAdmin &&
            !job.pauseRequestedAt ? (
              <div className="mt-2">
                <input
                  value={pauseNoteDrafts[job.id] ?? ""}
                  onChange={(e) =>
                    setPauseNoteDrafts((d) => ({ ...d, [job.id]: e.target.value }))
                  }
                  placeholder="Why pause? (optional — for admin)"
                  className="h-8 w-full rounded-lg border border-white/10 bg-black/35 px-2 text-[12px] text-white"
                />
              </div>
            ) : null}
            {job.pauseRequestedAt && job.status === "IN_PROGRESS" ? (
              <p className="mt-2 text-[12px] text-violet-200/90">
                Pause requested
                {job.pauseRequestNote ? ` — ${job.pauseRequestNote}` : ""}
                {isAdmin ? "" : " · waiting on admin"}
              </p>
            ) : null}

            {queueView === "expired" && job.status === "DESIGN_DONE" ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.08] pt-3">
                {job.fileUrl ? (
                  <a
                    href={teamDownloadHref(job.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center rounded-lg bg-emerald-400 px-3 text-[12px] font-semibold text-black"
                  >
                    Download
                  </a>
                ) : null}
                {(isAdmin || job.assigneeId === memberId) ? (
                  <button
                    type="button"
                    disabled={busyId === job.id || !job.fileUrl}
                    onClick={() =>
                      void patchJob(job.id, { action: "purge-file" }).then((ok) => {
                        if (ok) setError("Cleared from storage.");
                      })
                    }
                    className="h-9 rounded-lg border border-red-400/35 bg-red-400/10 px-3 text-[12px] font-semibold text-red-100 disabled:opacity-40"
                  >
                    Delete file
                  </button>
                ) : null}
              </div>
            ) : null}

            {queueView === "closed" && job.status === "DESIGN_DONE" ? (
              <div className="mt-3 space-y-2 border-t border-white/[0.08] pt-3">
                <div className="flex flex-wrap gap-2">
                  {(isAdmin || job.assigneeId === memberId) ? (
                    <button
                      type="button"
                      disabled={busyId === job.id}
                      onClick={() => tryOpenUpload(job, isAdmin ? "attach" : "close")}
                      className="h-9 rounded-lg bg-amber-400 px-3 text-[12px] font-semibold text-black disabled:opacity-40"
                    >
                      Edit upload
                    </button>
                  ) : null}
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === job.id || !job.fileUrl}
                        onClick={() =>
                          void patchJob(job.id, { action: "clear-upload" }).then((ok) => {
                            if (ok) {
                              setError("Upload deleted — Done entry kept.");
                            }
                          })
                        }
                        className="h-9 rounded-lg border border-red-400/35 bg-red-400/10 px-3 text-[12px] font-semibold text-red-100 disabled:opacity-40"
                      >
                        Delete upload
                      </button>
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        onClick={() =>
                          void patchJob(job.id, { action: "force-clear" }).then((ok) => {
                            if (ok) {
                              setError(
                                "Force cleared — job back on Open; Start Job + upload again."
                              );
                            }
                          })
                        }
                        className="h-9 rounded-lg border border-white/15 px-3 text-[12px] font-semibold text-white/70 disabled:opacity-40"
                      >
                        Force clear
                      </button>
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        onClick={() =>
                          void patchJob(job.id, { action: "reopen" }).then((ok) => {
                            if (ok) {
                              setError(
                                "Reopened — Download cleared. Designer Start Job + upload again."
                              );
                            }
                          })
                        }
                        className="h-9 rounded-lg bg-cyan-500 px-3 text-[12px] font-semibold text-black disabled:opacity-40"
                      >
                        Reopen (clear upload)
                      </button>
                    </>
                  ) : null}
                </div>
                <p className="text-[11px] text-white/35">
                  Edit upload replaces the file for Amit. Delete / Force clear removes Ready from Daily.
                </p>
              </div>
            ) : null}

            {isAdmin && isOpenQueueView(queueView) && job.status !== "DESIGN_DONE" ? (
              <div className="mt-3 border-t border-white/[0.08] pt-3">
                {briefJobId === job.id ? (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-white/40">
                      Description / artist brief (optional)
                    </label>
                    <textarea
                      autoFocus
                      value={briefDrafts[job.id] ?? brief ?? ""}
                      onChange={(e) =>
                        setBriefDrafts((d) => ({ ...d, [job.id]: e.target.value }))
                      }
                      rows={3}
                      placeholder="Artist, lineup, notes…"
                      className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[14px] text-white outline-none focus:border-cyan-400/40"
                    />
                    <label className="block text-[11px] font-medium uppercase tracking-wide text-white/40">
                      Links (optional)
                    </label>
                    <textarea
                      value={
                        linkDrafts[job.id] ??
                        (job.links?.length ? job.links.join("\n") : "")
                      }
                      onChange={(e) =>
                        setLinkDrafts((d) => ({ ...d, [job.id]: e.target.value }))
                      }
                      rows={2}
                      placeholder="Drive / Instagram links — one per line"
                      className="w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-[12px] text-white outline-none focus:border-cyan-400/40"
                    />
                    <PriorityModePicker
                      value={priorityDrafts[job.id] ?? job.priorityMode ?? "NONE"}
                      onChange={(priorityMode) =>
                        setPriorityDrafts((d) => ({ ...d, [job.id]: priorityMode }))
                      }
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {canSend ? (
                        <button
                          type="button"
                          disabled={busyId === job.id}
                          onClick={() => void sendToDesigner(job)}
                          className="h-9 rounded-lg bg-cyan-500 px-3.5 text-[12px] font-semibold text-black disabled:opacity-40"
                        >
                          Send to {designer}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        onClick={() =>
                          void patchJob(job.id, {
                            action: "set-brief",
                            description:
                              briefDrafts[job.id] !== undefined
                                ? briefDrafts[job.id]
                                : brief ?? "",
                            links:
                              linkDrafts[job.id] ??
                              (job.links?.length ? job.links.join("\n") : ""),
                          }).then((ok) => {
                            if (ok) setBriefJobId(null);
                          })
                        }
                        className="h-9 rounded-lg border border-white/15 px-3 text-[12px] font-semibold text-white/80"
                      >
                        Save brief
                      </button>
                      <button
                        type="button"
                        onClick={() => setBriefJobId(null)}
                        className="h-9 rounded-lg px-2.5 text-[11px] text-white/45"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        onClick={() =>
                          void patchJob(job.id, {
                            action: "set-urgent",
                            urgent: !job.urgent,
                          })
                        }
                        className="h-9 rounded-lg px-2.5 text-[11px] text-amber-200/80"
                      >
                        {job.urgent ? "Clear urgent" : "Mark urgent"}
                      </button>
                      {job.status !== "WAITING_BRIEF" ? (
                        <button
                          type="button"
                          disabled={busyId === job.id}
                          title="Unsend — off designer queue, clear Amit Ready"
                          aria-label="Unsend"
                          onClick={() => unsendJob(job)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300/35 bg-amber-400/10 px-2.5 text-[11px] font-semibold text-amber-100 disabled:opacity-40"
                        >
                          <IconUnsend className="h-3.5 w-3.5" />
                          Unsend
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        title="Delete job permanently"
                        aria-label="Delete"
                        onClick={() => deleteJob(job)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-400/35 bg-red-500/10 px-2.5 text-[11px] font-semibold text-red-200 disabled:opacity-40"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBriefJobId(job.id)}
                      className="h-9 rounded-lg border border-white/15 px-3 text-[12px] font-medium text-white/65 hover:text-white/85"
                    >
                      {brief ? "Edit brief" : "Add brief"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === job.id}
                      onClick={() =>
                        void patchJob(job.id, {
                          action: "set-urgent",
                          urgent: !job.urgent,
                        })
                      }
                      className="h-9 rounded-lg px-2.5 text-[11px] text-amber-200/80"
                    >
                      {job.urgent ? "Clear urgent" : "Mark urgent"}
                    </button>
                    {job.status !== "WAITING_BRIEF" ? (
                      <button
                        type="button"
                        disabled={busyId === job.id}
                        title="Unsend — off designer queue, clear Amit Ready"
                        aria-label="Unsend"
                        onClick={() => unsendJob(job)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300/35 bg-amber-400/10 px-2.5 text-[11px] font-semibold text-amber-100 disabled:opacity-40"
                      >
                        <IconUnsend className="h-3.5 w-3.5" />
                        Unsend
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === job.id}
                      title="Delete job permanently"
                      aria-label="Delete"
                      onClick={() => deleteJob(job)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-400/35 bg-red-500/10 px-2.5 text-[11px] font-semibold text-red-200 disabled:opacity-40"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {uploadJobId === job.id ? (
              <div className="mt-2 space-y-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] p-2.5">
                <p className="text-[11px] text-emerald-100/90">
                  {job.status === "DESIGN_DONE"
                    ? "Replace the creative — Amit Ready updates with the new file."
                    : uploadMode === "attach"
                      ? "Admin upload only — job stays Open until you Mark done."
                      : "After WhatsApp OK — upload final, then close. Amit gets Ready on Daily."}
                </p>
                <label className="flex items-center gap-2 text-[11px] text-white/70">
                  <input
                    type="checkbox"
                    checked={uploadForm.waApproved}
                    onChange={(e) =>
                      setUploadForm((f) => ({ ...f, waApproved: e.target.checked }))
                    }
                  />
                  WhatsApp approved
                </label>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf"
                  disabled={uploading}
                  onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-[11px] text-white/60"
                />
                {uploadForm.fileUrl ? (
                  <a
                    href={uploadForm.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-[11px] text-cyan-300"
                  >
                    File ready
                  </a>
                ) : null}
                <input
                  value={uploadForm.scheduleNote}
                  onChange={(e) =>
                    setUploadForm((f) => ({ ...f, scheduleNote: e.target.value }))
                  }
                  placeholder="When to post"
                  className="w-full rounded border border-white/10 bg-black/35 px-2 py-1.5 text-[12px] text-white"
                />
                <textarea
                  value={uploadForm.postingNotes}
                  onChange={(e) =>
                    setUploadForm((f) => ({ ...f, postingNotes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Caption / notes for Amit"
                  className="w-full rounded border border-white/10 bg-black/35 px-2 py-1.5 text-[12px] text-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={
                      busyId === job.id ||
                      uploading ||
                      !uploadForm.fileUrl ||
                      (!uploadForm.waApproved && !isAdmin)
                    }
                    onClick={() => void closeUpload()}
                    className="h-9 rounded-lg bg-emerald-400 px-3.5 text-[12px] font-semibold text-black disabled:opacity-40"
                  >
                    {uploading
                      ? "Uploading…"
                      : busyId === job.id
                        ? "Saving…"
                        : job.status === "DESIGN_DONE"
                          ? "Save new upload"
                          : uploadMode === "attach"
                            ? "Save upload"
                            : "Save & close"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === job.id || uploading}
                    onClick={() => {
                      setUploadJobId(null);
                      setUploadForm({
                        postingNotes: "",
                        scheduleNote: "",
                        waApproved: false,
                        fileUrl: "",
                      });
                    }}
                    className="h-9 px-2 text-[12px] text-white/45 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </article>
          );
          };

          const renderSection = (
            title: string,
            hint: string,
            list: DesignerJobDto[],
            tone: "catchUp" | "today" | "next" | "done",
            headingClass: string
          ) => {
            if (list.length === 0) return null;
            return (
              <div className="space-y-2">
                <div>
                  <h2 className={`text-[12px] font-semibold uppercase tracking-wide ${headingClass}`}>
                    {title} ({list.length})
                  </h2>
                  {hint ? (
                    <p className="mt-0.5 text-[12px] leading-snug text-white/55">{hint}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {list.map((job) => renderJob(job, undefined, tone))}
                </div>
              </div>
            );
          };

          if (queueView === "toSend") {
            if (!isAdmin) {
              return (
                <p className="text-[13px] text-white/45">Admin only.</p>
              );
            }
            if (toSendVisible.length === 0) {
              return (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
                  <p className="text-[14px] font-semibold text-white/80">Nothing to send</p>
                  <p className="mt-1 text-[12px] text-white/45">
                    All briefs for this filter are already on Open, or seed more days.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-amber-200/90">
                    To send ({toSendVisible.length})
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-white/50">
                      <input
                        type="checkbox"
                        checked={
                          toSendVisible.length > 0 &&
                          toSendVisible.every((j) => selectedIds.has(j.id))
                        }
                        onChange={() => {
                          const allOn =
                            toSendVisible.length > 0 &&
                            toSendVisible.every((j) => selectedIds.has(j.id));
                          if (allOn) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(toSendVisible.map((j) => j.id)));
                          }
                        }}
                        className="rounded border-white/30"
                      />
                      Select all
                    </label>
                    <button
                      type="button"
                      disabled={selectedIds.size === 0 || busyId === "bulk-send"}
                      onClick={() => void sendSelected()}
                      className="h-8 rounded-lg bg-cyan-500 px-3 text-[11px] font-semibold text-black disabled:opacity-35"
                    >
                      {busyId === "bulk-send"
                        ? "Sending…"
                        : `Send selected (${selectedIds.size})`}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {toSendVisible.map((job) => {
                    const { dayName, dateLabel } = formatPostDateParts(job.postDate);
                    const designer = designerDisplayName(job.assigneeId);
                    const selected = selectedIds.has(job.id);
                    return (
                      <article
                        key={job.id}
                        className={`rounded-xl border px-3.5 py-3 ${
                          selected
                            ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                            : "border-amber-400/20 bg-amber-400/[0.04]"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 gap-2.5">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelected(job.id)}
                              className="mt-1.5 shrink-0 rounded border-white/30"
                              aria-label={`Select ${job.title}`}
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                {dayName} · {dateLabel}
                              </p>
                              <p className="mt-0.5 text-[15px] font-semibold text-white/85">
                                {job.outletLabel}{" "}
                                <span className="text-[12px] font-medium text-white/40">
                                  {job.format === "story" ? "Story" : "Post"}
                                </span>
                              </p>
                              <p className="text-[13px] text-white/70">{job.title}</p>
                              <p className="mt-1 text-[12px] text-white/45">
                                → {designer} · Not sent · design due{" "}
                                {job.dueDate.slice(8)}/{job.dueDate.slice(5, 7)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyId === job.id || busyId === "bulk-send"}
                              onClick={() => void sendToDesigner(job)}
                              className="h-10 min-h-[44px] rounded-lg bg-cyan-500 px-3 text-[13px] font-semibold text-black disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                            >
                              Send to {designer}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === job.id}
                              onClick={() => void deleteJob(job)}
                              className="h-10 min-h-[44px] rounded-lg border border-red-400/35 bg-red-500/10 px-3 text-[13px] font-semibold text-red-200 disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (queueView === "expired") {
            const files = queue.filter((j) => Boolean(j.fileUrl));
            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-white/50">
                    Expired files · {files.length}
                  </h2>
                  {files.length > 0 ? (
                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => {
                        void (async () => {
                          setBusyId("purge-all");
                          try {
                            for (const j of files) {
                              await patchJob(j.id, { action: "purge-file" }, { quiet: true });
                            }
                            setError("Cleared expired files — Done history kept.");
                            await load({ soft: true, view: "expired" });
                          } finally {
                            setBusyId(null);
                          }
                        })();
                      }}
                      className="h-8 rounded-lg border border-red-400/35 bg-red-400/10 px-2.5 text-[11px] font-semibold text-red-100"
                    >
                      Delete all files
                    </button>
                  ) : null}
                </div>
                {files.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-white/35">
                    No expired files to clear.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {files.map((job) => {
                      const { dayName, dateLabel } = formatPostDateParts(job.postDate);
                      return (
                        <li
                          key={job.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-white/90">
                              {job.outletLabel} · {job.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/45">
                              Event {dayName} {dateLabel}
                              {job.uploadedAt
                                ? ` · uploaded ${istYmdFromIso(job.uploadedAt) ?? ""}`
                                : ""}
                              {" · "}
                              {designerDisplayName(job.assigneeId)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <a
                              href={teamDownloadHref(
                                job.fileUrl!,
                                `${job.outletLabel}-${job.postDate}`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center rounded-lg bg-emerald-400 px-3 text-[12px] font-semibold text-black"
                            >
                              Download
                            </a>
                            <button
                              type="button"
                              disabled={busyId === job.id}
                              onClick={() =>
                                void patchJob(job.id, { action: "purge-file" }).then((ok) => {
                                  if (ok) {
                                    setAllJobs((prev) => prev.filter((j) => j.id !== job.id));
                                    setError("File deleted — Done entry kept.");
                                  }
                                })
                              }
                              className="h-9 rounded-lg border border-red-400/35 bg-red-400/10 px-3 text-[12px] font-semibold text-red-100 disabled:opacity-40"
                            >
                              Delete file
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          }

          if (queueView === "closed") {
            const groups = groupDoneJobsByDay(queue);
            return (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-white/50">
                    Done · {queue.length} total
                  </h2>
                </div>
                {groups.map((g) => (
                  <div key={g.key} className="space-y-2">
                    <h3 className="text-[13px] font-semibold text-white/80">
                      {g.dayName} · {g.dateLabel}
                      <span className="ml-2 text-[11px] font-medium text-white/40">
                        ({g.jobs.length})
                      </span>
                    </h3>
                    {g.jobs.map((job) => renderJob(job, undefined, "done"))}
                  </div>
                ))}
              </div>
            );
          }

          if (!canDragQueue) {
            return (
              <div className="space-y-5">
                {catchUpDebt > openParts.catchUp.length &&
                catchUpDebt > 0 &&
                isAdmin ? (
                  <p className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[12px] text-white/60">
                    Owed {catchUpDebt} · showing {openParts.catchUp.length}
                    {outletFilter !== "all" ? " in this outlet — switch to All" : ""}.
                  </p>
                ) : null}
                {renderSection(
                  "Catch up",
                  openParts.catchUpHint ||
                    "Unfinished from earlier days — finish these first.",
                  openParts.catchUp,
                  "catchUp",
                  "text-amber-200/90"
                )}
                {renderSection(
                  "Today",
                  "Next 4 in priority order — Start → Upload → Done",
                  openParts.todayPack,
                  "today",
                  "text-white/70"
                )}
                {renderSection(
                  "Later",
                  "",
                  openParts.upNext,
                  "next",
                  "text-white/45"
                )}
              </div>
            );
          }

          return (
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={onQueueDragEnd}
            >
              <div className="space-y-5">
                {renderSection(
                  "Catch up",
                  openParts.catchUpHint ||
                    "Unfinished from earlier days — finish these first.",
                  openParts.catchUp,
                  "catchUp",
                  "text-amber-200/90"
                )}
                <SortableContext
                  items={[...openParts.todayPack, ...openParts.upNext].map((j) => j.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {(
                    [
                      [
                        "Today",
                        "Next 4 in priority order — Start → Upload → Done · drag ≡",
                        openParts.todayPack,
                        "today",
                        "text-white/70",
                      ],
                      [
                        "Later",
                        "drag ≡",
                        openParts.upNext,
                        "next",
                        "text-white/45",
                      ],
                    ] as const
                  ).map(([title, hint, list, tone, headingClass]) =>
                    list.length === 0 ? null : (
                      <div key={String(title)} className="space-y-2">
                        <div>
                          <h2
                            className={`text-[12px] font-semibold uppercase tracking-wide ${headingClass}`}
                          >
                            {title} ({list.length})
                          </h2>
                          {hint ? (
                            <p className="mt-0.5 text-[11px] text-white/45">{hint}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          {list.map((job) => (
                            <SortableDesignerJob key={job.id} id={job.id}>
                              {(dragHandleProps) =>
                                renderJob(job, dragHandleProps, tone)
                              }
                            </SortableDesignerJob>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </SortableContext>
              </div>
            </DndContext>
          );
        })()}

      </section>
      </>
      ) : null}
      </div>
      </div>

      {expiredOpen && isAdmin ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"
          onClick={() => setExpiredOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg space-y-3 overflow-hidden rounded-2xl border border-white/10 bg-[#12141a] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-white">Expired handoff files</h2>
              <p className="text-[12px] text-white/45">
                Older than {HANDOFF_TTL_DAYS} days. Cron also purges these — delete here anytime.
              </p>
            </div>
            {expiredBlobs.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-white/35">No expired files.</p>
            ) : (
              <ul className="max-h-[45vh] space-y-2 overflow-y-auto">
                {expiredBlobs.map((b) => (
                  <li
                    key={b.url}
                    className="flex items-start justify-between gap-2 rounded-lg border border-white/[0.08] px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-white/80">{b.pathname}</p>
                      <p className="text-[10px] text-white/40">
                        {b.uploadedAt.slice(0, 10)} · {(b.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={expiredBusy}
                      onClick={() =>
                        void (async () => {
                          setExpiredBusy(true);
                          try {
                            const res = await fetch("/api/team/handoff-blobs", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "delete", urls: [b.url] }),
                            });
                            await readJson(res);
                            setExpiredBlobs((prev) => prev.filter((x) => x.url !== b.url));
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Delete failed");
                          } finally {
                            setExpiredBusy(false);
                          }
                        })()
                      }
                      className="shrink-0 text-[11px] font-semibold text-red-300/90"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpiredOpen(false)}
                className="h-10 flex-1 rounded-xl border border-white/10 text-[13px] text-white/60"
              >
                Close
              </button>
              <button
                type="button"
                disabled={expiredBusy || expiredBlobs.length === 0}
                onClick={() =>
                  void (async () => {
                    setExpiredBusy(true);
                    try {
                      const res = await fetch("/api/team/handoff-blobs", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "purge-expired" }),
                      });
                      const data = await readJson(res);
                      setExpiredBlobs([]);
                      setError(`Purged ${data.deleted ?? 0} expired file(s).`);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Purge failed");
                    } finally {
                      setExpiredBusy(false);
                    }
                  })()
                }
                className="h-10 flex-1 rounded-xl bg-red-400/90 text-[13px] font-semibold text-black disabled:opacity-40"
              >
                Delete all expired
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function outletLogoSrc(outletId: string): string | null {
  if (outletId === "c53" || outletId === "boiler-room" || outletId === "firefly") {
    return `/logos/${outletId}.png`;
  }
  return null;
}

function OutletChipIcon({ outletId }: { outletId: string }) {
  const src = outletLogoSrc(outletId);
  const letter = teamOutletLabel(outletId).slice(0, 1).toUpperCase();
  if (!src) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white/80">
        {letter}
      </span>
    );
  }
  return (
    <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
      <Image src={src} alt="" fill sizes="20px" className="object-contain p-0.5" />
    </span>
  );
}

function PriorityModePicker({
  value,
  onChange,
}: {
  value: DesignerPriorityMode;
  onChange: (v: DesignerPriorityMode) => void;
}) {
  const options: Array<{ id: DesignerPriorityMode; label: string; hint: string }> = [
    {
      id: "PAUSE_NOW",
      label: "Start immediately",
      hint: "Pause current — this first (stuck / must-do)",
    },
    {
      id: "AFTER_CURRENT",
      label: "After current",
      hint: "Finish in-progress, then this",
    },
    {
      id: "NONE",
      label: "Not sure / deadline",
      hint: "Pick a free slot below (or set date)",
    },
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
        Priority / when to start
      </p>
      <div className="flex flex-col gap-1.5 sm:flex-row">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 rounded-lg border px-2.5 py-2 text-left ${
              value === o.id
                ? o.id === "PAUSE_NOW"
                  ? "border-rose-400/50 bg-rose-400/15 text-rose-50"
                  : o.id === "AFTER_CURRENT"
                    ? "border-orange-400/45 bg-orange-400/12 text-orange-50"
                    : "border-emerald-400/45 bg-emerald-400/12 text-emerald-50"
                : "border-white/10 bg-black/25 text-white/55 hover:text-white/80"
            }`}
          >
            <span className="block text-[12px] font-semibold">{o.label}</span>
            <span className="mt-0.5 block text-[10px] opacity-75">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HolidayTabPanel({ designers }: { designers: DesignerPerformanceDto[] }) {
  if (designers.length === 0) {
    return (
      <p className="text-[13px] text-white/40">Loading holiday info…</p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-white/55">
        Work from home — no fixed paid holidays. Leave unlocks only from holiday points (extra work).
        Four tasks per workday is the minimum. Hope you get that and do them well.
      </p>
      {designers.map((perf) => {
        const stack = perf.stack;
        const points = stack?.holidayPoints ?? 0;
        const per = stack?.pointsPerLeave ?? DESIGNER_POINTS_PER_LEAVE;
        const unlocked = stack?.leaveDaysEarned ?? 0;
        const sundays = stack?.monthSundays ?? [];
        return (
          <div
            key={perf.assigneeId}
            className="rounded-xl border border-violet-400/30 bg-violet-400/[0.07] px-3 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-100/80">
              {perf.name} · holidays
            </p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-white">
              {points}
              <span className="ml-1.5 text-[12px] font-medium text-white/45">
                holiday points · {per} = 1 leave (ask permission)
              </span>
            </p>
            <p className="mt-1 text-[12px] text-white/55">
              Unlocked leaves:{" "}
              <span className="font-semibold text-cyan-200">{unlocked}</span>
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
              Sundays this month
            </p>
            <ul className="mt-1.5 space-y-1">
              {sundays.length === 0 ? (
                <li className="text-[12px] text-white/35">No Sundays listed.</li>
              ) : (
                sundays.map((s) => (
                  <li
                    key={s.date}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] ${
                      s.isToday
                        ? "bg-violet-400/20 text-violet-50"
                        : s.isPast
                          ? "text-white/45"
                          : "text-white/75"
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="text-[11px] font-semibold text-violet-200/80">
                      {s.isToday ? "Happy holiday — enjoy your day" : "Happy holiday"}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <p className="mt-2 text-[11px] leading-snug text-white/40">
              Earn holiday points by working Sunday (next-day pack) or Mon–Sat extras (Start + Close
              same day). {per} points = 1 leave — ask before taking it.
            </p>
          </div>
        );
      })}
    </div>
  );
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function dayShortLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  return DAY_SHORT[dt.getUTCDay()] ?? "";
}

function dayOfMonthLabel(ymd: string): string {
  return String(Number(ymd.slice(8, 10)));
}

function DesignerPerformanceCard({
  perf,
  isAdmin,
  nudges,
  nudgeBusy,
  onNudge,
  onOpenNudge,
}: {
  perf: DesignerPerformanceDto;
  isAdmin: boolean;
  nudges: DesignerSuggestedNudgeDto[];
  nudgeBusy: string | null;
  onNudge: () => void;
  onOpenNudge: (s: DesignerSuggestedNudgeDto) => void;
}) {
  const sunday = Boolean(perf.isSundayHoliday);
  const catchMeta = catchUpMetaFromStack(perf.stack);
  const catchUpN = catchMeta.catchUpSlots;
  const doneTotal = perf.stack.closedSoFar;
  const targetSoFar = perf.stack.targetSoFar;
  const pendingNudges = nudges.slice(0, 3);

  // Rolling window day-by-day (same span as queue seed), Sundays shown but blocked
  const dayStrip = perf.series.map((pt) => {
    const isSunday = dayShortLabel(pt.date) === "Sun";
    const isOff = pt.target <= 0;
    const closed =
      pt.date === perf.today && !sunday ? Math.max(pt.closed, perf.closedToday) : pt.closed;
    return {
      ...pt,
      closed,
      isSunday,
      isOff,
      isToday: pt.date === perf.today,
      label: dayShortLabel(pt.date),
    };
  });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white/90">
            {perf.name}
            <span className="ml-2 text-[12px] font-medium tabular-nums text-white/40">
              {doneTotal} done
              {targetSoFar > 0 ? (
                <span className="text-white/30"> · aim {targetSoFar}</span>
              ) : null}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-white/40">
            {catchUpN > 0 ? (
              <span className="text-amber-200/85">
                Catch up {catchUpN}
                {catchMeta.pendingFromLabel
                  ? ` · from ${catchMeta.pendingFromLabel}`
                  : ""}
              </span>
            ) : (
              <span>Catch up clear</span>
            )}
            {sunday ? (
              <span className="text-violet-200/70"> · Sunday off</span>
            ) : perf.inProgress > 0 ? (
              <span>
                {" "}
                · {perf.inProgress} in progress · today {perf.closedToday}/
                {DESIGNER_DAILY_TARGET}
              </span>
            ) : (
              <span>
                {" "}
                · today {perf.closedToday}/{DESIGNER_DAILY_TARGET}
              </span>
            )}
          </p>
        </div>
        {isAdmin ? (
          <div className="flex shrink-0 items-center gap-1">
            {pendingNudges.length > 0
              ? pendingNudges.map((s) => {
                  const key = `${s.assigneeId}:${s.kind}:${s.jobId}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      title={s.label}
                      disabled={nudgeBusy === key}
                      onClick={() => onOpenNudge(s)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30 disabled:opacity-40"
                    >
                      <IconWhatsApp className="h-4 w-4" />
                    </button>
                  );
                })
              : (
                <button
                  type="button"
                  title="WhatsApp nudge"
                  disabled={nudgeBusy === perf.assigneeId}
                  onClick={onNudge}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/55 ring-1 ring-white/10 hover:text-emerald-300 disabled:opacity-40"
                >
                  <IconWhatsApp className="h-4 w-4" />
                </button>
              )}
          </div>
        ) : null}
      </div>

      <div className="-mx-0.5 mt-3 flex gap-1 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {dayStrip.map((d) => (
          <div
            key={d.date}
            className={`w-[3.15rem] shrink-0 rounded-lg px-1 py-1.5 text-center ${
              d.isSunday || d.isOff
                ? "bg-violet-400/[0.07] ring-1 ring-violet-400/20"
                : d.isToday
                  ? "bg-cyan-400/15 ring-1 ring-cyan-400/35"
                  : d.closed >= DESIGNER_DAILY_TARGET
                    ? "bg-emerald-400/10"
                    : "bg-white/[0.03]"
            }`}
            title={
              d.isSunday
                ? `${d.date} · Sunday off${d.closed > 0 ? ` · ${d.closed} extra` : ""}`
                : d.isOff
                  ? `${d.date} · off`
                  : `${d.date} · ${d.closed} of ${DESIGNER_DAILY_TARGET}`
            }
          >
            <p
              className={`text-[9px] font-semibold uppercase tracking-wide ${
                d.isToday ? "text-cyan-100" : "text-white/40"
              }`}
            >
              {d.label}
            </p>
            <p className="text-[9px] text-white/30">{dayOfMonthLabel(d.date)}</p>
            {d.isSunday || d.isOff ? (
              <>
                <p className="mt-1 text-[15px] font-semibold tabular-nums leading-none text-violet-100/80">
                  {d.closed > 0 ? d.closed : "—"}
                </p>
                <p className="mt-0.5 text-[9px] text-violet-200/60">
                  {d.closed > 0 ? "extra" : "off"}
                </p>
              </>
            ) : (
              <>
                <p
                  className={`mt-1 text-[15px] font-semibold tabular-nums leading-none ${
                    d.closed >= DESIGNER_DAILY_TARGET
                      ? "text-emerald-200"
                      : d.isToday
                        ? "text-white"
                        : "text-white/75"
                  }`}
                >
                  {d.closed}
                </p>
                <p className="mt-0.5 text-[9px] tabular-nums text-white/30">
                  of {DESIGNER_DAILY_TARGET}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

