"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { KIIK69_ACCOUNTS_MODULES, type Kiik69AccountsModule } from "@/lib/kiik69-accounts";
import { IconAi, IconCart, IconGrid, IconPlus } from "./Kiik69Icons";

/** Render sheets at document root so overflow/stacking on main cannot block taps. */
export function Kiik69SheetPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

const LOGO = "/logos/kiik69.png";

export const KIIK69_DOCK_HEIGHT = 56;
export const KIIK69_DOCK_BUMP = 14;
export const KIIK69_DOCK_PADDING = `calc(${KIIK69_DOCK_HEIGHT + KIIK69_DOCK_BUMP}px + env(safe-area-inset-bottom, 0px))`;

/** Same layout tokens as Team — shared shell, gold accent in components. */
export const KIIK69_PAGE =
  "mx-auto w-full max-w-lg px-3 sm:max-w-xl sm:px-4 md:max-w-2xl lg:max-w-none lg:px-8 xl:px-10";

export const KIIK69_SHEET_OVERLAY =
  "fixed inset-0 z-[100] flex flex-col justify-end bg-black/75 md:items-center md:justify-center md:p-8";

export const KIIK69_SHEET_PANEL =
  "max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0c0c12] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-h-[88vh] md:max-w-lg md:rounded-2xl md:shadow-2xl lg:max-w-xl";

export const KIIK69_BTN =
  "rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-semibold text-white disabled:opacity-50";

export const KIIK69_INPUT =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-base text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/25";

export function kiik69FilterChip(active: boolean): string {
  return `shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition touch-manipulation ${
    active ? "bg-white/10 text-white ring-1 ring-white/10" : "text-white/40 hover:text-white/55"
  }`;
}

function dockItem(active: boolean) {
  return `flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium touch-manipulation ${
    active ? "text-amber-300" : "text-white/40"
  }`;
}

export function Kiik69SidebarNav({
  active,
  onChange,
}: {
  active: Kiik69AccountsModule;
  onChange: (id: Kiik69AccountsModule) => void;
}) {
  return (
    <aside className="kiik69-sidebar sticky top-0 hidden h-[100dvh] w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#08080e] xl:flex xl:w-56">
      <div className="border-b border-white/[0.05] px-5 py-5">
        <Image src={LOGO} alt="KIIK 69" width={160} height={160} className="h-11 w-auto object-contain" priority />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/70">
          KIIK 69 Accounts
        </p>
        <p className="mt-1 text-sm text-white/50">Shared kitchen</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {KIIK69_ACCOUNTS_MODULES.map((m) => {
          const on = active === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={!m.live}
              onClick={() => m.live && onChange(m.id)}
              className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                on
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                  : m.live
                    ? "text-white/45 hover:bg-white/[0.04] hover:text-white/70"
                    : "cursor-not-allowed text-white/25"
              }`}
            >
              {m.label}
              {!m.live ? <span className="text-[10px] text-white/20"> · soon</span> : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default function Kiik69Dock({
  module,
  onModule,
  onAdd,
  onMore,
  showAdd,
  addLabel = "Add",
}: {
  module: Kiik69AccountsModule;
  onModule: (id: Kiik69AccountsModule) => void;
  onAdd: () => void;
  onMore: () => void;
  showAdd: boolean;
  addLabel?: string;
}) {
  const navClass =
    "fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#0a0a10]/98 backdrop-blur-md xl:hidden";

  return (
    <nav
      className={`kiik69-dock ${navClass}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", minHeight: KIIK69_DOCK_HEIGHT }}
    >
      <div className="kiik69-dock-inner mx-auto flex h-14 max-w-lg items-end px-0.5">
        <button
          type="button"
          onClick={() => onModule("purchases")}
          className={`kiik69-dock-btn ${dockItem(module === "purchases")} ${module === "purchases" ? "is-active" : ""}`}
        >
          <IconCart className="h-[22px] w-[22px]" />
          Purchases
        </button>

        {showAdd ? (
          <button type="button" onClick={onAdd} className="kiik69-dock-fab" aria-label={addLabel}>
            <span>
              <IconPlus className="h-6 w-6" />
            </span>
          </button>
        ) : (
          <div className="w-12 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onModule("ai")}
          className={`kiik69-dock-btn ${dockItem(module === "ai")} ${module === "ai" ? "is-active" : ""}`}
        >
          <IconAi className="h-[22px] w-[22px]" />
          AI
        </button>

        <button
          type="button"
          onClick={onMore}
          className={`kiik69-dock-btn ${dockItem(module !== "purchases" && module !== "ai")} ${
            module !== "purchases" && module !== "ai" ? "is-active" : ""
          }`}
        >
          <IconGrid className="h-[22px] w-[22px]" />
          More
        </button>
      </div>
    </nav>
  );
}

export function Kiik69MoreSheet({
  open,
  current,
  onClose,
  onSelect,
}: {
  open: boolean;
  current: Kiik69AccountsModule;
  onClose: () => void;
  onSelect: (id: Kiik69AccountsModule) => void;
}) {
  if (!open) return null;
  return (
    <Kiik69SheetPortal>
      <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/70 xl:hidden" onClick={onClose}>
        <div
          className="mx-auto w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#0c0c12] p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <p className="mb-2 px-1 text-xs text-white/40">Modules</p>
        <div className="space-y-1">
          {KIIK69_ACCOUNTS_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={!m.live}
              onClick={() => {
                if (m.live) {
                  onSelect(m.id);
                  onClose();
                }
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm ${
                current === m.id ? "bg-white/[0.08] text-white" : "text-white/85 hover:bg-white/[0.05]"
              } ${!m.live ? "opacity-40" : ""}`}
            >
              <span>
                <span className="block font-medium">{m.label}</span>
                <span className="block text-xs text-white/40">{m.hint}</span>
              </span>
              {!m.live ? <span className="text-[10px] text-white/30">Soon</span> : null}
            </button>
          ))}
        </div>
        </div>
      </div>
    </Kiik69SheetPortal>
  );
}
