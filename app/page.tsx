"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import MenuModal from "@/components/MenuModal";
import GalleryModal from "@/components/GalleryModal";

function HomeContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Start with default brand - will be updated after mount to prevent hydration mismatch
  const [selectedBrandId, setSelectedBrandId] = useState<string>(BRANDS[0].id);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [venueData, setVenueData] = useState({
    coverImages: [] as string[],
    galleryImages: [] as string[],
    menus: [] as any[],
    location: { address: "", mapUrl: "" },
  });
  const [loading, setLoading] = useState(true);
  const [loadedGalleryImages, setLoadedGalleryImages] = useState<Set<number>>(new Set());
  const [failedGalleryImages, setFailedGalleryImages] = useState<Set<number>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const venueSwitcherRef = useRef<HTMLDivElement>(null);

  const selectedBrand = BRANDS.find((b) => b.id === selectedBrandId) || BRANDS[0];
  const coverImages = venueData.coverImages.slice(0, 3);

  // Set mounted and read URL params on client-side only to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Read from URL directly to avoid hydration issues with useSearchParams
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const brandFromUrl = urlParams.get("brand");
      if (brandFromUrl && BRANDS.find(b => b.id === brandFromUrl)) {
        setSelectedBrandId(brandFromUrl);
      }
    }
  }, []);

  // Load venue data when brand changes
  useEffect(() => {
    const loadVenueData = async () => {
      setLoading(true);
      setLoadedGalleryImages(new Set());
      setFailedGalleryImages(new Set());
      try {
        const res = await fetch(`/api/venues/${selectedBrandId}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setVenueData({
            coverImages: data.venue.coverImages || [],
            galleryImages: data.venue.galleryImages || [],
            menus: data.venue.menus || [],
            location: {
              address: data.venue.address || "",
              mapUrl: data.venue.mapUrl || "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6",
            },
          });
        } else {
          // Fallback to empty data
          setVenueData({
            coverImages: [],
            galleryImages: [],
            menus: [],
            location: {
              address: "",
              mapUrl: "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6",
            },
          });
        }
      } catch (error) {
        console.error("Error fetching venue data:", error);
        setVenueData({
          coverImages: [],
          galleryImages: [],
          menus: [],
          location: {
            address: "",
            mapUrl: "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6",
          },
        });
      } finally {
        setLoading(false);
      }
    };
    loadVenueData();
  }, [selectedBrandId]);

  // Handle image load success
  const handleImageLoad = (index: number) => {
    setLoadedGalleryImages(prev => new Set(prev).add(index));
  };

  // Handle image load error
  const handleImageError = (index: number) => {
    setFailedGalleryImages(prev => new Set(prev).add(index));
  };

  // Filter out failed images
  const validGalleryImages = venueData.galleryImages.filter((_, index) => !failedGalleryImages.has(index));

  // Auto-scroll cover images
  useEffect(() => {
    if (coverImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % coverImages.length);
      }, 5000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [coverImages.length, selectedBrandId]);

  const handleBookNow = () => {
    router.push(`/reservations?brand=${selectedBrandId}`);
  };

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    setCurrentImageIndex(0);
    // Scroll venue switcher to show selected brand
    if (venueSwitcherRef.current) {
      const selectedElement = venueSwitcherRef.current.querySelector(`[data-brand-id="${brandId}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Generate static map URL (using Google Static Maps API format)
  const getStaticMapUrl = (address: string) => {
    // For now, return a placeholder. In production, you'd use Google Static Maps API
    // Example: `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=15&size=400x200&markers=color:red|${encodeURIComponent(address)}&key=YOUR_API_KEY`
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/auto/400x200@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Premium Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,146,60,0.1),transparent_50%)] animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.08),transparent_50%)]" />
      </div>

      {/* Sticky Venue Switcher */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="px-4 py-3">
          <div 
            ref={venueSwitcherRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {BRANDS.map((brand) => {
              const isSelected = brand.id === selectedBrandId;
              const logoPath = `/logos/${brand.id}.png`;
              
              return (
                <motion.button
                  key={brand.id}
                  data-brand-id={brand.id}
                  onClick={() => handleBrandSelect(brand.id)}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 ${
                    isSelected
                      ? 'bg-white/20 backdrop-blur-md border-2 shadow-lg shadow-orange-500/30'
                      : 'bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10'
                  }`}
                  style={{
                    borderColor: isSelected ? `${brand.accentColor}80` : 'rgba(255,255,255,0.1)',
                    boxShadow: isSelected ? `0 0 20px ${brand.accentColor}40` : 'none',
                  }}
                >
                  <div className="relative w-6 h-6 flex-shrink-0">
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
                  <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {brand.shortName}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="relative z-10 pb-32">
        {/* Hero Cover Image */}
        <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : coverImages.length > 0 ? (
            <AnimatePresence mode="wait">
              {coverImages.map((image, index) => (
                index === currentImageIndex && (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={image}
                      alt={`${selectedBrand.shortName} cover ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                      priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/50">
              <svg className="w-16 h-16 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-400">Cover images are empty</p>
            </div>
          )}
          
          {/* Image indicators */}
          {coverImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {coverImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentImageIndex
                      ? "w-8 bg-white shadow-lg"
                      : "w-1.5 bg-white/50 hover:bg-white/70"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto px-4 -mt-6 space-y-4">
          {/* Menu Section - Compact Single Row Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-4 shadow-xl"
          >
            <h2 className="text-lg font-bold text-white mb-3">Menu</h2>
            {venueData.menus.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Menu section is empty</p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                {venueData.menus.map((menu) => (
                  <motion.button
                    key={menu.id}
                    onClick={() => {
                      setSelectedMenuId(menu.id);
                      setIsMenuModalOpen(true);
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-3 hover:bg-white/15 transition-all min-w-[200px]"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={menu.thumbnail}
                        alt={menu.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-white font-semibold text-sm mb-0.5 truncate">{menu.name}</h3>
                      <p className="text-gray-400 text-xs">{menu.images.length} pages</p>
                      <p className="text-orange-400 text-xs mt-1">Tap to open →</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.section>

          {/* Photos Section - Premium Masonry Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Photos</h2>
              {validGalleryImages.length > 6 && (
                <button
                  onClick={() => {
                    setGalleryStartIndex(0);
                    setIsGalleryModalOpen(true);
                  }}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium"
                >
                  View all →
                </button>
              )}
            </div>
            {validGalleryImages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Gallery is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {validGalleryImages.slice(0, 6).map((image, index) => {
                  const originalIndex = venueData.galleryImages.indexOf(image);
                  const isLoaded = loadedGalleryImages.has(originalIndex);
                  const hasFailed = failedGalleryImages.has(originalIndex);
                  
                  // Skip rendering if image has failed
                  if (hasFailed) return null;
                  
                  return (
                    <motion.button
                      key={`${originalIndex}-${image}`}
                      onClick={() => {
                        // Find the actual index in validGalleryImages for the modal
                        const validIndex = validGalleryImages.indexOf(image);
                        setGalleryStartIndex(validIndex);
                        setIsGalleryModalOpen(true);
                      }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative aspect-square overflow-hidden rounded-xl group ${
                        index === 0 ? "col-span-2 row-span-2" : ""
                      } ${!isLoaded ? "bg-gray-800/50" : ""}`}
                    >
                      {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                      )}
                      <Image
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        fill
                        className={`object-cover group-hover:scale-110 transition-transform duration-500 ${
                          isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        unoptimized
                        onLoad={() => handleImageLoad(originalIndex)}
                        onError={() => handleImageError(originalIndex)}
                      />
                      {isLoaded && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      )}
                    </motion.button>
                  );
                })}
                {validGalleryImages.length > 6 && (
                  <motion.button
                    onClick={() => {
                      setGalleryStartIndex(6);
                      setIsGalleryModalOpen(true);
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="relative aspect-square overflow-hidden rounded-xl bg-black/40 border-2 border-dashed border-white/30 flex items-center justify-center group hover:bg-black/60 transition-colors"
                  >
                    <div className="text-center">
                      <p className="text-white font-bold text-lg">+{validGalleryImages.length - 6}</p>
                      <p className="text-white/70 text-xs mt-1">More</p>
                    </div>
                  </motion.button>
                )}
              </div>
            )}
          </motion.section>

          {/* Location Section - Compact Map Preview */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-4 shadow-xl overflow-hidden"
          >
            <h2 className="text-lg font-bold text-white mb-3">Location</h2>
            <a
              href={venueData.location.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="relative h-40 rounded-xl overflow-hidden bg-gray-800 border border-white/10 mb-3">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-orange-400 group-hover:text-orange-300 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium mb-1 truncate">{venueData.location.address || "Address not available"}</p>
                  <p className="text-orange-400 text-xs font-medium group-hover:text-orange-300 transition-colors">
                    Open in Google Maps →
                  </p>
                </div>
              </div>
            </a>
          </motion.section>
        </div>
      </main>

      {/* Premium Sticky Bottom Dock - Book CTA */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl bg-black/60 border-t border-white/10 p-4 shadow-2xl"
      >
        <button
          onClick={handleBookNow}
          className="w-full text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transform relative overflow-hidden group"
          style={{ 
            backgroundColor: selectedBrand.accentColor,
            boxShadow: `0 10px 40px ${selectedBrand.accentColor}50`
          }}
        >
          {/* Shine animation effect */}
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
          
          {/* Button content */}
          <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
            <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Book a table
          </span>
        </button>
      </motion.div>

      {/* Menu Modal */}
      {isMenuModalOpen && selectedMenuId && (
        <MenuModal
          menu={venueData.menus.find(m => m.id === selectedMenuId)!}
          brandName={selectedBrand.shortName}
          onClose={() => {
            setIsMenuModalOpen(false);
            setSelectedMenuId(null);
          }}
        />
      )}

      {/* Gallery Modal */}
      {isGalleryModalOpen && (
        <GalleryModal
          images={validGalleryImages}
          brandName={selectedBrand.shortName}
          initialIndex={galleryStartIndex}
          onClose={() => setIsGalleryModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
