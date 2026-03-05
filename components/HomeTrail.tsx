/* Landing page — ultra-lightweight, no gallery images. */
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { BRANDS, Brand } from "@/lib/brands";

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
  "Flat 25–30% Discounts",
  "Limited slots daily",
  "Website-only offers",
  "Book now before slots fill",
];

const CTA_ROTATING_MESSAGES = [
  "Limited slots today",
  "Better deals than Swiggy/Zomato",
  "Website-only discounts",
];

function getLogoPath(brand: Brand) {
  return brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`);
}

function getVibeLabel(brand: Brand): string {
  if (brand.tag) return brand.tag;
  switch (brand.id) {
    case "skyhy":
      return "Rooftop lounge";
    case "kiik69":
      return "Sports bar";
    case "boiler-room":
      return "Underground club";
    case "c53":
      return "Dining restaurant";
    case "alehouse":
      return "Club & dining";
    case "the-hub":
      return "Live screening hub";
    default:
      return "Club & dining";
  }
}

function getOffersCopy(brandId: string): string[] {
  switch (brandId) {
    case "alehouse":
    case "c53":
    case "boiler-room":
      return [
        "Eat & Drink @ ₹127 (12PM – 7PM)",
        "Flat 25–30% Discount (12PM – 10PM)",
      ];
    case "kiik69":
    case "skyhy":
      return [
        "Eat & Drink @ ₹128 (12PM – 8PM)",
        "Flat 30% Discount (12PM – 10PM)",
      ];
    default:
      return [
        "Flat 25–30% Discounts (12PM – 10PM)",
        "Website-only offers for this venue",
      ];
  }
}

export default function HomeTrail({ venues = BRANDS }: HomeTrailProps) {
  const orderedVenues = useMemo(
    () =>
      [...venues].sort((a, b) => {
        const indexA = VENUE_ORDER.indexOf(a.id);
        const indexB = VENUE_ORDER.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }),
    [venues]
  );
  const [openBrandId, setOpenBrandId] = useState<string | null>(null);
  const [ctaIndex, setCtaIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCtaIndex((i) => (i + 1) % CTA_ROTATING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Main content */}
      <main className="flex-1 pb-20">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-4 text-center">
          <p className="text-xs sm:text-sm font-medium text-gray-400 mb-2">
            Hyderabad • Clubs • Lounges • Sports bars
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">
              Book Direct. Unlock Website-Only Deals.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto">
            Better savings than Swiggy &amp; Zomato • Instant table booking
          </p>
        </section>

        {/* Ticker / announcement banner */}
        <section className="px-4 sm:px-6 mb-6">
          <div className="max-w-4xl mx-auto rounded-full border border-white/10 bg-white/5 overflow-hidden">
            <div className="relative w-full overflow-hidden">
              <div className="flex gap-8 py-2 px-4 animate-ticker whitespace-nowrap">
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

        {/* Promo highlight blocks */}
        <section className="px-4 sm:px-6 mb-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left">
              <div className="text-xs font-semibold text-amber-300 mb-1">Mega value</div>
              <div className="text-sm font-semibold">Eat &amp; Drink @ ₹127 / ₹128</div>
              <p className="text-xs text-amber-100/80 mt-1">
                Unlimited-style offers at selected venues during happy hours.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left">
              <div className="text-xs font-semibold text-emerald-300 mb-1">Flat savings</div>
              <div className="text-sm font-semibold">Flat 25–30% Discounts</div>
              <p className="text-xs text-emerald-100/80 mt-1">
                Website-only deals you won&apos;t see on aggregators.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-left">
              <div className="text-xs font-semibold text-sky-300 mb-1">Experiences</div>
              <div className="text-sm font-semibold">Live DJs • Screenings • Parties</div>
              <p className="text-xs text-sky-100/80 mt-1">
                Pick the vibe: rooftop lounge, sports bar, or club nights.
              </p>
            </div>
          </div>
        </section>

        {/* Outlet directory accordion */}
        <section id="outlet-directory" className="px-4 sm:px-6 mb-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-base font-semibold mb-3">Pick an outlet</h2>
            <div className="space-y-2">
              {orderedVenues.map((brand) => {
                const isOpen = openBrandId === brand.id;
                const offersLines = getOffersCopy(brand.id);
                const logoPath = getLogoPath(brand);

                return (
                  <div
                    key={brand.id}
                    className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full px-4 py-3 flex items-center justify-between gap-3"
                      onClick={() =>
                        setOpenBrandId((prev) => (prev === brand.id ? null : brand.id))
                      }
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                          <Image
                            src={logoPath}
                            alt={brand.shortName}
                            fill
                            sizes="32px"
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-sm font-medium truncate">{brand.shortName}</span>
                          <span className="text-[11px] text-gray-400 truncate">
                            {getVibeLabel(brand)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/${brand.id}`}
                          prefetch={false}
                          className="hidden sm:inline-flex text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/90 hover:bg-white/10 transition-colors"
                        >
                          Explore
                        </Link>
                        <span
                          className="inline-flex w-6 h-6 items-center justify-center rounded-full border border-white/20 text-[11px]"
                          aria-hidden="true"
                        >
                          {isOpen ? "−" : "+"}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-sm border-t border-white/10 bg-black/50">
                        <p className="text-xs font-semibold text-gray-300 mb-1">
                          Available offers today
                        </p>
                        <ul className="text-xs text-gray-200 space-y-1 mb-2">
                          {offersLines.map((line) => (
                            <li key={line} className="flex items-start gap-1.5">
                              <span className="mt-[4px] w-1 h-1 rounded-full bg-emerald-400 inline-block" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[11px] text-amber-200 mb-2">
                          Potential savings: ₹500 – ₹1500 • Limited slots available
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/${brand.id}/reservations`}
                            prefetch={false}
                            className="inline-flex flex-1 items-center justify-center sm:flex-none sm:px-4 sm:flex-initial px-3 py-2 rounded-full bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors"
                          >
                            Book Now
                          </Link>
                          <Link
                            href={`/${brand.id}`}
                            prefetch={false}
                            className="inline-flex flex-1 items-center justify-center sm:flex-none sm:px-4 sm:flex-initial px-3 py-2 rounded-full border border-white/20 text-xs text-white/90 hover:bg-white/10 transition-colors"
                          >
                            View details
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why book here */}
        <section className="px-4 sm:px-6 mb-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-base font-semibold mb-3">Why book on bassik.in?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <div className="text-amber-300 font-semibold mb-1 text-[11px]">
                  Website-only deals
                </div>
                <p className="text-[11px] text-gray-300">
                  Offers you won&apos;t see on Swiggy / Zomato.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <div className="text-emerald-300 font-semibold mb-1 text-[11px]">
                  Better savings
                </div>
                <p className="text-[11px] text-gray-300">
                  Flat discounts and package deals directly from venues.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <div className="text-sky-300 font-semibold mb-1 text-[11px]">
                  Instant booking
                </div>
                <p className="text-[11px] text-gray-300">
                  Instant WhatsApp confirmation with the outlet.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <div className="text-pink-300 font-semibold mb-1 text-[11px]">
                  Limited daily slots
                </div>
                <p className="text-[11px] text-gray-300">
                  First-come, first-served on high-demand nights.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Sticky bottom CTA */}
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById("outlet-directory");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-xl w-full px-4 pb-4"
        style={{ pointerEvents: "none" }}
      >
        <div className="pointer-events-auto rounded-full bg-amber-500 text-black shadow-lg shadow-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-left">
          <div className="flex flex-col">
            <span className="text-xs font-semibold">
              Find a venue &amp; unlock offers
            </span>
            <span className="text-[10px] font-medium text-black/70">
              {CTA_ROTATING_MESSAGES[ctaIndex]}
            </span>
          </div>
          <span className="text-xs font-semibold flex items-center gap-1">
            Browse
            <svg
              className="w-3 h-3"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 5L16 12L9 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>
    </div>
  );
}
