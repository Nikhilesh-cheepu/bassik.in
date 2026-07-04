"use client";

import type { ReactNode } from "react";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { IconChevronDown, IconLock, teamFilterChip } from "./TeamIcons";
import { TEAM_PAGE, type TeamTab } from "./TeamNav";

const TAB_TITLES: Record<TeamTab, string> = {
  ads: "Ads & creatives",
  shoots: "Shoot calendar",
  "raw-files": "Raw files",
  "edit-files": "Editing files",
  calendar: "Team calendar",
  reminders: "Notes",
  vault: "Passwords",
  ai: "AI assistant",
};

const MOBILE_TITLES: Record<TeamTab, string> = {
  ads: "Tasks",
  shoots: "Shoots",
  "raw-files": "Raw files",
  "edit-files": "Editing files",
  calendar: "Calendar",
  reminders: "Notes",
  vault: "Passwords",
  ai: "AI",
};

type Filter = "all" | "todo" | "done" | "pending";
type MemberTab = "all" | string;

const SCROLL_ROW =
  "-mx-3 flex items-center gap-1 overflow-x-auto px-3 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:mx-0 xl:px-0";

function OutletSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <label className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="h-7 max-w-[7.5rem] appearance-none truncate rounded-full bg-white/[0.05] py-1 pl-2.5 pr-6 text-[11px] font-medium text-white/55 outline-none ring-1 ring-white/[0.08] focus:ring-white/20"
      >
        <option value="">All outlets</option>
        {TEAM_AD_OUTLETS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/30" />
    </label>
  );
}

export default function TeamPageHeader({
  tab,
  userLabel,
  counts,
  refreshing,
  showStats,
  isMemberHub,
  desktopAction,
  mobileAction,
  onLogout,
  filter,
  onFilterChange,
  adFilters,
  showOutletFilter,
  outletFilter,
  onOutletFilterChange,
  showMemberTabs,
  members,
  memberTab,
  onMemberTabChange,
}: {
  tab: TeamTab;
  userLabel: string;
  counts: { todo: number; done: number; pending: number };
  refreshing: boolean;
  showStats: boolean;
  isMemberHub?: boolean;
  desktopAction?: ReactNode;
  mobileAction?: ReactNode;
  onLogout: () => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  adFilters: { id: Filter; label: string }[];
  showOutletFilter: boolean;
  outletFilter: string;
  onOutletFilterChange: (v: string) => void;
  showMemberTabs: boolean;
  members: { id: string; name: string }[];
  memberTab: MemberTab;
  onMemberTabChange: (id: MemberTab) => void;
}) {
  const outletLabel =
    TEAM_AD_OUTLETS.find((o) => o.id === outletFilter)?.label ?? "All outlets";

  const mobileTitle = isMemberHub || tab === "reminders" ? "Notes" : MOBILE_TITLES[tab];
  const desktopTitle = isMemberHub || tab === "reminders" ? "Notes" : TAB_TITLES[tab];

  const statsLine = showStats ? (
    <p className="mt-0.5 truncate text-[11px] text-white/35">
      <span className="xl:hidden">
        {counts.todo} open · {counts.done} done
        {counts.pending > 0 ? ` · ${counts.pending} pending` : ""}
        {refreshing ? " · …" : ""}
      </span>
      <span className="hidden xl:inline">
        {userLabel} · {counts.todo} to do · {counts.done} done
        {counts.pending > 0 ? ` · ${counts.pending} pending` : ""}
        {refreshing ? " · …" : ""}
      </span>
    </p>
  ) : tab === "raw-files" ? (
    <p className="mt-0.5 text-[11px] text-white/35">Title, link, and description</p>
  ) : tab === "edit-files" ? (
    <p className="mt-0.5 text-[11px] text-white/35">Title, link, description — To edit or Already edited</p>
  ) : tab !== "ai" && !isMemberHub && tab !== "reminders" && tab !== "calendar" ? (
    <p className="mt-0.5 text-[11px] text-white/35 xl:hidden">{userLabel}</p>
  ) : isMemberHub || tab === "reminders" ? (
    <p className="mt-0.5 hidden text-[11px] text-white/35 xl:block">Personal workspace — tag outlets or keep Direct</p>
  ) : tab === "vault" ? (
    <p className="mt-0.5 hidden text-[11px] text-white/35 xl:block">Encrypted logins — share with teammates, copy anytime</p>
  ) : tab === "calendar" ? (
    <p className="mt-0.5 hidden text-[11px] text-white/35 xl:block">Tasks, shoots, plans — share selected dates with the team</p>
  ) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06060a]/95 backdrop-blur-md xl:static">
      <div className={TEAM_PAGE}>
        <div className="flex items-center justify-between gap-2 pt-2 pb-1 xl:items-start xl:pt-5 xl:pb-2">
          <div className="min-w-0 flex-1">
            <h1 className={`truncate font-semibold tracking-tight ${tab === "reminders" || tab === "calendar" || tab === "vault" ? "text-[28px] font-bold xl:text-2xl xl:font-semibold" : "text-base xl:text-2xl"}`}>
              <span className="xl:hidden">{mobileTitle}</span>
              <span className="hidden xl:inline">{desktopTitle}</span>
            </h1>
            {statsLine}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {mobileAction ? <div className="xl:hidden">{mobileAction}</div> : null}
            {desktopAction ? <div className="hidden xl:block">{desktopAction}</div> : null}
            <button
              type="button"
              onClick={onLogout}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/45 active:bg-white/[0.06] xl:h-auto xl:w-auto xl:p-2 xl:hover:bg-white/[0.04]"
              aria-label="Lock"
              title="Log out"
            >
              <IconLock className="h-4 w-4" />
            </button>
          </div>
        </div>

        {tab === "ads" ? (
          <div className={SCROLL_ROW}>
            {adFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={teamFilterChip(filter === f.id, f.id === "pending" ? "violet" : "default")}
              >
                {f.label}
              </button>
            ))}

            {showOutletFilter ? (
              <>
                <span className="mx-0.5 h-3.5 w-px shrink-0 bg-white/10" aria-hidden />
                <OutletSelect
                  value={outletFilter}
                  onChange={onOutletFilterChange}
                  ariaLabel="Filter tasks by outlet"
                />
                <span className="sr-only">{outletLabel}</span>
              </>
            ) : null}

            {showMemberTabs ? (
              <>
                <span className="mx-0.5 h-3.5 w-px shrink-0 bg-white/10" aria-hidden />
                <button
                  type="button"
                  onClick={() => onMemberTabChange("all")}
                  className={teamFilterChip(memberTab === "all", "violet")}
                >
                  All
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onMemberTabChange(m.id)}
                    className={teamFilterChip(memberTab === m.id, "violet")}
                  >
                    {m.name}
                  </button>
                ))}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
