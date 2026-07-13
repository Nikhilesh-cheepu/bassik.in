"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CHECKLIST_DAY_IDS,
  CHECKLIST_DAY_LABELS,
  CHECKLIST_PLATFORM_IDS,
  CHECKLIST_PLATFORM_LABELS,
  getCurrentWeekMeta,
  itemDateKeyForWeek,
  type ChecklistDayId,
  type ChecklistPlatformId,
  type TeamChecklistItemDto,
  type TeamDailyChecklistDto,
  type WeekMeta,
} from "@/lib/team-checklists";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

type TeamApiJson = Record<string, unknown>;

function teamApiError(data: TeamApiJson, fallback: string): string {
  return typeof data.error === "string" ? data.error : fallback;
}

function teamApiArray<T>(data: TeamApiJson, key: string): T[] {
  const value = data[key];
  return Array.isArray(value) ? (value as T[]) : [];
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
    throw new Error(
      res.ok ? "Invalid server response" : `Server error (${res.status}) — try refreshing`
    );
  }
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

type Member = { id: string; name: string };

type TeamTasksViewProps = {
  isAdmin: boolean;
  viewerId: string;
  members: Member[];
};

type DraftItem = {
  key: string;
  title: string;
  dayOfWeek: ChecklistDayId | "";
  platforms: ChecklistPlatformId[];
  instructions: string;
};

function emptyDraftItems(): DraftItem[] {
  return CHECKLIST_DAY_IDS.slice(0, 5).map((day, i) => ({
    key: `d-${day}-${i}`,
    title: `${CHECKLIST_DAY_LABELS[day]} Flyer`,
    dayOfWeek: day,
    platforms: ["instagram", "facebook"],
    instructions: "",
  }));
}

function itemIsComplete(item: TeamChecklistItemDto, dateKey: string): boolean {
  return Boolean(item.completionsByDate[dateKey]);
}

function itemPlatformsDone(item: TeamChecklistItemDto, dateKey: string): string[] {
  return item.completionsByDate[dateKey]?.completedPlatforms ?? [];
}

function dayLabel(dayOfWeek: string | null): string {
  if (dayOfWeek && dayOfWeek in CHECKLIST_DAY_LABELS) {
    return CHECKLIST_DAY_LABELS[dayOfWeek as ChecklistDayId];
  }
  return "Any day";
}

