"use client";

import Image from "next/image";
import { guestEventDateLine } from "@/lib/event-date-display";

export type ConciergeOffer = {
  id: string;
  imageUrl: string;
  title: string | null;
  eventDate: string | null;
  eventContinuous?: boolean;
};

type ConciergeEventsRowProps = {
  offers: ConciergeOffer[];
  accentColor: string;
  selectedId?: string | null;
  onSelect: (offer: ConciergeOffer) => void;
};

export default function ConciergeEventsRow({
  offers,
  accentColor,
  selectedId,
  onSelect,
}: ConciergeEventsRowProps) {
  if (offers.length === 0) {
    return (
      <p className="text-center text-[11px] text-white/40 py-2">
        New events dropping soon — chat below to reserve.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
        This week · tap to book
      </p>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
        {offers.map((offer) => {
          const label =
            [offer.title?.trim(), guestEventDateLine(offer.eventDate, { eventContinuous: offer.eventContinuous })].filter(Boolean).join(" · ") ||
            "Event";
          const selected = selectedId === offer.id;
          return (
            <button
              key={offer.id}
              type="button"
              onClick={() => onSelect(offer)}
              className="w-[76px] shrink-0 snap-start text-left transition active:scale-[0.97]"
            >
              <div
                className={`relative aspect-[3/4] overflow-hidden rounded-xl border shadow-lg ${
                  selected ? "ring-2" : "border-white/15"
                }`}
                style={
                  selected
                    ? { borderColor: accentColor, boxShadow: `0 8px 24px ${accentColor}44` }
                    : undefined
                }
              >
                <Image
                  src={offer.imageUrl}
                  alt={label}
                  fill
                  className="object-cover"
                  sizes="76px"
                  unoptimized
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
              <p className="mt-1 line-clamp-2 text-[9px] leading-tight text-white/55">{label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
