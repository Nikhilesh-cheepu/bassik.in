"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TeamCalendarEventType } from "@prisma/client";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import {
  CALENDAR_KIND_COLORS,
  CALENDAR_KIND_LABELS,
  calendarMonthCells,
  calendarWeekdayLabels,
  groupEntriesByDate,
  monthBounds,
  type CalendarEntryKind,
  type TeamCalendarEntryDto,
  type TeamCalendarShareDto,
} from "@/lib/team-calendar";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";
import { IconChevronDown, teamFilterChip, TEAM_DOCK_PADDING } from "./TeamIcons";

type Member = { id: string; name: string };

const KIND_FILTERS: { id: "all" | CalendarEntryKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "TASK", label: "Tasks" },
  { id: "TASK_DEADLINE", label: "Deadlines" },
  { id: "SHOOT", label: "Shoots" },
  { id: "PLAN", label: "Plans" },
  { id: "MEETING", label: "Meetings" },
];

const EVENT_TYPES: { id: TeamCalendarEventType; label: string }[] = [
  { id: "SHOOT", label: "Shoot day" },
  { id: "PLAN", label: "Plan" },
  { id: "MEETING", label: "Meeting" },
  { id: "OTHER", label: "Other" },
];

type EventForm = {
  type: TeamCalendarEventType;
  title: string;
  description: string;
  date: string;
  endDate: string;
  outletId: string;
};

const emptyEventForm = (date = ""): EventForm => ({
  type: "SHOOT",
  title: "",
  description: "",
  date,
  endDate: "",
  outletId: "",
});

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function outletLabel(id: string | null): string | null {
  if (!id) return null;
  return TEAM_AD_OUTLETS.find((o) => o.id === id)?.label ?? id;
}

