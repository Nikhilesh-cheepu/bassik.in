"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BRANDS } from "@/lib/brands";

interface OutletData {
  brandId: string;
  coverImage: string | null;
  loading: boolean;
}

// Location mapping - Updated per requirements
const LOCATION_MAP: Record<string, string[]> = {
  "Kondapur": ["alehouse", "c53", "boiler-room", "firefly", "rejoy"],
  "Gachibowli": ["kiik69", "skyhy", "club-rogue-gachibowli"],
  "Jubilee Hills": ["club-rogue-jubilee-hills"],
};

// Mood/Occasion mapping
const MOOD_MAP: Record<string, { icon: string; brands: string[] }> = {
  "Party Night": { icon: "🍾", brands: ["club-rogue-gachibowli", "club-rogue-kondapur", "club-rogue-jubilee-hills", "rejoy", "firefly", "sound-of-soul"] },
  "Romantic Dinner": { icon: "❤️", brands: ["c53", "alehouse"] },
  "Chill & Drinks": { icon: "🍺", brands: ["boiler-room", "skyhy", "alehouse"] },
  "Live Music / DJ": { icon: "🎧", brands: ["skyhy", "sound-of-soul", "rejoy"] },
  "Birthday / Celebration": { icon: "🎂", brands: ["club-rogue-gachibowli", "club-rogue-kondapur", "club-rogue-jubilee-hills", "rejoy", "firefly", "sound-of-soul", "kiik69"] },
};

// Venue Type mapping
const VENUE_TYPE_MAP: Record<string, string[]> = {
  "Club": ["club-rogue-gachibowli", "club-rogue-kondapur", "club-rogue-jubilee-hills", "rejoy", "firefly", "sound-of-soul"],
  "Sports Bar": ["kiik69"],
  "Rooftop": ["skyhy"],
  "Fine Dining": ["c53", "alehouse"],
  "Casual Bar": ["boiler-room"],
  "Lounge": ["alehouse"],
};

// Get venue type for a brand
const getVenueType = (brandId: string): string => {
  for (const [type, brands] of Object.entries(VENUE_TYPE_MAP)) {
    if (brands.includes(brandId)) {
      return type;
    }
  }
  return "Venue";
};

