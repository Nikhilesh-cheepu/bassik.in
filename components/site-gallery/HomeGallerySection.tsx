"use client";

import { motion } from "framer-motion";
import type { SiteGalleryRecord } from "@/lib/site-gallery-data";
import GalleryFloatingPreviewClient, {
  GalleryOpenFullLink,
} from "@/components/site-gallery/GalleryFloatingPreviewClient";

type Preview = Pick<SiteGalleryRecord, "url" | "alt">;

export default function HomeGallerySection({ preview }: { preview: Preview[] }) {
  const hasPhotos = preview.length > 0;

  return (
    <section
      id="gallery"
      className="scroll-mt-[4.75rem] sm:scroll-mt-20 border-y border-emerald-500/10 bg-[#030806] px-4 py-14 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="text-center mb-10 sm:mb-12"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-500/90 mb-3">
            Nightlife drops
          </p>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white px-2"
            style={{
              textShadow:
                "0 0 40px rgba(34,197,94,0.35), 0 0 80px rgba(16,185,129,0.15), 0 0 1px rgba(255,255,255,0.15)",
            }}
          >
            Gallery
          </h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="mt-3 mx-auto max-w-lg text-sm text-stone-500 leading-relaxed"
          >
            A living reel from floors and rooftops across Hyderabad — add shots anytime from{" "}
            <span className="text-emerald-200/85 font-medium">/admin/dashboard/gallery</span> once Blob + DB are
            wired.
          </motion.p>
        </motion.div>

        {hasPhotos ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{ staggerChildren: 0.06, delayChildren: 0.08 }}
            >
              <GalleryFloatingPreviewClient images={preview} />
              <GalleryOpenFullLink />
            </motion.div>
          </>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-center">
            <p className="text-sm text-stone-300 leading-relaxed">
              No public gallery shots yet — open{" "}
              <span className="text-emerald-300 font-medium whitespace-nowrap">/admin/dashboard/gallery</span>{" "}
              (main admin) after Vercel Blob and Postgres migrations are configured, upload a batch, this block
              comes alive instantly.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
