"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CHECKLIST_PLATFORM_IDS,
  CHECKLIST_PLATFORM_LABELS,
  defaultHandoffFormat,
  getTodayKey,
  HANDOFF_FORMATS,
  handoffCreativeUrls,
  type ChecklistBoardDto,
  type ChecklistPlatformId,
  type HandoffFormat,
  type HandoffStatus,
  type OutletBoardSection,
  type TeamChecklistItemDto,
} from "@/lib/team-checklists";
import { CHECKLIST_DEFAULT_OWNER_ID } from "@/lib/team-checklist-templates";
import { uploadTeamFile } from "@/lib/team-client-upload";
import { teamDownloadHref } from "@/lib/team-download";
import { TEAM_AD_OUTLETS, outletKindTitle, teamOutletLabel } from "@/lib/team-outlets";
import { openWhatsAppShareUrl } from "@/lib/open-whatsapp";
import { whatsAppShareUrl } from "@/lib/team-whatsapp-report";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";
import {
  IconAds,
  IconGoogle,
  IconLinkedin,
  IconMeta,
  IconNotes,
  IconPostings,
  IconTasks,
  IconWhatsApp,
  IconX,
  IconYoutube,
} from "./TeamIcons";

type TeamApiJson = Record<string, unknown>;

const DESC_PREVIEW_LEN = 96;

const PLATFORM_ICON_COLOR: Record<ChecklistPlatformId, string> = {
  meta: "text-[#4d9fff]",
  youtube: "text-[#ff5c5c]",
  google: "text-[#7ec8ff]",
  linkedin: "text-[#5b9fff]",
  x: "text-white",
};

function PlatformIcon({ platform, className = "h-3.5 w-3.5" }: { platform: ChecklistPlatformId; className?: string }) {
  switch (platform) {
    case "meta":
      return <IconMeta className={className} />;
    case "youtube":
      return <IconYoutube className={className} />;
    case "google":
      return <IconGoogle className={className} />;
    case "linkedin":
      return <IconLinkedin className={className} />;
    case "x":
      return <IconX className={className} />;
    default:
      return null;
  }
}

function PlatformToggles({
  selected,
  busy,
  onToggle,
}: {
  selected: ChecklistPlatformId[];
  busy: boolean;
  onToggle: (platform: ChecklistPlatformId) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {CHECKLIST_PLATFORM_IDS.map((platform) => {
        const on = selected.includes(platform);
        return (
          <button
            key={platform}
            type="button"
            disabled={busy}
            title={CHECKLIST_PLATFORM_LABELS[platform]}
            aria-label={CHECKLIST_PLATFORM_LABELS[platform]}
            aria-pressed={on}
            onClick={() => onToggle(platform)}
            className={`flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-50 ${
              on
                ? "border-cyan-300/55 bg-cyan-400/25 ring-1 ring-cyan-300/30"
                : "border-white/15 bg-white/[0.04] hover:border-white/25"
            } ${PLATFORM_ICON_COLOR[platform]}`}
          >
            <PlatformIcon platform={platform} />
          </button>
        );
      })}
    </div>
  );
}

