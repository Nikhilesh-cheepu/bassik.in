"use client";

export const TEAM_TABS = [
  { id: "ads", label: "Ads", short: "Ads & creatives" },
  { id: "tasks", label: "Checklists", short: "Stories & posts" },
  { id: "shoots", label: "Shoots", short: "Shoot calendar" },
  { id: "raw-files", label: "Raw", short: "Raw files" },
  { id: "edit-files", label: "Edit", short: "Editing files" },
  { id: "calendar", label: "Calendar", short: "Calendar" },
  { id: "reminders", label: "Notes", short: "Notes" },
  { id: "vault", label: "Passwords", short: "Passwords" },
  { id: "ai", label: "AI", short: "AI assistant" },
] as const;

export type TeamTab = (typeof TEAM_TABS)[number]["id"];

type NavProps = {
  active: TeamTab;
  onChange: (tab: TeamTab) => void;
  hideReminders?: boolean;
  hideVault?: boolean;
  hideAi?: boolean;
  hideCalendar?: boolean;
  hideShoots?: boolean;
  hideRawFiles?: boolean;
  hideEditFiles?: boolean;
  hideAds?: boolean;
  hideTasks?: boolean;
};

type SidebarNavProps = NavProps & {
  userLabel?: string;
  onLogout?: () => void;
};

function visibleTabs({
  hideReminders,
  hideVault,
  hideAi,
  hideCalendar,
  hideShoots,
  hideRawFiles,
  hideEditFiles,
  hideAds,
  hideTasks,
}: Pick<
  NavProps,
  "hideReminders" | "hideVault" | "hideAi" | "hideCalendar" | "hideShoots" | "hideRawFiles" | "hideEditFiles" | "hideAds" | "hideTasks"
>) {
  return TEAM_TABS.filter((t) => {
    if (hideReminders && t.id === "reminders") return false;
    if (hideVault && t.id === "vault") return false;
    if (hideAi && t.id === "ai") return false;
    if (hideCalendar && t.id === "calendar") return false;
    if (hideShoots && t.id === "shoots") return false;
    if (hideRawFiles && t.id === "raw-files") return false;
    if (hideEditFiles && t.id === "edit-files") return false;
    if (hideAds && t.id === "ads") return false;
    if (hideTasks && t.id === "tasks") return false;
    return true;
  });
}

export function TeamSidebarNav({
  active,
  onChange,
  hideReminders,
  hideVault,
  hideAi,
  hideCalendar,
  hideShoots,
  hideRawFiles,
  hideEditFiles,
  hideAds,
  hideTasks,
  userLabel,
  onLogout,
}: SidebarNavProps) {
  const tabs = visibleTabs({
    hideReminders,
    hideVault,
    hideAi,
    hideCalendar,
    hideShoots,
    hideRawFiles,
    hideEditFiles,
    hideAds,
    hideTasks,
  });

  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#08080e] xl:flex xl:w-56">
      <div className="border-b border-white/[0.05] px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
          Bassik Team
        </p>
        {userLabel ? <p className="mt-1.5 text-sm text-white/50">{userLabel}</p> : null}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                on
                  ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10"
                  : "text-white/45 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              {t.short}
            </button>
          );
        })}
      </nav>
      {onLogout ? (
        <div className="border-t border-white/[0.05] p-3">
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/50 hover:bg-white/[0.04]"
          >
            Lock
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export default function TeamBottomNav({
  active,
  onChange,
  hideReminders,
  hideVault,
  hideAi,
  hideCalendar,
  hideShoots,
  hideRawFiles,
  hideEditFiles,
  hideAds,
  hideTasks,
}: NavProps) {
  const tabs = visibleTabs({
    hideReminders,
    hideVault,
    hideAi,
    hideCalendar,
    hideShoots,
    hideRawFiles,
    hideEditFiles,
    hideAds,
    hideTasks,
  });

  return (
    <nav className="flex border-t border-white/[0.06] bg-[#0a0a10]/98 md:min-h-[56px]">
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium md:text-xs ${
              on ? "text-cyan-300" : "text-white/40"
            }`}
          >
            <span
              className={`h-0.5 w-10 rounded-full md:h-1 ${on ? "bg-cyan-400" : "bg-transparent"}`}
            />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

export const TEAM_PAGE =
  "mx-auto w-full max-w-lg px-3 sm:max-w-xl sm:px-4 md:max-w-2xl lg:max-w-none lg:px-8 xl:px-10";

export const TEAM_SHEET_OVERLAY =
  "fixed inset-0 z-50 flex flex-col justify-end bg-black/75 md:items-center md:justify-center md:p-8";

export const TEAM_SHEET_PANEL =
  "max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0c0c12] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-h-[88vh] md:max-w-lg md:rounded-2xl md:shadow-2xl lg:max-w-xl";
