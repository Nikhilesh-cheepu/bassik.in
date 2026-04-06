"use client";

import { useEffect, useLayoutEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { HomeFeedEvent } from "@/lib/home-feed-types";
import { shuffleCopy } from "@/lib/shuffle-array";
import { formatGuestEventDateLabel } from "@/lib/event-date-display";

export type HomeAggregatedEvent = HomeFeedEvent;

type HomeEventsWallProps = {
  /** From server on `/` — skips a client round-trip to `/api/home/events`. */
  initialEvents?: HomeFeedEvent[];
};

export default function HomeEventsWall({ initialEvents }: HomeEventsWallProps) {
  const [events, setEvents] = useState<HomeAggregatedEvent[]>(() => initialEvents ?? []);
  const [loading, setLoading] = useState(() => initialEvents === undefined);

  // Random order on every full page load (each browser refresh), independent of server cache / ISR.
  useLayoutEffect(() => {
    if (initialEvents === undefined || initialEvents.length <= 1) return;
    setEvents(shuffleCopy(initialEvents));
  }, [initialEvents]);

  useEffect(() => {
    if (initialEvents !== undefined) return;
    let cancelled = false;
    fetch("/api/home/events")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data: { events?: HomeAggregatedEvent[] }) => {
        if (cancelled) return;
        const list = Array.isArray(data.events) ? data.events : [];
        setEvents(list.length > 1 ? shuffleCopy(list) : list);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialEvents]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [carouselDotIndex, setCarouselDotIndex] = useState(0);

  const updateCarouselDots = useCallback(() => {
    const el = scrollRef.current;
    if (!el || events.length <= 1) return;
    const numDots = Math.min(events.length, 5);
    if (numDots <= 1) return;
    const max = el.scrollWidth - el.clientWidth;
    const p = max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0;
    const idx = Math.round(p * (numDots - 1));
    setCarouselDotIndex(Math.min(numDots - 1, Math.max(0, idx)));
  }, [events.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || events.length <= 1) return;
    updateCarouselDots();
    el.addEventListener("scroll", updateCarouselDots, { passive: true });
    const ro = new ResizeObserver(updateCarouselDots);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateCarouselDots);
      ro.disconnect();
    };
  }, [events.length, updateCarouselDots, events]);

  const carouselDotCount = events.length > 1 ? Math.min(events.length, 5) : 0;

  const hasEvents = events.length > 0;
  const subtitle = useMemo(
    () =>
      hasEvents
        ? "Tap through for menus, slots, and website-only pricing."
        : "Venues add new posters often. Explore each spot for the latest.",
    [hasEvents]
  );

  return (
    <section className="relative px-4 sm:px-6 mb-10 sm:mb-14 overflow-hidden" aria-label="Events from all venues">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-amber-500/[0.07] via-orange-500/[0.04] to-transparent blur-2xl"
        aria-hidden
      />
      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-6 sm:mb-8">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-stone-50"
          >
            <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-pink-300 bg-clip-text text-transparent">
              Events &amp; offers
            </span>
          </motion.h2>
          <p className="mt-2 text-xs sm:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">{subtitle}</p>
          <p className="mt-3 text-[11px] sm:text-xs text-stone-600 max-w-lg mx-auto leading-relaxed">
            <span className="text-emerald-400/90 font-medium">Better value</span> than typical{" "}
            <span className="text-stone-400">Swiggy</span> &amp; <span className="text-stone-400">Zomato</span>{" "}
            listings — you&apos;re booking <span className="text-amber-200/90">direct with the venue</span> on Bassik.
          </p>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[42vw] max-w-[220px] aspect-[9/14] rounded-2xl bg-white/[0.06] animate-pulse border border-white/[0.06]"
              />
            ))}
          </div>
        ) : !hasEvents ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-10 text-center">
            <p className="text-sm text-stone-400">No live posters in the feed right now.</p>
            <p className="text-xs text-stone-600 mt-2">Scroll down and pick a venue — each page shows its own events.</p>
          </div>
        ) : (
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-hide snap-x snap-mandatory px-1 scroll-pl-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {events.map((ev, idx) => {
                const when = formatGuestEventDateLabel(ev.eventDate);
                return (
                  <motion.div
                    key={`${ev.brandId}-${ev.id}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.45) }}
                    className="snap-start shrink-0 w-[42vw] max-w-[220px]"
                  >
                    <Link
                      href={`/${ev.brandId}?eventId=${encodeURIComponent(ev.id)}`}
                      prefetch={false}
                      className="group block rounded-2xl overflow-hidden border border-white/[0.1] bg-black/40 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)] transition-all duration-300 hover:border-white/[0.2] hover:shadow-[0_24px_60px_-20px_rgba(251,191,36,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      style={{
                        boxShadow: `0 0 0 1px ${ev.accentColor}18, 0 20px 50px -24px rgba(0,0,0,0.85)`,
                      }}
                    >
                      <div className="relative aspect-[9/14] w-full bg-stone-900/80">
                        <Image
                          src={ev.imageUrl}
                          alt={ev.title || ev.brandShortName || "Event"}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes="220px"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 pt-10">
                          <div
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 mb-2 border text-[10px] font-semibold text-white/95 backdrop-blur-md"
                            style={{
                              backgroundColor: `${ev.accentColor}33`,
                              borderColor: `${ev.accentColor}55`,
                            }}
                          >
                            <span className="relative h-4 w-4 shrink-0 rounded-full overflow-hidden bg-black/30 ring-1 ring-white/20">
                              <Image
                                src={ev.logoPath}
                                alt=""
                                fill
                                className="object-contain p-0.5"
                                sizes="16px"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            </span>
                            {ev.brandShortName}
                          </div>
                          <p className="text-[13px] sm:text-sm font-semibold text-white line-clamp-2 leading-snug">
                            {ev.title?.trim() || "Featured offer"}
                          </p>
                          {when && <p className="text-[10px] text-stone-300 mt-1 font-medium">{when}</p>}
                          {ev.entryLabel && (
                            <p className="text-[10px] text-amber-200/90 mt-0.5 line-clamp-1">{ev.entryLabel}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {carouselDotCount > 0 ? (
              <div className="mt-2 sm:hidden flex items-center justify-center gap-2.5 text-stone-600">
                <div className="flex items-center gap-[5px]" aria-hidden>
                  {Array.from({ length: carouselDotCount }).map((_, i) => (
                    <span
                      key={i}
                      className={`rounded-full bg-current transition-opacity duration-200 shrink-0 ${
                        i === carouselDotIndex ? "opacity-100" : "opacity-[0.35]"
                      }`}
                      style={{ width: 5, height: 5 }}
                    />
                  ))}
                </div>
                <p className="text-center text-[10px] leading-none m-0">Swipe for more →</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
