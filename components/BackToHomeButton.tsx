"use client";

import Link from "next/link";

/** Icon-only back to Bassik home; sits clear of centered outlet switcher. */
export default function BackToHomeButton() {
  return (
    <Link
      href="/"
      prefetch={false}
      className="absolute left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 backdrop-blur-xl shadow-lg text-white/90 hover:text-white hover:border-white/35 hover:bg-black/70 transition-colors touch-manipulation"
      style={{ touchAction: "manipulation" }}
      aria-label="Back to home"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </Link>
  );
}
