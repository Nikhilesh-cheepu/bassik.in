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
  DESIGNER_WINDOW_DAYS,
  isBoilerplateDesignerDescription,
  sortDesignerJobs,
  type DesignerJobDto,
  type DesignerMetricsDto,
  type DesignerPerformanceDto,
  type DesignerReminderLogDto,
} from "@/lib/team-designer-jobs-shared";
import { openWhatsAppShareUrl } from "@/lib/open-whatsapp";
import { uploadTeamFile } from "@/lib/team-client-upload";
import { teamDownloadHref } from "@/lib/team-download";
import { teamOutletLabel } from "@/lib/team-outlets";
import { IconTrash, IconUnsend } from "./TeamIcons";

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

const HANDOFF_TTL_DAYS = 7;
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
  const [queueView, setQueueView] = useState<"open" | "closed">("open");
  const [outletFilter, setOutletFilter] = useState<"all" | string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [allJobs, setAllJobs] = useState<DesignerJobDto[]>([]);
  const [windowMeta, setWindowMeta] = useState<WindowMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    urgent: true,
  });
  const [expiredOpen, setExpiredOpen] = useState(false);
  const [expiredBlobs, setExpiredBlobs] = useState<
    Array<{ url: string; pathname: string; uploadedAt: string; size: number }>
  >([]);
  const [expiredBusy, setExpiredBusy] = useState(false);
  const [perfDesigners, setPerfDesigners] = useState<DesignerPerformanceDto[]>([]);
  const [reminders, setReminders] = useState<DesignerReminderLogDto[]>([]);
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
    } catch {
      /* non-blocking */
    }
  }, []);

  const load = useCallback(async (opts?: { soft?: boolean; view?: "open" | "closed" }) => {
    const view = opts?.view ?? queueViewRef.current;
    const gen = ++loadGen.current;
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    try {
      const qs = view === "closed" ? "?view=closed" : "";
      const res = await fetch(`/api/team/designer-jobs${qs}`);
      const data = await readJson(res);
      if (gen !== loadGen.current) return;
      setAllJobs((data.jobs as DesignerJobDto[]) ?? []);
      setWindowMeta((data.window as WindowMeta) ?? null);
      setError(null);
      void loadPerformance();
    } catch (err) {
      if (gen !== loadGen.current) return;
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (gen === loadGen.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loadPerformance]);

  useEffect(() => {
    void load({ view: queueView });
  }, [load, queueView]);

  const sendManualNudge = async (assigneeId: string) => {
    setNudgeBusy(assigneeId);
    try {
      const res = await fetch("/api/team/designer-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nudge", assigneeId }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Nudge failed");
      }
      setReminders((data.reminders as DesignerReminderLogDto[]) ?? []);
      const first = (data.results as Array<{ delivery?: string; reason?: string }>)?.[0];
      const share = (data.reminders as DesignerReminderLogDto[])?.[0]?.shareUrl;
      if (first?.delivery === "skipped_no_config" && share) {
        openWhatsAppShareUrl(share);
        setError("Cloud WA not configured — opened share link.");
      } else if (first?.delivery === "sent") {
        setError(`Nudge sent to ${designerDisplayName(assigneeId)}.`);
      } else {
        setError(first?.reason || "Nudge logged.");
      }
      void loadPerformance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nudge failed");
    } finally {
      setNudgeBusy(null);
    }
  };

  const jobs = useMemo(() => {
    let list = allJobs;
    if (isAdmin && designerTab !== "all") {
      list = list.filter((j) => j.assigneeId === designerTab);
    }
    if (outletFilter !== "all") {
      list = list.filter((j) => j.outletId === outletFilter);
    }
    return sortDesignerJobs(list);
  }, [allJobs, designerTab, isAdmin, outletFilter]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sendableJobs = useMemo(
    () => jobs.filter((j) => j.status === "WAITING_BRIEF"),
    [jobs]
  );

  const metrics: DesignerMetricsDto = useMemo(() => {
    const readyBriefs = jobs.filter((j) => j.status === "READY_TO_DESIGN").length;
    const inProgress = jobs.filter((j) => j.status === "IN_PROGRESS").length;
    const overdueOpen = jobs.filter((j) => j.isOverdue).length;
    return {
      closedToday: 0,
      closedThisWeek: 0,
      readyBriefs,
      inProgress,
      overdueOpen,
      onTimeUploadsWeek: 0,
      lateUploadsWeek: 0,
      dailyTarget: DESIGNER_DAILY_TARGET,
      queueHealthOk: readyBriefs + inProgress >= DESIGNER_DAILY_TARGET,
    };
  }, [jobs]);

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
          if (queueViewRef.current === "open" && updated.status === "DESIGN_DONE") {
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
        if (typeof data.message === "string" && body.action === "unsend") {
          setError(data.message);
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
    const ok = await patchJob(job.id, {
      action: "brief-ready",
      description,
      links:
        linkDrafts[job.id] ?? (job.links?.length ? job.links.join("\n") : ""),
    });
    if (ok) setBriefJobId((cur) => (cur === job.id ? null : cur));
    return ok;
  };

  const persistQueueOrder = async (orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    setAllJobs((prev) =>
      sortDesignerJobs(
        prev.map((j) =>
          orderMap.has(j.id) ? { ...j, sortOrder: orderMap.get(j.id)! } : j
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

  const onQueueDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const visibleIds = jobs.map((j) => j.id);
    const oldIndex = visibleIds.indexOf(String(active.id));
    const newIndex = visibleIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const fullSorted = sortDesignerJobs(allJobs);
    const visibleSet = new Set(visibleIds);
    const nextVisible = arrayMove(
      fullSorted.filter((j) => visibleSet.has(j.id)),
      oldIndex,
      newIndex
    );
    let vi = 0;
    const nextFull = fullSorted.map((j) => {
      if (visibleSet.has(j.id)) return nextVisible[vi++]!;
      return j;
    });
    void persistQueueOrder(nextFull.map((j) => j.id));
  };

  const sendSelected = async () => {
    const ids = sendableJobs.filter((j) => selectedIds.has(j.id)).map((j) => j.id);
    if (ids.length === 0) return;
    setBusyId("bulk-send");
    setError(null);
    let okCount = 0;
    try {
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
        if (ok) okCount += 1;
      }
      setSelectedIds(new Set());
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

  const startJob = (job: DesignerJobDto) => void patchJob(job.id, { action: "start" });

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

  const tryOpenUpload = (job: DesignerJobDto, mode: "close" | "attach") => {
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
      setUploadJobId(null);
      setUploadForm({ postingNotes: "", scheduleNote: "", waApproved: false, fileUrl: "" });
      if (typeof data.message === "string") setError(data.message);
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
          urgent: adhoc.urgent,
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
        urgent: true,
      });
      const created = data.job as DesignerJobDto | undefined;
      if (created) {
        setAllJobs((prev) => [created, ...prev.filter((j) => j.id !== created.id)]);
      }
      setDesignerTab(adhoc.assigneeId);
      setError(
        typeof data.message === "string"
          ? data.message
          : `Sent to ${designerDisplayName(adhoc.assigneeId)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusyId(null);
    }
  };

  const queue = jobs;
  const canDragQueue = isAdmin && queueView === "open" && queue.length > 1;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#06060a]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 [-webkit-overflow-scrolling:touch] xl:pb-10">
      <div className="mx-auto w-full max-w-3xl space-y-4 py-3">
      <div className="relative z-[1] flex flex-wrap items-end gap-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Rolling {DESIGNER_WINDOW_DAYS} days
          </p>
          <p className="text-[13px] font-semibold text-white/85">
            {windowMeta
              ? `${windowMeta.fromDate} → ${windowMeta.toDate}`
              : "From today"}
          </p>
        </div>
        <div className="flex rounded-lg bg-black/35 p-1">
          {(
            [
              ["open", "Open"],
              ["closed", "Done"],
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
                  ? "bg-white text-black"
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
        {refreshing ? (
          <span className="text-[11px] text-white/35">Refreshing…</span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="In queue" value={String(queue.length)} />
        <Metric
          label="Ready to start"
          value={String(metrics.readyBriefs)}
          ok={metrics.queueHealthOk}
        />
        <Metric label="In progress" value={String(metrics.inProgress)} />
      </div>

      {visiblePerf.map((p) => (
        <DesignerPerformanceCard
          key={p.assigneeId}
          perf={p}
          isAdmin={isAdmin}
          nudgeBusy={nudgeBusy === p.assigneeId}
          onNudge={() => void sendManualNudge(p.assigneeId)}
        />
      ))}

      {isAdmin && visiblePerf.length > 0 ? (
        <DesignerPerformanceGraph designers={visiblePerf} />
      ) : null}

      {isAdmin && reminders.length > 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
            WA follow-ups (admin)
          </p>
          <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
            {reminders.slice(0, 12).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] text-white/60"
              >
                <span>
                  <span className="font-medium text-white/80">
                    {designerDisplayName(r.assigneeId)}
                  </span>{" "}
                  · {r.kind.replace(/_/g, " ")} · {r.delivery}
                  <span className="text-white/35"> · {r.dateKey}</span>
                </span>
                {r.shareUrl ? (
                  <button
                    type="button"
                    onClick={() => openWhatsAppShareUrl(r.shareUrl!)}
                    className="text-cyan-300/90 underline-offset-2 hover:underline"
                  >
                    Open WA
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-[11px] leading-relaxed text-white/40">
        {queueView === "closed"
          ? `Done jobs · Designer can Edit upload · Admin can Delete upload / Force clear · Files auto-expire after ${HANDOFF_TTL_DAYS} days`
          : `Mandatory ${DESIGNER_DAILY_TARGET}/day · Ready briefs can land any day — week calendar done ≠ day off · Mahesh Fri–Sun (−4d @ 8 PM) · Jeslyn Mon–Thu (day before @ 8 PM) · One job at a time`}
      </p>

      {isAdmin && queueView === "closed" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={expiredBusy}
            onClick={() => {
              void (async () => {
                setExpiredBusy(true);
                try {
                  const res = await fetch("/api/team/handoff-blobs");
                  const data = await readJson(res);
                  setExpiredBlobs(
                    (data.blobs as Array<{
                      url: string;
                      pathname: string;
                      uploadedAt: string;
                      size: number;
                    }>) ?? []
                  );
                  setExpiredOpen(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to list expired files");
                } finally {
                  setExpiredBusy(false);
                }
              })();
            }}
            className="h-9 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 text-[12px] font-semibold text-amber-100"
          >
            Expired files ({HANDOFF_TTL_DAYS}d+)
          </button>
        </div>
      ) : null}

      {isAdmin && queueView === "open" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAdhocOpen((v) => !v)}
            className="h-9 rounded-lg bg-amber-400 px-3.5 text-[12px] font-semibold text-black"
          >
            + Add task
          </button>
          <button
            type="button"
            disabled={busyId === "seed"}
            onClick={() => void seedWindow()}
            className="h-9 rounded-lg bg-white/10 px-3 text-[11px] font-semibold text-white/80 disabled:opacity-40"
          >
            Seed next {DESIGNER_WINDOW_DAYS} days
          </button>
          <button
            type="button"
            disabled={busyId === "seed"}
            onClick={() => void seedWindow(["WEEKEND"])}
            className="h-9 rounded-lg bg-white/10 px-3 text-[11px] font-semibold text-white/70"
          >
            Seed Mahesh
          </button>
          <button
            type="button"
            disabled={busyId === "seed"}
            onClick={() => void seedWindow(["WEEKDAY"])}
            className="h-9 rounded-lg bg-white/10 px-3 text-[11px] font-semibold text-white/70"
          >
            Seed Jeslyn
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            setOutletFilter("all");
            setSelectedIds(new Set());
          }}
          className={`h-8 rounded-md px-2.5 text-[11px] font-semibold ${
            outletFilter === "all"
              ? "bg-white/15 text-white"
              : "bg-white/[0.04] text-white/45 hover:text-white/70"
          }`}
        >
          All outlets
        </button>
        {DESIGNER_MONTH_OUTLET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setOutletFilter(id);
              setSelectedIds(new Set());
            }}
            className={`h-8 rounded-md px-2.5 text-[11px] font-semibold ${
              outletFilter === id
                ? "bg-white/15 text-white"
                : "bg-white/[0.04] text-white/45 hover:text-white/70"
            }`}
          >
            {teamOutletLabel(id)}
          </button>
        ))}
      </div>

      {adhocOpen && isAdmin ? (
        <div className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-3.5">
          <div>
            <p className="text-[13px] font-semibold text-amber-50">Add task</p>
            <p className="text-[11px] text-white/45">
              Date stamps as today ({todayYmdLocal()}). Brief optional — pick outlet + designer.
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
          <button
            type="button"
            disabled={!adhoc.title.trim() || busyId === "adhoc"}
            onClick={() => void createAdhoc()}
            className="h-9 rounded-lg bg-amber-400 px-4 text-[12px] font-semibold text-black disabled:opacity-40"
          >
            Save & send to {designerDisplayName(adhoc.assigneeId)}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-[12px] text-amber-200/90">{error}</p> : null}
      {loading ? <p className="text-[13px] text-white/40">Loading queue…</p> : null}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-white/50">
            {queueView === "closed" ? "Done" : "Queue"} ({queue.length})
            {designerTab !== "all" ? ` · ${designerDisplayName(designerTab)}` : ""}
            {outletFilter !== "all" ? ` · ${teamOutletLabel(outletFilter)}` : ""}
            {canDragQueue ? " · drag ≡ to prioritize" : ""}
          </h2>
          {isAdmin && queueView === "open" && sendableJobs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-white/50">
                <input
                  type="checkbox"
                  checked={
                    sendableJobs.length > 0 &&
                    sendableJobs.every((j) => selectedIds.has(j.id))
                  }
                  onChange={toggleSelectAllSendable}
                  className="rounded border-white/30"
                />
                Select all ({sendableJobs.length})
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
          ) : null}
        </div>
        {queue.length === 0 && !loading ? (
          <p className="text-[13px] text-white/35">
            No open jobs for this view — seed 30 days or switch designer / outlet.
          </p>
        ) : null}
        {(() => {
          const renderJob = (
            job: DesignerJobDto,
            dragHandleProps?: Record<string, unknown>
          ) => {
          const { dayName, dateLabel } = formatPostDateParts(job.postDate);
          const designer = designerDisplayName(job.assigneeId);
          const formatLabel = job.format === "story" ? "Story" : "Post";
          const canSend = isAdmin && job.status === "WAITING_BRIEF";
          const selected = selectedIds.has(job.id);
          const brief = jobBriefText(job);
          return (
          <article
            key={job.id}
            className={`rounded-xl border px-3.5 py-3 ${
              job.isOverdue
                ? "border-red-500/55 bg-red-500/[0.12] ring-1 ring-red-400/25"
                : selected
                  ? "border-cyan-400/40 bg-cyan-400/[0.07]"
                  : job.status === "IN_PROGRESS"
                    ? "border-amber-400/35 bg-amber-400/[0.07]"
                    : job.status === "PAUSED"
                      ? "border-violet-400/35 bg-violet-400/[0.07]"
                      : "border-white/[0.08] bg-white/[0.03]"
            }`}
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
                    <span className="font-bold uppercase text-amber-300">Urgent</span>
                  ) : null}
                  {job.isOverdue ? (
                    <span className="font-bold uppercase text-red-300">Overdue</span>
                  ) : null}
                  {job.isDueToday ? (
                    <span className="font-bold uppercase text-cyan-300">Due today</span>
                  ) : null}
                  <span className="text-white/50">
                    Design due {job.dueDate.slice(8)}/{job.dueDate.slice(5, 7)} ·{" "}
                    {(job.dueTime || "20:00").replace(":00", "")}:00
                    {job.lane === "WEEKDAY" ? " (day before)" : " (−4 days)"}
                  </span>
                </div>
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
                    onClick={() => startJob(job)}
                    className="h-11 min-h-[44px] rounded-lg bg-cyan-500 px-3 text-[13px] font-semibold text-black touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                  >
                    Start Job
                  </button>
                ) : null}
                {job.status === "PAUSED" && (isAdmin || job.assigneeId === memberId) ? (
                  <button
                    type="button"
                    disabled={busyId === job.id}
                    onClick={() =>
                      void patchJob(job.id, { action: "resume" }).then((ok) => {
                        if (ok) setError("Started again — upload wait timer restarted.");
                      })
                    }
                    className="h-11 min-h-[44px] rounded-lg bg-cyan-500 px-3 text-[13px] font-semibold text-black touch-manipulation disabled:opacity-40 sm:h-9 sm:min-h-0 sm:text-[12px]"
                  >
                    Start again
                  </button>
                ) : null}
                {/* Started: pause (+ designer upload & close). No force-clear while in progress. */}
                {job.status === "IN_PROGRESS" && job.assigneeId === memberId && !isAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => tryOpenUpload(job, "close")}
                      className="h-11 min-h-[44px] rounded-lg bg-emerald-400 px-3 text-[13px] font-semibold text-black touch-manipulation sm:h-9 sm:min-h-0 sm:text-[12px]"
                    >
                      Upload & close
                    </button>
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
                    <button
                      type="button"
                      onClick={() => tryOpenUpload(job, "attach")}
                      className="h-11 min-h-[44px] rounded-lg bg-emerald-400 px-3 text-[13px] font-semibold text-black touch-manipulation sm:h-9 sm:min-h-0 sm:text-[12px]"
                    >
                      {job.fileUrl ? "Edit upload" : "Upload"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === job.id || !job.fileUrl}
                      title={!job.fileUrl ? "Upload a creative first" : undefined}
                      onClick={() =>
                        void patchJob(job.id, { action: "mark-done" }).then((ok) => {
                          if (ok) setError("Marked done — Amit Ready synced.");
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
                    <button
                      type="button"
                      onClick={() => tryOpenUpload(job, "attach")}
                      className="h-11 min-h-[44px] rounded-lg bg-emerald-400 px-3 text-[13px] font-semibold text-black touch-manipulation sm:h-9 sm:min-h-0 sm:text-[12px]"
                    >
                      {job.fileUrl ? "Edit upload" : "Upload"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === job.id || !job.fileUrl}
                      title={!job.fileUrl ? "Upload a creative first" : undefined}
                      onClick={() =>
                        void patchJob(job.id, { action: "mark-done" }).then((ok) => {
                          if (ok) setError("Marked done — Amit Ready synced.");
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
                          if (ok) setError("Marked done — Amit Ready synced.");
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
                              setError("Upload deleted — Ready cleared from Amit Daily.");
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

            {isAdmin && queueView === "open" && job.status !== "DESIGN_DONE" ? (
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
                    className="h-7 rounded bg-emerald-400 px-3 text-[11px] font-semibold text-black disabled:opacity-40"
                  >
                    {job.status === "DESIGN_DONE"
                      ? "Save new upload"
                      : uploadMode === "attach"
                        ? "Save upload"
                        : "Upload & close job"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadJobId(null)}
                    className="h-7 px-2 text-[11px] text-white/45"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </article>
          );
          };

          if (!canDragQueue) {
            return queue.map((job) => renderJob(job));
          }

          return (
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={onQueueDragEnd}
            >
              <SortableContext
                items={queue.map((j) => j.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {queue.map((job) => (
                    <SortableDesignerJob key={job.id} id={job.id}>
                      {(dragHandleProps) => renderJob(job, dragHandleProps)}
                    </SortableDesignerJob>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          );
        })()}
      </section>
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

function Metric({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p
        className={`mt-0.5 text-[16px] font-semibold ${
          ok === false ? "text-amber-300" : ok ? "text-emerald-300" : "text-white/85"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DesignerPerformanceCard({
  perf,
  isAdmin,
  nudgeBusy,
  onNudge,
}: {
  perf: DesignerPerformanceDto;
  isAdmin: boolean;
  nudgeBusy: boolean;
  onNudge: () => void;
}) {
  const flag = perf.redFlag || perf.underTarget;
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        perf.redFlag
          ? "border-red-500/50 bg-red-500/[0.12]"
          : perf.underTarget
            ? "border-amber-400/35 bg-amber-400/[0.07]"
            : "border-emerald-400/25 bg-emerald-400/[0.06]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
            {perf.name} · today
          </p>
          <p
            className={`mt-0.5 text-[22px] font-semibold tabular-nums ${
              flag ? "text-red-200" : "text-emerald-200"
            }`}
          >
            {perf.closedToday}/{perf.dailyTarget}
            <span className="ml-2 text-[12px] font-medium text-white/45">closed</span>
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            disabled={nudgeBusy}
            onClick={onNudge}
            className="h-8 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-2.5 text-[11px] font-semibold text-cyan-100 disabled:opacity-40"
          >
            {nudgeBusy ? "Sending…" : "Send WA nudge"}
          </button>
        ) : null}
      </div>
      {perf.redFlag ? (
        <p className="mt-1.5 text-[12px] font-semibold text-red-200">
          Red flag — daily target is {perf.dailyTarget}. Queue isn’t closed for the week.
        </p>
      ) : perf.underTarget ? (
        <p className="mt-1.5 text-[12px] text-amber-100/90">
          Still need {perf.dailyTarget - perf.closedToday} more today. Ready briefs can land any
          day.
        </p>
      ) : (
        <p className="mt-1.5 text-[12px] text-emerald-100/85">
          Hit today’s target — stay available if new Ready work lands.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/55">
        <span>Ready to start {perf.readyToStart}</span>
        <span>In progress {perf.inProgress}</span>
        {perf.overdueReady > 0 ? (
          <span className="font-semibold text-red-300">Overdue ready {perf.overdueReady}</span>
        ) : null}
        <span>Started {formatIstClock(perf.firstStartedAt)}</span>
        <span>Last end {formatIstClock(perf.lastEndedAt)}</span>
        <span>Week {perf.closedThisWeek}</span>
      </div>
    </div>
  );
}

function DesignerPerformanceGraph({ designers }: { designers: DesignerPerformanceDto[] }) {
  const series = designers[0]?.series ?? [];
  if (series.length === 0) return null;
  const maxY = Math.max(
    DESIGNER_DAILY_TARGET,
    ...designers.flatMap((d) => d.series.map((p) => p.closed)),
    1
  );
  const w = 320;
  const h = 88;
  const pad = 8;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
        Last 14 days · closed vs {DESIGNER_DAILY_TARGET}/day
      </p>
      <div className="mt-2 overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full min-w-[280px]" role="img">
          {/* target line */}
          {(() => {
            const y =
              pad + (1 - DESIGNER_DAILY_TARGET / maxY) * (h - pad * 2);
            return (
              <line
                x1={pad}
                x2={w - pad}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 3"
              />
            );
          })()}
          {designers.map((d, di) => {
            const color = di === 0 ? "#22d3ee" : "#a78bfa";
            const pts = d.series
              .map((p, i) => {
                const x = pad + (i / Math.max(1, d.series.length - 1)) * (w - pad * 2);
                const y = pad + (1 - p.closed / maxY) * (h - pad * 2);
                return `${x},${y}`;
              })
              .join(" ");
            return (
              <g key={d.assigneeId}>
                <polyline
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  points={pts}
                />
                {d.series.map((p, i) => {
                  const x = pad + (i / Math.max(1, d.series.length - 1)) * (w - pad * 2);
                  const y = pad + (1 - p.closed / maxY) * (h - pad * 2);
                  const miss = p.closed < p.target;
                  return (
                    <circle
                      key={`${d.assigneeId}-${p.date}`}
                      cx={x}
                      cy={y}
                      r={miss ? 3.2 : 2.4}
                      fill={miss ? "#f87171" : color}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-white/45">
        {designers.map((d, di) => (
          <span key={d.assigneeId} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: di === 0 ? "#22d3ee" : "#a78bfa" }}
            />
            {d.name}
          </span>
        ))}
        <span className="text-white/30">Red dots = under target</span>
      </div>
    </div>
  );
}
