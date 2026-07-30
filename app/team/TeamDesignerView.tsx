"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DESIGNER_DAILY_TARGET,
  DESIGNER_MONTH_OUTLET_IDS,
  DESIGNER_WINDOW_DAYS,
  type DesignerJobDto,
  type DesignerMetricsDto,
} from "@/lib/team-designer-jobs-shared";
import { teamDownloadHref } from "@/lib/team-download";
import { teamOutletLabel } from "@/lib/team-outlets";

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
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
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
  const loadGen = useRef(0);
  const queueViewRef = useRef(queueView);
  queueViewRef.current = queueView;

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
    } catch (err) {
      if (gen !== loadGen.current) return;
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (gen === loadGen.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load({ view: queueView });
  }, [load, queueView]);

  const jobs = useMemo(() => {
    let list = allJobs;
    if (isAdmin && designerTab !== "all") {
      list = list.filter((j) => j.assigneeId === designerTab);
    }
    if (outletFilter !== "all") {
      list = list.filter((j) => j.outletId === outletFilter);
    }
    return list;
  }, [allJobs, designerTab, isAdmin, outletFilter]);

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

  const sendToDesigner = async (job: DesignerJobDto) => {
    const ok = await patchJob(job.id, {
      action: "brief-ready",
      description: briefDrafts[job.id] ?? job.description ?? "",
      links:
        linkDrafts[job.id] ?? (job.links?.length ? job.links.join("\n") : ""),
    });
    if (ok) setBriefJobId((cur) => (cur === job.id ? null : cur));
    return ok;
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
        const ok = await patchJob(
          id,
          {
            action: "brief-ready",
            description: briefDrafts[id] ?? job.description ?? "",
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
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("kind", "handoff");
      const job = jobs.find((j) => j.id === uploadJobId);
      if (job?.outletId) fd.set("outletId", job.outletId);
      const res = await fetch("/api/team/upload", { method: "POST", body: fd });
      const data = await readJson(res);
      if (typeof data.url === "string") {
        setUploadForm((f) => ({ ...f, fileUrl: data.url as string }));
      }
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
          label="Ready for designer"
          value={String(metrics.readyBriefs)}
          ok={metrics.queueHealthOk}
        />
        <Metric label="In progress" value={String(metrics.inProgress)} />
      </div>

      <p className="text-[11px] leading-relaxed text-white/40">
        {queueView === "closed"
          ? `Done jobs · Designer can Edit upload · Admin can Delete upload / Force clear · Files auto-expire after ${HANDOFF_TTL_DAYS} days`
          : "Send puts the job on the designer queue (brief optional) · Mahesh = weekend · Jeslyn = Mon–Thu · Last WA 19:00 · Upload by 20:00 · One job at a time"}
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
        {queue.map((job) => {
          const { dayName, dateLabel } = formatPostDateParts(job.postDate);
          const designer = designerDisplayName(job.assigneeId);
          const formatLabel = job.format === "story" ? "Story" : "Post";
          const canSend = isAdmin && job.status === "WAITING_BRIEF";
          const selected = selectedIds.has(job.id);
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
                </div>
                {job.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-[14px] leading-snug text-white/75">
                    {job.description}
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
                      disabled={busyId === job.id}
                      onClick={() =>
                        void patchJob(job.id, { action: "mark-done" }).then((ok) => {
                          if (ok) setError("Marked done (upload optional).");
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
                      disabled={busyId === job.id}
                      onClick={() =>
                        void patchJob(job.id, { action: "mark-done" }).then((ok) => {
                          if (ok) setError("Marked done (upload optional).");
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
                      disabled={busyId === job.id}
                      onClick={() =>
                        void patchJob(job.id, { action: "mark-done" }).then((ok) => {
                          if (ok) setError("Marked done.");
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
                      value={briefDrafts[job.id] ?? job.description ?? ""}
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
                            description: briefDrafts[job.id] ?? job.description ?? "",
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
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBriefJobId(job.id)}
                      className="h-9 rounded-lg border border-white/15 px-3 text-[12px] font-medium text-white/65 hover:text-white/85"
                    >
                      {job.description ? "Edit brief" : "Add brief"}
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
        })}
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
