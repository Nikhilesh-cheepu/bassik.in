"use client";

import { useEffect } from "react";

type LockedRoot = {
  el: HTMLElement;
  overflow: string;
  scrollTop: number;
};

type LockSnapshot = {
  scrollY: number;
  scrollX: number;
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  roots: LockedRoot[];
  pinBody: boolean;
};

type BodyScrollLockOptions = {
  /** Extra scroll containers to lock (e.g. app shells with internal scroll). */
  extraRootSelector?: string;
  /** Pin body with position:fixed — best for window-scrolling pages on iOS. */
  pinBody?: boolean;
};

let lockDepth = 0;
let snapshot: LockSnapshot | null = null;

function queryRoots(selector?: string): HTMLElement[] {
  if (!selector) return [];
  return Array.from(document.querySelectorAll(selector)).filter(
    (n): n is HTMLElement => n instanceof HTMLElement
  );
}

function applyLock(options?: BodyScrollLockOptions) {
  lockDepth++;
  if (lockDepth > 1 || snapshot) return;

  const pinBody = options?.pinBody ?? true;
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  snapshot = {
    scrollY,
    scrollX,
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyLeft: document.body.style.left,
    bodyRight: document.body.style.right,
    bodyWidth: document.body.style.width,
    roots: [],
    pinBody,
  };

  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  if (pinBody) {
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    // Avoid width:100% — on iOS it can shift fixed children (Razorpay, modals) left.
  }

  for (const el of queryRoots(options?.extraRootSelector)) {
    snapshot.roots.push({
      el,
      overflow: el.style.overflow,
      scrollTop: el.scrollTop,
    });
    el.style.overflow = "hidden";
  }
}

function releaseLock() {
  if (lockDepth <= 0) return;
  lockDepth--;
  if (lockDepth > 0 || !snapshot) return;

  const state = snapshot;
  snapshot = null;

  document.documentElement.style.overflow = state.htmlOverflow;
  document.body.style.overflow = state.bodyOverflow;

  if (state.pinBody) {
    document.body.style.position = state.bodyPosition;
    document.body.style.top = state.bodyTop;
    document.body.style.left = state.bodyLeft;
    document.body.style.right = state.bodyRight;
    document.body.style.width = state.bodyWidth;
    window.scrollTo(state.scrollX, state.scrollY);
  }

  for (const { el, overflow, scrollTop } of state.roots) {
    el.style.overflow = overflow;
    el.scrollTop = scrollTop;
  }
}

export function useBodyScrollLock(locked: boolean, options?: string | BodyScrollLockOptions) {
  const opts: BodyScrollLockOptions =
    typeof options === "string" ? { extraRootSelector: options } : (options ?? {});

  useEffect(() => {
    if (!locked) return;
    applyLock(opts);
    return () => releaseLock();
  }, [locked, opts.extraRootSelector, opts.pinBody]);
}

const KIIK69_SCROLL_ROOT = "[data-kiik69-scroll-root]";

/** Lock KIIK 69 shell scroll (main) while sheets are open — no body pin. */
export function useKiik69BodyScrollLock(locked: boolean) {
  useBodyScrollLock(locked, { extraRootSelector: KIIK69_SCROLL_ROOT, pinBody: false });
}
