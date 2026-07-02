"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Kiik69AiMessage } from "@/lib/kiik69-accountant-ai";
import { formatKiik69Timestamp } from "@/lib/kiik69-datetime";
import { KIIK69_DOCK_PADDING } from "./Kiik69Nav";
import { IconSparkle } from "./Kiik69Icons";

const WELCOME: Kiik69AiMessage = {
  role: "assistant",
  content:
    "I'm your KIIK 69 kitchen accountant.\n\nRules I follow:\n• 70/30 is for kitchen SALES only — ₹1,000 sale → ₹700 Bassik + ₹300 to selling outlet (KIIK / Sky High / Sound of Soul)\n• Purchases are tagged per outlet — not split 70/30\n\nTry:\n• How much did KIIK 69 spend this month?\n• Party for 25 plates — total?\n• Kitchen sale ₹10,000 — split for Sky High?",
};

const STARTERS = [
  "This month's spend by outlet",
  "Top vendors this month",
  "How do I log a mixed grocery bill?",
  "Summarize my recent purchases",
];

const STORAGE_KEY = "bassik-kiik69-ai";

function parseStored(raw: string | null): Kiik69AiMessage[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const valid = parsed.filter(
      (m): m is Kiik69AiMessage =>
        Boolean(m) &&
        typeof m === "object" &&
        ((m as Kiik69AiMessage).role === "user" || (m as Kiik69AiMessage).role === "assistant") &&
        typeof (m as Kiik69AiMessage).content === "string"
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

function stamp(): string {
  return new Date().toISOString();
}

export default function Kiik69AiPanel({ seedMessage }: { seedMessage?: string | null }) {
  const [messages, setMessages] = useState<Kiik69AiMessage[]>([WELCOME]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSeed = useRef<string | null>(null);

  useEffect(() => {
    setMessages(parseStored(localStorage.getItem(STORAGE_KEY)) ?? [WELCOME]);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, hydrated]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = useCallback(
    async (text: string, baseMessages?: Kiik69AiMessage[]) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      const prior = baseMessages ?? messages;
      const next = [...prior, { role: "user" as const, content: trimmed, createdAt: stamp() }];
      setMessages(next);
      setInput("");
      setLoading(true);
      try {
        const res = await fetch("/api/kiik69accounts/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        const data = await res.json();
        const reply =
          typeof data.reply === "string" ? data.reply : data.error || "Something went wrong.";
        setMessages((m) => [...m, { role: "assistant", content: reply, createdAt: stamp() }]);
      } catch {
        setMessages((m) => [...m, { role: "assistant", content: "Network error — try again.", createdAt: stamp() }]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  useEffect(() => {
    if (!hydrated || !seedMessage?.trim()) return;
    if (lastSeed.current === seedMessage) return;
    lastSeed.current = seedMessage;
    void send(seedMessage);
  }, [hydrated, seedMessage, send]);

  const clearChat = () => {
    if (!window.confirm("Clear chat history?")) return;
    setMessages([WELCOME]);
    setInput("");
    lastSeed.current = null;
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col max-xl:pb-[var(--kiik69-dock-pad)]"
      style={{ ["--kiik69-dock-pad" as string]: KIIK69_DOCK_PADDING }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-white/40">Trained on kitchen rules + your purchase ledger</p>
        <button type="button" onClick={clearChat} className="text-[11px] text-white/30 hover:text-white/50">
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-3 [-webkit-overflow-scrolling:touch]"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white"
                  : "bg-[#0e0e14] text-white/85 ring-1 ring-white/[0.06]"
              }`}
            >
              {m.role === "assistant" && i === 0 ? (
                <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300/80">
                  <IconSparkle className="h-3 w-3" /> Accountant
                </span>
              ) : null}
              {m.content}
            </div>
            {m.createdAt && i > 0 ? (
              <p className="mt-0.5 px-1 text-[10px] text-white/30 tabular-nums">
                {formatKiik69Timestamp(m.createdAt)}
              </p>
            ) : null}
          </div>
        ))}
        {loading ? (
          <p className="text-xs text-white/35">Thinking…</p>
        ) : null}
      </div>

      {messages.length <= 2 ? (
        <div className="mb-2 -mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              disabled={loading}
              className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1.5 text-[11px] text-white/55 ring-1 ring-white/[0.06] hover:bg-white/[0.09] hover:text-white/75 touch-manipulation"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="sticky bottom-0 border-t border-white/[0.06] bg-[#06060a] pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            placeholder="Ask about spend, splits, party plates…"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-[#0e0e14] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
