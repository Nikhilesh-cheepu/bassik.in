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

// Location mapping
const LOCATION_MAP: Record<string, string[]> = {
  "Gachibowli": ["club-rogue-gachibowli", "kiik69"],
  "Kondapur": ["club-rogue-kondapur"],
  "Jubilee Hills": ["club-rogue-jubilee-hills"],
  "Hitech City": ["alehouse", "c53", "boiler-room"],
  "Madhapur": ["skyhy", "sound-of-soul", "rejoy", "firefly"],
};

// Mood/Occasion mapping
const MOOD_MAP: Record<string, string[]> = {
  "Party Night": ["club-rogue-gachibowli", "club-rogue-kondapur", "club-rogue-jubilee-hills", "rejoy", "firefly", "sound-of-soul"],
  "Romantic Dinner": ["c53", "alehouse"],
  "Chill & Drinks": ["boiler-room", "skyhy", "alehouse"],
  "Family Dining": ["c53"],
  "Birthday / Celebration": ["club-rogue-gachibowli", "club-rogue-kondapur", "club-rogue-jubilee-hills", "rejoy", "firefly", "sound-of-soul", "kiik69"],
  "Live Music / DJ": ["skyhy", "sound-of-soul", "rejoy"],
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
  const [selectedVenueType, setSelectedVenueType] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
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
    };

    fetchAllCovers();
  }, []);

  // Show quick actions on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowQuickActions(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter outlets based on selected filters
  const getFilteredBrands = () => {
    let filtered = [...BRANDS];

    if (selectedLocation) {
      const locationBrands = LOCATION_MAP[selectedLocation] || [];
      filtered = filtered.filter(b => locationBrands.includes(b.id));
    }

    if (selectedMood) {
      const moodBrands = MOOD_MAP[selectedMood] || [];
      filtered = filtered.filter(b => moodBrands.includes(b.id));
    }

    if (selectedVenueType) {
      const typeBrands = VENUE_TYPE_MAP[selectedVenueType] || [];
      filtered = filtered.filter(b => typeBrands.includes(b.id));
    }

    return filtered;
  };

  const filteredBrands = getFilteredBrands();
  const hasActiveFilters = selectedLocation || selectedMood || selectedVenueType;

  const handleOutletClick = (brandId: string) => {
    router.push(`/${brandId}`);
  };

  const scrollToOutlets = () => {
    outletsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearFilters = () => {
    setSelectedLocation(null);
    setSelectedMood(null);
    setSelectedVenueType(null);
  };

  const getLogoPath = (brandId: string) => {
    return brandId.startsWith('club-rogue') 
      ? '/logos/club-rogue.png' 
      : `/logos/${brandId}.png`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Compact Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-pink-500/10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 sm:pt-16 sm:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
              <span className="block">You Name It,</span>
              <span className="block bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                We Have It
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto">
              Discover the finest dining and nightlife experiences
            </p>
          </motion.div>
        </div>
      </div>

      {/* Smart Shortcut Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-8">
        {/* 1. Find by Location */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <span>📍</span> Near You
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {Object.keys(LOCATION_MAP).map((location) => (
              <motion.button
                key={location}
                onClick={() => {
                  setSelectedLocation(selectedLocation === location ? null : location);
                  setSelectedMood(null);
                  setSelectedVenueType(null);
                  setTimeout(scrollToOutlets, 100);
                }}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300 ${
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

        {/* 2. Find by Mood/Occasion */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <span>🍻</span> What's the plan tonight?
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.keys(MOOD_MAP).map((mood) => (
              <motion.button
                key={mood}
                onClick={() => {
                  setSelectedMood(selectedMood === mood ? null : mood);
                  setSelectedLocation(null);
                  setSelectedVenueType(null);
                  setTimeout(scrollToOutlets, 100);
                }}
                whileTap={{ scale: 0.95 }}
                className={`relative p-4 rounded-xl backdrop-blur-md border transition-all duration-300 text-left ${
                  selectedMood === mood
                    ? 'bg-white/15 border-white/30 text-white shadow-xl'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                }`}
                style={
                  selectedMood === mood
                    ? { boxShadow: '0 8px 32px rgba(255, 255, 255, 0.15)' }
                    : {}
                }
              >
                <p className="text-xs font-medium leading-tight">{mood}</p>
                {selectedMood === mood && (
                  <motion.div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* 3. Find by Venue Type */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <span>✨</span> Choose your vibe
          </h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {Object.keys(VENUE_TYPE_MAP).map((type) => (
              <motion.button
                key={type}
                onClick={() => {
                  setSelectedVenueType(selectedVenueType === type ? null : type);
                  setSelectedLocation(null);
                  setSelectedMood(null);
                  setTimeout(scrollToOutlets, 100);
                }}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300 ${
                  selectedVenueType === type
                    ? 'bg-white/20 border-white/40 text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                }`}
                style={
                  selectedVenueType === type
                    ? { boxShadow: '0 4px 20px rgba(255, 255, 255, 0.2)' }
                    : {}
                }
              >
                <span className="text-sm font-medium whitespace-nowrap">{type}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Active Filters Clear Button */}
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

      {/* Outlets Grid */}
      <div ref={outletsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Mobile: Horizontal Scroll */}
        <div className="sm:hidden">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
            {filteredBrands.map((brand, index) => {
              const outletData = outletsData.find((o) => o.brandId === brand.id);
              const coverImage = outletData?.coverImage;
              const isLoading = outletData?.loading ?? true;
              const logoPath = getLogoPath(brand.id);

              return (
                <motion.button
                  key={brand.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  onClick={() => handleOutletClick(brand.id)}
                  className="group relative flex-shrink-0 w-[280px] h-[320px] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300"
                  style={{
                    boxShadow: `0 10px 40px ${brand.accentColor}20`,
                  }}
                >
                  {isLoading ? (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
                  ) : coverImage ? (
                    <>
                      <Image
                        src={coverImage}
                        alt={brand.name}
                        fill
                        sizes="280px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110 brightness-100"
                        unoptimized
                        loading="lazy"
                        quality={80}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div 
                      className="absolute inset-0 bg-gradient-to-br"
                      style={{
                        background: `linear-gradient(135deg, ${brand.accentColor}60, ${brand.accentColor}90)`,
                      }}
                    />
                  )}

                  <div className="absolute top-4 left-4 z-10">
                    <div className="relative w-12 h-12 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 p-1.5">
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

                  <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    <h2 className="text-xl font-bold text-white drop-shadow-lg mb-1">
                      {brand.shortName}
                    </h2>
                    <div 
                      className="h-0.5 w-12 rounded-full mb-2"
                      style={{ backgroundColor: brand.accentColor }}
                    />
                    <p className="text-xs text-white/90 drop-shadow-md">
                      {brand.name}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Desktop: Compact Grid */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBrands.map((brand, index) => {
            const outletData = outletsData.find((o) => o.brandId === brand.id);
            const coverImage = outletData?.coverImage;
            const isLoading = outletData?.loading ?? true;
            const logoPath = getLogoPath(brand.id);

            return (
              <motion.button
                key={brand.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                onClick={() => handleOutletClick(brand.id)}
                className="group relative h-[280px] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                style={{
                  boxShadow: `0 10px 40px ${brand.accentColor}20`,
                }}
              >
                {isLoading ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
                ) : coverImage ? (
                  <>
                    <Image
                      src={coverImage}
                      alt={brand.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110 brightness-100"
                      unoptimized
                      loading="lazy"
                      quality={80}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-500" />
                  </>
                ) : (
                  <div 
                    className="absolute inset-0 bg-gradient-to-br"
                    style={{
                      background: `linear-gradient(135deg, ${brand.accentColor}60, ${brand.accentColor}90)`,
                    }}
                  />
                )}

                <div className="absolute top-4 left-4 z-10">
                  <div className="relative w-12 h-12 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 p-1.5 group-hover:scale-110 transition-transform duration-300">
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

                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-white drop-shadow-lg">
                      {brand.shortName}
                    </h2>
                    <motion.div
                      className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/30"
                      whileHover={{ scale: 1.1, rotate: 45 }}
                      transition={{ duration: 0.3 }}
                      style={{ backgroundColor: `${brand.accentColor}40` }}
                    >
                      <svg
                        className="w-4 h-4 text-white"
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
                  
                  <div 
                    className="h-0.5 w-12 rounded-full mb-2 group-hover:w-16 transition-all duration-500"
                    style={{ backgroundColor: brand.accentColor }}
                  />

                  <p className="text-xs text-white/90 drop-shadow-md">
                    {brand.name}
                  </p>
                </div>

                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 80px ${brand.accentColor}20`,
                  }}
                />
              </motion.button>
            );
          })}
        </div>

        {filteredBrands.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No venues found. Try different filters.</p>
          </div>
        )}
      </div>

      {/* Quick Action Shortcuts - Sticky */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]"
          >
            <div className="flex gap-2 p-2 rounded-2xl backdrop-blur-xl bg-black/80 border border-white/20 shadow-2xl">
              <motion.button
                onClick={scrollToOutlets}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
              >
                View All
              </motion.button>
              <motion.button
                onClick={() => router.push(`/${BRANDS[0].id}/reservations`)}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-3 py-2 text-xs font-medium text-white rounded-xl transition-colors"
                style={{ backgroundColor: BRANDS[0].accentColor }}
              >
                Book Table
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
