"use client";

import { useEffect, useRef, useState } from "react";
import {
  GROWTH_FROM_PRICES,
  GROWTH_PATHS,
  bassikGrowthWhatsAppUrl,
  getGrowthVertical,
  type GrowthPathId,
  type GrowthVerticalId,
} from "@/lib/bassik-growth";

function IconCheck() {
  return (
    <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function GrowthPathCarousel({
  verticalId,
  prices,
  showFromPricing = false,
}: {
  verticalId: GrowthVerticalId;
  prices?: Record<GrowthPathId, string> | null;
  showFromPricing?: boolean;
}) {
  const vertical = getGrowthVertical(verticalId);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const nudged = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.querySelector("li");
      const step = card ? card.getBoundingClientRect().width + 8 : el.clientWidth * 0.46;
      const i = Math.round(el.scrollLeft / step);
      setActive(Math.max(0, Math.min(GROWTH_PATHS.length - 1, i)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [verticalId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || nudged.current) return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    nudged.current = true;
    const t1 = window.setTimeout(() => el.scrollTo({ left: 56, behavior: "smooth" }), 700);
    const t2 = window.setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 1400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const scrollToIndex = (i: number) => {
    const el = scrollerRef.current;
    const card = el?.querySelectorAll("li")[i] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 bg-gradient-to-l from-[#F7F5F8] to-transparent sm:hidden"
        aria-hidden
      />
      <ul
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 pr-6 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:snap-none sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pr-0 [&::-webkit-scrollbar]:hidden"
        aria-label="Care, Growth, and Revenue — swipe sideways"
      >
        {GROWTH_PATHS.map((path) => (
          <li
            key={path.id}
            className={`relative w-[48%] shrink-0 snap-start sm:w-auto ${
              path.highlighted
                ? "rounded-[1.15rem] border border-[#C4B5FD]/70 bg-[#F3EEFF]/90 shadow-[0_12px_36px_-24px_rgba(100,80,180,0.45)]"
                : "rounded-[1.15rem] border border-[#E6E1E8] bg-white/75 shadow-sm ring-1 ring-black/5"
            }`}
          >
            <a
              href={bassikGrowthWhatsAppUrl(verticalId, path.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3.5 sm:p-5"
            >
              {path.badge ? (
                <span className="mb-1.5 inline-flex rounded-full bg-[#12131A] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-white">
                  {path.badge}
                </span>
              ) : (
                <span className="mb-1.5 block h-[18px]" aria-hidden />
              )}
              <h3 className="font-[family-name:var(--font-agency-display)] text-lg font-semibold sm:text-xl">
                {path.name}
              </h3>
              <p className="mt-0.5 text-[12px] font-medium text-[#6B6570]">{path.role}</p>
              <p className="mt-2 text-[11px] font-semibold leading-snug text-[#12131A] sm:text-[12px]">
                {vertical.pathOutcomes[path.id as GrowthPathId]}
              </p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B8494]">
                What you get
              </p>
              <ul className="mt-1.5 space-y-1">
                {path.includes.slice(0, 4).map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-1.5 text-[10px] leading-snug text-[#4A4550] sm:text-[11px]"
                  >
                    <span className="mt-0.5 text-[#8B7BB8]">
                      <IconCheck />
                    </span>
                    <span className="line-clamp-2">{item}</span>
                  </li>
                ))}
              </ul>
              {prices?.[path.id as GrowthPathId] ? (
                <p className="mt-2.5 font-[family-name:var(--font-agency-display)] text-base font-semibold sm:text-lg">
                  {prices[path.id as GrowthPathId]}
                  <span className="ml-0.5 text-[10px] font-normal text-[#8B8494]">/mo</span>
                </p>
              ) : showFromPricing ? (
                <p className="mt-2.5 font-[family-name:var(--font-agency-display)] text-base font-semibold tracking-tight sm:text-lg">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8B8494]">
                    from
                  </span>
                  {GROWTH_FROM_PRICES[path.id as GrowthPathId]}
                  <span className="ml-0.5 text-[10px] font-normal text-[#8B8494]">/mo</span>
                </p>
              ) : null}
              <p
                className={`mt-2 text-[11px] font-semibold ${path.highlighted ? "text-[#12131A]" : "text-[#8B8494]"}`}
              >
                Tap to WhatsApp →
              </p>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 flex items-center justify-center gap-2.5 sm:hidden">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Path pages">
          {GROWTH_PATHS.map((path, i) => (
            <button
              key={path.id}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Show ${path.name}`}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                active === i ? "w-5 bg-[#12131A]" : "w-1.5 bg-[#12131A]/25"
              }`}
            />
          ))}
        </div>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#8B8494]">
          Swipe
          <span className="path-swipe-hint inline-block" aria-hidden>
            →
          </span>
        </span>
      </div>
    </div>
  );
}
