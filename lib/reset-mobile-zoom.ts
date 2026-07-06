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
  if (typeof window === "undefined") return;
  blurActiveField();

  const ua = navigator.userAgent;
  if (!/iPhone|iPad|iPod/i.test(ua)) return;

  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;

  const original = meta.getAttribute("content") ?? "width=device-width, initial-scale=1";
  meta.setAttribute("content", `${original}, maximum-scale=1`);
  requestAnimationFrame(() => {
    meta.setAttribute("content", original);
    window.scrollTo(0, window.scrollY);
  });
}
