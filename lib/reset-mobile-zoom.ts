let savedViewportContent: string | null = null;

function viewportMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="viewport"]');
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Blur focused field — helps iOS settle before opening full-screen modals (e.g. Razorpay). */
export function blurActiveField() {
  const el = document.activeElement;
  if (el instanceof HTMLElement) el.blur();
}

/**
 * iOS Safari zooms when focusing inputs with font-size < 16px.
 * Briefly pin maximum-scale to snap back if zoom already happened.
 */
export function resetIosInputZoom() {
  if (typeof window === "undefined" || !isIos()) return;
  blurActiveField();

  const meta = viewportMeta();
  if (!meta) return;

  const original = meta.getAttribute("content") ?? "width=device-width, initial-scale=1";
  meta.setAttribute("content", `${original}, maximum-scale=1`);
  requestAnimationFrame(() => {
    meta.setAttribute("content", original);
    window.scrollTo(0, window.scrollY);
  });
}

/** Hold viewport scale while Razorpay is open — prevents shifted payment sheet on iOS. */
export function lockViewportForPayment() {
  if (typeof window === "undefined" || !isIos()) return;
  blurActiveField();

  const meta = viewportMeta();
  if (!meta) return;

  if (savedViewportContent === null) {
    savedViewportContent = meta.getAttribute("content") ?? "width=device-width, initial-scale=1";
  }

  meta.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
  );
  window.scrollTo(0, 0);
}

export function unlockViewportForPayment() {
  if (typeof window === "undefined") return;

  const meta = viewportMeta();
  if (!meta || savedViewportContent === null) return;

  meta.setAttribute("content", savedViewportContent);
  savedViewportContent = null;
}