function LandingContent() {
  const router = useRouter();
  const [outletsData, setOutletsData] = useState<OutletData[]>(
    BRANDS.map((brand) => ({
      brandId: brand.id,
      coverImage: null,
      loading: true,
    }))
  );
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const outletsRef = useRef<HTMLDivElement>(null);

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
      setIsInitialLoad(false);
    };

    fetchAllCovers();
  }, []);

  // Filter outlets based on selected filters
  const getFilteredBrands = () => {
    let filtered = [...BRANDS];

    if (selectedLocation) {
      const locationBrands = LOCATION_MAP[selectedLocation] || [];
      filtered = filtered.filter(b => locationBrands.includes(b.id));
    }

    if (selectedMood) {
      const moodBrands = MOOD_MAP[selectedMood]?.brands || [];
      filtered = filtered.filter(b => moodBrands.includes(b.id));
    }

    return filtered;
  };

  const filteredBrands = getFilteredBrands();
  const hasActiveFilters = selectedLocation || selectedMood;

  const handleOutletClick = (brandId: string) => {
    router.push(`/${brandId}`);
  };

  const scrollToOutlets = () => {
    outletsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearFilters = () => {
    setSelectedLocation(null);
    setSelectedMood(null);
  };

  const getLogoPath = (brandId: string) => {
    return brandId.startsWith('club-rogue') 
      ? '/logos/club-rogue.png' 
      : `/logos/${brandId}.png`;
  };

  // Show loader only on initial load if data is still loading
  if (isInitialLoad && outletsData.some(d => d.loading)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="relative w-16 h-16 mx-auto mb-4">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-orange-500/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-gray-400 text-sm">Loading venues...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-purple-900/20 to-pink-900/20"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 sm:pt-20 sm:pb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 tracking-tight">
              <span className="block">YOU NAME IT,</span>
              <span className="block bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                WE HAVE IT
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto mb-6">
              Discover the finest dining and nightlife experiences across Hyderabad
            </p>
            
            {/* Quick discovery actions */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <motion.button
                onClick={scrollToOutlets}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-all"
              >
                Explore Venues
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-6">
        {/* Location Filter */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {Object.keys(LOCATION_MAP).map((location) => (
              <motion.button
                key={location}
                onClick={() => {
                  setSelectedLocation(selectedLocation === location ? null : location);
                  setSelectedMood(null);
                  setTimeout(scrollToOutlets, 100);
                }}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 px-5 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300 ${
                  selectedLocation === location
                    ? 'bg-white/20 border-white/40 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                }`}
                style={
                  selectedLocation === location
                    ? { boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)' }
                    : {}
                }
              >
                <span className="text-sm font-medium whitespace-nowrap">{location}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Mood Filter */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {Object.entries(MOOD_MAP).map(([mood, { icon }]) => (
              <motion.button
                key={mood}
                onClick={() => {
                  setSelectedMood(selectedMood === mood ? null : mood);
                  setSelectedLocation(null);
                  setTimeout(scrollToOutlets, 100);
                }}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300 flex items-center gap-2 ${
                  selectedMood === mood
                    ? 'bg-white/20 border-white/40 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                }`}
                style={
                  selectedMood === mood
                    ? { boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)' }
                    : {}
                }
              >
                <span className="text-base">{icon}</span>
                <span className="text-sm font-medium whitespace-nowrap">{mood}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Active Filters Clear */}
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 py-2 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="text-xs text-gray-400">
              {filteredBrands.length} venue{filteredBrands.length !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-white transition-colors underline"
            >
              Clear filters
            </button>
          </motion.div>
        )}
      </div>

      {/* Compact Outlet Grid */}
      <div ref={outletsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedLocation || selectedMood || 'all'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {filteredBrands.map((brand, index) => {
              const outletData = outletsData.find((o) => o.brandId === brand.id);
              const coverImage = outletData?.coverImage;
              const logoPath = getLogoPath(brand.id);
              const venueType = getVenueType(brand.id);

              return (
                <motion.button
                  key={brand.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  onClick={() => handleOutletClick(brand.id)}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative aspect-[4/5] rounded-xl overflow-hidden backdrop-blur-md border border-white/10 hover:border-white/20 transition-all duration-300"
                  style={{
                    boxShadow: `0 4px 20px ${brand.accentColor}10`,
                  }}
                >
                  {/* Cover Image or Gradient */}
                  {coverImage ? (
                    <>
                      <Image
                        src={coverImage}
                        alt={brand.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-110 brightness-100"
                        unoptimized
                        loading="lazy"
                        quality={75}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div 
                      className="absolute inset-0 bg-gradient-to-br"
                      style={{
                        background: `linear-gradient(135deg, ${brand.accentColor}60, ${brand.accentColor}90)`,
                      }}
                    />
                  )}

                  {/* Logo */}
                  <div className="absolute top-2 left-2 z-10">
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 p-1.5">
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
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <div className="flex items-start justify-between mb-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-lg leading-tight">
                        {brand.shortName}
                      </h3>
                    </div>
                    
                    {/* Type Tag */}
                    <div 
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white mb-2 backdrop-blur-sm"
                      style={{ backgroundColor: `${brand.accentColor}80` }}
                    >
                      {venueType}
                    </div>

                    {/* Accent Line */}
                    <div 
                      className="h-0.5 w-8 rounded-full"
                      style={{ backgroundColor: brand.accentColor }}
                    />
                  </div>

                  {/* Hover Glow */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 60px ${brand.accentColor}30`,
                    }}
                  />
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {filteredBrands.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No venues found. Try different filters.</p>
          </div>
        )}
      </div>

      {/* Compact Footer */}
      <div className="border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Bassik.in
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
