"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CHECKLIST_PLATFORM_IDS,
  CHECKLIST_PLATFORM_LABELS,
  defaultHandoffFormat,
  getTodayKey,
  HANDOFF_FORMATS,
  type ChecklistBoardDto,
  type ChecklistPlatformId,
  type HandoffFormat,
  type HandoffStatus,
  type OutletBoardSection,
  type TeamChecklistItemDto,
} from "@/lib/team-checklists";
import { CHECKLIST_DEFAULT_OWNER_ID } from "@/lib/team-checklist-templates";
import { uploadTeamFile } from "@/lib/team-client-upload";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
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

function countPendingPostings(
  outlets: OutletBoardSection[],
  generalPosts: TeamChecklistItemDto[],
  focusDate: string
): number {
  let n = 0;
  for (const section of outlets) {
    n += section.stories.filter((s) => !isItemDone(s, s.targetDate ?? focusDate)).length;
    n += section.openPosts.filter((p) => !isItemDone(p, p.targetDate ?? focusDate)).length;
  }
  n += generalPosts.filter((p) => !isItemDone(p, p.targetDate ?? focusDate)).length;
  return n;
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

function collectBoardPendingItems(
  board: ChecklistBoardDto,
  ready: boolean,
  kinds?: Array<NonNullable<TeamChecklistItemDto["kind"]>>
): TeamChecklistItemDto[] {
  const focus = board.day.focusDate;
  const kindSet = kinds?.length ? new Set(kinds) : null;
  const out: TeamChecklistItemDto[] = [];
  const seen = new Set<string>();
  const push = (item: TeamChecklistItemDto) => {
    if (Boolean(item.creativeReady) !== ready) return;
    if (kindSet && (!item.kind || !kindSet.has(item.kind))) return;
    const dateKey = item.targetDate ?? focus;
    if (isItemDone(item, dateKey)) return;
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

/** Admin Ready WA: stories + posts + ads. */
function collectReadyItems(board: ChecklistBoardDto): TeamChecklistItemDto[] {
  return collectBoardPendingItems(board, true, ["stories", "posts", "ads"]);
}

/** Amit Need Ready WA: stories + posts only (no ads). */
function collectWaitItems(board: ChecklistBoardDto): TeamChecklistItemDto[] {
  return collectBoardPendingItems(board, false, ["stories", "posts"]);
}

function shortOutletLabel(raw: string | null | undefined): string {
  const t = (raw || "gen").trim();
  if (!t) return "gen";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return parts.map((p) => p[0] ?? "").join("").toLowerCase();
  return t.toLowerCase();
}

function simpleWaItemLine(item: TeamChecklistItemDto): string {
  const outlet = shortOutletLabel(item.outletTitle || item.outletId);
  const day = (item.dayOfWeek || "").toLowerCase();
  const kind =
    item.kind === "stories"
      ? "story"
      : item.kind === "ads"
        ? "ad"
        : item.kind === "posts"
          ? "post"
          : item.title.toLowerCase().includes("story")
            ? "story"
            : item.title.toLowerCase().includes("ad")
              ? "ad"
              : "post";
  if (day) return `${outlet} ${day} ${kind}`;
  return `${outlet} ${item.title.toLowerCase()}`;
}

function buildAllReadyWhatsAppMessage(items: TeamChecklistItemDto[]): string {
  return ["ready to post", ...items.map(simpleWaItemLine)].join("\n");
}

function buildWaitNudgeWhatsAppMessage(items: TeamChecklistItemDto[]): string {
  const overdue = items.filter((i) => i.isOverdue);
  const waiting = items.filter((i) => !i.isOverdue);
  const lines: string[] = [];
  if (overdue.length > 0) {
    lines.push("overdue", ...overdue.map(simpleWaItemLine));
  }
  if (waiting.length > 0) {
    if (lines.length) lines.push("");
    lines.push("need ready", ...waiting.map(simpleWaItemLine));
  }
  return lines.join("\n");
}

function handoffStatusOf(item: TeamChecklistItemDto): HandoffStatus {
  return item.handoff?.status ?? (item.creativeReady ? "ready" : "wait");
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

function markDownloaded(itemId: string, dateKey: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(downloadKey(itemId, dateKey), String(Date.now()));
}

function HandoffDetails({
  item,
  dateKey,
  onDownloaded,
}: {
  item: TeamChecklistItemDto;
  dateKey?: string;
  onDownloaded?: () => void;
}) {
  const h = item.handoff;
  if (!h || h.status !== "ready" || !h.fileUrl) return null;
  const dk = dateKey ?? item.targetDate ?? "";
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/55">
      {h.scheduleNote ? <span>Schedule: {h.scheduleNote}</span> : null}
      {h.postingNotes ? <span className="w-full text-white/45">{h.postingNotes}</span> : null}
      <a
        href={`/api/team/download?url=${encodeURIComponent(h.fileUrl)}`}
        onClick={() => {
          if (dk) markDownloaded(item.id, dk);
          onDownloaded?.();
        }}
        className="rounded-md bg-cyan-500 px-2.5 py-1 text-[12px] font-bold text-black"
      >
        Download
      </a>
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

/** e.g. "31 Jul · Friday · Story" */
function readyGoLiveHeadline(item: TeamChecklistItemDto, dateKey: string): string {
  const ymd = item.targetDate ?? dateKey;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return item.title;
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
  return `${datePart} · ${weekday} · ${kind}`;
}

function ItemRow({
  item,
  dateKey,
  busy,
  isAdmin,
  canUploadHandoff,
  requireDownloadGate = false,
  onComplete,
  onHandoffUpload,
}: {
  item: TeamChecklistItemDto;
  dateKey: string;
  busy: boolean;
  isAdmin: boolean;
  canUploadHandoff: boolean;
  /** Amit Ready tab: must download, then wait 1 min before Done */
  requireDownloadGate?: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onAdminToggleReady?: (item: TeamChecklistItemDto) => void;
  onHandoffUpload: (
    item: TeamChecklistItemDto,
    payload: {
      format: HandoffFormat;
      fileUrl: string;
      postingNotes: string;
      scheduleNote: string;
    }
  ) => Promise<void>;
}) {
  const [draftPlatforms, setDraftPlatforms] = useState<ChecklistPlatformId[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [, setTick] = useState(0);
  const status = handoffStatusOf(item);
  const ready = status === "ready";
  const dlAt = readDownloadAt(item.id, dateKey);
  const remainingSec =
    requireDownloadGate && ready && dlAt
      ? Math.max(0, Math.ceil((dlAt + DOWNLOAD_UNLOCK_MS - Date.now()) / 1000))
      : null;
  const gateBlocks =
    requireDownloadGate &&
    ready &&
    !isAdmin &&
    (!dlAt || (remainingSec != null && remainingSec > 0));

  useEffect(() => {
    setDraftPlatforms([]);
    setShowUpload(false);
  }, [item.id, dateKey]);

  useEffect(() => {
    if (!requireDownloadGate || !ready || !dlAt || (remainingSec ?? 0) <= 0) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [requireDownloadGate, ready, dlAt, remainingSec]);

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

  const fileUrl = item.handoff?.fileUrl?.trim() || "";
  const headline = requireDownloadGate
    ? readyGoLiveHeadline(item, dateKey)
    : item.title;

  return (
    <div className="py-1.5">
      <div className="flex min-h-9 items-start gap-2">
        {!requireDownloadGate ? (
          <HandoffStatusToggle status={status === "approved" ? "wait" : status} />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <KindBadge kind={item.kind} />
            <span className="text-[15px] font-semibold leading-tight text-white">
              {headline}
            </span>
            {item.isOverdue ? (
              <span className="text-[10px] font-medium uppercase text-amber-300/75">Overdue</span>
            ) : null}
          </div>
          {requireDownloadGate && item.outletTitle ? (
            <p className="mt-0.5 text-[11px] text-white/40">{item.outletTitle}</p>
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
            />
          ) : null}
          {requireDownloadGate && ready && !dlAt && !isAdmin ? (
            <p className="mt-1 text-[10px] text-white/40">Download first — then Done unlocks in 1 min.</p>
          ) : null}
          {requireDownloadGate && remainingSec != null && remainingSec > 0 && !isAdmin ? (
            <p className="mt-1 text-[10px] text-amber-200/70">
              Done unlocks in {remainingSec}s…
            </p>
          ) : null}
          {isAdmin && requireDownloadGate ? (
            <p className="mt-1 text-[10px] text-emerald-200/60">Admin — Done anytime (no download wait).</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1.5">
          {requireDownloadGate && ready && fileUrl ? (
            <a
              href={`/api/team/download?url=${encodeURIComponent(fileUrl)}`}
              onClick={() => {
                markDownloaded(item.id, dateKey);
                setTick((n) => n + 1);
              }}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-cyan-400 px-3 text-[12px] font-bold text-black"
            >
              Download
            </a>
          ) : null}
          {canUploadHandoff && !ready ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowUpload((v) => !v)}
              className="h-7 rounded bg-white/10 px-2 text-[10px] font-semibold text-white/80"
            >
              {showUpload ? "Close" : "Upload"}
            </button>
          ) : null}
          {!requireDownloadGate ? (
            <PlatformToggles
              selected={draftPlatforms}
              busy={busy}
              onToggle={toggleDraft}
            />
          ) : null}
          <button
            type="button"
            disabled={
              busy ||
              gateBlocks ||
              (!requireDownloadGate && draftPlatforms.length === 0)
            }
            onClick={markDone}
            className={`h-9 rounded-lg px-3 text-[12px] font-bold disabled:opacity-30 ${
              isAdmin && requireDownloadGate
                ? "bg-emerald-400 text-black"
                : "bg-white/15 text-white"
            }`}
          >
            {busy ? "…" : isAdmin && requireDownloadGate ? "Done" : "Done"}
          </button>
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
  onSaveDescription,
  onAdminToggleReady,
  onHandoffUpload,
}: {
  item: TeamChecklistItemDto;
  dateKey: string;
  busy: boolean;
  isAdmin: boolean;
  canUploadHandoff: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onSaveDescription: (item: TeamChecklistItemDto, description: string) => Promise<void>;
  onAdminToggleReady: (item: TeamChecklistItemDto) => void;
  onHandoffUpload: (
    item: TeamChecklistItemDto,
    payload: {
      format: HandoffFormat;
      fileUrl: string;
      postingNotes: string;
      scheduleNote: string;
    }
  ) => Promise<void>;
}) {
  const done = isItemDone(item, dateKey);
  const status = handoffStatusOf(item);
  const ready = status === "ready";
  const [draftPlatforms, setDraftPlatforms] = useState<ChecklistPlatformId[]>([]);
  const [editing, setEditing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [desc, setDesc] = useState(item.description ?? "");
  const [savingDesc, setSavingDesc] = useState(false);

  useEffect(() => {
    setDraftPlatforms([]);
    setDesc(item.description ?? "");
    setEditing(false);
    setShowUpload(false);
  }, [item.id, dateKey, item.description]);

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
          <HandoffDetails item={item} />
          {canUploadHandoff && !ready && showUpload ? (
            <HandoffUploadForm
              item={item}
              busy={busy}
              onSubmit={(payload) => onHandoffUpload(item, payload)}
            />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {canUploadHandoff && !ready ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowUpload((v) => !v)}
              className="h-7 rounded bg-white/10 px-2 text-[10px] font-semibold text-white/80"
            >
              {showUpload ? "Close" : "Upload"}
            </button>
          ) : null}
          <PlatformToggles
            selected={draftPlatforms}
            busy={busy}
            onToggle={toggleDraft}
          />
          <button
            type="button"
            disabled={busy || draftPlatforms.length === 0}
            onClick={() => onComplete(item, draftPlatforms)}
            className="h-7 rounded bg-cyan-500 px-2 text-[10px] font-semibold text-black disabled:opacity-30"
          >
            {busy ? "…" : "Done"}
          </button>
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

function OutletSection({
  section,
  focusDate,
  busyItemId,
  isAdmin,
  canUploadHandoff,
  onComplete,
  onAdminToggleReady,
  onHandoffUpload,
}: {
  section: OutletBoardSection;
  focusDate: string;
  busyItemId: string | null;
  isAdmin: boolean;
  canUploadHandoff: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onAdminToggleReady: (item: TeamChecklistItemDto) => void;
  onHandoffUpload: (
    item: TeamChecklistItemDto,
    payload: {
      format: HandoffFormat;
      fileUrl: string;
      postingNotes: string;
      scheduleNote: string;
    }
  ) => Promise<void>;
}) {
  const pendingStories = section.stories.filter((s) => !isItemDone(s, s.targetDate ?? focusDate));
  const pendingPosts = section.openPosts;
  const pendingAds = (section.ads ?? []).filter((a) => !isItemDone(a, a.targetDate ?? focusDate));
  const allItems = [...pendingStories, ...pendingPosts, ...pendingAds];
  const allClear = allItems.length === 0;

  if (allClear) {
    return (
      <div className="flex h-9 items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 opacity-45">
        <span className="truncate text-[13px] font-semibold text-white/70">{section.outletLabel}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-300/70">Done</span>
      </div>
    );
  }

  const byDate = new Map<string, TeamChecklistItemDto[]>();
  for (const item of allItems) {
    const key = item.targetDate ?? focusDate;
    const list = byDate.get(key) ?? [];
    list.push(item);
    byDate.set(key, list);
  }
  const dateKeys = [...byDate.keys()].sort();

  const kindRank = (k?: string | null) =>
    k === "stories" ? 0 : k === "posts" ? 1 : k === "ads" ? 2 : 3;

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.035]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
        <h3 className="truncate text-[14px] font-semibold tracking-tight text-white">
          {section.outletLabel}
        </h3>
        <span className="text-[11px] text-white/40">
          {pendingStories.length} story · {pendingPosts.length} post · {pendingAds.length} ad
        </span>
      </div>

      <div className="space-y-1 px-2.5 py-2">
        {dateKeys.map((dateKey) => {
          const rows = (byDate.get(dateKey) ?? []).slice().sort((a, b) => {
            const kr = kindRank(a.kind) - kindRank(b.kind);
            if (kr !== 0) return kr;
            return a.sortOrder - b.sortOrder;
          });
          const urls = rows
            .map((r) => r.handoff?.fileUrl?.trim())
            .filter((u): u is string => Boolean(u));
          const sharedUrl =
            urls.length > 0 && urls.every((u) => u === urls[0]) ? urls[0]! : null;
          const anyReady = rows.some((r) => handoffStatusOf(r) === "ready");

          return (
            <div
              key={dateKey}
              className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1.5"
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-0.5">
                <p className="text-[12px] font-semibold text-white/85">
                  {goLiveGroupTitle(dateKey)}
                </p>
                {sharedUrl && anyReady ? (
                  <a
                    href={`/api/team/download?url=${encodeURIComponent(sharedUrl)}`}
                    className="text-[11px] font-semibold text-cyan-300/90 underline-offset-2 hover:underline"
                  >
                    Download creative
                  </a>
                ) : null}
              </div>
              <div className="divide-y divide-white/[0.05]">
                {rows.map((item) => (
                  <ItemRow
                    key={`${item.id}-${item.targetDate ?? "x"}-${item.kind}`}
                    item={item}
                    dateKey={item.targetDate ?? focusDate}
                    busy={busyItemId === item.id}
                    isAdmin={isAdmin}
                    canUploadHandoff={canUploadHandoff}
                    onComplete={onComplete}
                    onAdminToggleReady={onAdminToggleReady}
                    onHandoffUpload={onHandoffUpload}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AdsOutletSection({
  section,
  focusDate,
  busyItemId,
  isAdmin,
  canUploadHandoff,
  onComplete,
  onSaveDescription,
  onAdminToggleReady,
  onHandoffUpload,
}: {
  section: OutletBoardSection;
  focusDate: string;
  busyItemId: string | null;
  isAdmin: boolean;
  canUploadHandoff: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onSaveDescription: (item: TeamChecklistItemDto, description: string) => Promise<void>;
  onAdminToggleReady: (item: TeamChecklistItemDto) => void;
  onHandoffUpload: (
    item: TeamChecklistItemDto,
    payload: {
      format: HandoffFormat;
      fileUrl: string;
      postingNotes: string;
      scheduleNote: string;
    }
  ) => Promise<void>;
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
            onSaveDescription={onSaveDescription}
            onAdminToggleReady={onAdminToggleReady}
            onHandoffUpload={onHandoffUpload}
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
  const [mode, setMode] = useState<"ready" | "postings" | "ads" | "done">("ready");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [waShare, setWaShare] = useState<{
    title: string;
    count: number;
    message: string;
  } | null>(null);
  const [waFallbackUrl, setWaFallbackUrl] = useState<string | null>(null);

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
    const readyItems = collectReadyItems(board);
    if (readyItems.length === 0) {
      setError("Mark at least one item Ready (green) first.");
      return;
    }
    openWhatsAppMessage(
      buildAllReadyWhatsAppMessage(readyItems),
      readyItems.length,
      "Ready list for WhatsApp"
    );
  };

  const sendWaitNudgeWhatsApp = () => {
    if (isAdmin || !board) return;
    const waitItems = collectWaitItems(board);
    if (waitItems.length === 0) {
      setError("Nothing on Wait — all greens are Ready.");
      return;
    }
    openWhatsAppMessage(
      buildWaitNudgeWhatsAppMessage(waitItems),
      waitItems.length,
      "Need Ready — WhatsApp"
    );
  };

  /** Admin override: wait ↔ ready (WhatsApp approval is offline). */
  const adminToggleReady = async (item: TeamChecklistItemDto) => {
    if (!isAdmin) return;
    const date = item.targetDate ?? focusDate;
    const ready = handoffStatusOf(item) === "ready";
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          handoff: { action: ready ? "clear" : "set-ready" },
        }),
      });
      await readTeamApiJson(res);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ready status");
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
  const postingsCount = countPendingPostings(
    boardOutlets,
    board?.generalPosts ?? [],
    focusDate
  );
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

  const readyCount = board ? collectReadyItems(board).length : 0;
  const waitCount = board ? collectWaitItems(board).length : 0;
  const doneCount = board?.doneItems?.length ?? 0;

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
                    id: "postings" as const,
                    label: "All",
                    Icon: IconPostings,
                    count: postingsCount,
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
                    onClick={() => setMode(t.id)}
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
                  ? "Ready creatives only · Download → wait 1 min → Done. Deadline highlighted."
                  : mode === "postings"
                    ? "Full board. Sat story on Fri = POST TODAY by 11 PM (night before)."
                    : mode === "ads"
                      ? "Ads · start 4 days before go-live · upload sets Ready automatically"
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
                {mode === "postings" ? (
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
            <div className="mb-4 flex gap-0.5 overflow-x-auto rounded-lg bg-white/[0.03] p-0.5">
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

          {mode === "done" ? (
            <section className="overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.03]">
              <div className="border-b border-white/[0.08] px-3 py-2.5">
                <h3 className="text-[14px] font-semibold text-white">Done ({doneCount})</h3>
                <p className="text-[11px] text-white/40">
                  Reopen removes Done and Ready for Amit — it shows again only after a new Ready upload.
                </p>
              </div>
              {doneCount === 0 ? (
                <p className="py-10 text-center text-[13px] text-white/35">Nothing done yet.</p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {(board?.doneItems ?? []).map((d) => {
                    const fileUrl = d.handoff?.fileUrl?.trim() || null;
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
                            <p className="mt-1 text-[15px] font-semibold leading-snug text-white">
                              {readyGoLiveHeadline(d, dateKey)}
                            </p>
                            {d.outletTitle ? (
                              <p className="mt-0.5 text-[12px] text-white/45">{d.outletTitle}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-stretch gap-1.5">
                            {fileUrl ? (
                              <a
                                href={`/api/team/download?url=${encodeURIComponent(fileUrl)}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-cyan-400 px-3 text-[12px] font-bold text-black"
                              >
                                Download
                              </a>
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
                (() => {
                  const readyItems = collectReadyItems(board);
                  if (readyItems.length === 0) {
                    return (
                      <p className="py-10 text-center text-[13px] text-white/35">
                        Nothing Ready yet — when Mahesh/Jeslyn upload, it shows here with Download + deadline.
                      </p>
                    );
                  }
                  return (
                    <section className="overflow-hidden rounded-xl border border-emerald-400/25 bg-emerald-400/[0.04]">
                      <div className="border-b border-emerald-400/20 px-3 py-2.5">
                        <h3 className="text-[14px] font-semibold text-emerald-100">
                          Ready to post ({readyItems.length})
                        </h3>
                        <p className="text-[11px] text-white/40">
                          Date · day · Story/Post/Ad · Download · deadline. Amit: Done after Download + 1 min. Admin: Done anytime.
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
                            onHandoffUpload={submitHandoffUpload}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })()
              ) : mode === "postings" ? (
                <>
                  {outlets.map((section) => (
                    <OutletSection
                      key={section.outletId}
                      section={section}
                      focusDate={focusDate}
                      busyItemId={busyItemId}
                      isAdmin={isAdmin}
                      canUploadHandoff={canUploadHandoff}
                      onComplete={markComplete}
                      onAdminToggleReady={adminToggleReady}
                      onHandoffUpload={submitHandoffUpload}
                    />
                  ))}

                  {(board.generalPosts?.length ?? 0) > 0 ? (
                    <section className="overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.035]">
                      <div className="border-b border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
                        <h3 className="text-[14px] font-semibold tracking-tight text-white">
                          General posts
                        </h3>
                      </div>
                      <div className="divide-y divide-white/[0.06] px-2.5 py-1">
                        {board.generalPosts.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            dateKey={focusDate}
                            busy={busyItemId === item.id}
                            isAdmin={isAdmin}
                            canUploadHandoff={canUploadHandoff}
                            onComplete={markComplete}
                            onHandoffUpload={submitHandoffUpload}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : (
                outlets.map((section) => (
                  <AdsOutletSection
                    key={section.outletId}
                    section={section}
                    focusDate={focusDate}
                    busyItemId={busyItemId}
                    isAdmin={isAdmin}
                    canUploadHandoff={canUploadHandoff}
                    onComplete={markComplete}
                    onSaveDescription={saveAdDescription}
                    onAdminToggleReady={adminToggleReady}
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
                disabled={readyCount === 0}
                title={
                  readyCount === 0
                    ? "Flip items to Ready (green) first"
                    : `Send ${readyCount} ready item${readyCount === 1 ? "" : "s"} on WhatsApp`
                }
                className="text-[13px] font-medium text-[#25D366]/80 underline decoration-[#25D366]/35 underline-offset-4 hover:text-[#25D366] disabled:cursor-not-allowed disabled:text-white/25 disabled:no-underline"
              >
                WhatsApp ready list
                {readyCount > 0 ? ` (${readyCount})` : ""}
              </button>
            ) : (
              <button
                type="button"
                onClick={sendWaitNudgeWhatsApp}
                disabled={waitCount === 0}
                title={
                  waitCount === 0
                    ? "No Wait items — everything Ready"
                    : `Ping HQ about ${waitCount} not-ready item${waitCount === 1 ? "" : "s"}`
                }
                className="text-[13px] font-medium text-[#25D366]/80 underline decoration-[#25D366]/35 underline-offset-4 hover:text-[#25D366] disabled:cursor-not-allowed disabled:text-white/25 disabled:no-underline"
              >
                WhatsApp need ready
                {waitCount > 0 ? ` (${waitCount})` : ""}
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
