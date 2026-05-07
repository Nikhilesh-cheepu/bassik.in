"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type VenueGalleryOrbitProps = {
  images: string[];
  /** Brand accent — used for the soft glow behind the spotlight. */
  accentColor?: string;
  /** When provided, every card becomes clickable. */
  onOpenGallery?: () => void;
};

const SPOTLIGHT_MS = 2400;
const MAX_TILES = 16;

/**
 * Two concentric rings with offset angles → tightly packed circle.
 * Inner ring: 6 tiles at ~28% radius, offset 30° from outer ring.
 * Outer ring: 10 tiles at ~45% radius, every 36°.
 * Falls back to a single ring when there are fewer than 9 images.
 */
type Slot = { idx: number; leftPct: number; topPct: number };

function buildSlots(total: number): Slot[] {
  const slots: Slot[] = [];
  if (total === 0) return slots;

  if (total <= 9) {
    const r = 39;
    for (let i = 0; i < total; i += 1) {
      const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
      slots.push({
        idx: i,
        leftPct: 50 + Math.cos(angle) * r,
        topPct: 50 + Math.sin(angle) * r,
      });
    }
    return slots;
  }

  const innerCount = 6;
  const outerCount = Math.min(10, total - innerCount);
  const innerR = 28;
  const outerR = 45;
  const innerOffsetDeg = 30;

  for (let i = 0; i < innerCount; i += 1) {
    const angle = ((i / innerCount) * 360 + innerOffsetDeg - 90) * (Math.PI / 180);
    slots.push({
      idx: i,
      leftPct: 50 + Math.cos(angle) * innerR,
      topPct: 50 + Math.sin(angle) * innerR,
    });
  }
  for (let i = 0; i < outerCount; i += 1) {
    const angle = ((i / outerCount) * 360 - 90) * (Math.PI / 180);
    slots.push({
      idx: innerCount + i,
      leftPct: 50 + Math.cos(angle) * outerR,
      topPct: 50 + Math.sin(angle) * outerR,
    });
  }
  return slots;
}

export default function VenueGalleryOrbit({
  images,
  accentColor = "#34d399",
  onOpenGallery,
}: VenueGalleryOrbitProps) {
  const reducedMotion = usePrefersReducedMotion();
  const capped = useMemo(() => images.slice(0, MAX_TILES), [images]);
  const slots = useMemo(() => buildSlots(capped.length), [capped.length]);
  const [spotlight, setSpotlight] = useState(0);

  /** Spotlight cycles through ALL images so even those past the orbit cap get airtime. */
  useEffect(() => {
    if (images.length <= 1) {
      setSpotlight(0);
      return;
    }
    setSpotlight((i) => (i >= images.length ? 0 : i));
    const id = window.setInterval(() => {
      setSpotlight((i) => (i + 1) % images.length);
    }, SPOTLIGHT_MS);
    return () => window.clearInterval(id);
  }, [images.length]);

  if (capped.length === 0) return null;

  const spotlightUrl = images[spotlight] ?? images[0];

  return (
    <div className="relative w-full">
      <div
        className="relative mx-auto aspect-square w-full max-w-[min(100%,30rem)]"
        suppressHydrationWarning
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: `${accentColor}26` }}
          aria-hidden
        />

        {slots.map(({ idx, leftPct, topPct }) => {
          const url = capped[idx];
          if (!url) return null;
          const isActiveInOrbit = idx === spotlight && spotlight < capped.length;
          const delay = reducedMotion ? 0 : (idx % 5) * 0.42;

          return (
            <div
              key={url + idx}
              className="absolute z-[1]"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            >
              <motion.div
                className="-translate-x-1/2 -translate-y-1/2"
                initial={false}
                animate={
                  reducedMotion
                    ? {}
                    : {
                        y: [0, -3, 0],
                        rotate: [-0.9, 0.9, -0.9],
                      }
                }
                transition={{
                  repeat: Infinity,
                  duration: 9 + ((idx % 4) + 3) * 0.85,
                  delay,
                  ease: "easeInOut",
                }}
              >
                <button
                  type="button"
                  onClick={onOpenGallery}
                  disabled={!onOpenGallery}
                  className={`relative block h-12 w-12 overflow-hidden rounded-2xl bg-black/40 ring-1 transition-[transform,box-shadow,opacity] hover:-translate-y-0.5 sm:h-14 sm:w-14 ${
                    onOpenGallery ? "cursor-zoom-in" : "cursor-default"
                  } ${
                    isActiveInOrbit
                      ? "opacity-50 ring-white/8"
                      : "opacity-100 ring-white/12 hover:ring-white/22"
                  }`}
                  style={{
                    boxShadow: "0 10px 28px -14px rgba(0,0,0,0.85)",
                  }}
                  aria-label="Open gallery"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized
                  />
                </button>
              </motion.div>
            </div>
          );
        })}

        <div className="absolute left-1/2 top-1/2 z-10 aspect-square w-[34%] max-w-[9rem] -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={onOpenGallery}
            disabled={!onOpenGallery}
            className={`relative h-full w-full overflow-hidden rounded-[1.4rem] bg-black/70 ring-1 ring-white/14 shadow-[0_24px_60px_-22px_rgba(0,0,0,0.9)] ${
              onOpenGallery ? "cursor-zoom-in" : "cursor-default"
            }`}
            aria-label="Open gallery"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={spotlightUrl}
                initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.98 }}
                transition={{ duration: reducedMotion ? 0.08 : 0.5 }}
                className="absolute inset-0"
              >
                <Image
                  src={spotlightUrl}
                  alt="Gallery highlight"
                  fill
                  className="object-cover"
                  sizes="220px"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>
    </div>
  );
}
