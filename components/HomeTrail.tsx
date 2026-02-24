"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BRANDS, Brand } from "@/lib/brands";

const ROTATE_INTERVAL_MS = 2500;
const FADE_DURATION_MS = 500;

interface VenueData {
  brandId: string;
  galleryImages: string[];
  loading: boolean;
}

interface HomeTrailProps {
  venues?: Brand[];
}

const VENUE_ORDER = [
  "the-hub",
  "alehouse",
  "boiler-room",
  "c53",
  "kiik69",
  "skyhy",
  "club-rogue-gachibowli",
  "club-rogue-kondapur",
  "club-rogue-jubilee-hills",
  "sound-of-soul",
  "thezenzspot",
  "firefly",
];

const BLUR_PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AkgD/2Q==";

function VenueCardImage({
  galleryImages,
  brand,
  index,
  priority,
}: {
  galleryImages: string[];
  brand: Brand;
  index: number;
  priority: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const images = galleryImages.slice(0, 3);

  useEffect(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % images.length);
    }, ROTATE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div
        className="absolute inset-0 rounded-[18px]"
        style={{
          background: `linear-gradient(135deg, ${brand.accentColor}25 0%, ${brand.accentColor}45 50%, rgba(0,0,0,0.4) 100%)`,
        }}
      />
    );
  }

  return (
    <>
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 rounded-[18px] overflow-hidden"
          style={{
            opacity: i === currentIndex ? 1 : 0,
            transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
            zIndex: i === currentIndex ? 1 : 0,
          }}
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover"
            style={{ objectFit: "cover" }}
            loading={priority ? "eager" : "lazy"}
            quality={85}
            priority={priority && i === 0}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            onLoad={() => setLoaded((p) => ({ ...p, [i]: true }))}
            unoptimized={src.startsWith("blob:")}
          />
          {!loaded[i] && (
            <div
              className="absolute inset-0 animate-pulse rounded-[18px]"
              style={{
                background: `linear-gradient(135deg, ${brand.accentColor}15, rgba(0,0,0,0.3))`,
              }}
            />
          )}
        </div>
      ))}
    </>
  );
}

export default function HomeTrail({ venues = BRANDS }: HomeTrailProps) {
  const orderedVenues = useMemo(
    () =>
      [...venues].sort((a, b) => {
        const indexA = VENUE_ORDER.indexOf(a.id);
        const indexB = VENUE_ORDER.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }),
    [venues]
  );

  const [venuesData, setVenuesData] = useState<VenueData[]>(() =>
    orderedVenues.map((brand) => ({
      brandId: brand.id,
      galleryImages: [],
      loading: true,
    }))
  );

  const venueIdsKey = orderedVenues.map((v) => v.id).join(",");

  useEffect(() => {
    if (orderedVenues.length === 0) return;

    let cancelled = false;

    const fetchGalleries = async () => {
      const results = await Promise.all(
        orderedVenues.map(async (brand) => {
          try {
            const res = await fetch(`/api/venues/${brand.id}`, {
              cache: "force-cache",
              headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
            });
            if (res.ok) {
              const data = await res.json();
              const gallery: string[] = Array.isArray(data.venue?.galleryImages)
                ? data.venue.galleryImages
                : [];
              return {
                brandId: brand.id,
                galleryImages: gallery.filter((u): u is string => typeof u === "string"),
                loading: false,
              };
            }
          } catch {
            /* ignore */
          }
          return { brandId: brand.id, galleryImages: [], loading: false };
        })
      );

      if (!cancelled) {
        setVenuesData(
          orderedVenues.map((brand) => {
            const r = results.find((x) => x.brandId === brand.id);
            return r ?? { brandId: brand.id, galleryImages: [], loading: false };
          })
        );
      }
    };

    fetchGalleries();

    return () => {
      cancelled = true;
    };
  }, [venueIdsKey, orderedVenues]);

  const getLogoPath = (brand: Brand) =>
    brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0 opacity-35"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(236, 72, 153, 0.18) 0%, transparent 45%)",
              "radial-gradient(circle at 80% 50%, rgba(14, 165, 233, 0.16) 0%, transparent 45%)",
              "radial-gradient(circle at 50% 20%, rgba(244, 114, 182, 0.18) 0%, transparent 45%)",
              "radial-gradient(circle at 20% 50%, rgba(236, 72, 153, 0.18) 0%, transparent 45%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 opacity-25"
          animate={{
            background: [
              "radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.14) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 80%, rgba(94, 234, 212, 0.12) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.14) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-6 sm:pb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm sm:text-base font-medium text-gray-400 mb-4"
          >
            Venues
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight bg-gradient-to-r from-pink-400 via-amber-300 to-sky-300 bg-clip-text text-transparent"
          >
            YOU NAME IT, WE HAVE IT
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto"
          >
            Website bookings unlock better deals than Swiggy/Zomato
          </motion.p>
        </div>

        {/* Venues Grid */}
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {orderedVenues.map((brand, index) => {
              const venueData = venuesData.find((v) => v.brandId === brand.id);
              const galleryImages = venueData?.galleryImages ?? [];
              const logoPath = getLogoPath(brand);

              return (
                <motion.div
                  key={brand.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="flex flex-col items-center text-center"
                >
                  <Link
                    href={`/${brand.id}`}
                    prefetch={false}
                    className="flex flex-col items-center text-center w-full group/card"
                    style={{ touchAction: "manipulation" }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full rounded-[18px] overflow-hidden relative cursor-pointer"
                      style={{
                        aspectRatio: "16 / 9",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)",
                      }}
                    >
                      <div className="absolute inset-0 rounded-[18px]">
                        {venueData?.loading ? (
                          <div
                            className="absolute inset-0 rounded-[18px] animate-pulse"
                            style={{
                              background: `linear-gradient(135deg, ${brand.accentColor}20, rgba(0,0,0,0.5))`,
                            }}
                          />
                        ) : (
                          <VenueCardImage
                            galleryImages={galleryImages}
                            brand={brand}
                            index={index}
                            priority={index < 6}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/10 transition-colors rounded-[18px]" />
                      </div>
                    </motion.div>

                    {/* Venue name centered at bottom */}
                    <div className="mt-2.5 flex flex-col items-center gap-0.5 w-full">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/5">
                          <Image
                            src={logoPath}
                            alt=""
                            fill
                            sizes="20px"
                            className="object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-white/95 line-clamp-1">
                          {brand.shortName}
                        </span>
                      </div>
                      {brand.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-1 max-w-full">
                          {brand.description.split("•")[0]?.trim() || brand.description}
                        </p>
                      )}
                      <span
                        className="text-[11px] font-medium mt-0.5 flex items-center gap-1"
                        style={{ color: brand.accentColor + "CC" }}
                      >
                        Explore
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
