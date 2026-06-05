"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const STORAGE_KEY = "bassik-chat-fab-hype-dismissed";

const FAB_HINTS = [
  "Book a table tonight?",
  "What's on this weekend?",
  "Ask about cover & offers",
  "Chat with our host →",
];

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
    }, 3200);
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
    <div className="pointer-events-auto mb-1 flex flex-col items-end pr-0.5">
      <div className="flex max-w-[9.5rem] items-start gap-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={hint}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-right text-[11px] font-medium leading-snug tracking-wide text-white/70"
            style={{ textShadow: `0 0 20px ${accentColor}33` }}
          >
            {hint}
          </motion.p>
        </AnimatePresence>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 pt-px text-[10px] leading-none text-white/30 hover:text-white/55"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <motion.span
        aria-hidden
        className="mt-0.5 text-[10px] leading-none"
        style={{ color: `${accentColor}cc` }}
        animate={reducedMotion ? undefined : { y: [0, 3, 0], opacity: [0.45, 0.9, 0.45] }}
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
        boxShadow: [
          `0 0 0 0 ${accentColor}33`,
          `0 0 0 8px ${accentColor}00`,
        ],
      }}
      transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
    />
  );
}
