"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { getHomepageConnectBrands } from "@/lib/brands";

// Homepage venue configuration with logo paths
// TODO: Update logo paths here if filenames change
type HomepageVenue = {
  id: string;
  name: string;
  logoSrc: string;
  tagline?: string;
};

const HOMEPAGE_VENUES: HomepageVenue[] = [
  {
    id: "alehouse",
    name: "Alehouse",
    logoSrc: "/ALEHOUSE CLUB LOGO copy.ai.png",
    tagline: undefined,
  },
  {
    id: "c53",
    name: "C53",
    logoSrc: "/C53 LOGO.png",
    tagline: undefined,
  },
  {
    id: "boiler-room",
    name: "Boiler Room",
    logoSrc: "/BOILER ROOM - LOGO.png",
    tagline: undefined,
  },
  {
    id: "skyhy",
    name: "SkyHy",
    logoSrc: "/SKYHY LOGO.png",
    tagline: undefined,
  },
  {
    id: "kiik69",
    name: "KIIK 69",
    logoSrc: "/kiik logo.png",
    tagline: undefined,
  },
  {
    id: "club-rogue",
    name: "Club Rogue",
    logoSrc: "/CLUB rogue logo all inone.png",
    tagline: "Gachibowli • Kondapur • Jubilee Hills",
  },
];

