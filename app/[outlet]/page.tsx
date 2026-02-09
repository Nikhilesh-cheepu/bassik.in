"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import { getContactForBrand, getWhatsAppMessageForBrand, getFullPhoneNumber } from "@/lib/outlet-contacts";
import MenuModal from "@/components/MenuModal";
import GalleryModal from "@/components/GalleryModal";

function OutletContent() {
  const router = useRouter();
  const params = useParams();
  const outletSlug = params?.outlet as string;
  
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
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
  type VenueContact = { phone: string; label?: string };
  const [venueData, setVenueData] = useState({
    coverImages: [] as string[],
    coverVideoUrl: null as string | null,
    galleryImages: [] as string[],
    menus: [] as any[],
    location: { address: "", mapUrl: "" },
    contactPhone: "",
    contactNumbers: [] as VenueContact[],
    whatsappMessage: "",
  });
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedGalleryImages, setLoadedGalleryImages] = useState<Set<number>>(new Set());
  const [failedGalleryImages, setFailedGalleryImages] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const selectedBrand = BRANDS.find((b) => b.id === selectedBrandId) || BRANDS[0];
  // Cover video only for The Hub; all other outlets use cover image only
  const coverVideoUrl = selectedBrandId === "the-hub" ? (venueData.coverVideoUrl || null) : null;
  const coverImage = venueData.coverImages[0] || null;
  const validGalleryImages = venueData.galleryImages.filter((_, index) => !failedGalleryImages.has(index));
  const logoPath = selectedBrand.logoPath ?? (selectedBrand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${selectedBrand.id}.png`);

  const handleVideoToggle = async () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
        setIsVideoPlaying(true);
      } catch (err) {
        console.error("[Outlet] Failed to play cover video:", err);
      }
    } else {
      el.pause();
      setIsVideoPlaying(false);
    }
  };

  // Set mounted and sync with URL
  useEffect(() => {
    setMounted(true);
    if (outletSlug) {
      const brand = findBrandBySlug(outletSlug);
      if (brand && brand.id !== selectedBrandId) {
        setSelectedBrandId(brand.id);
      }
    }
  }, [outletSlug, selectedBrandId]);


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setContactDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, contactDropdownOpen]);

  // Reset selected contact when venue data changes
  useEffect(() => {
    setSelectedContactIndex(0);
  }, [selectedBrandId]);

  // Load venue data when brand changes - optimized for faster loading
  useEffect(() => {
    let cancelled = false;
    
    const loadVenueData = async () => {
      // Don't block UI - show page immediately, load data progressively
      setLoading(true);
      setLoadedGalleryImages(new Set());
      setFailedGalleryImages(new Set());
      
      try {
        // Use AbortController for cancellation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(`/api/venues/${selectedBrandId}`, {
          cache: 'no-store', // Always fetch fresh data
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (cancelled) return;
        
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          
          // Update state progressively - cover first
          setVenueData(prev => ({
            ...prev,
            coverImages: data.venue.coverImages || [],
            coverVideoUrl: data.venue.coverVideoUrl || null,
          }));
          
          // Then update rest of data
          setTimeout(() => {
            if (!cancelled) {
              setVenueData(prev => ({
                ...prev,
                galleryImages: data.venue.galleryImages || [],
                menus: data.venue.menus || [],
                location: {
                  address: data.venue.address || "",
                  mapUrl: data.venue.mapUrl || "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6",
                },
                contactPhone: data.venue.contactPhone || "",
                contactNumbers: data.venue.contactNumbers || [],
                whatsappMessage: data.venue.whatsappMessage || "",
              }));
              setLoading(false);
            }
          }, 50); // Small delay to show cover first
        } else {
          if (cancelled) return;
          setVenueData({
            coverImages: [],
            coverVideoUrl: null,
            galleryImages: [],
            menus: [],
            location: {
              address: "",
              mapUrl: "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6",
            },
            contactPhone: "",
            contactNumbers: [],
            whatsappMessage: "",
          });
          setLoading(false);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request cancelled');
          return;
        }
        if (cancelled) return;
        console.error("Error fetching venue data:", error);
        setVenueData({
          coverImages: [],
          coverVideoUrl: null,
          galleryImages: [],
          menus: [],
          location: {
            address: "",
            mapUrl: "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6",
          },
          contactPhone: "",
          contactNumbers: [],
          whatsappMessage: "",
        });
        setLoading(false);
      }
    };

    loadVenueData();
    
    return () => {
      cancelled = true;
    };
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

  // Show page immediately - don't wait for mounted
  // if (!mounted) {
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-black">
      {/* Full-bleed Cover - Video or Image */}
      <div className="relative w-full h-[60vh] sm:h-[65vh] overflow-hidden">
        {/* Show brand gradient immediately while loading */}
        {!coverVideoUrl && !coverImage && (
          <div 
            className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"
            style={{
              background: `linear-gradient(135deg, ${selectedBrand.accentColor}20, ${selectedBrand.accentColor}40, black)`,
            }}
          />
        )}
        {loading && (coverVideoUrl || coverImage) ? (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black animate-pulse" />
        ) : coverVideoUrl ? (
          <video
            ref={videoRef}
            loop
            playsInline
            controls={false}
            className="absolute inset-0 w-full h-full object-cover brightness-100"
            src={coverVideoUrl}
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
          />
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
        
        {/* Optional play button for cover video (top-right) */}
        {coverVideoUrl && (
          <button
            type="button"
            onClick={handleVideoToggle}
            className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs sm:text-sm font-medium border border-white/30 hover:bg-black/90 transition-colors"
          >
            {isVideoPlaying ? "Pause video" : "Play video"}
          </button>
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
                  const brandLogoPath = brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`);
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

      {/* Compact contact actions – dropdown when multiple numbers */}
      <div className="relative -mt-6 z-20">
        <div className="max-w-4xl mx-auto px-4 flex justify-center">
          {(() => {
            const contacts =
              venueData.contactNumbers.length > 0
                ? venueData.contactNumbers
                : [{ phone: venueData.contactPhone || getContactForBrand(selectedBrandId), label: "Contact" }];
            const phone = contacts[selectedContactIndex]?.phone || contacts[0]?.phone || getContactForBrand(selectedBrandId);
            const full = getFullPhoneNumber(phone);
            const msg =
              venueData.whatsappMessage ||
              getWhatsAppMessageForBrand(selectedBrandId, selectedBrand.shortName);
            const waUrl = `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
            const telUrl = `tel:+${full}`;
            const hasMultiple = contacts.length > 1;

            return (
              <div className="inline-flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 px-2 py-1 flex-wrap justify-center">
                {hasMultiple && (
                  <div ref={contactDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setContactDropdownOpen((o) => !o)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/90 bg-white/10 hover:bg-white/15 transition-colors border border-white/20"
                    >
                      <span className="truncate max-w-[100px]">
                        {contacts[selectedContactIndex]?.label || contacts[selectedContactIndex]?.phone || "Contact"}
                      </span>
                      <svg
                        className="w-3 h-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ transform: contactDropdownOpen ? "rotate(180deg)" : undefined }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {contactDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 mt-1 min-w-[140px] rounded-lg bg-black/90 border border-white/20 shadow-xl overflow-hidden z-50"
                        >
                          {contacts.map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setSelectedContactIndex(i);
                                setContactDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                                i === selectedContactIndex ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10"
                              }`}
                            >
                              {c.label?.trim() || c.phone || "Contact"}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-100 bg-emerald-500/15 hover:bg-emerald-500/25 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
                <a
                  href={telUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-sky-100 bg-sky-500/15 hover:bg-sky-500/25 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call</span>
                </a>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-4 -mt-3 relative z-10 space-y-3 pb-32">
        {/* The Hub: Book a table at these spots */}
        {selectedBrand.showSpotsSection && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-4"
          >
            <p className="text-sm text-white/90 text-center mb-4">
              Book a table at any of these spots to enjoy the live screening on the biggest screen in Hyderabad
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
              <Link href="/c53" className="flex flex-col items-center gap-2 group">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                  <Image src="/logos/c53.png" alt="C53" fill sizes="80px" className="object-contain p-1" />
                </div>
                <span className="text-xs font-medium text-white/80">C53</span>
              </Link>
              <Link href="/boiler-room" className="flex flex-col items-center gap-2 group">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                  <Image src="/logos/boiler-room.png" alt="Boiler Room" fill sizes="80px" className="object-contain p-1" />
                </div>
                <span className="text-xs font-medium text-white/80">Boiler Room</span>
              </Link>
              <Link href="/firefly" className="flex flex-col items-center gap-2 group">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                  <Image src="/logos/firefly.png" alt="Firefly" fill sizes="80px" className="object-contain p-1" />
                </div>
                <span className="text-xs font-medium text-white/80">Firefly</span>
              </Link>
            </div>
          </motion.section>
        )}

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

      {/* Fixed Book Table Button - Always Visible */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)]">
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
      </div>


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
