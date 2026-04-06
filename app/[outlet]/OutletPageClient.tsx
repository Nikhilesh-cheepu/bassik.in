"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import { getContactForBrand, getWhatsAppMessageForBrand } from "@/lib/outlet-contacts";
import { guestEventDateLine } from "@/lib/event-date-display";
import EventsOffersHero from "@/components/EventsOffersHero";
import VenueContactBottomSheet from "@/components/VenueContactBottomSheet";
import type { VenuePayload } from "@/lib/venue-data";

const MenuModal = dynamic(() => import("@/components/MenuModal"));
const GalleryModal = dynamic(() => import("@/components/GalleryModal"));
const VenuePhotosSection = dynamic(() => import("@/components/VenuePhotosSection"));
const VenueAmenitiesSection = dynamic(() => import("@/components/VenueAmenitiesSection"));

const DEFAULT_MAP = "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6";

function toClientVenueState(p: VenuePayload) {
  return {
    offers: p.offers,
    galleryImages: p.galleryImages,
    menus: p.menus,
    location: { address: p.location.address, mapUrl: p.location.mapUrl ?? DEFAULT_MAP },
    contactPhone: p.contactPhone,
    contactNumbers: p.contactNumbers,
    whatsappMessage: p.whatsappMessage,
    amenities: p.amenities,
    sectionVisibility: p.sectionVisibility,
  };
}

const emptyVenueState = toClientVenueState({
  offers: [],
  galleryImages: [],
  menus: [],
  location: { address: "", mapUrl: null },
  contactPhone: "",
  contactNumbers: [],
  whatsappMessage: "",
  amenities: [],
  sectionVisibility: { menu: true, photos: true, amenities: true, spots: true },
});

interface OutletPageClientProps {
  outletSlug: string;
  initialVenueData: VenuePayload | null;
  initialEventId?: string | null;
}