function ExpandableText({
  text,
  empty = "No description yet.",
  className = "text-[12px] leading-snug text-white/50",
}: {
  text: string;
  empty?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) {
    return <p className={className}>{empty}</p>;
  }
  const needsMore = trimmed.length > DESC_PREVIEW_LEN;
  const shown = !needsMore || expanded ? trimmed : `${trimmed.slice(0, DESC_PREVIEW_LEN).trimEnd()}…`;
  return (
    <div>
      <p className={`whitespace-pre-wrap ${className}`}>{shown}</p>
      {needsMore ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-[11px] font-medium text-cyan-300/90 hover:text-cyan-200"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

/** Non-empty lines = “things to remember”. */
function countNoteLines(text: string | null | undefined): number {
  if (!text?.trim()) return 0;
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean).length;
}

function countPendingAds(outlets: OutletBoardSection[], focusDate: string): number {
  let n = 0;
  for (const section of outlets) {
    n += (section.ads ?? []).filter((a) => !isItemDone(a, a.targetDate ?? focusDate)).length;
  }
  return n;
}

async function readTeamApiJson(res: Response): Promise<TeamApiJson> {
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return {};
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(res.ok ? "Invalid server response" : `Server error (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data;
}

type Member = { id: string; name: string };

type TeamTasksViewProps = {
  isAdmin: boolean;
  /** Designer can upload finals after admin approve. */
  canUploadHandoff?: boolean;
  viewerId: string;
  members: Member[];
};

type HandoffPayload = {
  action: "approve" | "unapprove" | "set-ready" | "clear";
  format?: HandoffFormat;
  fileUrl?: string;
  postingNotes?: string;
  scheduleNote?: string;
};

function isItemDone(item: TeamChecklistItemDto, dateKey: string): boolean {
  if (item.kind === "posts" && item.dayOfWeek) {
    return Boolean(item.completionsByDate[item.targetDate ?? dateKey]);
  }
  if (item.kind === "posts") return Object.keys(item.completionsByDate).length > 0;
  return Boolean(item.completionsByDate[dateKey]);
}

/** Ready for Amit = marked ready after upload with a downloadable file. */
function isDownloadReady(item: TeamChecklistItemDto): boolean {
  const status = item.handoff?.status ?? (item.creativeReady ? "ready" : "wait");
  const fileUrl = item.handoff?.fileUrl?.trim();
  return status === "ready" && Boolean(fileUrl);
}

function collectBoardPendingItems(
  board: ChecklistBoardDto,
  opts: {
    kinds: Array<NonNullable<TeamChecklistItemDto["kind"]>>;
    /** "ready" = downloadable for Amit; "wait" = still need upload; "any" = both */
    readiness: "ready" | "wait" | "any";
  }
): TeamChecklistItemDto[] {
  const focus = board.day.focusDate;
  const kindSet = new Set(opts.kinds);
  const out: TeamChecklistItemDto[] = [];
  const seen = new Set<string>();
  const push = (item: TeamChecklistItemDto) => {
    if (!item.kind || !kindSet.has(item.kind)) return;
    const dateKey = item.targetDate ?? focus;
    if (isItemDone(item, dateKey)) return;
    const downloadReady = isDownloadReady(item);
    if (opts.readiness === "ready" && !downloadReady) return;
    if (opts.readiness === "wait" && downloadReady) return;
    const key = `${item.id}:${dateKey}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };
  for (const section of board.outlets) {
    section.stories.forEach(push);
    section.openPosts.forEach(push);
    (section.ads ?? []).forEach(push);
  }
  (board.generalPosts ?? []).forEach(push);
  return out;
}

/** Amit Ready tab + WA: stories/posts with uploaded file only — never ads. */
function collectReadyItems(board: ChecklistBoardDto): TeamChecklistItemDto[] {
  return collectBoardPendingItems(board, {
    kinds: ["stories", "posts"],
    readiness: "ready",
  });
}

/** Waiting tab: stories/posts still needing designer upload — never ads. */
function collectWaitItems(board: ChecklistBoardDto): TeamChecklistItemDto[] {
  return collectBoardPendingItems(board, {
    kinds: ["stories", "posts"],
    readiness: "wait",
  });
}

function teamChecklistLink(): string {
  const base =
    (typeof window !== "undefined" ? window.location.origin : "") ||
    "https://bassik.in";
  return `${base.replace(/\/$/, "")}/team?tab=tasks`;
}

function formatIstWaStamp(d = new Date()): string {
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

function itemDateKey(item: TeamChecklistItemDto, focusDate: string): string {
  return item.targetDate ?? focusDate;
}

/** Ready WA: today’s Ready items only (no cryptic outlet codes). */
function collectTodayReadyItems(
  board: ChecklistBoardDto,
  todayYmd: string
): TeamChecklistItemDto[] {
  const focus = board.day.focusDate;
  return collectReadyItems(board).filter((i) => itemDateKey(i, focus) === todayYmd);
}

/** Generic Amit ping — check today’s Daily Checklist on the site. */
function buildAllReadyWhatsAppMessage(todayCount: number): string {
  const stamp = formatIstWaStamp();
  const countBit =
    todayCount > 1
      ? `Today’s tasks are ready (${todayCount}) on the Daily Checklist.`
      : "Today’s tasks are ready on the Daily Checklist.";
  return [
    "Hey Amit —",
    "",
    `New update as of ${stamp}.`,
    "",
    `${countBit} Please check today’s list on the website and complete them. Thank you.`,
    "",
    teamChecklistLink(),
  ].join("\n");
}

function buildWaitNudgeWhatsAppMessage(waitCount: number): string {
  const stamp = formatIstWaStamp();
  return [
    "Hey —",
    "",
    `Update as of ${stamp}.`,
    "",
    waitCount > 1
      ? `${waitCount} items still need Ready upload. Please check today’s Wait list on the website.`
      : "An item still needs Ready upload. Please check today’s Wait list on the website.",
    "",
    teamChecklistLink(),
  ].join("\n");
}

function handoffStatusOf(item: TeamChecklistItemDto): HandoffStatus {
  if (isDownloadReady(item)) return "ready";
  if (item.handoff?.status === "approved") return "approved";
  return "wait";
}

/** Display-only: green when file uploaded. No wait/ready toggle. */
function HandoffStatusToggle({
  status,
}: {
  status: HandoffStatus;
  canToggle?: boolean;
  busy?: boolean;
  onToggle?: () => void;
}) {
  const ready = status === "ready";
  const label = ready ? "Ready" : "Waiting upload";

  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex h-7 shrink-0 items-center rounded-md px-2 text-[10px] font-bold uppercase tracking-wide ${
        ready
          ? "bg-emerald-400/20 text-emerald-200"
          : "bg-white/[0.06] text-white/40"
      }`}
    >
      {ready ? "Ready" : "Wait"}
    </span>
  );
}

const DOWNLOAD_UNLOCK_MS = 60_000;

function downloadKey(itemId: string, dateKey: string): string {
  return `team-dl:${itemId}:${dateKey}`;
}

function clearDownloadAt(itemId: string, dateKey: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(downloadKey(itemId, dateKey));
}

function readDownloadAt(itemId: string, dateKey: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(downloadKey(itemId, dateKey));
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function openChecklistDownloads(urls: string[], filenameBase: string): void {
  urls.forEach((url, i) => {
    const name = urls.length > 1 ? `${filenameBase}-${i + 1}` : filenameBase;
    const a = document.createElement("a");
    a.href = teamDownloadHref(url, name);
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}

function markDownloaded(itemId: string, dateKey: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(downloadKey(itemId, dateKey), String(Date.now()));
}

function HandoffDetails({
  item,
  dateKey,
  onDownloaded,
  onRequestDownload,
}: {
  item: TeamChecklistItemDto;
  dateKey?: string;
  onDownloaded?: () => void;
  onRequestDownload?: (item: TeamChecklistItemDto, dateKey: string) => void;
}) {
  const h = item.handoff;
  const urls = handoffCreativeUrls(h);
  if (!h || h.status !== "ready" || urls.length === 0) return null;
  const dk = dateKey ?? item.targetDate ?? "";
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/55">
      {h.scheduleNote ? <span>Schedule: {h.scheduleNote}</span> : null}
      {h.postingNotes ? <span className="w-full text-white/45">{h.postingNotes}</span> : null}
      <button
        type="button"
        onClick={() => {
          if (onRequestDownload) {
            onRequestDownload(item, dk);
            return;
          }
          if (dk) markDownloaded(item.id, dk);
          openChecklistDownloads(
            urls,
            `${item.outletId ?? "file"}-${dk || "creative"}`
          );
          onDownloaded?.();
        }}
        className="rounded-md bg-cyan-500 px-2.5 py-1 text-[12px] font-bold text-black"
      >
        {urls.length > 1 ? `Download · ${urls.length} files` : "Download"}
      </button>
    </div>
  );
}

function HandoffUploadForm({
  item,
  busy,
  onSubmit,
}: {
  item: TeamChecklistItemDto;
  busy: boolean;
  onSubmit: (payload: {
    format: HandoffFormat;
    fileUrl: string;
    postingNotes: string;
    scheduleNote: string;
  }) => Promise<void>;
}) {
  const [format, setFormat] = useState<HandoffFormat>(
    () => item.handoff?.format ?? defaultHandoffFormat(item.kind)
  );
  const [postingNotes, setPostingNotes] = useState(item.handoff?.postingNotes ?? "");
  const [scheduleNote, setScheduleNote] = useState(item.handoff?.scheduleNote ?? "");
  const [fileUrl, setFileUrl] = useState(item.handoff?.fileUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setFormat(item.handoff?.format ?? defaultHandoffFormat(item.kind));
    setPostingNotes(item.handoff?.postingNotes ?? "");
    setScheduleNote(item.handoff?.scheduleNote ?? "");
    setFileUrl(item.handoff?.fileUrl ?? "");
    setLocalError(null);
  }, [item.id, item.targetDate, item.handoff?.format, item.handoff?.fileUrl, item.handoff?.postingNotes, item.handoff?.scheduleNote, item.kind]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setLocalError(null);
    try {
      const url = await uploadTeamFile(file, {
        kind: "handoff",
        outletId: item.outletId ?? undefined,
      });
      setFileUrl(url);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] p-2.5">
      <p className="text-[11px] font-medium text-cyan-100/90">
        After WhatsApp OK — upload final + posting details for Amit
      </p>
      <div className="flex flex-wrap gap-1">
        {HANDOFF_FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            disabled={busy || uploading}
            onClick={() => setFormat(f)}
            className={`h-6 rounded px-2 text-[10px] font-semibold uppercase ${
              format === f ? "bg-cyan-500 text-black" : "bg-black/30 text-white/55"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <input
        type="file"
        accept="image/*,video/*,.pdf"
        disabled={busy || uploading}
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        className="block w-full text-[11px] text-white/60 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[11px] file:text-white"
      />
      {fileUrl ? (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[11px] text-cyan-300/90"
        >
          File ready · {fileUrl}
        </a>
      ) : null}
      <input
        value={scheduleNote}
        onChange={(e) => setScheduleNote(e.target.value)}
        placeholder="When to post (e.g. today 7pm)"
        className="w-full rounded-md border border-white/10 bg-black/35 px-2 py-1.5 text-[12px] text-white outline-none"
      />
      <textarea
        value={postingNotes}
        onChange={(e) => setPostingNotes(e.target.value)}
        rows={2}
        placeholder="Caption / hashtags / posting notes for Amit"
        className="w-full resize-none rounded-md border border-white/10 bg-black/35 px-2 py-1.5 text-[12px] text-white outline-none"
      />
      {localError ? <p className="text-[11px] text-red-300">{localError}</p> : null}
      <button
        type="button"
        disabled={busy || uploading || !fileUrl}
        onClick={() =>
          void onSubmit({
            format,
            fileUrl,
            postingNotes,
            scheduleNote,
          })
        }
        className="h-7 rounded bg-emerald-400 px-3 text-[11px] font-semibold text-black disabled:opacity-40"
      >
        {uploading ? "Uploading…" : busy ? "…" : "Send to Amit"}
      </button>
    </div>
  );
}

function KindBadge({ kind }: { kind?: string | null }) {
  const label =
    kind === "stories" ? "Story" : kind === "ads" ? "Ad" : kind === "posts" ? "Post" : "Task";
  const cls =
    kind === "stories"
      ? "bg-violet-400/15 text-violet-200"
      : kind === "ads"
        ? "bg-amber-400/15 text-amber-100"
        : "bg-sky-400/15 text-sky-100";
  return (
    <span
      className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

/** Prefer kind + outlet id so posts always show "C53 Post", not bare "C53". */
function outletKindChipLabel(item: TeamChecklistItemDto): string {
  const kind =
    item.kind ||
    (/story/i.test(item.title) ? "stories" : /ad\b/i.test(item.title) ? "ads" : "posts");
  return (
    outletKindTitle(item.outletId || item.outletTitle, kind) ||
    outletKindTitle(item.outletTitle, kind)
  );
}

/** e.g. date / weekday / kind / outlet for Ready + Done rows */
function readyGoLiveParts(item: TeamChecklistItemDto, dateKey: string) {
  const ymd = item.targetDate ?? dateKey;
  const [y, m, d] = ymd.split("-").map(Number);
  const outlet = outletKindChipLabel(item);
  if (!y || !m || !d) {
    return { datePart: item.title, weekday: "", kind: "", outlet };
  }
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const datePart = dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const weekday = dt.toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  });
  const kind =
    item.kind === "stories" ? "Story" : item.kind === "ads" ? "Ad" : "Post";
  return { datePart, weekday, kind, outlet };
}

function ReadyHeadline({
  item,
  dateKey,
}: {
  item: TeamChecklistItemDto;
  dateKey: string;
}) {
  const { datePart, weekday, kind, outlet } = readyGoLiveParts(item, dateKey);
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] font-semibold leading-tight">
      <span className="text-white">{datePart}</span>
      {weekday ? (
        <>
          <span className="text-white/35">·</span>
          <span className="text-white">{weekday}</span>
        </>
      ) : null}
      {kind ? (
        <>
          <span className="text-white/35">·</span>
          <span className="text-white">{kind}</span>
        </>
      ) : null}
      {outlet ? (
        <>
          <span className="text-white/35">·</span>
          <span className="rounded-md bg-cyan-400/20 px-1.5 py-0.5 text-[13px] font-bold text-cyan-100 ring-1 ring-cyan-400/30">
            {outlet}
          </span>
        </>
      ) : null}
    </span>
  );
}

function itemOutletKey(item: TeamChecklistItemDto): string {
  return item.outletId?.trim() || "__general__";
}

function outletFilterLabel(key: string): string {
  if (key === "__general__") return "General";
  return teamOutletLabel(key);
}

function ItemRow({
  item,
  dateKey,
  busy,
  isAdmin,
  canUploadHandoff,
  requireDownloadGate = false,
  onComplete,
  onCloseSkip,
  onUnready,
  onHandoffUpload,
  onRequestDownload,
}: {
  item: TeamChecklistItemDto;
  dateKey: string;
  busy: boolean;
  isAdmin: boolean;
  canUploadHandoff: boolean;
  /** Ready tab: download + 1 min before Done (everyone, including admin). */
  requireDownloadGate?: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onCloseSkip?: (item: TeamChecklistItemDto) => void;
  onUnready?: (item: TeamChecklistItemDto) => void;
  onHandoffUpload: (
    item: TeamChecklistItemDto,
    payload: {
      format: HandoffFormat;
      fileUrl: string;
      postingNotes: string;
      scheduleNote: string;
    }
  ) => Promise<void>;
  onRequestDownload: (item: TeamChecklistItemDto, dateKey: string) => void;
}) {
  const [draftPlatforms, setDraftPlatforms] = useState<ChecklistPlatformId[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [, setTick] = useState(0);
  const status = handoffStatusOf(item);
  const ready = status === "ready";
  const dlAt = readDownloadAt(item.id, dateKey);
  const remainingSec =
    ready && dlAt
      ? Math.max(0, Math.ceil((dlAt + DOWNLOAD_UNLOCK_MS - Date.now()) / 1000))
      : null;
  const gateBlocks =
    ready && (!dlAt || (remainingSec != null && remainingSec > 0));
  const canMarkDone = ready && !gateBlocks;

  useEffect(() => {
    setDraftPlatforms([]);
    setShowUpload(false);
  }, [item.id, dateKey]);

  useEffect(() => {
    if (!ready || !dlAt || (remainingSec ?? 0) <= 0) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [ready, dlAt, remainingSec]);

  const toggleDraft = (platform: ChecklistPlatformId) => {
    setDraftPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const markDone = () => {
    const platforms =
      draftPlatforms.length > 0 ? draftPlatforms : [...CHECKLIST_PLATFORM_IDS];
    onComplete(item, platforms);
  };

  const fileUrls = handoffCreativeUrls(item.handoff);
  const outletChip = outletKindChipLabel(item);

  return (
    <div className="py-1.5">
      <div className="flex min-h-9 items-start gap-2">
        {!requireDownloadGate ? (
          <HandoffStatusToggle status={status === "approved" ? "wait" : status} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <KindBadge kind={item.kind} />
            {requireDownloadGate ? (
              <ReadyHeadline item={item} dateKey={dateKey} />
            ) : (
              <span className="text-[15px] font-semibold leading-tight text-white">
                {item.title}
              </span>
            )}
            {item.isOverdue ? (
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400 ring-1 ring-red-400/40">
                Overdue
              </span>
            ) : null}
          </div>
          {!requireDownloadGate && outletChip ? (
            <p className="mt-0.5">
              <span className="inline-flex rounded-md bg-cyan-400/15 px-1.5 py-0.5 text-[12px] font-bold text-cyan-100 ring-1 ring-cyan-400/25">
                {outletChip}
              </span>
            </p>
          ) : null}
          {item.dueLabel ? (
            <p className="mt-1 text-[12px] font-semibold leading-snug text-amber-100/90">
              {item.dueLabel}
            </p>
          ) : null}
          {item.kind === "stories" && ready ? (
            <p className="mt-0.5 text-[10px] text-cyan-200/55">
              Post ~10 PM (before 11 PM). Avoid before 8 PM — story only lasts 24h.
            </p>
          ) : null}
          {!requireDownloadGate ? (
            <HandoffDetails
              item={item}
              dateKey={dateKey}
              onDownloaded={() => setTick((n) => n + 1)}
              onRequestDownload={onRequestDownload}
            />
          ) : null}
          {ready && !dlAt ? (
            <p className="mt-1 text-[10px] text-white/40">
              Download first — then Done unlocks in 1 min. No Done without download.
            </p>
          ) : null}
          {remainingSec != null && remainingSec > 0 ? (
            <p className="mt-1 text-[10px] text-amber-200/70">
              Done unlocks in {remainingSec}s…
            </p>
          ) : null}
          {!ready ? (
            <p className="mt-1 text-[10px] text-white/35">
              Waiting on upload — not sent to Amit until a file is Ready.
              {isAdmin ? " Admin can Close to skip, or Unready if wrongly marked." : ""}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          {ready && fileUrls.length > 0 ? (
            <button
              type="button"
              onClick={() => onRequestDownload(item, dateKey)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-cyan-400 px-3 text-[12px] font-bold text-black"
            >
              {fileUrls.length > 1
                ? `Download · ${fileUrls.length} files`
                : "Download"}
            </button>
          ) : null}
          {canUploadHandoff && !ready ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowUpload((v) => !v)}
              className="h-7 rounded bg-white/10 px-2 text-[10px] font-semibold text-white/80"
            >
              {showUpload ? "Hide" : "Upload"}
            </button>
          ) : null}
          {!requireDownloadGate && ready ? (
            <PlatformToggles
              selected={draftPlatforms}
              busy={busy}
              onToggle={toggleDraft}
            />
          ) : null}
          <button
            type="button"
            disabled={busy || !canMarkDone}
            onClick={markDone}
            className="h-9 rounded-lg bg-emerald-400 px-3 text-[12px] font-bold text-black disabled:opacity-30"
          >
            {busy ? "…" : "Done"}
          </button>
          {isAdmin && ready && onUnready ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUnready(item)}
              className="h-8 rounded-lg border border-amber-300/40 bg-amber-400/10 px-2 text-[11px] font-semibold text-amber-100 disabled:opacity-40"
            >
              Unready
            </button>
          ) : null}
          {isAdmin && onCloseSkip ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCloseSkip(item)}
              title="Skip posting — close without download"
              className="h-8 rounded-lg border border-white/15 px-2 text-[11px] font-semibold text-white/55 disabled:opacity-40"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>
      {canUploadHandoff && !ready && showUpload ? (
        <HandoffUploadForm
          item={item}
          busy={busy}
          onSubmit={(payload) => onHandoffUpload(item, payload)}
        />
      ) : null}
    </div>
  );
}

function AdItemRow({
  item,
  dateKey,
  busy,
  isAdmin,
  canUploadHandoff,
  onComplete,
  onCloseSkip,
  onUnready,
  onSaveDescription,
  onHandoffUpload,
  onRequestDownload,
}: {
  item: TeamChecklistItemDto;
  dateKey: string;
  busy: boolean;
  isAdmin: boolean;
  canUploadHandoff: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onCloseSkip?: (item: TeamChecklistItemDto) => void;
  onUnready?: (item: TeamChecklistItemDto) => void;
  onSaveDescription: (item: TeamChecklistItemDto, description: string) => Promise<void>;
  onHandoffUpload: (
    item: TeamChecklistItemDto,
    payload: {
      format: HandoffFormat;
      fileUrl: string;
      postingNotes: string;
      scheduleNote: string;
    }
  ) => Promise<void>;
  onRequestDownload: (item: TeamChecklistItemDto, dateKey: string) => void;
}) {
  const done = isItemDone(item, dateKey);
  const status = handoffStatusOf(item);
  const ready = status === "ready";
  const fileUrls = handoffCreativeUrls(item.handoff);
  const [draftPlatforms, setDraftPlatforms] = useState<ChecklistPlatformId[]>([]);
  const [editing, setEditing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [desc, setDesc] = useState(item.description ?? "");
  const [savingDesc, setSavingDesc] = useState(false);
  const [, setTick] = useState(0);
  const dlAt = readDownloadAt(item.id, dateKey);
  const remainingSec =
    ready && dlAt
      ? Math.max(0, Math.ceil((dlAt + DOWNLOAD_UNLOCK_MS - Date.now()) / 1000))
      : null;
  const gateBlocks = ready && (!dlAt || (remainingSec != null && remainingSec > 0));
  const canMarkDone = ready && !gateBlocks && draftPlatforms.length > 0;

  useEffect(() => {
    setDraftPlatforms([]);
    setDesc(item.description ?? "");
    setEditing(false);
    setShowUpload(false);
  }, [item.id, dateKey, item.description]);

  useEffect(() => {
    if (!ready || !dlAt || (remainingSec ?? 0) <= 0) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [ready, dlAt, remainingSec]);

  if (done) {
    return (
      <div className="flex h-8 items-center justify-between opacity-40">
        <span className="truncate text-[12px] text-white/70">{item.title}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-300/70">Done</span>
      </div>
    );
  }

  const toggleDraft = (platform: ChecklistPlatformId) => {
    setDraftPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const saveDesc = async () => {
    setSavingDesc(true);
    try {
      await onSaveDescription(item, desc);
      setEditing(false);
    } finally {
      setSavingDesc(false);
    }
  };

  return (
    <div className="border-b border-white/[0.04] py-2 last:border-0">
      <div className="flex items-start gap-2">
        <HandoffStatusToggle status={status === "approved" ? "wait" : status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13px] font-medium text-white/90">{item.title}</span>
            {outletKindChipLabel(item) ? (
              <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 text-[11px] font-bold text-cyan-100">
                {outletKindChipLabel(item)}
              </span>
            ) : null}
            {item.dueLabel ? (
              <span className="text-[11px] font-semibold text-amber-100/80">{item.dueLabel}</span>
            ) : null}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[10px] font-medium text-cyan-300/80"
              >
                Edit
              </button>
            ) : null}
          </div>
          {editing ? (
            <div className="mt-1.5 space-y-1.5">
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-md border border-white/10 bg-black/40 px-2.5 py-2 text-[12px] text-white outline-none"
                placeholder="Ad brief — repeats every week until you change it"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={savingDesc}
                  onClick={() => void saveDesc()}
                  className="h-6 rounded bg-cyan-500 px-2 text-[10px] font-semibold text-black disabled:opacity-40"
                >
                  {savingDesc ? "…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDesc(item.description ?? "");
                    setEditing(false);
                  }}
                  className="h-6 rounded px-2 text-[10px] text-white/45"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <ExpandableText text={item.description ?? ""} empty="No brief yet." />
            </div>
          )}
          <HandoffDetails
            item={item}
            dateKey={dateKey}
            onDownloaded={() => setTick((n) => n + 1)}
            onRequestDownload={onRequestDownload}
          />
          {ready && !dlAt ? (
            <p className="mt-1 text-[10px] text-white/40">Download first — then Done unlocks in 1 min.</p>
          ) : null}
          {remainingSec != null && remainingSec > 0 ? (
            <p className="mt-1 text-[10px] text-amber-200/70">Done unlocks in {remainingSec}s…</p>
          ) : null}
          {canUploadHandoff && !ready && showUpload ? (
            <HandoffUploadForm
              item={item}
              busy={busy}
              onSubmit={(payload) => onHandoffUpload(item, payload)}
            />
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1 pt-0.5">
          {ready && fileUrls.length > 0 ? (
            <button
              type="button"
              onClick={() => onRequestDownload(item, dateKey)}
              className="inline-flex h-8 items-center justify-center rounded-lg bg-cyan-400 px-2 text-[11px] font-bold text-black"
            >
              {fileUrls.length > 1
                ? `Download · ${fileUrls.length} files`
                : "Download"}
            </button>
          ) : null}
          {canUploadHandoff && !ready ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowUpload((v) => !v)}
              className="h-7 rounded bg-white/10 px-2 text-[10px] font-semibold text-white/80"
            >
              {showUpload ? "Hide" : "Upload"}
            </button>
          ) : null}
          {ready ? (
            <PlatformToggles
              selected={draftPlatforms}
              busy={busy}
              onToggle={toggleDraft}
            />
          ) : null}
          <button
            type="button"
            disabled={busy || !canMarkDone}
            onClick={() => onComplete(item, draftPlatforms)}
            className="h-7 rounded bg-emerald-400 px-2 text-[10px] font-semibold text-black disabled:opacity-30"
          >
            {busy ? "…" : "Done"}
          </button>
          {isAdmin && ready && onUnready ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onUnready(item)}
              className="h-7 rounded border border-amber-300/40 bg-amber-400/10 px-2 text-[10px] font-semibold text-amber-100"
            >
              Unready
            </button>
          ) : null}
          {isAdmin && onCloseSkip ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCloseSkip(item)}
              className="h-7 rounded border border-white/15 px-2 text-[10px] font-semibold text-white/55"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function goLiveGroupTitle(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function AdsOutletSection({
  section,
  focusDate,
  busyItemId,
  isAdmin,
  canUploadHandoff,
  onComplete,
  onCloseSkip,
  onUnready,
  onSaveDescription,
  onHandoffUpload,
  onRequestDownload,
}: {
  section: OutletBoardSection;
  focusDate: string;
  busyItemId: string | null;
  isAdmin: boolean;
  canUploadHandoff: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onCloseSkip?: (item: TeamChecklistItemDto) => void;
  onUnready?: (item: TeamChecklistItemDto) => void;
  onSaveDescription: (item: TeamChecklistItemDto, description: string) => Promise<void>;
  onHandoffUpload: (
    item: TeamChecklistItemDto,
    payload: {
      format: HandoffFormat;
      fileUrl: string;
      postingNotes: string;
      scheduleNote: string;
    }
  ) => Promise<void>;
  onRequestDownload: (item: TeamChecklistItemDto, dateKey: string) => void;
}) {
  const ads = section.ads ?? [];
  const pending = ads.filter((a) => !isItemDone(a, a.targetDate ?? focusDate));
  const allDone = ads.length > 0 && pending.length === 0;

  if (ads.length === 0) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-xl border border-dashed border-white/[0.08] px-3">
        <span className="truncate text-[13px] font-semibold text-white/45">{section.outletLabel}</span>
        <span className="text-[11px] text-white/28">No ad for this day</span>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="flex h-9 items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 opacity-45">
        <span className="truncate text-[13px] font-semibold text-white/70">{section.outletLabel}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-300/70">Done</span>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.035]">
      <div className="border-b border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
        <h3 className="truncate text-[14px] font-semibold tracking-tight text-white">
          {section.outletLabel}
        </h3>
      </div>
      <div className="divide-y divide-white/[0.06] px-2.5 py-1">
        {pending.map((item) => (
          <AdItemRow
            key={`${item.id}-${item.targetDate}`}
            item={item}
            dateKey={item.targetDate ?? focusDate}
            busy={busyItemId === item.id}
            isAdmin={isAdmin}
            canUploadHandoff={canUploadHandoff}
            onComplete={onComplete}
            onCloseSkip={onCloseSkip}
            onUnready={onUnready}
            onSaveDescription={onSaveDescription}
            onHandoffUpload={onHandoffUpload}
            onRequestDownload={onRequestDownload}
          />
        ))}
      </div>
    </section>
  );
}

export default function TeamTasksView({
  isAdmin,
  canUploadHandoff = false,
  viewerId,
  members,
}: TeamTasksViewProps) {
  const [board, setBoard] = useState<ChecklistBoardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manageMemberId, setManageMemberId] = useState(() =>
    isAdmin ? members.find((m) => m.id === "amit")?.id ?? CHECKLIST_DEFAULT_OWNER_ID : viewerId
  );
  const [focusDate, setFocusDate] = useState("");
  const [todayKey, setTodayKey] = useState("");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [postOpen, setPostOpen] = useState(false);
  const [outletsOpen, setOutletsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postOutletId, setPostOutletId] = useState("");
  const [mode, setMode] = useState<"ready" | "waiting" | "ads" | "done">("ready");
  /** "all" or outletId / "__general__" */
  const [outletFilter, setOutletFilter] = useState<string>("all");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [waShare, setWaShare] = useState<{
    title: string;
    count: number;
    message: string;
  } | null>(null);
  const [waFallbackUrl, setWaFallbackUrl] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<{
    itemId: string;
    dateKey: string;
    title: string;
    urls: string[];
    filenameBase: string;
  } | null>(null);

  const promptDownloadFiles = (item: TeamChecklistItemDto, dateKey: string) => {
    const urls = handoffCreativeUrls(item.handoff);
    if (urls.length === 0) return;
    setDownloadNotice({
      itemId: item.id,
      dateKey,
      title: item.outletTitle || item.title,
      urls,
      filenameBase: `${item.outletId ?? "file"}-${dateKey}`,
    });
  };

  const today = todayKey;
  const weekDays = board?.day.weekDays ?? [];

  useEffect(() => {
    const t = getTodayKey();
    setTodayKey(t);
    setFocusDate(t);
  }, []);

  // Keep focus on today if somehow shifted to a past day.
  useEffect(() => {
    if (!todayKey || !focusDate) return;
    if (focusDate < todayKey) setFocusDate(todayKey);
  }, [todayKey, focusDate]);

  useEffect(() => {
    if (!board?.day.today) return;
    if (board.day.today !== todayKey) setTodayKey(board.day.today);
    if (focusDate && focusDate < board.day.today) setFocusDate(board.day.today);
  }, [board?.day.today, focusDate, todayKey]);

  const loadBoard = useCallback(async () => {
    if (!focusDate) return;
    try {
      const qs = new URLSearchParams({ focusDate });
      if (isAdmin && manageMemberId) qs.set("manageMemberId", manageMemberId);
      const res = await fetch(`/api/team/checklists?${qs}`);
      const data = await readTeamApiJson(res);
      setBoard(data.board as ChecklistBoardDto);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
    } finally {
      setLoading(false);
    }
  }, [focusDate, isAdmin, manageMemberId]);

  useEffect(() => {
    if (!focusDate) return;
    // Don't blank the screen on date switches — only spinner on first load.
    if (!board) setLoading(true);
    void loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when focus/member changes; board intentionally omitted
  }, [loadBoard, focusDate]);

  const markComplete = async (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => {
    if (platforms.length === 0) return;
    const date = item.targetDate ?? focusDate;
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, platforms }),
      });
      await readTeamApiJson(res);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyItemId(null);
    }
  };

  /** Undo Done + clear Ready — same board for Amit; returns when uploaded Ready again. */
  const reopenDone = async (item: TeamChecklistItemDto) => {
    const date = item.targetDate ?? focusDate;
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, markComplete: false }),
      });
      await readTeamApiJson(res);
      clearDownloadAt(item.id, date);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reopen failed");
    } finally {
      setBusyItemId(null);
    }
  };

  const saveAdDescription = async (item: TeamChecklistItemDto, description: string) => {
    const res = await fetch(`/api/team/checklist-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    await readTeamApiJson(res);
    await loadBoard();
  };

  const openWhatsAppMessage = (message: string, count: number, title: string) => {
    setError(null);
    const url = whatsAppShareUrl(message);
    setWaFallbackUrl(null);
    const result = openWhatsAppShareUrl(url);
    if (result === "popup-blocked" || result === false) {
      setWaShare({ title, count, message });
      setWaFallbackUrl(url);
    }
  };

  const sendAllReadyWhatsApp = () => {
    if (!isAdmin || !board) return;
    const todayYmd = getTodayKey();
    const readyItems = collectTodayReadyItems(board, todayYmd);
    if (readyItems.length === 0) {
      setError("Nothing Ready for today yet — only today’s greens go on WhatsApp.");
      return;
    }
    openWhatsAppMessage(
      buildAllReadyWhatsAppMessage(readyItems.length),
      readyItems.length,
      "Today ready — WhatsApp"
    );
  };

  const sendWaitNudgeWhatsApp = () => {
    if (isAdmin || !board) return;
    const todayYmd = getTodayKey();
    const focus = board.day.focusDate;
    const waitItems = collectWaitItems(board).filter(
      (i) => itemDateKey(i, focus) === todayYmd
    );
    if (waitItems.length === 0) {
      setError("Nothing on Wait for today — all greens are Ready.");
      return;
    }
    openWhatsAppMessage(
      buildWaitNudgeWhatsAppMessage(waitItems.length),
      waitItems.length,
      "Need Ready — WhatsApp"
    );
  };

  /** Admin: pull Ready back — weekend clears story+post+ad and resets designer job. */
  const adminUnready = async (item: TeamChecklistItemDto) => {
    if (!isAdmin) return;
    const date = item.targetDate ?? focusDate;
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          handoff: { action: "clear" },
        }),
      });
      await readTeamApiJson(res);
      clearDownloadAt(item.id, date);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark Unready");
    } finally {
      setBusyItemId(null);
    }
  };

  /** Admin: skip posting — close without Ready/download. */
  const adminCloseSkip = async (item: TeamChecklistItemDto) => {
    if (!isAdmin) return;
    const date = item.targetDate ?? focusDate;
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          markComplete: true,
          closeWithoutCreative: true,
          platforms: [...CHECKLIST_PLATFORM_IDS],
        }),
      });
      await readTeamApiJson(res);
      clearDownloadAt(item.id, date);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to Close item");
    } finally {
      setBusyItemId(null);
    }
  };

  const submitHandoffUpload = async (
    item: TeamChecklistItemDto,
    payload: {
      format: HandoffFormat;
      fileUrl: string;
      postingNotes: string;
      scheduleNote: string;
    }
  ) => {
    const date = item.targetDate ?? focusDate;
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          handoff: {
            action: "set-ready",
            format: payload.format,
            fileUrl: payload.fileUrl,
            postingNotes: payload.postingNotes,
            scheduleNote: payload.scheduleNote,
          } satisfies HandoffPayload,
        }),
      });
      await readTeamApiJson(res);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send to Amit");
      throw err;
    } finally {
      setBusyItemId(null);
    }
  };

  const openBoardNotes = () => {
    const notes = board?.boardNotes ?? { postings: "", ads: "" };
    setNotesDraft(mode === "ads" ? notes.ads : notes.postings);
    setNotesOpen(true);
  };

  const saveBoardNotes = async () => {
    if (!isAdmin) return;
    setSavingNotes(true);
    try {
      const res = await fetch("/api/team/checklists/board-notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab: mode,
          notes: notesDraft,
          ownerId: manageMemberId || CHECKLIST_DEFAULT_OWNER_ID,
        }),
      });
      const data = await readTeamApiJson(res);
      const next = data.boardNotes as { postings: string; ads: string } | undefined;
      if (next && board) {
        setBoard({ ...board, boardNotes: next });
      } else {
        await loadBoard();
      }
      setNotesOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const ensureOutlet = async (outletId: string, disable: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/team/checklists/ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          ownerId: manageMemberId || CHECKLIST_DEFAULT_OWNER_ID,
          disable,
        }),
      });
      await readTeamApiJson(res);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update outlet");
    } finally {
      setSaving(false);
    }
  };

  const createPost = async () => {
    if (!postTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/team/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "posts",
          title: postTitle.trim(),
          description: postDescription.trim() || undefined,
          outletId: postOutletId || undefined,
          ownerId: manageMemberId || CHECKLIST_DEFAULT_OWNER_ID,
        }),
      });
      await readTeamApiJson(res);
      setPostOpen(false);
      setPostTitle("");
      setPostDescription("");
      setPostOutletId("");
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add post");
    } finally {
      setSaving(false);
    }
  };

  const enabled = new Set(board?.enabledOutletIds ?? []);
  const boardOutlets = board?.outlets ?? [];
  const adsCount = countPendingAds(boardOutlets, focusDate);
  const activeNotesText =
    mode === "ads" ? board?.boardNotes?.ads : board?.boardNotes?.postings;
  const notesCount = countNoteLines(activeNotesText);

  const outlets = [...boardOutlets].sort((a, b) => {
    if (mode === "ads") {
      const aOpen = (a.ads ?? []).some((s) => !isItemDone(s, s.targetDate ?? focusDate));
      const bOpen = (b.ads ?? []).some((s) => !isItemDone(s, s.targetDate ?? focusDate));
      if (aOpen === bOpen) return 0;
      return aOpen ? -1 : 1;
    }
    const aOpen =
      a.openPosts.length > 0 ||
      a.stories.some((s) => !isItemDone(s, s.targetDate ?? focusDate));
    const bOpen =
      b.openPosts.length > 0 ||
      b.stories.some((s) => !isItemDone(s, s.targetDate ?? focusDate));
    if (aOpen === bOpen) return 0;
    return aOpen ? -1 : 1;
  });

  const readyItemsAll = board ? collectReadyItems(board) : [];
  const readyCount = readyItemsAll.length;
  const todayYmd = getTodayKey();
  const todayReadyCount = board ? collectTodayReadyItems(board, todayYmd).length : 0;
  const waitingItemsAll = board ? collectWaitItems(board) : [];
  const waitCount = waitingItemsAll.length;
  const todayWaitCount = board
    ? waitingItemsAll.filter((i) => itemDateKey(i, board.day.focusDate) === todayYmd).length
    : 0;
  const doneItemsAll = board?.doneItems ?? [];
  const doneCount = doneItemsAll.length;

  const outletChipCounts = (() => {
    const map = new Map<string, number>();
    const bump = (key: string) => map.set(key, (map.get(key) ?? 0) + 1);
    if (mode === "ready") {
      for (const item of readyItemsAll) bump(itemOutletKey(item));
    } else if (mode === "waiting") {
      for (const item of waitingItemsAll) bump(itemOutletKey(item));
    } else if (mode === "done") {
      for (const item of doneItemsAll) bump(itemOutletKey(item));
    } else if (mode === "ads") {
      for (const section of boardOutlets) {
        for (const ad of section.ads ?? []) {
          if (!isItemDone(ad, ad.targetDate ?? focusDate)) bump(section.outletId);
        }
      }
    }
    return map;
  })();

  const outletChips = Array.from(outletChipCounts.entries())
    .filter(([, n]) => n > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return outletFilterLabel(a[0]).localeCompare(outletFilterLabel(b[0]));
    });

  const matchesOutletFilter = (key: string) =>
    outletFilter === "all" || outletFilter === key;

  const readyItems =
    outletFilter === "all"
      ? readyItemsAll
      : readyItemsAll.filter((i) => matchesOutletFilter(itemOutletKey(i)));
  const waitingItems =
    outletFilter === "all"
      ? waitingItemsAll
      : waitingItemsAll.filter((i) => matchesOutletFilter(itemOutletKey(i)));
  const doneItems =
    outletFilter === "all"
      ? doneItemsAll
      : doneItemsAll.filter((i) => matchesOutletFilter(itemOutletKey(i)));
  const filteredOutlets =
    outletFilter === "all"
      ? outlets
      : outlets.filter((s) => matchesOutletFilter(s.outletId));

  if (loading && !board) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-cyan-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#06060a]">
      {error ? (
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
        </div>
      ) : null}

      {downloadNotice ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="amit-download-notice-title"
          onClick={() => setDownloadNotice(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/15 bg-[#141414] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="amit-download-notice-title"
              className="text-[15px] font-semibold text-white"
            >
              {downloadNotice.urls.length === 1
                ? "1 file to download & post"
                : `${downloadNotice.urls.length} files to download & post`}
            </p>
            <p className="mt-1 text-[12px] text-white/45">{downloadNotice.title}</p>
            <p className="mt-3 text-[13px] leading-snug text-white/75">
              {downloadNotice.urls.length === 1
                ? "Cross-check this file before you post."
                : `There are ${downloadNotice.urls.length} files for this task. Cross-check and download all of them before posting — don’t miss any.`}
            </p>
            {downloadNotice.urls.length > 1 ? (
              <ul className="mt-3 space-y-1.5">
                {downloadNotice.urls.map((url, i) => (
                  <li key={url}>
                    <a
                      href={teamDownloadHref(
                        url,
                        `${downloadNotice.filenameBase}-${i + 1}`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        markDownloaded(
                          downloadNotice.itemId,
                          downloadNotice.dateKey
                        );
                      }}
                      className="block truncate rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] font-medium text-cyan-300 hover:bg-white/[0.07]"
                    >
                      File {i + 1} of {downloadNotice.urls.length}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  markDownloaded(downloadNotice.itemId, downloadNotice.dateKey);
                  openChecklistDownloads(
                    downloadNotice.urls,
                    downloadNotice.filenameBase
                  );
                  setDownloadNotice(null);
                }}
                className="h-10 flex-1 rounded-lg bg-cyan-400 px-3 text-[13px] font-semibold text-black sm:flex-none"
              >
                {downloadNotice.urls.length > 1
                  ? `Download all ${downloadNotice.urls.length}`
                  : "Download"}
              </button>
              <button
                type="button"
                onClick={() => setDownloadNotice(null)}
                className="h-10 px-3 text-[13px] text-white/50 hover:text-white/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-24 xl:pb-10">
        <div className="mx-auto max-w-3xl py-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 overflow-x-auto rounded-xl bg-white/[0.06] p-1 ring-1 ring-white/10">
              {(
                [
                  {
                    id: "ready" as const,
                    label: "Ready",
                    Icon: IconPostings,
                    count: readyCount,
                    active: "bg-emerald-400 text-black shadow-[0_0_18px_rgba(52,211,153,0.35)]",
                    idle: "text-emerald-200/70 hover:text-emerald-100",
                    badgeOn: "bg-black/25 text-black",
                    badgeOff: "bg-emerald-400/20 text-emerald-100",
                  },
                  {
                    id: "waiting" as const,
                    label: "Waiting",
                    Icon: IconPostings,
                    count: waitCount,
                    active: "bg-cyan-400 text-black shadow-[0_0_18px_rgba(34,211,238,0.35)]",
                    idle: "text-cyan-200/70 hover:text-cyan-100",
                    badgeOn: "bg-black/25 text-black",
                    badgeOff: "bg-cyan-400/20 text-cyan-100",
                  },
                  {
                    id: "ads" as const,
                    label: "Ads",
                    Icon: IconAds,
                    count: adsCount,
                    active: "bg-amber-400 text-black shadow-[0_0_18px_rgba(251,191,36,0.35)]",
                    idle: "text-amber-200/70 hover:text-amber-100",
                    badgeOn: "bg-black/25 text-black",
                    badgeOff: "bg-amber-400/20 text-amber-100",
                  },
                  {
                    id: "done" as const,
                    label: "Done",
                    Icon: IconTasks,
                    count: doneCount,
                    active: "bg-white text-black shadow-[0_0_18px_rgba(255,255,255,0.2)]",
                    idle: "text-white/45 hover:text-white/75",
                    badgeOn: "bg-black/25 text-black",
                    badgeOff: "bg-white/10 text-white/70",
                  },
                ] as const
              ).map((t) => {
                const on = mode === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setMode(t.id);
                      setOutletFilter("all");
                    }}
                    className={`flex h-10 min-w-[4.5rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 text-[12px] font-semibold transition sm:gap-2 sm:text-[13px] ${
                      on ? t.active : t.idle
                    }`}
                  >
                    <t.Icon className="h-4 w-4 shrink-0" />
                    {t.label}
                    <span
                      className={`min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums ${
                        on ? t.badgeOn : t.badgeOff
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={openBoardNotes}
              title={mode === "ads" ? "Ads notes" : "Postings notes"}
              aria-label={
                notesCount > 0
                  ? `${notesCount} things to remember`
                  : mode === "ads"
                    ? "Ads notes"
                    : "Postings notes"
              }
              className={`relative flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 transition ${
                notesCount > 0
                  ? "border-amber-300/40 bg-amber-400/15 text-amber-200"
                  : "border-white/12 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white"
              }`}
            >
              <IconNotes className="h-[18px] w-[18px]" />
              {notesCount > 0 ? (
                <span className="text-[12px] font-bold tabular-nums">{notesCount}</span>
              ) : null}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-white">Daily Checklist</h2>
              <p className="text-[12px] text-white/40">
                {mode === "ready"
                  ? "Stories & posts with uploaded file only · Download → wait 1 min → Done. Ads stay in Ads."
                  : mode === "waiting"
                    ? "Stories & posts still waiting on designer upload. Nothing here goes to Amit yet."
                    : mode === "ads"
                      ? "Ads only · start 4 days before go-live · never mixed with Ready posts/stories"
                      : "Posted / closed · reopen if something went wrong. Download still available."}
              </p>
            </div>
            {isAdmin ? (
              <div className="flex flex-wrap gap-1.5">
                <select
                  value={manageMemberId}
                  onChange={(e) => setManageMemberId(e.target.value)}
                  className="h-8 rounded-md border border-white/10 bg-black/40 px-2 text-[12px] text-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void (async () => {
                      setSaving(true);
                      try {
                        const res = await fetch("/api/team/checklists/close-backlog", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            ownerId: manageMemberId || CHECKLIST_DEFAULT_OWNER_ID,
                            daysAgo: 2,
                          }),
                        });
                        const data = await readTeamApiJson(res);
                        setError(
                          `Closed ${data.closed ?? 0} story/post items through ${data.cutoffYmd} (ads kept open).`
                        );
                        await loadBoard();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Backlog close failed");
                      } finally {
                        setSaving(false);
                      }
                    })()
                  }
                  className="h-8 rounded-md border border-white/15 px-2 text-[11px] font-semibold text-white/70"
                >
                  Clear backlog (−2d)
                </button>
                <button
                  type="button"
                  onClick={() => setOutletsOpen(true)}
                  className="h-8 rounded-md border border-white/12 px-2.5 text-[12px] text-white/75"
                >
                  Outlets
                </button>
                {mode === "waiting" ? (
                  <button
                    type="button"
                    onClick={() => setPostOpen(true)}
                    className="h-8 rounded-md bg-cyan-500 px-2.5 text-[12px] font-semibold text-black"
                  >
                    + Post
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {mode !== "done" ? (
            <div className="mb-3 flex gap-0.5 overflow-x-auto rounded-lg bg-white/[0.03] p-0.5">
              {(weekDays.length > 0
                ? weekDays
                : [{ date: today, dayId: "mon" as const, dayLabel: "Today", dateLabel: today, isToday: true }]
              ).map((d) => {
                const selected = focusDate === d.date;
                const readyN = board?.readyCountByDate?.[d.date] ?? 0;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setFocusDate(d.date)}
                    className={`relative flex min-h-[48px] min-w-[3.5rem] flex-1 flex-col items-center justify-center rounded-md px-1.5 ${
                      selected ? "bg-white/10 text-white" : "text-white/40 hover:text-white/65"
                    }`}
                  >
                    {readyN > 0 ? (
                      <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[9px] font-bold text-black">
                        {readyN > 9 ? "9+" : readyN}
                      </span>
                    ) : null}
                    <span className="text-[13px] font-semibold tabular-nums leading-none">
                      {d.dateLabel || d.date.slice(8)}
                    </span>
                    <span className={`mt-0.5 text-[10px] uppercase tracking-wide ${d.isToday ? "text-cyan-300/80" : ""}`}>
                      {d.isToday ? "Today" : d.dayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {outletChips.length > 0 ? (
            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setOutletFilter("all")}
                className={`relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition ${
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
                  {mode === "ready"
                    ? readyCount
                    : mode === "waiting"
                      ? waitCount
                      : mode === "done"
                        ? doneCount
                        : adsCount}
                </span>
              </button>
              {outletChips.map(([key, count]) => {
                const on = outletFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOutletFilter(on ? "all" : key)}
                    className={`relative flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition ${
                      on
                        ? "bg-cyan-400 text-black shadow-[0_0_14px_rgba(34,211,238,0.3)]"
                        : "bg-white/[0.06] text-white/70 ring-1 ring-white/10 hover:text-white"
                    }`}
                  >
                    {outletFilterLabel(key)}
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
          ) : null}

          {mode === "done" ? (
            <section className="overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.03]">
              <div className="border-b border-white/[0.08] px-3 py-2.5">
                <h3 className="text-[14px] font-semibold text-white">
                  Done ({doneItems.length}
                  {outletFilter !== "all" ? ` · ${outletFilterLabel(outletFilter)}` : ""})
                </h3>
                <p className="text-[11px] text-white/40">
                  Reopen removes Done and Ready for Amit — it shows again only after a new Ready upload.
                </p>
              </div>
              {doneItems.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-white/35">Nothing done yet.</p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {doneItems.map((d) => {
                    const urls = handoffCreativeUrls(d.handoff);
                    const dateKey = d.targetDate ?? focusDate;
                    return (
                      <li key={`${d.id}-${d.targetDate}-${d.kind}`} className="px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-400/15 text-emerald-200">
                                Done
                              </span>
                              <KindBadge kind={d.kind} />
                            </div>
                            <div className="mt-1">
                              <ReadyHeadline item={d} dateKey={dateKey} />
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                            {urls.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => promptDownloadFiles(d, dateKey)}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-cyan-400 px-3 text-[12px] font-bold text-black"
                              >
                                {urls.length > 1
                                  ? `Download · ${urls.length} files`
                                  : "Download"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={busyItemId === d.id}
                              onClick={() => void reopenDone(d)}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 text-[12px] font-semibold text-amber-100 disabled:opacity-40"
                            >
                              {busyItemId === d.id ? "…" : "Reopen"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : !board || (outlets.length === 0 && (board.generalPosts?.length ?? 0) === 0) ? (
            <div className="border-y border-white/[0.06] py-10 text-center">
              <p className="text-[14px] text-white/40">No outlets enabled yet</p>
              <p className="mt-1 text-[12px] text-white/28">
                {isAdmin
                  ? "Enable outlets to seed Mon–Sun Stories for Amit."
                  : "Your lead will enable outlet Stories here."}
              </p>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setOutletsOpen(true)}
                  className="mt-4 rounded-full bg-cyan-500/20 px-4 py-2 text-[13px] font-medium text-cyan-200"
                >
                  Enable outlets
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {mode === "ready" ? (
                readyItemsAll.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-white/35">
                    Nothing for Amit yet — when a designer uploads a story/post file and marks Ready, it shows here.
                  </p>
                ) : readyItems.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-white/35">
                    No Ready items for {outletFilterLabel(outletFilter)}. Tap All or another outlet.
                  </p>
                ) : (
                  <section className="overflow-hidden rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04]">
                    <div className="border-b border-emerald-400/20 px-3 py-2.5">
                      <h3 className="text-[14px] font-semibold text-emerald-100">
                        Ready for Amit ({readyItems.length}
                        {outletFilter !== "all" ? ` · ${outletFilterLabel(outletFilter)}` : ""})
                      </h3>
                      <p className="text-[11px] text-white/40">
                        Uploaded stories & posts only (no ads). Download → wait 1 min → Done. Admin: Unready or Close to skip.
                      </p>
                    </div>
                    <div className="divide-y divide-white/[0.06] px-2.5 py-1">
                      {readyItems.map((item) => (
                        <ItemRow
                          key={`${item.id}-${item.targetDate}-${item.kind}`}
                          item={item}
                          dateKey={item.targetDate ?? focusDate}
                          busy={busyItemId === item.id}
                          isAdmin={isAdmin}
                          canUploadHandoff={canUploadHandoff}
                          requireDownloadGate
                          onComplete={markComplete}
                          onCloseSkip={isAdmin ? adminCloseSkip : undefined}
                          onUnready={isAdmin ? adminUnready : undefined}
                          onHandoffUpload={submitHandoffUpload}
                          onRequestDownload={promptDownloadFiles}
                        />
                      ))}
                    </div>
                  </section>
                )
              ) : mode === "waiting" ? (
                waitingItemsAll.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-white/35">
                    Nothing waiting — all open stories/posts are Ready for Amit (or Done).
                  </p>
                ) : waitingItems.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-white/35">
                    No Waiting items for {outletFilterLabel(outletFilter)}. Tap All or another outlet.
                  </p>
                ) : (
                  <section className="overflow-hidden rounded-xl border border-cyan-400/25 bg-cyan-400/[0.04]">
                    <div className="border-b border-cyan-400/20 px-3 py-2.5">
                      <h3 className="text-[14px] font-semibold text-cyan-100">
                        Waiting on design ({waitingItems.length}
                        {outletFilter !== "all" ? ` · ${outletFilterLabel(outletFilter)}` : ""})
                      </h3>
                      <p className="text-[11px] text-white/40">
                        Stories & posts without a Ready upload yet. Ads are only under the Ads tab.
                      </p>
                    </div>
                    <div className="divide-y divide-white/[0.06] px-2.5 py-1">
                      {waitingItems.map((item) => (
                        <ItemRow
                          key={`${item.id}-${item.targetDate}-${item.kind}`}
                          item={item}
                          dateKey={item.targetDate ?? focusDate}
                          busy={busyItemId === item.id}
                          isAdmin={isAdmin}
                          canUploadHandoff={canUploadHandoff}
                          onComplete={markComplete}
                          onCloseSkip={isAdmin ? adminCloseSkip : undefined}
                          onUnready={isAdmin ? adminUnready : undefined}
                          onHandoffUpload={submitHandoffUpload}
                          onRequestDownload={promptDownloadFiles}
                        />
                      ))}
                    </div>
                  </section>
                )
              ) : (
                filteredOutlets.map((section) => (
                  <AdsOutletSection
                    key={section.outletId}
                    section={section}
                    focusDate={focusDate}
                    busyItemId={busyItemId}
                    isAdmin={isAdmin}
                    canUploadHandoff={canUploadHandoff}
                    onComplete={markComplete}
                    onCloseSkip={isAdmin ? adminCloseSkip : undefined}
                    onUnready={isAdmin ? adminUnready : undefined}
                    onRequestDownload={promptDownloadFiles}
                    onSaveDescription={saveAdDescription}
                    onHandoffUpload={submitHandoffUpload}
                  />
                ))
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-2.5 pb-2 text-center">
            {isAdmin ? (
              <button
                type="button"
                onClick={sendAllReadyWhatsApp}
                disabled={todayReadyCount === 0}
                title={
                  todayReadyCount === 0
                    ? "Nothing Ready for today yet"
                    : "Send a generic WhatsApp — check today’s Ready on the site"
                }
                className="text-[13px] font-medium text-[#25D366]/80 underline decoration-[#25D366]/35 underline-offset-4 hover:text-[#25D366] disabled:cursor-not-allowed disabled:text-white/25 disabled:no-underline"
              >
                WhatsApp today ready
                {todayReadyCount > 0 ? ` (${todayReadyCount})` : ""}
              </button>
            ) : (
              <button
                type="button"
                onClick={sendWaitNudgeWhatsApp}
                disabled={todayWaitCount === 0}
                title={
                  todayWaitCount === 0
                    ? "No Wait items for today"
                    : "Send a generic WhatsApp — check today’s Wait on the site"
                }
                className="text-[13px] font-medium text-[#25D366]/80 underline decoration-[#25D366]/35 underline-offset-4 hover:text-[#25D366] disabled:cursor-not-allowed disabled:text-white/25 disabled:no-underline"
              >
                WhatsApp need ready
                {todayWaitCount > 0 ? ` (${todayWaitCount})` : ""}
              </button>
            )}
          </div>
        </div>
      </div>

      {outletsOpen && isAdmin ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setOutletsOpen(false)}>
          <div className={`${TEAM_SHEET_PANEL} max-w-lg`} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-white">Enable outlets</h2>
            <p className="mt-1 text-[12px] text-white/40">
              Turns on Mon–Sun Stories, Fri/Sat/Sun posts (−4 days), and weekly Ads for{" "}
              {members.find((m) => m.id === manageMemberId)?.name ?? "Amit"}.
            </p>
            <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto">
              {TEAM_AD_OUTLETS.map((o) => {
                const on = enabled.has(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void ensureOutlet(o.id, on)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[14px] ${
                        on ? "bg-cyan-500/15 text-white ring-1 ring-cyan-400/20" : "text-white/70"
                      }`}
                    >
                      {o.label}
                      <span className="text-[12px] text-white/45">{on ? "On" : "Off"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => setOutletsOpen(false)}
              className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm text-white/60"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {postOpen && isAdmin ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setPostOpen(false)}>
          <div className={`${TEAM_SHEET_PANEL} max-w-lg space-y-3`} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-white">Add post</h2>
            <p className="text-[12px] text-white/40">Shows under that outlet&apos;s Post tab until Done.</p>
            <input
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Post title"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white outline-none"
            />
            <textarea
              value={postDescription}
              onChange={(e) => setPostDescription(e.target.value)}
              placeholder="Description / brief for Amit"
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
            />
            <select
              value={postOutletId}
              onChange={(e) => setPostOutletId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
            >
              <option value="">General (no outlet)</option>
              {TEAM_AD_OUTLETS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPostOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !postTitle.trim()}
                onClick={() => void createPost()}
                className="min-h-[44px] flex-1 rounded-xl bg-cyan-500 text-sm font-semibold text-black disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notesOpen ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !savingNotes && setNotesOpen(false)}>
          <div className={`${TEAM_SHEET_PANEL} max-w-lg space-y-3`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <IconNotes className="h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  {mode === "ads" ? "Ads notes" : "Postings notes"}
                </h2>
                <p className="text-[12px] text-white/40">
                  General instructions to remember for this tab.
                </p>
              </div>
            </div>
            {isAdmin ? (
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={8}
                placeholder={
                  mode === "ads"
                    ? "e.g. Budget caps, account names, creative rules…"
                    : "e.g. Caption tone, hashtags, what to skip today…"
                }
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
              />
            ) : (
              <div className="min-h-[120px] rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm whitespace-pre-wrap text-white/75">
                {notesDraft.trim() || "No notes yet."}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={savingNotes}
                onClick={() => setNotesOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Close
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  disabled={savingNotes}
                  onClick={() => void saveBoardNotes()}
                  className="min-h-[44px] flex-1 rounded-xl bg-amber-400 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {waShare ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => setWaShare(null)}>
          <div
            className={`${TEAM_SHEET_PANEL} max-w-lg space-y-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-400/30">
                <IconWhatsApp className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">{waShare.title}</h2>
                <p className="mt-0.5 text-[12px] text-white/45">
                  {waShare.count} item{waShare.count === 1 ? "" : "s"} · popup was blocked
                </p>
              </div>
            </div>
            <div className="max-h-[40vh] overflow-y-auto rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3.5 py-3">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/80">
                {waShare.message}
              </p>
            </div>
            {waFallbackUrl ? (
              <a
                href={waFallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[13px] font-medium text-emerald-300 underline"
              >
                Tap here if WhatsApp didn&apos;t open
              </a>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWaShare(null)}
                className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = whatsAppShareUrl(waShare.message);
                  const result = openWhatsAppShareUrl(url);
                  if (result === "popup-blocked" || result === false) {
                    setWaFallbackUrl(url);
                  } else {
                    setWaShare(null);
                  }
                }}
                className="flex min-h-[48px] flex-[1.4] items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-black"
              >
                <IconWhatsApp className="h-5 w-5" />
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
