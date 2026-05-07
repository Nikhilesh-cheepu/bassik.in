"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { SiteGalleryRecord } from "@/lib/site-gallery-data";

/** Repeating bento pattern — 8-tile cycle (2-col mobile, 4-col md+). */
const BENTO_SPAN: { className: string }[] = [
  { className: "col-span-2 row-span-2 min-h-[200px] sm:min-h-[220px]" },
  { className: "col-span-1 row-span-1 min-h-[104px]" },
  { className: "col-span-1 row-span-1 min-h-[104px]" },
  { className: "col-span-2 row-span-1 min-h-[120px]" },
  { className: "col-span-1 row-span-2 min-h-[200px]" },
  { className: "col-span-1 row-span-1 min-h-[104px]" },
  { className: "col-span-1 row-span-1 min-h-[104px]" },
  { className: "col-span-2 row-span-1 min-h-[120px]" },
];

export default function GalleryMasonryClient({
  images,
}: {
  images: SiteGalleryRecord[];
}) {
  const prefersReduced = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const go = useCallback(
    (delta: number) => {
      if (images.length === 0 || openIndex === null) return;
      const next = (openIndex + delta + images.length) % images.length;
      setOpenIndex(next);
    },
    [images.length, openIndex]
  );

  useEffect(() => {
    if (openIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, go]);

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-8 text-center text-sm text-stone-400 leading-relaxed max-w-xl mx-auto">
        Nothing uploaded yet — when main admin loads images via{" "}
        <span className="text-emerald-300/95">/admin/dashboard/gallery</span>, this grid fills automatically after
        revalidation.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-3 md:auto-rows-[minmax(100px,auto)]">
        {images.map((img, i) => {
          const pattern = BENTO_SPAN[i % BENTO_SPAN.length] ?? BENTO_SPAN[0];
          const delayCap = Math.min(0.32, i * 0.04);
          const alt = img.alt?.trim() || `Gallery photo ${i + 1}`;
          return (
            <motion.button
              key={img.id}
              type="button"
              initial={{ opacity: 0, y: prefersReduced ? 0 : 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{ duration: prefersReduced ? 0.08 : 0.45, delay: delayCap }}
              onClick={() => setOpenIndex(i)}
              className={`group relative isolate overflow-hidden rounded-2xl border border-white/12 bg-black/40 text-left shadow-[0_12px_40px_-24px_rgba(0,0,0,0.85)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${pattern.className}`}
            >
              <Image
                src={img.url}
                alt={alt}
                fill
                className={`object-cover ${prefersReduced ? "" : "transition-transform duration-500 group-hover:scale-[1.05]"}`}
                sizes="(max-width: 768px) 50vw, 25vw"
                loading="lazy"
                decoding="async"
                unoptimized
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {openIndex !== null && images[openIndex] ? (
          <>
            <motion.button
              type="button"
              aria-hidden
              className="fixed inset-0 z-[75] bg-black/72 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Gallery viewer"
              className="fixed inset-x-0 bottom-0 z-[80] mx-auto max-h-[92dvh] w-full max-w-3xl rounded-t-3xl border border-white/14 bg-[#060a08]/98 p-5 shadow-[0_-16px_64px_rgba(0,0,0,0.75)]"
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              exit={{ y: "110%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
            >
              <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/25" />
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <p className="text-xs font-semibold tabular-nums text-white/80">
                  {openIndex + 1} / {images.length}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={(e) => {
                      e.stopPropagation();
                      go(-1);
                    }}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/15"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={(e) => {
                      e.stopPropagation();
                      go(1);
                    }}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/15"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    aria-label="Close gallery viewer"
                    onClick={close}
                    className="rounded-full border border-red-400/35 bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold text-red-100 hover:bg-red-500/25"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="relative mx-auto mt-4 h-[min(78dvh,720px)] w-full max-w-full pb-16">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={images[openIndex].url}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative h-full w-full"
                  >
                    <Image
                      src={images[openIndex].url}
                      alt={images[openIndex].alt?.trim() || "Gallery"}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      unoptimized
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/** Header strip for `/gallery` page */
export function GalleryPageHeaderBar() {
  return (
    <div className="mb-10 border-b border-emerald-500/15 pb-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500/90 hover:text-emerald-300 transition-colors mb-6"
      >
        ← Back
      </Link>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-500/85 mb-2">
        Hyderabad nights
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Full Gallery</h1>
      <div className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-emerald-500/35 to-transparent" />
    </div>
  );
}
