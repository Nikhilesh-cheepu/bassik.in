"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { VenueOffer } from "@/lib/venue-offers";
import type { Brand } from "@/lib/brands";

const AUTO_SLIDE_MS = 3800;
const PAUSE_AFTER_INTERACTION_MS = 4000;

const DESCRIPTION_PLACEHOLDERS = [
  "New offers dropping soon 👀✨",
  "Stay tuned — next offer goes live soon 🎉",
];

interface EventsOffersHeroProps {
  offers: VenueOffer[];
  brand: Brand;
}

export default function EventsOffersHero({ offers, brand }: EventsOffersHeroProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = offers.length;
  const hasOffers = total > 0;
  const currentOffer = hasOffers ? offers[index] : null;

  const goTo = useCallback(
    (next: number) => {
      if (!hasOffers) return;
      setIndex((i) => (next + total) % total);
    },
    [hasOffers, total]
  );

  const pauseAutoSlide = useCallback(() => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      pauseTimeoutRef.current = null;
    }, PAUSE_AFTER_INTERACTION_MS);
  }, []);

  useEffect(() => {
    if (!hasOffers || isPaused) return;
    const id = setInterval(() => goTo(index + 1), AUTO_SLIDE_MS);
    return () => clearInterval(id);
  }, [hasOffers, isPaused, index, goTo]);

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const threshold = 50;
      const velocity = info.velocity.x;
      if (info.offset.x < -threshold || velocity < -200) goTo(index + 1);
      else if (info.offset.x > threshold || velocity > 200) goTo(index - 1);
      setDragOffset(0);
      pauseAutoSlide();
    },
    [index, goTo, pauseAutoSlide]
  );

  if (!hasOffers) {
    return (
      <div className="w-full bg-black/40 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-sm mx-auto px-4 py-6 sm:py-8">
          <div
            className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center"
            style={{ aspectRatio: "3/4" }}
          >
            <p className="text-white/70 text-sm font-medium px-6 text-center">
              No offers right now
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full bg-black/40 backdrop-blur-sm border-b border-white/10"
    >
      <div className="max-w-sm mx-auto px-4 pt-4 pb-2 sm:pt-5 sm:pb-3">
        {/* Carousel container - 3:4 ratio, slightly smaller height for text below */}
        <div
          className="relative w-full mx-auto rounded-2xl overflow-hidden"
          style={{ aspectRatio: "3/4", maxHeight: "min(58vh, 420px)" }}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={index}
              drag="x"
              dragConstraints={{ left: -120, right: 120 }}
              dragElastic={0.15}
              onDrag={(_, info) => setDragOffset(info.offset.x)}
              onDragEnd={handleDragEnd}
              onTouchStart={pauseAutoSlide}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              initial={{ opacity: 0, x: 20, scale: 0.98 }}
              animate={{
                opacity: 1,
                x: dragOffset,
                scale: 1,
              }}
              exit={{ opacity: 0, x: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl border border-white/10">
                <Image
                  src={currentOffer!.imageUrl}
                  alt={currentOffer!.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 400px"
                  className="object-cover"
                  priority={index === 0}
                  loading={index === 0 ? "eager" : "lazy"}
                  quality={82}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Title + description under poster (always visible) */}
        <div className="mt-3 px-1 min-h-[3.5rem]">
          <h2 className="text-white font-bold text-sm sm:text-base uppercase tracking-tight line-clamp-1">
            {currentOffer!.title}
          </h2>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5 line-clamp-2">
            {currentOffer!.description?.trim() || DESCRIPTION_PLACEHOLDERS[index % DESCRIPTION_PLACEHOLDERS.length]}
          </p>
          {(currentOffer!.startDate || currentOffer!.endDate) && (
            <p className="text-white/50 text-[10px] sm:text-xs mt-1">
              {[currentOffer!.startDate, currentOffer!.endDate].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>

        {/* Pagination: dots + index pill (only if more than one) */}
        {total > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="flex items-center gap-1.5">
            {offers.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => {
                  setIndex(i);
                  pauseAutoSlide();
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === index
                    ? "bg-white w-3"
                    : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
          <span
            className="ml-2 text-[10px] sm:text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full tabular-nums"
            style={{ color: `${brand.accentColor}dd` }}
          >
            {index + 1}/{total}
          </span>
        </div>
        )}
      </div>
    </div>
  );
}
