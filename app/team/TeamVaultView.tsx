"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
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
}: {
  open: boolean;
  targets: Member[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className={TEAM_SHEET_OVERLAY} onClick={onClose}>
      <div className={`${TEAM_SHEET_PANEL} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[17px] font-semibold text-white">Share password</h2>
        <p className="mt-1 text-[12px] text-white/40">Teammates can view and copy — not edit</p>
        <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto">
          {targets.map((m) => {
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
          })}
        </ul>
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-white/[0.09] py-3 text-sm font-medium text-white">
          Done
        </button>
      </div>
    </div>
  );
}

function VaultListItem({
  entry,
  selected,
  onClick,
}: {
  entry: TeamVaultEntryDto;
  selected: boolean;
  onClick: () => void;
}) {
  const title = vaultDisplayTitle(entry);
  const preview = vaultPreviewText(entry);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 text-left active:bg-white/[0.04] ${
        selected ? "bg-white/[0.05]" : ""
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-300/90 ring-1 ring-amber-400/15">
        <IconKey className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-white/92">{title}</p>
        <p className="mt-0.5 truncate text-[13px] text-white/38">{preview}</p>
        {!entry.isOwner && entry.sharedByLabel ? (
          <p className="mt-0.5 text-[10px] text-sky-300/60">from {entry.sharedByLabel}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-[12px] text-white/30">{formatVaultListDate(entry.updatedAt)}</span>
    </button>
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

function VaultEditor({
  form,
  editingId,
  readOnly,
  saving,
  onFormChange,
  onSave,
  onDelete,
  onBack,
  shareTargets,
  showBack,
}: {
  form: VaultForm;
  editingId: string | null;
  readOnly: boolean;
  saving: boolean;
  onFormChange: (f: VaultForm) => void;
  onSave: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  shareTargets: Member[];
  showBack?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  const canSave = Boolean(form.password.trim()) && !saving && !readOnly;

  const runAiTitle = useCallback(async () => {
    const f = formRef.current;
    if (!f.url.trim() && !f.username.trim() && f.notes.trim().length < 8) return;
    setAiLoading(true);
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
      onFormChange({
        ...formRef.current,
        title: data.title || formRef.current.title,
        category: data.category || formRef.current.category,
      });
    } catch {
      /* ignore */
    } finally {
      setAiLoading(false);
    }
  }, [onFormChange]);

  useEffect(() => {
    if (readOnly) return;
    const f = form;
    if (!f.url.trim() && !f.username.trim()) return;
    if (f.title.trim()) return;
    const t = window.setTimeout(() => void runAiTitle(), 1200);
    return () => window.clearTimeout(t);
  }, [form.url, form.username, form.notes, form.outletId, form.title, readOnly, runAiTitle]);

  useEffect(() => {
    setShowPassword(false);
  }, [editingId]);

  const copyField = (field: string, text: string) => {
    void copyToClipboard(text).then((ok) => {
      if (ok) {
        setCopiedField(field);
        window.setTimeout(() => setCopiedField(null), 1500);
      }
    });
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] xl:px-6">
          <div className="flex min-w-0 items-center gap-1">
            {showBack && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="-ml-1 flex min-h-[44px] items-center gap-0.5 text-amber-400 xl:hidden"
              >
                <IconChevronLeft className="h-5 w-5" />
                <span className="text-[17px]">Passwords</span>
              </button>
            ) : null}
            {readOnly ? <span className="text-[11px] text-sky-300/60">Shared · view & copy</span> : null}
          </div>
          <div className="flex items-center gap-1">
            {!readOnly ? (
              <>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50"
                  aria-label="Share"
                >
                  <IconShare />
                </button>
                <button
                  type="button"
                  onClick={() => void runAiTitle()}
                  disabled={aiLoading}
                  className="hidden h-9 items-center gap-1 rounded-lg px-2 text-[11px] text-white/45 sm:flex"
                >
                  <IconSparkle className={aiLoading ? "animate-pulse" : ""} />
                  AI title
                </button>
                {editingId && onDelete ? (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="hidden h-9 px-2 text-[11px] text-red-300/80 xl:inline"
                  >
                    Delete
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!canSave}
                  className="min-h-[44px] px-3 text-[17px] font-semibold text-amber-400 disabled:opacity-35 xl:text-[11px] xl:font-medium xl:text-white/90"
                >
                  {saving ? "Saving…" : "Done"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 xl:px-8">
          <input
            value={form.title}
            readOnly={readOnly}
            onChange={(e) => onFormChange({ ...form, title: e.target.value })}
            placeholder="Title"
            className="w-full bg-transparent text-[22px] font-bold text-white placeholder:text-white/22 outline-none xl:text-xl"
          />
          {form.category ? (
            <p className="mt-1 text-[12px] text-white/35">{form.category}</p>
          ) : null}

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Website</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={form.url}
                  readOnly={readOnly}
                  onChange={(e) => onFormChange({ ...form, url: e.target.value })}
                  placeholder="https://…"
                  className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[15px] text-white outline-none"
                />
                {form.url ? (
                  <CopyButton value={form.url} label="Copy" />
                ) : null}
              </div>
              {form.url ? (
                <a
                  href={form.url.startsWith("http") ? form.url : `https://${form.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-[12px] text-cyan-400/80"
                >
                  Open {linkDisplayLabel(form.url)}
                </a>
              ) : null}
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Username</label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={form.username}
                  readOnly={readOnly}
                  onChange={(e) => onFormChange({ ...form, username: e.target.value })}
                  placeholder="Email or username"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-[15px] text-white outline-none"
                />
                <CopyButton value={form.username} label="Copy" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Password</label>
              <div className="mt-1.5 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    readOnly={readOnly}
                    onChange={(e) => onFormChange({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 pr-11 text-[15px] text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40"
                    aria-label={showPassword ? "Hide" : "Show"}
                  >
                    <IconEye />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => copyField("pw", form.password)}
                  disabled={!form.password}
                  className="flex min-h-[48px] items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 text-[13px] font-semibold text-amber-200 disabled:opacity-30"
                >
                  <IconCopy />
                  {copiedField === "pw" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {!readOnly ? (
              <>
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
              </>
            ) : form.notes ? (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Notes</label>
                <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">{form.notes}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ShareSheet
        open={shareOpen}
        targets={shareTargets}
        selected={form.sharedWith}
        onChange={(sharedWith) => onFormChange({ ...form, sharedWith })}
        onClose={() => setShareOpen(false)}
      />
    </>
  );
}

function shareTargetsFor(viewerId: string, members: Member[]): Member[] {
  const list = [...members];
  if (viewerId !== "admin") list.push({ id: "admin", name: "Admin" });
  return list.filter((m) => m.id !== viewerId);
}

export default function TeamVaultView({
  entries,
  ready,
  form,
  editingId,
  composeKey,
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
  saving,
  onEdit,
  onDelete,
}: {
  entries: TeamVaultEntryDto[];
  ready: boolean;
  form: VaultForm;
  editingId: string | null;
  composeKey?: number;
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
  saving: boolean;
  onEdit: (entry: TeamVaultEntryDto) => void;
  onDelete: (entry: TeamVaultEntryDto) => void;
}) {
  const [mobileEditor, setMobileEditor] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const activeEntry = editingId ? entries.find((e) => e.id === editingId) : null;
  const readOnly = Boolean(activeEntry && !activeEntry.isOwner);
  const isComposing = Boolean(editingId || form.title || form.password);
  const showEditor = mobileEditor || isComposing || (isDesktop && Boolean(editingId));
  const shareTargets = shareTargetsFor(viewerId, members);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!ready || entries.length === 0 || composeKey) return;
    if (!isDesktop || isComposing) return;
    if (editingId && entries.some((e) => e.id === editingId)) return;
    onEdit(entries[0]!);
  }, [ready, entries, editingId, composeKey, isComposing, isDesktop, onEdit]);

  useEffect(() => {
    if (composeKey) setMobileEditor(true);
  }, [composeKey]);

  useEffect(() => {
    if (editingId) setMobileEditor(true);
  }, [editingId]);

  const handleBack = () => {
    setMobileEditor(false);
    onCancelEdit();
  };

  const handleSelect = (entry: TeamVaultEntryDto) => {
    void onEdit(entry);
  };

  const editorPane = showEditor ? (
    <VaultEditor
      form={form}
      editingId={editingId}
      readOnly={readOnly}
      saving={saving}
      onFormChange={onFormChange}
      onSave={onSave}
      onDelete={activeEntry?.isOwner ? () => onDelete(activeEntry) : undefined}
      onBack={handleBack}
      shareTargets={shareTargets}
      showBack
    />
  ) : (
    <div className="hidden h-full flex-col items-center justify-center px-8 text-center xl:flex">
      <IconKey className="h-10 w-10 text-white/20" />
      <p className="mt-3 text-sm text-white/35">Select a saved password</p>
      <button
        type="button"
        onClick={() => {
          onNewEntry();
          setMobileEditor(true);
        }}
        className="mt-4 rounded-full bg-amber-500/20 px-4 py-2 text-[13px] text-amber-200"
      >
        Add password
      </button>
    </div>
  );

  const mobileFullscreenEditor = showEditor && mobileEditor && !isDesktop;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:rounded-xl xl:border xl:border-white/[0.05] xl:bg-[#07070b]">
        <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(260px,300px)_1fr]">
          <div className={`flex min-h-0 flex-col bg-[#06060a] xl:border-r xl:border-white/[0.05] ${showEditor ? "hidden xl:flex" : "flex"}`}>
            <div className="shrink-0 space-y-2.5 border-b border-white/[0.06] px-4 py-3">
              <div className="relative">
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
                    onClick={() => {
                      onNewEntry();
                      setMobileEditor(true);
                    }}
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
                    selected={editingId === entry.id}
                    onClick={() => handleSelect(entry)}
                  />
                ))
              )}
            </div>
          </div>
          <div className={`hidden min-h-0 bg-[#0b0b10] xl:flex xl:flex-col ${showEditor ? "xl:flex" : ""}`}>
            {editorPane}
          </div>
        </div>
      </div>
      {mobileFullscreenEditor ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0b10] xl:hidden">{editorPane}</div>
      ) : null}
    </>
  );
}
