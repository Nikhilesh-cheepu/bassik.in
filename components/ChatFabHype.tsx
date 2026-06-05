"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** v2 — resets old dismiss flags from earlier builds */
const STORAGE_KEY = "bassik-chat-fab-hype-v2";

const FAB_HINTS = [
  { kicker: "Live host", line: "Book a table tonight?" },
  { kicker: "This weekend", line: "What's on?" },
  { kicker: "Club nights", line: "Ask about cover" },
  { kicker: "Need a spot?", line: "Tap to chat" },
] as const;

type ChatFabHintProps = {
  brandId: string;
  visible: boolean;
  accentColor: string;
};

export function ChatFabHint({ brandId, visible, accentColor }: ChatFabHintProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [show, setShow] = useState(true);
  const [hintIdx, setHintIdx] = useState(0);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    try {
      setShow(!localStorage.getItem(`${STORAGE_KEY}:${brandId}`));
    } catch {
      setShow(true);
    }
  }, [visible, brandId]);

  useEffect(() => {
    if (!show || reducedMotion) return;
    const id = window.setInterval(() => {
      setHintIdx((i) => (i + 1) % FAB_HINTS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [show, reducedMotion]);

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(false);
    try {
      localStorage.setItem(`${STORAGE_KEY}:${brandId}`, "1");
    } catch {
      /* ignore */
    }
  };

  if (!show) return null;

  const hint = FAB_HINTS[hintIdx] ?? FAB_HINTS[0];

  return (
    <div className="pointer-events-auto mb-2 flex flex-col items-end">
      <div
        className="relative rounded-xl px-2.5 py-2 pr-7 backdrop-blur-md"
        style={{
          background: "rgba(0,0,0,0.72)",
          boxShadow: `0 8px 28px rgba(0,0,0,0.55), 0 0 24px ${accentColor}22`,
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/15 text-[11px] leading-none text-white/70 transition-colors hover:bg-white/25 hover:text-white"
          aria-label="Dismiss chat hint"
        >
          ×
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={hintIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="max-w-[7rem] text-right"
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/55">
              {hint.kicker}
            </p>
            <p
              className="mt-0.5 text-[12px] font-semibold leading-[1.2] text-white"
              style={{ textShadow: `0 0 12px ${accentColor}55` }}
            >
              {hint.line}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.span
        aria-hidden
        className="mt-1 text-[11px] font-bold leading-none"
        style={{ color: accentColor }}
        animate={reducedMotion ? undefined : { y: [0, 4, 0], opacity: [0.65, 1, 0.65] }}
        transition={
          reducedMotion ? undefined : { repeat: Infinity, duration: 1.1, ease: "easeInOut" }
        }
      >
        ↓
      </motion.span>
    </div>
  );
}

export function ChatFabPulseRing({
  accentColor,
  reducedMotion,
}: {
  accentColor: string;
  reducedMotion: boolean;
}) {
  if (reducedMotion) return null;

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-full"
      animate={{
        boxShadow: [`0 0 0 0 ${accentColor}44`, `0 0 0 10px ${accentColor}00`],
      }}
      transition={{ repeat: Infinity, duration: 2.2, ease: "easeOut" }}
    />
  );
}
