"use client";

import { TEAM_AD_OUTLETS, teamOutletLabel } from "@/lib/team-outlets";
import {
  TEAM_PLANNING_LABELS,
  TEAM_PLANNING_TYPES,
  type TeamPlanningDto,
  type TeamPlanningFilter,
} from "@/lib/team-planning";
import type { TeamPlanningType } from "@prisma/client";
import ExpandableText from "./ExpandableText";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

function typeChip(type: TeamPlanningType): string {
  switch (type) {
    case "PLANNING":
      return "text-sky-300/90";
    case "DISCUSSION":
      return "text-violet-300/90";
    case "FEEDBACK":
      return "text-amber-300/90";
  }
}

export type PlanningForm = {
  type: TeamPlanningType;
  title: string;
  body: string;
  outletId: string;
  imageUrls: string[];
};

export const emptyPlanningForm = (): PlanningForm => ({
  type: "PLANNING",
  title: "",
  body: "",
  outletId: "",
  imageUrls: [],
});

export function PlanningFilters({
  filter,
  onFilterChange,
}: {
  filter: TeamPlanningFilter;
  onFilterChange: (f: TeamPlanningFilter) => void;
}) {
  const chips: { id: TeamPlanningFilter; label: string }[] = [
    { id: "all", label: "All" },
    ...TEAM_PLANNING_TYPES.map((t) => ({ id: t, label: TEAM_PLANNING_LABELS[t] })),
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onFilterChange(c.id)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
            filter === c.id ? "bg-white/10 text-white" : "text-white/45"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function PlanningNoteList({
  notes,
  ready,
  isViewer,
  onEdit,
  onDelete,
}: {
  notes: TeamPlanningDto[];
  ready: boolean;
  isViewer: boolean;
  onEdit: (n: TeamPlanningDto) => void;
  onDelete: (n: TeamPlanningDto) => void;
}) {
  if (!ready) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
        ))}
      </div>
    );
  }
  if (notes.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-white/40">
        No notes yet. Add planning, discussions, or feedback.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <article
          key={n.id}
          className="relative overflow-hidden rounded-xl bg-[#0e0e14] ring-1 ring-white/[0.06]"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-white/10" />
          <div className="py-3 pl-3.5 pr-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-[15px] font-medium text-white">{n.title}</h2>
              <span className={`shrink-0 text-[10px] font-medium ${typeChip(n.type)}`}>
                {TEAM_PLANNING_LABELS[n.type]}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/35">
              {n.outletId ? teamOutletLabel(n.outletId) : "All outlets"} · {n.createdBy} ·{" "}
              {new Date(n.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </p>
            {n.body ? <ExpandableText text={n.body} /> : null}
            {n.imageUrls.length > 0 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {n.imageUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/10"
                    />
                  </a>
                ))}
              </div>
            ) : null}
            {!isViewer ? (
              <div className="mt-3 flex gap-2 border-t border-white/[0.05] pt-2">
                <button type="button" onClick={() => onEdit(n)} className="text-xs text-white/50">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(n)}
                  className="text-xs text-red-300/60"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function PlanningFormSheet({
  open,
  form,
  setForm,
  editing,
  saving,
  uploading,
  onClose,
  onSubmit,
  onUploadImage,
}: {
  open: boolean;
  form: PlanningForm;
  setForm: React.Dispatch<React.SetStateAction<PlanningForm>>;
  editing: TeamPlanningDto | null;
  saving: boolean;
  uploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onUploadImage: (file: File) => void;
}) {
  if (!open) return null;
  return (
    <div className={TEAM_SHEET_OVERLAY}>
      <form onSubmit={onSubmit} className={TEAM_SHEET_PANEL}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-lg font-semibold">{editing ? "Edit note" : "New note"}</h2>
        <label className="mt-4 block text-xs text-white/50">Type</label>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TeamPlanningType }))}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        >
          {TEAM_PLANNING_TYPES.map((t) => (
            <option key={t} value={t}>
              {TEAM_PLANNING_LABELS[t]}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-xs text-white/50">Title</label>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        />
        <label className="mt-3 block text-xs text-white/50">Notes</label>
        <textarea
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={4}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        />
        <label className="mt-3 block text-xs text-white/50">Outlet (optional)</label>
        <select
          value={form.outletId}
          onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        >
          <option value="">Any / not specific</option>
          {TEAM_AD_OUTLETS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-xs text-white/50">Images (optional)</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-sm text-white/60"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadImage(file);
            e.target.value = "";
          }}
        />
        {form.imageUrls.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.imageUrls.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      imageUrls: f.imageUrls.filter((u) => u !== url),
                    }))
                  }
                  className="absolute -right-1 -top-1 rounded-full bg-black/80 px-1.5 text-[10px] text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-xl border border-white/10 text-sm text-white/60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="min-h-[48px] flex-1 rounded-xl bg-sky-500/80 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
