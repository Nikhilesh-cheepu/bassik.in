"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import type { TeamShootDto } from "@/lib/team-shoots";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

export type ContentFilesMode = "raw" | "edit";

const COPY: Record<
  ContentFilesMode,
  { title: string; hint: string; field: "rawFilesDriveLink" | "editFilesDriveLink"; accent: string }
> = {
  raw: {
    title: "Raw files",
    hint: "Google Drive folder for unedited footage from each shoot.",
    field: "rawFilesDriveLink",
    accent: "amber",
  },
  edit: {
    title: "Editing files",
    hint: "Google Drive folder for selects, edits, and exports.",
    field: "editFilesDriveLink",
    accent: "cyan",
  },
};

type Filter = "all" | "missing" | "linked";

export default function TeamContentFilesView({
  mode,
  canEdit,
}: {
  mode: ContentFilesMode;
  canEdit: boolean;
}) {
  const meta = COPY[mode];
  const [shoots, setShoots] = useState<TeamShootDto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outletFilter, setOutletFilter] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editShoot, setEditShoot] = useState<TeamShootDto | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const loadShoots = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const toDate = new Date(now.getFullYear(), now.getMonth() + 7, 0);
      const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}-01`;
      const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;
      const qs = new URLSearchParams({ from, to });
      if (outletFilter) qs.set("outletId", outletFilter);
      const res = await fetch(`/api/team/shoots?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load");
      setShoots(data.shoots ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setRefreshing(false);
    }
  }, [outletFilter]);

  useEffect(() => {
    void loadShoots();
  }, [loadShoots]);

  const filtered = useMemo(() => {
    let list = [...shoots].sort((a, b) => b.shootDate.localeCompare(a.shootDate));
    if (filter === "missing") {
      list = list.filter((s) => !(mode === "raw" ? s.rawFilesDriveLink : s.editFilesDriveLink));
    } else if (filter === "linked") {
      list = list.filter((s) => (mode === "raw" ? s.rawFilesDriveLink : s.editFilesDriveLink));
    }
    return list;
  }, [shoots, filter, mode]);

  const openEdit = (shoot: TeamShootDto) => {
    if (!shoot.canEdit) return;
    setEditShoot(shoot);
    setLinkUrl(mode === "raw" ? shoot.rawFilesDriveLink ?? "" : shoot.editFilesDriveLink ?? "");
  };

  const saveLink = async () => {
    if (!editShoot) return;
    setSaving(true);
    setError(null);
    try {
      const payload =
        mode === "raw"
          ? {
              shootDate: editShoot.shootDate,
              outletId: editShoot.outletId ?? undefined,
              title: editShoot.title ?? undefined,
              shootNotes: editShoot.shootNotes ?? undefined,
              rawFilesDriveLink: linkUrl.trim() || undefined,
              editFilesDriveLink: editShoot.editFilesDriveLink ?? undefined,
            }
          : {
              shootDate: editShoot.shootDate,
              outletId: editShoot.outletId ?? undefined,
              title: editShoot.title ?? undefined,
              shootNotes: editShoot.shootNotes ?? undefined,
              rawFilesDriveLink: editShoot.rawFilesDriveLink ?? undefined,
              editFilesDriveLink: linkUrl.trim() || undefined,
            };
      const res = await fetch(`/api/team/shoots/${editShoot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditShoot(null);
      await loadShoots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const chip = (id: Filter, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(id)}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${
        filter === id ? "bg-white/12 text-white ring-1 ring-white/15" : "text-white/45"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-3 pt-1 md:px-0 md:pt-0">
      <p className="mb-3 text-xs leading-relaxed text-white/45">{meta.hint}</p>

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
        <div className="flex gap-1 overflow-x-auto">
          {chip("all", "All")}
          {chip("missing", "Missing link")}
          {chip("linked", "Has link")}
        </div>
        {refreshing ? <span className="text-xs text-white/35">Updating…</span> : null}
      </div>

      {filtered.length === 0 && !refreshing ? (
        <p className="text-sm text-white/35">
          {filter === "missing"
            ? "All shoots have a link here."
            : "No shoots yet — add a shoot plan in the Shoot calendar tab first."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-2">
          {filtered.map((shoot) => {
            const url = mode === "raw" ? shoot.rawFilesDriveLink : shoot.editFilesDriveLink;
            return (
              <li key={shoot.id}>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{shoot.displayTitle}</p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {shoot.shootDate} · {shoot.outletLabel ?? "Any outlet"}
                      </p>
                    </div>
                    {url ? (
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          mode === "raw" ? "bg-amber-500/20 text-amber-200" : "bg-cyan-500/20 text-cyan-200"
                        }`}
                      >
                        Linked
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/35">
                        Missing
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`rounded-lg px-3 py-2 text-xs font-medium ${
                          mode === "raw"
                            ? "bg-amber-500/15 text-amber-100"
                            : "bg-cyan-500/15 text-cyan-100"
                        }`}
                      >
                        Open Drive
                      </a>
                    ) : null}
                    {shoot.canEdit && canEdit ? (
                      <button
                        type="button"
                        onClick={() => openEdit(shoot)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/75"
                      >
                        {url ? "Update link" : "Add link"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editShoot ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !saving && setEditShoot(null)}>
          <div className={TEAM_SHEET_PANEL} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{meta.title}</h3>
            <p className="mt-1 text-sm text-white/50">{editShoot.displayTitle}</p>
            <label className="mt-4 block text-xs font-medium text-white/50">Google Drive link</label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white"
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditShoot(null)}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveLink()}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                  mode === "raw" ? "bg-amber-600" : "bg-cyan-600"
                }`}
              >
                {saving ? "Saving…" : "Save link"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
