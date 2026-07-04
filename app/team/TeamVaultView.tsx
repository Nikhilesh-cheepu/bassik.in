"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TEAM_AD_OUTLETS, teamOutletLabel } from "@/lib/team-outlets";
import type { TeamVaultEntryDto, VaultListScope } from "@/lib/team-vault";
import { formatVaultListDate, vaultDisplayTitle, vaultPreviewText } from "@/lib/team-vault";
import { linkDisplayLabel } from "@/lib/team-personal-notes";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";
import { IconChevronDown } from "./TeamIcons";

export type VaultForm = {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  outletId: string;
  category: string;
  sharedWith: string[];
};

export const emptyVaultForm = (): VaultForm => ({
  title: "",
  username: "",
  password: "",
  url: "",
  notes: "",
  outletId: "",
  category: "",
  sharedWith: [],
});

type Member = { id: string; name: string };
type PanelMode = "empty" | "view" | "edit" | "create";

function IconKey({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="8" cy="15" r="4" />
      <path d="M12 15h8M16 11l4 4" strokeLinecap="round" />
      <path d="M14 5a3 3 0 00-3 3v2" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconCopy({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function IconEye({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="2.5" />
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

function IconShare({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" strokeLinecap="round" strokeLinejoin="round" />
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

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function SegmentedControl({
  value,
  onChange,
}: {
  value: VaultListScope;
  onChange: (v: VaultListScope) => void;
}) {
  const opts: { id: VaultListScope; label: string }[] = [
    { id: "all", label: "All" },
    { id: "mine", label: "Mine" },
    { id: "shared", label: "Shared" },
  ];
  return (
    <div className="flex rounded-[10px] bg-white/[0.07] p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`min-h-[32px] flex-1 rounded-[8px] text-[13px] font-medium ${
            value === o.id ? "bg-white/[0.14] text-white shadow-sm" : "text-white/45"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
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
  onConfirm?: () => void;
}) {
  if (!open) return null;
  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <div className={`${TEAM_SHEET_PANEL} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[17px] font-semibold text-white">Share with team</h2>
        <p className="mt-1 text-[12px] text-white/40">Teammates can view and copy — not edit or delete</p>
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
                    onClick={() =>
                      onChange(on ? selected.filter((x) => x !== m.id) : [...selected, m.id])
                    }
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] ${
                      on ? "bg-violet-500/15 text-white ring-1 ring-violet-400/20" : "text-white/70"
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
          onClick={onConfirm ?? onClose}
          className="mt-4 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : selected.length > 0 ? `Share with ${selected.length}` : "Done"}
        </button>
      </div>
    </div>
  );
}

function VaultListItem({
  entry,
  selected,
  onClick,
  onShare,
}: {
  entry: TeamVaultEntryDto;
  selected: boolean;
  onClick: () => void;
  onShare?: () => void;
}) {
  const title = vaultDisplayTitle(entry);
  const preview = vaultPreviewText(entry);
  return (
    <div
      className={`flex w-full items-center gap-2 border-b border-white/[0.06] px-4 py-3.5 ${
        selected ? "bg-white/[0.06]" : ""
      }`}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-300/90 ring-1 ring-amber-400/15">
          <IconKey className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-white/92">{title}</p>
          <p className="mt-0.5 truncate text-[13px] text-white/38">{preview}</p>
          {!entry.isOwner && entry.sharedByLabel ? (
            <p className="mt-0.5 text-[10px] text-sky-300/60">from {entry.sharedByLabel}</p>
          ) : entry.sharedWithLabels.length > 0 ? (
            <p className="mt-0.5 text-[10px] text-violet-300/60">shared · {entry.sharedWithLabels.length}</p>
          ) : null}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        {entry.isOwner && onShare ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-300/80 active:bg-violet-500/15"
            aria-label="Share with team"
          >
            <IconShare className="h-4 w-4" />
          </button>
        ) : null}
        <span className="text-[11px] text-white/30">{formatVaultListDate(entry.updatedAt)}</span>
      </div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => {
        void copyToClipboard(value).then((ok) => {
          if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }
        });
      }}
      className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 text-[13px] font-medium text-white/70 disabled:opacity-30"
    >
      <IconCopy />
      {copied ? "Copied" : label}
    </button>
  );
}

function FieldRow({
  label,
  value,
  secret,
  href,
  forceShow,
}: {
  label: string;
  value: string;
  secret?: boolean;
  href?: string;
  forceShow?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!forceShow && !secret && !value) return null;
  const hasValue = Boolean(value);
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">{label}</p>
      <div className="mt-1.5 flex gap-2">
        <div className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
          <p className={`break-all text-[15px] text-white/90 ${secret && !show && hasValue ? "font-mono tracking-widest" : ""}`}>
            {secret && !show && hasValue
              ? "••••••••••••"
              : hasValue
                ? value
                : "Could not load — tap Edit and save again"}
          </p>
        </div>
        {secret ? (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            disabled={!hasValue}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/50 disabled:opacity-30"
            aria-label={show ? "Hide" : "Show"}
          >
            <IconEye />
          </button>
        ) : null}
        <button
          type="button"
          disabled={!hasValue}
          onClick={() => {
            void copyToClipboard(value).then((ok) => {
              if (ok) {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }
            });
          }}
          className="flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 text-[13px] font-semibold text-amber-200 disabled:opacity-30"
        >
          <IconCopy />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-[12px] text-cyan-400/80">
          Open {linkDisplayLabel(value)}
        </a>
      ) : null}
    </div>
  );
}

function VaultDetailView({
  entry,
  password,
  loading,
  onEdit,
  onBack,
  showBack,
}: {
  entry: TeamVaultEntryDto;
  password: string;
  loading: boolean;
  onEdit?: () => void;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const title = vaultDisplayTitle(entry);
  const url = entry.url ?? "";
  const href = url ? (url.startsWith("http") ? url : `https://${url}`) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 xl:px-6">
        <div className="flex min-w-0 items-center gap-1">
          {showBack && onBack ? (
            <button type="button" onClick={onBack} className="-ml-1 flex min-h-[44px] items-center gap-0.5 text-amber-400 xl:hidden">
              <IconChevronLeft className="h-5 w-5" />
              <span className="text-[17px]">Passwords</span>
            </button>
          ) : null}
          {!entry.isOwner && entry.sharedByLabel ? (
            <span className="text-[11px] text-sky-300/60">Shared by {entry.sharedByLabel}</span>
          ) : null}
        </div>
        {entry.isOwner && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[44px] rounded-lg px-4 text-[15px] font-semibold text-amber-400 xl:text-[13px]"
          >
            Edit
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 xl:px-8">
        <h2 className="text-[22px] font-bold text-white xl:text-xl">{title}</h2>
        {entry.category ? <p className="mt-1 text-[12px] text-white/35">{entry.category}</p> : null}
        {entry.outletId ? (
          <p className="mt-1 text-[12px] text-amber-200/60">{teamOutletLabel(entry.outletId)}</p>
        ) : null}

        {loading ? (
          <p className="mt-8 text-sm text-white/35">Loading credentials…</p>
        ) : (
          <div className="mt-6 space-y-4">
            <FieldRow label="Website" value={url} href={href} />
            <FieldRow label="Username" value={entry.username ?? ""} />
            <FieldRow label="Password" value={password} secret forceShow />
            {entry.notes ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Notes</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-white/55">{entry.notes}</p>
              </div>
            ) : null}
            {entry.sharedWithLabels.length > 0 ? (
              <p className="text-[12px] text-violet-300/70">
                Shared with {entry.sharedWithLabels.join(", ")}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function VaultEditor({
  form,
  editingId,
  saving,
  onFormChange,
  onSave,
  onCancel,
  onDelete,
  onBack,
  showBack,
}: {
  form: VaultForm;
  editingId: string | null;
  saving: boolean;
  onFormChange: (f: VaultForm) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ title: string; category: string } | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  const canSave = Boolean(form.password.trim()) && !saving;
  const isNew = !editingId;

  const runAiTitle = useCallback(async () => {
    const f = formRef.current;
    if (!f.url.trim() && !f.username.trim() && f.notes.trim().length < 8) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await fetch("/api/team/vault/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: f.url || undefined,
          username: f.username || undefined,
          notes: f.notes || undefined,
          outletId: f.outletId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI failed");
      const suggestion = {
        title: typeof data.title === "string" ? data.title.trim() : "",
        category: typeof data.category === "string" ? data.category.trim() : "",
      };
      setAiSuggestion(suggestion);
      if (!f.title.trim() && suggestion.title) {
        onFormChange({ ...formRef.current, title: suggestion.title, category: suggestion.category || f.category });
      }
    } catch {
      /* ignore */
    } finally {
      setAiLoading(false);
    }
  }, [onFormChange]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] xl:px-6">
          <div className="flex min-w-0 items-center gap-1">
            {showBack && onBack ? (
              <button type="button" onClick={onBack} className="-ml-1 flex min-h-[44px] items-center gap-0.5 text-amber-400 xl:hidden">
                <IconChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Passwords</span>
              </button>
            ) : (
              <span className="text-[13px] font-medium text-white/50">{isNew ? "New password" : "Edit password"}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onCancel} className="min-h-[44px] px-2 text-[14px] text-white/45 xl:text-[12px]">
              Cancel
            </button>
            {editingId && onDelete ? (
              <button type="button" onClick={onDelete} className="hidden px-2 text-[11px] text-red-300/80 sm:inline">
                Delete
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="min-h-[44px] px-3 text-[17px] font-semibold text-amber-400 disabled:opacity-35 xl:text-[13px]"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 xl:px-8">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Title</label>
          <div className="mt-1.5 flex flex-wrap items-start gap-2">
            <input
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              placeholder="e.g. Instagram — Club Rogue"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[17px] font-semibold text-white outline-none xl:text-[15px]"
            />
            <button
              type="button"
              onClick={() => void runAiTitle()}
              disabled={aiLoading}
              className="flex min-h-[48px] items-center gap-1.5 rounded-xl bg-violet-500/10 px-3 text-[12px] font-medium text-violet-200/90 ring-1 ring-violet-400/20 disabled:opacity-40"
            >
              <IconSparkle className={aiLoading ? "animate-pulse" : ""} />
              {aiLoading ? "Suggesting…" : "AI suggest"}
            </button>
          </div>
          {aiSuggestion?.title && aiSuggestion.title !== form.title.trim() ? (
            <button
              type="button"
              onClick={() =>
                onFormChange({
                  ...form,
                  title: aiSuggestion.title,
                  category: aiSuggestion.category || form.category,
                })
              }
              className="mt-2 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-[11px] text-violet-200/85 ring-1 ring-violet-400/15"
            >
              Use AI title: “{aiSuggestion.title}”
            </button>
          ) : null}
          {form.category ? <p className="mt-2 text-[12px] text-white/35">{form.category}</p> : null}

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Website</label>
              <input
                value={form.url}
                onChange={(e) => onFormChange({ ...form, url: e.target.value })}
                placeholder="https://…"
                className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[15px] text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Username</label>
              <input
                value={form.username}
                onChange={(e) => onFormChange({ ...form, username: e.target.value })}
                placeholder="Email or username"
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[15px] text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Password</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => onFormChange({ ...form, password: e.target.value })}
                placeholder="Required"
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 font-mono text-[15px] text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Outlet</label>
              <label className="relative mt-1.5 block">
                <select
                  value={form.outletId}
                  onChange={(e) => onFormChange({ ...form, outletId: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[15px] text-white outline-none"
                >
                  <option value="">Direct / general</option>
                  {TEAM_AD_OUTLETS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              </label>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
                placeholder="Security questions, 2FA backup, etc."
                rows={3}
                className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[15px] text-white outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyPanel({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <IconKey className="h-12 w-12 text-white/15" />
      <p className="mt-4 text-[15px] text-white/40">Select a password on the left</p>
      <p className="mt-1 text-[13px] text-white/28">or create a new one</p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 rounded-full bg-amber-500/20 px-6 py-2.5 text-[15px] font-medium text-amber-200 active:bg-amber-500/30"
      >
        + New password
      </button>
    </div>
  );
}

function shareTargetsFor(viewerId: string, members: Member[]): Member[] {
  const list = [...members];
  if (viewerId !== "admin") list.push({ id: "admin", name: "Admin" });
  return list.filter((m) => m.id !== viewerId);
}

async function fetchPassword(entryId: string): Promise<string> {
  const res = await fetch(`/api/team/vault/${entryId}/reveal`);
  const data = await res.json();
  if (!res.ok || typeof data.password !== "string") return "";
  return data.password;
}

export default function TeamVaultView({
  entries,
  ready,
  form,
  editingId,
  composeKey,
  savedEntryId,
  search,
  onSearchChange,
  scope,
  onScopeChange,
  viewerId,
  members,
  onFormChange,
  onSave,
  onCancelEdit,
  onNewEntry,
  onClearSavedEntry,
  saving,
  onLoadForEdit,
  onDelete,
  onShareEntry,
}: {
  entries: TeamVaultEntryDto[];
  ready: boolean;
  form: VaultForm;
  editingId: string | null;
  composeKey?: number;
  savedEntryId?: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  scope: VaultListScope;
  onScopeChange: (s: VaultListScope) => void;
  viewerId: string;
  members: Member[];
  onFormChange: (f: VaultForm) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onNewEntry: () => void;
  onClearSavedEntry?: () => void;
  saving: boolean;
  onLoadForEdit: (entry: TeamVaultEntryDto) => Promise<void>;
  onDelete: (entry: TeamVaultEntryDto) => void;
  onShareEntry: (entryId: string, sharedWith: string[]) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");
  const [viewPassword, setViewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSelection, setShareSelection] = useState<string[]>([]);
  const [shareEntryId, setShareEntryId] = useState<string | null>(null);
  const [shareSaving, setShareSaving] = useState(false);
  const shareTargets = shareTargetsFor(viewerId, members);

  const openShareFromList = useCallback((entry: TeamVaultEntryDto) => {
    setShareEntryId(entry.id);
    setShareSelection(entry.sharedWith);
    setShareOpen(true);
  }, []);

  const closeShare = useCallback(() => {
    setShareOpen(false);
    setShareSaving(false);
  }, []);

  const confirmShare = useCallback(async () => {
    if (!shareEntryId) return;
    setShareSaving(true);
    try {
      await onShareEntry(shareEntryId, shareSelection);
      closeShare();
    } finally {
      setShareSaving(false);
    }
  }, [shareEntryId, shareSelection, onShareEntry, closeShare]);

  const activeEntry = selectedId ? entries.find((e) => e.id === selectedId) : null;

  const loadViewPassword = useCallback(async (entryId: string) => {
    setPasswordLoading(true);
    setViewPassword("");
    try {
      setViewPassword(await fetchPassword(entryId));
    } finally {
      setPasswordLoading(false);
    }
  }, []);

  const selectEntry = useCallback(
    async (entry: TeamVaultEntryDto) => {
      setSelectedId(entry.id);
      setPanelMode("view");
      setMobilePanel(true);
      onCancelEdit();
      await loadViewPassword(entry.id);
    },
    [loadViewPassword, onCancelEdit]
  );

  const startCreate = () => {
    setSelectedId(null);
    setPanelMode("create");
    setMobilePanel(true);
    onNewEntry();
  };

  const startEdit = async () => {
    if (!activeEntry) return;
    setPanelMode("edit");
    await onLoadForEdit(activeEntry);
  };

  const cancelEdit = () => {
    onCancelEdit();
    if (activeEntry) {
      setPanelMode("view");
      void loadViewPassword(activeEntry.id);
    } else {
      setPanelMode("empty");
      setMobilePanel(false);
    }
  };

  const handleBackMobile = () => {
    setMobilePanel(false);
    setPanelMode("empty");
    setSelectedId(null);
    onCancelEdit();
  };

  useEffect(() => {
    if (!composeKey) return;
    setSelectedId(null);
    setPanelMode("create");
    setMobilePanel(true);
  }, [composeKey]);

  useEffect(() => {
    if (!savedEntryId) return;
    const entry = entries.find((e) => e.id === savedEntryId);
    if (entry) {
      void selectEntry(entry);
      onClearSavedEntry?.();
    }
  }, [savedEntryId, entries, selectEntry, onClearSavedEntry]);

  useEffect(() => {
    if (selectedId && !entries.some((e) => e.id === selectedId)) {
      setSelectedId(null);
      setPanelMode("empty");
      setMobilePanel(false);
    }
  }, [entries, selectedId]);

  const rightPane = (() => {
    if (panelMode === "empty") return <EmptyPanel onCreate={startCreate} />;
    if (panelMode === "view" && activeEntry) {
      return (
        <VaultDetailView
          entry={activeEntry}
          password={viewPassword}
          loading={passwordLoading}
          onEdit={activeEntry.isOwner ? () => void startEdit() : undefined}
          onBack={handleBackMobile}
          showBack
        />
      );
    }
    if (panelMode === "edit" || panelMode === "create") {
      return (
        <VaultEditor
          form={form}
          editingId={editingId}
          saving={saving}
          onFormChange={onFormChange}
          onSave={onSave}
          onCancel={cancelEdit}
          onDelete={activeEntry?.isOwner ? () => onDelete(activeEntry) : undefined}
          onBack={handleBackMobile}
          showBack
        />
      );
    }
    return <EmptyPanel onCreate={startCreate} />;
  })();

  const showMobileOverlay = mobilePanel && panelMode !== "empty";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:rounded-xl xl:border xl:border-white/[0.05] xl:bg-[#07070b]">
        <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(260px,300px)_1fr]">
          <div className={`flex min-h-0 flex-col bg-[#06060a] xl:border-r xl:border-white/[0.05] ${showMobileOverlay ? "hidden xl:flex" : "flex"}`}>
            <div className="shrink-0 space-y-2.5 border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/30">
                    <IconSearch />
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Search passwords"
                    className="h-9 w-full rounded-[10px] bg-white/[0.08] py-0 pl-9 pr-3 text-[15px] text-white outline-none placeholder:text-white/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={startCreate}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/20"
                  aria-label="New password"
                >
                  <IconPlus />
                </button>
              </div>
              <SegmentedControl value={scope} onChange={onScopeChange} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {!ready ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <IconKey className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-3 text-[15px] text-white/40">No passwords saved</p>
                  <button
                    type="button"
                    onClick={startCreate}
                    className="mt-4 rounded-full bg-amber-500/20 px-5 py-2.5 text-[15px] font-medium text-amber-200"
                  >
                    Add Password
                  </button>
                </div>
              ) : (
                entries.map((entry) => (
                  <VaultListItem
                    key={entry.id}
                    entry={entry}
                    selected={selectedId === entry.id}
                    onClick={() => void selectEntry(entry)}
                    onShare={entry.isOwner ? () => openShareFromList(entry) : undefined}
                  />
                ))
              )}
            </div>
          </div>
          <div className="hidden min-h-0 bg-[#0b0b10] xl:flex xl:flex-col">{rightPane}</div>
        </div>
      </div>
      {showMobileOverlay ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0b10] xl:hidden">{rightPane}</div>
      ) : null}

      <ShareSheet
        open={shareOpen}
        targets={shareTargets}
        selected={shareSelection}
        onChange={setShareSelection}
        onClose={closeShare}
        saving={shareSaving}
        onConfirm={() => void confirmShare()}
      />
    </>
  );
}
