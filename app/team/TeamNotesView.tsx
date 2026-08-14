"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { TEAM_AD_OUTLETS, teamOutletLabel } from "@/lib/team-outlets";
import type { NoteAttachment, NoteListScope, TeamPersonalNoteDto } from "@/lib/team-personal-notes";
import {
  formatNoteListDate,
  formatPersonalNoteTimestamp,
  isInstagramUrl,
  linkDisplayLabel,
  noteDisplayTitle,
  notePreviewText,
} from "@/lib/team-personal-notes";
import { IconChevronDown } from "./TeamIcons";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

export type NoteForm = {
  title: string;
  body: string;
  outletId: string;
  category: string;
  aiSummary: string;
  attachments: NoteAttachment[];
  sharedWith: string[];
};

export const emptyNoteForm = (): NoteForm => ({
  title: "",
  body: "",
  outletId: "",
  category: "",
  aiSummary: "",
  attachments: [],
  sharedWith: [],
});

type Member = { id: string; name: string };

function IconSearch({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

function IconTag({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M20 12l-8 8-8-8V4h8l8 8z" />
      <circle cx="9" cy="9" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLink({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L11 5" strokeLinecap="round" />
      <path d="M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 007.07 7.07L13 19" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlusSmall({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkle({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3l1.2 3.6L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3z" />
    </svg>
  );
}

function IconShare({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPaperclip({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 12.5l-8.5 8.5a5 5 0 01-7-7L15 4.5a3.5 3.5 0 114.95 4.95L9.5 20" strokeLinecap="round" />
    </svg>
  );
}

function OutletTag({ outletId, compact }: { outletId: string | null; compact?: boolean }) {
  const isDirect = !outletId;
  const label = isDirect ? "Direct" : teamOutletLabel(outletId);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-md font-medium ${
        compact ? "px-1.5 py-0.5 text-[9px] uppercase tracking-wide" : "px-2 py-0.5 text-[10px]"
      } ${
        isDirect
          ? "bg-white/[0.05] text-white/45 ring-1 ring-white/[0.07]"
          : "bg-amber-400/[0.08] text-amber-100/85 ring-1 ring-amber-400/15"
      }`}
    >
      <IconTag className={compact ? "h-2.5 w-2.5 opacity-70" : "h-3 w-3 opacity-70"} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function SharedBadge({ note }: { note: TeamPersonalNoteDto }) {
  if (!note.isOwner && note.sharedByLabel) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-200/80 ring-1 ring-sky-400/15">
        <IconShare className="h-2.5 w-2.5" />
        from {note.sharedByLabel}
      </span>
    );
  }
  if (note.isOwner && note.sharedWith.length > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-200/80 ring-1 ring-violet-400/15">
        <IconShare className="h-2.5 w-2.5" />
        shared · {note.sharedWithLabels.join(", ")}
      </span>
    );
  }
  return null;
}

function LinkPills({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 ${
            isInstagramUrl(url)
              ? "bg-fuchsia-500/[0.08] text-fuchsia-200/90 ring-fuchsia-400/20"
              : "bg-white/[0.04] text-white/55 ring-white/[0.08]"
          }`}
        >
          <IconLink className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate">{linkDisplayLabel(url)}</span>
        </a>
      ))}
    </div>
  );
}

function AttachmentList({
  items,
  readOnly,
  onRemove,
}: {
  items: NoteAttachment[];
  readOnly?: boolean;
  onRemove?: (url: string) => void;
}) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((a) => (
        <li key={a.url} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 ring-1 ring-white/[0.06]">
          <IconPaperclip className="h-3.5 w-3.5 shrink-0 text-white/35" />
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-[12px] text-cyan-200/75 hover:text-cyan-100"
          >
            {a.fileName}
          </a>
          {!readOnly && onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(a.url)}
              className="text-[10px] text-white/30 hover:text-red-300/70"
            >
              Remove
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-[10px] bg-white/[0.07] p-0.5" role="tablist">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className={`min-h-[32px] flex-1 rounded-[8px] px-2 text-[13px] font-medium transition ${
              on ? "bg-white/[0.14] text-white shadow-sm" : "text-white/45 active:text-white/65"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function OutletFilterSheet({
  open,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const options = [
    { id: "", label: "All outlets" },
    { id: "__direct__", label: "Direct" },
    ...TEAM_AD_OUTLETS.map((o) => ({ id: o.id, label: o.label })),
  ];
  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <div className={`${TEAM_SHEET_PANEL} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[17px] font-semibold text-white">Filter by outlet</h2>
        <ul className="mt-3 space-y-0.5">
          {options.map((o) => {
            const on = value === o.id;
            return (
              <li key={o.id || "all"}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.id);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] ${
                    on ? "bg-amber-500/12 text-amber-100" : "text-white/75 active:bg-white/[0.04]"
                  }`}
                >
                  {o.label}
                  {on ? <span className="text-amber-400">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function NoteListItem({
  note,
  selected,
  onClick,
}: {
  note: TeamPersonalNoteDto;
  selected: boolean;
  onClick: () => void;
}) {
  const title = noteDisplayTitle(note);
  const preview = notePreviewText(note);
  const shared = !note.isOwner && note.sharedByLabel;
  const hasMeta = note.outletId || note.category || shared || (note.isOwner && note.sharedWith.length > 0);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`box-border w-full max-w-full overflow-hidden border-b border-white/[0.06] px-4 py-3.5 text-left transition active:bg-white/[0.04] max-xl:pr-[max(1rem,env(safe-area-inset-right))] xl:px-3.5 xl:py-2.5 xl:pr-3.5 ${
        selected ? "bg-white/[0.05] xl:bg-white/[0.06]" : ""
      }`}
    >
      <div className="min-w-0 overflow-hidden">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <p
            className={`min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight xl:text-[13px] xl:font-medium ${
              selected ? "text-white" : "text-white/92"
            }`}
          >
            {title}
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-white/32 xl:text-[10px] xl:text-white/28">
            {formatNoteListDate(note.updatedAt || note.createdAt)}
          </span>
        </div>
        {preview ? (
          <p className="mt-1 line-clamp-2 break-words text-[13px] leading-snug text-white/38 xl:mt-0.5 xl:line-clamp-1 xl:text-[11px] xl:text-white/32">
            {preview}
          </p>
        ) : null}
        {hasMeta ? (
          <div className="mt-1.5 hidden flex-wrap items-center gap-1 xl:flex">
            <OutletTag outletId={note.outletId} compact />
            {note.category ? (
              <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-white/35">{note.category}</span>
            ) : null}
            <SharedBadge note={note} />
          </div>
        ) : null}
      </div>
    </button>
  );
}

function OutletSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="relative inline-flex items-center">
      <IconTag className="pointer-events-none absolute left-2.5 h-3 w-3 text-white/30" />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 max-w-[9.5rem] appearance-none truncate rounded-lg bg-white/[0.04] py-1 pl-7 pr-7 text-[11px] font-medium text-white/65 outline-none ring-1 ring-white/[0.07] disabled:opacity-50"
      >
        <option value="">Direct</option>
        {TEAM_AD_OUTLETS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-white/30" />
    </label>
  );
}

function ShareSheet({
  open,
  targets,
  selected,
  onChange,
  onClose,
  saving,
  onConfirm,
}: {
  open: boolean;
  targets: Member[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
  saving?: boolean;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <div className={`${TEAM_SHEET_PANEL} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-white">Share note</h2>
        <p className="mt-1 text-[12px] text-white/40">
          Teammates will see this in Notes → Shared as soon as you tap Share.
        </p>
        <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto">
          {targets.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-white/35">No teammates to share with</li>
          ) : (
            targets.map((m) => {
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
            })
          )}
        </ul>
        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="mt-4 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving
            ? "Sharing…"
            : selected.length > 0
              ? `Share with ${selected.length}`
              : "Done"}
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "neutral" | "amber" | "sky";
}) {
  const on =
    tone === "amber"
      ? "bg-amber-400/10 text-amber-100/80 ring-1 ring-amber-400/15"
      : tone === "sky"
        ? "bg-sky-500/10 text-sky-100/80 ring-1 ring-sky-400/15"
        : "bg-white/10 text-white/75 ring-1 ring-white/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
        active ? on : "text-white/32 hover:bg-white/[0.04] hover:text-white/50"
      }`}
    >
      {children}
    </button>
  );
}

type NoteAiState = {
  summary: string;
  suggestedTitle: string;
  suggestedCategory: string;
  loading: boolean;
  error: string | null;
};

const emptyAi = (): NoteAiState => ({
  summary: "",
  suggestedTitle: "",
  suggestedCategory: "",
  loading: false,
  error: null,
});

function NoteEditor({
  form,
  editingId,
  readOnly,
  saving,
  uploading,
  detectedLinks,
  lastEdited,
  onFormChange,
  onSave,
  onDelete,
  onBack,
  onUploadFile,
  shareTargets,
  showBack,
  bodyRef,
  titleRef,
  onShare,
}: {
  form: NoteForm;
  editingId: string | null;
  readOnly: boolean;
  saving: boolean;
  uploading: boolean;
  detectedLinks: string[];
  lastEdited?: string;
  onFormChange: (form: NoteForm) => void;
  onSave: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  onUploadFile: (file: File) => void;
  shareTargets: Member[];
  showBack?: boolean;
  bodyRef?: RefObject<HTMLTextAreaElement>;
  titleRef?: RefObject<HTMLInputElement>;
  onShare?: (noteId: string, sharedWith: string[]) => Promise<void>;
}) {
  const canSave = Boolean(form.body.trim() || form.attachments.length) && !saving && !readOnly;
  const [ai, setAi] = useState<NoteAiState>(emptyAi);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const aiRequestRef = useRef(0);
  const formRef = useRef(form);
  formRef.current = form;

  const runAi = useCallback(
    async (mode: "summarize" | "organize", apply?: boolean) => {
      const f = formRef.current;
      const body = f.body.trim();
      if (body.length < 12) return;

      const reqId = ++aiRequestRef.current;
      setAi((s) => ({ ...s, loading: true, error: null }));

      try {
        const res = await fetch("/api/team/notes/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: f.title,
            body,
            outletId: f.outletId || undefined,
            mode,
          }),
        });
        const data = await res.json();
        if (reqId !== aiRequestRef.current) return;
        if (!res.ok) throw new Error(data.error || "AI failed");

        const suggestedTitle = typeof data.title === "string" ? data.title.trim() : "";
        const summary = typeof data.summary === "string" ? data.summary.trim() : "";
        const category = typeof data.category === "string" ? data.category.trim() : "";
        const rewrittenBody = typeof data.rewrittenBody === "string" ? data.rewrittenBody.trim() : "";

        setAi({ summary, suggestedTitle, suggestedCategory: category, loading: false, error: null });

        if (apply || mode === "organize") {
          const current = formRef.current;
          onFormChange({
            ...current,
            title: suggestedTitle || current.title,
            category: category || current.category,
            aiSummary: summary || current.aiSummary,
            body: mode === "organize" && rewrittenBody ? rewrittenBody : current.body,
          });
        } else if (!f.title.trim() && suggestedTitle) {
          onFormChange({ ...formRef.current, title: suggestedTitle, aiSummary: summary });
        } else if (summary) {
          onFormChange({ ...formRef.current, aiSummary: summary });
        }
      } catch (e) {
        if (reqId !== aiRequestRef.current) return;
        setAi({ summary: "", suggestedTitle: "", suggestedCategory: "", loading: false, error: e instanceof Error ? e.message : "AI failed" });
      }
    },
    [onFormChange]
  );

  useEffect(() => {
    setAi(emptyAi());
    aiRequestRef.current += 1;
  }, [editingId]);

  useEffect(() => {
    if (readOnly) return;
    const body = form.body.trim();
    if (body.length < 40) {
      setAi((s) => ({ ...s, summary: form.aiSummary || "", loading: false, error: null }));
      return;
    }
    const timer = window.setTimeout(() => void runAi("summarize"), 1500);
    return () => window.clearTimeout(timer);
  }, [form.body, form.outletId, editingId, readOnly, runAi]);

  const displaySummary = form.aiSummary || ai.summary;
  const showSuggestedTitle =
    !readOnly && ai.suggestedTitle && ai.suggestedTitle.trim() !== form.title.trim() && !ai.loading;

  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] xl:border-white/[0.05] xl:px-6 xl:py-2 xl:pt-2">
          <div className="flex min-w-0 items-center gap-1 xl:gap-2">
            {showBack && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="-ml-1 flex min-h-[44px] items-center gap-0.5 rounded-lg pr-2 text-amber-400 active:opacity-70 xl:hidden"
                aria-label="Back to notes"
              >
                <IconChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Notes</span>
              </button>
            ) : null}
            <div className="hidden items-center gap-2 xl:flex">
              <OutletSelect value={form.outletId} onChange={(outletId) => onFormChange({ ...form, outletId })} disabled={readOnly} />
              {form.category ? (
                <span className="hidden truncate text-[10px] text-white/30 sm:inline">{form.category}</span>
              ) : null}
              {readOnly ? <span className="text-[10px] text-sky-300/60">View only</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!readOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="hidden h-7 items-center gap-1 rounded-lg px-2 text-[10px] text-white/40 hover:bg-white/[0.05] sm:flex"
                  title="Share"
                >
                  <IconShare />
                  <span className="hidden sm:inline">{form.sharedWith.length || "Share"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void runAi("organize", true)}
                  disabled={ai.loading || form.body.trim().length < 12}
                  className="hidden h-7 items-center gap-1 rounded-lg px-2 text-[10px] text-white/40 hover:bg-white/[0.05] disabled:opacity-30 md:flex"
                  title="Organize with AI"
                >
                  <IconSparkle className={ai.loading ? "animate-pulse" : ""} />
                  <span className="hidden sm:inline">Organize</span>
                </button>
                {editingId && onDelete ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="hidden h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:bg-red-500/10 hover:text-red-300/75 xl:flex"
                    aria-label="Delete"
                  >
                    <IconTrash />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 active:bg-white/[0.06] xl:hidden"
                  aria-label="More options"
                >
                  <span className="text-lg leading-none">···</span>
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!canSave}
                  className="min-h-[44px] rounded-lg px-3 text-[17px] font-semibold text-amber-400 disabled:opacity-35 xl:min-h-0 xl:bg-white/[0.09] xl:py-1.5 xl:text-[11px] xl:font-medium xl:text-white/90 xl:ring-1 xl:ring-white/10"
                >
                  {saving ? "Saving…" : "Done"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="px-4 py-3 xl:px-8 xl:py-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 xl:hidden">
              <OutletSelect value={form.outletId} onChange={(outletId) => onFormChange({ ...form, outletId })} disabled={readOnly} />
              {readOnly ? <span className="text-[11px] text-sky-300/60">View only</span> : null}
            </div>
            <div className="flex items-start gap-2">
              <input
                ref={titleRef}
                value={form.title}
                readOnly={readOnly}
                onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                placeholder="Title"
                className="min-w-0 flex-1 bg-transparent text-[22px] font-bold tracking-tight text-white placeholder:text-white/22 outline-none disabled:opacity-90 xl:text-[1.65rem] xl:font-semibold"
              />
              {showSuggestedTitle ? (
                <button type="button" onClick={() => onFormChange({ ...form, title: ai.suggestedTitle })} className="mt-1 shrink-0 rounded-md bg-violet-500/10 px-2 py-1 text-[10px] text-violet-200/85 ring-1 ring-violet-400/20">
                  Use AI title
                </button>
              ) : null}
            </div>

            {!readOnly ? (
              <input
                value={form.category}
                onChange={(e) => onFormChange({ ...form, category: e.target.value })}
                placeholder="Category (or let AI organize)"
                className="mt-2 w-full bg-transparent text-[12px] text-white/40 placeholder:text-white/18 outline-none"
              />
            ) : form.category ? (
              <p className="mt-2 text-[12px] text-white/35">{form.category}</p>
            ) : null}

            <textarea
              ref={bodyRef}
              value={form.body}
              readOnly={readOnly}
              onChange={(e) => onFormChange({ ...form, body: e.target.value })}
              placeholder="Start writing, or paste a link…"
              className="mt-3 min-h-[50dvh] w-full resize-none bg-transparent text-[17px] leading-[1.55] text-white/82 placeholder:text-white/22 outline-none xl:min-h-[240px] xl:text-[15px] xl:leading-[1.65] xl:text-white/78"
            />

            {!readOnly ? (
              <div className="mt-4 border-t border-white/[0.04] pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white/40 hover:text-white/55">
                  <IconPaperclip className="h-3.5 w-3.5" />
                  Attach PDF, Excel, images…
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {uploading ? <p className="mt-1 text-[11px] text-cyan-200/60">Uploading…</p> : null}
              </div>
            ) : null}

            <div className="mt-3">
              <AttachmentList
                items={form.attachments}
                readOnly={readOnly}
                onRemove={
                  readOnly
                    ? undefined
                    : (url) =>
                        onFormChange({
                          ...form,
                          attachments: form.attachments.filter((a) => a.url !== url),
                        })
                }
              />
            </div>

            {detectedLinks.length > 0 ? (
              <div className="mt-4 border-t border-white/[0.04] pt-3">
                <p className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/28">
                  <IconLink className="h-3 w-3" />
                  Links
                </p>
                <LinkPills urls={detectedLinks} />
              </div>
            ) : null}
          </div>

          {(displaySummary || ai.loading || ai.error) && form.body.trim().length >= 12 ? (
            <div className="border-t border-white/[0.05] bg-gradient-to-b from-violet-500/[0.03] to-transparent px-3 py-3 xl:px-8 xl:py-4">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/30">
                <IconSparkle className="h-3 w-3 text-violet-300/70" />
                AI summary
              </div>
              {ai.loading && !displaySummary ? (
                <p className="mt-2 text-[12px] text-white/30">Working…</p>
              ) : ai.error ? (
                <p className="mt-2 text-[12px] text-amber-200/60">{ai.error}</p>
              ) : (
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">{displaySummary}</p>
              )}
            </div>
          ) : null}
        </div>

        {lastEdited ? (
          <p className="shrink-0 border-t border-white/[0.04] px-6 py-2 text-[10px] text-white/18">
            Last edited {formatPersonalNoteTimestamp(lastEdited)}
          </p>
        ) : null}
      </div>

      <ShareSheet
        open={shareOpen}
        targets={shareTargets}
        selected={form.sharedWith}
        onChange={(sharedWith) => onFormChange({ ...formRef.current, sharedWith })}
        onClose={() => setShareOpen(false)}
        saving={shareSaving || saving}
        onConfirm={() => {
          void (async () => {
            const sharedWith = formRef.current.sharedWith;
            if (editingId && onShare) {
              setShareSaving(true);
              try {
                await onShare(editingId, sharedWith);
                setShareOpen(false);
              } finally {
                setShareSaving(false);
              }
              return;
            }
            setShareOpen(false);
            if (!editingId) onSave();
          })();
        }}
      />

      {moreOpen ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => setMoreOpen(false)}>
          <div className={`${TEAM_SHEET_PANEL} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[17px] font-semibold text-white">Note options</h2>
            <ul className="mt-3 space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    setShareOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] text-white/80 active:bg-white/[0.04]"
                >
                  <IconShare />
                  Share note
                </button>
              </li>
              <li>
                <button
                  type="button"
                  disabled={ai.loading || form.body.trim().length < 12}
                  onClick={() => {
                    setMoreOpen(false);
                    void runAi("organize", true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] text-white/80 active:bg-white/[0.04] disabled:opacity-35"
                >
                  <IconSparkle />
                  Organize with AI
                </button>
              </li>
              {editingId && onDelete ? (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[15px] text-red-300 active:bg-red-500/10"
                  >
                    <IconTrash />
                    Delete note
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

function shareTargetsFor(viewerId: string, members: Member[]): Member[] {
  const list = [...members];
  if (viewerId !== "admin") list.push({ id: "admin", name: "Admin" });
  return list.filter((m) => m.id !== viewerId);
}

export default function TeamNotesView({
  notes,
  ready,
  form,
  editingId,
  composeKey,
  search,
  onSearchChange,
  outletFilter,
  onOutletFilterChange,
  scope,
  onScopeChange,
  viewerId,
  members,
  onFormChange,
  onSave,
  onCancelEdit,
  onNewNote,
  saving,
  uploading,
  onUploadFile,
  onEdit,
  onDelete,
  onShareNote,
}: {
  notes: TeamPersonalNoteDto[];
  ready: boolean;
  form: NoteForm;
  editingId: string | null;
  composeKey?: number;
  search: string;
  onSearchChange: (v: string) => void;
  outletFilter: string;
  onOutletFilterChange: (v: string) => void;
  scope: NoteListScope;
  onScopeChange: (s: NoteListScope) => void;
  viewerId: string;
  members: Member[];
  onFormChange: (form: NoteForm) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onNewNote: () => void;
  saving: boolean;
  uploading: boolean;
  onUploadFile: (file: File) => void;
  onEdit: (note: TeamPersonalNoteDto) => void;
  onDelete: (note: TeamPersonalNoteDto) => void;
  onShareNote?: (noteId: string, sharedWith: string[]) => Promise<void>;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [mobileEditor, setMobileEditor] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [outletSheetOpen, setOutletSheetOpen] = useState(false);

  const activeNote = editingId ? notes.find((n) => n.id === editingId) : null;
  const readOnly = Boolean(activeNote && !activeNote.isOwner);
  const isComposing = Boolean(editingId || form.title || form.body);
  const showEditor = mobileEditor || isComposing || (isDesktop && Boolean(editingId));
  const detectedLinks = form.body.trim() ? form.body.match(/https?:\/\/[^\s<>"']+/gi)?.slice(0, 8) ?? [] : [];
  const shareTargets = shareTargetsFor(viewerId, members);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!ready || notes.length === 0 || composeKey) return;
    if (!isDesktop) return;
    if (isComposing && !editingId) return;
    const currentVisible = editingId ? notes.some((n) => n.id === editingId) : false;
    if (!currentVisible) onEdit(notes[0]!);
  }, [ready, notes, editingId, composeKey, isComposing, isDesktop, onEdit]);

  useEffect(() => {
    if (composeKey) {
      setMobileEditor(true);
      requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [composeKey]);

  useEffect(() => {
    if (editingId) setMobileEditor(true);
  }, [editingId]);

  const handleBack = () => {
    setMobileEditor(false);
    onCancelEdit();
  };

  const handleNew = () => {
    onNewNote();
    setMobileEditor(true);
  };

  const handleSelect = (note: TeamPersonalNoteDto) => onEdit(note);

  const handleDeleteCurrent = () => {
    if (activeNote?.isOwner) onDelete(activeNote);
    setMobileEditor(false);
    onCancelEdit();
  };

  const outletFilterLabel = outletFilter
    ? outletFilter === "__direct__"
      ? "Direct"
      : TEAM_AD_OUTLETS.find((o) => o.id === outletFilter)?.label ?? "Outlet"
    : null;

  const listPane = (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden bg-[#06060a] xl:bg-[#09090e]">
      <div className="shrink-0 space-y-2.5 border-b border-white/[0.06] px-4 py-3 max-xl:pr-[max(1rem,env(safe-area-inset-right))] xl:border-white/[0.05] xl:px-3 xl:py-2.5">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex w-4 items-center justify-center text-white/30">
              <IconSearch />
            </span>
            <input
              type="text"
              inputMode="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search"
              className="h-9 w-full rounded-[10px] bg-white/[0.08] py-0 pl-9 pr-3 text-[15px] text-white/85 outline-none placeholder:text-white/30 xl:h-8 xl:rounded-lg xl:bg-white/[0.035] xl:text-[12px] xl:ring-1 xl:ring-white/[0.06] xl:placeholder:text-white/22"
            />
          </div>
          <button
            type="button"
            onClick={() => setOutletSheetOpen(true)}
            className={`flex h-9 shrink-0 items-center gap-1 rounded-[10px] px-2.5 text-[13px] font-medium xl:hidden ${
              outletFilter
                ? "bg-amber-500/15 text-amber-200"
                : "bg-white/[0.08] text-white/55"
            }`}
            aria-label="Filter by outlet"
          >
            <IconTag className="h-3.5 w-3.5" />
            {outletFilterLabel ? <span className="max-w-[4rem] truncate">{outletFilterLabel}</span> : null}
          </button>
          <button
            type="button"
            onClick={handleNew}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-white/65 ring-1 ring-white/[0.08] xl:flex"
            aria-label="New note"
          >
            <IconPlusSmall />
          </button>
        </div>
        <SegmentedControl
          options={[
            { id: "all" as const, label: "All" },
            { id: "mine" as const, label: "Mine" },
            { id: "shared" as const, label: "Shared" },
          ]}
          value={scope}
          onChange={onScopeChange}
        />
        <div className="hidden gap-1 overflow-x-auto pb-0.5 xl:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip active={!outletFilter} onClick={() => onOutletFilterChange("")}>All outlets</FilterChip>
          <FilterChip active={outletFilter === "__direct__"} onClick={() => onOutletFilterChange("__direct__")}>Direct</FilterChip>
          {TEAM_AD_OUTLETS.map((o) => (
            <FilterChip key={o.id} active={outletFilter === o.id} onClick={() => onOutletFilterChange(o.id)} tone="amber">
              {o.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {!ready ? (
          <div className="space-y-px p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="mx-2 h-[72px] animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
            <p className="text-[15px] text-white/40">No notes here</p>
            <button
              type="button"
              onClick={handleNew}
              className="mt-4 rounded-full bg-amber-500/20 px-5 py-2.5 text-[15px] font-medium text-amber-200 active:bg-amber-500/30 xl:hidden"
            >
              New Note
            </button>
          </div>
        ) : (
          notes.map((note) => (
            <NoteListItem key={note.id} note={note} selected={editingId === note.id} onClick={() => handleSelect(note)} />
          ))
        )}
      </div>

      <p className="hidden shrink-0 border-t border-white/[0.04] px-3 py-1.5 text-center text-[10px] text-white/18 xl:block">
        {notes.length} note{notes.length === 1 ? "" : "s"}
      </p>

      <OutletFilterSheet
        open={outletSheetOpen}
        value={outletFilter}
        onChange={onOutletFilterChange}
        onClose={() => setOutletSheetOpen(false)}
      />
    </div>
  );

  const editorPane = showEditor ? (
    <NoteEditor
      form={form}
      editingId={editingId}
      readOnly={readOnly}
      saving={saving}
      uploading={uploading}
      detectedLinks={detectedLinks}
      lastEdited={activeNote?.updatedAt}
      onFormChange={onFormChange}
      onSave={onSave}
      onDelete={activeNote?.isOwner ? handleDeleteCurrent : undefined}
      onBack={handleBack}
      onUploadFile={onUploadFile}
      shareTargets={shareTargets}
      showBack
      bodyRef={bodyRef}
      titleRef={titleRef}
      onShare={onShareNote}
    />
  ) : (
    <div className="hidden h-full flex-col items-center justify-center px-8 text-center xl:flex">
      <p className="text-sm text-white/35">Select a note</p>
      <button type="button" onClick={handleNew} className="mt-4 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] text-white/55 ring-1 ring-white/[0.08]">
        <IconPlusSmall />
        New note
      </button>
    </div>
  );

  const mobileFullscreenEditor = showEditor && mobileEditor && !isDesktop;

  return (
    <>
      <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden xl:rounded-xl xl:border xl:border-white/[0.05] xl:bg-[#07070b] xl:min-h-[calc(100dvh-10.5rem)]">
        <div className="grid min-h-0 w-full min-w-0 flex-1 xl:min-h-[calc(100dvh-10.5rem)] xl:grid-cols-[minmax(248px,280px)_1fr]">
          <div className={`min-h-0 w-full min-w-0 max-w-full overflow-hidden xl:border-r xl:border-white/[0.05] ${showEditor ? "hidden xl:flex xl:flex-col" : "flex flex-col"}`}>
            {listPane}
          </div>
          <div className={`hidden min-h-0 bg-[#0b0b10] xl:flex xl:flex-col ${showEditor ? "xl:flex" : ""}`}>
            {editorPane}
          </div>
        </div>
      </div>

      {mobileFullscreenEditor ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0b10] xl:hidden">
          {editorPane}
        </div>
      ) : null}
    </>
  );
}
