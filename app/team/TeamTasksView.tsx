"use client";

import { useState, useEffect, useCallback } from "react";
import type { TeamDailyChecklistDto } from "@/lib/team-checklists";

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

type TeamTasksViewProps = {
  isAdmin: boolean;
  viewerId: string;
  members: Array<{ id: string; name: string }>;
};

const PLATFORMS = ["Instagram", "YouTube", "LinkedIn", "Facebook", "Twitter"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getWeekDates() {
  if (typeof window === 'undefined') {
    return {
      label: 'This Week',
      dates: '',
    };
  }
  
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const monthName = monday.toLocaleString('en-US', { month: 'long' });
  const weekNum = Math.ceil(monday.getDate() / 7);
  
  return {
    label: `${monthName.toUpperCase()} Week ${weekNum}`,
    dates: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  };
}

export default function TeamTasksView({ isAdmin, viewerId, members }: TeamTasksViewProps) {
  const [checklists, setChecklists] = useState<TeamDailyChecklistDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);

  const loadChecklists = useCallback(async () => {
    try {
      const res = await fetch("/api/team/checklists");
      if (!res.ok) {
        const data = await readTeamApiJson(res);
        throw new Error(teamApiError(data, "Failed to load tasks"));
      }
      const data = await readTeamApiJson(res);
      setChecklists(teamApiArray<TeamDailyChecklistDto>(data, "checklists"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChecklists();
  }, [loadChecklists]);

  const togglePlatform = async (itemId: string, platform: string) => {
    // Will implement API call to toggle platform completion
    console.log("Toggle platform:", itemId, platform);
  };

  const markComplete = async (itemId: string) => {
    try {
      const res = await fetch(`/api/team/checklist-items/${itemId}/complete`, {
        method: "POST",
      });
      if (res.ok) await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-cyan-400" />
      </div>
    );
  }

  const week = getWeekDates();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#06060a]">
      {error ? (
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <div className="mx-auto max-w-5xl py-6">
          {/* Week Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">{week.label}</h2>
            <p className="text-sm text-white/50">{week.dates}</p>
          </div>

          {/* Outlets and Daily Tasks */}
          {checklists.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
              <p className="text-sm text-white/40">No tasks scheduled this week</p>
              <p className="mt-1 text-xs text-white/30">
                Team leader can create daily checklists
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {checklists.map((checklist) => (
                <div key={checklist.id}>
                  <h3 className="mb-3 text-lg font-semibold text-white">
                    {checklist.title}
                  </h3>
                  <div className="space-y-3">
                    {checklist.items.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 transition ${
                          item.completedToday
                            ? "border-green-500/30 bg-green-500/5"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-base font-medium text-white">
                                {item.title}
                              </h4>
                              {item.description && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowInstructions(
                                      showInstructions === item.id ? null : item.id
                                    )
                                  }
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-300 hover:bg-cyan-500/30"
                                  title="View instructions"
                                >
                                  ℹ
                                </button>
                              )}
                            </div>

                            {showInstructions === item.id && item.description && (
                              <div className="mt-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                                <p className="font-medium text-cyan-200">Instructions:</p>
                                <p className="mt-1">{item.description}</p>
                              </div>
                            )}

                            {/* Platform Checkboxes */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {PLATFORMS.map((platform) => (
                                <button
                                  key={platform}
                                  type="button"
                                  onClick={() => togglePlatform(item.id, platform)}
                                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                                    false // Will track platform completion state
                                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-200"
                                      : "border-white/20 bg-white/5 text-white/70 hover:border-white/30"
                                  }`}
                                >
                                  <div
                                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                                      false
                                        ? "border-cyan-400 bg-cyan-400"
                                        : "border-white/40"
                                    }`}
                                  >
                                    {false && (
                                      <svg
                                        className="h-3 w-3 text-black"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={3}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                  {platform}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Complete Button */}
                          <button
                            type="button"
                            onClick={() => void markComplete(item.id)}
                            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                              item.completedToday
                                ? "bg-green-500/20 text-green-300"
                                : "bg-cyan-500 text-white hover:bg-cyan-600"
                            }`}
                          >
                            {item.completedToday ? "✓ Complete" : "Mark Complete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
