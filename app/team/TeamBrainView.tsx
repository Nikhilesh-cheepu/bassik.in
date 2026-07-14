"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { getTodayKey } from "@/lib/team-checklists";
import type { TeamBrainItemDto } from "@/lib/team-brain";
import { TEAM_SHEET_OVERLAY, TEAM_SHEET_PANEL } from "./TeamNav";

type Mode = "notes" | "today";

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return {};
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(res.ok ? "Invalid response" : `Server error (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  }
  return data;
}

function TagChips({
  tags,
  onToggle,
}: {
  tags: string[];
  onToggle: (tag: string) => void;
}) {
  const presets = useMemo(() => TEAM_AD_OUTLETS.map((o) => o.label), []);
  return (
    <div className="flex flex-wrap gap-1">
      {presets.map((tag) => {
        const on = tags.some((t) => t.toLowerCase() === tag.toLowerCase());
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
              on ? "bg-cyan-400/20 text-cyan-100" : "bg-white/[0.04] text-white/40 hover:text-white/65"
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

function BrainRow({
  item,
  busy,
  onToggle,
  onDelete,
}: {
  item: TeamBrainItemDto;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-start gap-2 border-b border-white/[0.05] py-2.5">
      <button
        type="button"
        disabled={busy}
        onClick={onToggle}
        aria-label={item.done ? "Mark open" : "Mark done"}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          item.done
            ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-200"
            : "border-white/25 text-transparent hover:border-white/40"
        }`}
      >
        {item.done ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`whitespace-pre-wrap text-[14px] leading-snug ${
            item.done ? "text-white/35 line-through" : "text-white/88"
          }`}
        >
          {item.body}
        </p>
        {item.tags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span key={t} className="text-[10px] font-medium uppercase tracking-wide text-white/30">
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="shrink-0 text-[11px] text-white/25 opacity-0 transition group-hover:opacity-100 hover:text-red-300"
      >
        Delete
      </button>
    </div>
  );
}

