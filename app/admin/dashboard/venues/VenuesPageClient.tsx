"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignOutButton } from "@clerk/nextjs";
import Image from "next/image";
import { BRANDS } from "@/lib/brands";
import VenueEditor from "@/components/admin/VenueEditor";

interface Venue {
  id: string;
  brandId: string;
  name: string;
  shortName: string;
  address: string;
  mapUrl: string | null;
  contactPhone?: string | null;
  contactNumbers?: { phone: string; label?: string }[] | null;
  coverVideoUrl?: string | null;
  images: any[];
  menus: any[];
}

export default function VenuesPageClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/admin");
        return;
      }
      setLoading(false);
      loadVenues();
    }
  }, [isLoaded, isSignedIn, router]);

  const loadVenues = async () => {
    try {
      const res = await fetch("/api/admin/venues", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setVenues(data.venues || []);
      }
    } catch (error) {
      console.error("Error loading venues:", error);
    }
  };

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue);
  };

  const handleBack = async () => {
    setSelectedVenue(null);
    await loadVenues();
  };

  const handleSave = async () => {
    await loadVenues();
    if (selectedVenue) {
      const res = await fetch("/api/admin/venues", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        const updatedVenue = data.venues?.find((v: Venue) => v.brandId === selectedVenue.brandId);
        if (updatedVenue) setSelectedVenue(updatedVenue);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoaded || !isSignedIn) return null;

  if (selectedVenue) {
    return (
      <VenueEditor
        venue={selectedVenue}
        admin={null}
        onBack={handleBack}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Manage Venues</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back
              </button>
              <SignOutButton>
                <button className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Logout
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {BRANDS.map((brand) => {
            const venue = venues.find((v) => v.brandId === brand.id);
            const coverCount = venue?.images.filter((i) => i.type === "COVER").length || 0;
            const galleryCount = venue?.images.filter((i) => i.type === "GALLERY").length || 0;
            const menuCount = venue?.menus.length || 0;

            return (
              <button
                key={brand.id}
                onClick={() => {
                  if (venue) {
                    handleVenueSelect(venue);
                  } else {
                    handleVenueSelect({
                      id: "",
                      brandId: brand.id,
                      name: brand.name,
                      shortName: brand.shortName,
                      address: "",
                      mapUrl: null,
                      contactPhone: null,
                      contactNumbers: null,
                      coverVideoUrl: null,
                      images: [],
                      menus: [],
                    });
                  }
                }}
                className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100 hover:shadow-md transition-all text-left"
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Image
                      src={brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`)}
                      alt={brand.shortName}
                      width={40}
                      height={40}
                      className="object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate mb-0.5">
                      {brand.shortName}
                    </h3>
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: brand.accentColor }}
                    >
                      {venue ? "✓" : "New"}
                    </span>
                  </div>
                  {venue && (
                    <div className="text-xs text-gray-500 space-y-0.5 w-full">
                      <div className="flex justify-between">
                        <span>C:</span>
                        <span className="font-medium">{coverCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>G:</span>
                        <span className="font-medium">{galleryCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>M:</span>
                        <span className="font-medium">{menuCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
