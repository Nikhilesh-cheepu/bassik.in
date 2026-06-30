"use client";

import type { ReactNode } from "react";
import { TEAM_AD_OUTLETS } from "@/lib/team-outlets";
import { IconChevronDown, IconLock, teamFilterChip } from "./TeamIcons";
import { TEAM_PAGE, type TeamTab } from "./TeamNav";
import { PlanningFilters } from "./TeamPlanningView";
import type { TeamPlanningFilter } from "@/lib/team-planning";

const TAB_TITLES: Record<TeamTab, string> = {
  ads: "Ads & creatives",
  planning: "Planning & feedback",
  reminders: "Mine",
  ai: "AI assistant",
};

const MOBILE_TITLES: Record<TeamTab, string> = {
  ads: "Tasks",
  planning: "Planning",
  reminders: "Notes",
  ai: "AI",
};

type Filter = "all" | "todo" | "done" | "pending";
type MemberTab = "all" | string;

const SCROLL_ROW =
  "-mx-3 flex items-center gap-1 overflow-x-auto px-3 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:mx-0 xl:px-0";

export default function TeamPageHeader({
  tab,
  userLabel,
  counts,
  refreshing,
  showStats,
  isMemberHub,
  desktopAction,
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
  planningFilter,
  onPlanningFilterChange,
}: {
  tab: TeamTab;
  userLabel: string;
  counts: { todo: number; done: number; pending: number };
  refreshing: boolean;
  showStats: boolean;
  isMemberHub?: boolean;
  desktopAction?: ReactNode;
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
  planningFilter: TeamPlanningFilter;
  onPlanningFilterChange: (f: TeamPlanningFilter) => void;
}) {
  const outletLabel =
    TEAM_AD_OUTLETS.find((o) => o.id === outletFilter)?.label ?? "All outlets";

  const mobileTitle = isMemberHub || tab === "reminders" ? "Notes" : MOBILE_TITLES[tab];
  const desktopTitle = isMemberHub || tab === "reminders" ? "Mine — notes" : TAB_TITLES[tab];

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
  ) : tab !== "ai" && !isMemberHub && tab !== "reminders" ? (
    <p className="mt-0.5 text-[11px] text-white/35 xl:hidden">{userLabel}</p>
  ) : isMemberHub || tab === "reminders" ? (
    <p className="mt-0.5 text-[11px] text-white/35">Type and save — timestamp added automatically</p>
  ) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06060a]/95 backdrop-blur-md xl:static">
      <div className={TEAM_PAGE}>
        <div className="flex items-center justify-between gap-2 pt-2.5 pb-1 xl:items-start xl:pt-5 xl:pb-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight xl:text-2xl">
              <span className="xl:hidden">{mobileTitle}</span>
              <span className="hidden xl:inline">{desktopTitle}</span>
            </h1>
            {statsLine}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {desktopAction ? <div className="hidden xl:block">{desktopAction}</div> : null}
            <button
              type="button"
              onClick={onLogout}
              className="hidden rounded-xl border border-white/10 p-2 text-white/45 hover:bg-white/[0.04] xl:flex"
              aria-label="Lock"
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
                <label className="relative shrink-0">
                  <select
                    value={outletFilter}
                    onChange={(e) => onOutletFilterChange(e.target.value)}
                    aria-label="Filter by outlet"
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
                  <span className="sr-only">{outletLabel}</span>
                </label>
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
        ) : tab === "planning" ? (
          <div className={SCROLL_ROW}>
            <PlanningFilters filter={planningFilter} onFilterChange={onPlanningFilterChange} />
          </div>
        ) : null}
      </div>
    </header>
  );
}
