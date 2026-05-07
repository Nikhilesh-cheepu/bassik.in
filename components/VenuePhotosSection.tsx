"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface VenuePhotosSectionProps {
  loading: boolean;
  images: string[];
  onOpenGallery?: () => void;
  /** Brand accent — empty state + tile highlights */
  accentColor?: string;
  /** One line from venue copy (keeps dead sections intentional, not bare) */
  venueTagline?: string;
  outletShortName?: string;
  instagramUrl?: string | null;
  /** Full wa.me URL for “ask for photos” */
  photosRequestWhatsAppUrl?: string | null;
}

export default function VenuePhotosSection({
  loading,
  images,
  onOpenGallery,
  accentColor = "#60a5fa",
  venueTagline,
  outletShortName,
  instagramUrl,
  photosRequestWhatsAppUrl,
}: VenuePhotosSectionProps) {
  const hasImages = images.length > 0;
  const tileImages = hasImages ? images.slice(0, 6) : [];
  const remainingCount = hasImages ? Math.max(0, images.length - 6) : 0;
  const showInstagram =
    typeof instagramUrl === "string" && instagramUrl.trim() && instagramUrl !== "#";

  const skeletonGrid = (
    <div className="grid grid-cols-3 gap-2" aria-hidden>
      <div className="col-span-2 row-span-2 h-44 rounded-2xl bg-gradient-to-br from-white/12 via-white/[0.06] to-white/[0.02] animate-pulse" />
      <div className="h-[86px] rounded-2xl bg-white/[0.07] animate-pulse" />
      <div className="h-[86px] rounded-2xl bg-white/[0.07] animate-pulse" />
      <div className="h-20 rounded-2xl bg-white/[0.05] animate-pulse" />
      <div className="h-20 rounded-2xl bg-white/[0.05] animate-pulse" />
      <div className="h-20 rounded-2xl bg-white/[0.05] animate-pulse" />
    </div>
  );

  const emptyGalleryCard = (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.08] via-black/40 to-black/70 p-5">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-35 blur-3xl"
        style={{ backgroundColor: accentColor }}
      />
      <div className="pointer-events-none absolute -bottom-14 -left-6 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Gallery</p>
        <h3 className="mt-2 text-lg font-semibold text-white leading-snug">Photos coming soon</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          {venueTagline
            ? `${venueTagline} Follow us or message the outlet for visuals in the meantime.`
            : `We're lining up visuals for ${outletShortName ?? "this spot"}. Follow us or message the outlet for snaps in the meantime.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {showInstagram ? (
            <a
              href={instagramUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.14]"
            >
              Instagram
            </a>
          ) : null}
          {photosRequestWhatsAppUrl ? (
            <a
              href={photosRequestWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                borderColor: `${accentColor}99`,
                backgroundColor: `${accentColor}38`,
                boxShadow: `0 0 20px ${accentColor}29`,
              }}
            >
              Ask for photos
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full min-w-0 overflow-x-hidden"
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 px-1">
        <h2 className="text-sm font-semibold text-white">Gallery</h2>
        {hasImages ? (
          <span className="text-[11px] font-medium text-white/45">
            {images.length === 1 ? "1 photo" : `${images.length} photos`}
            {onOpenGallery ? (
              <>
                {" "}
                ·{" "}
                <button type="button" className="text-white/65 underline underline-offset-2 hover:text-white" onClick={onOpenGallery}>
                  view all
                </button>
              </>
            ) : null}
          </span>
        ) : null}
      </div>
      {loading ? (
        skeletonGrid
      ) : !hasImages ? (
        emptyGalleryCard
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {tileImages.map((src, idx) => {
            const className =
              idx === 0
                ? "col-span-2 row-span-2 h-44 rounded-2xl"
                : idx === 1 || idx === 2
                  ? "h-[86px] rounded-2xl"
                  : "h-20 rounded-2xl";
            const isLastVisible = idx === tileImages.length - 1 && remainingCount > 0;
            return (
              <motion.button
                key={`${src}-${idx}`}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={onOpenGallery}
                disabled={!onOpenGallery}
                className={`group relative overflow-hidden bg-white/[0.06] ring-1 ring-white/[0.08] transition-[box-shadow,ring-color] hover:shadow-lg hover:ring-white/25 focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${className} ${onOpenGallery ? "" : "cursor-default"}`}
              >
                <Image src={src} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" sizes="(max-width: 768px) 100vw, 400px" unoptimized />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-70" />
                {isLastVisible && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold tracking-wide text-white backdrop-blur-[2px]">
                    +{remainingCount}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
