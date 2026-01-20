"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";
import { BRANDS, Brand } from "@/lib/brands";

// Component for segment path to avoid hook issues
function SegmentPath({
  d,
  segmentIndex,
  pathProgressSpring,
  venuesLength,
  connectorHeight,
  pathGlowColor,
  pathGlowOpacity,
  strokeWidth,
  blur,
}: {
  d: string;
  segmentIndex: number;
  pathProgressSpring: MotionValue<number>;
  venuesLength: number;
  connectorHeight: number;
  pathGlowColor: MotionValue<string>;
  pathGlowOpacity: MotionValue<number>;
  strokeWidth: string;
  blur: string;
}) {
  const segmentProgress = useTransform(
    pathProgressSpring,
    (v) => {
      const segmentStart = segmentIndex / venuesLength;
      const segmentEnd = (segmentIndex + 1) / venuesLength;
      if (v < segmentStart) return 0;
      if (v > segmentEnd) return 1;
      return (v - segmentStart) / (segmentEnd - segmentStart);
    }
  );
  
  const dashOffset = useTransform(
    segmentProgress,
    (v) => connectorHeight * 2 * (1 - v)
  );

  return (
    <motion.path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        strokeDasharray: connectorHeight * 2,
        strokeDashoffset: dashOffset,
        color: pathGlowColor,
        opacity: pathGlowOpacity,
        filter: `blur(${blur})`,
      }}
    />
  );
}

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
  const [venueHeights, setVenueHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const venueRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track scroll progress
  const scrollProgress = useMotionValue(0);
  const pathProgress = useMotionValue(0);
  const pathProgressSpring = useSpring(pathProgress, {
    stiffness: 50,
    damping: 30,
  });

  // Path glow based on scroll
  const pathGlowOpacity = useTransform(pathProgressSpring, [0, 1], [0.12, 0.7]);
  const pathGlowColor = useTransform(
    pathProgressSpring,
    [0, 0.5, 1],
    ["rgba(255, 255, 255, 0.12)", "rgba(251, 191, 36, 0.5)", "rgba(251, 191, 36, 0.7)"]
  );
  const outerGlowOpacity = useTransform(pathGlowOpacity, (v) => v * 0.3);

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

  // Measure venue heights and update scroll progress
  useEffect(() => {
    if (!containerRef.current) return;

    const updateHeights = () => {
      const heights: number[] = [];
      venueRefs.current.forEach((ref) => {
        if (ref) {
          heights.push(ref.offsetHeight);
        }
      });
      setVenueHeights(heights);
    };

    const updateScroll = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;
      scrollProgress.set(progress);
      pathProgress.set(progress);
    };

    const handleScroll = () => {
      requestAnimationFrame(updateScroll);
    };

    const timer = setTimeout(updateHeights, 200);
    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    updateScroll();

    window.addEventListener('resize', updateHeights);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeights);
    };
  }, [venues, venuesData, scrollProgress, pathProgress]);

  // Track active venue
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!containerRef.current || venueHeights.length === 0) return;

    const updateActiveVenue = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const scrollTop = container.scrollTop;
      const viewportCenter = scrollTop + container.clientHeight / 2;
      
      let cumulativeHeight = 0;
      let newActiveIndex = -1;

      for (let i = 0; i < venueHeights.length; i++) {
        const venueHeight = venueHeights[i];
        const connectorHeight = 160; // Height of connector segment
        const venueCenter = cumulativeHeight + venueHeight / 2;
        
        if (Math.abs(viewportCenter - venueCenter) < 150) {
          newActiveIndex = i;
          break;
        }
        
        cumulativeHeight += venueHeight + connectorHeight;
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
  }, [venueHeights, activeIndex]);

  const handleExplore = (brandId: string) => {
    router.push(`/${brandId}`);
  };

  const getLogoPath = (brandId: string) => {
    return brandId.startsWith('club-rogue')
      ? '/logos/club-rogue.png'
      : `/logos/${brandId}.png`;
  };

  // Generate S-curve path segment (centered at x=20)
  const generateSCurve = (height: number) => {
    const centerX = 20;
    const startY = 0;
    const endY = height;
    const midY = height / 2;
    const curveOffset = 20; // S-curve amplitude
    
    // Smooth S-curve using cubic bezier
    return `M ${centerX} ${startY} 
            C ${centerX + curveOffset} ${startY}, ${centerX - curveOffset} ${midY}, ${centerX} ${midY}
            C ${centerX + curveOffset} ${midY}, ${centerX - curveOffset} ${endY}, ${centerX} ${endY}`;
  };
  

  const connectorHeight = 160; // Height of each connector segment

  return (
    <div className="min-h-screen bg-black relative">
      {/* Subtle vignette background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-black/95" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/30" />
      </div>

      {/* Minimal Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-3">
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
        <div className="relative max-w-[360px] mx-auto px-4 pb-20">
          {/* Venue Blocks and Connectors */}
          <div className="relative">
            {venues.map((brand, index) => {
              const venueData = venuesData.find((v) => v.brandId === brand.id);
              const coverImage = venueData?.coverImage;
              const logoPath = getLogoPath(brand.id);
              const isActive = activeIndex === index;
              const isPast = activeIndex > index;

              return (
                <div key={brand.id} className="relative">
                  {/* Venue Block */}
                  <motion.div
                    ref={(el) => {
                      venueRefs.current[index] = el;
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: isActive ? 1.02 : 1,
                    }}
                    transition={{
                      delay: index * 0.05,
                      duration: 0.4,
                      ease: "easeOut",
                      scale: { duration: 0.3 },
                    }}
                    className="flex flex-col items-center text-center py-6"
                  >
                    {/* Venue Name */}
                    <motion.h2
                      className="text-xl sm:text-2xl font-semibold text-white mb-3"
                      animate={{
                        opacity: isPast ? 0.5 : isActive ? 1 : 0.7,
                      }}
                      transition={{ duration: 0.3 }}
                      style={{
                        color: isActive ? brand.accentColor : 'white',
                        textShadow: isActive ? `0 0 15px ${brand.accentColor}40` : 'none',
                      }}
                    >
                      {brand.shortName}
                    </motion.h2>

                    {/* Cover Image - Compact */}
                    <motion.button
                      onClick={() => handleExplore(brand.id)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative w-[240px] sm:w-[260px] h-[130px] sm:h-[150px] rounded-lg overflow-hidden mb-3 group"
                      animate={{
                        opacity: isPast ? 0.6 : isActive ? 1 : 0.85,
                        boxShadow: isActive
                          ? `0 6px 24px ${brand.accentColor}30, 0 0 0 1px ${brand.accentColor}20`
                          : '0 2px 8px rgba(0, 0, 0, 0.4)',
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {coverImage ? (
                        <Image
                          src={coverImage}
                          alt={brand.shortName}
                          fill
                          sizes="(max-width: 640px) 240px, 260px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                          <div className="relative w-14 h-14">
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
                      {/* Subtle overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </motion.button>

                    {/* Description - 1 line, truncated */}
                    <motion.p
                      className="text-xs sm:text-sm text-gray-400 mb-3 max-w-[280px] mx-auto truncate"
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
                      whileHover={{ x: 3 }}
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

                  {/* Connector Path Segment - Between venues (not after last) */}
                  {index < venues.length - 1 && (
                    <div
                      className="relative flex items-center justify-center"
                      style={{ height: `${connectorHeight}px` }}
                    >
                      {/* SVG S-curve path */}
                      <svg
                        className="absolute left-1/2 -translate-x-1/2"
                        width="40"
                        height={connectorHeight}
                        viewBox={`0 0 40 ${connectorHeight}`}
                        style={{ zIndex: 0 }}
                      >
                        {/* Base path (low opacity) */}
                        <path
                          d={generateSCurve(connectorHeight)}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.12)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          transform="translate(20, 0)"
                        />
                        
                        {/* Active glowing path */}
                        <SegmentPath
                          d={generateSCurve(connectorHeight)}
                          segmentIndex={index}
                          pathProgressSpring={pathProgressSpring}
                          venuesLength={venues.length}
                          connectorHeight={connectorHeight}
                          pathGlowColor={pathGlowColor}
                          pathGlowOpacity={pathGlowOpacity}
                          strokeWidth="2.5"
                          blur="0.5px"
                        />
                        
                        {/* Outer glow */}
                        <SegmentPath
                          d={generateSCurve(connectorHeight)}
                          segmentIndex={index}
                          pathProgressSpring={pathProgressSpring}
                          venuesLength={venues.length}
                          connectorHeight={connectorHeight}
                          pathGlowColor={pathGlowColor}
                          pathGlowOpacity={outerGlowOpacity}
                          strokeWidth="6"
                          blur="2px"
                        />
                        
                        {/* Node dots */}
                        <circle
                          cx="20"
                          cy="0"
                          r="3"
                          fill="rgba(255, 255, 255, 0.2)"
                        />
                        <motion.circle
                          cx="20"
                          cy={connectorHeight}
                          r="3"
                          fill="currentColor"
                          style={{
                            color: pathGlowColor,
                            opacity: pathGlowOpacity,
                          }}
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
