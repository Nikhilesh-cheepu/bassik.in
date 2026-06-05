/** Per-venue marketing UI for footer bar + contact sheet (stored as Venue.outletUi JSON). */

import type { Prisma } from "@prisma/client";

export type OutletUiLocateAlignment = "start" | "center" | "end";

export type OutletUiConfig = {
  bottomBar?: {
    bookTableLabel?: string;
    bookTableBadge?: string;
    bookEventLabel?: string;
    contactLabel?: string;
    menuLabel?: string;
    showBookTable?: boolean;
    showBookEvent?: boolean;
    showContact?: boolean;
    showMenuInBar?: boolean;
    hideBookEventWhenEmpty?: boolean;
    bookTableBg?: string;
    bookEventBg?: string;
    contactBg?: string;
    contactBorder?: string;
    contactText?: string;
    menuBg?: string;
    menuBorder?: string;
    menuText?: string;
  };
  contactSheet?: {
    title?: string;
    subtitle?: string | null;
    locateLabel?: string;
    locateAlign?: OutletUiLocateAlignment;
    locateBg?: string;
    locateBorder?: string;
    locateText?: string;
    showCall?: boolean;
    showWhatsApp?: boolean;
    showInstagram?: boolean;
    showLocate?: boolean;
    callLabel?: string;
    whatsappLabel?: string;
    instagramLabel?: string;
    /** Empty string hides Instagram in the sheet; omitted uses brand URL from code. */
    instagramUrl?: string;
  };
  chat?: {
    /** Display name for the venue host in guest chat; empty → friendly neighbourhood host */
    hostName?: string | null;
  };
};

/** Fully merged config for outlet UI rendering. */
export type MergedOutletUi = {
  bottomBar: {
    bookTableLabel: string;
    bookTableBadge: string | null;
    bookEventLabel: string;
    contactLabel: string;
    menuLabel: string;
    showBookTable: boolean;
    showBookEvent: boolean;
    showContact: boolean;
    showMenuInBar: boolean;
    hideBookEventWhenEmpty: boolean;
    bookTableBg: string;
    bookEventBg: string;
    contactBg: string;
    contactBorder: string;
    contactText: string;
    menuBg: string;
    menuBorder: string;
    menuText: string;
  };
  contactSheet: {
    title: string;
    subtitle: string | null;
    locateLabel: string;
    locateAlign: OutletUiLocateAlignment;
    locateBg: string;
    locateBorder: string;
    locateText: string;
    showCall: boolean;
    showWhatsApp: boolean;
    showInstagram: boolean;
    showLocate: boolean;
    callLabel: string;
    whatsappLabel: string;
    instagramLabel: string;
    /** undefined → use outlet brand URL; '' → hide; else custom URL */
    instagramUrlResolved: string | undefined;
  };
};

export function parseOutletUi(raw: unknown): OutletUiConfig | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as OutletUiConfig;
}

export function mergeOutletUi(raw: unknown): MergedOutletUi {
  const p = parseOutletUi(raw);
  const b = p?.bottomBar ?? {};
  const c = p?.contactSheet ?? {};

  let instagramUrlResolved: string | undefined;
  if (Object.prototype.hasOwnProperty.call(c, "instagramUrl")) {
    const ig = c.instagramUrl;
    if (ig === null || (typeof ig === "string" && !ig.trim())) {
      instagramUrlResolved = "";
    } else if (typeof ig === "string" && /^https?:\/\//i.test(ig.trim())) {
      instagramUrlResolved = ig.trim();
    } else if (typeof ig === "string" && ig.trim()) {
      instagramUrlResolved = undefined;
    }
  }

  const hasSubtitleKey = Object.prototype.hasOwnProperty.call(c, "subtitle");
  let mergedSubtitle: string | null;
  if (!hasSubtitleKey) {
    mergedSubtitle = "Call, WhatsApp, Instagram, or find us";
  } else if (c.subtitle === null || (typeof c.subtitle === "string" && !c.subtitle.trim())) {
    mergedSubtitle = null;
  } else {
    mergedSubtitle = typeof c.subtitle === "string" ? c.subtitle.trim().slice(0, 200) : null;
  }

  return {
    bottomBar: {
      bookTableLabel: b.bookTableLabel?.trim() || "Book table",
      bookTableBadge:
        b.bookTableBadge === null ||
        (typeof b.bookTableBadge === "string" && b.bookTableBadge.trim() === "")
          ? null
          : typeof b.bookTableBadge === "string" && b.bookTableBadge.trim()
            ? b.bookTableBadge.trim()
            : "5% OFF",
      bookEventLabel: b.bookEventLabel?.trim() || "Book event",
      contactLabel: b.contactLabel?.trim() || "Contact us",
      showBookTable: b.showBookTable !== false,
      showBookEvent: b.showBookEvent !== false,
      showContact: b.showContact !== false,
      showMenuInBar: b.showMenuInBar === true,
      hideBookEventWhenEmpty: b.hideBookEventWhenEmpty !== false,
      bookTableBg: b.bookTableBg?.trim() || "#FDE047",
      bookEventBg: b.bookEventBg?.trim() || "#A78BFA",
      contactBg: b.contactBg?.trim() || "#0B1220",
      contactBorder: b.contactBorder?.trim() || "#22D3EE",
      contactText: b.contactText?.trim() || "#A5F3FC",
      menuLabel: b.menuLabel?.trim() || "Menu",
      menuBg: b.menuBg?.trim() || "rgba(255,255,255,0.08)",
      menuBorder: b.menuBorder?.trim() || "rgba(255,255,255,0.14)",
      menuText: b.menuText?.trim() || "rgba(255,255,255,0.92)",
    },
    contactSheet: {
      title: c.title?.trim() || "Contact us",
      subtitle: mergedSubtitle,
      locateLabel: c.locateLabel?.trim() || "Locate us",
      locateAlign:
        c.locateAlign === "start" || c.locateAlign === "center" || c.locateAlign === "end"
          ? c.locateAlign
          : "end",
      locateBg:
        c.locateBg?.trim() ||
        "linear-gradient(118deg, rgba(146,64,14,0.55) 0%, rgba(30,27,59,0.88) 70%)",
      locateBorder: c.locateBorder?.trim() || "#FACC15",
      locateText: c.locateText?.trim() || "#FEF9C3",
      showCall: c.showCall !== false,
      showWhatsApp: c.showWhatsApp !== false,
      showInstagram: c.showInstagram !== false,
      showLocate: c.showLocate !== false,
      callLabel: c.callLabel?.trim() || "Call",
      whatsappLabel: c.whatsappLabel?.trim() || "WhatsApp",
      instagramLabel: c.instagramLabel?.trim() || "Instagram",
      instagramUrlResolved,
    },
  };
}

