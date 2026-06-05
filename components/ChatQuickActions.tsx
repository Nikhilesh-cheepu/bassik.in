"use client";

import { displayPhone } from "@/lib/venue-chat-ui-helpers";
import { getFullPhoneNumber } from "@/lib/outlet-contacts";

export type QuickAction = {
  id: string;
  type: "call" | "whatsapp" | "directions" | "menu" | "book" | "pricing" | "website";
  label: string;
  phone?: string;
  message?: string;
  url?: string;
  address?: string;
};

type ChatQuickActionsProps = {
  actions: QuickAction[];
  accentColor: string;
  bookGradient?: string;
  onBook?: () => void;
  onMenu?: () => void;
  onPricing?: () => void;
  onWebsite?: () => void;
};

const pillBase =
  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-medium tracking-wide transition-all active:scale-[0.97] backdrop-blur-md";

const glassPill =
  "border-white/[0.1] bg-white/[0.06] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.2)] hover:bg-white/[0.09]";

export default function ChatQuickActions({
  actions,
  accentColor,
  bookGradient,
  onBook,
  onMenu,
  onPricing,
  onWebsite,
}: ChatQuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        if (action.type === "call" && action.phone) {
          return (
            <a
              key={action.id}
              href={`tel:+${getFullPhoneNumber(action.phone)}`}
              className={`${pillBase} ${glassPill}`}
            >
              {action.label}
            </a>
          );
        }
        if (action.type === "whatsapp" && action.phone) {
          const msg = encodeURIComponent(action.message ?? "Hi!");
          const wa = getFullPhoneNumber(action.phone);
          return (
            <a
              key={action.id}
              href={`https://wa.me/${wa}?text=${msg}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${pillBase} border-[#25D366]/30 bg-[#25D366]/10 text-[#4ade80] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(37,211,102,0.12)]`}
            >
              WhatsApp
            </a>
          );
        }
        if (action.type === "directions" && action.url) {
          return (
            <a
              key={action.id}
              href={action.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${pillBase} ${glassPill}`}
            >
              {action.label}
            </a>
          );
        }
        if (action.type === "menu") {
          return (
            <button key={action.id} type="button" onClick={onMenu} className={`${pillBase} ${glassPill}`}>
              {action.label}
            </button>
          );
        }
        if (action.type === "pricing") {
          return (
            <button key={action.id} type="button" onClick={onPricing} className={`${pillBase} ${glassPill}`}>
              {action.label}
            </button>
          );
        }
        if (action.type === "website") {
          return (
            <button key={action.id} type="button" onClick={onWebsite} className={`${pillBase} ${glassPill}`}>
              {action.label}
            </button>
          );
        }
        if (action.type === "book") {
          return (
            <button
              key={action.id}
              type="button"
              onClick={onBook}
              className={`${pillBase} border-transparent font-semibold text-white shadow-lg`}
              style={{
                background: bookGradient ?? `linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)`,
                boxShadow: "0 6px 24px rgba(34,211,238,0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              {action.label}
            </button>
          );
        }
        if (action.phone) {
          return (
            <a
              key={action.id}
              href={`tel:+${getFullPhoneNumber(action.phone)}`}
              className={`${pillBase} ${glassPill}`}
            >
              {action.label} · {displayPhone(action.phone)}
            </a>
          );
        }
        return null;
      })}
    </div>
  );
}

export function parseQuickActions(metadata: Record<string, unknown> | null): QuickAction[] {
  if (metadata?.type !== "quick_actions" || !Array.isArray(metadata.actions)) return [];
  const out: QuickAction[] = [];
  for (const raw of metadata.actions) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    if (typeof a.id !== "string" || typeof a.type !== "string" || typeof a.label !== "string") {
      continue;
    }
    out.push({
      id: a.id,
      type: a.type as QuickAction["type"],
      label: a.label,
      phone: typeof a.phone === "string" ? a.phone : undefined,
      message: typeof a.message === "string" ? a.message : undefined,
      url: typeof a.url === "string" ? a.url : undefined,
      address: typeof a.address === "string" ? a.address : undefined,
    });
  }
  return out;
}
