"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { BRANDS } from "@/lib/brands";

interface OutletData {
  brandId: string;
  coverImage: string | null;
  loading: boolean;
}

function LandingContent() {
  const router = useRouter();
  const [outletsData, setOutletsData] = useState<OutletData[]>(
    BRANDS.map((brand) => ({
      brandId: brand.id,
      coverImage: null,
      loading: true,
    }))
  );

  // Fetch cover images for all outlets
  useEffect(() => {
    const fetchAllCovers = async () => {
      const promises = BRANDS.map(async (brand) => {
        try {
          const res = await fetch(`/api/venues/${brand.id}`, {
            cache: 'no-store',
          });
          if (res.ok) {
            const data = await res.json();
            const coverImages = data.venue?.coverImages || [];
            return {
              brandId: brand.id,
              coverImage: coverImages.length > 0 ? coverImages[0] : null,
              loading: false,
            };
          }
          return {
            brandId: brand.id,
            coverImage: null,
            loading: false,
          };
        } catch (error) {
          console.error(`Error fetching cover for ${brand.id}:`, error);
          return {
            brandId: brand.id,
            coverImage: null,
            loading: false,
          };
        }
      });

      const results = await Promise.all(promises);
      setOutletsData(results);
    };

    fetchAllCovers();
  }, []);

  const handleOutletClick = (brandId: string) => {
    router.push(`/${brandId}`);
  };

  // Use club-rogue.png for all Club Rogue variants
  const getLogoPath = (brandId: string) => {
    return brandId.startsWith('club-rogue') 
      ? '/logos/club-rogue.png' 
      : `/logos/${brandId}.png`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-pink-500/20 animate-pulse" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-32 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              <span className="block">You Name It,</span>
              <span className="block bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                We Have It
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
              Discover the finest dining and nightlife experiences across Hyderabad
            </p>
          </motion.div>
        </div>
      </div>

      {/* Outlets Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {BRANDS.map((brand, index) => {
            const outletData = outletsData.find((o) => o.brandId === brand.id);
            const coverImage = outletData?.coverImage;
            const isLoading = outletData?.loading ?? true;
            const logoPath = getLogoPath(brand.id);

            return (
              <motion.button
                key={brand.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onClick={() => handleOutletClick(brand.id)}
                className="group relative h-[400px] sm:h-[450px] rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]"
                style={{
                  boxShadow: `0 20px 60px ${brand.accentColor}30`,
                }}
              >
                {/* Cover Image or Gradient Background */}
                {isLoading ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white/60"></div>
                    </div>
                  </div>
                ) : coverImage ? (
                  <div className="absolute inset-0">
                    <Image
                      src={coverImage}
                      alt={brand.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110 brightness-100"
                      unoptimized
                      loading="lazy"
                      quality={80}
                    />
                    {/* Subtle gradient overlay only at bottom for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent group-hover:from-black/70 transition-all duration-500" />
                  </div>
                ) : (
                  <div 
                    className="absolute inset-0 bg-gradient-to-br"
                    style={{
                      background: `linear-gradient(135deg, ${brand.accentColor}60, ${brand.accentColor}90)`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                )}

                {/* Logo */}
                <div className="absolute top-6 left-6 z-10">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-2 group-hover:scale-110 transition-transform duration-300">
                    <Image
                      src={logoPath}
                      alt={brand.shortName}
                      fill
                      className="object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] group-hover:text-white transition-colors">
                      {brand.shortName}
                    </h2>
                    <motion.div
                      className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30"
                      whileHover={{ scale: 1.1, rotate: 45 }}
                      transition={{ duration: 0.3 }}
                      style={{ backgroundColor: `${brand.accentColor}40` }}
                    >
                      <svg
                        className="w-5 h-5 text-white"
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
                    </motion.div>
                  </div>
                  
                  {/* Accent Line */}
                  <div 
                    className="h-1 w-20 rounded-full mb-4 group-hover:w-32 transition-all duration-500"
                    style={{ backgroundColor: brand.accentColor }}
                  />

                  <p className="text-sm sm:text-base text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-white transition-colors">
                    {brand.name}
                  </p>
                </div>

                {/* Hover Glow Effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 100px ${brand.accentColor}20`,
                  }}
                />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Bassik.in - All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
