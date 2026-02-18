"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BRANDS, Brand } from "@/lib/brands";

interface VenueData {
  brandId: string;
  coverImage: string | null;
  loading: boolean;
}

interface HomeTrailProps {
  venues?: Brand[];
}

// Specific ordering as requested
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

export default function HomeTrail({ venues = BRANDS }: HomeTrailProps) {
  // Order venues according to specified order
  const orderedVenues = [...venues].sort((a, b) => {
    const indexA = VENUE_ORDER.indexOf(a.id);
    const indexB = VENUE_ORDER.indexOf(b.id);
    // If not in order list, put at end
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const [venuesData, setVenuesData] = useState<VenueData[]>(
    orderedVenues.map((brand) => ({
      brandId: brand.id,
      coverImage: null,
      loading: true,
    }))
  );
  const venueRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Defer cover image fetches so the grid paints first (feels fast), then load images
  useEffect(() => {
    const fetchCovers = async (brandsToLoad: Brand[]) => {
      const promises = brandsToLoad.map(async (brand) => {
        try {
          const res = await fetch(`/api/venues/${brand.id}`, {
            cache: "force-cache",
          });
          if (res.ok) {
            const data = await res.json();
            const offers = data.venue?.offers || [];
            const gallery = data.venue?.galleryImages || [];
            const coverImage =
              offers.length > 0 ? offers[0].imageUrl : gallery.length > 0 ? gallery[0] : null;
            return {
              brandId: brand.id,
              coverImage: typeof coverImage === "string" ? coverImage : null,
              loading: false,
            };
          }
          return { brandId: brand.id, coverImage: null, loading: false };
        } catch {
          return { brandId: brand.id, coverImage: null, loading: false };
        }
      });
      const results = await Promise.all(promises);
      setVenuesData((prev) =>
        prev.map((item) => {
          const r = results.find((x) => x.brandId === item.brandId);
          return r ? { ...item, ...r } : item;
        })
      );
    };

    // Let the grid render first (one frame), then load first 6 cover images
    const t0 = requestAnimationFrame(() => {
      const initialVenues = orderedVenues.slice(0, 6);
      fetchCovers(initialVenues);
    });

    let t1: ReturnType<typeof setTimeout> | null = null;
    if (orderedVenues.length > 6) {
      t1 = setTimeout(() => fetchCovers(orderedVenues.slice(6)), 800);
    }

    return () => {
      cancelAnimationFrame(t0);
      if (t1) clearTimeout(t1);
    };
  }, [orderedVenues]);

  const getLogoPath = (brand: Brand) => {
    return brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle looping gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0 opacity-35"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(236, 72, 153, 0.18) 0%, transparent 45%)',
              'radial-gradient(circle at 80% 50%, rgba(14, 165, 233, 0.16) 0%, transparent 45%)',
              'radial-gradient(circle at 50% 20%, rgba(244, 114, 182, 0.18) 0%, transparent 45%)',
              'radial-gradient(circle at 20% 50%, rgba(236, 72, 153, 0.18) 0%, transparent 45%)',
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute inset-0 opacity-25"
          animate={{
            background: [
              'radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.14) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 80%, rgba(94, 234, 212, 0.12) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.14) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero / Header */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm sm:text-base font-medium text-gray-400 mb-4"
          >
            Venues
          </motion.h1>
          
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight bg-gradient-to-r from-pink-400 via-amber-300 to-sky-300 bg-clip-text text-transparent"
          >
            YOU NAME IT, WE HAVE IT
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto"
          >
            Discover the finest dining & nightlife experiences across Hyderabad
          </motion.p>
        </div>

        {/* Venues Grid - 3 columns */}
        <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-12">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {orderedVenues.map((brand, index) => {
              const venueData = venuesData.find((v) => v.brandId === brand.id);
              const coverImage = venueData?.coverImage;
              const logoPath = getLogoPath(brand);

              return (
                <motion.div
                  key={brand.id}
                  ref={(el) => {
                    venueRefs.current[index] = el;
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="flex flex-col items-center text-center"
                >
                  <Link
                    href={`/${brand.id}`}
                    prefetch={false}
                    className="flex flex-col items-center text-center w-full group/card"
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full rounded-xl sm:rounded-2xl overflow-hidden mb-2 relative backdrop-blur-sm border border-white/10 cursor-pointer"
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        boxShadow:
                          "0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      {/* Cover Image - Small */}
                      <div className="relative w-full aspect-[4/3]">
                        {coverImage ? (
                          <Image
                            src={coverImage}
                            alt={brand.shortName}
                            fill
                            sizes="(max-width: 640px) 33vw, 200px"
                            className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                            loading={index < 6 ? "eager" : "lazy"}
                            quality={75}
                            priority={index < 6}
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${brand.accentColor}30, ${brand.accentColor}50)`,
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/5 transition-colors" />
                      </div>

                      {/* Logo Chip */}
                      <div className="px-2 py-2 sm:py-2.5 flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-2 rounded-full bg-white/5 border border-white/10 px-2 py-1">
                          <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-black/40">
                            <Image
                              src={logoPath}
                              alt={brand.shortName}
                              fill
                              sizes="28px"
                              className="object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                          <span className="text-[11px] sm:text-xs font-medium text-white/90 line-clamp-1">
                            {brand.shortName}
                          </span>
                        </div>
                        {brand.description && (
                          <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1">
                            {brand.description
                              .split("•")[0]
                              ?.trim() || brand.description}
                          </p>
                        )}
                      </div>
                    </motion.div>

                    <span
                      className="text-[10px] sm:text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      style={{ color: brand.accentColor + "CC" }}
                    >
                      Explore
                      <svg
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
