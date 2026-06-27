"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamAiMessage } from "@/lib/team-ai";
import { TEAM_DOCK_PADDING } from "./TeamIcons";

type Member = { id: string; name: string };

const WELCOME: TeamAiMessage = {
  role: "assistant",
  content:
    "Talk naturally — I'll create tasks from what you say.\n\nExamples:\n• monday flyer for c53, boiler, firefly — due 27 june, assign Jeslyn\n• komma event post asap for Mahesh\n• links optional",
};

const STARTERS = ["Paste event brief + links", "Summarize open tasks"];

function storageKey(username: string) {
  return `bassik-team-ai:${username}`;
}

function parseStoredMessages(raw: string | null): TeamAiMessage[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const valid = parsed.filter(
      (m): m is TeamAiMessage =>
        Boolean(m) &&
        typeof m === "object" &&
        ((m as TeamAiMessage).role === "user" || (m as TeamAiMessage).role === "assistant") &&
        typeof (m as TeamAiMessage).content === "string"
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

export default function TeamAiPanel({
  username,
  members,
  onTasksCreated,
}: {
  username: string;
  members: Member[];
  onTasksCreated?: () => void;
}) {
  const [messages, setMessages] = useState<TeamAiMessage[]>([WELCOME]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = parseStoredMessages(localStorage.getItem(storageKey(username)));
    setMessages(stored ?? [WELCOME]);
    setHydrated(true);
  }, [username]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey(username), JSON.stringify(messages));
  }, [messages, hydrated, username]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = useCallback(
    async (text: string, baseMessages?: TeamAiMessage[]) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      const prior = baseMessages ?? messages;
      const next = [...prior, { role: "user" as const, content: trimmed }];
      setMessages(next);
      setInput("");
      setLoading(true);
      try {
        const res = await fetch("/api/team/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        const data = await res.json();
        const reply =
          typeof data.reply === "string"
            ? data.reply
            : data.error || "Something went wrong.";
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        if (Array.isArray(data.createdTasks) && data.createdTasks.length > 0) {
          onTasksCreated?.();
        }
      } catch {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Network error — try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, onTasksCreated]
  );

  const startEdit = (index: number) => {
    const msg = messages[index];
    if (msg?.role !== "user" || loading) return;
    setMessages(messages.slice(0, index));
    setInput(msg.content);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const clearChat = () => {
    if (!window.confirm("Clear this chat history?")) return;
    setMessages([WELCOME]);
    setInput("");
  };

  const names = members.map((m) => m.name).join(", ");

  return (
    <div className="flex min-h-[50dvh] flex-col max-xl:pb-0 xl:min-h-[calc(100dvh-12rem)] xl:rounded-2xl xl:border xl:border-white/[0.06] xl:bg-[#0a0a10]/40">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-1 py-2 xl:px-4 xl:py-3">
        <button
          type="button"
          onClick={() => setTipsOpen((o) => !o)}
          className="text-xs text-violet-300/80"
        >
          {tipsOpen ? "Hide tips" : "How to create tasks"}
        </button>
        <div className="flex gap-3 text-[10px] text-white/35">
          <span className="hidden sm:inline">Saved on device</span>
          {messages.length > 1 ? (
            <button type="button" onClick={clearChat} disabled={loading} className="text-white/45">
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {tipsOpen ? (
        <div className="mx-1 mb-2 rounded-xl border border-violet-500/20 bg-violet-500/8 px-3 py-2.5 xl:mx-4 xl:mt-3">
          <p className="text-xs leading-relaxed text-white/60">
            Paste outlets + links + date. Say{" "}
            <span className="text-white/85">assign to {members[0]?.name ?? "Amit"}</span> — works
            for {names || "your team"}.
          </p>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-0.5 py-2 max-xl:max-h-[min(48dvh,420px)] xl:max-h-none xl:px-4 xl:py-3"
      >
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <span
                className={`mb-1 px-1 text-[10px] font-medium uppercase tracking-wide ${
                  isUser ? "text-cyan-400/60" : "text-white/30"
                }`}
              >
                {isUser ? "You" : "AI"}
              </span>
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed md:max-w-[85%] xl:max-w-[70%] xl:text-sm ${
                  isUser
                    ? "rounded-br-md bg-cyan-500/18 text-cyan-50"
                    : "rounded-bl-md bg-white/[0.06] text-white/80"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {isUser ? (
                  <button
                    type="button"
                    onClick={() => startEdit(i)}
                    disabled={loading}
                    className="mt-2 rounded-lg px-2 py-1 text-xs text-cyan-100/70 hover:bg-black/20 disabled:opacity-40"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {loading ? (
          <p className="py-2 text-center text-xs text-violet-300/50">Working…</p>
        ) : null}
      </div>

      <div
        className="fixed left-0 right-0 z-20 border-t border-white/[0.08] bg-[#06060a]/98 backdrop-blur-sm xl:hidden"
        style={{ bottom: TEAM_DOCK_PADDING }}
      >
        <div className="mx-auto w-full max-w-lg px-3 py-2 sm:max-w-xl md:max-w-2xl md:px-4">
          <Composer
            input={input}
            setInput={setInput}
            loading={loading}
            onSend={send}
            starters={STARTERS}
            textareaRef={textareaRef}
          />
        </div>
      </div>

      <div className="hidden border-t border-white/[0.06] px-4 py-3 xl:block">
        <Composer
          input={input}
          setInput={setInput}
          loading={loading}
          onSend={send}
          starters={STARTERS}
          textareaRef={textareaRef}
        />
      </div>

      <div className="h-[148px] shrink-0 xl:hidden" aria-hidden />
    </div>
  );
}

function Composer({
  input,
  setInput,
  loading,
  onSend,
  starters,
  textareaRef,
}: {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  onSend: (text: string) => void;
  starters: string[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void onSend(s)}
            disabled={loading}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/55 disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSend(input);
        }}
        className="flex items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Brief + assign to Amit…"
          rows={2}
          className="min-h-[44px] max-h-[140px] flex-1 resize-y rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 text-[15px] leading-snug text-white placeholder:text-white/30 xl:min-h-[52px] xl:text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-[44px] shrink-0 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white disabled:opacity-40 xl:min-h-[52px]"
        >
          Send
        </button>
      </form>
    </>
  );
}
