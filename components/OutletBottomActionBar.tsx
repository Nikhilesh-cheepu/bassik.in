"use client";

import Link from "next/link";
import type { MergedOutletUi } from "@/lib/outlet-ui-config";

type OutletBottomActionBarProps = {
  outletUi: MergedOutletUi;
  brandBookingPath: string;
  showMenuSection: boolean;
  hasOffers: boolean;
  onContact: () => void;
  onMenu: () => void;
  onBookEvent: () => void;
};

export default function OutletBottomActionBar({
  outletUi,
  brandBookingPath,
  showMenuSection,
  hasOffers,
  onContact,
  onMenu,
  onBookEvent,
}: OutletBottomActionBarProps) {
  const bb = outletUi.bottomBar;
  const showEvent = bb.showBookEvent && (!bb.hideBookEventWhenEmpty || hasOffers);
  const showMenuRow = bb.showMenuInBar && showMenuSection;

  const visibleCount =
    (bb.showBookTable ? 1 : 0) + (showEvent ? 1 : 0) + (bb.showContact ? 1 : 0);

  return (
    <div
      className="fixed left-1/2 z-[100] w-[calc(100%-1rem)] max-w-md -translate-x-1/2 flex flex-col items-stretch gap-1.5"
      style={{ bottom: "max(0.6rem, env(safe-area-inset-bottom))" }}
    >
      <div className="rounded-full border border-white/12 bg-black/95 p-1 shadow-[0_10px_36px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        {visibleCount > 0 && (
          <div className="flex min-h-[42px] items-stretch gap-1">
            {bb.showBookTable && (
              <Link
                href={brandBookingPath}
                prefetch
                className="flex min-h-[40px] min-w-0 flex-[1.35] shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-center transition-transform active:scale-[0.985]"
                style={{
                  backgroundColor: bb.bookTableBg,
                  color: "#0b0d10",
                  fontWeight: 700,
                  fontSize: "12px",
                  lineHeight: 1.1,
                }}
              >
                <span>{bb.bookTableLabel}</span>
                {bb.bookTableBadge ? (
                  <span
                    className="rounded-full px-1 text-[9px] font-semibold tracking-wide"
                    style={{ backgroundColor: "rgba(0,0,0,0.18)", color: "#0b0d10" }}
                  >
                    {bb.bookTableBadge}
                  </span>
                ) : null}
              </Link>
            )}
            {showEvent ? (
              <button
                type="button"
                onClick={onBookEvent}
                className="flex min-h-[40px] min-w-0 flex-1 shrink-0 items-center justify-center rounded-full px-2 text-[12px] font-bold transition-transform active:scale-[0.985]"
                style={{ backgroundColor: bb.bookEventBg, color: "#fafafa" }}
              >
                {bb.bookEventLabel}
              </button>
            ) : null}
            {bb.showContact ? (
              <button
                type="button"
                onClick={onContact}
                className="flex min-h-[40px] min-w-0 flex-1 shrink-0 items-center justify-center rounded-full px-2 text-[12px] font-bold transition-transform active:scale-[0.985]"
                style={{
                  backgroundColor: bb.contactBg,
                  color: bb.contactText,
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: bb.contactBorder,
                }}
              >
                {bb.contactLabel}
              </button>
            ) : null}
          </div>
        )}

        {showMenuRow && (
          <div className="mt-1 flex justify-center px-0.5 pb-0.5">
            <button
              type="button"
              onClick={onMenu}
              className="w-full min-h-[36px] max-w-[min(100%,18rem)] rounded-full px-3 text-[12px] font-semibold transition-transform active:scale-[0.99]"
              style={{
                backgroundColor: bb.menuBg,
                color: bb.menuText,
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: bb.menuBorder,
              }}
            >
              {bb.menuLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
