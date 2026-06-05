"use client";

import { MANAGER_SHORTCUTS, type ManagerShortcutId } from "@/lib/leads-manager-shortcuts";

type ManagerQuickSendBarProps = {
  hasSelectedEvent: boolean;
  disabled?: boolean;
  onPick: (shortcut: ManagerShortcutId) => void;
};

export default function ManagerQuickSendBar({
  hasSelectedEvent,
  disabled,
  onPick,
}: ManagerQuickSendBarProps) {
  return (
    <div className="border-b border-white/[0.06] px-2 py-2">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">
        Quick links
      </p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MANAGER_SHORTCUTS.map((s) => {
          const needsEvent = s.id === "book_event";
          const off = disabled || (needsEvent && !hasSelectedEvent);
          return (
            <button
              key={s.id}
              type="button"
              disabled={off}
              onClick={() => onPick(s.id)}
              title={needsEvent && !hasSelectedEvent ? "Guest hasn't picked an event yet" : s.description}
              className={`shrink-0 rounded-full border px-3.5 py-2.5 text-[12px] font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 ${
                s.id === "book_table" || s.id === "book_event"
                  ? "border-cyan-500/30 text-cyan-100"
                  : "border-white/10 text-white/75"
              }`}
              style={
                (s.id === "book_table" || s.id === "book_event") && !off
                  ? { background: "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(168,85,247,0.12) 100%)" }
                  : { background: "rgba(255,255,255,0.04)" }
              }
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
