export function IconCart({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 6h15l-1.5 9h-12z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.25" fill="currentColor" stroke="none" />
      <path d="M6 6L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGrid({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconChevronLeft({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPlus({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function IconUpload({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v1a3 3 0 003 3h10a3 3 0 003-3v-1" strokeLinecap="round" />
    </svg>
  );
}

export function IconStock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5v-9z" strokeLinejoin="round" />
      <path d="M12 12v9M4 7.5l8 4.5 8-4.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAi({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M12 3l1.4 4.8L18 9.2l-4.6 1.4L12 15.2l-1.4-4.6L6 9.2l4.6-1.4L12 3z"
        strokeLinejoin="round"
      />
      <path d="M5 17h.01M19 17h.01M12 19v.01" strokeLinecap="round" />
    </svg>
  );
}

export function IconSparkle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.2 4.2L17.5 7.5l-4.3 1.3L12 13l-1.2-4.2L6.5 7.5l4.3-1.3L12 2zm7 9l.8 2.8L22.5 15l-2.7.8L19 18.5l-.8-2.7L15.5 15l2.7-.8L19 11zm-14 0l.8 2.8L8.5 15l-2.7.8L6 18.5l-.8-2.7L2.5 15l2.7-.8L6 11z" />
    </svg>
  );
}
