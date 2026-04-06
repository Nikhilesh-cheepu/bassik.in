"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import VenueEditor from "@/components/admin/VenueEditor";
import AdminShell from "@/components/admin/AdminShell";

type AdminMe = { scope: "main" | "outlet"; brandIds: string[] | null };

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

type VenuesPageClientProps = {
  /** When set (URL /venues/[brandId]), editor opens this outlet and reload keeps it. */
  initialBrandId?: string | null;
  /** Card grid only — use /admin/dashboard/venues/overview */
  mode?: "overview";
};

export default function VenuesPageClient({ initialBrandId = null, mode }: VenuesPageClientProps) {
  const router = useRouter();
  const isOverviewMode = mode === "overview";
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<AdminMe | null>(null);

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

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        if (d?.scope === "main" || d?.scope === "outlet") {
          setMe(d);
          return d as AdminMe;
        }
      }
    } catch {
      /* ignore */
    }
    const fallback: AdminMe = { scope: "main", brandIds: null };
    setMe(fallback);
    return fallback;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadMe(), loadVenues()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe, loadVenues]);

  const brandsForGrid = useMemo(() => {
    if (!me || me.scope === "main" || !me.brandIds?.length) return BRANDS;
    const allowed = new Set(me.brandIds);
    return BRANDS.filter((b) => allowed.has(b.id));
  }, [me]);

  const allowedBrandIdsForEditor =
    me?.scope === "outlet" && me.brandIds?.length ? me.brandIds : null;

  const blockedOutletUrl =
    Boolean(
      initialBrandId &&
        allowedBrandIdsForEditor &&
        !allowedBrandIdsForEditor.includes(initialBrandId)
    );

  useEffect(() => {
    if (!blockedOutletUrl || !allowedBrandIdsForEditor?.length) return;
    router.replace(`/admin/dashboard/venues/${allowedBrandIdsForEditor[0]}`);
  }, [blockedOutletUrl, allowedBrandIdsForEditor, router]);

  /** Editor venue derived from URL + list — no flash, refresh keeps the same outlet. */
  const venueFromUrl = useMemo((): Venue | null => {
    if (isOverviewMode || !initialBrandId || !me || blockedOutletUrl) return null;
    const brand = BRANDS.find((b) => b.id === initialBrandId);
    if (!brand) return null;
    const v = venues.find((x) => x.brandId === initialBrandId);
    return (
      v ?? {
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
      }
    );
  }, [isOverviewMode, initialBrandId, me, venues, blockedOutletUrl]);

  const handleVenueSelect = (venue: Venue) => {
    router.push(`/admin/dashboard/venues/${venue.brandId}`);
  };

  const handleBack = async () => {
    await loadVenues();
    router.push("/admin/dashboard/venues/overview");
  };

  const handleSave = useCallback(async () => {
    await loadVenues();
  }, [loadVenues]);

  if (loading) {
    return (
      <AdminShell title="Venues">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-600">Loading venues…</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (blockedOutletUrl) {
    return (
      <AdminShell title="Venues">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-600">Switching to your outlet…</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (venueFromUrl && !isOverviewMode) {
    return (
      <VenueEditor
        venue={venueFromUrl}
        admin={null}
        onBack={handleBack}
        onSave={handleSave}
        allowedBrandIds={allowedBrandIdsForEditor}
        venuesOverviewHref="/admin/dashboard/venues/overview"
        onSwitchBrandId={(brandId) => {
          if (allowedBrandIdsForEditor && !allowedBrandIdsForEditor.includes(brandId)) return;
          router.push(`/admin/dashboard/venues/${brandId}`);
        }}
      />
    );
  }

  return (
    <AdminShell title="Manage Venues">
      <main className="pb-8 pt-2">
        <div className="mb-4 flex flex-col gap-1 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Configure logos, galleries, offers, discounts and contact numbers for each outlet.</span>
          <span className="text-slate-500">
            Tip: opening <span className="font-mono text-[11px]">/admin/dashboard/venues</span> jumps straight into an
            outlet; use chips there to swipe between venues.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
          {brandsForGrid.map((brand) => {
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
                className="group text-left rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow"
              >
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 sm:h-14 sm:w-14">
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
                    <h3 className="mb-0.5 truncate text-xs font-semibold text-slate-900 sm:text-sm">
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
                    <div className="mt-1 w-full space-y-0.5 text-[11px] text-slate-600">
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-2 py-1">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                          Offers
                        </span>
                        <span className="font-semibold text-slate-700">{offersCount}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-2 py-1">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                          Gallery
                        </span>
                        <span className="font-semibold text-slate-700">{galleryCount}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-2 py-1">
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Menus
                        </span>
                        <span className="font-semibold text-slate-700">{menuCount}</span>
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
