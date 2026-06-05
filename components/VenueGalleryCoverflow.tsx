"use client";

import Image from "next/image";
import { motion, type PanInfo } from "framer-motion";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type VenueGalleryCoverflowProps = {
  images: string[];
  /** Brand accent color (hex) — used for active dot indicator + soft glow. */
  accentColor?: string;
  /** When provided, the active card opens the gallery; side cards advance. */
  onOpenGallery?: () => void;
};

const AUTO_MS = 3800;
const VISIBLE_RANGE = 2;
const CARD_W_PCT = 60;
const CARD_MAX_W = 260;

export default function VenueGalleryCoverflow({
  images,
  accentColor = "#34d399",
  onOpenGallery,
}: VenueGalleryCoverflowProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  /** iOS Safari breaks 3D rotateY — keep coverflow layout flat on touch devices. */
  const [flatLayout, setFlatLayout] = useState(true);
  const total = images.length;

  useEffect(() => {
    const coarse = window.matchMedia("(hover: none) and (pointer: coarse)");
    const apply = () => setFlatLayout(coarse.matches);
    apply();
    coarse.addEventListener("change", apply);
    return () => coarse.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    setActive((a) => (a >= total ? 0 : a));
  }, [total]);

  useEffect(() => {
    if (paused || total <= 1 || reducedMotion) return;
    const id = window.setInterval(() => {
      setActive((a) => (a + 1) % total);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, total, reducedMotion]);

  if (total === 0) return null;

  const goPrev = () => setActive((a) => (a - 1 + total) % total);
  const goNext = () => setActive((a) => (a + 1) % total);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    if (dx < -60) goNext();
    else if (dx > 60) goPrev();
  };

  return (
    <div
      className="relative w-full min-w-0 select-none overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{ backgroundColor: `${accentColor}24` }}
        aria-hidden
      />

      <div
        className="relative mx-auto h-[280px] w-full max-w-[min(100%,28rem)] overflow-hidden sm:h-[320px]"
        style={flatLayout ? undefined : { perspective: "1200px" }}
      >
        {images.map((url, i) => {
          let offset = i - active;
          if (offset > total / 2) offset -= total;
          else if (offset < -total / 2) offset += total;
          const abs = Math.abs(offset);
          if (abs > VISIBLE_RANGE) return null;

          const xPx = offset * (flatLayout ? 52 : 56);
          const scale = abs === 0 ? 1 : Math.max(0.62, 0.82 - (abs - 1) * 0.12);
          const rotateY = flatLayout || reducedMotion ? 0 : -offset * 26;
          const zIndex = 30 - abs;
          const opacity = Math.max(0.15, 1 - abs * 0.22);
          const isActive = abs === 0;

          return (
            <motion.div
              key={url + i}
              className="absolute left-1/2 top-1/2 origin-center will-change-transform"
              style={{
                width: `${CARD_W_PCT}%`,
                maxWidth: CARD_MAX_W,
                aspectRatio: "4 / 5",
                zIndex,
                pointerEvents: "auto",
                transformStyle: flatLayout ? undefined : "preserve-3d",
              }}
              initial={false}
              animate={{
                x: `calc(-50% + ${xPx}px)`,
                y: "-50%",
                scale,
                rotateY,
                opacity,
              }}
              transition={{
                type: "spring",
                damping: 28,
                stiffness: 220,
                mass: 0.9,
              }}
              drag={isActive ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={handleDragEnd}
            >
              <button
                type="button"
                onClick={() => {
                  if (isActive) onOpenGallery?.();
                  else if (offset > 0) goNext();
                  else goPrev();
                }}
                className={`relative block h-full w-full overflow-hidden rounded-[1.5rem] bg-black/70 ring-1 ring-white/14 transition-shadow ${
                  isActive
                    ? "shadow-[0_30px_64px_-20px_rgba(0,0,0,0.95)]"
                    : "shadow-[0_18px_40px_-22px_rgba(0,0,0,0.85)]"
                } ${isActive && onOpenGallery ? "cursor-zoom-in" : "cursor-pointer"}`}
                aria-label={isActive ? "Open gallery" : `Show photo ${i + 1}`}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 60vw, 260px"
                  unoptimized
                  priority={isActive}
                />
                {!isActive && <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {images.map((_, i) => {
          const activeDot = i === active;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className="h-1.5 rounded-full transition-[width,background-color] duration-300"
              style={{
                width: activeDot ? 22 : 6,
                backgroundColor: activeDot ? accentColor : "rgba(255,255,255,0.18)",
              }}
              aria-label={`Photo ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
