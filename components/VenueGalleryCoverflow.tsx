"use client";

import Image from "next/image";
import { useState } from "react";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import "swiper/css";

type VenueGalleryCoverflowProps = {
  images: string[];
  /** Brand accent color (hex) — used for active dot indicator + soft glow. */
  accentColor?: string;
  /** When provided, the active card opens the gallery; side cards advance. */
  onOpenGallery?: () => void;
};

const AUTO_MS = 3800;

export default function VenueGalleryCoverflow({
  images,
  accentColor = "#34d399",
  onOpenGallery,
}: VenueGalleryCoverflowProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const total = images.length;

  if (total === 0) return null;

  return (
    <div className="relative w-full min-w-0 select-none overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{ backgroundColor: `${accentColor}24` }}
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-[min(100%,28rem)] overflow-hidden px-1">
        <Swiper
          className="venue-gallery-swiper w-full"
          modules={[Autoplay]}
          loop={total > 1}
          centeredSlides
          slidesPerView={1.12}
          spaceBetween={12}
          speed={420}
          grabCursor
          allowTouchMove
          autoplay={
            reducedMotion || total <= 1
              ? false
              : {
                  delay: AUTO_MS,
                  disableOnInteraction: true,
                  pauseOnMouseEnter: true,
                }
          }
          onSlideChange={(sw) => setActive(sw.realIndex)}
        >
          {images.map((url, i) => (
            <SwiperSlide key={`${url}-${i}`} className="!h-auto">
              <button
                type="button"
                onClick={() => onOpenGallery?.()}
                disabled={!onOpenGallery}
                className={`relative mx-auto block w-full max-w-[260px] overflow-hidden rounded-[1.5rem] bg-black/70 ring-1 ring-white/14 shadow-[0_24px_56px_-24px_rgba(0,0,0,0.92)] ${
                  onOpenGallery ? "cursor-zoom-in" : "cursor-default"
                }`}
                style={{ aspectRatio: "4 / 5" }}
                aria-label={onOpenGallery ? "Open gallery" : `Photo ${i + 1}`}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 72vw, 260px"
                  unoptimized
                  priority={i === 0}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {total > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {images.map((_, i) => {
            const activeDot = i === active;
            return (
              <span
                key={i}
                className="h-1.5 rounded-full transition-[width,background-color] duration-300"
                style={{
                  width: activeDot ? 22 : 6,
                  backgroundColor: activeDot ? accentColor : "rgba(255,255,255,0.18)",
                }}
                aria-hidden
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
