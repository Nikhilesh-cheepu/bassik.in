"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CHECKLIST_PLATFORM_IDS,
  CHECKLIST_PLATFORM_LABELS,
  getTodayKey,
  type ChecklistBoardDto,
  type ChecklistPlatformId,
  type OutletBoardSection,
  type TeamChecklistItemDto,
} from "@/lib/team-checklists";
import { CHECKLIST_DEFAULT_OWNER_ID } from "@/lib/team-checklist-templates";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";
import {
  IconAds,
  IconGoogle,
  IconLinkedin,
  IconMeta,
  IconNotes,
  IconPostings,
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
  viewerId: string;
  members: Member[];
};

function isItemDone(item: TeamChecklistItemDto, dateKey: string): boolean {
  if (item.kind === "posts" && item.dayOfWeek) {
    return Boolean(item.completionsByDate[item.targetDate ?? dateKey]);
  }
  if (item.kind === "posts") return Object.keys(item.completionsByDate).length > 0;
  return Boolean(item.completionsByDate[dateKey]);
}

function ItemRow({
  item,
  dateKey,
  busy,
  onComplete,
}: {
  item: TeamChecklistItemDto;
  dateKey: string;
  busy: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
}) {
  const [draftPlatforms, setDraftPlatforms] = useState<ChecklistPlatformId[]>([]);

  useEffect(() => {
    setDraftPlatforms([]);
  }, [item.id, dateKey]);

  const toggleDraft = (platform: ChecklistPlatformId) => {
    setDraftPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  return (
    <div className="py-1">
      <div className="flex min-h-9 items-center gap-2">
        <div className="min-w-0 flex-1 truncate">
          <span className="text-[13px] font-medium text-white/88">{item.title}</span>
          {item.isOverdue ? (
            <span className="ml-1.5 text-[10px] font-medium uppercase text-amber-300/75">Overdue</span>
          ) : null}
          {item.dueLabel ? (
            <span className="ml-1.5 text-[11px] text-white/30">{item.dueLabel}</span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
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

function AdItemRow({
  item,
  dateKey,
  busy,
  isAdmin,
  onComplete,
  onSaveDescription,
}: {
  item: TeamChecklistItemDto;
  dateKey: string;
  busy: boolean;
  isAdmin: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onSaveDescription: (item: TeamChecklistItemDto, description: string) => Promise<void>;
}) {
  const done = isItemDone(item, dateKey);
  const [draftPlatforms, setDraftPlatforms] = useState<ChecklistPlatformId[]>([]);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description ?? "");
  const [savingDesc, setSavingDesc] = useState(false);

  useEffect(() => {
    setDraftPlatforms([]);
    setDesc(item.description ?? "");
    setEditing(false);
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
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13px] font-medium text-white/90">{item.title}</span>
            {item.dueLabel ? <span className="text-[11px] text-white/30">{item.dueLabel}</span> : null}
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
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
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

function OutletSection({
  section,
  focusDate,
  busyItemId,
  onComplete,
}: {
  section: OutletBoardSection;
  focusDate: string;
  busyItemId: string | null;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
}) {
  const pendingStories = section.stories.filter((s) => !isItemDone(s, s.targetDate ?? focusDate));
  const pendingPosts = section.openPosts;
  const allClear = pendingStories.length === 0 && pendingPosts.length === 0;

  const [tab, setTab] = useState<"story" | "post">(() =>
    pendingStories.length === 0 && pendingPosts.length > 0 ? "post" : "story"
  );

  useEffect(() => {
    if (pendingStories.length === 0 && pendingPosts.length > 0) setTab("post");
    else if (pendingPosts.length === 0 && pendingStories.length > 0) setTab("story");
  }, [pendingStories.length, pendingPosts.length]);

  if (allClear) {
    return (
      <div className="flex h-9 items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 opacity-45">
        <span className="truncate text-[13px] font-semibold text-white/70">{section.outletLabel}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-300/70">Done</span>
      </div>
    );
  }

  const showStoryTab = pendingStories.length > 0;
  const showPostTab = pendingPosts.length > 0;
  const showTabs = showStoryTab && showPostTab;
  const activeTab = showTabs ? tab : showPostTab ? "post" : "story";
  const rows = activeTab === "post" ? pendingPosts : pendingStories;

  return (
    <section className="overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.035]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
        <h3 className="truncate text-[14px] font-semibold tracking-tight text-white">
          {section.outletLabel}
        </h3>
        {showTabs ? (
          <div className="flex rounded-md bg-black/30 p-0.5">
            <button
              type="button"
              onClick={() => setTab("story")}
              className={`h-6 rounded px-2 text-[10px] font-semibold ${
                activeTab === "story" ? "bg-white/12 text-white" : "text-white/35"
              }`}
            >
              Story {pendingStories.length}
            </button>
            <button
              type="button"
              onClick={() => setTab("post")}
              className={`h-6 rounded px-2 text-[10px] font-semibold ${
                activeTab === "post" ? "bg-white/12 text-white" : "text-white/35"
              }`}
            >
              Post {pendingPosts.length}
            </button>
          </div>
        ) : (
          <span className="rounded-md bg-black/25 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
            {showPostTab ? "Post" : "Story"}
          </span>
        )}
      </div>

      <div className="divide-y divide-white/[0.06] px-2.5 py-1">
        {rows.map((item) => (
          <ItemRow
            key={`${item.id}-${item.targetDate ?? "post"}`}
            item={item}
            dateKey={item.targetDate ?? focusDate}
            busy={busyItemId === item.id}
            onComplete={onComplete}
          />
        ))}
      </div>
    </section>
  );
}

function AdsOutletSection({
  section,
  focusDate,
  busyItemId,
  isAdmin,
  onComplete,
  onSaveDescription,
}: {
  section: OutletBoardSection;
  focusDate: string;
  busyItemId: string | null;
  isAdmin: boolean;
  onComplete: (item: TeamChecklistItemDto, platforms: ChecklistPlatformId[]) => void;
  onSaveDescription: (item: TeamChecklistItemDto, description: string) => Promise<void>;
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
            onComplete={onComplete}
            onSaveDescription={onSaveDescription}
          />
        ))}
      </div>
    </section>
  );
}

export default function TeamTasksView({ isAdmin, viewerId, members }: TeamTasksViewProps) {
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
  const [mode, setMode] = useState<"postings" | "ads">("postings");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const today = todayKey;
  const weekDays = board?.day.weekDays ?? [];

  useEffect(() => {
    const t = getTodayKey();
    setTodayKey(t);
    setFocusDate(t);
  }, []);

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

  const saveAdDescription = async (item: TeamChecklistItemDto, description: string) => {
    const res = await fetch(`/api/team/checklist-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    await readTeamApiJson(res);
    await loadBoard();
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
            <div className="flex min-w-0 flex-1 rounded-xl bg-white/[0.06] p-1 ring-1 ring-white/10">
              {(
                [
                  {
                    id: "postings" as const,
                    label: "Postings",
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
                ] as const
              ).map((t) => {
                const on = mode === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMode(t.id)}
                    className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition ${
                      on ? t.active : t.idle
                    }`}
                  >
                    <t.Icon className="h-4 w-4" />
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
                {mode === "postings"
                  ? "Stories + weekend posts · Meta · YT · Google · LinkedIn · X"
                  : "Fri/Sat/Sun ads on Mon/Tue/Wed · edit brief anytime"}
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

          <div className="mb-4 flex gap-0.5 overflow-x-auto rounded-lg bg-white/[0.03] p-0.5">
            {(weekDays.length > 0
              ? weekDays
              : [{ date: today, dayId: "mon" as const, dayLabel: "Today", dateLabel: today, isToday: true }]
            ).map((d) => {
              const selected = focusDate === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setFocusDate(d.date)}
                  className={`flex min-h-[44px] min-w-[3.5rem] flex-1 flex-col items-center justify-center rounded-md px-1.5 ${
                    selected ? "bg-white/10 text-white" : "text-white/40 hover:text-white/65"
                  }`}
                >
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

          {!board || (outlets.length === 0 && (board.generalPosts?.length ?? 0) === 0) ? (
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
              {mode === "postings" ? (
                <>
                  {outlets.map((section) => (
                    <OutletSection
                      key={section.outletId}
                      section={section}
                      focusDate={focusDate}
                      busyItemId={busyItemId}
                      onComplete={markComplete}
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
                            onComplete={markComplete}
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
                    onComplete={markComplete}
                    onSaveDescription={saveAdDescription}
                  />
                ))
              )}
            </div>
          )}
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
    </div>
  );
}
