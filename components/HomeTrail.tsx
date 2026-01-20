"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useScroll, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BRANDS, Brand } from "@/lib/brands";

interface VenueData {
  brandId: string;
  coverImage: string | null;
  loading: boolean;
}

interface HomeTrailProps {
  venues?: Brand[];
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
  const [venuePositions, setVenuePositions] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const venueRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track scroll progress
  const scrollProgress = useMotionValue(0);
  const pathLength = useMotionValue(0);
  const pathLengthSpring = useSpring(pathLength, {
    stiffness: 100,
    damping: 30,
  });

  // Path glow intensity based on scroll
  const pathGlow = useTransform(scrollProgress, [0, 1], [0.1, 1]);
  const pathGlowColor = useTransform(
    scrollProgress,
    [0, 0.5, 1],
    ["rgba(255, 255, 255, 0.15)", "rgba(251, 191, 36, 0.7)", "rgba(251, 191, 36, 0.9)"]
  );
  const glowOpacity = useTransform(pathGlow, (v) => v * 0.2);

  // Fetch cover images in background
  useEffect(() => {
    const fetchCovers = async () => {
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
        if (i + batchSize < venues.length) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    };

    fetchCovers();
  }, [venues]);

  // Calculate curved vertical path
  useEffect(() => {
    if (!containerRef.current) return;

    const calculatePath = () => {
      const container = containerRef.current;
      if (!container) return;

      const nodes = container.querySelectorAll('[data-venue-node]');
      if (nodes.length === 0) {
        setTimeout(calculatePath, 100);
        return;
      }

      const pathPoints: { x: number; y: number }[] = [];
      const positions: number[] = [];
      const centerX = container.offsetWidth / 2;

      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeY = rect.top - containerRect.top + rect.height / 2;
        pathPoints.push({ x: centerX, y: relativeY });
        positions.push(relativeY);
      });

      if (pathPoints.length < 2) return;

      setVenuePositions(positions);

      // Create smooth curved path with slight curves
      let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
      for (let i = 1; i < pathPoints.length; i++) {
        const prev = pathPoints[i - 1];
        const curr = pathPoints[i];
        const midY = (prev.y + curr.y) / 2;
        // Add slight curve for visual interest
        const curveOffset = 15;
        const controlX1 = prev.x + (i % 2 === 0 ? curveOffset : -curveOffset);
        const controlX2 = curr.x + (i % 2 === 0 ? -curveOffset : curveOffset);
        path += ` C ${controlX1} ${prev.y}, ${controlX2} ${midY}, ${curr.x} ${midY}`;
        path += ` C ${controlX2} ${midY}, ${controlX1} ${curr.y}, ${curr.x} ${curr.y}`;
      }

      setLinePath(path);
    };

    const timer = setTimeout(calculatePath, 150);
    const resizeTimer = setTimeout(calculatePath, 500);

