"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  "alehouse",
  "boiler-room",
  "c53",
  "kiik69",
  "skyhy",
  "club-rogue-gachibowli",
  "club-rogue-kondapur",
  "club-rogue-jubilee-hills",
  "sound-of-soul",
  "rejoy",
  "firefly",
];

export default function HomeTrail({ venues = BRANDS }: HomeTrailProps) {
  const router = useRouter();
  
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

  // Fetch cover images in background
  useEffect(() => {
    const fetchCovers = async () => {
      const batchSize = 3;
      for (let i = 0; i < orderedVenues.length; i += batchSize) {
        const batch = orderedVenues.slice(i, i + batchSize);
        const promises = batch.map(async (brand) => {
          try {
            const res = await fetch(`/api/venues/${brand.id}`, {
              cache: 'force-cache',
            });
            if (res.ok) {
              const data = await res.json();
              const coverImages = data.venue?.coverImages || [];
              setVenuesData(prev =>
                prev.map(item =>
                  item.brandId === brand.id
                    ? {
                        ...item,
                        coverImage: coverImages.length > 0 ? coverImages[0] : null,
                        loading: false,
                      }
                    : item
                )
              );
            } else {
              setVenuesData(prev =>
                prev.map(item =>
                  item.brandId === brand.id ? { ...item, loading: false } : item
                )
              );
            }
          } catch (error) {
            setVenuesData(prev =>
              prev.map(item =>
                item.brandId === brand.id ? { ...item, loading: false } : item
              )
            );
          }
        });
        await Promise.all(promises);
        if (i + batchSize < orderedVenues.length) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    };

    fetchCovers();
  }, [orderedVenues]);

  const handleExplore = (brandId: string) => {
    router.push(`/${brandId}`);
  };

  const getLogoPath = (brandId: string) => {
    return brandId.startsWith('club-rogue')
      ? '/logos/club-rogue.png'
      : `/logos/${brandId}.png`;
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle looping gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 20%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              'radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
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
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
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
              const logoPath = getLogoPath(brand.id);

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
                  {/* Card Container */}
                  <motion.button
                    onClick={() => handleExplore(brand.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-xl sm:rounded-2xl overflow-hidden mb-2 group relative backdrop-blur-sm border border-white/10"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
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
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          loading={index < 6 ? "eager" : "lazy"}
                          quality={75}
                          unoptimized
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${brand.accentColor}30, ${brand.accentColor}50)`,
                          }}
                        >
                          <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                            <Image
                              src={logoPath}
                              alt={brand.shortName}
                              fill
                              className="object-contain opacity-70"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {/* Subtle overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </div>

                    {/* Venue Name - Small */}
                    <div className="px-2 py-2 sm:py-2.5">
                      <h3 className="text-xs sm:text-sm font-semibold text-white mb-1 line-clamp-1">
                        {brand.shortName}
                      </h3>
                      
                      {/* Optional: Super short description (truncated aggressively) */}
                      {brand.description && (
                        <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1">
                          {brand.description.split('•')[0]?.trim() || brand.description}
                        </p>
                      )}
                    </div>
                  </motion.button>

                  {/* CTA - Small */}
                  <motion.button
                    onClick={() => handleExplore(brand.id)}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-[10px] sm:text-xs font-medium flex items-center gap-1 transition-colors"
                    style={{
                      color: brand.accentColor + 'CC',
                    }}
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
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
