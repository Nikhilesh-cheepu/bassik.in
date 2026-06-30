"use client";

import type { RefObject } from "react";
import type { TeamPersonalNoteDto } from "@/lib/team-personal-notes";
import { formatPersonalNoteTimestamp } from "@/lib/team-personal-notes";
import ExpandableText from "./ExpandableText";

export default function TeamNotesView({
  notes,
  ready,
  draft,
  onDraftChange,
  onSave,
  saving,
  onDelete,
  composerRef,
}: {
  notes: TeamPersonalNoteDto[];
  ready: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  onDelete: (note: TeamPersonalNoteDto) => void;
  composerRef?: RefObject<HTMLTextAreaElement>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-[#0e0e14] p-3 ring-1 ring-white/[0.04]">
        <label className="sr-only" htmlFor="team-note-composer">
          New note
        </label>
        <textarea
          id="team-note-composer"
          ref={composerRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Type a note…"
          rows={4}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white outline-none ring-cyan-400/30 focus:ring-2"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !draft.trim()}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save note"}
          </button>
        </div>
      </div>

      {!ready ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/40">No saved notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <article
              key={note.id}
              className="relative overflow-hidden rounded-xl bg-[#0e0e14] ring-1 ring-white/[0.06]"
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-violet-400/45" />
              <div className="py-3 pl-3.5 pr-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium text-white/40">
                    {formatPersonalNoteTimestamp(note.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onDelete(note)}
                    className="shrink-0 text-[11px] text-red-300/60"
                  >
                    Delete
                  </button>
                </div>
                <ExpandableText text={note.body} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
