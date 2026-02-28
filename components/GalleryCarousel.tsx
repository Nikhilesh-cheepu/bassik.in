"use client";

import Image from "next/image";

interface GalleryCarouselProps {
  images: string[];
  accentColor?: string;
  onViewAll?: () => void;
}

/**
 * Build row content as two identical halves for seamless -50% translate loop.
 * Repeats images so each half has at least 4 tiles (~2x viewport coverage), then duplicates once.
 */
function buildMarqueeItems<T>(list: T[]): T[] {
  if (list.length === 0) return [];
  let half: T[] = [];
  const minTilesPerHalf = 4;
  while (half.length < minTilesPerHalf) half.push(...list);
  return [...half, ...half];
}

export default function GalleryCarousel({
  images,
  accentColor = "#f97316",
  onViewAll,
}: GalleryCarouselProps) {
  if (images.length === 0) {
    return (
      <div className="aspect-video w-full bg-white/5 flex items-center justify-center rounded-2xl">
        <p className="text-sm text-white/50">No photos</p>
      </div>
    );
  }

  /* Two identical halves so -50% translate loops seamlessly; enough tiles to cover ~2x viewport */
  const rowItems = buildMarqueeItems(images);

  const tileClass =
    "flex-shrink-0 w-[min(280px,42vw)] aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-lg";

  return (
    <div className="group/marquee w-full min-w-0 overflow-hidden">
      {/* Row A: moves left */}
      <div className="flex overflow-hidden" style={{ marginBottom: "0.5rem" }}>
        <div
          className="flex gap-3 py-0.5 animate-marquee-left group-hover/marquee:[animation-play-state:paused]"
          style={{ width: "max-content" }}
        >
          {rowItems.map((src, i) => (
            <div key={`a-${i}`} className={tileClass}>
              <Image
                src={src}
                alt=""
                width={280}
                height={157}
                sizes="(max-width: 768px) 42vw, 280px"
                className="h-full w-full object-cover"
                unoptimized
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Row B: moves right */}
      <div className="flex overflow-hidden">
        <div
          className="flex gap-3 py-0.5 animate-marquee-right group-hover/marquee:[animation-play-state:paused]"
          style={{ width: "max-content" }}
        >
          {rowItems.map((src, i) => (
            <div key={`b-${i}`} className={tileClass}>
              <Image
                src={src}
                alt=""
                width={280}
                height={157}
                sizes="(max-width: 768px) 42vw, 280px"
                className="h-full w-full object-cover"
                unoptimized
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {onViewAll && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-white/70 hover:text-white transition-colors touch-manipulation"
            style={{ color: accentColor }}
          >
            View all →
          </button>
        </div>
      )}
    </div>
  );
}