export default function OutletPageClient({ outletSlug, initialVenueData, initialEventId = null }: OutletPageClientProps) {
  const router = useRouter();
  const findBrandBySlug = (slug: string) => BRANDS.find((b) => b.id === slug) || BRANDS[0];

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState(() => findBrandBySlug(outletSlug).id);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [venueData, setVenueData] = useState(() =>
    initialVenueData ? toClientVenueState(initialVenueData) : emptyVenueState
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isQuickContactOpen, setIsQuickContactOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isEventQuickBookOpen, setIsEventQuickBookOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventBookName, setEventBookName] = useState("");
  const [eventBookPhone, setEventBookPhone] = useState("");
  const [eventBookPeople, setEventBookPeople] = useState(2);
  const [eventBookDate, setEventBookDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [eventBookTime, setEventBookTime] = useState("20:00");
  const [eventBookSubmitting, setEventBookSubmitting] = useState(false);
  const [eventBookError, setEventBookError] = useState<string | null>(null);
  const [showEventBookedToast, setShowEventBookedToast] = useState(false);
  const [isReviewSheetOpen, setIsReviewSheetOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewRating, setReviewRating] = useState("5.0");
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewReply, setReviewReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialVenueData);
  const [loadedGalleryImages, setLoadedGalleryImages] = useState<Set<number>>(new Set());
  const [failedGalleryImages, setFailedGalleryImages] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eventBookedToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedBrand = BRANDS.find((b) => b.id === selectedBrandId) || BRANDS[0];
  const venueOffers = venueData.offers;
  const validGalleryImages = venueData.galleryImages.filter((_, i) => !failedGalleryImages.has(i));
  const logoPath =
    selectedBrand.logoPath ??
    (selectedBrand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${selectedBrand.id}.png`);
  const selectedEvent = venueOffers.find((o) => o.id === selectedEventId) ?? null;

  useEffect(() => {
    if (outletSlug) {
      const brand = findBrandBySlug(outletSlug);
      if (brand && brand.id !== selectedBrandId) setSelectedBrandId(brand.id);
    }
  }, [outletSlug, selectedBrandId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (eventBookedToastTimeoutRef.current) clearTimeout(eventBookedToastTimeoutRef.current);
    };
  }, []);

  // Prefetch booking page for snappier navigation
  useEffect(() => {
    router.prefetch(`/${selectedBrandId}/book`);
  }, [router, selectedBrandId]);

  const loadVenueData = useCallback(async () => {
    setFetchError(null);
    setLoading(true);
    setLoadedGalleryImages(new Set());
    setFailedGalleryImages(new Set());
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`/api/venues/${selectedBrandId}`, {
        next: { revalidate: 30 },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || "Failed to load");
        setVenueData(emptyVenueState);
        setLoading(false);
        return;
      }
      const v = data.venue || {};
      setVenueData({
        offers: Array.isArray(v.offers) ? v.offers : [],
        galleryImages: Array.isArray(v.galleryImages) ? v.galleryImages : [],
        menus: Array.isArray(v.menus) ? v.menus : [],
        location: { address: v.address ?? "", mapUrl: v.mapUrl ?? DEFAULT_MAP },
        contactPhone: v.contactPhone ?? "",
        contactNumbers: Array.isArray(v.contactNumbers) ? v.contactNumbers : [],
        whatsappMessage: v.whatsappMessage ?? "",
        amenities: Array.isArray(v.amenities) ? v.amenities : [],
        sectionVisibility: {
          menu: v.sectionVisibility?.menu !== false,
          photos: v.sectionVisibility?.photos !== false,
          amenities: v.sectionVisibility?.amenities !== false,
          spots: v.sectionVisibility?.spots !== false,
        },
      });
      setFetchError(null);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") return;
      setFetchError("Failed to load. Tap to retry.");
      setVenueData(emptyVenueState);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    if (!initialVenueData) loadVenueData();
  }, [initialVenueData, loadVenueData]);

  useEffect(() => {
    if (!venueOffers.length) {
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId((prev) => (prev && venueOffers.some((o) => o.id === prev) ? prev : venueOffers[0].id));
  }, [venueOffers]);

  useEffect(() => {
    if (!initialEventId || !venueOffers.length) return;
    if (venueOffers.some((o) => o.id === initialEventId)) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId, venueOffers]);

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    setIsDropdownOpen(false);
    router.push(`/${brandId}`);
  };

  const openEventQuickBook = (offerId: string) => {
    const selected = venueOffers.find((o) => o.id === offerId) ?? null;
    setSelectedEventId(offerId);
    if (selected?.eventDate) {
      const d = new Date(selected.eventDate);
      if (!Number.isNaN(d.getTime())) {
        setEventBookDate(d.toISOString().slice(0, 10));
        setEventBookTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      }
    }
    setEventBookError(null);
    setIsEventQuickBookOpen(true);
  };

  const submitEventQuickBook = async () => {
    const normalizedPhone = eventBookPhone.replace(/\D/g, "").slice(0, 10);
    if (!selectedEventId) {
      setEventBookError("Please select an event.");
      return;
    }
    if (!eventBookName.trim()) {
      setEventBookError("Please enter your name.");
      return;
    }
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setEventBookError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!eventBookDate || !eventBookTime) {
      setEventBookError("Please select date and time.");
      return;
    }

    setEventBookSubmitting(true);
    setEventBookError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: eventBookName.trim(),
          contactNumber: normalizedPhone,
          numberOfMen: String(eventBookPeople),
          numberOfWomen: "0",
          numberOfCouples: "0",
          date: eventBookDate,
          timeSlot: eventBookTime,
          notes: `Quick event booking${selectedEventId ? ` [event:${selectedEventId}]` : ""}`,
          eventId: selectedEventId,
          eventName: selectedEvent?.title?.trim() || "Event",
          selectedDiscounts: [],
          brandId: selectedBrand.id,
          brandName: selectedBrand.name,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Booking failed. Please try again.");
      }
      setIsEventQuickBookOpen(false);
      setEventBookName("");
      setEventBookPhone("");
      setEventBookPeople(2);
      setShowEventBookedToast(true);
      if (eventBookedToastTimeoutRef.current) clearTimeout(eventBookedToastTimeoutRef.current);
      eventBookedToastTimeoutRef.current = setTimeout(() => setShowEventBookedToast(false), 3000);
    } catch (error) {
      setEventBookError(error instanceof Error ? error.message : "Booking failed. Please try again.");
    } finally {
      setEventBookSubmitting(false);
    }
  };

  const submitReview = async () => {
    if (reviewSubmitting) return;
    setReviewStatus(null);
    setReviewReply(null);
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/home/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: selectedBrandId,
          author: reviewAuthor.trim(),
          reviewText: reviewText.trim(),
          rating: Number(reviewRating),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReviewStatus(typeof data.error === "string" ? data.error : "Could not submit review.");
        return;
      }
      setReviewAuthor("");
      setReviewText("");
      setReviewRating("5.0");
      setReviewStatus(
        typeof data.moderationMessage === "string" && data.moderationMessage.trim()
          ? data.moderationMessage
          : "Thanks for sharing your review."
      );
      if (typeof data.assistantReply === "string" && data.assistantReply.trim()) {
        setReviewReply(data.assistantReply.trim());
      }
    } catch {
      setReviewStatus("Could not submit review right now.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black w-full max-w-full overflow-x-hidden">
      <div className="relative w-full max-w-full z-0 min-h-0 min-w-0 flex flex-col overflow-x-hidden">
        <div className="relative mt-1">
          <div className="relative flex-shrink-0 min-w-0 overflow-x-hidden">
            <EventsOffersHero
              offers={venueOffers}
              brand={selectedBrand}
              isLoading={loading}
              onActiveOfferChange={(offerId) => setSelectedEventId((prev) => prev ?? offerId)}
              onOfferClick={openEventQuickBook}
            />
          </div>
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
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
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
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-auto absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[180px] backdrop-blur-xl bg-black/90 border border-white/20 rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto scrollbar-hide"
                  style={{ boxShadow: `0 8px 32px ${selectedBrand.accentColor}30` }}
                >
                  {BRANDS.filter((brand) => !HIDDEN_BRAND_IDS.has(brand.id)).map((brand) => {
                    const brandLogoPath =
                      brand.logoPath ??
                      (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`);
                    const isSelected = brand.id === selectedBrandId;
                    return (
                      <button
                        key={brand.id}
                        onClick={() => handleBrandSelect(brand.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 transition-colors text-left ${
                          isSelected ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                      >
                        <div className="relative w-4 h-4 flex-shrink-0">
                          <Image
                            src={brandLogoPath}
                            alt={brand.shortName}
                            fill
                            className="object-contain"
                            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                          />
                        </div>
                        <span className={`text-xs font-medium flex-1 ${isSelected ? "text-white" : "text-gray-300"}`}>
                          {brand.shortName}
                        </span>
                        {isSelected && (
                          <svg
                            className="w-3 h-3"
                            style={{ color: brand.accentColor }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                  <div className="border-t border-white/10 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        router.push("/");
                      }}
                      className="w-full px-3 py-2.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 text-left"
                    >
                      Main Page
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-3 relative z-10 space-y-3 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(9rem+env(safe-area-inset-bottom))] w-full min-w-0 overflow-x-hidden">
        {fetchError && (
          <button type="button" onClick={loadVenueData} className="w-full py-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm font-medium touch-manipulation" style={{ touchAction: "manipulation" }}>
            {fetchError}
          </button>
        )}
        {selectedBrand.showSpotsSection && venueData.sectionVisibility.spots && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-4">
            <p className="text-sm text-white/90 text-center mb-4">Book a table at any of these spots to enjoy the live screening on the biggest screen in Hyderabad</p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
              <Link href="/c53" prefetch={false} className="flex flex-col items-center gap-2 group">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                  <Image src="/logos/c53.png" alt="C53" fill sizes="80px" className="object-contain p-1" />
                </div>
                <span className="text-xs font-medium text-white/80">C53</span>
              </Link>
              <Link href="/boiler-room" prefetch={false} className="flex flex-col items-center gap-2 group">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                  <Image src="/logos/boiler-room.png" alt="Boiler Room" fill sizes="80px" className="object-contain p-1" />
                </div>
                <span className="text-xs font-medium text-white/80">Boiler Room</span>
              </Link>
              <Link href="/firefly" prefetch={false} className="flex flex-col items-center gap-2 group">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                  <Image src="/logos/firefly.png" alt="Firefly" fill sizes="80px" className="object-contain p-1" />
                </div>
                <span className="text-xs font-medium text-white/80">Firefly</span>
              </Link>
            </div>
          </motion.section>
        )}
        {venueData.sectionVisibility.photos && (
          <VenuePhotosSection
            loading={loading}
            images={validGalleryImages}
            onOpenGallery={validGalleryImages.length > 0 ? () => { setGalleryStartIndex(0); setIsGalleryModalOpen(true); } : undefined}
          />
        )}
        {venueData.sectionVisibility.amenities && <VenueAmenitiesSection amenities={venueData.amenities} />}
        <div className="px-1 pt-1">
          <button
            type="button"
            onClick={() => {
              setReviewStatus(null);
              setReviewReply(null);
              setIsReviewSheetOpen(true);
            }}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors underline underline-offset-4"
          >
            Write a review
          </button>
        </div>
      </div>

      <div
        className="fixed left-1/2 z-[100] w-[calc(100%-1.25rem)] max-w-md -translate-x-1/2 rounded-3xl border border-white/25 bg-black/85 p-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl"
        style={{
          bottom: "max(1rem, env(safe-area-inset-bottom))",
          boxShadow: `0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px ${selectedBrand.accentColor}22`,
        }}
      >
        <div className="flex w-full flex-row gap-2">
          <button
            type="button"
            onClick={() => router.push(`/${selectedBrandId}/book`)}
            className="flex min-h-[48px] min-w-0 flex-1 basis-0 items-center justify-center rounded-2xl border px-2 py-3 text-center text-sm font-semibold leading-tight text-white shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-transform active:scale-[0.98] sm:px-3"
            style={{ borderColor: "rgba(96,165,250,0.8)", backgroundColor: "rgba(37,99,235,0.5)" }}
          >
            Book table
          </button>
          <button
            type="button"
            onClick={() => setIsQuickContactOpen(true)}
            className="flex min-h-[48px] min-w-0 flex-1 basis-0 items-center justify-center rounded-2xl border px-2 py-3 text-center text-sm font-semibold leading-tight text-white transition-transform active:scale-[0.98] sm:px-3"
            style={{
              borderColor: `${selectedBrand.accentColor}cc`,
              backgroundColor: `${selectedBrand.accentColor}33`,
              boxShadow: `0 0 24px ${selectedBrand.accentColor}44`,
            }}
          >
            Contact us
          </button>
        </div>
        {venueData.sectionVisibility.menu && (
          <button
            type="button"
            onClick={() => setIsQuickMenuOpen(true)}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-white/[0.08] py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/[0.12]"
          >
            Menu
          </button>
        )}
      </div>

      {isMenuModalOpen && selectedMenuId && (
        <MenuModal menu={venueData.menus.find((m) => m.id === selectedMenuId)!} brandName={selectedBrand.shortName} onClose={() => { setIsMenuModalOpen(false); setSelectedMenuId(null); }} />
      )}
      {isGalleryModalOpen && (
        <GalleryModal images={validGalleryImages} brandName={selectedBrand.shortName} initialIndex={galleryStartIndex} onClose={() => setIsGalleryModalOpen(false)} />
      )}
      <VenueContactBottomSheet
        open={isQuickContactOpen}
        onClose={() => setIsQuickContactOpen(false)}
        brandId={selectedBrandId}
        venueShortName={selectedBrand.shortName}
        accentColor={selectedBrand.accentColor}
        contactRows={venueData.contactNumbers}
        fallbackPhone={venueData.contactPhone || getContactForBrand(selectedBrandId)}
        whatsappMessage={
          venueData.whatsappMessage || getWhatsAppMessageForBrand(selectedBrandId, selectedBrand.shortName)
        }
        instagramUrl={selectedBrand.instagramUrls[0] || "#"}
        address={venueData.location.address}
        mapUrl={venueData.location.mapUrl || DEFAULT_MAP}
      />
      <AnimatePresence>
        {isQuickMenuOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[110] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickMenuOpen(false)}
            />
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="fixed inset-x-0 bottom-0 z-[120] mx-auto w-full max-w-md rounded-t-3xl border-t border-white/15 bg-[#0a0d14]/95 p-4"
            >
              <h3 className="text-sm font-semibold text-white">Menus</h3>
              <div className="mt-3 space-y-2">
                {!venueData.sectionVisibility.menu ? (
                  <p className="text-sm text-white/60">Menu section is hidden for this outlet.</p>
                ) : venueData.menus.length === 0 ? (
                  <p className="text-sm text-white/60">No menu available.</p>
                ) : (
                  venueData.menus.map((menu) => (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => {
                        setSelectedMenuId(menu.id);
                        setIsMenuModalOpen(true);
                        setIsQuickMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2 text-left"
                    >
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                        <Image src={menu.thumbnail} alt={menu.name} fill sizes="40px" className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{menu.name}</p>
                        <p className="text-xs text-white/60">{menu.images.length} pages</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isReviewSheetOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[110] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReviewSheetOpen(false)}
            />
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="fixed inset-x-0 bottom-0 z-[120] mx-auto w-full max-w-md rounded-t-3xl border-t border-white/15 bg-[#0a0d14]/95 p-4"
            >
              <h3 className="text-sm font-semibold text-white">Share your review</h3>
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={reviewAuthor}
                  onChange={(e) => setReviewAuthor(e.target.value)}
                  placeholder="Your name"
                  maxLength={28}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none"
                />
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none"
                >
                  <option value="5.0">Very satisfied</option>
                  <option value="4.8">Satisfied</option>
                  <option value="4.6">Okay, not bad</option>
                  <option value="4.3">Could be better</option>
                </select>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was the website and venue experience?"
                  maxLength={220}
                  rows={3}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none resize-none"
                />
              </div>
              {reviewStatus ? <p className="mt-2 text-xs text-white/70">{reviewStatus}</p> : null}
              {reviewReply ? (
                <div className="mt-2 rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2">
                  <p className="text-[11px] leading-relaxed text-white/80 whitespace-pre-line">{reviewReply}</p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={submitReview}
                disabled={reviewSubmitting}
                className="mt-3 w-full rounded-full border border-white/25 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {reviewSubmitting ? "Posting..." : "Post review"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isEventQuickBookOpen && selectedEvent && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[110] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEventQuickBookOpen(false)}
            />
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              className="fixed inset-x-0 top-0 z-[120] mx-auto w-full max-w-md rounded-b-3xl border-b border-white/15 bg-[#0b0f17]/95 p-4"
            >
              <h3 className="text-sm font-semibold text-white">Event Booking</h3>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/12 bg-white/[0.04] p-2">
                <div className="relative h-14 w-14 overflow-hidden rounded-lg">
                  <Image src={selectedEvent.imageUrl} alt={selectedEvent.title || "Event"} fill sizes="56px" className="object-cover" unoptimized />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{selectedEvent.title?.trim() || "Selected event"}</p>
                  <p className="truncate text-xs text-white/70">{guestEventDateLine(selectedEvent.eventDate)}</p>
                  {selectedEvent.description?.trim() && (
                    <p className="truncate text-xs text-white/60">{selectedEvent.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={eventBookName}
                  onChange={(e) => setEventBookName(e.target.value)}
                  placeholder="Name"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none"
                />
                <input
                  type="tel"
                  value={eventBookPhone}
                  onChange={(e) => setEventBookPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Mobile number"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none"
                />
                <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5">
                  <span className="text-sm text-white/80">No. of people</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEventBookPeople((p) => Math.max(1, p - 1))} className="h-7 w-7 rounded-md border border-white/20 text-white">-</button>
                    <span className="w-6 text-center text-sm font-semibold text-white">{eventBookPeople}</span>
                    <button type="button" onClick={() => setEventBookPeople((p) => Math.min(20, p + 1))} className="h-7 w-7 rounded-md border border-white/20 text-white">+</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["20:00", "21:00", "22:00", "23:00"] as const).map((slot) => {
                    const selected = eventBookTime === slot;
                    const label = slot === "20:00" ? "8 PM" : slot === "21:00" ? "9 PM" : slot === "22:00" ? "10 PM" : "11 PM";
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setEventBookTime(slot)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                          selected
                            ? "border-white/60 bg-white/15 text-white"
                            : "border-white/20 bg-white/[0.04] text-white/80"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {eventBookError && <p className="mt-2 text-xs text-red-300">{eventBookError}</p>}
              <button
                type="button"
                onClick={submitEventQuickBook}
                disabled={eventBookSubmitting}
                className="mt-3 w-full rounded-full border border-white/25 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {eventBookSubmitting ? "Booking..." : "Book Event"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showEventBookedToast && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="fixed inset-0 z-[130] flex items-center justify-center px-4"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 rgba(34,197,94,0)",
                  "0 0 28px rgba(34,197,94,0.55)",
                  "0 0 0 rgba(34,197,94,0)",
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-full max-w-sm rounded-2xl border border-emerald-400/50 bg-emerald-500/20 px-5 py-4 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300 bg-emerald-500/35">
                  <svg className="h-6 w-6 text-emerald-100" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-emerald-50">Event booked successfully</p>
                  <p className="text-sm text-emerald-100/90">WhatsApp confirmation sent.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
