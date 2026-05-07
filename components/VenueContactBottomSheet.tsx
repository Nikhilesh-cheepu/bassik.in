"use client";

import { motion, AnimatePresence } from "framer-motion";
import { getFullPhoneNumber } from "@/lib/outlet-contacts";
import { trackWhatsAppClick, trackCallClick } from "@/lib/analytics";
import type { MergedOutletUi } from "@/lib/outlet-ui-config";

export type VenueContactRow = { phone: string; label?: string };

type VenueContactBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  brandId: string;
  sheet: MergedOutletUi["contactSheet"];
  contactRows: VenueContactRow[];
  fallbackPhone: string;
  whatsappMessage: string;
  /** Effective URL from brand or outlet override; empty hides row. */
  instagramUrl: string;
  mapUrl: string;
};

function displayPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return phone.trim();
}

function PhoneGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5c0-.55.45-1 1-1h1.43c.45 0 .85.3.98.73L7.93 9.4c.08.26.01.54-.21.71l-1.53 1.18a11.047 11.047 0 005.94 5.94l1.17-1.53c.18-.21.46-.29.71-.21l3.58 1.52c.43.13.73.53.73.98V20c0 .55-.45 1-1 1A16 16 0 013 5z" />
    </svg>
  );
}

export default function VenueContactBottomSheet({
  open,
  onClose,
  brandId,
  sheet,
  contactRows,
  fallbackPhone,
  whatsappMessage,
  instagramUrl,
  mapUrl,
}: VenueContactBottomSheetProps) {
  const rows =
    contactRows.length > 0
      ? contactRows.filter((r) => r.phone && String(r.phone).trim())
      : [{ phone: fallbackPhone, label: "Mobile" }];

  const primaryPhone = rows[0]?.phone || fallbackPhone;
  const waFull = getFullPhoneNumber(primaryPhone);
  const waUrl = `https://wa.me/${waFull}?text=${encodeURIComponent(whatsappMessage)}`;
  const hasInstagram = Boolean(
    sheet.showInstagram &&
      instagramUrl &&
      instagramUrl !== "#" &&
      /^https?:\/\//i.test(String(instagramUrl).trim())
  );

  const locateJustify =
    sheet.locateAlign === "center"
      ? "justify-center text-center"
      : sheet.locateAlign === "end"
        ? "justify-end text-right"
        : "justify-start text-left";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="venue-contact-backdrop"
            type="button"
            aria-label="Close contact sheet"
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="venue-contact-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="venue-contact-sheet-title"
            className="fixed inset-x-0 bottom-0 z-[120] mx-auto flex max-h-[min(89vh,640px)] w-full max-w-md flex-col rounded-t-[28px] border border-white/15 border-b-0 bg-gradient-to-b from-[#0f1419] to-[#07090d] shadow-[0_-20px_60px_rgba(0,0,0,0.55)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 380 }}
          >
            <div className="flex flex-col items-center pt-3 pb-3">
              <div className="h-1 w-11 rounded-full bg-white/28" aria-hidden />
              <div className="mt-4 flex w-full items-start justify-between gap-4 px-5">
                <h2 id="venue-contact-sheet-title" className="text-lg font-bold tracking-tight text-white">
                  {sheet.title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 text-sm font-medium text-white/90 hover:text-white touch-manipulation"
                  style={{ touchAction: "manipulation" }}
                >
                  Close
                </button>
              </div>
              {sheet.subtitle ? (
                <p className="mt-1 w-full px-5 text-left text-xs text-white/45">{sheet.subtitle}</p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-2.5">
              {sheet.showCall &&
                rows.map((row, i) => {
                  const full = getFullPhoneNumber(row.phone);
                  const tel = `tel:+${full}`;
                  const mainTitle =
                    i === 0
                      ? sheet.callLabel || "Call"
                      : row.label?.trim()
                        ? row.label!.trim()
                        : sheet.callLabel || "Call";
                  const sub = displayPhone(row.phone);
                  return (
                    <a
                      key={`${full}-${i}`}
                      href={tel}
                      onClick={() => trackCallClick({ number: full, outlet: brandId })}
                      className="flex min-h-[52px] items-center rounded-2xl border border-emerald-500/35 bg-[#14181f]/90 px-4 py-3 transition-transform active:scale-[0.992]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#cddc3940] text-[#dce775] ring-1 ring-[#cddc3944]">
                        <PhoneGlyph className="h-[22px] w-[22px]" />
                      </div>
                      <div className="min-w-0 flex-1 pl-3">
                        <p className="text-[15px] font-bold tracking-tight text-white">{mainTitle}</p>
                        <p className="text-xs font-medium text-white/45">{sub}</p>
                      </div>
                      <svg
                        className="h-5 w-5 shrink-0 text-white/35"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  );
                })}

              {sheet.showWhatsApp && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackWhatsAppClick({ number: waFull, outlet: brandId })}
                  className="flex min-h-[52px] items-center rounded-2xl border border-emerald-500/40 bg-[#14181f]/90 px-4 py-3 transition-transform active:scale-[0.992]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25d36633] text-[#6ee7b7] ring-1 ring-[#34d39944]">
                    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1 pl-3">
                    <p className="text-[15px] font-bold text-white">{sheet.whatsappLabel}</p>
                    <p className="text-xs text-white/45">Open chat with {displayPhone(primaryPhone)}</p>
                  </div>
                  <svg
                    className="h-5 w-5 shrink-0 text-white/35"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}

              {hasInstagram && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[52px] items-center rounded-2xl border border-amber-400/38 bg-[#14181f]/90 px-4 py-3 transition-transform active:scale-[0.992]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fcd34d2e] text-[#fcd34d] ring-1 ring-[#fbbf2438]">
                    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1 pl-3">
                    <p className="text-[15px] font-bold text-white">{sheet.instagramLabel}</p>
                    <p className="text-xs text-white/45">See photos &amp; reels</p>
                  </div>
                  <svg
                    className="h-5 w-5 shrink-0 text-white/35"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}

              {sheet.showLocate && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex min-h-[56px] flex-col rounded-2xl px-5 py-4 ring-2 transition-[transform] active:scale-[0.992]`}
                  style={{
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: sheet.locateBorder,
                    background: sheet.locateBg,
                    color: sheet.locateText,
                    boxShadow: `0 0 0 1px ${sheet.locateBorder}22 inset`,
                  }}
                >
                  <div className={`flex flex-wrap items-center gap-2 ${locateJustify}`}>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/35 text-current ring-1 ring-white/14">
                      <svg className="h-5 w-5 opacity-95" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    <span className="text-base font-bold tracking-tight">{sheet.locateLabel}</span>
                  </div>
                  <p
                    className={`mt-3 text-[11px] leading-snug text-current/70 ${sheet.locateAlign === "center" ? "mx-auto max-w-[16rem]" : sheet.locateAlign === "end" ? "ml-auto max-w-[16rem]" : ""}`}
                  >
                    Open {sheet.locateLabel.toLowerCase()} in Google Maps
                  </p>
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