export default function TeamTasksView({ isAdmin, viewerId, members }: TeamTasksViewProps) {
  const [checklists, setChecklists] = useState<TeamDailyChecklistDto[]>([]);
  const [week, setWeek] = useState<WeekMeta>(() => getCurrentWeekMeta());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);
  const [manageMemberId, setManageMemberId] = useState(() => {
    if (!isAdmin) return viewerId;
    return members.find((m) => m.id === "amit")?.id ?? members[0]?.id ?? viewerId;
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formOwnerId, setFormOwnerId] = useState(manageMemberId);
  const [formDescription, setFormDescription] = useState("");
  const [formItems, setFormItems] = useState<DraftItem[]>(emptyDraftItems);

  const loadChecklists = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (isAdmin && manageMemberId) qs.set("manageMemberId", manageMemberId);
      const res = await fetch(`/api/team/checklists?${qs}`);
      const data = await readTeamApiJson(res);
      setChecklists(teamApiArray<TeamDailyChecklistDto>(data, "checklists"));
      if (data.week && typeof data.week === "object") {
        setWeek(data.week as WeekMeta);
      } else {
        setWeek(getCurrentWeekMeta());
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load checklists");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, manageMemberId]);

  useEffect(() => {
    setLoading(true);
    void loadChecklists();
  }, [loadChecklists]);

  useEffect(() => {
    if (!isAdmin) return;
    setFormOwnerId(manageMemberId);
  }, [isAdmin, manageMemberId]);

  const openCreate = () => {
    setFormTitle("");
    setFormDescription("");
    setFormOwnerId(manageMemberId || members.find((m) => m.id === "amit")?.id || members[0]?.id || "");
    setFormItems(emptyDraftItems());
    setEditorOpen(true);
  };

  const createChecklist = async () => {
    if (!formTitle.trim() || !formOwnerId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/team/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: formOwnerId,
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          items: formItems
            .filter((i) => i.title.trim())
            .map((i) => ({
              title: i.title.trim(),
              dayOfWeek: i.dayOfWeek || undefined,
              platforms: i.platforms,
              instructions: i.instructions.trim() || undefined,
            })),
        }),
      });
      await readTeamApiJson(res);
      setEditorOpen(false);
      if (isAdmin) setManageMemberId(formOwnerId);
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create checklist");
    } finally {
      setSaving(false);
    }
  };

  const deleteChecklist = async (id: string) => {
    if (!window.confirm("Delete this outlet checklist?")) return;
    try {
      const res = await fetch(`/api/team/checklists/${id}`, { method: "DELETE" });
      await readTeamApiJson(res);
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const togglePlatform = async (item: TeamChecklistItemDto, platform: ChecklistPlatformId) => {
    const date = itemDateKeyForWeek(item.dayOfWeek, week);
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, togglePlatform: platform }),
      });
      await readTeamApiJson(res);
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update platform");
    } finally {
      setBusyItemId(null);
    }
  };

  const markComplete = async (item: TeamChecklistItemDto) => {
    const date = itemDateKeyForWeek(item.dayOfWeek, week);
    const currentlyDone = itemIsComplete(item, date);
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/team/checklist-items/${item.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, markComplete: !currentlyDone }),
      });
      await readTeamApiJson(res);
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyItemId(null);
    }
  };

  const assigneeOptions = useMemo(() => {
    const list = [...members];
    if (!list.some((m) => m.id === "admin")) {
      // admin can assign to members only; keep members list
    }
    return list;
  }, [members]);

  if (loading) {
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
        <div className="mx-auto max-w-3xl py-5 xl:py-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-white xl:text-2xl">{week.label}</h2>
              <p className="mt-0.5 text-[13px] text-white/45">{week.dates}</p>
            </div>
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={manageMemberId}
                  onChange={(e) => setManageMemberId(e.target.value)}
                  className="h-9 rounded-lg border border-white/10 bg-black/40 px-2 text-[13px] text-white outline-none"
                  aria-label="View checklists for"
                >
                  {assigneeOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openCreate}
                  className="h-9 rounded-lg bg-cyan-500 px-3 text-[13px] font-semibold text-black"
                >
                  + Checklist
                </button>
              </div>
            ) : null}
          </div>

          {checklists.length === 0 ? (
            <div className="border-y border-white/[0.06] py-16 text-center">
              <p className="text-[15px] text-white/40">No checklists this week</p>
              <p className="mt-1 text-[13px] text-white/28">
                {isAdmin
                  ? "Create an outlet checklist for Amit or another teammate."
                  : "Your team lead will assign weekly outlet checklists here."}
              </p>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-5 rounded-full bg-cyan-500/20 px-5 py-2.5 text-[14px] font-medium text-cyan-200"
                >
                  Create checklist for {assigneeOptions.find((m) => m.id === manageMemberId)?.name ?? "teammate"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-8">
              {checklists.map((checklist) => (
                <section key={checklist.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-[17px] font-semibold text-white/95">{checklist.title}</h3>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => void deleteChecklist(checklist.id)}
                        className="text-[12px] text-red-300/70 hover:text-red-200"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                  {checklist.description ? (
                    <p className="mb-3 text-[13px] text-white/40">{checklist.description}</p>
                  ) : null}

                  <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                    {checklist.items.map((item) => {
                      const dateKey = itemDateKeyForWeek(item.dayOfWeek, week);
                      const done = itemIsComplete(item, dateKey);
                      const donePlatforms = itemPlatformsDone(item, dateKey);
                      const platforms =
                        item.platforms.length > 0
                          ? item.platforms.filter((p): p is ChecklistPlatformId =>
                              (CHECKLIST_PLATFORM_IDS as readonly string[]).includes(p)
                            )
                          : [...CHECKLIST_PLATFORM_IDS];
                      const notes = item.instructions?.trim() || item.description?.trim() || "";
                      const busy = busyItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`px-1 py-3.5 transition ${done ? "bg-emerald-500/[0.04]" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-medium uppercase tracking-wide text-white/35">
                                  {dayLabel(item.dayOfWeek)}
                                </span>
                                <h4
                                  className={`text-[15px] font-medium ${
                                    done ? "text-white/50 line-through" : "text-white/92"
                                  }`}
                                >
                                  {item.title}
                                </h4>
                                {notes ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowInstructions(showInstructions === item.id ? null : item.id)
                                    }
                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[11px] text-cyan-300/90"
                                    aria-label="Instructions"
                                  >
                                    i
                                  </button>
                                ) : null}
                              </div>

                              {showInstructions === item.id && notes ? (
                                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/55">
                                  {notes}
                                </p>
                              ) : null}

                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {platforms.map((platform) => {
                                  const on = donePlatforms.includes(platform);
                                  return (
                                    <button
                                      key={platform}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => void togglePlatform(item, platform)}
                                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition disabled:opacity-50 ${
                                        on
                                          ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-100"
                                          : "border-white/12 bg-transparent text-white/55 hover:border-white/25"
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
                              onClick={() => void markComplete(item)}
                              className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold disabled:opacity-50 ${
                                done
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
                              }`}
                            >
                              {done ? "Done" : "Complete"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {editorOpen && isAdmin ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setEditorOpen(false)}>
          <div
            className={`${TEAM_SHEET_PANEL} max-h-[90dvh] max-w-lg space-y-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-white/20 xl:hidden" />
            <h2 className="text-base font-semibold text-white">New checklist</h2>
            <p className="text-[12px] text-white/40">Assign weekly outlet tasks with platform tracking.</p>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Assignee</label>
              <select
                value={formOwnerId}
                onChange={(e) => setFormOwnerId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none"
              >
                {assigneeOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Outlet / title</label>
              <select
                value={TEAM_AD_OUTLETS.some((o) => o.label === formTitle) ? formTitle : ""}
                onChange={(e) => {
                  if (e.target.value) setFormTitle(e.target.value);
                }}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value="">Custom title…</option>
                {TEAM_AD_OUTLETS.map((o) => (
                  <option key={o.id} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Komma"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Notes</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Optional checklist notes"
                className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/35">Daily items</p>
                <button
                  type="button"
                  onClick={() =>
                    setFormItems((prev) => [
                      ...prev,
                      {
                        key: `extra-${Date.now()}`,
                        title: "",
                        dayOfWeek: "",
                        platforms: ["instagram"],
                        instructions: "",
                      },
                    ])
                  }
                  className="text-[12px] text-cyan-300"
                >
                  + Item
                </button>
              </div>
              <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                {formItems.map((item, idx) => (
                  <div key={item.key} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="flex gap-2">
                      <input
                        value={item.title}
                        onChange={(e) =>
                          setFormItems((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, title: e.target.value } : row))
                          )
                        }
                        placeholder="Task title"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white outline-none"
                      />
                      <select
                        value={item.dayOfWeek}
                        onChange={(e) =>
                          setFormItems((prev) =>
                            prev.map((row, i) =>
                              i === idx
                                ? { ...row, dayOfWeek: e.target.value as ChecklistDayId | "" }
                                : row
                            )
                          )
                        }
                        className="w-[7.5rem] rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs text-white outline-none"
                      >
                        <option value="">Any day</option>
                        {CHECKLIST_DAY_IDS.map((d) => (
                          <option key={d} value={d}>
                            {CHECKLIST_DAY_LABELS[d].slice(0, 3)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {CHECKLIST_PLATFORM_IDS.map((p) => {
                        const on = item.platforms.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() =>
                              setFormItems((prev) =>
                                prev.map((row, i) =>
                                  i === idx
                                    ? {
                                        ...row,
                                        platforms: on
                                          ? row.platforms.filter((x) => x !== p)
                                          : [...row.platforms, p],
                                      }
                                    : row
                                )
                              )
                            }
                            className={`rounded-md px-2 py-1 text-[11px] ${
                              on ? "bg-cyan-500/20 text-cyan-100" : "bg-white/5 text-white/40"
                            }`}
                          >
                            {CHECKLIST_PLATFORM_LABELS[p]}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      value={item.instructions}
                      onChange={(e) =>
                        setFormItems((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, instructions: e.target.value } : row))
                        )
                      }
                      placeholder="Instructions (optional)"
                      className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[12px] text-white outline-none placeholder:text-white/25"
                    />
                    <button
                      type="button"
                      onClick={() => setFormItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="mt-2 text-[11px] text-red-300/70"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditorOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !formTitle.trim() || !formOwnerId}
                onClick={() => void createChecklist()}
                className="min-h-[44px] flex-1 rounded-xl bg-cyan-500 text-sm font-semibold text-black disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
