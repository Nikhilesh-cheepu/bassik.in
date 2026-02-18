"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import { getContactForBrand, getWhatsAppMessageForBrand, getFullPhoneNumber } from "@/lib/outlet-contacts";
import { trackWhatsAppClick, trackCallClick } from "@/lib/analytics";
import EventsOffersHero from "@/components/EventsOffersHero";

const MenuModal = dynamic(() => import("@/components/MenuModal"));
const GalleryModal = dynamic(() => import("@/components/GalleryModal"));
const VenuePhotosSection = dynamic(() => import("@/components/VenuePhotosSection"));
const VenueLocationSection = dynamic(() => import("@/components/VenueLocationSection"));

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
    offers: [] as { id: string; imageUrl: string; title: string; startDate?: string; endDate?: string; order: number }[],
    galleryImages: [] as string[],
    menus: [] as any[],
    location: { address: "", mapUrl: "" },
    contactPhone: "",
    contactNumbers: [] as VenueContact[],
    whatsappMessage: "",
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);
  const [whatsappDropdownOpen, setWhatsappDropdownOpen] = useState(false);
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedGalleryImages, setLoadedGalleryImages] = useState<Set<number>>(new Set());
  const [failedGalleryImages, setFailedGalleryImages] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  const selectedBrand = BRANDS.find((b) => b.id === selectedBrandId) || BRANDS[0];
  const venueOffers = venueData.offers;
  const validGalleryImages = venueData.galleryImages.filter((_, index) => !failedGalleryImages.has(index));
  const logoPath = selectedBrand.logoPath ?? (selectedBrand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${selectedBrand.id}.png`);

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
        setWhatsappDropdownOpen(false);
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

  const loadVenueData = useCallback(async () => {
    setFetchError(null);
    setLoading(true);
    setLoadedGalleryImages(new Set());
    setFailedGalleryImages(new Set());
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`/api/venues/${selectedBrandId}`, {
        next: { revalidate: 30 },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "Failed to load");
        setVenueData(prev => ({ ...prev, offers: [], galleryImages: [], menus: [], location: { address: "", mapUrl: "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6" }, contactPhone: "", contactNumbers: [], whatsappMessage: "" }));
        setLoading(false);
        return;
      }
      const v = data.venue || {};
      setVenueData({
        offers: Array.isArray(v.offers) ? v.offers : [],
        galleryImages: Array.isArray(v.galleryImages) ? v.galleryImages : [],
        menus: Array.isArray(v.menus) ? v.menus : [],
        location: {
          address: v.address ?? "",
          mapUrl: v.mapUrl ?? "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6",
        },
        contactPhone: v.contactPhone ?? "",
        contactNumbers: Array.isArray(v.contactNumbers) ? v.contactNumbers : [],
        whatsappMessage: v.whatsappMessage ?? "",
      });
      setFetchError(null);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Error fetching venue data:", err);
      setFetchError("Failed to load. Tap to retry.");
      setVenueData(prev => ({ ...prev, offers: [], galleryImages: [], menus: [], location: { address: "", mapUrl: "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6" }, contactPhone: "", contactNumbers: [], whatsappMessage: "" }));
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    loadVenueData();
  }, [loadVenueData]);

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
      {/* Hero stack: 100vh = carousel + CTA + menu (no scroll) */}
      <div className="relative w-full z-0 max-h-[100vh] min-h-0 flex flex-col">
        <div className="relative flex-shrink-0">
          <EventsOffersHero offers={venueOffers} brand={selectedBrand} isLoading={loading} />
          {/* Outlet switcher overlay – above carousel */}
          <div ref={dropdownRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <motion.button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            whileTap={{ scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-xl bg-black/60 border border-white/20 shadow-xl transition-all touch-manipulation"
            style={{ touchAction: "manipulation", borderColor: `${selectedBrand.accentColor}60` }}
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
                className="pointer-events-auto absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[180px] backdrop-blur-xl bg-black/90 border border-white/20 rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto scrollbar-hide"
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

        {/* CTA row: two pills only, no extra outer box */}
        <div className="flex-shrink-0 mt-3 px-4 z-20 pointer-events-auto flex justify-center">
          <div className="flex items-center gap-2 w-full max-w-[280px] justify-center">
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
              <>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {hasMultiple ? (
                  <div ref={contactDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setWhatsappDropdownOpen((o) => !o)}
                      className="inline-flex items-center justify-center gap-1.5 flex-1 min-w-0 px-3 py-2 rounded-full text-xs font-medium text-emerald-100 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 hover:bg-emerald-500/30 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                      </svg>
                      <span>WhatsApp</span>
                      <svg
                        className="w-3 h-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ transform: whatsappDropdownOpen ? "rotate(180deg)" : undefined }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <AnimatePresence>
                      {whatsappDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 mt-1 min-w-[140px] rounded-lg bg-black/90 border border-white/20 shadow-xl overflow-hidden z-50"
                        >
                          {contacts.map((c, i) => {
                            const targetPhone = c.phone || phone;
                            const targetFull = getFullPhoneNumber(targetPhone);
                            const targetWaUrl = `https://wa.me/${targetFull}?text=${encodeURIComponent(msg)}`;
                            return (
                              <a
                                key={i}
                                href={targetWaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  trackWhatsAppClick({ number: targetFull, outlet: selectedBrandId });
                                  setSelectedContactIndex(i);
                                  setWhatsappDropdownOpen(false);
                                }}
                                className={`block w-full px-3 py-2 text-xs font-medium transition-colors ${
                                  i === selectedContactIndex ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10"
                                }`}
                              >
                                {c.label?.trim() || c.phone || "Contact"}
                              </a>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackWhatsAppClick({ number: full, outlet: selectedBrandId })}
                    className="inline-flex items-center justify-center gap-1.5 flex-1 min-w-0 px-3 py-2 rounded-full text-xs font-medium text-emerald-100 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 hover:bg-emerald-500/30 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                    </svg>
                    <span>WhatsApp</span>
                  </a>
                )}
                {hasMultiple ? (
                  <div ref={contactDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setContactDropdownOpen((o) => !o)}
                      className="inline-flex items-center justify-center gap-1.5 flex-1 min-w-0 px-3 py-2 rounded-full text-xs font-medium text-sky-100 bg-sky-500/20 backdrop-blur-sm border border-sky-400/30 hover:bg-sky-500/30 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Call</span>
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
                          {contacts.map((c, i) => {
                            const targetPhone = c.phone || phone;
                            const targetFull = getFullPhoneNumber(targetPhone);
                            const targetTelUrl = `tel:+${targetFull}`;
                            return (
                              <a
                                key={i}
                                href={targetTelUrl}
                                onClick={() => {
                                  trackCallClick({ number: targetFull, outlet: selectedBrandId });
                                  setSelectedContactIndex(i);
                                  setContactDropdownOpen(false);
                                }}
                                className={`block w-full px-3 py-2 text-xs font-medium transition-colors ${
                                  i === selectedContactIndex ? "bg-white/15 text-white" : "text-gray-300 hover:bg-white/10"
                                }`}
                              >
                                {c.label?.trim() || c.phone || "Contact"}
                              </a>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <a
                    href={telUrl}
                    onClick={() => trackCallClick({ number: full, outlet: selectedBrandId })}
                    className="inline-flex items-center justify-center gap-1.5 flex-1 min-w-0 px-3 py-2 rounded-full text-xs font-medium text-sky-100 bg-sky-500/20 backdrop-blur-sm border border-sky-400/30 hover:bg-sky-500/30 transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Call</span>
                  </a>
                )}
              </div>
              </>
            );
          })()}
          </div>
        </div>

        {/* MENU row: label + 2 cards, compact spacing */}
        <div className="flex-shrink-0 mt-2 px-4 pb-2 z-10">
          <p className="text-[12px] font-medium uppercase tracking-wider text-white/50 mb-1.5">Menu</p>
          {loading ? (
            <div className="flex gap-2">
              <div className="flex-1 h-14 rounded-xl bg-white/5 animate-pulse" />
              <div className="flex-1 h-14 rounded-xl bg-white/5 animate-pulse" />
            </div>
          ) : venueData.menus.length === 0 ? (
            <div className="py-2 text-center text-white/40 text-xs">No menu</div>
          ) : venueData.menus.length === 1 ? (
            <motion.button
              onClick={() => { setSelectedMenuId(venueData.menus[0].id); setIsMenuModalOpen(true); }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2.5 hover:bg-white/10 transition-all text-left"
            >
              <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                <Image src={venueData.menus[0].thumbnail} alt={venueData.menus[0].name} fill sizes="40px" className="object-cover" unoptimized loading="lazy" quality={80} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium text-sm truncate">{venueData.menus[0].name}</h3>
                <p className="text-white/40 text-[10px]">{venueData.menus[0].images.length} pages</p>
              </div>
              <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </motion.button>
          ) : (
            <div className="flex gap-2">
              {venueData.menus.map((menu) => (
                <motion.button
                  key={menu.id}
                  onClick={() => { setSelectedMenuId(menu.id); setIsMenuModalOpen(true); }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2 hover:bg-white/10 transition-all text-left min-w-0"
                >
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={menu.thumbnail} alt={menu.name} fill sizes="36px" className="object-cover" unoptimized loading="lazy" quality={80} priority={venueData.menus.indexOf(menu) === 0} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-xs truncate">{menu.name}</h3>
                    <p className="text-white/40 text-[10px]">{menu.images.length} p</p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Sections – below hero (Photos, Location, etc.) */}
      <div className="max-w-4xl mx-auto px-4 pt-3 relative z-10 space-y-3 pb-32">
        {fetchError && (
          <button
            type="button"
            onClick={loadVenueData}
            className="w-full py-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm font-medium touch-manipulation"
            style={{ touchAction: "manipulation" }}
          >
            {fetchError}
          </button>
        )}
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

        {/* Photos Section - lazy-loaded component */}
        <VenuePhotosSection
          loading={loading}
          images={validGalleryImages}
          accentColor={selectedBrand.accentColor}
          onOpenGallery={
            validGalleryImages.length > 0
              ? () => {
                  setGalleryStartIndex(0);
                  setIsGalleryModalOpen(true);
                }
              : undefined
          }
        />

        {/* Location Section - lazy-loaded component */}
        <VenueLocationSection
          loading={loading}
          address={venueData.location.address}
          mapUrl={venueData.location.mapUrl}
          accentColor={selectedBrand.accentColor}
        />
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
