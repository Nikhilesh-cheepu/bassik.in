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

export function IconFilm({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4" />
    </svg>
  );
}

export function IconScissors({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="6" cy="17" r="2.5" />
      <path d="M8.5 8.5L20 20M8.5 15.5L20 4" strokeLinecap="round" />
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

export function IconEdit({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 20h4l10.5-10.5a2.12 2.12 0 00-3-3L5 17v3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 6.5l3 3" strokeLinecap="round" />
    </svg>
  );
}

export function IconDuplicate({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 012-2h10" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Undo / unsend — curved arrow back. */
export function IconUnsend({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 14L4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h10.5a5.5 5.5 0 110 11H12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Brand icons for checklist platforms (fill currentColor). */
export function IconMeta({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.84 4.03c-1.39 0-2.68.7-3.84 1.86-.37.37-.71.76-1 .1.29-.34.63-.73 1-1.1C14.16 4.73 15.45 4.03 16.84 4.03c2.71 0 4.91 2.36 4.91 5.66s-2.2 5.66-4.91 5.66c-1.39 0-2.68-.7-3.84-1.86-.37-.37-.71-.76-1-1.1-.29.34-.63.73-1 1.1-1.16 1.16-2.45 1.86-3.84 1.86-2.71 0-4.91-2.36-4.91-5.66s2.2-5.66 4.91-5.66c1.39 0 2.68.7 3.84 1.86.37.37.71.76 1 1.1.29-.34.63-.73 1-1.1C14.16 4.73 15.45 4.03 16.84 4.03zm0 2.12c-.89 0-1.73.48-2.58 1.36-.58.6-1.05 1.25-1.42 1.84.37.59.84 1.24 1.42 1.84.85.88 1.69 1.36 2.58 1.36 1.63 0 2.91-1.4 2.91-3.54s-1.28-3.54-2.91-3.54zM7.16 6.15c-1.63 0-2.91 1.4-2.91 3.54s1.28 3.54 2.91 3.54c.89 0 1.73-.48 2.58-1.36.58-.6 1.05-1.25 1.42-1.84-.37-.59-.84-1.24-1.42-1.84-.85-.88-1.69-1.36-2.58-1.36z" />
    </svg>
  );
}

export function IconYoutube({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 00.5 6.2 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.8 3.02 3.02 0 002.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.56a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  );
}

export function IconGoogle({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function IconLinkedin({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

export function IconX({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.9 1.15h3.59l-7.84 8.96L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.55l8.39-9.58L0 1.15h7.6l5.24 6.93 6.06-6.93zm-1.26 19.5h1.99L6.48 3.18H4.35l13.29 17.47z" />
    </svg>
  );
}

export function IconPostings({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconAds({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 10v4h3l5 4V6L7 10H4z" strokeLinejoin="round" />
      <path d="M16 9.5a3.5 3.5 0 010 5" strokeLinecap="round" />
      <path d="M18.5 7a7 7 0 010 10" strokeLinecap="round" />
    </svg>
  );
}

export function IconNotes({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path
        d="M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M8 12h8M8 16h6" strokeLinecap="round" />
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
