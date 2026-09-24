"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatDriveLinkStamp,
  type TeamDriveLinkDto,
} from "@/lib/team-drive-links";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

type LinkForm = {
  title: string;
  url: string;
  description: string;
};

function emptyForm(): LinkForm {
  return { title: "", url: "", description: "" };
}

export default function TeamDriveLinksView({
  canEdit,
  addSignal = 0,
}: {
  canEdit: boolean;
  addSignal?: number;
}) {
  const [links, setLinks] = useState<TeamDriveLinkDto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LinkForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadLinks = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/team/drive-links");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load");
      setLinks(data.links ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const openAdd = useCallback(() => {
    if (!canEdit) return;
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }, [canEdit]);

  useEffect(() => {
    if (addSignal > 0 && canEdit) openAdd();
  }, [addSignal, canEdit, openAdd]);

  const openEdit = (link: TeamDriveLinkDto) => {
    if (!link.canEdit) return;
    setEditingId(link.id);
    setForm({
      title: link.title,
      url: link.url,
      description: link.description ?? "",
    });
    setFormOpen(true);
  };

  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim() || null,
      };
      const res = await fetch(
        editingId ? `/api/team/drive-links/${editingId}` : "/api/team/drive-links",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setFormOpen(false);
      setEditingId(null);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/drive-links/${editingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setFormOpen(false);
      setEditingId(null);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return links;
    return links.filter((link) => {
      const hay = `${link.title} ${link.url} ${link.description ?? ""} ${link.ownerLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [links, search]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-3 pt-1 md:px-0 md:pt-0">
      <p className="mb-3 text-xs leading-relaxed text-white/45">
        Shared Drive links for the whole team. Add a title and link; date is saved automatically. Description is optional.
      </p>

      {error ? (
        <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, link, or notes"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30"
        />
        {canEdit ? (
          <button
            type="button"
            onClick={openAdd}
            className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white xl:hidden"
          >
            + Add
          </button>
        ) : null}
        {refreshing ? <span className="text-xs text-white/35">Updating…</span> : null}
      </div>

      {filtered.length === 0 && !refreshing ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-white/35">
            {links.length === 0 ? "No Drive links yet." : "No matches."}
          </p>
          {canEdit && links.length === 0 ? (
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Add Drive link
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-2">
          {filtered.map((link) => (
            <li key={link.id}>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-medium text-white">{link.title}</p>
                  <p className="shrink-0 text-[11px] text-white/40">
                    {formatDriveLinkStamp(link.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-[11px] text-white/35">Added by {link.ownerLabel}</p>
                {link.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/55">
                    {link.description}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-100"
                  >
                    Open link
                  </a>
                  {link.canEdit && canEdit ? (
                    <button
                      type="button"
                      onClick={() => openEdit(link)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/75"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setFormOpen(false)}>
          <form
            className={`${TEAM_SHEET_PANEL} max-h-[92dvh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void saveLink(e)}
          >
            <h3 className="text-lg font-semibold">{editingId ? "Edit Drive link" : "Add Drive link"}</h3>

            <label className="mt-4 block text-xs font-medium text-white/50">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Folder or file name"
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
              autoFocus
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Link</label>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://drive.google.com/..."
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">
              Description <span className="font-normal text-white/30">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              placeholder="What’s in this Drive folder"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
            />

            <p className="mt-3 text-[11px] text-white/35">
              Date is stamped automatically when you save.
            </p>

            <div className="mt-5 flex gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => void deleteLink()}
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
                className="min-h-[48px] flex-1 rounded-xl bg-cyan-600 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
