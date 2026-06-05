"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const STORAGE_KEY = "bassik-chat-fab-hype-dismissed";

type ChatFabHypeProps = {
  accentColor: string;
  brandId: string;
  visible: boolean;
  onDismiss: () => void;
};

export default function ChatFabHype({ accentColor, brandId, visible, onDismiss }: ChatFabHypeProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }
    try {
      const dismissed = localStorage.getItem(`${STORAGE_KEY}:${brandId}`);
      setShow(!dismissed);
    } catch {
      setShow(true);
    }
  }, [visible, brandId]);

  const dismiss = () => {
    setShow(false);
    onDismiss();
    try {
      localStorage.setItem(`${STORAGE_KEY}:${brandId}`, "1");
    } catch {
      /* ignore */
    }
  };

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed z-[94] flex flex-col items-end gap-1"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "calc(8.75rem + env(safe-area-inset-bottom))",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="pointer-events-auto relative max-w-[11.5rem] rounded-2xl border border-white/12 bg-black/75 px-3.5 py-2.5 text-right shadow-[0_12px_40px_-12px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        style={{
          boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 12px 36px -8px ${accentColor}44`,
        }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/50 hover:bg-white/20"
          aria-label="Dismiss chat hint"
        >
          ×
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Live host</p>
        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-white">
          Ask about tonight&apos;s vibe ↓
        </p>
      </motion.div>

      <motion.svg
        aria-hidden
        className="mr-5 h-8 w-8 text-cyan-300/90"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={
          reducedMotion
            ? undefined
            : {
                y: [0, 6, 0],
                opacity: [0.55, 1, 0.55],
              }
        }
        transition={
          reducedMotion
            ? undefined
            : {
                repeat: Infinity,
                duration: 1.35,
                ease: "easeInOut",
              }
        }
      >
        <path d="M12 5v12" />
        <path d="M7 12l5 5 5-5" />
      </motion.svg>
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
    <>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 0 0 ${accentColor}55` }}
        animate={{
          boxShadow: [
            `0 0 0 0 ${accentColor}44`,
            `0 0 0 10px ${accentColor}00`,
            `0 0 0 0 ${accentColor}00`,
          ],
        }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeOut" }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-cyan-400/25"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeOut" }}
      />
    </>
  );
}
