"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { monthBounds } from "@/lib/team-calendar";
import type { TeamPersonalNoteDto } from "@/lib/team-personal-notes";
import { noteDisplayTitle } from "@/lib/team-personal-notes";
import type { TeamShootDto } from "@/lib/team-shoots";
import { buildShootShareText, groupShootsByDate } from "@/lib/team-shoots";
import { TeamDatePicker } from "./TeamDatePicker";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

type Member = { id: string; name: string };

export type ShootForm = {
  shootDate: string;
  outletId: string;
  title: string;
  shootNotes: string;
  rawFilesDriveLink: string;
  editFilesDriveLink: string;
};

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatDayChip(dateKey: string): { weekday: string; day: string } {
  const d = new Date(`${dateKey}T12:00:00`);
  return {
    weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
    day: String(d.getDate()),
  };
}

export function emptyShootForm(date?: string | Date): ShootForm {
  const d =
    typeof date === "string"
      ? new Date(date.includes("T") ? date : `${date}T12:00:00`)
      : date instanceof Date
        ? date
        : new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    shootDate: key,
    outletId: "",
    title: "",
    shootNotes: "",
    rawFilesDriveLink: "",
    editFilesDriveLink: "",
  };
}

function DriveSection({
  title,
  hint,
  value,
  onChange,
  readOnlyUrl,
}: {
  title: string;
  hint: string;
  value?: string;
  onChange?: (v: string) => void;
  readOnlyUrl?: string | null;
}) {
  if (readOnlyUrl) {
    if (!readOnlyUrl) return null;
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">{title}</p>
        <a
          href={readOnlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-cyan-300"
        >
          <span className="truncate">Open in Drive</span>
          <span className="shrink-0 text-xs text-white/40">→</span>
        </a>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{title}</p>
      <p className="mt-0.5 text-[11px] text-white/35">{hint}</p>
      <input
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="https://drive.google.com/..."
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/25"
      />
    </div>
  );
}

export default function TeamShootsView({
  members,
  viewerId,
  canCreate,
  addSignal = 0,
  notes = [],
}: {
  members: Member[];
  viewerId: string;
  canCreate: boolean;
  addSignal?: number;
  notes?: TeamPersonalNoteDto[];
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const [shoots, setShoots] = useState<TeamShootDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outletFilter, setOutletFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ShootForm>(emptyShootForm());
  const [taggedNoteIds, setTaggedNoteIds] = useState<string[]>([]);
  const [originalTaggedNoteIds, setOriginalTaggedNoteIds] = useState<string[]>([]);
  const [noteTagSearch, setNoteTagSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<TeamShootDto | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMembers, setShareMembers] = useState<string[]>([]);
  const dateStripRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => monthBounds(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthDateKeys = useMemo(() => {
    const last = new Date(viewYear, viewMonth, 0).getDate();
    return Array.from({ length: last }, (_, i) => {
      const day = i + 1;
      return `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    });
  }, [viewYear, viewMonth]);

  const byDate = useMemo(() => groupShootsByDate(shoots), [shoots]);
  const shareTargets = useMemo(
    () => members.filter((m) => m.id !== viewerId),
    [members, viewerId]
  );
  const selectedShoots = selectedDate ? byDate[selectedDate] ?? [] : [];
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const myNotes = useMemo(() => notes.filter((n) => n.isOwner), [notes]);
  const filteredNotesForTag = useMemo(() => {
    const q = noteTagSearch.trim().toLowerCase();
    if (!q) return myNotes;
    return myNotes.filter(
      (n) =>
        (n.title ?? "").toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        (n.category ?? "").toLowerCase().includes(q)
    );
  }, [myNotes, noteTagSearch]);

  const upcomingShoots = useMemo(() => {
    return [...shoots]
      .filter((s) => s.shootDate >= todayKey)
      .sort((a, b) => a.shootDate.localeCompare(b.shootDate))
      .slice(0, 5);
  }, [shoots, todayKey]);

  const loadShoots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from: bounds.from, to: bounds.to });
      if (outletFilter) qs.set("outletId", outletFilter);
      const res = await fetch(`/api/team/shoots?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load shoots");
      setShoots(data.shoots ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [bounds.from, bounds.to, outletFilter]);

  useEffect(() => {
    void loadShoots();
  }, [loadShoots]);

  useEffect(() => {
    const el = dateStripRef.current?.querySelector(`[data-date="${selectedDate}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selectedDate, viewMonth, viewYear]);

  const resetFormState = useCallback((date?: string) => {
    setForm(emptyShootForm(date ? new Date(`${date}T12:00:00`) : new Date(`${selectedDate}T12:00:00`)));
    setTaggedNoteIds([]);
    setOriginalTaggedNoteIds([]);
    setNoteTagSearch("");
  }, [selectedDate]);

  const openAdd = useCallback(
    (date?: string) => {
      if (!canCreate) return;
      setEditingId(null);
      resetFormState(date ?? selectedDate);
      setFormOpen(true);
    },
    [canCreate, resetFormState, selectedDate]
  );

  useEffect(() => {
    if (addSignal > 0 && canCreate) openAdd();
  }, [addSignal, canCreate, openAdd]);

  const openEdit = (shoot: TeamShootDto) => {
    if (!shoot.canEdit) {
      setDetail(shoot);
      return;
    }
    setEditingId(shoot.id);
    setForm({
      shootDate: shoot.shootDate,
      outletId: shoot.outletId ?? "",
      title: shoot.title ?? "",
      shootNotes: shoot.shootNotes ?? "",
      rawFilesDriveLink: shoot.rawFilesDriveLink ?? "",
      editFilesDriveLink: shoot.editFilesDriveLink ?? "",
    });
    const linked = shoot.linkedNotes.map((n) => n.noteId);
    setTaggedNoteIds(linked);
    setOriginalTaggedNoteIds(linked);
    setNoteTagSearch("");
    setFormOpen(true);
    setDetail(null);
  };

  const syncNoteTags = async (shootId: string) => {
    const toAdd = taggedNoteIds.filter((id) => !originalTaggedNoteIds.includes(id));
    const toRemove = originalTaggedNoteIds.filter((id) => !taggedNoteIds.includes(id));
    for (const noteId of toAdd) {
      const res = await fetch(`/api/team/shoots/${shootId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not tag note");
      }
    }
    for (const noteId of toRemove) {
      const res = await fetch(`/api/team/shoots/${shootId}/notes?noteId=${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not untag note");
      }
    }
  };

  const saveShoot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        shootDate: form.shootDate,
        outletId: form.outletId || undefined,
        title: form.title.trim() || undefined,
        shootNotes: form.shootNotes.trim() || undefined,
        rawFilesDriveLink: form.rawFilesDriveLink.trim() || undefined,
        editFilesDriveLink: form.editFilesDriveLink.trim() || undefined,
      };
      const url = editingId ? `/api/team/shoots/${editingId}` : "/api/team/shoots";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      const shootId = data.shoot?.id as string;
      if (shootId) await syncNoteTags(shootId);
      setFormOpen(false);
      setEditingId(null);
      if (detail?.id === shootId) setDetail(data.shoot);
      await loadShoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteShoot = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/shoots/${editingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setFormOpen(false);
      setDetail(null);
      setEditingId(null);
      await loadShoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const shareShoot = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/shoots/${detail.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: shareMembers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Share failed");
      setDetail(data.shoot);
      setShareOpen(false);
      await loadShoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setSaving(false);
    }
  };

  const copyShootDetails = async (shoot: TeamShootDto) => {
    try {
      await navigator.clipboard.writeText(buildShootShareText(shoot));
    } catch {
      /* ignore */
    }
  };

  const toggleNoteTag = (noteId: string) => {
    setTaggedNoteIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

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
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    setSelectedDate(first);
  };

  const ShootFormSheet = (
    <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setFormOpen(false)}>
      <form
        className={`${TEAM_SHEET_PANEL} max-h-[92dvh] overflow-y-auto overscroll-contain`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={saveShoot}
      >
        <h2 className="text-lg font-semibold">{editingId ? "Edit shoot plan" : "New shoot plan"}</h2>
        <p className="mt-1 text-xs text-white/40">Date, outlet, notes, drive links, and tag past notes.</p>

        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Shoot day</p>
          <label className="block text-xs font-medium text-white/45">Date</label>
          <TeamDatePicker
            value={form.shootDate}
            onChange={(v) => setForm((f) => ({ ...f, shootDate: v }))}
          />
          <label className="mt-2 block text-xs font-medium text-white/45">Outlet</label>
          <select
            value={form.outletId}
            onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
          >
            <option value="">Select outlet</option>
            {TEAM_AD_OUTLETS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="mt-2 block text-xs font-medium text-white/45">Title (optional)</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Reel shoot"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
          />
          <label className="mt-2 block text-xs font-medium text-white/45">Shoot notes</label>
          <textarea
            value={form.shootNotes}
            onChange={(e) => setForm((f) => ({ ...f, shootNotes: e.target.value }))}
            rows={3}
            placeholder="Brief, shots needed, contacts…"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
          />
        </div>

        <div className="mt-4 space-y-3">
          <DriveSection
            title="Raw files"
            hint="Google Drive folder — unedited footage"
            value={form.rawFilesDriveLink}
            onChange={(v) => setForm((f) => ({ ...f, rawFilesDriveLink: v }))}
          />
          <DriveSection
            title="Editing files"
            hint="Google Drive folder — selects / edits for post"
            value={form.editFilesDriveLink}
            onChange={(v) => setForm((f) => ({ ...f, editFilesDriveLink: v }))}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-200/90">Tag notes</p>
          <p className="mt-0.5 text-[11px] text-white/40">Attach notes you already created in Notes.</p>
          {myNotes.length > 3 ? (
            <input
              value={noteTagSearch}
              onChange={(e) => setNoteTagSearch(e.target.value)}
              placeholder="Search notes…"
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
            />
          ) : null}
          {filteredNotesForTag.length === 0 ? (
            <p className="mt-2 text-xs text-white/35">No notes yet — create some in the Notes tab first.</p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {filteredNotesForTag.map((n) => {
                const on = taggedNoteIds.includes(n.id);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => toggleNoteTag(n.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        on
                          ? "border-violet-400/50 bg-violet-500/15 text-white"
                          : "border-white/10 bg-black/20 text-white/75 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="font-medium">{noteDisplayTitle(n)}</span>
                      {on ? <span className="ml-2 text-[10px] text-violet-300">Tagged</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          {editingId ? (
            <button
              type="button"
              onClick={() => void deleteShoot()}
              className="min-h-[48px] rounded-xl border border-red-400/30 px-4 text-sm text-red-300"
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setFormOpen(false)}
            className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Save plan" : "Create shoot"}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden xl:flex-row xl:gap-6 xl:pb-4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pt-2 xl:max-w-md xl:shrink-0 xl:px-0 xl:pt-0">
        {error ? (
          <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-xs text-white"
          >
            <option value="">All outlets</option>
            {TEAM_AD_OUTLETS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {canCreate ? (
            <button
              type="button"
              onClick={() => openAdd()}
              className="ml-auto rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 px-3 py-2 text-xs font-semibold text-white xl:hidden"
            >
              + New shoot
            </button>
          ) : null}
          {loading ? <span className="text-xs text-white/35">Loading…</span> : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => goMonth(-1)} className="rounded-lg px-2 py-1 text-white/60" aria-label="Previous month">
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              const n = new Date();
              setViewYear(n.getFullYear());
              setViewMonth(n.getMonth() + 1);
              setSelectedDate(todayKey);
            }}
            className="text-sm font-semibold text-white/90"
          >
            {formatMonthLabel(viewYear, viewMonth)}
          </button>
          <button type="button" onClick={() => goMonth(1)} className="rounded-lg px-2 py-1 text-white/60" aria-label="Next month">
            ›
          </button>
        </div>

        <div
          ref={dateStripRef}
          className="mt-3 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {monthDateKeys.map((dateKey) => {
            const { weekday, day } = formatDayChip(dateKey);
            const count = (byDate[dateKey] ?? []).length;
            const selected = dateKey === selectedDate;
            const isToday = dateKey === todayKey;
            return (
              <button
                key={dateKey}
                type="button"
                data-date={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-2xl border px-2 py-2 transition ${
                  selected
                    ? "border-rose-400/60 bg-rose-500/20 text-white"
                    : isToday
                      ? "border-white/20 bg-white/[0.06] text-white/90"
                      : "border-white/10 bg-white/[0.03] text-white/70"
                }`}
              >
                <span className="text-[10px] font-medium uppercase text-white/45">{weekday}</span>
                <span className="text-lg font-bold leading-tight">{day}</span>
                {count > 0 ? (
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden />
                ) : (
                  <span className="mt-1 h-1.5 w-1.5" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
          <h3 className="mb-2 text-sm font-semibold text-white">
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </h3>

          {selectedShoots.length === 0 ? (
            <p className="text-sm text-white/35">No shoots this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedShoots.map((shoot) => (
                <li key={shoot.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(shoot)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      detail?.id === shoot.id
                        ? "border-rose-400/40 bg-rose-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    }`}
                  >
                    <p className="font-medium text-white">{shoot.displayTitle}</p>
                    <p className="mt-0.5 text-xs text-white/45">{shoot.outletLabel ?? "Any outlet"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                      {shoot.rawFilesDriveLink ? (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-200/90">Raw</span>
                      ) : null}
                      {shoot.editFilesDriveLink ? (
                        <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-cyan-200/90">Edit</span>
                      ) : null}
                      {shoot.linkedNotes.length > 0 ? (
                        <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-violet-200/90">
                          {shoot.linkedNotes.length} note{shoot.linkedNotes.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {upcomingShoots.length > 0 ? (
            <div className="mt-6 border-t border-white/[0.06] pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/35">Coming up</p>
              <ul className="space-y-1.5">
                {upcomingShoots.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(s.shootDate);
                        setDetail(s);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-white/60 hover:bg-white/[0.04]"
                    >
                      <span className="truncate">{s.displayTitle}</span>
                      <span className="shrink-0 text-white/35">{s.shootDate.slice(5)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-white/[0.06] xl:flex xl:border-t-0">
        {detail ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-2">
            <h2 className="text-xl font-semibold text-white">{detail.displayTitle}</h2>
            <p className="mt-1 text-sm text-white/45">
              {detail.shootDate} · {detail.outletLabel ?? "Any outlet"}
            </p>
            {detail.shootNotes ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{detail.shootNotes}</p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DriveSection title="Raw files" hint="" readOnlyUrl={detail.rawFilesDriveLink} />
              <DriveSection title="Editing files" hint="" readOnlyUrl={detail.editFilesDriveLink} />
            </div>

            {detail.linkedNotes.length > 0 ? (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Tagged notes</p>
                <ul className="mt-2 space-y-2">
                  {detail.linkedNotes.map((n) => (
                    <li key={n.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm">
                      <p className="font-medium text-white/90">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/45">{n.bodyPreview}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyShootDetails(detail)}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70"
              >
                Copy details
              </button>
              {detail.canEdit ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShareMembers(detail.sharedWith);
                      setShareOpen(true);
                    }}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70"
                  >
                    Share with team
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(detail)}
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white"
                  >
                    Edit plan
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
            <p className="text-sm text-white/35">Select a shoot to see details</p>
            {canCreate ? (
              <button
                type="button"
                onClick={() => openAdd(selectedDate)}
                className="mt-4 rounded-xl bg-gradient-to-r from-rose-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
              >
                + New shoot plan
              </button>
            ) : null}
          </div>
        )}
      </div>

      {formOpen ? ShootFormSheet : null}

      {detail ? (
        <div className={TEAM_SHEET_OVERLAY + " xl:hidden"} onClick={() => !saving && setDetail(null)}>
          <div
            className={`${TEAM_SHEET_PANEL} max-h-[92dvh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{detail.displayTitle}</h2>
            <p className="mt-1 text-xs text-white/45">
              {detail.shootDate} · {detail.outletLabel ?? "Any outlet"}
            </p>
            {detail.shootNotes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-white/75">{detail.shootNotes}</p>
            ) : null}

            <div className="mt-4 space-y-3">
              <DriveSection title="Raw files" hint="" readOnlyUrl={detail.rawFilesDriveLink} />
              <DriveSection title="Editing files" hint="" readOnlyUrl={detail.editFilesDriveLink} />
            </div>

            {detail.linkedNotes.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-medium text-white/50">Tagged notes</p>
                <ul className="mt-2 space-y-2">
                  {detail.linkedNotes.map((n) => (
                    <li key={n.id} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
                      <p className="font-medium text-white/90">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/45">{n.bodyPreview}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyShootDetails(detail)}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70"
              >
                Copy details
              </button>
              {detail.canEdit ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShareMembers(detail.sharedWith);
                      setShareOpen(true);
                    }}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(detail)}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70"
                  >
                    Edit
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="ml-auto rounded-xl bg-white/10 px-3 py-2 text-xs text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {shareOpen && detail ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setShareOpen(false)}>
          <div className={TEAM_SHEET_PANEL} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Share shoot</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {shareTargets.map((m) => {
                const on = shareMembers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setShareMembers((prev) =>
                        on ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                      )
                    }
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      on ? "bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/40" : "bg-white/5 text-white/55"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || shareMembers.length === 0}
                onClick={() => void shareShoot()}
                className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
