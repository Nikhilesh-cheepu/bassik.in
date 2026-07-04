"use client";

import { useCallback, useEffect, useState } from "react";
import type { TeamContentFileDto } from "@/lib/team-content-files";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

export type ContentFilesMode = "raw" | "edit";

type FileForm = {
  title: string;
  driveLink: string;
  notes: string;
};

function emptyForm(): FileForm {
  return { title: "", driveLink: "", notes: "" };
}

const COPY: Record<ContentFilesMode, { hint: string; addLabel: string }> = {
  raw: {
    hint: "Title, link, and notes — keep raw footage organized.",
    addLabel: "Add raw file",
  },
  edit: {
    hint: "Title, link, and notes — keep editing files organized.",
    addLabel: "Add editing file",
  },
};

export default function TeamContentFilesView({
  mode,
  canEdit,
  addSignal = 0,
}: {
  mode: ContentFilesMode;
  canEdit: boolean;
  addSignal?: number;
}) {
  const meta = COPY[mode];
  const kind = mode === "raw" ? "raw" : "edit";
  const [files, setFiles] = useState<TeamContentFileDto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FileForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadFiles = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/content-files?kind=${kind}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load");
      setFiles(data.files ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setRefreshing(false);
    }
  }, [kind]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const openAdd = useCallback(() => {
    if (!canEdit) return;
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }, [canEdit]);

  useEffect(() => {
    if (addSignal > 0 && canEdit) openAdd();
  }, [addSignal, canEdit, openAdd]);

  const openEdit = (file: TeamContentFileDto) => {
    if (!file.canEdit) return;
    setEditingId(file.id);
    setForm({
      title: file.title ?? "",
      driveLink: file.driveLink ?? "",
      notes: file.notes ?? "",
    });
    setFormOpen(true);
  };

  const saveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        kind,
        title: form.title.trim() || undefined,
        driveLink: form.driveLink.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      const res = await fetch(editingId ? `/api/team/content-files/${editingId}` : "/api/team/content-files", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setFormOpen(false);
      setEditingId(null);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/team/content-files/${editingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      setFormOpen(false);
      setEditingId(null);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-3 pt-1 md:px-0 md:pt-0">
      <p className="mb-3 text-xs leading-relaxed text-white/45">{meta.hint}</p>

      {error ? (
        <p className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mb-3 flex items-center gap-2">
        {canEdit ? (
          <button
            type="button"
            onClick={openAdd}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold text-white xl:hidden ${
              mode === "raw" ? "bg-amber-600" : "bg-cyan-600"
            }`}
          >
            + Add
          </button>
        ) : null}
        {refreshing ? <span className="text-xs text-white/35">Updating…</span> : null}
      </div>

      {files.length === 0 && !refreshing ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-white/35">Nothing here yet.</p>
          {canEdit ? (
            <button
              type="button"
              onClick={openAdd}
              className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
                mode === "raw" ? "bg-amber-600" : "bg-cyan-600"
              }`}
            >
              {meta.addLabel}
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-2">
          {files.map((file) => (
            <li key={file.id}>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-medium text-white">{file.displayTitle}</p>
                {file.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/55">{file.notes}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {file.driveLink ? (
                    <a
                      href={file.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-lg px-3 py-2 text-xs font-medium ${
                        mode === "raw"
                          ? "bg-amber-500/15 text-amber-100"
                          : "bg-cyan-500/15 text-cyan-100"
                      }`}
                    >
                      Open link
                    </a>
                  ) : (
                    <span className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/35">No link</span>
                  )}
                  {file.canEdit && canEdit ? (
                    <button
                      type="button"
                      onClick={() => openEdit(file)}
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
            onSubmit={saveFile}
          >
            <h3 className="text-lg font-semibold">{editingId ? "Edit" : meta.addLabel}</h3>

            <label className="mt-4 block text-xs font-medium text-white/50">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Name this folder or file set"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
              autoFocus
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Link</label>
            <input
              value={form.driveLink}
              onChange={(e) => setForm((f) => ({ ...f, driveLink: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
            />

            <label className="mt-3 block text-xs font-medium text-white/50">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={4}
              placeholder="Anything to remember about this"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
            />

            <div className="mt-5 flex gap-2">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => void deleteFile()}
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
                className={`min-h-[48px] flex-1 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${
                  mode === "raw" ? "bg-amber-600" : "bg-cyan-600"
                }`}
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
