"use client";

import { useEffect, useMemo, useState } from "react";
import { openWhatsAppShareUrl } from "@/lib/open-whatsapp";
import { teamOutletLabel } from "@/lib/team-outlets";
import { formatTeamRecordDateTime } from "@/lib/team-tasks";
import { IconWhatsApp } from "./TeamIcons";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

type DoneTask = {
  id: string;
  title: string;
  outletId: string;
  completedAt: string | null;
};

export default function TeamMemberDoneSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tasks, setTasks] = useState<DoneTask[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFallbackUrl(null);
    setLoading(true);
    void fetch("/api/team/member-done-report")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.tasks) ? (data.tasks as DoneTask[]) : [];
        const defaults = Array.isArray(data.defaultIds) ? (data.defaultIds as string[]) : [];
        setTasks(list);
        setSelected(new Set(defaults.length ? defaults : list.map((t) => t.id)));
      })
      .finally(() => setLoading(false));
  }, [open]);

  const selectedCount = selected.size;

  const todayCount = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return tasks.filter((t) => {
      if (!t.completedAt) return false;
      const key = new Date(t.completedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      return key === today;
    }).length;
  }, [tasks]);

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
      const res = await fetch("/api/team/member-done-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: [...selected] }),
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

  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <div
        className={`${TEAM_SHEET_PANEL} flex max-h-[90dvh] flex-col lg:max-w-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <IconWhatsApp className="h-6 w-6 text-emerald-300" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Send your done list</h2>
            <p className="text-xs text-white/45">Share what you finished with the team on WhatsApp.</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-sm leading-snug text-emerald-50/95">
          {todayCount > 0
            ? `You finished ${todayCount} task${todayCount === 1 ? "" : "s"} today — send the update so everyone knows.`
            : "Pick the tasks you want to report as done."}
        </p>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-white/50">Your done tasks ({selectedCount} selected)</p>
            <button
              type="button"
              onClick={() =>
                setSelected(new Set(selected.size === tasks.length ? [] : tasks.map((t) => t.id)))
              }
              className="text-[11px] text-cyan-300/80"
            >
              {selected.size === tasks.length ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="max-h-[40dvh] space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] p-2">
            {loading ? (
              <p className="py-6 text-center text-xs text-white/35">Loading…</p>
            ) : tasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/35">No done tasks yet.</p>
            ) : (
              tasks.map((t) => (
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
            Not now
          </button>
          <button
            type="button"
            disabled={sending || selectedCount === 0}
            onClick={() => void send()}
            className="flex min-h-[52px] flex-[1.4] items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 disabled:opacity-40"
          >
            <IconWhatsApp className="h-5 w-5" />
            {sending ? "Opening…" : "Send on WhatsApp"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
