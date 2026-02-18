"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import type { Brand } from "@/lib/brands";

const AUTO_SLIDE_MS = 3800;
const PAUSE_AFTER_INTERACTION_MS = 4000;

export type HeroOffer = {
  id: string;
  imageUrl: string;
  title: string;
  description: string | null;
  startDate?: string;
  endDate?: string;
};

const DESCRIPTION_PLACEHOLDERS = [
  "New offers dropping soon 👀✨",
  "Stay tuned — next offer goes live soon 🎉",
];

const PLACEHOLDER_TITLE = "No offers right now";
const PLACEHOLDER_DESC = "Check back soon";

interface EventsOffersHeroProps {
  offers: HeroOffer[];
  brand: Brand;
}

/** 9:16 card width (vw) so left/right peek ~12% each */
const CARD_WIDTH_VW = 76;
const CARD_GAP_PX = 12;
const HERO_MAX_HEIGHT_VH = 72;

export default function EventsOffersHero({ offers, brand }: EventsOffersHeroProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    dragFree: false,
    loop: true,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasRealOffers = offers.length > 0;
  const displayOffers = hasRealOffers ? offers : [{
    id: "placeholder",
    imageUrl: "",
    title: PLACEHOLDER_TITLE,
    description: PLACEHOLDER_DESC,
  } as HeroOffer];
  const total = displayOffers.length;
  const currentOffer = displayOffers[selectedIndex];

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi && total > 0) emblaApi.scrollTo(index % total);
    },
    [emblaApi, total]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const pauseAutoSlide = useCallback(() => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      pauseTimeoutRef.current = null;
    }, PAUSE_AFTER_INTERACTION_MS);
  }, []);

  useEffect(() => {
    if (!hasRealOffers || isPaused || !emblaApi) return;
    const id = setInterval(() => {
      scrollTo(emblaApi.selectedScrollSnap() + 1);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(id);
  }, [hasRealOffers, isPaused, emblaApi, scrollTo]);

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="w-full bg-black/40 backdrop-blur-sm border-b border-white/10 relative overflow-hidden"
      style={{ maxHeight: `${HERO_MAX_HEIGHT_VH}vh` }}
    >
      {/* Blur background from active card image */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: currentOffer?.imageUrl
              ? `url(${currentOffer.imageUrl})`
              : `linear-gradient(135deg, ${brand.accentColor}30 0%, black 50%)`,
            filter: "blur(20px) brightness(0.3)",
            opacity: 0.6,
          }}
        />
      </div>

      <div className="relative z-10 py-4 sm:py-5">
        {/* Carousel: 9:16 cards, constrained so CTA fits in viewport */}
        <div
          className="overflow-hidden"
          ref={emblaRef}
          onTouchStart={pauseAutoSlide}
          onPointerDown={pauseAutoSlide}
        >
          <div
            className="flex touch-pan-x items-center"
            style={{
              gap: CARD_GAP_PX,
              paddingLeft: "12vw",
              paddingRight: "12vw",
            }}
          >
            {displayOffers.map((offer, i) => (
              <div
                key={offer.id}
                className="flex-shrink-0 min-w-0 rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-black/30"
                style={{
                  width: `${CARD_WIDTH_VW}vw`,
                  aspectRatio: "9/16",
                  maxHeight: `min(calc(${HERO_MAX_HEIGHT_VH}vh - 120px), 420px)`,
                }}
              >
                <div className="relative w-full h-full">
                  {offer.imageUrl ? (
                    <Image
                      src={offer.imageUrl}
                      alt={offer.title}
                      fill
                      sizes="(max-width: 640px) 76vw, 380px"
                      className="object-cover"
                      priority={i === 0}
                      loading={i === 0 ? "eager" : "lazy"}
                      quality={85}
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBRIhMQYTQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEEA/AL2n6hcxWcEa3EoVY1UDeeAB+aKKVbYwJhn/2Q=="
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(180deg, ${brand.accentColor}40 0%, black 100%)`,
                      }}
                    >
                      <p className="text-white/80 text-sm font-medium px-4 text-center">
                        {PLACEHOLDER_TITLE}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Title + description under poster (always visible) */}
        <div className="mt-3 px-4 min-h-[3.25rem]">
          <h2 className="text-white font-bold text-sm sm:text-base uppercase tracking-tight line-clamp-1">
            {currentOffer.title}
          </h2>
          <p className="text-white/70 text-xs sm:text-sm mt-0.5 line-clamp-2">
            {currentOffer.description?.trim() ||
              DESCRIPTION_PLACEHOLDERS[selectedIndex % DESCRIPTION_PLACEHOLDERS.length]}
          </p>
          {currentOffer.startDate || currentOffer.endDate ? (
            <p className="text-white/50 text-[10px] sm:text-xs mt-1">
              {[currentOffer.startDate, currentOffer.endDate].filter(Boolean).join(" • ")}
            </p>
          ) : null}
        </div>

        {/* Pagination dots + index */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex items-center gap-1.5">
              {displayOffers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => {
                    scrollTo(i);
                    pauseAutoSlide();
                  }}
                  className={`h-1.5 rounded-full transition-all touch-manipulation ${
                    i === selectedIndex ? "bg-white w-5" : "bg-white/40 w-1.5 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
            <span
              className="ml-2 text-[10px] sm:text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full tabular-nums"
              style={{ color: `${brand.accentColor}dd` }}
            >
              {selectedIndex + 1}/{total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
