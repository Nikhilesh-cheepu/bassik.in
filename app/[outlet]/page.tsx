"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import MenuModal from "@/components/MenuModal";
import GalleryModal from "@/components/GalleryModal";

function OutletContent() {
  const router = useRouter();
  const params = useParams();
  const outletSlug = params?.outlet as string;
  const { scrollY } = useScroll();
  
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  
  // Find brand by slug
  const findBrandBySlug = (slug: string) => {
    return BRANDS.find(b => b.id === slug) || BRANDS[0];
  };
  
  const [selectedBrandId, setSelectedBrandId] = useState<string>(() => {
    if (outletSlug) {
      const brand = findBrandBySlug(outletSlug);
      return brand.id;
    }
    return BRANDS[0].id;
  });
  
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedBrand = BRANDS.find((b) => b.id === selectedBrandId) || BRANDS[0];
  const coverImage = venueData.coverImages[0] || null;
  const validGalleryImages = venueData.galleryImages.filter((_, index) => !failedGalleryImages.has(index));

  // Set mounted and sync with URL
  useEffect(() => {
    setMounted(true);
    if (outletSlug) {
      const brand = findBrandBySlug(outletSlug);
      if (brand && brand.id !== selectedBrandId) {
        setSelectedBrandId(brand.id);
      }
    }
  }, [outletSlug]);

  // Show sticky CTA after scroll
  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setShowStickyCTA(latest > 300);
    });
    return () => unsubscribe();
  }, [scrollY]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

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

  const handleBookNow = () => {
    router.push(`/${selectedBrandId}/reservations`);
  };

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    setIsDropdownOpen(false);
    router.push(`/${brandId}`);
  };

  const handleImageLoad = (index: number) => {
    setLoadedGalleryImages(prev => new Set(prev).add(index));
  };

  const handleImageError = (index: number) => {
    setFailedGalleryImages(prev => new Set(prev).add(index));
  };

  const logoPath = selectedBrand.id.startsWith('club-rogue') 
    ? '/logos/club-rogue.png' 
    : `/logos/${selectedBrand.id}.png`;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="relative w-16 h-16 mx-auto mb-4">
            <motion.div
              className="absolute inset-0 rounded-full border-4"
              style={{ borderColor: `${selectedBrand.accentColor}30` }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-transparent"
              style={{ borderTopColor: selectedBrand.accentColor }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Full-bleed Cover Image - No Sliding */}
      <div className="relative w-full h-[60vh] sm:h-[65vh] overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black animate-pulse" />
        ) : coverImage ? (
          <Image
            src={coverImage}
            alt={selectedBrand.shortName}
            fill
            sizes="100vw"
            className="object-cover brightness-100"
            unoptimized
            priority
            quality={85}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
        
        {/* Compact Outlet Switcher Dropdown */}
        <div ref={dropdownRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <motion.button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-xl bg-black/60 border border-white/20 shadow-xl transition-all"
            style={{
              borderColor: `${selectedBrand.accentColor}60`,
            }}
          >
            <div className="relative w-4 h-4 flex-shrink-0">
              <Image
                src={logoPath}
                alt={selectedBrand.shortName}
                fill
                className="object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-xs font-semibold text-white">{selectedBrand.shortName}</span>
            <motion.svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: isDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </motion.button>

          {/* Compact Dropdown Menu - Max 3 visible, scrollable */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[180px] backdrop-blur-xl bg-black/90 border border-white/20 rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto scrollbar-hide"
                style={{
                  boxShadow: `0 8px 32px ${selectedBrand.accentColor}30`,
                }}
              >
                {BRANDS.map((brand) => {
                  const brandLogoPath = brand.id.startsWith('club-rogue') 
                    ? '/logos/club-rogue.png' 
                    : `/logos/${brand.id}.png`;
                  const isSelected = brand.id === selectedBrandId;
                  
                  return (
                    <button
                      key={brand.id}
                      onClick={() => handleBrandSelect(brand.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 transition-colors text-left ${
                        isSelected
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="relative w-4 h-4 flex-shrink-0">
                        <Image
                          src={brandLogoPath}
                          alt={brand.shortName}
                          fill
                          className="object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className={`text-xs font-medium flex-1 ${
                        isSelected ? 'text-white' : 'text-gray-300'
                      }`}>
                        {brand.shortName}
                      </span>
                      {isSelected && (
                        <svg className="w-3 h-3" style={{ color: brand.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-10 space-y-3 pb-24">
        {/* Menu Section - Single Compact Card */}
        {loading ? (
          <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-3"
          >
            {venueData.menus.length === 0 ? (
              <div className="text-center py-3 text-gray-400">
                <p className="text-xs">Menu section is empty</p>
              </div>
            ) : venueData.menus.length === 1 ? (
              <motion.button
                onClick={() => {
                  setSelectedMenuId(venueData.menus[0].id);
                  setIsMenuModalOpen(true);
                }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-all"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={venueData.menus[0].thumbnail}
                    alt={venueData.menus[0].name}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                    loading="lazy"
                    quality={80}
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-medium text-sm mb-0.5">{venueData.menus[0].name}</h3>
                  <p className="text-gray-400 text-xs">{venueData.menus[0].images.length} pages</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {venueData.menus.map((menu) => (
                  <motion.button
                    key={menu.id}
                    onClick={() => {
                      setSelectedMenuId(menu.id);
                      setIsMenuModalOpen(true);
                    }}
                    whileTap={{ scale: 0.96 }}
                    className="flex-shrink-0 flex items-center gap-2 bg-white/5 rounded-lg p-2 hover:bg-white/10 transition-all min-w-[140px]"
                  >
                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={menu.thumbnail}
                        alt={menu.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                        loading="lazy"
                        quality={80}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-white font-medium text-xs mb-0.5 truncate">{menu.name}</h3>
                      <p className="text-gray-400 text-[10px]">{menu.images.length} pages</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* Photos Section - Horizontal Scroll (2-3 visible) */}
        {loading ? (
          <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white">Photos</h2>
              {validGalleryImages.length > 0 && (
                <button
                  onClick={() => {
                    setGalleryStartIndex(0);
                    setIsGalleryModalOpen(true);
                  }}
                  className="text-xs font-medium transition-colors"
                  style={{ color: selectedBrand.accentColor }}
                >
                  View all →
                </button>
              )}
            </div>
            {validGalleryImages.length === 0 ? (
              <div className="text-center py-3 text-gray-400">
                <p className="text-xs">Gallery is empty</p>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {validGalleryImages.slice(0, 6).map((image, index) => {
                  const originalIndex = venueData.galleryImages.indexOf(image);
                  const isLoaded = loadedGalleryImages.has(originalIndex);
                  const hasFailed = failedGalleryImages.has(originalIndex);
                  
                  if (hasFailed) return null;
                  
                  return (
                    <motion.button
                      key={`${originalIndex}-${image}`}
                      onClick={() => {
                        const validIndex = validGalleryImages.indexOf(image);
                        setGalleryStartIndex(validIndex);
                        setIsGalleryModalOpen(true);
                      }}
                      whileTap={{ scale: 0.95 }}
                      className="relative rounded-lg overflow-hidden bg-gray-800/50 aspect-square flex-shrink-0 w-[120px] sm:w-[140px]"
                    >
                      {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: selectedBrand.accentColor, borderTopColor: 'transparent' }}></div>
                        </div>
                      )}
                      <Image
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 120px, 140px"
                        className={`object-cover transition-opacity duration-300 ${
                          isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        unoptimized
                        loading="lazy"
                        quality={75}
                        onLoad={() => handleImageLoad(originalIndex)}
                        onError={() => handleImageError(originalIndex)}
                      />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}

        {/* Location Section - Compact */}
        {loading ? (
          <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-3 overflow-hidden"
          >
            <h2 className="text-sm font-semibold text-white mb-2">Location</h2>
            <a
              href={venueData.location.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="relative h-16 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 mb-2">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 transition-colors"
                    style={{ color: selectedBrand.accentColor }}
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
              </div>
              <div className="flex items-start gap-2">
                <svg
                  className="w-3 h-3 mt-0.5 flex-shrink-0"
                  style={{ color: selectedBrand.accentColor }}
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
                  <p className="text-white text-xs font-medium mb-0.5 truncate">{venueData.location.address || "Address not available"}</p>
                  <p className="text-[10px] font-medium transition-colors group-hover:opacity-80" style={{ color: selectedBrand.accentColor }}>
                    Open in Google Maps →
                  </p>
                </div>
              </div>
            </a>
          </motion.section>
        )}
      </div>

      {/* Sticky CTA - Only after scroll */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)]"
          >
            <motion.button
              onClick={handleBookNow}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="w-full py-2.5 px-6 rounded-full font-semibold text-white transition-all duration-300 relative overflow-hidden group backdrop-blur-xl border border-white/20 shadow-2xl"
              style={{ 
                backgroundColor: selectedBrand.accentColor,
                boxShadow: `0 8px 32px ${selectedBrand.accentColor}50`
              }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Book a table
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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

export default function OutletPage() {
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
      <OutletContent />
    </Suspense>
  );
}
