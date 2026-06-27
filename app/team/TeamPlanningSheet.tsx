"use client";

import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import type { PlanningAttachment, PlanningSheetData } from "@/lib/team-planning";
import type { TeamPlanningType } from "@prisma/client";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

export type PlanningSheetForm = {
  type: TeamPlanningType;
  title: string;
  outletId: string;
  sheetData: PlanningSheetData;
  attachments: PlanningAttachment[];
};

export function emptyPlanningSheetForm(type: TeamPlanningType = "PLANNING"): PlanningSheetForm {
  return {
    type,
    title: "",
    outletId: "",
    sheetData: {
      columns: ["Date", "Item", "Notes"],
      rows: [["", "", ""]],
    },
    attachments: [],
  };
}

function syncRowWidths(data: PlanningSheetData): PlanningSheetData {
  const cols = data.columns.length;
  return {
    columns: data.columns,
    rows: data.rows.map((r) => {
      const next = [...r];
      while (next.length < cols) next.push("");
      return next.slice(0, cols);
    }),
  };
}

export function PlanningSheetPreview({ data }: { data: PlanningSheetData }) {
  const filled = data.rows.some((r) => r.some((c) => c.trim()));
  if (!filled) return null;
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-white/[0.06]">
      <table className="min-w-full text-left text-[11px]">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.03]">
            {data.columns.map((c) => (
              <th key={c} className="px-2 py-1.5 font-medium text-white/45">
                {c || "—"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows
            .filter((r) => r.some((c) => c.trim()))
            .map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] last:border-0">
                {data.columns.map((_, ci) => (
                  <td key={ci} className="px-2 py-1.5 text-white/75">
                    {row[ci] || "—"}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlanningSheetFormSheet({
  open,
  form,
  setForm,
  editing,
  saving,
  uploading,
  onClose,
  onSubmit,
  onUploadFile,
}: {
  open: boolean;
  form: PlanningSheetForm;
  setForm: React.Dispatch<React.SetStateAction<PlanningSheetForm>>;
  editing: boolean;
  saving: boolean;
  uploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onUploadFile: (file: File) => void;
}) {
  if (!open) return null;

  const setSheet = (updater: (d: PlanningSheetData) => PlanningSheetData) => {
    setForm((f) => ({ ...f, sheetData: syncRowWidths(updater(f.sheetData)) }));
  };

  const addColumn = () => {
    setSheet((d) => ({
      columns: [...d.columns, `Col ${d.columns.length + 1}`],
      rows: d.rows.map((r) => [...r, ""]),
    }));
  };

  const removeColumn = (ci: number) => {
    setSheet((d) => {
      if (d.columns.length <= 1) return d;
      return {
        columns: d.columns.filter((_, i) => i !== ci),
        rows: d.rows.map((r) => r.filter((_, i) => i !== ci)),
      };
    });
  };

  const addRow = () => {
    setSheet((d) => ({
      ...d,
      rows: [...d.rows, d.columns.map(() => "")],
    }));
  };

  const label =
    form.type === "FEEDBACK"
      ? editing
        ? "Edit feedback"
        : "Share feedback"
      : editing
        ? "Edit planning"
        : "New planning";

  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <form
        onSubmit={onSubmit}
        className={`${TEAM_SHEET_PANEL} flex max-h-[92dvh] flex-col lg:max-w-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <h2 className="text-lg font-semibold">{label}</h2>
        <p className="mt-1 text-xs text-white/40">
          Free-form sheet — all fields optional. Add rows and columns as you need.
        </p>

        <label className="mt-3 block text-xs text-white/45">Title (optional)</label>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Week plan, ideas…"
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
        />

        <label className="mt-3 block text-xs text-white/45">Outlet (optional)</label>
        <select
          value={form.outletId}
          onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
        >
          <option value="">Not specific</option>
          {TEAM_AD_OUTLETS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-white/50">Planning sheet</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addColumn}
                className="rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] text-white/60"
              >
                + Column
              </button>
              <button
                type="button"
                onClick={addRow}
                className="rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] text-white/60"
              >
                + Row
              </button>
            </div>
          </div>
          <div className="max-h-[38dvh] overflow-auto rounded-xl border border-white/[0.08] xl:max-h-[44vh]">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#0c0c12]">
                <tr>
                  {form.sheetData.columns.map((col, ci) => (
                    <th key={ci} className="border-b border-white/[0.08] p-0">
                      <div className="flex min-w-[88px] items-center gap-0.5 px-1 py-1">
                        <input
                          value={col}
                          onChange={(e) =>
                            setSheet((d) => ({
                              ...d,
                              columns: d.columns.map((c, i) => (i === ci ? e.target.value : c)),
                            }))
                          }
                          className="w-full min-w-0 rounded bg-white/[0.04] px-1.5 py-1 text-[11px] text-white/70"
                        />
                        {form.sheetData.columns.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeColumn(ci)}
                            className="shrink-0 px-1 text-[10px] text-red-300/50"
                            aria-label="Remove column"
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.sheetData.rows.map((row, ri) => (
                  <tr key={ri}>
                    {form.sheetData.columns.map((_, ci) => (
                      <td key={ci} className="border-b border-white/[0.04] p-1">
                        <input
                          value={row[ci] ?? ""}
                          onChange={(e) =>
                            setSheet((d) => ({
                              ...d,
                              rows: d.rows.map((r, i) =>
                                i === ri ? r.map((c, j) => (j === ci ? e.target.value : c)) : r
                              ),
                            }))
                          }
                          className="w-full min-w-[80px] rounded bg-black/30 px-2 py-1.5 text-xs text-white/85"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <label className="mt-4 block text-xs text-white/45">Files (PDF, Excel, images…)</label>
        <input
          type="file"
          accept="image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx"
          className="mt-1 block w-full text-sm text-white/55"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadFile(file);
            e.target.value = "";
          }}
        />
        {form.attachments.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {form.attachments.map((a) => (
              <li
                key={a.url}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs"
              >
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate text-cyan-200/80">
                  {a.fileName}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      attachments: f.attachments.filter((x) => x.url !== a.url),
                    }))
                  }
                  className="shrink-0 text-red-300/60"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-4">
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
            {saving ? "Saving…" : editing ? "Save" : "Share"}
          </button>
        </div>
      </form>
    </div>
  );
}
