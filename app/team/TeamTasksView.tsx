"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CHECKLIST_PLATFORM_IDS,
  CHECKLIST_PLATFORM_LABELS,
  getTodayKey,
  type ChecklistBoardDto,
  type ChecklistPlatformId,
  type TeamChecklistItemDto,
} from "@/lib/team-checklists";
import { CHECKLIST_DEFAULT_OWNER_ID } from "@/lib/team-checklist-templates";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

type TeamApiJson = Record<string, unknown>;

function teamApiError(data: TeamApiJson, fallback: string): string {
  return typeof data.error === "string" ? data.error : fallback;
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

function platformsDone(item: TeamChecklistItemDto, dateKey: string): string[] {
  if (item.kind === "posts") {
    const first = Object.values(item.completionsByDate)[0];
    return first?.completedPlatforms ?? [];
  }
  return item.completionsByDate[dateKey]?.completedPlatforms ?? [];
}

function isItemDone(item: TeamChecklistItemDto, dateKey: string): boolean {
  if (item.kind === "posts") return Object.keys(item.completionsByDate).length > 0;
  return Boolean(item.completionsByDate[dateKey]);
}

function ItemRow({
  item,
  dateKey,
  busy,
  onTogglePlatform,
  onComplete,
  showOutlet,
}: {
  item: TeamChecklistItemDto;
  dateKey: string;
  busy: boolean;
  onTogglePlatform: (item: TeamChecklistItemDto, p: ChecklistPlatformId) => void;
  onComplete: (item: TeamChecklistItemDto) => void;
  showOutlet?: boolean;
}) {
  const done = isItemDone(item, dateKey);
  const donePlatforms = platformsDone(item, dateKey);
  const notes = item.instructions?.trim() || item.description?.trim() || "";
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className={`px-1 py-3.5 ${done ? "bg-emerald-500/[0.04]" : ""} ${item.isOverdue ? "bg-amber-500/[0.04]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showOutlet && item.outletTitle ? (
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/35">
              {item.outletTitle.replace(/ Stories$/i, "")}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-[15px] font-medium ${done ? "text-white/45 line-through" : "text-white/92"}`}>
              {item.title}
            </h4>
            {notes ? (
              <button
                type="button"
                onClick={() => setShowNotes((v) => !v)}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[11px] text-cyan-300/90"
                aria-label="Details"
              >
                i
              </button>
            ) : null}
          </div>
          {item.dueLabel ? (
            <p className={`mt-0.5 text-[12px] ${item.isOverdue ? "text-amber-200/80" : "text-white/35"}`}>
              {item.dueLabel}
              {item.isOverdue ? " · overdue" : ""}
            </p>
          ) : null}
          {showNotes && notes ? (
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/55">{notes}</p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {CHECKLIST_PLATFORM_IDS.map((platform) => {
              const on = donePlatforms.includes(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  disabled={busy}
                  onClick={() => onTogglePlatform(item, platform)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] disabled:opacity-50 ${
                    on
                      ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-100"
                      : "border-white/12 text-white/55 hover:border-white/25"
                  }`}
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border ${
                      on ? "border-cyan-300 bg-cyan-400 text-black" : "border-white/35"
                    }`}
                  >
                    {on ? (
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </span>
                  {CHECKLIST_PLATFORM_LABELS[platform]}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onComplete(item)}
          className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-50 ${
            done ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
          }`}
        >
          {done ? "Done" : "Complete"}
        </button>
      </div>
    </div>
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

  const today = todayKey;
  const yesterday = board?.day.yesterday ?? "";
  const tomorrow = board?.day.tomorrow ?? "";

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
    setLoading(true);
    void loadBoard();
  }, [loadBoard, focusDate]);

  const togglePlatform = async (item: TeamChecklistItemDto, platform: ChecklistPlatformId) => {
    const date = item.targetDate ?? focusDate;
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, togglePlatform: platform }),
      });
      await readTeamApiJson(res);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyItemId(null);
    }
  };

  const markComplete = async (item: TeamChecklistItemDto) => {
    const date = item.targetDate ?? focusDate;
    const done = isItemDone(item, date);
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, markComplete: !done }),
      });
      await readTeamApiJson(res);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyItemId(null);
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
        <div className="mx-auto max-w-3xl py-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-white">Stories & Posts</h2>
              <p className="mt-0.5 text-[13px] text-white/45">
                Stories due day-before 10 PM · Posts when ready · IG + YT
              </p>
            </div>
            {isAdmin ? (
              <div className="flex flex-wrap gap-2">
                <select
                  value={manageMemberId}
                  onChange={(e) => setManageMemberId(e.target.value)}
                  className="h-9 rounded-lg border border-white/10 bg-black/40 px-2 text-[13px] text-white"
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
                  className="h-9 rounded-lg border border-white/15 px-3 text-[13px] text-white/80"
                >
                  Outlets
                </button>
                <button
                  type="button"
                  onClick={() => setPostOpen(true)}
                  className="h-9 rounded-lg bg-cyan-500 px-3 text-[13px] font-semibold text-black"
                >
                  + Post
                </button>
              </div>
            ) : null}
          </div>

          <div className="mb-5 flex gap-1 rounded-xl bg-white/[0.04] p-1">
            {[
              { key: yesterday, label: "Yesterday" },
              { key: today, label: "Today" },
              { key: tomorrow, label: "Tomorrow" },
            ].map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => d.key && setFocusDate(d.key)}
                className={`min-h-[36px] flex-1 rounded-lg text-[13px] font-medium ${
                  focusDate === d.key ? "bg-white/12 text-white" : "text-white/45"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {!board ||
          (board.enabledOutletIds.length === 0 &&
            board.openPosts.length === 0 &&
            !board.habit) ? (
            <div className="border-y border-white/[0.06] py-14 text-center">
              <p className="text-[15px] text-white/40">No outlets enabled yet</p>
              <p className="mt-1 text-[13px] text-white/28">
                {isAdmin
                  ? "Enable outlets to seed Mon–Sun Stories for Amit."
                  : "Your lead will enable outlet Stories here."}
              </p>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setOutletsOpen(true)}
                  className="mt-5 rounded-full bg-cyan-500/20 px-5 py-2.5 text-[14px] font-medium text-cyan-200"
                >
                  Enable outlets
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-8">
              {focusDate === today && board.overdueStories.length > 0 ? (
                <section>
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-amber-200/80">
                    Overdue stories
                  </h3>
                  <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                    {board.overdueStories.map((item) => (
                      <ItemRow
                        key={`${item.id}-${item.targetDate}`}
                        item={item}
                        dateKey={item.targetDate ?? focusDate}
                        busy={busyItemId === item.id}
                        onTogglePlatform={togglePlatform}
                        onComplete={markComplete}
                        showOutlet
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-white/40">
                  Stories · {board.day.label}
                </h3>
                {board.focusStories.length === 0 ? (
                  <p className="text-[13px] text-white/30">No stories for this day.</p>
                ) : (
                  <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                    {board.focusStories.map((item) => (
                      <ItemRow
                        key={`${item.id}-${item.targetDate}`}
                        item={item}
                        dateKey={item.targetDate ?? focusDate}
                        busy={busyItemId === item.id}
                        onTogglePlatform={togglePlatform}
                        onComplete={markComplete}
                        showOutlet
                      />
                    ))}
                  </div>
                )}
              </section>

              {board.habit ? (
                <section>
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-white/40">
                    Daily habit
                  </h3>
                  <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                    <ItemRow
                      item={board.habit}
                      dateKey={focusDate}
                      busy={busyItemId === board.habit.id}
                      onTogglePlatform={togglePlatform}
                      onComplete={markComplete}
                    />
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-white/40">
                  Posts ready
                </h3>
                {board.openPosts.length === 0 ? (
                  <p className="text-[13px] text-white/30">
                    {isAdmin ? "Add a post when creatives are ready." : "Nothing queued."}
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                    {board.openPosts.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        dateKey={focusDate}
                        busy={busyItemId === item.id}
                        onTogglePlatform={togglePlatform}
                        onComplete={markComplete}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {outletsOpen && isAdmin ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setOutletsOpen(false)}>
          <div className={`${TEAM_SHEET_PANEL} max-w-lg`} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-white">Enable outlets</h2>
            <p className="mt-1 text-[12px] text-white/40">
              Turns on Mon–Sun Stories (due day-before 10 PM) for{" "}
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
            <p className="text-[12px] text-white/40">Amit will see this until he marks Done (IG + YT).</p>
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
              <option value="">Any outlet</option>
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
    </div>
  );
}
