"use client";

import { useCallback, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type GroupSpec = {
  importScope: "all";
  gender?: "male" | "female";
  age?: { min?: number; max?: number };
  repeated?: boolean;
};

type SendWhatsappGroupAction = {
  type: "send_whatsapp_group";
  group: GroupSpec;
  messageTemplate: string;
  matchedCount: number;
};

export default function AutomationImportChatClient({
  contactsCount,
  initialAssistantMessage,
}: {
  contactsCount: number;
  initialAssistantMessage?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        initialAssistantMessage ??
        "Hi! This chat is connected to your uploaded automation guest lists in the database.\n\n" +
          "Ask me for analytics like:\n" +
          "- frequency / top dates\n" +
          "- customers who visited multiple outlets\n" +
          "Or ask me to draft a WhatsApp bulk message. When I detect a filter (men / women / repeated / age), I’ll show a template preview and a “Send now” button.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<SendWhatsappGroupAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendingAction, setSendingAction] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  const quickPrompts: { label: string; text: string; kind: "analytics" | "send" }[] = [
    { kind: "analytics", label: "Count repeated", text: "Count repeated customers (same phone appears multiple times)." },
    { kind: "analytics", label: "Visit frequency", text: "Show visit frequency summary (top dates, repeats, average visits)." },
    { kind: "analytics", label: "Outlet interaction", text: "Show how customers interact between outlets (who visited multiple outlets + top outlet pairs)." },
    { kind: "send", label: "Send to everyone", text: "Draft a WhatsApp bulk message to everyone in my imported list. Use {{fullName}} and keep it short + energetic." },
    { kind: "send", label: "Send to repeated", text: "Draft a WhatsApp bulk message to repeated customers (same phone appears multiple times). Use {{fullName}} and keep it short + energetic." },
    { kind: "send", label: "Send to men", text: "Draft a WhatsApp bulk message to men. Use {{fullName}} and keep it short + energetic." },
    { kind: "send", label: "Send to women", text: "Draft a WhatsApp bulk message to women. Use {{fullName}} and keep it short + energetic." },
  ];

  async function sendText(textRaw: string) {
    const text = textRaw.trim();
    if (!text || loading) return;

    setError(null);
    setActionError(null);
    setPendingAction(null);

    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/admin/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await res.json()) as { message?: string; error?: string; action?: unknown };
      if (!res.ok) throw new Error(data.error || res.statusText);
      if (!data.message) throw new Error("No reply from assistant.");

      setMessages((prev) => [...prev, { role: "assistant", content: data.message! }]);

      if (
        data.action &&
        typeof data.action === "object" &&
        (data.action as any).type === "send_whatsapp_group"
      ) {
        const a = data.action as SendWhatsappGroupAction;
        setPendingAction(a);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed.";
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  async function send() {
    return sendText(input);
  }

  async function confirmSend() {
    if (!pendingAction) return;
    setSendingAction(true);
    setActionError(null);

    try {
      const res = await fetch("/api/admin/assistant/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageTemplate: pendingAction.messageTemplate,
          group: pendingAction.group,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        sent?: number;
        failed?: number;
        matched?: number;
      };
      if (!res.ok) throw new Error(data.error || res.statusText);

      const sent = data.sent ?? 0;
      const failed = data.failed ?? 0;
      const matched = data.matched ?? pendingAction.matchedCount;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `WhatsApp send completed.\nMatched: ${matched}\nSent: ${sent}\nFailed: ${failed}`,
        },
      ]);

      setPendingAction(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed.";
      setActionError(msg);
    } finally {
      setSendingAction(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Automation chat (send + analytics)</h3>
          <p className="mt-1 text-sm text-slate-600">
            Connected to your saved contacts in the database ({contactsCount} loaded right now).
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-[min(520px,60vh)] flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={`${i}-${m.role}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[80%] ${
                  m.role === "user"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-100 bg-slate-50 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
        )}

        {pendingAction && pendingAction.type === "send_whatsapp_group" && (
          <div className="mx-3 my-2 rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
            <p className="text-xs font-semibold text-orange-900">
              Bulk draft ready for {pendingAction.matchedCount} recipients
            </p>
            <p className="mt-2 text-xs text-orange-900/80">
              Template preview (personalized with <code className="rounded bg-slate-200 px-1">{"{{fullName}}"}</code>):
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-900 p-3 text-[11px] text-slate-100">
              {pendingAction.messageTemplate}
            </pre>
            {actionError && (
              <div className="mt-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {actionError}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                disabled={sendingAction}
                onClick={() => void confirmSend()}
              >
                {sendingAction ? "Sending…" : "Send now"}
              </button>
              <button
                type="button"
                className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                disabled={sendingAction}
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <form
          className="flex flex-col gap-2 border-t border-slate-200 p-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">Quick actions</span>
            <div className="flex flex-wrap gap-2">
              {quickPrompts
                .filter((p) => p.kind === "analytics")
                .map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendText(p.text)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
              {quickPrompts
                .filter((p) => p.kind === "send")
                .map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    disabled={loading}
                    onClick={() => void sendText(p.text)}
                    className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-800 hover:bg-orange-100 disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
            </div>
          </div>
          <label className="sr-only" htmlFor="automation-chat-input">
            Message
          </label>
          <textarea
            id="automation-chat-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask: frequency / top dates / customers visited multiple outlets / send WhatsApp bulk to men/women/repeated/age…"
            className="min-h-[44px] flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendText(input);
              }
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

