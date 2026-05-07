/* Landing — mix-up picks, small venue cards, explore-only (no book on home). */
"use client";

import { useMemo, memo, useState, useLayoutEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { BRANDS, Brand, HIDDEN_BRAND_IDS } from "@/lib/brands";
import { getVenueSpecialtySnippet } from "@/lib/venue-uniqueness";
import { shuffleCopy } from "@/lib/shuffle-array";
import type { HomeFeedEvent } from "@/lib/home-feed-types";
import type { HomeReview } from "@/lib/home-reviews";
import HomeEventsWall from "@/components/HomeEventsWall";
import HomeReviewsSection from "@/components/HomeReviewsSection";

interface HomeTrailProps {
  venues?: Brand[];
  initialHomeEvents?: HomeFeedEvent[];
  initialHomeReviews?: HomeReview[];
}

const VENUE_ORDER = [
  "the-hub",
  "alehouse",
  "boiler-room",
  "c53",
  "kiik69",
  "skyhy",
  "club-rogue-gachibowli",
  "club-rogue-kondapur",
  "club-rogue-jubilee-hills",
  "sound-of-soul",
  "thezenzspot",
  "firefly",
];

const TICKER_MESSAGES = [
  "Eat & Drink @ ₹127",
  "Eat & Drink @ ₹128",
  "Flat up to 15% Discounts",
  "Limited slots daily",
  "Website-only offers",
  "Live DJs",
  "Live music",
  "Open rooftop",
  "Tollywood",
  "Bollywood",
  "Day club",
  "Club nights & brunches",
  "Sports on big screens",
  "Sunset sessions",
  "Many more — pick a venue",
  "Explore a venue to book",
];

/**
 * Seamless marquee: two identical flex rows (no single flat row — that breaks -50% math with gap).
 * memo() avoids restarting CSS animation when parent re-renders.
 */
const HomeOfferTicker = memo(function HomeOfferTicker() {
  const strip = (keyPrefix: string, ariaHidden?: boolean) => (
    <div
      className="flex shrink-0 items-center gap-8 py-3.5 pl-4 pr-4 sm:gap-10 sm:pl-5 sm:pr-5"
      aria-hidden={ariaHidden}
    >
      {TICKER_MESSAGES.map((msg, idx) => (
        <span
          key={`${keyPrefix}-${idx}`}
          className="inline-flex shrink-0 items-center gap-2 text-[13px] font-medium text-stone-100 sm:text-sm sm:leading-tight"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          {msg}
        </span>
      ))}
      {/* Matches gap so loop joins like another item gap */}
      <span className="w-8 shrink-0 sm:w-10" aria-hidden />
    </div>
  );

  return (
    <div className="relative w-full overflow-hidden [contain:layout_paint]">
      <div className="inline-flex w-max max-w-none animate-ticker">
        {strip("a")}
        {strip("b", true)}
      </div>
    </div>
  );
});

function sortByVenueOrder(a: Brand, b: Brand): number {
  const indexA = VENUE_ORDER.indexOf(a.id);
  const indexB = VENUE_ORDER.indexOf(b.id);
  if (indexA === -1 && indexB === -1) return 0;
  if (indexA === -1) return 1;
  if (indexB === -1) return -1;
  return indexA - indexB;
}

function getLogoPath(brand: Brand) {
  return brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`);
}

/** Compact 3-column tile (mobile-first). */
function VenueMiniCard({ brand }: { brand: Brand }) {
  const logoPath = getLogoPath(brand);
  const snippet = getVenueSpecialtySnippet(brand, 52);

  return (
    <Link
      href={`/${brand.id}`}
      prefetch
      className="group flex flex-col items-center text-center gap-1.5 p-2 sm:p-2.5 min-h-[7.5rem] sm:min-h-[8.25rem] rounded-xl sm:rounded-2xl
        bg-stone-950/85 backdrop-blur-sm border border-white/[0.07]
        shadow-[0_8px_28px_-14px_rgba(0,0,0,0.9)]
        outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black
        transition-[transform,border-color,box-shadow] duration-200
        hover:border-amber-500/20 hover:shadow-[0_12px_32px_-12px_rgba(251,191,36,0.1)] active:scale-[0.98]"
    >
      <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg bg-stone-900/90 overflow-hidden ring-1 ring-white/[0.06] pointer-events-none">
        <Image
          src={logoPath}
          alt=""
          fill
          sizes="36px"
          className="object-contain p-0.5"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <p className="text-[9px] sm:text-[10px] font-semibold text-stone-100 leading-tight line-clamp-2 w-full min-h-[2lh]">
        {brand.shortName}
      </p>
      <p className="text-[7.5px] sm:text-[9px] text-stone-500 leading-snug line-clamp-2 w-full flex-1 min-h-0">
        {snippet || "Menus & booking."}
      </p>
      <span className="text-[7.5px] sm:text-[9px] font-medium text-stone-500 group-hover:text-amber-200/90 transition-colors pointer-events-none mt-auto pt-0.5">
        Open →
      </span>
    </Link>
  );
}

export default function HomeTrail({
  venues = BRANDS,
  initialHomeEvents,
  initialHomeReviews,
}: HomeTrailProps) {
  const visibleVenues = useMemo(
    () => (venues || BRANDS).filter((b) => !HIDDEN_BRAND_IDS.has(b.id)),
    [venues]
  );

  const sortedVenues = useMemo(() => [...visibleVenues].sort(sortByVenueOrder), [visibleVenues]);
  const [venueDeck, setVenueDeck] = useState<Brand[]>(() => sortedVenues);

  useLayoutEffect(() => {
    if (sortedVenues.length <= 1) {
      setVenueDeck(sortedVenues);
      return;
    }
    setVenueDeck(shuffleCopy(sortedVenues));
  }, [sortedVenues]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 pb-14 sm:pb-16">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-4 text-center">
          <p className="text-xs sm:text-sm font-medium text-gray-500 mb-3 tracking-wide">
            Hyderabad · Clubs · Lounges · Sports bars
          </p>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">
              Book direct. Website-only deals.
            </span>
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            Scroll live events from every outlet, then open a venue to book —{" "}
            <span className="text-stone-400">better deals</span> than apps that clip margins.
          </p>
          <div className="mt-6 flex justify-center px-2">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/[0.18] via-orange-500/[0.12] to-pink-500/[0.15] px-3.5 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-semibold tracking-wide text-amber-50 shadow-[0_0_28px_-6px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]"
              role="status"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                aria-hidden
              />
              <span className="text-center leading-snug">
                Better deals than <span className="text-amber-200">Swiggy</span> &amp;{" "}
                <span className="text-amber-200">Zomato</span>
                <span className="font-medium text-stone-300"> — direct with the venue</span>
              </span>
            </span>
          </div>
        </section>

        <section className="px-4 sm:px-6 mb-8 sm:mb-10" aria-label="Offers and deals">
          <div className="max-w-4xl mx-auto rounded-full border border-white/[0.12] bg-white/[0.06] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <HomeOfferTicker />
          </div>
        </section>

        <HomeEventsWall initialEvents={initialHomeEvents} />
        <HomeReviewsSection initialReviews={initialHomeReviews} />

        <section className="px-3 sm:px-6 mb-12 sm:mb-16" aria-label="Venues">
          <div className="max-w-4xl mx-auto mb-5 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-stone-50">Explore venues</h2>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed max-w-md">
              Tap a card for menus, photos, and booking. Order shuffles on each visit.
            </p>
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {venueDeck.map((brand) => (
              <VenueMiniCard key={brand.id} brand={brand} />
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 mb-12">
          <div className="max-w-4xl mx-auto">
            <details className="rounded-2xl border border-white/[0.08] bg-white/[0.025] group">
              <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-gray-300 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <span>Why book direct here?</span>
                <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/10">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 mt-3">
                  <div className="text-amber-300 font-semibold mb-1 text-[11px]">Website-only deals</div>
                  <p className="text-[11px] text-gray-300">Not the same as aggregator pricing.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 mt-3">
                  <div className="text-emerald-300 font-semibold mb-1 text-[11px]">Direct savings</div>
                  <p className="text-[11px] text-gray-300">Packages from the venue.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 mt-3">
                  <div className="text-sky-300 font-semibold mb-1 text-[11px]">Fast booking</div>
                  <p className="text-[11px] text-gray-300">After you pick a venue.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 mt-3">
                  <div className="text-pink-300 font-semibold mb-1 text-[11px]">Limited slots</div>
                  <p className="text-[11px] text-gray-300">Busy nights fill up.</p>
                </div>
              </div>
            </details>
          </div>
        </section>
      </main>
    </div>
  );
}