    window.addEventListener('resize', calculatePath);

    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', calculatePath);
    };
  }, [venues, venuesData]);

  // Animate path based on scroll
  useEffect(() => {
    if (linePath && pathRef.current && containerRef.current) {
      const length = pathRef.current.getTotalLength();
      const container = containerRef.current;
      
      const updatePath = () => {
        if (!container) return;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;
        pathLength.set(length * progress);
        scrollProgress.set(progress);
      };

      const handleScroll = () => {
        requestAnimationFrame(updatePath);
      };

      container.addEventListener('scroll', handleScroll, { passive: true });
      updatePath();

      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [linePath, pathLength, scrollProgress]);

  const handleExplore = (brandId: string) => {
    router.push(`/${brandId}`);
  };

  const getLogoPath = (brandId: string) => {
    return brandId.startsWith('club-rogue')
      ? '/logos/club-rogue.png'
      : `/logos/${brandId}.png`;
  };

  // Track active venue based on scroll
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!containerRef.current || venuePositions.length === 0) return;

    const updateActiveVenue = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const scrollTop = container.scrollTop;
      const viewportCenter = scrollTop + container.clientHeight / 2;
      
      let newActiveIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < venuePositions.length; i++) {
        const distance = Math.abs(viewportCenter - venuePositions[i]);
        if (distance < minDistance && distance < 200) {
          minDistance = distance;
          newActiveIndex = i;
        }
      }

      if (newActiveIndex !== activeIndex) {
        setActiveIndex(newActiveIndex);
      }
    };

    const handleScroll = () => {
      requestAnimationFrame(updateActiveVenue);
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveVenue();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [venuePositions, activeIndex]);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Minimal Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8">
            <Image
              src="/logos/bassik.png"
              alt="Bassik"
              fill
              className="object-contain"
              priority
              sizes="32px"
            />
          </div>
          <h1 className="text-base sm:text-lg font-semibold text-white">Venues</h1>
        </div>
      </div>

      {/* Pathway Container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-y-auto"
        style={{ height: 'calc(100vh - 50px)', maxHeight: 'calc(100vh - 50px)' }}
      >
        <div className="relative max-w-2xl mx-auto px-4 pb-20">
          {/* SVG Pathway - The Hero Element */}
          {linePath && (
            <svg
              className="absolute left-0 top-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {/* Base path (dark) */}
              <path
                ref={pathRef}
                d={linePath}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Glowing path (scroll-driven) */}
              <motion.path
                d={linePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  pathLength: pathLengthSpring,
                  color: pathGlowColor,
                }}
                className="drop-shadow-lg"
              />
              
              {/* Outer glow */}
              <motion.path
                d={linePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  pathLength: pathLengthSpring,
                  color: pathGlowColor,
                  opacity: glowOpacity,
                }}
              />
            </svg>
          )}

          {/* Venue Nodes - Centered, Minimal */}
          <div className="relative z-10 space-y-8 sm:space-y-10">
            {venues.map((brand, index) => {
              const venueData = venuesData.find((v) => v.brandId === brand.id);
              const coverImage = venueData?.coverImage;
              const logoPath = getLogoPath(brand.id);
              const isActive = activeIndex === index;
              const isPast = activeIndex > index;

              return (
                <motion.div
                  key={brand.id}
                  ref={(el) => {
                    venueRefs.current[index] = el;
                  }}
                  data-venue-node
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                  className="flex flex-col items-center text-center"
                >
                  {/* Venue Name */}
                  <motion.h2
                    className="text-lg sm:text-xl font-bold text-white mb-3"
                    animate={{
                      scale: isActive ? 1.05 : 1,
                      opacity: isPast ? 0.5 : isActive ? 1 : 0.7,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                      color: isActive ? brand.accentColor : 'white',
                      textShadow: isActive ? `0 0 20px ${brand.accentColor}60` : 'none',
                    }}
                  >
                    {brand.shortName}
                  </motion.h2>

                  {/* Cover Image - Small, Rectangular, Rounded */}
                  <motion.button
                    onClick={() => handleExplore(brand.id)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative w-48 sm:w-56 h-32 sm:h-36 rounded-lg overflow-hidden mb-3 group"
                    animate={{
                      scale: isActive ? 1.02 : 1,
                      opacity: isPast ? 0.6 : isActive ? 1 : 0.8,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                      boxShadow: isActive
                        ? `0 8px 32px ${brand.accentColor}40`
                        : '0 4px 16px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={brand.shortName}
                        fill
                        sizes="(max-width: 640px) 192px, 224px"
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        loading={index < 3 ? "eager" : "lazy"}
                        quality={80}
                        unoptimized
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${brand.accentColor}40, ${brand.accentColor}60)`,
                        }}
                      >
                        <div className="relative w-16 h-16">
                          <Image
                            src={logoPath}
                            alt={brand.shortName}
                            fill
                            className="object-contain opacity-70"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {/* Subtle overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </motion.button>

                  {/* Description */}
                  <motion.p
                    className="text-xs sm:text-sm text-gray-400 mb-3 max-w-xs mx-auto"
                    animate={{
                      opacity: isPast ? 0.4 : isActive ? 0.9 : 0.6,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {brand.description || "Premium dining & nightlife experience"}
                  </motion.p>

                  {/* Minimal CTA */}
                  <motion.button
                    onClick={() => handleExplore(brand.id)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs sm:text-sm font-medium flex items-center gap-1.5"
                    animate={{
                      opacity: isPast ? 0.5 : isActive ? 1 : 0.7,
                    }}
                    transition={{ duration: 0.3 }}
                    style={{
                      color: isActive ? brand.accentColor : 'rgba(255, 255, 255, 0.7)',
                    }}
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
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