function DayAgendaSheet({
  open,
  dateKey,
  entries,
  ready,
  isAdmin,
  onClose,
  onAdd,
  onEdit,
}: {
  open: boolean;
  dateKey: string;
  entries: TeamCalendarEntryDto[];
  ready: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (entry: TeamCalendarEntryDto) => void;
}) {
  if (!open) return null;
  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <div
        className={`${TEAM_SHEET_PANEL} max-h-[75dvh] xl:hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-white/40">{formatDayLabel(dateKey)}</p>
            <h2 className="mt-0.5 text-[20px] font-bold text-white">
              {parseInt(dateKey.slice(8), 10)}{" "}
              {new Date(
                parseInt(dateKey.slice(0, 4), 10),
                parseInt(dateKey.slice(5, 7), 10) - 1,
                1
              ).toLocaleDateString("en-IN", { month: "long" })}
            </h2>
          </div>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAdd();
              }}
              className="shrink-0 rounded-full bg-cyan-500/20 px-3.5 py-2 text-[13px] font-semibold text-cyan-100"
            >
              + Event
            </button>
          ) : null}
        </div>

        {!ready ? (
          <div className="mt-5 space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="mt-10 py-6 text-center text-[15px] text-white/35">Nothing scheduled</p>
        ) : (
          <ul className="mt-4 max-h-[50dvh] space-y-2 overflow-y-auto overscroll-contain">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onEdit={isAdmin && entry.source === "event" ? () => onEdit(entry) : undefined}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  onEdit,
}: {
  entry: TeamCalendarEntryDto;
  onEdit?: () => void;
}) {
  const outlet = outletLabel(entry.outletId);
  const content = (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CALENDAR_KIND_COLORS[entry.kind]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white/90">{entry.title}</p>
        {entry.subtitle ? (
          <p className="mt-0.5 text-[11px] text-white/40">{entry.subtitle}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/45">
            {CALENDAR_KIND_LABELS[entry.kind]}
          </span>
          {outlet ? (
            <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[9px] text-cyan-200/70">
              {outlet}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
  return (
    <li className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 xl:px-3 xl:py-2.5">
      {onEdit ? (
        <button type="button" onClick={onEdit} className="w-full text-left">
          {content}
        </button>
      ) : (
        content
      )}
    </li>
  );
}

function ShareSheet({
  open,
  dates,
  members,
  selected,
  onChange,
  title,
  onTitleChange,
  message,
  onMessageChange,
  saving,
  onSubmit,
  onClose,
}: {
  open: boolean;
  dates: string[];
  members: Member[];
  selected: string[];
  onChange: (ids: string[]) => void;
  title: string;
  onTitleChange: (v: string) => void;
  message: string;
  onMessageChange: (v: string) => void;
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <div className={`${TEAM_SHEET_PANEL} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-white">Share calendar dates</h2>
        <p className="mt-1 text-[12px] text-white/40">
          {dates.length} date{dates.length === 1 ? "" : "s"} — teammates see tasks & events on these days only
        </p>
        <p className="mt-2 text-[11px] text-violet-200/70">
          {dates.map((d) => d.slice(5).replace("-", "/")).join(" · ")}
        </p>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Label (optional)"
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
        />
        <textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Note for teammates (optional)"
          rows={2}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
        />
        <ul className="mt-4 max-h-[40vh] space-y-1 overflow-y-auto">
          {members.map((m) => {
            const on = selected.includes(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${
                    on ? "bg-violet-500/15 text-white ring-1 ring-violet-400/20" : "text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  {m.name}
                  <span className={`h-4 w-4 rounded border ${on ? "border-violet-400 bg-violet-500" : "border-white/20"}`} />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !selected.length}
            onClick={onSubmit}
            className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Sending…" : "Share dates"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventFormSheet({
  open,
  form,
  onChange,
  editing,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  form: EventForm;
  onChange: (f: EventForm) => void;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: () => void;
}) {
  if (!open) return null;
  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <form className={TEAM_SHEET_PANEL} onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">{editing ? "Edit event" : "Add calendar event"}</h2>
        <label className="mt-4 block text-xs font-medium text-white/50">Type</label>
        <select
          value={form.type}
          onChange={(e) => onChange({ ...form, type: e.target.value as TeamCalendarEventType })}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-xs font-medium text-white/50">Title</label>
        <input
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
          required
        />
        <label className="mt-3 block text-xs font-medium text-white/50">Outlet</label>
        <select
          value={form.outletId}
          onChange={(e) => onChange({ ...form, outletId: e.target.value })}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
        >
          <option value="">Any / not outlet-specific</option>
          {TEAM_AD_OUTLETS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-white/50">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange({ ...form, date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50">End (optional)</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => onChange({ ...form, endDate: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
            />
          </div>
        </div>
        <label className="mt-3 block text-xs font-medium text-white/50">Notes</label>
        <textarea
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
        />
        <div className="mt-5 flex gap-2">
          {editing && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="min-h-[48px] rounded-xl border border-red-400/30 px-4 text-sm text-red-300"
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TeamCalendarView({
  members,
  isAdmin,
  viewerId,
  addEventSignal = 0,
}: {
  members: Member[];
  isAdmin: boolean;
  viewerId: string;
  addEventSignal?: number;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const [entries, setEntries] = useState<TeamCalendarEntryDto[]>([]);
  const [sharedDateKeys, setSharedDateKeys] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | CalendarEntryKind>("all");
  const [outletFilter, setOutletFilter] = useState("");
  const [shareMode, setShareMode] = useState(false);
  const [sharePick, setSharePick] = useState<string[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMembers, setShareMembers] = useState<string[]>([]);
  const [shareTitle, setShareTitle] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareSaving, setShareSaving] = useState(false);
  const [receivedShares, setReceivedShares] = useState<TeamCalendarShareDto[]>([]);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventSaving, setEventSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileDaySheet, setMobileDaySheet] = useState(false);

  const bounds = useMemo(() => monthBounds(viewYear, viewMonth), [viewYear, viewMonth]);
  const cells = useMemo(() => calendarMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekdays = calendarWeekdayLabels();
  const byDate = useMemo(() => groupEntriesByDate(entries), [entries]);

  const shareTargets = useMemo(
    () => members.filter((m) => m.id !== viewerId && m.id !== "admin"),
    [members, viewerId]
  );

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from: bounds.from, to: bounds.to });
      if (outletFilter) qs.set("outletId", outletFilter);
      if (kindFilter !== "all") qs.set("kinds", kindFilter);
      const res = await fetch(`/api/team/calendar?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load calendar");
      setEntries(data.entries ?? []);
      setSharedDateKeys(data.sharedDateKeys ?? []);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [bounds.from, bounds.to, outletFilter, kindFilter]);

  const loadShares = useCallback(async () => {
    try {
      const res = await fetch("/api/team/calendar/share");
      const data = await res.json();
      if (res.ok) setReceivedShares(data.received ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    void loadShares();
  }, [loadShares]);

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const toggleShareDate = (dateKey: string) => {
    setSharePick((prev) =>
      prev.includes(dateKey) ? prev.filter((d) => d !== dateKey) : [...prev, dateKey].sort()
    );
  };

  const openAddEvent = useCallback((date?: string) => {
    setEditingEventId(null);
    setEventForm(emptyEventForm(date ?? selectedDate));
    setEventFormOpen(true);
  }, [selectedDate]);

  useEffect(() => {
    if (addEventSignal > 0 && isAdmin) openAddEvent();
  }, [addEventSignal, isAdmin, openAddEvent]);

  const openEditEvent = (entry: TeamCalendarEntryDto) => {
    if (entry.source !== "event") return;
    setEditingEventId(entry.sourceId);
    setEventForm({
      type: entry.kind === "SHOOT" ? "SHOOT" : entry.kind === "MEETING" ? "MEETING" : entry.kind === "PLAN" ? "PLAN" : "OTHER",
      title: entry.title,
      description: entry.subtitle ?? "",
      date: entry.date,
      endDate: entry.endDate ?? "",
      outletId: entry.outletId ?? "",
    });
    setEventFormOpen(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventSaving(true);
    setError(null);
    try {
      const payload = {
        type: eventForm.type,
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        date: eventForm.date,
        endDate: eventForm.endDate || undefined,
        outletId: eventForm.outletId || undefined,
      };
      const url = editingEventId
        ? `/api/team/calendar/events/${editingEventId}`
        : "/api/team/calendar/events";
      const res = await fetch(url, {
        method: editingEventId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEventFormOpen(false);
      setEditingEventId(null);
      await loadCalendar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setEventSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!editingEventId) return;
    setEventSaving(true);
    try {
      const res = await fetch(`/api/team/calendar/events/${editingEventId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setEventFormOpen(false);
      setEditingEventId(null);
      await loadCalendar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setEventSaving(false);
    }
  };

  const submitShare = async () => {
    setShareSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/team/calendar/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: sharePick,
          memberIds: shareMembers,
          title: shareTitle.trim() || undefined,
          message: shareMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Share failed");
      setShareOpen(false);
      setShareMode(false);
      setSharePick([]);
      setShareMembers([]);
      setShareTitle("");
      setShareMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setShareSaving(false);
    }
  };

  const selectedEntries = selectedDate ? byDate[selectedDate] ?? [] : [];
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectDay = (dateKey: string) => {
    setSelectedDate(dateKey);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1279px)").matches && !shareMode) {
      setMobileDaySheet(true);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-2 xl:pb-4">
      {error ? (
        <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!isAdmin && receivedShares.length > 0 ? (
        <div className="mb-3 rounded-xl border border-violet-400/15 bg-violet-500/5 px-3 py-2.5">
          <p className="text-[11px] font-medium text-violet-200/80">Shared with you</p>
          <p className="mt-0.5 text-[10px] text-white/40">
            {receivedShares.length} share batch{receivedShares.length === 1 ? "" : "es"} ·{" "}
            {sharedDateKeys.length} date{sharedDateKeys.length === 1 ? "" : "s"} visible
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 xl:flex-wrap">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1 xl:flex-none xl:rounded-xl xl:bg-white/[0.04] xl:p-1 xl:ring-1 xl:ring-white/[0.06]">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-white/60 active:bg-white/[0.06] xl:h-auto xl:w-auto xl:rounded-lg xl:px-2.5 xl:py-1.5 xl:text-sm"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              const n = new Date();
              setViewYear(n.getFullYear());
              setViewMonth(n.getMonth() + 1);
              selectDay(
                `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
              );
            }}
            className="min-w-0 flex-1 truncate text-center xl:min-w-[9rem] xl:flex-none"
          >
            <span className="block text-[11px] font-medium uppercase tracking-wide text-white/35 xl:hidden">
              {new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("en-IN", { year: "numeric" })}
            </span>
            <span className="block text-[20px] font-bold text-white xl:text-sm xl:font-semibold xl:text-white/90">
              {formatMonthLabel(viewYear, viewMonth)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-white/60 active:bg-white/[0.06] xl:h-auto xl:w-auto xl:rounded-lg xl:px-2.5 xl:py-1.5 xl:text-sm"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const n = new Date();
            setViewYear(n.getFullYear());
            setViewMonth(n.getMonth() + 1);
            const key = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
            selectDay(key);
          }}
          className="hidden rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/55 ring-1 ring-white/[0.08] xl:inline-flex"
        >
          Today
        </button>
        {isAdmin ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setShareMode((v) => !v);
                setSharePick([]);
                setMobileDaySheet(false);
              }}
              className={teamFilterChip(shareMode, "violet")}
            >
              {shareMode ? `Pick (${sharePick.length})` : "Share"}
            </button>
            {shareMode && sharePick.length > 0 ? (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="rounded-full bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100 ring-1 ring-violet-400/25"
              >
                Send
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => openAddEvent()}
              className="hidden rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-1.5 text-[11px] font-semibold text-white xl:inline-flex"
            >
              + Event
            </button>
          </div>
        ) : null}
        {loading ? <span className="hidden text-[10px] text-white/30 xl:inline">Updating…</span> : null}
      </div>

      <div className="-mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setKindFilter(f.id)}
            className={teamFilterChip(kindFilter === f.id)}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-0.5 h-3.5 w-px shrink-0 self-center bg-white/10" />
        <label className="relative shrink-0">
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            aria-label="Filter by outlet"
            className="h-7 max-w-[8rem] appearance-none truncate rounded-full bg-white/[0.05] py-1 pl-2.5 pr-6 text-[11px] font-medium text-white/55 outline-none ring-1 ring-white/[0.08]"
          >
            <option value="">All outlets</option>
            {TEAM_AD_OUTLETS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
        </label>
      </div>

      <div className="mt-1 min-h-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:gap-6">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5 sm:p-3 xl:p-3">
          <div className="mb-0.5 grid grid-cols-7">
            {weekdays.map((w) => (
              <div
                key={w}
                className="py-1.5 text-center text-[11px] font-semibold uppercase text-white/28 sm:text-[10px]"
              >
                {w.slice(0, 3)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((dateKey, i) => {
              if (!dateKey) {
                return <div key={`pad-${i}`} className="aspect-square min-h-[2.75rem] sm:min-h-[3rem]" />;
              }
              const dayEntries = byDate[dateKey] ?? [];
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;
              const isSharePicked = sharePick.includes(dateKey);
              const isShared = sharedDateKeys.includes(dateKey);
              const hasEvents = dayEntries.length > 0;
              const dayNum = parseInt(dateKey.slice(8), 10);

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => {
                    if (shareMode) {
                      toggleShareDate(dateKey);
                      return;
                    }
                    selectDay(dateKey);
                  }}
                  className={`relative flex aspect-square min-h-[2.75rem] flex-col items-center justify-start pt-1 transition sm:min-h-[3.25rem] ${
                    isSharePicked ? "opacity-100" : ""
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-medium sm:text-sm ${
                      isSharePicked
                        ? "bg-violet-500 text-white"
                        : isToday
                          ? "bg-cyan-500 text-white"
                          : isSelected
                            ? "bg-white/15 text-white"
                            : "text-white/80"
                    }`}
                  >
                    {dayNum}
                  </span>
                  <div className="mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                    {hasEvents ? (
                      <>
                        {dayEntries.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            className={`h-1 w-1 rounded-full ${CALENDAR_KIND_COLORS[e.kind]}`}
                          />
                        ))}
                      </>
                    ) : null}
                  </div>
                  {isShared && !isAdmin ? (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 hidden xl:mt-0 xl:block">
          <div className="sticky top-0 rounded-2xl border border-white/[0.06] bg-[#0a0a10]/90 p-3 backdrop-blur-md xl:static">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Selected</p>
                <h3 className="mt-0.5 text-sm font-semibold text-white">
                  {selectedDate ? formatDayLabel(selectedDate) : "Pick a day"}
                </h3>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => openAddEvent(selectedDate)}
                  className="shrink-0 rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-white/80 ring-1 ring-white/10"
                >
                  + Add
                </button>
              ) : null}
            </div>

            {!ready ? (
              <div className="mt-4 space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
                ))}
              </div>
            ) : selectedEntries.length === 0 ? (
              <p className="mt-6 py-4 text-center text-sm text-white/35">Nothing scheduled this day</p>
            ) : (
              <ul className="mt-3 max-h-[50vh] space-y-2 overflow-y-auto xl:max-h-[calc(100vh-16rem)]">
                {selectedEntries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onEdit={
                      isAdmin && entry.source === "event"
                        ? () => openEditEvent(entry)
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <DayAgendaSheet
        open={mobileDaySheet && !shareMode}
        dateKey={selectedDate}
        entries={selectedEntries}
        ready={ready}
        isAdmin={isAdmin}
        onClose={() => setMobileDaySheet(false)}
        onAdd={() => {
          setMobileDaySheet(false);
          openAddEvent(selectedDate);
        }}
        onEdit={(entry) => {
          setMobileDaySheet(false);
          openEditEvent(entry);
        }}
      />

      <ShareSheet
        open={shareOpen}
        dates={sharePick}
        members={shareTargets}
        selected={shareMembers}
        onChange={setShareMembers}
        title={shareTitle}
        onTitleChange={setShareTitle}
        message={shareMessage}
        onMessageChange={setShareMessage}
        saving={shareSaving}
        onSubmit={() => void submitShare()}
        onClose={() => setShareOpen(false)}
      />

      {isAdmin ? (
        <EventFormSheet
          open={eventFormOpen}
          form={eventForm}
          onChange={setEventForm}
          editing={Boolean(editingEventId)}
          saving={eventSaving}
          onClose={() => {
            setEventFormOpen(false);
            setEditingEventId(null);
          }}
          onSubmit={(e) => void saveEvent(e)}
          onDelete={editingEventId ? () => void deleteEvent() : undefined}
        />
      ) : null}

      {selectedDate && !mobileDaySheet && !shareMode ? (
        <button
          type="button"
          onClick={() => setMobileDaySheet(true)}
          className="fixed left-3 right-3 z-20 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#12121a]/95 px-4 py-3 text-left shadow-lg backdrop-blur-md xl:hidden"
          style={{ bottom: `calc(${TEAM_DOCK_PADDING} + 0.5rem)` }}
        >
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-white">
              {formatDayLabel(selectedDate)}
            </p>
            <p className="text-[12px] text-white/40">
              {ready
                ? selectedEntries.length === 0
                  ? "Nothing scheduled"
                  : `${selectedEntries.length} item${selectedEntries.length === 1 ? "" : "s"}`
                : "Loading…"}
            </p>
          </div>
          <span className="shrink-0 text-[13px] font-medium text-cyan-400">View</span>
        </button>
      ) : null}
    </div>
  );
}

export { emptyEventForm };
