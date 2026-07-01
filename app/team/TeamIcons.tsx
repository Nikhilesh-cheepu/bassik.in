export const TEAM_DOCK_HEIGHT = 56;
/** Extra space for the raised center + button */
export const TEAM_DOCK_BUMP = 14;

export const TEAM_DOCK_PADDING = `calc(${TEAM_DOCK_HEIGHT + TEAM_DOCK_BUMP}px + env(safe-area-inset-bottom, 0px))`;

export function IconTasks({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconCalendar({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
      <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPlan({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 4h12v16H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconPlus({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3a5 5 0 00-5 5v3l-2 2h14l-2-2V8a5 5 0 00-5-5z" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  );
}

export function IconAi({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 17l.8 2.4L8 20l-2.2.6L5 23l-.8-2.4L2 20l2.2-.6L5 17zM19 15l.6 1.8L21 17l-1.4.4L19 19l-.6-1.8L17 17l1.4-.4L19 15z" />
    </svg>
  );
}

export function IconWhatsApp({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.08-1.33A9.93 9.93 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.2 14.2c-.22.62-1.28 1.18-1.76 1.26-.45.07-.98.1-1.58-.1-.36-.12-.84-.28-1.45-.55-2.55-1.1-4.2-3.68-4.33-3.85-.12-.18-1.03-1.37-1.03-2.62s.66-1.86.9-2.12c.22-.26.48-.33.64-.33.16 0 .33 0 .47.02.15 0 .35-.06.55.42.2.48.67 1.63.73 1.75.06.12.1.27.02.43-.08.17-.12.27-.25.42-.12.15-.26.33-.37.45-.12.12-.25.27-.1.52.15.25.67 1.1 1.44 1.78 1 .89 1.84 1.17 2.1 1.3.27.13.42.12.57-.07.15-.2.65-.76.82-1.02.17-.27.35-.22.57-.13.23.08 1.45.68 1.7.8.25.13.42.2.48.3.07.12.07.68-.15 1.3z" />
    </svg>
  );
}

export function IconKey({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="8" cy="15" r="4" />
      <path d="M12 15h8M16 11l4 4" strokeLinecap="round" />
      <path d="M14 5a3 3 0 00-3 3v2" strokeLinecap="round" />
    </svg>
  );
}

export function IconMore({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

export function IconLock({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 118 0v3" />
    </svg>
  );
}

export function IconChevronDown({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Compact pill for filter rows in the team header */
export function teamFilterChip(active: boolean, tone: "default" | "violet" = "default"): string {
  const on =
    tone === "violet"
      ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/25"
      : "bg-white/10 text-white ring-1 ring-white/10";
  return `shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
    active ? on : "text-white/40 hover:text-white/55"
  }`;
}