/** Persistable JSON for Prisma — shallow whitelist. */
export function sanitizeOutletUiForStorage(raw: unknown): Prisma.InputJsonValue | undefined | null {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  const takeStr = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : undefined;

  if (src.bottomBar && typeof src.bottomBar === "object" && !Array.isArray(src.bottomBar)) {
    const b = src.bottomBar as Record<string, unknown>;
    const bb: Record<string, unknown> = {};
    if ("bookTableBadge" in b) {
      if (b.bookTableBadge === null) bb.bookTableBadge = null;
      else {
        const badge = takeStr(b.bookTableBadge, 24);
        if (badge !== undefined) bb.bookTableBadge = badge === "" ? null : badge;
      }
    }
    const keys: [string, number][] = [
      ["bookTableLabel", 40],
      ["bookEventLabel", 40],
      ["contactLabel", 40],
      ["menuLabel", 24],
      ["bookTableBg", 80],
      ["bookEventBg", 80],
      ["contactBg", 80],
      ["contactBorder", 48],
      ["contactText", 48],
      ["menuBg", 80],
      ["menuBorder", 48],
      ["menuText", 48],
    ];
    for (const [k, max] of keys) {
      const v = takeStr(b[k], max);
      if (v !== undefined) bb[k] = v;
    }
    for (const k of [
      "showBookTable",
      "showBookEvent",
      "showContact",
      "showMenuInBar",
      "hideBookEventWhenEmpty",
    ] as const) {
      if (typeof b[k] === "boolean") bb[k] = b[k];
    }
    if (Object.keys(bb).length > 0) out.bottomBar = bb;
  }

  if (src.contactSheet && typeof src.contactSheet === "object" && !Array.isArray(src.contactSheet)) {
    const c = src.contactSheet as Record<string, unknown>;
    const cc: Record<string, unknown> = {};
    const strKeys: [string, number][] = [
      ["title", 60],
      ["subtitle", 200],
      ["locateLabel", 40],
      ["locateBg", 200],
      ["locateBorder", 48],
      ["locateText", 48],
      ["callLabel", 32],
      ["whatsappLabel", 32],
      ["instagramLabel", 40],
      ["instagramUrl", 512],
    ];
    for (const [k, max] of strKeys) {
      if (!(k in c)) continue;
      if (k === "subtitle") {
        if (c.subtitle === null) cc.subtitle = null;
        else {
          const s = takeStr(c.subtitle, max);
          if (s !== undefined) cc.subtitle = s === "" ? null : s;
        }
        continue;
      }
      if (k === "instagramUrl") {
        const s = typeof c.instagramUrl === "string" ? c.instagramUrl.trim().slice(0, max) : undefined;
        if (s !== undefined) cc.instagramUrl = s;
        continue;
      }
      const v = takeStr(c[k], max);
      if (v !== undefined) cc[k] = v;
    }
    if (
      typeof c.locateAlign === "string" &&
      (c.locateAlign === "start" || c.locateAlign === "center" || c.locateAlign === "end")
    ) {
      cc.locateAlign = c.locateAlign;
    }
    for (const k of ["showCall", "showWhatsApp", "showInstagram", "showLocate"] as const) {
      if (typeof c[k] === "boolean") cc[k] = c[k];
    }
    if (Object.keys(cc).length > 0) out.contactSheet = cc;
  }

  if (src.chat && typeof src.chat === "object" && !Array.isArray(src.chat)) {
    const ch = src.chat as Record<string, unknown>;
    const chatOut: Record<string, unknown> = {};
    if ("hostName" in ch) {
      if (ch.hostName === null) chatOut.hostName = null;
      else {
        const name = takeStr(ch.hostName, 48);
        if (name !== undefined) chatOut.hostName = name === "" ? null : name;
      }
    }
    if (Object.keys(chatOut).length > 0) out.chat = chatOut;
  }

  return out as Prisma.InputJsonValue;
}
