"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-24">
        {/* Hero Image - Starts from top */}
        <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden bg-gray-200">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : coverImages.length > 0 ? (
            coverImages.map((image, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <Image
                  src={image}
                  alt={`${selectedBrand.shortName} cover ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {/* Gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>
            ))
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-500">Cover images are empty</p>
              <p className="text-sm mt-1 text-gray-400">Upload cover images via admin panel</p>
            </div>
          )}
          
          {/* Outlet Dropdown - Overlay on hero */}
          <div className="absolute top-4 left-0 right-0 z-20 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Select Outlet
                </label>
                <div className="relative">
                  <select
                    value={selectedBrandId}
                    onChange={(e) => {
                      setSelectedBrandId(e.target.value);
                      setCurrentImageIndex(0);
                    }}
                    className="w-full px-4 py-2.5 pr-10 text-sm font-semibold bg-white border-2 rounded-lg text-gray-900 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer shadow-sm"
      style={{ 
                      borderColor: selectedBrand.accentColor + "40",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = selectedBrand.accentColor;
                      e.target.style.boxShadow = `0 0 0 4px ${selectedBrand.accentColor}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = selectedBrand.accentColor + "40";
                      e.target.style.boxShadow = "";
                    }}
                  >
                    {BRANDS.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.shortName}
                        {brand.id.startsWith("club-rogue") && ` - ${brand.name.split("–")[1]?.trim()}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
            </div>
              </div>
            </div>
          </div>

          {/* Image indicators */}
          {coverImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
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
        <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
          {/* Menu Section - Compact Image Thumbnails */}
          <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Menu</h2>
            {venueData.menus.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">Menu section is empty</p>
                <p className="text-sm mt-1">Upload menu images via admin panel</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {venueData.menus.map((menu) => (
                  <button
                    key={menu.id}
                    onClick={() => {
                      setSelectedMenuId(menu.id);
                      setIsMenuModalOpen(true);
                    }}
                    className="relative aspect-[4/3] overflow-hidden rounded-lg group"
                  >
                    <Image
                      src={menu.thumbnail}
                      alt={menu.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-bold text-sm mb-0.5">{menu.name}</h3>
                      <p className="text-white/90 text-xs">{menu.images.length} pages</p>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Gallery Section - Premium Grid */}
          <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Photos</h2>
            {venueData.galleryImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">Gallery is empty</p>
                <p className="text-sm mt-1">Upload gallery images via admin panel</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {venueData.galleryImages.slice(0, 6).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setGalleryStartIndex(index);
                      setIsGalleryModalOpen(true);
                    }}
                    className={`relative aspect-square overflow-hidden rounded-xl ${
                      index === 0 ? "col-span-2 row-span-2" : ""
                    } group`}
                  >
                    <Image
                      src={image}
                      alt={`Gallery ${index + 1}`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {index === 5 && venueData.galleryImages.length > 6 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl group-hover:bg-black/70 transition-colors">
                        <span>+{venueData.galleryImages.length - 6}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Location Section - Premium */}
          <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 mb-4 overflow-hidden">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Location</h2>
            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
              <a
                href={venueData.location.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-64 bg-gray-200 relative block hover:bg-gray-300 transition-colors group"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-2 group-hover:text-orange-500 transition-colors"
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
                    <p className="text-sm text-gray-600 font-medium group-hover:text-orange-500 transition-colors">Click to view location</p>
                    <p className="text-xs text-gray-500 mt-1">Opens in Google Maps</p>
                  </div>
            </div>
              </a>
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0"
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
                  <div>
                    <p className="text-sm text-gray-700 font-medium">{venueData.location.address}</p>
                    <a
                      href={venueData.location.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-500 hover:text-orange-600 mt-1 inline-block"
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Animated Book Now Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 shadow-2xl">
        <button
          onClick={handleBookNow}
          className="w-full text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transform animate-pulse hover:animate-none relative overflow-hidden group"
          style={{ 
            backgroundColor: selectedBrand.accentColor,
            boxShadow: `0 10px 30px ${selectedBrand.accentColor}40`
          }}
        >
          {/* Shine animation effect */}
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
          
          {/* Button content */}
          <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
            <svg className="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Book a table
          </span>
        </button>
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
          images={venueData.galleryImages}
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
