"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const STORAGE_KEY = "bassik-chat-fab-hype-dismissed";

/** Two-line hints — narrow stack, line 1 = label, line 2 = hook */
const FAB_HINTS = [
  { kicker: "Live host", line: "Book a table tonight?" },
  { kicker: "This weekend", line: "What's on?" },
  { kicker: "Club nights", line: "Ask about cover" },
  { kicker: "Need a spot?", line: "Chat with us" },
] as const;

type ChatFabHintProps = {
  brandId: string;
  visible: boolean;
  accentColor: string;
};

export function ChatFabHint({ brandId, visible, accentColor }: ChatFabHintProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [show, setShow] = useState(false);
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

  const dismiss = () => {
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
    <div className="pointer-events-auto mb-1.5 flex flex-col items-end">
      <div className="relative pr-1 pt-1">
        <button
          type="button"
          onClick={dismiss}
          className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/[0.12] text-[11px] leading-none text-white/55 shadow-sm backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white/80"
          aria-label="Dismiss chat hint"
        >
          ×
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={hintIdx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.28 }}
            className="max-w-[6.75rem] text-right"
            style={{ textShadow: `0 0 16px ${accentColor}28` }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {hint.kicker}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold leading-[1.25] text-white/78">
              {hint.line}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.span
        aria-hidden
        className="mt-0.5 text-[10px] leading-none"
        style={{ color: `${accentColor}bb` }}
        animate={reducedMotion ? undefined : { y: [0, 3, 0], opacity: [0.5, 1, 0.5] }}
        transition={
          reducedMotion ? undefined : { repeat: Infinity, duration: 1.2, ease: "easeInOut" }
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
        boxShadow: [`0 0 0 0 ${accentColor}33`, `0 0 0 8px ${accentColor}00`],
      }}
      transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
    />
  );
}
