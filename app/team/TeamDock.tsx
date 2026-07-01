"use client";

import type { TeamTab } from "./TeamNav";
import {
  IconAi,
  IconBell,
  IconCalendar,
  IconKey,
  IconMore,
  IconPlus,
  IconTasks,
  IconWhatsApp,
  TEAM_DOCK_HEIGHT,
} from "./TeamIcons";

type Action = { label: string; onClick: () => void; tone?: "default" | "accent" };

function dockItem(active: boolean) {
  return `flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium ${
    active ? "text-cyan-300" : "text-white/40"
  }`;
}

export default function TeamDock({
  tab,
  onTab,
  isAdmin,
  isMember,
  isViewer,
  onAdd,
  onWhatsApp,
  onMore,
}: {
  tab: TeamTab;
  onTab: (t: TeamTab) => void;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  onAdd: () => void;
  onWhatsApp?: () => void;
  onMore?: () => void;
}) {
  const navClass =
    "fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#0a0a10]/98 backdrop-blur-md xl:hidden";

  if (isViewer) {
    return (
      <nav
        className={navClass}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", height: TEAM_DOCK_HEIGHT }}
      >
        <div className="mx-auto flex h-full max-w-lg">
          <button type="button" onClick={() => onTab("ads")} className={dockItem(tab === "ads")}>
            <IconTasks className="h-[22px] w-[22px]" />
            Tasks
          </button>
        </div>
      </nav>
    );
  }

  if (isMember) {
    return (
      <nav
        className={navClass}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", minHeight: TEAM_DOCK_HEIGHT }}
      >
        <div className="mx-auto flex h-14 max-w-sm items-end justify-between px-4">
          <button type="button" onClick={() => onTab("ads")} className={dockItem(tab === "ads")}>
            <IconTasks className="h-[22px] w-[22px]" />
            Tasks
          </button>
          <button type="button" onClick={() => onTab("calendar")} className={dockItem(tab === "calendar")}>
            <IconCalendar className="h-[22px] w-[22px]" />
            Calendar
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="relative -top-3 flex shrink-0 flex-col items-center"
            aria-label="Create"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
              <IconPlus className="h-6 w-6" />
            </span>
          </button>
          <button type="button" onClick={() => onTab("reminders")} className={dockItem(tab === "reminders")}>
            <IconBell className="h-[22px] w-[22px]" />
            Notes
          </button>
          <button type="button" onClick={() => onTab("vault")} className={dockItem(tab === "vault")}>
            <IconKey className="h-[22px] w-[22px]" />
            Passwords
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={navClass}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", minHeight: TEAM_DOCK_HEIGHT }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-end px-0.5">
        <button type="button" onClick={() => onTab("ads")} className={dockItem(tab === "ads")}>
          <IconTasks className="h-[22px] w-[22px]" />
          Tasks
        </button>
        <button type="button" onClick={() => onTab("reminders")} className={dockItem(tab === "reminders")}>
          <IconBell className="h-[22px] w-[22px]" />
          Notes
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="relative -top-3 flex w-12 shrink-0 flex-col items-center justify-center"
          aria-label="Create"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
            <IconPlus className="h-6 w-6" />
          </span>
        </button>

        {isAdmin ? (
          <button type="button" onClick={() => onTab("calendar")} className={dockItem(tab === "calendar")}>
            <IconCalendar className="h-[22px] w-[22px]" />
            Calendar
          </button>
        ) : isMember ? (
          <button type="button" onClick={() => onTab("calendar")} className={dockItem(tab === "calendar")}>
            <IconCalendar className="h-[22px] w-[22px]" />
            Calendar
          </button>
        ) : null}

        <button
          type="button"
          onClick={onMore}
          className={dockItem(tab === "ai")}
        >
          <IconMore className="h-[22px] w-[22px]" />
          More
        </button>
      </div>
    </nav>
  );
}

export function TeamActionSheet({
  open,
  actions,
  onClose,
}: {
  open: boolean;
  actions: Action[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 xl:hidden" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#0c0c12] p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                a.onClick();
                onClose();
              }}
              className={`min-h-[52px] rounded-xl text-sm font-medium ${
                a.tone === "accent"
                  ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white"
                  : "bg-white/[0.06] text-white/80"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TeamMoreSheet({
  open,
  onClose,
  onReminders,
  onVault,
  onCalendar,
  onAi,
  onExport,
  onWhatsApp,
}: {
  open: boolean;
  onClose: () => void;
  onReminders: () => void;
  onVault?: () => void;
  onCalendar?: () => void;
  onAi: () => void;
  onExport: () => void;
  onWhatsApp?: () => void;
}) {
  if (!open) return null;
  const items = [
    ...(onCalendar ? [{ label: "Calendar", icon: IconCalendar, onClick: onCalendar }] : []),
    { label: "My notes", icon: IconBell, onClick: onReminders },
    ...(onVault ? [{ label: "Passwords", icon: IconKey, onClick: onVault }] : []),
    { label: "AI assistant", icon: IconAi, onClick: onAi },
    ...(onWhatsApp ? [{ label: "WhatsApp report", icon: IconWhatsApp, onClick: onWhatsApp }] : []),
    { label: "Export Excel", icon: IconTasks, onClick: onExport },
  ];
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 xl:hidden" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-lg rounded-t-2xl border border-white/10 bg-[#0c0c12] p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <p className="mb-2 px-1 text-xs text-white/40">More</p>
        <div className="space-y-1">
          {items.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onClick();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/85 hover:bg-white/[0.05]"
            >
              <Icon className="h-5 w-5 text-white/50" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
