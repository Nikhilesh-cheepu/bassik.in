"use client";

import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

export type MemberRecordForm = {
  title: string;
  description: string;
  outletId: string;
  creativeUrl: string;
  deadlineDate: string;
};

export const emptyMemberRecordForm = (): MemberRecordForm => ({
  title: "",
  description: "",
  outletId: TEAM_AD_OUTLETS[0].id,
  creativeUrl: "",
  deadlineDate: "",
});

export function MemberRecordSheet({
  open,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: MemberRecordForm;
  setForm: React.Dispatch<React.SetStateAction<MemberRecordForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open) return null;
  return (
    <div className={TEAM_SHEET_OVERLAY}>
      <form onSubmit={onSubmit} className={TEAM_SHEET_PANEL}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <h2 className="text-lg font-semibold">Log work you did</h2>
        <p className="mt-1 text-xs text-white/45">
          Sends to admin for approval. Once approved it appears in Done.
        </p>

        <label className="mt-4 block text-xs font-medium text-white/50">What did you complete?</label>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Posted Firefly weekend reel"
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        />

        <label className="mt-3 block text-xs font-medium text-white/50">Outlet</label>
        <select
          value={form.outletId}
          onChange={(e) => setForm((f) => ({ ...f, outletId: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        >
          {TEAM_AD_OUTLETS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium text-white/50">Notes (optional)</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        />

        <label className="mt-3 block text-xs font-medium text-white/50">Link (optional)</label>
        <input
          value={form.creativeUrl}
          onChange={(e) => setForm((f) => ({ ...f, creativeUrl: e.target.value }))}
          placeholder="Instagram or Drive URL"
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        />

        <label className="mt-3 block text-xs font-medium text-white/50">When was it due? (optional)</label>
        <input
          type="date"
          value={form.deadlineDate}
          onChange={(e) => setForm((f) => ({ ...f, deadlineDate: e.target.value }))}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base"
        />

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
            disabled={saving}
            className="min-h-[48px] flex-1 rounded-xl bg-amber-500/90 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Sending…" : "Submit for approval"}
          </button>
        </div>
      </form>
    </div>
  );
}
