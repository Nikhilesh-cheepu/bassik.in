"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Top progress bar shown the moment the user clicks an internal link until the
 * destination route renders. Listens to anchor clicks globally and resets on
 * each pathname change. Lightweight, no external deps.
 */
export default function RouteProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setVisible(true);
    setProgress((p) => (p < 12 ? 12 : p));
  };

  const finish = () => {
    setProgress(100);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const targetEl = e.target as Element | null;
      const anchor = targetEl?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }
      start();
    };

    const onPopState = () => start();

    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    /**
     * `start()` schedules a React state update. React's router calls
     * `history.pushState` inside `useInsertionEffect`, where setState is
     * forbidden — so defer to the next tick.
     */
    const deferStart = () => {
      Promise.resolve().then(start);
    };
    window.history.pushState = function patchedPush(...args) {
      deferStart();
      return originalPush.apply(this, args as Parameters<typeof originalPush>);
    };
    window.history.replaceState = function patchedReplace(...args) {
      return originalReplace.apply(this, args as Parameters<typeof originalReplace>);
    };

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.08));
    }, 180);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    if (visible) finish();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[1000]"
    >
      <div
        className="h-[2.5px] origin-left transition-[width,opacity,transform] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          background: "linear-gradient(90deg, #f59e0b 0%, #f472b6 50%, #34d399 100%)",
          boxShadow: "0 0 14px rgba(244,114,182,0.55), 0 0 6px rgba(52,211,153,0.45)",
        }}
      />
    </div>
  );
}
