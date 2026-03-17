"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { BRANDS } from "@/lib/brands";
import VenueEditor from "@/components/admin/VenueEditor";
import AdminShell from "@/components/admin/AdminShell";

type VenueContact = { phone: string; label?: string };

type VenueOffer = {
  id: string;
  imageUrl: string;
  endDate: string | null;
  createdAt?: string;
};

interface Venue {
  id: string;
  brandId: string;
  name: string;
  shortName: string;
  address: string;
  mapUrl: string | null;
  contactPhone?: string | null;
  contactNumbers?: VenueContact[] | null;
  images: any[];
  menus: any[];
  offers?: VenueOffer[];
}

export default function VenuesPageClient() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  const loadVenues = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/venues", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.venues || [];
        setVenues(list);
        return list;
      }
      return [];
    } catch (error) {
      console.error("Error loading venues:", error);
      return [];
    }
  }, []);

  useEffect(() => {
    setLoading(false);
    loadVenues();
  }, [loadVenues]);

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue);
  };

  const handleBack = async () => {
    setSelectedVenue(null);
    await loadVenues();
  };

  const handleSave = useCallback(async () => {
    const list = await loadVenues();
    if (selectedVenue && list.length > 0) {
      const updatedVenue = list.find((v: Venue) => v.brandId === selectedVenue.brandId);
      if (updatedVenue) setSelectedVenue(updatedVenue);
    }
  }, [loadVenues, selectedVenue]);

  if (loading) {
    return (
      <AdminShell title="Venues">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-500/60 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-400">Loading venues…</p>
          </div>
        </div>
      </AdminShell>
    );
  }

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
    <AdminShell title="Manage Venues">
      <main className="pb-8 pt-2">
        <div className="mb-4 text-xs text-slate-400">
          Configure logos, galleries, offers, discounts and contact numbers for each outlet.
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {BRANDS.map((brand) => {
            const venue = venues.find((v) => v.brandId === brand.id);
            const offersCount = venue?.offers?.length ?? 0;
            const galleryCount = venue?.images?.filter((i) => i.type === "GALLERY").length ?? 0;
            const menuCount = venue?.menus?.length ?? 0;

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
                      images: [],
                      menus: [],
                      offers: [],
                    });
                  }
                }}
                className="group text-left rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.9)] transition-all hover:-translate-y-0.5 hover:border-slate-500/70 hover:bg-slate-900"
              >
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800/80 ring-1 ring-slate-700/80 sm:h-14 sm:w-14">
                    <Image
                      src={brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`)}
                      alt={brand.shortName}
                      fill
                      sizes="56px"
                      className="object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="w-full flex-1 min-w-0">
                    <h3 className="mb-0.5 truncate text-xs font-semibold text-slate-50 sm:text-sm">
                      {brand.shortName}
                    </h3>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium text-slate-950"
                      style={{ backgroundColor: brand.accentColor }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-950/60" />
                      {venue ? "Configured" : "New"}
                    </span>
                  </div>
                  {venue && (
                    <div className="mt-1 w-full space-y-0.5 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-2 py-1">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                          Offers
                        </span>
                        <span className="font-semibold text-slate-100">{offersCount}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-2 py-1">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                          Gallery
                        </span>
                        <span className="font-semibold text-slate-100">{galleryCount}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-2 py-1">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Menus
                        </span>
                        <span className="font-semibold text-slate-100">{menuCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </AdminShell>
  );
}
