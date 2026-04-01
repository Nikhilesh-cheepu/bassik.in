"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export type HomeAggregatedEvent = {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  entryLabel: string | null;
  capacityText: string | null;
  brandId: string;
  venueShortName: string;
  brandShortName: string;
  accentColor: string;
  logoPath: string;
};

function formatEventWhen(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomeEventsWall() {
  const [events, setEvents] = useState<HomeAggregatedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/home/events")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data: { events?: HomeAggregatedEvent[] }) => {
        if (!cancelled) setEvents(Array.isArray(data.events) ? data.events : []);
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
  }, []);

  const hasEvents = events.length > 0;
  const subtitle = useMemo(
    () =>
      hasEvents
        ? "Posters from every Bassik venue — tap through for menus, slots, and website-only pricing."
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
              Events &amp; offers from every outlet
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
              className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-hide snap-x snap-mandatory px-1 scroll-pl-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {events.map((ev, idx) => {
                const when = formatEventWhen(ev.eventDate);
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
            <p className="text-center text-[10px] text-stone-600 mt-2 sm:hidden">Swipe for more →</p>
          </div>
        )}
      </div>
    </section>
  );
}
