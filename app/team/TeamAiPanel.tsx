"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TeamAiMessage } from "@/lib/team-ai";

type Member = { id: string; name: string };

const WELCOME: TeamAiMessage = {
  role: "assistant",
  content:
    "Paste a brief with outlets, links, and deadlines — I'll create HIGH priority tasks.\n\nTip: say assign to Amit or for Mahesh and I'll assign every task to them.",
};

const STARTERS = [
  "Paste event brief + links",
  "Summarize open tasks",
];

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
  const [tipsOpen, setTipsOpen] = useState(true);
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

  const memberHint =
    members.length > 0
      ? members.map((m) => m.name).join(", ")
      : "Amit, Jeslyn, Mahesh";

  return (
    <div className="relative -mx-1 flex min-h-[55dvh] flex-col pb-[168px]">
      {tipsOpen ? (
        <div className="mb-3 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs leading-relaxed text-white/65">
              <span className="font-medium text-violet-200">Create tasks:</span> paste outlets +
              links + date. Say{" "}
              <span className="text-white/90">assign to {members[0]?.name ?? "Amit"}</span> or{" "}
              <span className="text-white/90">for {members[2]?.name ?? "Mahesh"}</span> — works for{" "}
              {memberHint}.
            </p>
            <button
              type="button"
              onClick={() => setTipsOpen(false)}
              className="shrink-0 text-sm text-white/40"
              aria-label="Dismiss tips"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <p className="text-[10px] text-white/35">Saved on this device</p>
        <div className="flex gap-3">
          {!tipsOpen ? (
            <button
              type="button"
              onClick={() => setTipsOpen(true)}
              className="text-[10px] text-violet-300/70"
            >
              Tips
            </button>
          ) : null}
          {messages.length > 1 ? (
            <button
              type="button"
              onClick={clearChat}
              disabled={loading}
              className="text-[10px] text-white/40 disabled:opacity-40"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5"
        style={{ maxHeight: "min(52dvh, 480px)" }}
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
                className={`max-w-[95%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
                  isUser
                    ? "rounded-br-md bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-400/15"
                    : "rounded-bl-md bg-white/[0.06] text-white/80 ring-1 ring-white/[0.06]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {isUser ? (
                  <button
                    type="button"
                    onClick={() => startEdit(i)}
                    disabled={loading}
                    className="mt-2 min-h-[32px] rounded-lg bg-black/20 px-2.5 py-1 text-xs font-medium text-cyan-100/80 disabled:opacity-40"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {loading ? (
          <p className="py-2 text-center text-xs text-violet-300/50">Creating tasks…</p>
        ) : null}
      </div>

      <div className="fixed bottom-[calc(52px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-20 border-t border-white/[0.08] bg-[#06060a]/98 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-3 py-2.5">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                disabled={loading}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/55 disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Brief + assign to Amit…"
              rows={2}
              className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 text-[15px] leading-snug text-white placeholder:text-white/30"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="min-h-[44px] shrink-0 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
