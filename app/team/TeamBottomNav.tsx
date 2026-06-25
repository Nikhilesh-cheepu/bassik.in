"use client";

export const TEAM_TABS = [
  { id: "ads", label: "Ads" },
  { id: "planning", label: "Planning" },
  { id: "reminders", label: "Mine" },
  { id: "ai", label: "AI" },
] as const;

export type TeamTab = (typeof TEAM_TABS)[number]["id"];

export default function TeamBottomNav({
  active,
  onChange,
  hideReminders,
  hideAi,
}: {
  active: TeamTab;
  onChange: (tab: TeamTab) => void;
  hideReminders?: boolean;
  hideAi?: boolean;
}) {
  const tabs = TEAM_TABS.filter((t) => {
    if (hideReminders && t.id === "reminders") return false;
    if (hideAi && t.id === "ai") return false;
    return true;
  });

  return (
    <nav className="flex border-t border-white/[0.06] bg-[#0a0a10]/98">
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
              on ? "text-cyan-300" : "text-white/40"
            }`}
          >
            <span
              className={`h-1 w-8 rounded-full ${on ? "bg-cyan-400" : "bg-transparent"}`}
            />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
