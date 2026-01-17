"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BRANDS } from "@/lib/brands";
import VenueEditor from "@/components/admin/VenueEditor";

interface Admin {
  id: string;
  username: string;
  role: string;
  venuePermissions: string[];
}

interface Venue {
  id: string;
  brandId: string;
  name: string;
  shortName: string;
  address: string;
  mapUrl: string | null;
  images: any[];
  menus: any[];
}

export default function VenuesPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) {
          router.push("/admin");
          return;
        }
        const data = await res.json();
        setAdmin(data.admin);
        loadVenues();
      } catch (error) {
        router.push("/admin");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const loadVenues = async () => {
    try {
      const res = await fetch("/api/admin/venues");
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
    // Update selectedVenue if it still exists
    if (selectedVenue) {
      const res = await fetch("/api/admin/venues");
      if (res.ok) {
        const data = await res.json();
        const updatedVenue = data.venues?.find((v: Venue) => v.brandId === selectedVenue.brandId);
        if (updatedVenue) {
          setSelectedVenue(updatedVenue);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  if (selectedVenue) {
    return (
      <VenueEditor
        venue={selectedVenue}
        admin={admin}
        onBack={handleBack}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Venues</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Select a venue to manage its content
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {BRANDS.map((brand) => {
            // Check if admin can access this venue
            const canAccess =
              admin.role === "MAIN_ADMIN" ||
              admin.venuePermissions.includes(brand.id);

            if (!canAccess) {
              return null;
            }

            const venue = venues.find((v) => v.brandId === brand.id);

            return (
              <button
                key={brand.id}
                onClick={() => {
                  if (venue) {
                    handleVenueSelect(venue);
                  } else {
                    // Create venue if it doesn't exist
                    handleVenueSelect({
                      id: "",
                      brandId: brand.id,
                      name: brand.name,
                      shortName: brand.shortName,
                      address: "",
                      mapUrl: null,
                      images: [],
                      menus: [],
                    });
                  }
                }}
                className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Image
                      src={`/logos/${brand.id}.png`}
                      alt={brand.shortName}
                      width={48}
                      height={48}
                      className="object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: brand.accentColor }}
                  >
                    {venue ? "Configured" : "New"}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {brand.shortName}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{brand.name}</p>
                {venue && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Cover: {venue.images.filter((i) => i.type === "COVER").length} images</p>
                    <p>Gallery: {venue.images.filter((i) => i.type === "GALLERY").length} images</p>
                    <p>Menus: {venue.menus.length} menus</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
