"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_HINTS = [
  "Your name & mobile number…",
  "What time does it start tonight?",
  "Can I book a table for tonight?",
  "What's special this weekend?",
  "Tell me about today's offers",
  "What's on the menu?",
  "Any cover charge tonight?",
];

type ChatAnimatedPlaceholderProps = {
  hints?: string[];
  active?: boolean;
  className?: string;
};

export default function ChatAnimatedPlaceholder({
  hints = DEFAULT_HINTS,
  active = true,
  className = "",
}: ChatAnimatedPlaceholderProps) {
  const [display, setDisplay] = useState("");
  const phraseIdx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || hints.length === 0) {
      setDisplay("");
      return;
    }

    const clear = () => {
      if (timer.current) clearTimeout(timer.current);
    };

    const step = () => {
      const phrase = hints[phraseIdx.current % hints.length] ?? hints[0];

      if (!deleting.current) {
        charIdx.current += 1;
        setDisplay(phrase.slice(0, charIdx.current));
        if (charIdx.current >= phrase.length) {
          timer.current = setTimeout(() => {
            deleting.current = true;
            step();
          }, 2200);
          return;
        }
        timer.current = setTimeout(step, 38);
      } else {
        charIdx.current -= 1;
        setDisplay(phrase.slice(0, charIdx.current));
        if (charIdx.current <= 0) {
          deleting.current = false;
          phraseIdx.current = (phraseIdx.current + 1) % hints.length;
          timer.current = setTimeout(step, 420);
          return;
        }
        timer.current = setTimeout(step, 24);
      }
    };

    charIdx.current = 0;
    deleting.current = false;
    step();

    return clear;
  }, [active, hints]);

  if (!active) return null;

  return (
    <span
      className={`pointer-events-none select-none truncate text-[15px] font-normal tracking-wide text-white/40 ${className}`}
      aria-hidden
    >
      {display}
      <span className="ml-px inline-block w-[1px] animate-pulse bg-white/20 align-middle" style={{ height: "0.9em" }} />
    </span>
  );
}

export { DEFAULT_HINTS };
