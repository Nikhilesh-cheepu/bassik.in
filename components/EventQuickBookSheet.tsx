"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import {
  CLUB_ROGUE_COVER_CHARGE_SUMMARY,
  CLUB_ROGUE_GACHIBOWLI_ID,
  isClubRogueBrand,
} from "@/lib/club-rogue";
import { guestEventDateLine } from "@/lib/event-date-display";
import {
  eventSlotLabel,
  getAvailableEventSlots,
  isEventSlotInPast,
  resolveEventBookDateTime,
} from "@/lib/event-booking-slots";

export type EventQuickBookOffer = {
  id: string;
  imageUrl: string;
  title: string | null;
  description?: string | null;
  eventDate: string | null;
  eventContinuous?: boolean;
  entryLabel?: string | null;
  capacityText?: string | null;
};

type EventQuickBookSheetProps = {
  brandId: string;
  offers: EventQuickBookOffer[];
  eventId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  initialPhone?: string;
  onBooked?: () => void;
};

export default function EventQuickBookSheet({
  brandId,
  offers,
  eventId,
  isOpen,
  onClose,
  initialName = "",
  initialPhone = "",
  onBooked,
}: EventQuickBookSheetProps) {
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
  const selectedEvent = offers.find((o) => o.id === eventId) ?? null;

  const [eventBookName, setEventBookName] = useState(initialName);
  const [eventBookPhone, setEventBookPhone] = useState(initialPhone);
  const [eventBookPeople, setEventBookPeople] = useState(2);
  const [eventBookDate, setEventBookDate] = useState(() => resolveEventBookDateTime(null).date);
  const [eventBookTime, setEventBookTime] = useState(() => resolveEventBookDateTime(null).time);
  const [eventBookSubmitting, setEventBookSubmitting] = useState(false);
  const [eventBookError, setEventBookError] = useState<string | null>(null);
  const [eventClubRogueCoverAcknowledged, setEventClubRogueCoverAcknowledged] = useState(false);
  const [eventBookingNightGenre, setEventBookingNightGenre] = useState<"" | "tollywood" | "bollywood">("");
  const [showBookedToast, setShowBookedToast] = useState(false);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEventBookName(initialName);
    setEventBookPhone(initialPhone.replace(/\D/g, "").slice(0, 10));
    setEventBookError(null);
    const { date, time } = resolveEventBookDateTime(selectedEvent?.eventDate ?? null);
    setEventBookDate(date);
    setEventBookTime(time);
  }, [isOpen, eventId, initialName, initialPhone, selectedEvent?.eventDate]);

  useEffect(
    () => () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    },
    []
  );

  const submit = async () => {
    const normalizedPhone = eventBookPhone.replace(/\D/g, "").slice(0, 10);
    if (!eventId || !selectedEvent) {
      setEventBookError("Please select an event.");
      return;
    }
    if (!eventBookName.trim()) {
      setEventBookError("Please enter your name.");
      return;
    }
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setEventBookError("Please enter a valid 10-digit mobile number.");
      return;
    }
    const clubRogueOutlet = isClubRogueBrand(brandId);
    if (clubRogueOutlet && !eventClubRogueCoverAcknowledged) {
      setEventBookError("Please acknowledge the ₹2,000 cover charge (fully redeemable).");
      return;
    }
    if (brandId === CLUB_ROGUE_GACHIBOWLI_ID) {
      if (eventBookingNightGenre !== "tollywood" && eventBookingNightGenre !== "bollywood") {
        setEventBookError("Please select Tollywood or Bollywood night.");
        return;
      }
    }
    if (isEventSlotInPast(eventBookDate, eventBookTime)) {
      setEventBookError("Please choose a time slot in the future.");
      return;
    }

    setEventBookSubmitting(true);
    setEventBookError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: eventBookName.trim(),
          contactNumber: normalizedPhone,
          numberOfMen: String(eventBookPeople),
          numberOfWomen: "0",
          numberOfCouples: "0",
          date: eventBookDate,
          timeSlot: eventBookTime,
          notes: `Quick event booking [event:${eventId}]`,
          eventId,
          eventName: selectedEvent.title?.trim() || "Event",
          selectedDiscounts: [],
          brandId,
          brandName: brand.name,
          ...(clubRogueOutlet ? { coverChargeAcknowledged: eventClubRogueCoverAcknowledged } : {}),
          ...(brandId === CLUB_ROGUE_GACHIBOWLI_ID ? { bookingNightGenre: eventBookingNightGenre } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Booking failed. Please try again.");
      }
      onClose();
      setEventClubRogueCoverAcknowledged(false);
      setEventBookingNightGenre("");
      setShowBookedToast(true);
      onBooked?.();
      if (toastRef.current) clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setShowBookedToast(false), 3000);
    } catch (error) {
      setEventBookError(error instanceof Error ? error.message : "Booking failed. Please try again.");
    } finally {
      setEventBookSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && selectedEvent && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-[110] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              initial={{ y: -24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              className="fixed inset-x-0 top-0 z-[120] mx-auto w-full max-w-md rounded-b-3xl border-b border-white/15 bg-[#0b0f17]/95 p-4"
            >
              <h3 className="text-sm font-semibold text-white">Event Booking</h3>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/12 bg-white/[0.04] p-2">
                <div className="relative h-14 w-14 overflow-hidden rounded-lg">
                  <Image
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title || "Event"}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {selectedEvent.title?.trim() || "Selected event"}
                  </p>
                  <p className="truncate text-xs text-white/70">
                    {guestEventDateLine(selectedEvent.eventDate, {
                      eventContinuous: selectedEvent.eventContinuous,
                    })}
                  </p>
                </div>
              </div>
              {isClubRogueBrand(brandId) && (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2.5">
                  <p className="text-[11px] font-semibold leading-snug text-amber-50/95">
                    {CLUB_ROGUE_COVER_CHARGE_SUMMARY}
                  </p>
                  <label className="mt-2 flex cursor-pointer items-start gap-2 border-t border-amber-500/25 pt-2">
                    <input
                      type="checkbox"
                      checked={eventClubRogueCoverAcknowledged}
                      onChange={(e) => setEventClubRogueCoverAcknowledged(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-black/40"
                    />
                    <span className="text-[11px] leading-snug text-amber-50/95">
                      I understand the ₹2,000 mandatory cover (fully redeemable at the venue). *
                    </span>
                  </label>
                </div>
              )}
              {brandId === CLUB_ROGUE_GACHIBOWLI_ID && (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-semibold text-white/85">Tollywood or Bollywood night? *</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "tollywood" as const, label: "Tollywood" },
                        { id: "bollywood" as const, label: "Bollywood" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEventBookingNightGenre(opt.id)}
                        className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold ${
                          eventBookingNightGenre === opt.id
                            ? "border-white bg-white/15 text-white"
                            : "border-white/20 bg-white/[0.04] text-white/80"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={eventBookName}
                  onChange={(e) => setEventBookName(e.target.value)}
                  placeholder="Name"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none"
                />
                <input
                  type="tel"
                  value={eventBookPhone}
                  onChange={(e) => setEventBookPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Mobile number"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none"
                />
                <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5">
                  <span className="text-sm text-white/80">No. of people</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEventBookPeople((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 rounded-md border border-white/20 text-white"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-white">{eventBookPeople}</span>
                    <button
                      type="button"
                      onClick={() => setEventBookPeople((p) => Math.min(20, p + 1))}
                      className="h-7 w-7 rounded-md border border-white/20 text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {getAvailableEventSlots(eventBookDate).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        if (isEventSlotInPast(eventBookDate, slot)) {
                          setEventBookError("Cannot select a past time slot.");
                          return;
                        }
                        setEventBookError(null);
                        setEventBookTime(slot);
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                        eventBookTime === slot
                          ? "border-white/60 bg-white/15 text-white"
                          : "border-white/20 bg-white/[0.04] text-white/80"
                      }`}
                    >
                      {eventSlotLabel(slot)}
                    </button>
                  ))}
                </div>
              </div>
              {eventBookError ? <p className="mt-2 text-xs text-red-300">{eventBookError}</p> : null}
              <button
                type="button"
                onClick={submit}
                disabled={eventBookSubmitting}
                className="mt-3 w-full rounded-full border border-white/25 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {eventBookSubmitting ? "Booking..." : "Book Event"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showBookedToast && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed inset-0 z-[130] flex items-center justify-center px-4"
          >
            <div className="w-full max-w-sm rounded-2xl border border-emerald-400/50 bg-emerald-500/20 px-5 py-4 backdrop-blur-xl">
              <p className="text-base font-bold text-emerald-50">Event booked successfully</p>
              <p className="text-sm text-emerald-100/90">WhatsApp confirmation sent.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
