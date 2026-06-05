"use client";

import { motion } from "framer-motion";
import VenueGalleryCoverflow from "@/components/VenueGalleryCoverflow";

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
  const showInstagram =
    typeof instagramUrl === "string" && instagramUrl.trim() && instagramUrl !== "#";

  const skeletonOrbit = (
    <div
      className="relative mx-auto h-[280px] w-full max-w-[min(100%,28rem)] sm:h-[320px]"
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-[calc(50%+30%)] -translate-y-1/2 rounded-[1.5rem] bg-white/[0.04] animate-pulse"
        style={{ width: "60%", maxWidth: 260, aspectRatio: "4 / 5", transform: "translate(-50%, -50%) scale(0.8)" }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] bg-white/[0.07] animate-pulse"
        style={{ width: "60%", maxWidth: 260, aspectRatio: "4 / 5" }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-[1.5rem] bg-white/[0.04] animate-pulse"
        style={{ width: "60%", maxWidth: 260, aspectRatio: "4 / 5", transform: "translate(calc(-50% + 30%), -50%) scale(0.8)" }}
      />
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
      className="w-full min-w-0 overflow-hidden px-1 py-2"
    >
      {loading ? (
        skeletonOrbit
      ) : !hasImages ? (
        emptyGalleryCard
      ) : (
        <VenueGalleryCoverflow
          images={images}
          accentColor={accentColor}
          onOpenGallery={onOpenGallery}
        />
      )}
    </motion.section>
  );
}
