"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type ChatFabArrowProps = {
  visible: boolean;
  accentColor: string;
};

/** Small arrow above the chat FAB — no text. */
export function ChatFabArrow({ visible, accentColor }: ChatFabArrowProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (!visible) return null;

  return (
    <motion.span
      aria-hidden
      className="mb-1.5 block text-[12px] font-semibold leading-none"
      style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}88` }}
      animate={reducedMotion ? undefined : { y: [0, 4, 0], opacity: [0.55, 1, 0.55] }}
      transition={
        reducedMotion ? undefined : { repeat: Infinity, duration: 1.25, ease: "easeInOut" }
      }
    >
      ↓
    </motion.span>
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
        animate={{
          boxShadow: [
            `0 0 12px 2px ${accentColor}55`,
            `0 0 22px 6px ${accentColor}22`,
            `0 0 12px 2px ${accentColor}55`,
          ],
        }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        animate={{
          boxShadow: [`0 0 0 0 ${accentColor}55`, `0 0 0 12px ${accentColor}00`],
        }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
      />
    </>
  );
}
