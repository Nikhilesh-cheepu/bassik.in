/**
 * Client-side analytics helpers. Uses Vercel Analytics track() for custom events.
 * Events: whatsapp_click, call_click — include number and optional outlet/source for reporting.
 */

import { track as vercelTrack } from "@vercel/analytics";

export function trackWhatsAppClick(params: {
  number: string;
  outlet?: string;
  source?: "outlet_page" | "reservation" | "admin";
}) {
  try {
    vercelTrack("whatsapp_click", {
      number: params.number,
      ...(params.outlet && { outlet: params.outlet }),
      ...(params.source && { source: params.source }),
    });
  } catch {
    // no-op if analytics unavailable
  }
}

export function trackCallClick(params: { number: string; outlet?: string }) {
  try {
    vercelTrack("call_click", {
      number: params.number,
      ...(params.outlet && { outlet: params.outlet }),
    });
  } catch {
    // no-op if analytics unavailable
  }
}