export default function TeamBrainView() {
  const [mode, setMode] = useState<Mode>("notes");
  const [items, setItems] = useState<TeamBrainItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiBullets, setAiBullets] = useState<string[]>([]);
  const today = getTodayKey();

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (mode === "notes") qs.set("kind", "note");
      else {
        qs.set("kind", "reminder");
        qs.set("remindOn", today);
      }
      if (showDone) qs.set("includeDone", "1");
      const res = await fetch(`/api/team/brain?${qs}`);
      const data = await readJson(res);
      setItems((data.items as TeamBrainItemDto[]) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [mode, showDone, today]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.some((t) => t.toLowerCase() === tag.toLowerCase())
        ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...prev, tag].slice(0, 8)
    );
  };

  const addCustomTag = () => {
    const t = customTag.trim().replace(/^#/, "");
    if (!t) return;
    toggleTag(t);
    setCustomTag("");
  };

  const addItem = async () => {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/team/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: mode === "notes" ? "note" : "reminder",
          body,
          tags,
          remindOn: mode === "today" ? today : undefined,
        }),
      });
      await readJson(res);
      setDraft("");
      setTags([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (item: TeamBrainItemDto) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/team/brain/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !item.done }),
      });
      await readJson(res);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: TeamBrainItemDto) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/team/brain/${item.id}`, { method: "DELETE" });
      await readJson(res);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const runAi = async (aiMode: "summarize" | "explain") => {
    setAiBusy(true);
    setAiOpen(true);
    try {
      const res = await fetch("/api/team/brain/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: aiMode }),
      });
      const data = await readJson(res);
      setAiSummary(typeof data.summary === "string" ? data.summary : null);
      setAiBullets(Array.isArray(data.bullets) ? (data.bullets as string[]) : []);
    } catch (err) {
      setAiSummary(err instanceof Error ? err.message : "AI failed");
      setAiBullets([]);
    } finally {
      setAiBusy(false);
    }
  };

  const openCount = items.filter((i) => !i.done).length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#06060a]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28 xl:pb-10">
        <div className="mx-auto max-w-2xl py-4">
          <div className="mb-4">
            <h2 className="text-[22px] font-semibold tracking-tight text-white">My Brain</h2>
            <p className="mt-0.5 text-[12px] text-white/40">
              HQ dump — your words, optional tags. Notes + today&apos;s reminders only.
            </p>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 rounded-xl bg-white/[0.05] p-1 ring-1 ring-white/10">
              {(
                [
                  { id: "notes" as const, label: "Notes" },
                  { id: "today" as const, label: "Today" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMode(t.id)}
                  className={`h-9 flex-1 rounded-lg text-[13px] font-semibold ${
                    mode === t.id ? "bg-white text-black" : "text-white/45 hover:text-white/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void runAi("summarize")}
              className="h-9 shrink-0 rounded-xl bg-violet-400/20 px-3 text-[12px] font-semibold text-violet-100 ring-1 ring-violet-300/25"
            >
              AI
            </button>
          </div>

          {error ? (
            <div className="mb-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
          ) : null}

          <div className="mb-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder={
                mode === "notes"
                  ? "Dump anything… design notes, what someone said, random chaos"
                  : "Remind me today…"
              }
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white outline-none placeholder:text-white/28"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void addItem();
                }
              }}
            />
            <div className="mt-2 space-y-2 border-t border-white/[0.06] pt-2">
              <TagChips tags={tags} onToggle={toggleTag} />
              <div className="flex gap-1.5">
                <input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Custom tag"
                  className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 text-[12px] text-white outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="h-8 rounded-lg px-2 text-[11px] text-white/45"
                >
                  Add tag
                </button>
                <button
                  type="button"
                  disabled={saving || !draft.trim()}
                  onClick={() => void addItem()}
                  className="h-8 rounded-lg bg-cyan-400 px-3 text-[12px] font-semibold text-black disabled:opacity-40"
                >
                  {saving ? "…" : "Add"}
                </button>
              </div>
              <p className="text-[10px] text-white/28">⌘/Ctrl + Enter to add</p>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/35">
              {mode === "notes" ? "Checklist" : `Reminders · ${today}`} · {openCount} open
            </p>
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              className="text-[11px] text-white/35 hover:text-white/55"
            >
              {showDone ? "Hide done" : "Show done"}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-cyan-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="border-y border-white/[0.05] py-10 text-center text-[13px] text-white/30">
              {mode === "notes" ? "Empty brain. Dump the first thing." : "No reminders for today."}
            </p>
          ) : (
            <div>
              {items.map((item) => (
                <BrainRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onToggle={() => void toggleDone(item)}
                  onDelete={() => void remove(item)}
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void runAi("summarize")}
              className="h-9 flex-1 rounded-xl border border-white/10 text-[12px] font-medium text-white/60"
            >
              Summarize what I have
            </button>
            <button
              type="button"
              onClick={() => void runAi("explain")}
              className="h-9 flex-1 rounded-xl border border-white/10 text-[12px] font-medium text-white/60"
            >
              Explain it to me
            </button>
          </div>
        </div>
      </div>

      {aiOpen ? (
        <div className={TEAM_SHEET_OVERLAY} onClick={() => !aiBusy && setAiOpen(false)}>
          <div className={`${TEAM_SHEET_PANEL} max-w-lg space-y-3`} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-white">
              {aiBusy ? "Reading your brain…" : "Your HQ summary"}
            </h2>
            {aiBusy ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-violet-400" />
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/75">
                  {aiSummary}
                </p>
                {aiBullets.length > 0 ? (
                  <ul className="space-y-1.5">
                    {aiBullets.map((b) => (
                      <li key={b} className="text-[13px] text-white/55">
                        · {b}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => setAiOpen(false)}
              className="w-full rounded-xl border border-white/10 py-3 text-sm text-white/60"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
