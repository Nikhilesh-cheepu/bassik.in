"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getHomepageConnectBrands } from "@/lib/brands";

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
    id: "club-rogue-gachibowli",
    name: "Club Rogue",
    logoSrc: "/CLUB rogue logo all inone.png",
    tagline: "Gachibowli",
  },
  {
    id: "club-rogue-kondapur",
    name: "Club Rogue",
    logoSrc: "/CLUB rogue logo all inone.png",
    tagline: "Kondapur",
  },
  {
    id: "club-rogue-jubilee-hills",
    name: "Club Rogue",
    logoSrc: "/CLUB rogue logo all inone.png",
    tagline: "Jubilee Hills",
  },
];

export default function Home() {
  const router = useRouter();
  const connectBrands = getHomepageConnectBrands();

  const handlePrimaryCTA = () => {
    router.push("/reservations");
  };

  const handleInstagramClick = (url: string) => {
    if (!url) return;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleWebsiteClick = (url: string) => {
    if (!url || url === "#" || url.startsWith("https://example.com")) return;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ 
        backgroundColor: "#050509",
        minHeight: "100vh",
      }}
    >
      <Navbar />
      <main 
        className="flex flex-col items-center justify-center px-4 py-8 md:py-12"
        style={{
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div className="w-full max-w-4xl mx-auto space-y-8 md:space-y-10 text-center">
          <section className="space-y-4 md:space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] md:text-xs text-gray-200 border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="uppercase tracking-[0.18em] text-[9px] md:text-[10px] text-gray-300">
                Bassik Hospitality
              </span>
            </div>

            <div className="space-y-3 md:space-y-4">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white">
                8 Venues. One Command Point.
              </h1>

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

          <section className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {HOMEPAGE_VENUES.map((venue) => (
              <div
                key={venue.id}
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:px-6 md:py-5"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center">
                  <img
                    src={venue.logoSrc}
                    alt={`${venue.name} logo`}
                    className="max-w-full max-h-full object-contain"
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

          <section className="space-y-4">
            <button
              type="button"
              onClick={handlePrimaryCTA}
              className="inline-flex items-center justify-center w-full sm:w-auto rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-8 py-3.5 text-sm font-semibold text-slate-950"
            >
              <span>Book a Table</span>
              <span className="ml-2 text-base">→</span>
            </button>

            <p className="text-[10px] md:text-xs text-gray-400 max-w-xl mx-auto">
              You can reserve for any venue with one quick form on the next
              page.
            </p>
          </section>

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
                const isClubRogue = brand.id.startsWith("club-rogue");
                const locationMatch = brand.name.match(/–\s*(.+)$/);
                const location = locationMatch ? locationMatch[1] : null;

                return (
                  <div
                    key={brand.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white/5 border border-white/5 px-4 py-3 md:px-5 md:py-4"
                  >
                    <div className="flex-shrink-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-100">
                        {brand.shortName}
                        {isClubRogue && location && (
                          <span className="block mt-0.5 text-[10px] md:text-xs font-normal text-gray-400">
                            ({location})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {brand.instagramUrls.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleInstagramClick(brand.instagramUrls[0])}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3.5 py-2 text-[11px] md:text-xs font-medium text-gray-100"
                        >
                          <span>📷</span>
                          <span>Instagram</span>
                          <span>→</span>
                        </button>
                      )}

                      {brand.websiteUrl &&
                        brand.websiteUrl !== "#" &&
                        !brand.websiteUrl.startsWith("https://example.com") && (
                          <button
                            type="button"
                            onClick={() => handleWebsiteClick(brand.websiteUrl)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-2 text-[11px] md:text-xs font-medium text-gray-100"
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
