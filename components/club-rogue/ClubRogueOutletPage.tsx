"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import {
  CLUB_ROGUE_COVER_CHARGE_SUMMARY,
  CLUB_ROGUE_CONFIRMATION_FEE_INR,
  CLUB_ROGUE_FEE_BREAKDOWN_LABELS,
  CLUB_ROGUE_GACHIBOWLI_ID,
  CLUB_ROGUE_GST_HANDLING_INR,
  CLUB_ROGUE_RESERVATION_FEE_INR,
  CLUB_ROGUE_BRAND_IDS,
  clubRogueChatVenueName,
} from "@/lib/club-rogue";
import {
  CLUB_ROGUE_THEME,
  getClubRogueHooks,
  getClubRogueLanding,
} from "@/lib/club-rogue-landing";
import {
  eventSlotLabel,
  firstAvailableEventSlot,
  getAvailableEventSlots,
  isEventSlotInPast,
  resolveEventBookDateTime,
} from "@/lib/event-booking-slots";
import { getContactForBrand, getFullPhoneNumber, getWhatsAppMessageForBrand } from "@/lib/outlet-contacts";
import { guestEventDateLine } from "@/lib/event-date-display";
import { useRazorpayCheckout } from "@/lib/use-razorpay-checkout";
import type { VenuePayload } from "@/lib/venue-data";

const GalleryModal = dynamic(() => import("@/components/GalleryModal"));

const LOGO = "/logos/club-rogue.png";
const DEFAULT_MAP = "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6";
const HOOK_ROTATE_MS = 4200;

type Offer = {
  id: string;
  imageUrl: string;
  title: string | null;
  eventDate: string | null;
  eventContinuous?: boolean;
};

function toState(p: VenuePayload | null) {
  if (!p) {
    return {
      offers: [] as Offer[],
      galleryImages: [] as string[],
      contactPhone: "",
      whatsappMessage: "",
      mapUrl: DEFAULT_MAP,
      address: "",
    };
  }
  return {
    offers: p.offers,
    galleryImages: p.galleryImages,
    contactPhone: p.contactPhone,
    whatsappMessage: p.whatsappMessage,
    mapUrl: p.location.mapUrl ?? DEFAULT_MAP,
    address: p.location.address,
  };
}

