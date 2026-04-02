"use client";

import { useEffect, useMemo, useState } from "react";
import type { HomeReview } from "@/lib/home-reviews";

function ratingLabel(r: number): string {
  return `${Math.round(r * 10) / 10}★`;
}

type HomeReviewsSectionProps = {
  initialReviews?: HomeReview[];
};

export default function HomeReviewsSection({ initialReviews }: HomeReviewsSectionProps) {
  const [reviews, setReviews] = useState<HomeReview[]>(() => initialReviews ?? []);
  const [loading, setLoading] = useState(() => initialReviews === undefined);

  useEffect(() => {
    if (initialReviews !== undefined) return;
    let cancelled = false;
    fetch("/api/home/reviews")
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((data: { reviews?: HomeReview[] }) => {
        if (cancelled) return;
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialReviews]);

  const sliderItems = useMemo(() => (reviews.length > 0 ? reviews : []), [reviews]);

  return (
    <section className="px-4 sm:px-6 mb-12 sm:mb-14" aria-label="Guest reviews">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-14 z-10 bg-gradient-to-r from-black to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-14 z-10 bg-gradient-to-l from-black to-transparent" />

          {loading ? (
            <div className="px-4 py-6 text-xs text-stone-500">Loading reviews...</div>
          ) : sliderItems.length === 0 ? (
            <div className="px-4 py-6 text-xs text-stone-500">No reviews yet. Be the first to add one.</div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide py-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div
                className="inline-flex w-max animate-ticker hover:[animation-play-state:paused]"
                style={{ animationDuration: "108s" }}
              >
                {[...sliderItems, ...sliderItems].map((r, idx) => (
                  <article
                    key={`${r.id}-${idx}`}
                    className="mx-2 shrink-0 rounded-xl border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 shadow-[0_14px_30px_-20px_rgba(255,255,255,0.35)]"
                    style={{ width: idx % 3 === 0 ? 270 : idx % 2 === 0 ? 232 : 248 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-stone-200 truncate">{r.author}</p>
                      <p className="text-[10px] text-amber-300 font-semibold">{ratingLabel(r.rating)}</p>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-0.5">{r.outletName}</p>
                    <p className="text-[11px] text-stone-300 mt-1.5 leading-relaxed line-clamp-3">{r.reviewText}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
