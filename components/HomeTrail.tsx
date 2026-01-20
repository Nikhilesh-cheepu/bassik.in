"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { BRANDS, Brand } from "@/lib/brands";

interface VenueData {
  brandId: string;
  coverImage: string | null;
  loading: boolean;
}

interface HomeTrailProps {
  venues?: Brand[]; // Optional prop to allow filtering
}

export default function HomeTrail({ venues = BRANDS }: HomeTrailProps) {
  const router = useRouter();
  const [venuesData, setVenuesData] = useState<VenueData[]>(
    venues.map((brand) => ({
      brandId: brand.id,
      coverImage: null,
      loading: true,
    }))
  );
  const [linePath, setLinePath] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  // Animate line drawing
  const pathLength = useMotionValue(0);
  const pathLengthSpring = useSpring(pathLength, {
    stiffness: 100,
    damping: 30,
  });
  const opacity = useTransform(pathLengthSpring, [0, 0.1], [0, 1]);
  const glowOpacity = useTransform(pathLengthSpring, (v) => v > 0 ? 0.3 : 0);

  // Fetch cover images in background - optimized for performance
  useEffect(() => {
    const fetchCovers = async () => {
      // Fetch in small batches to avoid overwhelming
      const batchSize = 2;
      for (let i = 0; i < venues.length; i += batchSize) {
        const batch = venues.slice(i, i + batchSize);
        const promises = batch.map(async (brand) => {
          try {
            const res = await fetch(`/api/venues/${brand.id}`, {
              cache: 'force-cache',
            });
            if (res.ok) {
              const data = await res.json();
              const coverImages = data.venue?.coverImages || [];
              setVenuesData(prev =>
                prev.map(item =>
                  item.brandId === brand.id
                    ? {
                        ...item,
                        coverImage: coverImages.length > 0 ? coverImages[0] : null,
                        loading: false,
                      }
                    : item
                )
              );
            } else {
              setVenuesData(prev =>
                prev.map(item =>
                  item.brandId === brand.id ? { ...item, loading: false } : item
                )
              );
            }
          } catch (error) {
            setVenuesData(prev =>
              prev.map(item =>
                item.brandId === brand.id ? { ...item, loading: false } : item
              )
            );
          }
        });
        await Promise.all(promises);
        // Small delay between batches to avoid blocking
        if (i + batchSize < venues.length) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    };

    fetchCovers();
  }, [venues]);

  // Calculate vertical path after mount
  useEffect(() => {
    if (!containerRef.current) return;

    const calculatePath = () => {
      const container = containerRef.current;
      if (!container) return;

      const cards = container.querySelectorAll('[data-venue-card]');
      if (cards.length === 0) {
        // Retry after a short delay if cards aren't ready
        setTimeout(calculatePath, 100);
        return;
      }

      const pathPoints: { x: number; y: number }[] = [];
      const centerX = container.offsetWidth / 2;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeY = rect.top - containerRect.top + rect.height / 2;
        pathPoints.push({ x: centerX, y: relativeY });
      });

      if (pathPoints.length < 2) return;

      // Create smooth vertical path
      let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
      for (let i = 1; i < pathPoints.length; i++) {
        const prev = pathPoints[i - 1];
        const curr = pathPoints[i];
        path += ` L ${prev.x} ${curr.y}`;
      }

      setLinePath(path);
    };

    // Calculate after layout is ready
    const timer = setTimeout(calculatePath, 150);
    const resizeTimer = setTimeout(calculatePath, 500); // Also recalculate after images load

    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
    };
  }, [venues, venuesData]);

  // Animate path drawing
  useEffect(() => {
    if (linePath && pathRef.current) {
      const length = pathRef.current.getTotalLength();
      pathLength.set(length);
      pathLength.set(0);
      pathLength.set(length);
    }
  }, [linePath, pathLength]);

  const handleExplore = (brandId: string) => {
    router.push(`/${brandId}`);
  };

  const getLogoPath = (brandId: string) => {
    return brandId.startsWith('club-rogue')
      ? '/logos/club-rogue.png'
      : `/logos/${brandId}.png`;
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-orange-900/10 via-purple-900/10 to-pink-900/10"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />

      {/* Compact Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10">
              <Image
                src="/logos/bassik.png"
                alt="Bassik"
                fill
                className="object-contain"
                priority
                sizes="40px"
              />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Venues</h1>
          </div>
        </div>
      </div>

      {/* Vertical Trail Container */}
      <div
        ref={containerRef}
        className="relative max-w-4xl mx-auto px-4 sm:px-6 pb-12"
      >
        {/* SVG Path Line */}
        {linePath && (
          <svg
            className="absolute left-0 top-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            <motion.path
              ref={pathRef}
              d={linePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/20"
              style={{
                pathLength: pathLengthSpring,
                opacity,
              }}
            />
            {/* Glow effect */}
            <motion.path
              d={linePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/10"
              style={{
                pathLength: pathLengthSpring,
                opacity: glowOpacity,
              }}
            />
          </svg>
        )}

        {/* Venue Cards */}
        <div className="relative z-10 space-y-4 sm:space-y-5">
          {venues.map((brand, index) => {
            const venueData = venuesData.find((v) => v.brandId === brand.id);
            const coverImage = venueData?.coverImage;
            const logoPath = getLogoPath(brand.id);

            return (
              <motion.div
                key={brand.id}
                data-venue-card
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.4,
                  ease: "easeOut",
                }}
                className="flex items-center justify-center"
              >
                <motion.button
                  onClick={() => handleExplore(brand.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group w-full max-w-md mx-auto flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
                  style={{
                    boxShadow: `0 4px 20px ${brand.accentColor}10`,
                  }}
                >
                  {/* Hover glow */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle at center, ${brand.accentColor}15, transparent 70%)`,
                    }}
                  />

                  {/* Thumbnail/Logo */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10">
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={brand.shortName}
                        fill
                        sizes="(max-width: 640px) 64px, 80px"
                        className="object-cover"
                        loading={index < 3 ? "eager" : "lazy"}
                        quality={75}
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                          <Image
                            src={logoPath}
                            alt={brand.shortName}
                            fill
                            className="object-contain opacity-60"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate">
                        {brand.shortName}
                      </h3>
                      {brand.tag && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white flex-shrink-0"
                          style={{ backgroundColor: `${brand.accentColor}80` }}
                        >
                          {brand.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mb-2 line-clamp-1">
                      {brand.description || "Premium dining & nightlife experience"}
                    </p>
                    <motion.div
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: brand.accentColor }}
                      whileHover={{ x: 2 }}
                    >
                      Explore
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </motion.div>
                  </div>
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
