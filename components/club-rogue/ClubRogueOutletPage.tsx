"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import {
  CLUB_ROGUE_COVER_CHARGE_ACK,
  CLUB_ROGUE_FEE_BREAKDOWN_LABELS,
  CLUB_ROGUE_GACHIBOWLI_ID,
  CLUB_ROGUE_BRAND_IDS,
  clubRogueChatVenueName,
  getClubRogueCustomerFeeBreakdown,
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
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { blurActiveField, resetIosInputZoom } from "@/lib/reset-mobile-zoom";
import type { VenuePayload } from "@/lib/venue-data";

const GalleryModal = dynamic(() => import("@/components/GalleryModal"));

const LOGO = "/logos/club-rogue.png";
const DEFAULT_MAP = "https://maps.app.goo.gl/wD2TKLaW9v5gFnmj6";
const HOOK_ROTATE_MS = 15000;

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
  const emotionalHooks = useMemo(() => getClubRogueHooks(brandId), [brandId]);
  const venueName = clubRogueChatVenueName(brandId) ?? brand.shortName;

  const [venue, setVenue] = useState(() => toState(initialVenueData));
  const [loading, setLoading] = useState(!initialVenueData);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialEventId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [people, setPeople] = useState(1);
  const [bookDate, setBookDate] = useState(() => resolveEventBookDateTime(null).date);
  const [bookTime, setBookTime] = useState(() => resolveEventBookDateTime(null).time);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [coverAck, setCoverAck] = useState(false);
  const [nightGenre, setNightGenre] = useState<"" | "tollywood" | "bollywood">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [paymentConfigured, setPaymentConfigured] = useState<boolean | null>(null);
  const [perGuestInr, setPerGuestInr] = useState(50);
  const [hookIndex, setHookIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPortalReady, setConfirmPortalReady] = useState(false);

  useBodyScrollLock(confirmOpen, { pinBody: false });

  const fee = useMemo(
    () => getClubRogueCustomerFeeBreakdown(people, perGuestInr),
    [people, perGuestInr]
  );

  const selectedEvent = venue.offers.find((o) => o.id === selectedEventId) ?? null;
  const slots = getAvailableEventSlots(bookDate);
  const waPhone = getFullPhoneNumber(venue.contactPhone || getContactForBrand(brandId));
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    venue.whatsappMessage || getWhatsAppMessageForBrand(brandId, venueName)
  )}`;

  const resetForm = useCallback(() => {
    setName("");
    setPhone("");
    setPeople(1);
    setCoverAck(false);
    setNightGenre("");
    setShowTimePicker(false);
    setError(null);
    setConfirmError(null);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    setConfirmError(null);
    setCoverAck(false);
  }, []);

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
      .then((d) => {
        setPaymentConfigured(Boolean(d.configured));
        if (typeof d.perGuestTotalInr === "number") {
          setPerGuestInr(d.perGuestTotalInr);
        } else if (typeof d.totalInr === "number" && typeof d.guestCount === "number") {
          setPerGuestInr(d.totalInr / Math.max(1, d.guestCount));
        }
      })
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

  useEffect(() => {
    setConfirmPortalReady(true);
  }, []);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) closeConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, submitting, closeConfirm]);

  const selectEvent = (id: string) => {
    const ev = venue.offers.find((o) => o.id === id);
    setSelectedEventId(id);
    const { date, time } = resolveEventBookDateTime(ev?.eventDate ?? null);
    setBookDate(date);
    setBookTime(time);
    setError(null);
  };

  const validateForm = (): string | null => {
    const normalizedPhone = phone.replace(/\D/g, "").slice(0, 10);
    if (!name.trim()) return "Add your name.";
    if (!/^\d{10}$/.test(normalizedPhone)) return "Enter a 10-digit mobile number.";
    if (brandId === CLUB_ROGUE_GACHIBOWLI_ID && nightGenre !== "tollywood" && nightGenre !== "bollywood") {
      return "Pick Tollywood or Bollywood.";
    }
    if (isEventSlotInPast(bookDate, bookTime)) return "That slot's gone — pick another time.";
    if (paymentConfigured === false) return "Online booking isn't live yet — WhatsApp us below.";
    return null;
  };

  const buildPayload = (acknowledged: boolean) => {
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
      coverChargeAcknowledged: acknowledged,
      ...(brandId === CLUB_ROGUE_GACHIBOWLI_ID && nightGenre ? { bookingNightGenre: nightGenre } : {}),
    };
  };

  const handlePayClick = () => {
    blurActiveField();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setConfirmError(null);
    setCoverAck(false);
    setConfirmOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!coverAck) {
      setConfirmError("Please confirm you understand the cover charge.");
      return;
    }

    setSubmitting(true);
    setConfirmError(null);
    const payload = buildPayload(true);

    try {
      const orderRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) throw new Error(orderData.error || "Could not start payment");

      // Close our sheet and release scroll lock before Razorpay — body pin shifts its modal left on iOS.
      setConfirmOpen(false);
      blurActiveField();
      resetIosInputZoom();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await new Promise<void>((r) => window.setTimeout(r, 100));

      await openCheckout(
        {
          keyId: orderData.keyId,
          orderId: orderData.orderId,
          amountPaise: orderData.amountPaise,
          name: venueName,
          description: `Table confirmation · ₹${fee.totalInr}`,
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

          setConfirmOpen(false);
          setSuccess(true);
          resetForm();
        }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment failed";
      if (msg !== "Payment cancelled") {
        setConfirmError(msg);
        setConfirmOpen(true);
      }
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

  const fieldClass =
    "w-full bg-transparent px-4 py-3.5 text-base text-white outline-none placeholder:text-white/30";

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{
        background: `linear-gradient(180deg, ${CLUB_ROGUE_THEME.bgMid} 0%, ${CLUB_ROGUE_THEME.bg} 45%, #0a0706 100%)`,
        color: CLUB_ROGUE_THEME.text,
      }}
    >
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[55vh]"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% -10%, ${CLUB_ROGUE_THEME.glow}, transparent 65%)`,
        }}
      />

      <div className="relative mx-auto max-w-[22rem] px-4 pb-12 pt-6">
        {/* Location */}
        <div className="flex justify-center gap-1">
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
                className="rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest transition-all"
                style={{
                  backgroundColor: active ? CLUB_ROGUE_THEME.orange : "transparent",
                  color: active ? "#0c0604" : CLUB_ROGUE_THEME.textDim,
                  border: active ? "none" : `1px solid ${CLUB_ROGUE_THEME.borderSubtle}`,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Hero */}
        <header className="mt-8 text-center">
          <div className="relative mx-auto mb-4 h-[3.25rem] w-[3.25rem]">
            <Image src={LOGO} alt="Club Rogue" fill className="object-contain drop-shadow-lg" priority />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.35em]" style={{ color: CLUB_ROGUE_THEME.textDim }}>
            {venueName}
          </p>

          <div className="relative mx-auto mt-5 min-h-[5.5rem] px-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={`${brandId}-${hookIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.55 }}
                className="text-[1.1rem] font-semibold leading-relaxed tracking-[0.04em] text-white/90 uppercase"
              >
                {activeHook}
              </motion.p>
            </AnimatePresence>
          </div>
        </header>

        {/* Form */}
        <section id="book" className="mt-8">
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border px-5 py-10 text-center backdrop-blur-xl"
              style={{
                borderColor: "rgba(52, 211, 153, 0.25)",
                background: "rgba(16, 185, 129, 0.08)",
              }}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-xl text-emerald-300">
                ✓
              </div>
              <p className="text-xl font-semibold text-white">You&apos;re in</p>
              <p className="mt-1.5 text-sm" style={{ color: CLUB_ROGUE_THEME.textMuted }}>
                Table confirmed — check WhatsApp
              </p>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="mt-7 w-full rounded-full py-3 text-sm font-semibold text-[#0c0604]"
                style={{ background: CLUB_ROGUE_THEME.orange }}
              >
                Book another
              </button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {paymentConfigured === false && (
                <p
                  className="rounded-2xl border px-3 py-2.5 text-center text-xs"
                  style={{
                    borderColor: "rgba(251, 191, 36, 0.25)",
                    background: "rgba(251, 191, 36, 0.08)",
                    color: "rgba(253, 230, 138, 0.9)",
                  }}
                >
                  Online booking opens soon — WhatsApp below
                </p>
              )}

              {/* Grouped fields — iOS-style */}
              <div
                className="overflow-hidden rounded-2xl border backdrop-blur-md"
                style={{ borderColor: CLUB_ROGUE_THEME.border, background: CLUB_ROGUE_THEME.surface }}
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className={fieldClass}
                  style={{ borderBottom: `1px solid ${CLUB_ROGUE_THEME.borderSubtle}` }}
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Mobile"
                  type="tel"
                  className={fieldClass}
                />
              </div>

              <div
                className="overflow-hidden rounded-2xl border backdrop-blur-md"
                style={{ borderColor: CLUB_ROGUE_THEME.border, background: CLUB_ROGUE_THEME.surface }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${CLUB_ROGUE_THEME.borderSubtle}` }}
                >
                  <span className="text-sm" style={{ color: CLUB_ROGUE_THEME.textMuted }}>
                    Guests
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPeople((p) => Math.max(1, p - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-base"
                      style={{ background: CLUB_ROGUE_THEME.surfaceRaised, color: CLUB_ROGUE_THEME.text }}
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm font-semibold">{people}</span>
                    <button
                      type="button"
                      onClick={() => setPeople((p) => Math.min(20, p + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-base"
                      style={{ background: CLUB_ROGUE_THEME.surfaceRaised, color: CLUB_ROGUE_THEME.text }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTimePicker((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm" style={{ color: CLUB_ROGUE_THEME.textMuted }}>
                    Arrival
                  </span>
                  <span className="text-sm font-medium text-white/90">
                    Tonight · {eventSlotLabel(bookTime)}
                    <span className="ml-1.5 text-xs font-normal" style={{ color: CLUB_ROGUE_THEME.orange }}>
                      {showTimePicker ? "▲" : "▼"}
                    </span>
                  </span>
                </button>
              </div>

              {brandId === CLUB_ROGUE_GACHIBOWLI_ID && (
                <div className="grid grid-cols-2 gap-2">
                  {(["tollywood", "bollywood"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setNightGenre(g)}
                      className="rounded-2xl border py-2.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md"
                      style={{
                        borderColor: nightGenre === g ? CLUB_ROGUE_THEME.orange : CLUB_ROGUE_THEME.border,
                        background: nightGenre === g ? "rgba(249, 115, 22, 0.15)" : CLUB_ROGUE_THEME.surface,
                        color: nightGenre === g ? CLUB_ROGUE_THEME.orangeLight : CLUB_ROGUE_THEME.textMuted,
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}

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
                      className="rounded-xl border py-2 text-xs font-medium backdrop-blur-md"
                      style={{
                        borderColor: bookTime === slot ? CLUB_ROGUE_THEME.orange : CLUB_ROGUE_THEME.borderSubtle,
                        background: bookTime === slot ? "rgba(249, 115, 22, 0.12)" : CLUB_ROGUE_THEME.surface,
                        color: bookTime === slot ? CLUB_ROGUE_THEME.orangeLight : CLUB_ROGUE_THEME.textMuted,
                      }}
                    >
                      {eventSlotLabel(slot)}
                    </button>
                  ))}
                </div>
              )}

              {error ? (
                <p className="text-center text-xs text-red-300/90">{error}</p>
              ) : null}

              <button
                type="button"
                onClick={handlePayClick}
                disabled={submitting || razorpayLoading || paymentConfigured === false}
                className="w-full rounded-full py-3.5 text-[15px] font-semibold text-[#0c0604] shadow-lg shadow-orange-500/20 transition-transform active:scale-[0.98] disabled:opacity-45"
                style={{
                  background: `linear-gradient(135deg, ${CLUB_ROGUE_THEME.orangeLight}, ${CLUB_ROGUE_THEME.orange})`,
                }}
              >
                {submitting || razorpayLoading ? "Processing…" : "Book table"}
              </button>
            </div>
          )}
        </section>

        {/* Tonight */}
        {!loading && venue.offers.length > 0 && (
          <section className="mt-10">
            <p
              className="mb-3 text-center text-[10px] font-medium uppercase tracking-[0.25em]"
              style={{ color: CLUB_ROGUE_THEME.textDim }}
            >
              Tonight
            </p>
            <div className="flex justify-center gap-2">
              {venue.offers.slice(0, 4).map((o) => {
                const sel = selectedEventId === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => selectEvent(o.id)}
                    className="relative h-[4.5rem] w-11 shrink-0 overflow-hidden rounded-xl transition-all"
                    style={{
                      boxShadow: sel ? `0 0 0 2px ${CLUB_ROGUE_THEME.orange}` : "none",
                      opacity: sel ? 1 : 0.55,
                    }}
                  >
                    <Image src={o.imageUrl} alt="" fill className="object-cover" sizes="44px" unoptimized />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Gallery */}
        {venue.galleryImages.length > 0 && (
          <section className="mt-8">
            <div className="flex justify-center gap-2">
              {venue.galleryImages.slice(0, 3).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    setGalleryIndex(i);
                    setGalleryOpen(true);
                  }}
                  className="relative h-44 w-[4.5rem] overflow-hidden rounded-2xl transition-transform active:scale-[0.98]"
                  style={{ opacity: 0.85 }}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="72px" />
                </button>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 flex justify-center gap-5 text-[11px]" style={{ color: CLUB_ROGUE_THEME.textDim }}>
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

      {confirmPortalReady && confirmOpen
        ? createPortal(
            <div className="fixed inset-0 z-[200] overflow-hidden">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 touch-none bg-black/80 backdrop-blur-sm"
                onClick={() => !submitting && closeConfirm()}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-pay-title"
                className="absolute inset-x-0 bottom-0 box-border max-h-[92dvh] w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-t-3xl border pt-5 backdrop-blur-xl [-webkit-overflow-scrolling:touch]"
                style={{
                  borderColor: CLUB_ROGUE_THEME.border,
                  background: "rgba(22, 16, 14, 0.92)",
                  touchAction: "pan-y",
                  paddingLeft: "max(1.25rem, env(safe-area-inset-left, 0px))",
                  paddingRight: "max(1.25rem, env(safe-area-inset-right, 0px))",
                  paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
                }}
              >
                  <h2 id="confirm-pay-title" className="text-base font-semibold text-white">
                    Before you pay
                  </h2>

                  <div
                    className="mt-4 min-w-0 space-y-3 rounded-2xl border px-4 py-3.5 text-sm"
                    style={{
                      borderColor: CLUB_ROGUE_THEME.borderSubtle,
                      background: CLUB_ROGUE_THEME.surface,
                    }}
                  >
                    <p className="break-words leading-relaxed" style={{ color: CLUB_ROGUE_THEME.textMuted }}>
                      <span className="font-semibold text-white">₹2,000 cover</span> per person at entry —
                      redeemable on food &amp; drinks.
                    </p>

                    <div className="border-t pt-3" style={{ borderColor: CLUB_ROGUE_THEME.borderSubtle }}>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: CLUB_ROGUE_THEME.textDim }}
                      >
                        Online confirmation fee
                      </p>
                      <p className="mt-2 break-words font-medium text-white/90">
                        ₹{fee.perGuestTotalInr} × {fee.guestCount}{" "}
                        {fee.guestCount === 1 ? "guest" : "guests"} = ₹{fee.totalInr}
                      </p>
                      {fee.showDetailedGst ? (
                        <div className="mt-3 space-y-1.5">
                          <div
                            className="flex items-start justify-between gap-3"
                            style={{ color: CLUB_ROGUE_THEME.textMuted }}
                          >
                            <span className="min-w-0 break-words">{CLUB_ROGUE_FEE_BREAKDOWN_LABELS.confirmation}</span>
                            <span className="shrink-0 tabular-nums">₹{fee.confirmationInr}</span>
                          </div>
                          <div
                            className="flex items-start justify-between gap-3"
                            style={{ color: CLUB_ROGUE_THEME.textMuted }}
                          >
                            <span className="min-w-0 break-words">{CLUB_ROGUE_FEE_BREAKDOWN_LABELS.gstHandling}</span>
                            <span className="shrink-0 tabular-nums">₹{fee.gstHandlingInr}</span>
                          </div>
                        </div>
                      ) : null}
                      <div
                        className="mt-3 flex items-baseline justify-between gap-3 border-t pt-3"
                        style={{ borderColor: CLUB_ROGUE_THEME.borderSubtle }}
                      >
                        <span className="min-w-0 font-medium text-white/80">
                          {CLUB_ROGUE_FEE_BREAKDOWN_LABELS.total}
                        </span>
                        <span className="shrink-0 text-lg font-bold tabular-nums text-white">₹{fee.totalInr}</span>
                      </div>
                      <p className="mt-2 break-words text-[10px] leading-relaxed" style={{ color: CLUB_ROGUE_THEME.textDim }}>
                        Online only — not entry or cover. Confirmation fee holds your table.
                      </p>
                    </div>
                  </div>

                  <label
                    className="mt-4 flex min-w-0 cursor-pointer items-start gap-3 text-xs leading-relaxed"
                    style={{ color: CLUB_ROGUE_THEME.textMuted }}
                  >
                    <input
                      type="checkbox"
                      checked={coverAck}
                      onChange={(e) => setCoverAck(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
                    />
                    <span className="min-w-0 flex-1 break-words">{CLUB_ROGUE_COVER_CHARGE_ACK}</span>
                  </label>

                  {confirmError ? (
                    <p className="mt-3 text-center text-xs text-red-300">{confirmError}</p>
                  ) : null}

                  <div className="mt-5 grid min-w-0 grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={closeConfirm}
                      disabled={submitting}
                      className="min-w-0 rounded-full border px-2 py-3 text-sm font-medium disabled:opacity-50"
                      style={{
                        borderColor: CLUB_ROGUE_THEME.border,
                        color: CLUB_ROGUE_THEME.textMuted,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmPayment()}
                      disabled={submitting || razorpayLoading}
                      className="min-w-0 rounded-full px-2 py-3 text-sm font-semibold text-[#0c0604] disabled:opacity-50"
                      style={{ background: CLUB_ROGUE_THEME.orange }}
                    >
                      {submitting || razorpayLoading ? "Processing…" : `Pay ₹${fee.totalInr}`}
                    </button>
                  </div>
              </div>
            </div>,
            document.body
          )
        : null}

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
