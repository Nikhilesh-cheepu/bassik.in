"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import MenuModal from "@/components/MenuModal";
import GalleryModal from "@/components/GalleryModal";
import { HeroSkeleton, MenuCardSkeleton, PhotosStripSkeleton, LocationCardSkeleton, CTASkeleton } from "@/components/SkeletonLoader";
import BrandedLoader from "@/components/BrandedLoader";

function OutletContent() {
  const router = useRouter();
  const params = useParams();
  const outletSlug = params?.outlet as string;
  
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Find brand by slug (outlet ID)
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  
  // Parallax and zoom effects
  const heroScale = useTransform(scrollY, [0, 300], [1, 1.1]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.4]);

  const selectedBrand = BRANDS.find((b) => b.id === selectedBrandId) || BRANDS[0];
  const coverImages = venueData.coverImages.slice(0, 3);
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
      setIsTransitioning(true);
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
        setTimeout(() => setIsTransitioning(false), 300);
      }
    };
    loadVenueData();
  }, [selectedBrandId]);

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
    router.push(`/${selectedBrandId}/reservations`);
  };

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    setCurrentImageIndex(0);
    setIsDropdownOpen(false);
    // Navigate to the new outlet's URL
    router.push(`/${brandId}`);
  };

  const handleImageLoad = (index: number) => {
    setLoadedGalleryImages(prev => new Set(prev).add(index));
  };

  const handleImageError = (index: number) => {
    setFailedGalleryImages(prev => new Set(prev).add(index));
  };

  // Use club-rogue.png for all Club Rogue variants
  const logoPath = selectedBrand.id.startsWith('club-rogue') 
    ? '/logos/club-rogue.png' 
    : `/logos/${selectedBrand.id}.png`;

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <BrandedLoader 
        accentColor={selectedBrand.accentColor}
        logoPath={logoPath}
        brandName={selectedBrand.shortName}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Full-bleed Hero Cover Image with Parallax */}
      <motion.div 
        ref={heroRef} 
        className="relative w-full h-[65vh] overflow-hidden"
        style={{ scale: heroScale }}
      >
        {loading ? (
          <HeroSkeleton accentColor={selectedBrand.accentColor} />
        ) : coverImages.length > 0 ? (
          <AnimatePresence mode="wait">
            {coverImages.map((image, index) => (
              index === currentImageIndex && (
                <motion.div
                  key={`${selectedBrandId}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isTransitioning ? 0.3 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                  style={{ opacity: heroOpacity }}
                >
                  <Image
                    src={image}
                    alt={`${selectedBrand.shortName} cover ${index + 1}`}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    unoptimized
                    priority={index === 0}
                    quality={85}
                  />
                  {/* Dark gradient overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
                </motion.div>
              )
            ))}
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400">Cover images are empty</p>
          </div>
        )}
        
        {/* Compact Outlet Switcher Dropdown Pill - Centered Top */}
        <div ref={dropdownRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <motion.button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-xl bg-white/15 border border-white/20 shadow-2xl transition-all"
            style={{
              borderColor: `${selectedBrand.accentColor}60`,
              boxShadow: `0 8px 32px ${selectedBrand.accentColor}40`,
            }}
          >
            <div className="relative w-5 h-5 flex-shrink-0">
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
            <span className="text-sm font-semibold text-white">{selectedBrand.shortName}</span>
            <motion.svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: isDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[200px] backdrop-blur-xl bg-black/80 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
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
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="relative w-5 h-5 flex-shrink-0">
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
                      <span className={`text-sm font-medium flex-1 text-left ${
                        isSelected ? 'text-white' : 'text-gray-300'
                      }`}>
                        {brand.shortName}
                      </span>
                      {isSelected && (
                        <svg className="w-4 h-4" style={{ color: brand.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Image indicators */}
        {coverImages.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {coverImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? "w-8 bg-white shadow-lg"
                    : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 space-y-3 pb-32">
        {/* Menu Section - Compact */}
        {loading ? (
          <MenuCardSkeleton />
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl"
          >
            <h2 className="text-sm font-semibold text-white mb-2">Menu</h2>
            {venueData.menus.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs">Menu section is empty</p>
              </div>
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
                    className="flex-shrink-0 flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-2 hover:bg-white/10 transition-all min-w-[160px]"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={menu.thumbnail}
                        alt={menu.name}
                        fill
                        sizes="48px"
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

        {/* Photos Section - Horizontal Scroll */}
        {loading ? (
          <PhotosStripSkeleton accentColor={selectedBrand.accentColor} />
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
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
              <div className="text-center py-4 text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs">Gallery is empty</p>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {validGalleryImages.slice(0, 4).map((image, index) => {
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
                      className="relative rounded-xl overflow-hidden bg-gray-800/50 aspect-square flex-shrink-0 w-[48%]"
                    >
                      {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="animate-spin rounded-full h-6 w-6 border-2" style={{ borderColor: selectedBrand.accentColor, borderTopColor: 'transparent' }}></div>
                        </div>
                      )}
                      <Image
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 400px"
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
          <LocationCardSkeleton />
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl overflow-hidden"
          >
            <h2 className="text-sm font-semibold text-white mb-2">Location</h2>
            <a
              href={venueData.location.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="relative h-24 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 mb-2">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 transition-colors"
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
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              </div>
              <div className="flex items-start gap-2">
                <svg
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
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

      {/* Premium Sticky Pill CTA Button */}
      {loading ? (
        <CTASkeleton accentColor={selectedBrand.accentColor} />
      ) : (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100, damping: 20 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <motion.button
            onClick={handleBookNow}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            className="w-full py-3 px-6 rounded-full font-semibold text-white transition-all duration-300 relative overflow-hidden group backdrop-blur-xl border border-white/20 shadow-2xl"
            style={{ 
              backgroundColor: selectedBrand.accentColor,
              boxShadow: `0 8px 32px ${selectedBrand.accentColor}50`
            }}
          >
            {/* Shine effect */}
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
