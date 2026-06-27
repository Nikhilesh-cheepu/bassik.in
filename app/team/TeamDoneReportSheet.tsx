"use client";

import { useEffect, useMemo, useState } from "react";
import { openWhatsAppShareUrl } from "@/lib/open-whatsapp";
import { teamMemberName } from "@/lib/team-members";
import { teamOutletLabel } from "@/lib/team-outlets";
import {
  formatTeamCompletedDayLabel,
  formatTeamRecordDateTime,
  teamTaskCompletedDayKey,
} from "@/lib/team-tasks";
import { IconWhatsApp } from "./TeamIcons";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

type DoneTask = {
  id: string;
  title: string;
  outletId: string;
  assigneeId: string;
  completedAt: string | null;
};

type DateGroup = {
  key: string;
  label: string;
  tasks: DoneTask[];
};

function teamFilterChip(active: boolean) {
  return `shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition ${
    active
      ? "bg-emerald-500/20 text-emerald-100 ring-emerald-400/35"
      : "bg-white/[0.04] text-white/50 ring-white/10 hover:bg-white/[0.07]"
  }`;
}

export default function TeamDoneReportSheet({
  open,
  onClose,
  assigneeFilter,
  isMember,
}: {
  open: boolean;
  onClose: () => void;
  assigneeFilter?: string;
  isMember: boolean;
}) {
  const [tasks, setTasks] = useState<DoneTask[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const reportUrl = useMemo(() => {
    const qs = new URLSearchParams();
    if (assigneeFilter && assigneeFilter !== "all") qs.set("assignee", assigneeFilter);
    const q = qs.toString();
    return `/api/team/done-report${q ? `?${q}` : ""}`;
  }, [assigneeFilter]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFallbackUrl(null);
    setLoading(true);
    void fetch(reportUrl)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.tasks) ? (data.tasks as DoneTask[]) : [];
        const defaultDates = Array.isArray(data.defaultDates)
          ? (data.defaultDates as string[])
          : [];
        const defaultIds = Array.isArray(data.defaultIds) ? (data.defaultIds as string[]) : [];
        setTasks(list);
        setSelectedDates(new Set(defaultDates.length ? defaultDates : []));
        setSelected(new Set(defaultIds.length ? defaultIds : list.map((t) => t.id)));
      })
      .finally(() => setLoading(false));
  }, [open, reportUrl]);

  const dateGroups = useMemo((): DateGroup[] => {
    const map = new Map<string, DoneTask[]>();
    for (const t of tasks) {
      const key = teamTaskCompletedDayKey(t.completedAt);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === "unknown") return 1;
        if (b === "unknown") return -1;
        return b.localeCompare(a);
      })
      .map(([key, groupTasks]) => ({
        key,
        label: formatTeamCompletedDayLabel(key, groupTasks[0]?.completedAt),
        tasks: groupTasks,
      }));
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (selectedDates.size === 0) return tasks;
    return tasks.filter((t) => selectedDates.has(teamTaskCompletedDayKey(t.completedAt)));
  }, [tasks, selectedDates]);

  useEffect(() => {
    if (!open || loading) return;
    const visible =
      selectedDates.size === 0
        ? tasks
        : tasks.filter((t) => selectedDates.has(teamTaskCompletedDayKey(t.completedAt)));
    setSelected(new Set(visible.map((t) => t.id)));
  }, [selectedDates, open, loading, tasks]);

  const toggleDate = (key: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async () => {
    setSending(true);
    setError(null);
    setFallbackUrl(null);
    try {
      const res = await fetch(reportUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: [...selectedDates],
          taskIds: [...selected],
          ...(assigneeFilter && assigneeFilter !== "all"
            ? { assignee: assigneeFilter }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not prepare message");
        return;
      }
      if (!data.shareUrl || typeof data.shareUrl !== "string") {
        setError("No WhatsApp link returned — try again.");
        return;
      }
      setFallbackUrl(data.shareUrl);
      const result = openWhatsAppShareUrl(data.shareUrl);
      if (result === "popup") {
        onClose();
      } else if (result === "popup-blocked") {
        setError("Tap the green link below to open WhatsApp.");
      }
    } catch {
      setError("Network error — check connection and try again.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const selectedCount = selected.size;

  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <div
        className={`${TEAM_SHEET_PANEL} flex max-h-[92dvh] flex-col lg:max-w-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <IconWhatsApp className="h-6 w-6 text-emerald-300" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Send done report</h2>
            <p className="text-xs text-white/45">
              Pick dates — we&apos;ll build a WhatsApp message for those completed tasks.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-white/50">Dates done</p>
            <button
              type="button"
              onClick={() =>
                setSelectedDates(
                  new Set(
                    selectedDates.size === dateGroups.length
                      ? []
                      : dateGroups.map((g) => g.key)
                  )
                )
              }
              className="text-[11px] text-cyan-300/80"
            >
              {selectedDates.size === dateGroups.length ? "Clear dates" : "All dates"}
            </button>
          </div>
          <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1">
            {loading ? (
              <p className="px-1 text-xs text-white/35">Loading dates…</p>
            ) : dateGroups.length === 0 ? (
              <p className="px-1 text-xs text-white/35">No done tasks yet.</p>
            ) : (
              dateGroups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => toggleDate(g.key)}
                  className={teamFilterChip(selectedDates.has(g.key))}
                >
                  {g.label} · {g.tasks.length}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-white/50">
              Tasks ({selectedCount} selected)
            </p>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  new Set(
                    selected.size === visibleTasks.length
                      ? []
                      : visibleTasks.map((t) => t.id)
                  )
                )
              }
              className="text-[11px] text-cyan-300/80"
            >
              {selected.size === visibleTasks.length ? "Clear tasks" : "All tasks"}
            </button>
          </div>
          <div className="max-h-[36dvh] space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] p-2">
            {loading ? (
              <p className="py-6 text-center text-xs text-white/35">Loading…</p>
            ) : visibleTasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/35">
                {selectedDates.size === 0
                  ? "Select at least one date above."
                  : "No tasks on selected dates."}
              </p>
            ) : (
              visibleTasks.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2.5 hover:bg-white/[0.04]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggle(t.id)}
                    className="mt-1 shrink-0 accent-emerald-500"
                  />
                  <span className="min-w-0 text-sm leading-snug text-white/90">
                    {t.title}
                    <span className="mt-0.5 block text-[11px] text-white/38">
                      {teamOutletLabel(t.outletId)}
                      {!isMember ? ` · ${teamMemberName(t.assigneeId)}` : ""}
                      {t.completedAt
                        ? ` · ${formatTeamRecordDateTime(t.completedAt)}`
                        : ""}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.06] pt-4">
          {error ? (
            <p className="mb-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}
          {fallbackUrl ? (
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 flex min-h-[48px] items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 text-sm font-semibold text-emerald-200"
            >
              Tap here to open WhatsApp
            </a>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[52px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sending || selectedCount === 0 || selectedDates.size === 0}
              onClick={() => void send()}
              className="flex min-h-[52px] flex-[1.4] items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 disabled:opacity-40"
            >
              <IconWhatsApp className="h-5 w-5" />
              {sending ? "Opening…" : "Send report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
