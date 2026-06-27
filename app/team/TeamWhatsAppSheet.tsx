"use client";

import { useEffect, useMemo, useState } from "react";
import { openWhatsAppShareUrl } from "@/lib/open-whatsapp";
import { teamMemberName } from "@/lib/team-members";
import { teamOutletLabel } from "@/lib/team-outlets";
import type { WhatsAppReportMode } from "@/lib/team-whatsapp-report";
import type { TeamTaskDto } from "@/lib/team-tasks";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

type PickTask = Pick<
  TeamTaskDto,
  "id" | "title" | "status" | "assigneeId" | "outletId" | "deadlineDate" | "createdAt"
>;

const MODES: { id: WhatsAppReportMode; label: string; hint: string }[] = [
  { id: "reminder", label: "Send reminder", hint: "Open tasks — nudge on due dates" },
  { id: "assigned", label: "Task creation list", hint: "Tasks assigned today" },
  { id: "full", label: "Full daily update", hint: "Done + assigned + open summary" },
];

export default function TeamWhatsAppSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<WhatsAppReportMode>("reminder");
  const [tasks, setTasks] = useState<PickTask[]>([]);
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
    void fetch("/api/team/whatsapp-report")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.tasks) ? (data.tasks as PickTask[]) : [];
        setTasks(list);
        setMode("reminder");
        setSelected(new Set(list.filter((t) => t.status === "TODO").map((t) => t.id)));
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || mode === "full") {
      setSelected(new Set(tasks.map((t) => t.id)));
      return;
    }
    if (mode === "assigned") {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      setSelected(
        new Set(
          tasks
            .filter((t) => {
              if (t.status !== "TODO") return false;
              const d = new Date(t.createdAt);
              const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
              return key === today;
            })
            .map((t) => t.id)
        )
      );
      return;
    }
    setSelected(new Set(tasks.filter((t) => t.status === "TODO").map((t) => t.id)));
  }, [mode, tasks, open]);

  const selectable = useMemo(() => {
    if (mode === "full") return tasks;
    if (mode === "assigned") return tasks.filter((t) => t.status === "TODO");
    return tasks.filter((t) => t.status === "TODO");
  }, [tasks, mode]);

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
      const res = await fetch("/api/team/whatsapp-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, taskIds: [...selected] }),
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
        <h2 className="text-lg font-semibold">Send on WhatsApp</h2>
        <p className="mt-1 text-xs text-white/45">Pick report type and tasks to include.</p>

        <div className="mt-4 space-y-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left ${
                mode === m.id
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <p className="text-sm font-medium text-white">{m.label}</p>
              <p className="text-[11px] text-white/40">{m.hint}</p>
            </button>
          ))}
        </div>

        {mode !== "full" ? (
          <div className="mt-4 min-h-0 flex-1 overflow-hidden">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-white/50">Select tasks ({selected.size})</p>
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    new Set(
                      selected.size === selectable.length ? [] : selectable.map((t) => t.id)
                    )
                  )
                }
                className="text-[11px] text-cyan-300/80"
              >
                {selected.size === selectable.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="max-h-[36dvh] space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] p-2">
              {loading ? (
                <p className="py-4 text-center text-xs text-white/35">Loading…</p>
              ) : selectable.length === 0 ? (
                <p className="py-4 text-center text-xs text-white/35">No tasks for this report.</p>
              ) : (
                selectable.map((t) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggle(t.id)}
                      className="mt-1 shrink-0"
                    />
                    <span className="min-w-0 text-sm leading-snug text-white/85">
                      {t.title}
                      <span className="mt-0.5 block text-[11px] text-white/35">
                        {teamOutletLabel(t.outletId)} · {teamMemberName(t.assigneeId)}
                        {t.deadlineDate ? ` · Due ${t.deadlineDate}` : ""}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-white/40">Full update includes today&apos;s summary automatically.</p>
        )}

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
            className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending || (mode !== "full" && selected.size === 0)}
            onClick={() => void send()}
            className="min-h-[48px] flex-1 rounded-xl bg-emerald-600 text-sm font-semibold text-white disabled:opacity-40"
          >
            {sending ? "Opening…" : "Send WhatsApp"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
