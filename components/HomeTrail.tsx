/* Landing — mix-up picks, small venue cards, explore-only (no book on home). */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { BRANDS, Brand, HIDDEN_BRAND_IDS } from "@/lib/brands";
import HomeConcierge from "@/components/HomeConcierge";
import { shuffleVenues } from "@/lib/home-intents";
import { getVenueSpecialtySnippet } from "@/lib/venue-uniqueness";

interface HomeTrailProps {
  venues?: Brand[];
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
  "Explore a venue to book",
];

/** Featured count — 2×2 on mobile. */
const FEATURED_COUNT = 4;

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

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function VenueMiniCard({ brand }: { brand: Brand }) {
  const logoPath = getLogoPath(brand);
  const snippet = getVenueSpecialtySnippet(brand, 72);

  return (
    <Link
      href={`/${brand.id}`}
      prefetch={false}
      className="group block rounded-xl sm:rounded-2xl p-3 sm:p-3.5 flex flex-col gap-2.5 min-h-[8.25rem] sm:min-h-[8.75rem]
        bg-gradient-to-b from-white/[0.07] to-white/[0.02]
        border border-white/[0.09]
        shadow-[0_12px_40px_-16px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.03)_inset,0_1px_0_rgba(255,255,255,0.06)_inset]
        outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
        transition-[transform,box-shadow] hover:border-white/[0.14] active:scale-[0.99]"
    >
      <div className="flex gap-2.5 min-w-0 flex-1">
        <div className="relative w-9 h-9 shrink-0 rounded-full bg-stone-800/80 overflow-hidden ring-1 ring-white/10 shadow-md shadow-black/30 pointer-events-none">
          <Image
            src={logoPath}
            alt={brand.shortName}
            fill
            sizes="36px"
            className="object-contain p-0.5"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-medium text-stone-100 leading-snug line-clamp-2">
            {brand.shortName}
          </p>
          <p className="text-[9px] sm:text-[10px] text-stone-500 leading-relaxed mt-1.5 line-clamp-3">
            {snippet || "Tap through for menus & vibes."}
          </p>
        </div>
      </div>
      <span
        className="mt-auto w-full text-center text-[10px] sm:text-[11px] font-medium py-2 rounded-lg
          text-amber-100/95 bg-white/[0.06] border border-amber-500/20
          group-hover:bg-amber-500/10 group-hover:border-amber-400/30 transition-colors
          shadow-sm shadow-black/20 pointer-events-none"
      >
        Explore
      </span>
    </Link>
  );
}

export default function HomeTrail({ venues = BRANDS }: HomeTrailProps) {
  const visibleVenues = useMemo(
    () => (venues || BRANDS).filter((b) => !HIDDEN_BRAND_IDS.has(b.id)),
    [venues]
  );

  const stableOrdered = useMemo(
    () => [...visibleVenues].sort(sortByVenueOrder),
    [visibleVenues]
  );

  const [shuffledDeck, setShuffledDeck] = useState<Brand[] | null>(null);

  useEffect(() => {
    setShuffledDeck(shuffleVenues([...stableOrdered]));
  }, [stableOrdered]);

  const deck = shuffledDeck ?? stableOrdered;
  const featured = useMemo(() => deck.slice(0, FEATURED_COUNT), [deck]);
  const moreVenues = useMemo(() => deck.slice(FEATURED_COUNT), [deck]);

  const handleShuffle = useCallback(() => {
    setShuffledDeck(shuffleVenues([...stableOrdered]));
  }, [stableOrdered]);

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
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Open a venue to explore — book from there when you’re ready.
          </p>
        </section>

        <section className="px-4 sm:px-6 mb-8 sm:mb-10" aria-label="Offers and deals">
          <div className="max-w-4xl mx-auto rounded-full border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <div className="relative w-full overflow-hidden">
              <div className="flex gap-10 py-3 px-5 animate-ticker whitespace-nowrap">
                {[0, 1].map((loop) =>
                  TICKER_MESSAGES.map((msg, idx) => (
                    <span key={`${loop}-${idx}`} className="text-xs sm:text-sm text-gray-100 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" />
                      {msg}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <HomeConcierge onShuffle={handleShuffle} />

        <section className="px-5 sm:px-8 mb-12 sm:mb-16" aria-label="Picks for me">
          <div className="max-w-lg sm:max-w-xl mx-auto flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-stone-50">Picks for me</h2>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed max-w-[18rem] sm:max-w-xs">
                Tiny blurbs — what makes each place its own thing.
              </p>
            </div>
            {moreVenues.length > 0 ? (
              <button
                type="button"
                onClick={() => scrollToId("more-venues")}
                className="text-xs text-amber-400/85 hover:text-amber-300 underline-offset-4 hover:underline self-start sm:self-auto shrink-0"
              >
                More venues
              </button>
            ) : null}
          </div>
          <div className="max-w-lg sm:max-w-xl mx-auto grid grid-cols-2 gap-x-5 gap-y-5 sm:gap-x-7 sm:gap-y-6">
            {featured.map((brand) => (
              <VenueMiniCard key={brand.id} brand={brand} />
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-6 mb-12 sm:mb-14" aria-label="Deal types">
          <div className="max-w-4xl mx-auto">
            <details className="rounded-2xl border border-white/[0.08] bg-white/[0.025] group">
              <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-gray-300 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <span>Deal types at a glance</span>
                <span className="text-gray-500 text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-4 pb-4 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/10">
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-left mt-3">
                  <div className="text-[11px] font-semibold text-amber-300 mb-0.5">Mega value</div>
                  <div className="text-xs font-semibold">Eat &amp; Drink @ ₹127 / ₹128</div>
                </div>
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-left mt-3">
                  <div className="text-[11px] font-semibold text-emerald-300 mb-0.5">Flat savings</div>
                  <div className="text-xs font-semibold">Up to 15% &amp; packages</div>
                </div>
                <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 text-left mt-3">
                  <div className="text-[11px] font-semibold text-sky-300 mb-0.5">Nights out</div>
                  <div className="text-xs font-semibold">DJs • screenings • parties</div>
                </div>
              </div>
            </details>
          </div>
        </section>

        <section id="more-venues" className="px-5 sm:px-8 mb-16 sm:mb-20 scroll-mt-24">
          <div className="max-w-lg sm:max-w-xl mx-auto">
            {moreVenues.length > 0 ? (
              <>
                <h2 className="text-lg sm:text-xl font-semibold text-stone-50 mb-2">Explore more venues</h2>
                <p className="text-xs text-stone-500 mb-7 leading-relaxed max-w-[19rem] sm:max-w-sm">
                  More names to browse — dip in wherever your mood pulls you.
                </p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:gap-x-7 sm:gap-y-6">
                  {moreVenues.map((brand) => (
                    <VenueMiniCard key={brand.id} brand={brand} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-stone-500 leading-relaxed">
                Everything’s up in <span className="text-stone-400">Picks for me</span>. Hit{" "}
                <span className="text-stone-400">Pick for me</span> anytime for a new first look.
              </p>
            )}
          </div>
        </section>

        <section className="px-4 sm:px-6 mb-12">
          <div className="max-w-4xl mx-auto">
            <details className="rounded-2xl border border-white/[0.08] bg-white/[0.025] group">
              <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-gray-300 list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <span>Why book on bassik.in?</span>
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