export default function ClubRogueOutletPage({
  outletSlug,
  initialVenueData,
  initialEventId = null,
}: {
  outletSlug: string;
  initialVenueData: VenuePayload | null;
  initialEventId?: string | null;
}) {
  const router = useRouter();
  const { openCheckout, loading: razorpayLoading } = useRazorpayCheckout();

  const [brandId, setBrandId] = useState(() =>
    CLUB_ROGUE_BRAND_IDS.includes(outletSlug as (typeof CLUB_ROGUE_BRAND_IDS)[number])
      ? outletSlug
      : CLUB_ROGUE_GACHIBOWLI_ID
  );
  const brand = BRANDS.find((b) => b.id === brandId) ?? BRANDS[0];
  const landing = getClubRogueLanding(brandId);
  const emotionalHooks = useMemo(() => getClubRogueHooks(brandId), [brandId]);
  const venueName = clubRogueChatVenueName(brandId) ?? brand.shortName;

  const [venue, setVenue] = useState(() => toState(initialVenueData));
  const [loading, setLoading] = useState(!initialVenueData);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState(2);
  const [bookDate, setBookDate] = useState(() => resolveEventBookDateTime(null).date);
  const [bookTime, setBookTime] = useState(() => resolveEventBookDateTime(null).time);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [coverAck, setCoverAck] = useState(false);
  const [nightGenre, setNightGenre] = useState<"" | "tollywood" | "bollywood">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [paymentConfigured, setPaymentConfigured] = useState<boolean | null>(null);
  const [hookIndex, setHookIndex] = useState(0);

  const selectedEvent = venue.offers.find((o) => o.id === selectedEventId) ?? null;
  const slots = getAvailableEventSlots(bookDate);
  const waPhone = getFullPhoneNumber(venue.contactPhone || getContactForBrand(brandId));
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    venue.whatsappMessage || getWhatsAppMessageForBrand(brandId, venueName)
  )}`;

  const loadVenue = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/venues/${id}`);
      const data = await res.json();
      if (res.ok) {
        setVenue({
          offers: data.offers ?? [],
          galleryImages: data.galleryImages ?? [],
          contactPhone: data.contactPhone ?? "",
          whatsappMessage: data.whatsappMessage ?? "",
          mapUrl: data.location?.mapUrl ?? DEFAULT_MAP,
          address: data.location?.address ?? "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/payments/razorpay/status")
      .then((r) => r.json())
      .then((d) => setPaymentConfigured(Boolean(d.configured)))
      .catch(() => setPaymentConfigured(false));
  }, []);

  useEffect(() => {
    if (!initialVenueData) void loadVenue(brandId);
  }, [brandId, initialVenueData, loadVenue]);

  useEffect(() => {
    if (initialEventId && venue.offers.some((o) => o.id === initialEventId)) {
      setSelectedEventId(initialEventId);
      const ev = venue.offers.find((o) => o.id === initialEventId);
      const { date, time } = resolveEventBookDateTime(ev?.eventDate ?? null);
      setBookDate(date);
      setBookTime(time);
    }
  }, [initialEventId, venue.offers]);

  useEffect(() => {
    setHookIndex(0);
  }, [brandId]);

  useEffect(() => {
    if (emotionalHooks.length <= 1) return;
    const id = window.setInterval(() => {
      setHookIndex((i) => (i + 1) % emotionalHooks.length);
    }, HOOK_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [emotionalHooks.length]);

  useEffect(() => {
    if (isEventSlotInPast(bookDate, bookTime)) {
      const next = firstAvailableEventSlot(bookDate);
      if (next) setBookTime(next);
    }
  }, [bookDate, bookTime]);

  const selectEvent = (id: string) => {
    const ev = venue.offers.find((o) => o.id === id);
    setSelectedEventId(id);
    const { date, time } = resolveEventBookDateTime(ev?.eventDate ?? null);
    setBookDate(date);
    setBookTime(time);
    setError(null);
  };

  const buildPayload = () => {
    const normalizedPhone = phone.replace(/\D/g, "").slice(0, 10);
    const eventId = selectedEventId;
    return {
      fullName: name.trim(),
      contactNumber: normalizedPhone,
      numberOfMen: String(people),
      numberOfWomen: "0",
      numberOfCouples: "0",
      date: bookDate,
      timeSlot: bookTime,
      notes: eventId
        ? `Club Rogue reservation [event:${eventId}]`
        : "Club Rogue online reservation",
      eventId: eventId ?? undefined,
      eventName: selectedEvent?.title?.trim() || "Club Rogue Night",
      selectedDiscounts: [],
      brandId,
      brandName: brand.name,
      coverChargeAcknowledged: coverAck,
      ...(brandId === CLUB_ROGUE_GACHIBOWLI_ID && nightGenre ? { bookingNightGenre: nightGenre } : {}),
    };
  };

  const handleBook = async () => {
    const normalizedPhone = phone.replace(/\D/g, "").slice(0, 10);
    if (!name.trim()) {
      setError("Your name — that's all we need to start.");
      return;
    }
    if (!/^\d{10}$/.test(normalizedPhone)) {
      setError("10-digit mobile number, please.");
      return;
    }
    if (!coverAck) {
      setError("Quick tick on the cover charge — then you're in.");
      return;
    }
    if (brandId === CLUB_ROGUE_GACHIBOWLI_ID && nightGenre !== "tollywood" && nightGenre !== "bollywood") {
      setError("Tollywood or Bollywood — pick your vibe.");
      return;
    }
    if (isEventSlotInPast(bookDate, bookTime)) {
      setError("That slot's gone. Pick another time.");
      return;
    }
    if (paymentConfigured === false) {
      setError("Online booking opens soon — WhatsApp us below for now.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const payload = buildPayload();

    try {
      const orderRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) throw new Error(orderData.error || "Could not start booking");

      await openCheckout(
        {
          keyId: orderData.keyId,
          orderId: orderData.orderId,
          amountPaise: orderData.amountPaise,
          name: venueName,
          description: `Table confirmation · ₹${CLUB_ROGUE_RESERVATION_FEE_INR}`,
          prefill: orderData.prefill,
        },
        async (payment) => {
          const verifyRes = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment),
          });
          const verifyData = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");
          setSuccess(true);
          setName("");
          setPhone("");
          setCoverAck(false);
          setNightGenre("");
        }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      if (msg !== "Payment cancelled") setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const locationTabs = useMemo(
    () =>
      CLUB_ROGUE_BRAND_IDS.map((id) => ({
        id,
        label: getClubRogueLanding(id).locality,
      })),
    []
  );

  const activeHook = emotionalHooks[hookIndex % emotionalHooks.length] ?? emotionalHooks[0];

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden text-white"
      style={{ backgroundColor: CLUB_ROGUE_THEME.bg }}
    >
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[520px]"
        style={{
          background: `radial-gradient(ellipse 90% 55% at 50% -5%, ${CLUB_ROGUE_THEME.glow}, transparent 72%)`,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-lg px-4 pb-10 pt-5">
        {/* Location */}
        <div className="mb-6 flex justify-center gap-1.5">
          {locationTabs.map((tab) => {
            const active = tab.id === brandId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setBrandId(tab.id);
                  router.replace(`/${tab.id}`);
                  void loadVenue(tab.id);
                }}
                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all"
                style={{
                  backgroundColor: active ? CLUB_ROGUE_THEME.orange : "rgba(255,255,255,0.06)",
                  color: active ? "#0c0604" : "rgba(255,255,255,0.5)",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Hero — emotion first */}
        <header className="text-center">
          <div className="relative mx-auto mb-3 h-12 w-12 opacity-90">
            <Image src={LOGO} alt="Club Rogue" fill className="object-contain" priority />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {venueName} · {landing.tagline}
          </p>

          <div className="relative mx-auto mt-5 min-h-[5.5rem] max-w-md sm:min-h-[6rem]">
            <AnimatePresence mode="wait">
              <motion.h1
                key={`${brandId}-${hookIndex}`}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="text-[1.65rem] font-extrabold leading-[1.15] tracking-tight sm:text-[1.85rem]"
                style={{
                  background: `linear-gradient(135deg, #fff 0%, ${CLUB_ROGUE_THEME.orangeLight} 55%, ${CLUB_ROGUE_THEME.orange} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: `0 0 40px ${CLUB_ROGUE_THEME.glow}`,
                }}
              >
                {activeHook}
              </motion.h1>
            </AnimatePresence>
          </div>

          <p className="mt-3 text-[11px] text-white/40">{landing.essentials}</p>
        </header>

        {/* Booking — single path, no duplicate CTAs */}
        <section id="book" className="mt-7 scroll-mt-4">
          <div
            className="rounded-3xl border p-4 sm:p-5"
            style={{
              borderColor: `${CLUB_ROGUE_THEME.orange}35`,
              background: `linear-gradient(168deg, rgba(249,115,22,0.14) 0%, rgba(12,6,4,0.98) 50%)`,
              boxShadow: `0 0 48px ${CLUB_ROGUE_THEME.glow}`,
            }}
          >
            {paymentConfigured === false ? (
              <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100/90">
                Online booking opens once payment is live. WhatsApp below works meanwhile.
              </p>
            ) : null}

            {success ? (
              <div className="py-6 text-center">
                <p className="text-2xl font-extrabold text-emerald-100">You&apos;re in.</p>
                <p className="mt-2 text-sm text-emerald-100/75">Check WhatsApp — your table&apos;s locked.</p>
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="mt-5 text-xs text-emerald-200/80 underline underline-offset-4"
                >
                  Book another table
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="rounded-xl border border-white/12 bg-black/50 px-3 py-3 text-sm outline-none placeholder:text-white/30 focus:border-orange-400/50"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Mobile"
                    type="tel"
                    className="rounded-xl border border-white/12 bg-black/50 px-3 py-3 text-sm outline-none placeholder:text-white/30 focus:border-orange-400/50"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span className="text-xs text-white/50">Guests</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPeople((p) => Math.max(1, p - 1))}
                      className="h-7 w-7 rounded-lg border border-white/15 text-sm text-white/70"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{people}</span>
                    <button
                      type="button"
                      onClick={() => setPeople((p) => Math.min(20, p + 1))}
                      className="h-7 w-7 rounded-lg border border-white/15 text-sm text-white/70"
                    >
                      +
                    </button>
                  </div>
                </div>

                {brandId === CLUB_ROGUE_GACHIBOWLI_ID && (
                  <div className="grid grid-cols-2 gap-2">
                    {(["tollywood", "bollywood"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setNightGenre(g)}
                        className="rounded-xl border py-2 text-[11px] font-bold uppercase tracking-wide"
                        style={{
                          borderColor: nightGenre === g ? CLUB_ROGUE_THEME.orange : "rgba(255,255,255,0.1)",
                          backgroundColor: nightGenre === g ? `${CLUB_ROGUE_THEME.orange}22` : "transparent",
                          color: nightGenre === g ? CLUB_ROGUE_THEME.orangeLight : "rgba(255,255,255,0.45)",
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowTimePicker((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-left"
                >
                  <span className="text-xs text-white/45">Arrival</span>
                  <span className="text-sm font-semibold text-white/90">
                    Tonight · {eventSlotLabel(bookTime)}
                    <span className="ml-2 text-[10px] font-normal text-orange-300/80">
                      {showTimePicker ? "hide" : "change"}
                    </span>
                  </span>
                </button>

                {showTimePicker && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setBookTime(slot);
                          setShowTimePicker(false);
                        }}
                        className="rounded-lg border py-2 text-[11px] font-semibold"
                        style={{
                          borderColor: bookTime === slot ? CLUB_ROGUE_THEME.orange : "rgba(255,255,255,0.1)",
                          backgroundColor: bookTime === slot ? `${CLUB_ROGUE_THEME.orange}20` : "transparent",
                          color: bookTime === slot ? CLUB_ROGUE_THEME.orangeLight : "rgba(255,255,255,0.55)",
                        }}
                      >
                        {eventSlotLabel(slot)}
                      </button>
                    ))}
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={coverAck}
                    onChange={(e) => setCoverAck(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-[10px] leading-snug text-white/45">{CLUB_ROGUE_COVER_CHARGE_SUMMARY}</span>
                </label>

                {error ? <p className="text-center text-xs text-red-300/90">{error}</p> : null}

                <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-[11px]">
                  <div className="flex justify-between text-white/45">
                    <span>{CLUB_ROGUE_FEE_BREAKDOWN_LABELS.confirmation}</span>
                    <span>₹{CLUB_ROGUE_CONFIRMATION_FEE_INR}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-white/45">
                    <span>{CLUB_ROGUE_FEE_BREAKDOWN_LABELS.gstHandling}</span>
                    <span>₹{CLUB_ROGUE_GST_HANDLING_INR}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold text-white/85">
                    <span>{CLUB_ROGUE_FEE_BREAKDOWN_LABELS.total}</span>
                    <span>₹{CLUB_ROGUE_RESERVATION_FEE_INR}</span>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={() => void handleBook()}
                  disabled={submitting || razorpayLoading || paymentConfigured === false}
                  whileTap={{ scale: 0.98 }}
                  animate={{
                    boxShadow: [
                      `0 8px 32px ${CLUB_ROGUE_THEME.glow}`,
                      `0 8px 48px rgba(249,115,22,0.55)`,
                      `0 8px 32px ${CLUB_ROGUE_THEME.glow}`,
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                  className="w-full rounded-2xl py-4 text-base font-extrabold tracking-wide text-[#0c0604] disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${CLUB_ROGUE_THEME.orangeLight}, ${CLUB_ROGUE_THEME.orange})`,
                  }}
                >
                  {submitting || razorpayLoading
                    ? "Locking your table…"
                    : paymentConfigured === false
                      ? "Booking opens soon"
                      : `Pay ₹${CLUB_ROGUE_RESERVATION_FEE_INR} & confirm`}
                </motion.button>
              </div>
            )}
          </div>
        </section>

        {/* Tonight — optional, one tap */}
        {!loading && venue.offers.length > 0 && (
          <section className="mt-6">
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Tonight
            </p>
            <div className="flex justify-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {venue.offers.slice(0, 4).map((o) => {
                const sel = selectedEventId === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => selectEvent(o.id)}
                    className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border transition-all"
                    style={{
                      borderColor: sel ? CLUB_ROGUE_THEME.orange : "rgba(255,255,255,0.08)",
                      opacity: sel ? 1 : 0.65,
                    }}
                  >
                    <Image src={o.imageUrl} alt="" fill className="object-cover" sizes="56px" unoptimized />
                  </button>
                );
              })}
            </div>
            {selectedEvent && (
              <p className="mt-1.5 text-center text-[10px] text-white/35">
                {selectedEvent.title ||
                  guestEventDateLine(selectedEvent.eventDate, { eventContinuous: selectedEvent.eventContinuous })}
              </p>
            )}
          </section>
        )}

        {/* Vibe peek */}
        {venue.galleryImages.length > 0 && (
          <section className="mt-6">
            <div className="flex justify-center gap-1.5">
              {venue.galleryImages.slice(0, 3).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    setGalleryIndex(i);
                    setGalleryOpen(true);
                  }}
                  className="relative h-24 w-[30%] overflow-hidden rounded-xl opacity-80 transition-opacity hover:opacity-100"
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="120px" />
                </button>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 flex justify-center gap-4 text-[10px] text-white/35">
          <a href={venue.mapUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white/55">
            Locate
          </a>
          <span aria-hidden>·</span>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-300/80">
            WhatsApp
          </a>
          {brand.instagramUrls[0] && brand.instagramUrls[0] !== "#" ? (
            <>
              <span aria-hidden>·</span>
              <a
                href={brand.instagramUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/55"
              >
                Instagram
              </a>
            </>
          ) : null}
        </footer>
      </div>

      {galleryOpen && (
        <GalleryModal
          images={venue.galleryImages}
          brandName={venueName}
          initialIndex={galleryIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}