// Extract location name from Instagram URL
// e.g., "clubrogue.gachibowli" -> "Gachibowli"
const getLocationFromInstagramUrl = (url: string): string => {
  const match = url.match(/instagram\.com\/([^/]+)\//);
  if (!match) return "Instagram";
  const username = match[1];
  if (username.includes("gachibowli")) return "Gachibowli";
  if (username.includes("kondapur")) return "Kondapur";
  if (username.includes("jubileehills")) return "Jubilee Hills";
  return "Instagram";
};

export default function Home() {
  const router = useRouter();
  const connectBrands = getHomepageConnectBrands();

  const handlePrimaryCTA = () => {
    router.push("/reservations");
  };

  const handleInstagramClick = (url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleWebsiteClick = (url: string) => {
    if (!url || url === "#" || url.startsWith("https://example.com")) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#050509]">
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8 md:py-12">
        <div className="w-full max-w-4xl mx-auto space-y-8 md:space-y-10 text-center">
          {/* Top praise section */}
          <section className="space-y-4 md:space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] md:text-xs text-gray-200 border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.7)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="uppercase tracking-[0.18em] text-[9px] md:text-[10px] text-gray-300">
                Bassik Hospitality
              </span>
            </div>

            <div className="space-y-3 md:space-y-4">
              {/* TODO: Update main heading here */}
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white">
                8 Venues. One Command Point.
              </h1>

              {/* TODO: Update subheading here */}
              <div className="space-y-2 text-xs md:text-sm text-gray-300 leading-relaxed max-w-2xl mx-auto">
                <p>
                  Alehouse, C53, Boiler Room, SkyHy, KIIK 69 &amp; Club Rogue
                  – Hyderabad&apos;s nights, curated under one hospitality
                  group.
                </p>
                <p>
                  From world cuisine to rooftop nights and live sports, explore
                  our menus and book your table in one simple flow.
                </p>
              </div>
            </div>
          </section>

          {/* Logo strip */}
          <section className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {HOMEPAGE_VENUES.map((venue) => (
              <div
                key={venue.id}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:px-6 md:py-5 shadow-[0_18px_45px_rgba(0,0,0,0.8)] hover:border-white/30 hover:bg-white/10 transition-all duration-200"
              >
                <div className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center">
                  <Image
                    src={venue.logoSrc}
                    alt={`${venue.name} logo`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 80px, 96px"
                    priority={venue.id === "alehouse" || venue.id === "club-rogue"}
                    loading={venue.id === "alehouse" || venue.id === "club-rogue" ? "eager" : "lazy"}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] md:text-xs font-medium text-gray-100">
                    {venue.name}
                    {venue.tagline && (
                      <span className="block mt-0.5 text-[9px] text-gray-400">
                        ({venue.tagline})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </section>

          {/* Single main CTA */}
          <section className="space-y-4">
            <button
              type="button"
              onClick={handlePrimaryCTA}
              className="inline-flex items-center justify-center w-full sm:w-auto rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_rgba(0,0,0,0.9)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.95)] hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <span>Book a Table</span>
              <span className="ml-2 text-base">→</span>
            </button>

            {/* Supportive text */}
            <p className="text-[10px] md:text-xs text-gray-400 max-w-xl mx-auto">
              You can reserve for any venue with one quick form on the next
              page.
            </p>
          </section>

          {/* Connect with our venues section */}
          <section className="space-y-4 md:space-y-5 text-left">
            <div className="text-center space-y-1">
              <h2 className="text-base md:text-lg font-semibold text-white">
                Connect with our venues.
              </h2>
              <p className="text-[11px] md:text-xs text-gray-400">
                Find us on Instagram or visit the official websites.
              </p>
            </div>

            <div className="space-y-2.5 md:space-y-3">
              {connectBrands.map((brand) => {
                const isClubRogue = brand.id === "club-rogue";
                const locations = (brand as any).locations || [];

                return (
                  <div
                    key={brand.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white/5 backdrop-blur border border-white/5 px-4 py-3 md:px-5 md:py-4 shadow-[0_16px_40px_rgba(0,0,0,0.8)] hover:border-white/10 transition-all duration-200"
                  >
                    {/* Brand name */}
                    <div className="flex-shrink-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-100">
                        {brand.shortName}
                        {isClubRogue && (
                          <span className="block mt-0.5 text-[10px] md:text-xs font-normal text-gray-400">
                            ({locations.join(" · ")})
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Buttons group */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Instagram button(s) */}
                      {brand.instagramUrls.length === 1 ? (
                        <button
                          type="button"
                          onClick={() => handleInstagramClick(brand.instagramUrls[0])}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 px-3.5 py-2 text-[11px] md:text-xs font-medium text-gray-100 hover:border-pink-500/50 hover:bg-pink-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                        >
                          <span>📷</span>
                          <span>Instagram</span>
                          <span>→</span>
                        </button>
                      ) : (
                        // Multiple Instagram buttons (Club Rogue)
                        <div className="flex flex-wrap gap-2">
                          {brand.instagramUrls.map((url, idx) => {
                            const location = getLocationFromInstagramUrl(url);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleInstagramClick(url)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 px-3 py-1.5 text-[10px] md:text-xs font-medium text-gray-100 hover:border-pink-500/50 hover:bg-pink-500/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                              >
                                <span>📷</span>
                                <span>{location}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Website button */}
                      {brand.websiteUrl &&
                        brand.websiteUrl !== "#" &&
                        !brand.websiteUrl.startsWith("https://example.com") && (
                          <button
                            type="button"
                            onClick={() => handleWebsiteClick(brand.websiteUrl)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 text-[11px] md:text-xs font-medium text-gray-100 hover:bg-white/10 hover:border-white/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30"
                          >
                            <span>Website</span>
                            <span>→</span>
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/*
 * QUICK REFERENCE FOR CUSTOMIZATION:
 *
 * 1. COPY CHANGES:
 *    - Main heading (H1): Line ~82
 *    - Subheading paragraphs: Lines ~87-96
 *    - Supportive text below CTA: Line ~154
 *    - "Connect" section title: Line ~163
 *    - "Connect" section subtitle: Line ~166
 *
 * 2. LOGO PATHS:
 *    - Update HOMEPAGE_VENUES array (lines ~16-53)
 *    - Each venue has a `logoSrc` field pointing to /public folder
 *    - Note: Alehouse logo path is currently placeholder - add logo file and update path
 *
 * 3. CTA BUTTON:
 *    - Primary button text: Line ~144
 *    - Button action: handlePrimaryCTA() function
 *
 * 4. BRAND CONFIG:
 *    - Instagram URLs: lib/brands.ts (instagramUrls array)
 *    - Website URLs: lib/brands.ts (websiteUrl field)
 *    - TODO comments mark placeholder website URLs that need real links
 *
 * 5. STYLING:
 *    - All Tailwind classes are in the JSX
 *    - Primary button uses Alehouse gold gradient (from-amber-300 via-amber-400 to-amber-500)
 *    - Instagram buttons use pink/purple gradient
 *    - Website buttons use outline/ghost style
 */
