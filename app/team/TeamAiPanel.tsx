"use client";

import { useState } from "react";
import type { TeamAiMessage } from "@/lib/team-ai";

const STARTERS = [
  "Paste event brief with outlets + links to create tasks",
  "Summarize our open ad tasks and top priorities",
  "What should we focus on this week?",
];

export default function TeamAiPanel({ onTasksCreated }: { onTasksCreated?: () => void }) {
  const [messages, setMessages] = useState<TeamAiMessage[]>([
    {
      role: "assistant",
      content:
        "Paste a brief with outlet names, links, and deadlines — I'll create HIGH priority ad tasks automatically (admin).\n\nOr ask me to summarize, prioritize, or draft briefs.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
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
  };

  return (
    <div className="flex min-h-[50vh] flex-col">
      <div className="flex-1 space-y-3 pb-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-8 bg-cyan-500/15 text-cyan-50"
                : "mr-4 bg-white/[0.05] text-white/75"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {loading ? (
          <p className="text-center text-xs text-white/35">Parsing brief & creating tasks…</p>
        ) : null}
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void send(s)}
            className="rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-[10px] text-white/50"
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
        className="flex flex-col gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste outlets, links, deadline… or ask a question"
          rows={3}
          className="min-h-[72px] w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="min-h-[44px] w-full rounded-xl bg-violet-500/80 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
