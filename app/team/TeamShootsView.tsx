"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TEAM_AD_OUTLETS, teamOutletLabel } from "@/lib/team-outlets";
import {
  calendarMonthCells,
  calendarWeekdayLabels,
  monthBounds,
} from "@/lib/team-calendar";
import type { TeamPersonalNoteDto } from "@/lib/team-personal-notes";
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

function DriveLinkRow({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-cyan-300 hover:bg-white/[0.06]"
    >
      <span>{label}</span>
      <span className="truncate text-xs text-white/40">Open →</span>
    </a>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<TeamShootDto | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMembers, setShareMembers] = useState<string[]>([]);
  const [linkNoteOpen, setLinkNoteOpen] = useState(false);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");

  const bounds = useMemo(() => monthBounds(viewYear, viewMonth), [viewYear, viewMonth]);
  const cells = useMemo(() => calendarMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekdays = calendarWeekdayLabels();
  const byDate = useMemo(() => groupShootsByDate(shoots), [shoots]);
  const shareTargets = useMemo(
    () => members.filter((m) => m.id !== viewerId),
    [members, viewerId]
  );
  const selectedShoots = selectedDate ? byDate[selectedDate] ?? [] : [];
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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

  const openAdd = useCallback(
    (date?: string) => {
      if (!canCreate) return;
      setEditingId(null);
      setForm(emptyShootForm(date ? new Date(date + "T12:00:00") : new Date(selectedDate + "T12:00:00")));
      setFormOpen(true);
    },
    [canCreate, selectedDate]
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
    setFormOpen(true);
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
      setFormOpen(false);
      setEditingId(null);
      if (detail?.id === data.shoot?.id) setDetail(data.shoot);
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

  const linkExistingNote = async (noteId: string) => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/shoots/${detail.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Link failed");
      setDetail(data.shoot);
      setLinkNoteOpen(false);
      await loadShoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link failed");
    } finally {
      setSaving(false);
    }
  };

  const createAndLinkNote = async () => {
    if (!detail || !newNoteBody.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/shoots/${detail.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create: {
            title: newNoteTitle.trim() || undefined,
            body: newNoteBody.trim(),
            outletId: detail.outletId,
            category: "Shoot",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add note");
      setDetail(data.shoot);
      setLinkNoteOpen(false);
      setNewNoteBody("");
      setNewNoteTitle("");
      await loadShoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setSaving(false);
    }
  };

  const unlinkNote = async (noteId: string) => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/shoots/${detail.id}/notes?noteId=${noteId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unlink failed");
      setDetail(data.shoot);
      await loadShoots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlink failed");
    } finally {
      setSaving(false);
    }
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
  };

  const myNotes = notes.filter((n) => n.isOwner);

  return (
    <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden pb-2 xl:pb-4">
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
        {loading ? <span className="text-xs text-white/35">Loading…</span> : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => goMonth(-1)} className="rounded-lg px-2 py-1 text-white/60">
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
        <button type="button" onClick={() => goMonth(1)} className="rounded-lg px-2 py-1 text-white/60">
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-white/35">
        {weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((dateKey, i) => {
          if (!dateKey) return <div key={`pad-${i}`} className="aspect-square" />;
          const dayShoots = byDate[dateKey] ?? [];
          const selected = dateKey === selectedDate;
          const isToday = dateKey === todayKey;
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDate(dateKey)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                selected
                  ? "bg-rose-500/25 ring-1 ring-rose-400/50"
                  : isToday
                    ? "bg-white/[0.08] ring-1 ring-white/15"
                    : "hover:bg-white/[0.04]"
              }`}
            >
              <span className={selected ? "font-bold text-white" : "text-white/80"}>
                {parseInt(dateKey.slice(8), 10)}
              </span>
              {dayShoots.length > 0 ? (
                <span className="absolute bottom-1 flex gap-0.5">
                  {dayShoots.slice(0, 3).map((s) => (
                    <span key={s.id} className="h-1 w-1 rounded-full bg-rose-400" />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {selectedDate} · {selectedShoots.length} shoot{selectedShoots.length === 1 ? "" : "s"}
          </h3>
          {canCreate ? (
            <button
              type="button"
              onClick={() => openAdd(selectedDate)}
              className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-200"
            >
              + Shoot
            </button>
          ) : null}
        </div>

        {selectedShoots.length === 0 ? (
          <p className="text-sm text-white/35">No shoots on this day.</p>
        ) : (
          <ul className="space-y-2">
            {selectedShoots.map((shoot) => (
              <li key={shoot.id}>
                <button
                  type="button"
                  onClick={() => setDetail(shoot)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left"
                >
                  <p className="font-medium text-white">{shoot.displayTitle}</p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {shoot.outletLabel ?? "Any outlet"} · {shoot.ownerLabel}
                  </p>
                  {(shoot.rawFilesDriveLink || shoot.editFilesDriveLink) && (
                    <p className="mt-1 text-[10px] text-cyan-300/80">Drive links attached</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setFormOpen(false)}>
          <form
            className={`${TEAM_SHEET_PANEL} max-h-[92dvh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveShoot}
          >
            <h2 className="text-lg font-semibold">{editingId ? "Edit shoot" : "New shoot day"}</h2>
            <label className="mt-4 block text-xs font-medium text-white/50">Shoot date</label>
            <div className="mt-1">
              <TeamDatePicker
                value={form.shootDate}
                onChange={(v) => setForm((f) => ({ ...f, shootDate: v }))}
              />
            </div>
            <label className="mt-3 block text-xs font-medium text-white/50">Outlet</label>
            <select
              value={form.outletId}
              onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
            >
              <option value="">Select outlet</option>
              {TEAM_AD_OUTLETS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="mt-3 block text-xs font-medium text-white/50">Title (optional)</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Reel shoot"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
            />
            <label className="mt-3 block text-xs font-medium text-white/50">Shoot notes</label>
            <textarea
              value={form.shootNotes}
              onChange={(e) => setForm((f) => ({ ...f, shootNotes: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white"
            />
            <label className="mt-3 block text-xs font-medium text-white/50">Raw files — Google Drive link</label>
            <input
              value={form.rawFilesDriveLink}
              onChange={(e) => setForm((f) => ({ ...f, rawFilesDriveLink: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"
            />
            <label className="mt-3 block text-xs font-medium text-white/50">Edit files — Google Drive link</label>
            <input
              value={form.editFilesDriveLink}
              onChange={(e) => setForm((f) => ({ ...f, editFilesDriveLink: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"
            />
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
                {saving ? "Saving…" : editingId ? "Save" : "Add shoot"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {detail ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setDetail(null)}>
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

            <div className="mt-4 space-y-2">
              <DriveLinkRow label="Raw files" url={detail.rawFilesDriveLink} />
              <DriveLinkRow label="Edit files" url={detail.editFilesDriveLink} />
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-white/50">Linked notes</p>
                {detail.canEdit ? (
                  <button
                    type="button"
                    onClick={() => setLinkNoteOpen(true)}
                    className="text-xs text-cyan-300"
                  >
                    + Add note
                  </button>
                ) : null}
              </div>
              {detail.linkedNotes.length === 0 ? (
                <p className="text-xs text-white/35">No notes linked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.linkedNotes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-white/90">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/45">{n.bodyPreview}</p>
                      {detail.canEdit ? (
                        <button
                          type="button"
                          onClick={() => void unlinkNote(n.noteId)}
                          className="mt-1 text-[10px] text-red-300/80"
                        >
                          Remove link
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detail.sharedWithLabels.length > 0 ? (
              <p className="mt-3 text-xs text-white/40">
                Shared with: {detail.sharedWithLabels.join(", ")}
              </p>
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
                    Share with team
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
            <p className="mt-1 text-xs text-white/45">Teammates can view this shoot in their Shoots tab.</p>
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

      {linkNoteOpen && detail ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setLinkNoteOpen(false)}>
          <div
            className={`${TEAM_SHEET_PANEL} max-h-[92dvh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Add note to shoot</h3>
            <p className="mt-3 text-xs font-medium text-white/50">Create new note</p>
            <input
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Title (optional)"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <textarea
              value={newNoteBody}
              onChange={(e) => setNewNoteBody(e.target.value)}
              rows={3}
              placeholder="Shoot note…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={saving || !newNoteBody.trim()}
              onClick={() => void createAndLinkNote()}
              className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Create & link
            </button>

            {myNotes.length > 0 ? (
              <>
                <p className="mt-4 text-xs font-medium text-white/50">Or link existing note</p>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {myNotes.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void linkExistingNote(n.id)}
                        className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.04]"
                      >
                        {n.title || "Untitled"}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
