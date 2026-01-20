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

export default function HomeTrail({ venues = BRANDS }: HomeTrailProps) {
  const router = useRouter();
  const [venuesData, setVenuesData] = useState<VenueData[]>(
    venues.map((brand) => ({
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
      for (let i = 0; i < venues.length; i += batchSize) {
        const batch = venues.slice(i, i + batchSize);
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
        if (i + batchSize < venues.length) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    };

    fetchCovers();
  }, [venues]);

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-8 sm:pb-12 text-center">
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

        {/* Venues List */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
          <div className="space-y-6 sm:space-y-8">
            {venues.map((brand, index) => {
              const venueData = venuesData.find((v) => v.brandId === brand.id);
              const coverImage = venueData?.coverImage;
              const logoPath = getLogoPath(brand.id);

              return (
                <motion.div
                  key={brand.id}
                  ref={(el) => {
                    venueRefs.current[index] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Cover Image / Logo */}
                  <motion.button
                    onClick={() => handleExplore(brand.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-[240px] sm:w-[260px] h-[120px] sm:h-[140px] rounded-lg overflow-hidden mb-3 group"
                    style={{
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={brand.shortName}
                        fill
                        sizes="(max-width: 640px) 240px, 260px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        loading={index < 4 ? "eager" : "lazy"}
                        quality={80}
                        unoptimized
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${brand.accentColor}30, ${brand.accentColor}50)`,
                        }}
                      >
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14">
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
                  </motion.button>

                  {/* Venue Name */}
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                    {brand.shortName}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-400 mb-3 max-w-[280px] mx-auto truncate">
                    {brand.description || "Premium dining & nightlife experience"}
                  </p>

                  {/* CTA */}
                  <motion.button
                    onClick={() => handleExplore(brand.id)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs sm:text-sm font-medium text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors"
                    style={{
                      color: brand.accentColor + 'CC',
                    }}
                  >
                    Explore
                    <svg
                      className="w-3.5 h-3.5"
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
