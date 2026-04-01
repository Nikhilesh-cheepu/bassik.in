"use client";

import { useState, FormEvent, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brand } from "@/lib/brands";
import { useRouter } from "next/navigation";

interface ReservationFormProps {
  brand: Brand;
  initialEventId?: string | null;
}

type DiscountItem = {
  id: string;
  title: string;
  description: string;
  slotsLeft: number;
  soldOut: boolean;
  timeWindowLabel?: string | null;
  /** Optional hint from API; currently not used for logic but kept for compatibility. */
  hideSlotsLeft?: boolean;
};

export default function ReservationForm({ brand, initialEventId = null }: ReservationFormProps) {
  const router = useRouter();
  const accentColor = brand.accentColor;
  const [formData, setFormData] = useState(() => ({
    fullName: "",
    contactNumber: "",
    date: new Date().toISOString().split("T")[0],
    timeSlot: "",
    selectedDiscounts: [] as string[],
    notes: "",
    eventId: initialEventId,
    hubSpotId: undefined as string | undefined,
  }));
  const [guests, setGuests] = useState(2);
  const [timeSlotTab, setTimeSlotTab] = useState<"lunch" | "dinner">("lunch");
  const [discounts, setDiscounts] = useState<DiscountItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [reservationConfirmed, setReservationConfirmed] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const successToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTo12Hour = (time24: string): string => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")}${period}`;
  };

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const datePickerDays = useMemo(() => {
    const days: { dateStr: string; dayName: string; dayNum: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        dateStr: d.toISOString().split("T")[0],
        dayName: i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" }),
        dayNum: d.getDate().toString(),
      });
    }
    return days;
  }, []);

  useEffect(() => {
    const t = new Date();
    const now24 = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
    const lunchEnd = "18:00"; // Global lunch window end
    setFormData((prev) => ({ ...prev, date: todayStr, timeSlot: "", selectedDiscounts: [], eventId: initialEventId }));
    setGuests(2);
    setTimeSlotTab(now24 >= lunchEnd ? "dinner" : "lunch");
    setDiscounts([]);
    setSubmitStatus({ type: null, message: "" });
    setReservationConfirmed(false);
    setReservationId(null);
    setShowSuccessToast(false);
  }, [brand.id, todayStr, initialEventId]);

  useEffect(() => {
    return () => {
      if (successToastTimeoutRef.current) clearTimeout(successToastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!formData.date || !formData.timeSlot || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      setDiscounts([]);
      return;
    }
    let cancelled = false;
    const session = timeSlotTab === "lunch" ? "lunch" : "dinner";
    fetch(`/api/venues/${brand.id}/discounts-available?date=${formData.date}&timeSlot=${formData.timeSlot}&session=${session}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { discounts?: DiscountItem[] } | null) => {
        if (cancelled) return;
        setDiscounts(data?.discounts ?? []);
      })
      .catch(() => { if (!cancelled) setDiscounts([]); });
    return () => { cancelled = true; };
  }, [brand.id, formData.date, formData.timeSlot, timeSlotTab]);

  useEffect(() => {
    if (formData.date) setFormData((prev) => (prev.timeSlot || prev.selectedDiscounts.length ? { ...prev, timeSlot: "", selectedDiscounts: [] } : prev));
  }, [formData.date]);

  const allTimeSlots = useMemo(() => {
    const slots: { value24: string; display12: string; category: "lunch" | "dinner" }[] = [];
    const LUNCH_START = "12:00";
    const LUNCH_END = "18:00";   // includes 6:00 PM
    const DINNER_START = "18:15"; // starts at 6:15 PM

    for (let hour = 12; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time24 = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        if (time24 < LUNCH_START) continue;
        const isLunch = time24 >= LUNCH_START && time24 <= LUNCH_END;
        const isDinner = time24 >= DINNER_START;
        if (!isLunch && !isDinner) continue;
        slots.push({
          value24: time24,
          display12: formatTo12Hour(time24),
          category: isLunch ? "lunch" : "dinner",
        });
      }
    }
    return slots;
  }, []);

  const timeSlots = useMemo(() => {
    const filtered = allTimeSlots.filter((s) => s.category === timeSlotTab);
    if (formData.date === todayStr) {
      const now = Date.now();
      return filtered.filter((s) => new Date(`${formData.date}T${s.value24}`).getTime() > now);
    }
    return filtered;
  }, [allTimeSlots, timeSlotTab, formData.date, todayStr]);

  const isSlotInPast = (date: string, slot: string) => {
    if (!date || !slot) return false;
    return new Date(`${date}T${slot}`).getTime() < Date.now();
  };

  const handleDateSelect = (dateStr: string) => {
    setFormData((prev) => ({ ...prev, date: dateStr, timeSlot: "", selectedDiscounts: [] }));
    if (dateStr === todayStr) {
      const t = new Date();
      const now24 = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
      const lunchEnd = "18:00";
      setTimeSlotTab(now24 >= lunchEnd ? "dinner" : "lunch");
    } else setTimeSlotTab("lunch");
  };

  const handleSlotSelect = (slot24: string) => {
    if (isSlotInPast(formData.date, slot24)) {
      setSubmitStatus({ type: "error", message: "Cannot select a past time slot." });
      return;
    }
    setFormData((prev) => ({ ...prev, timeSlot: slot24 }));
    setSubmitStatus({ type: null, message: "" });
  };

  const handleDiscountToggle = (id: string) => {
    const d = discounts.find((o) => o.id === id);
    if (d?.soldOut) return;
    setFormData((prev) => ({
      ...prev,
      selectedDiscounts: prev.selectedDiscounts.includes(id) ? prev.selectedDiscounts.filter((x) => x !== id) : [...prev.selectedDiscounts, id],
    }));
  };

  const getUrgencyLabel = (slotsLeft: number | undefined): string | null => {
    if (typeof slotsLeft !== "number" || slotsLeft <= 0) return null;
    if (slotsLeft <= 5) return "Few slots left";
    if (slotsLeft <= 10) return "Selling out fast";
    if (slotsLeft <= 20) return "Limited slots available";
    return null;
  };

  const isValidPhone = (p: string) => /^\d{10}$/.test(p.replace(/\D/g, ""));

  const canSubmit = () =>
    formData.date && formData.timeSlot && guests >= 1 && formData.fullName.trim() && isValidPhone(formData.contactNumber) &&
    (brand.id !== "the-hub" || formData.hubSpotId);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit() || isSubmitting) return;
    if (isSlotInPast(formData.date, formData.timeSlot)) {
      setSubmitStatus({ type: "error", message: "Please choose a date and time in the future." });
      return;
    }
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          contactNumber: formData.contactNumber,
          numberOfMen: String(guests),
          numberOfWomen: "0",
          numberOfCouples: "0",
          date: formData.date,
          timeSlot: formData.timeSlot,
          notes: formData.notes || null,
          eventId: formData.eventId || null,
          selectedDiscounts: formData.selectedDiscounts,
          brandId: brand.id,
          brandName: brand.name,
          hubSpotId: brand.id === "the-hub" ? formData.hubSpotId || null : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({ fullName: "", contactNumber: "", date: todayStr, timeSlot: "", selectedDiscounts: [], notes: "", eventId: initialEventId, hubSpotId: undefined });
        setGuests(2);
        setShowSuccessToast(true);
        if (successToastTimeoutRef.current) clearTimeout(successToastTimeoutRef.current);
        successToastTimeoutRef.current = setTimeout(() => setShowSuccessToast(false), 3000);
        setReservationConfirmed(true);
        setReservationId(data?.reservationId ?? null);
        setSubmitStatus({ type: null, message: "" });
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.details || "Failed to submit");
      }
    } catch (err) {
      setSubmitStatus({ type: "error", message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDate = formData.date || todayStr;

  if (reservationConfirmed) {
    return (
      <div className="relative flex flex-col gap-4 pb-24">
        <AnimatePresence>
          {showSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
            >
              <motion.div
                animate={{ boxShadow: [`0 0 0 ${accentColor}00`, `0 0 22px ${accentColor}66`, `0 0 0 ${accentColor}00`] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-2xl border px-4 py-3 backdrop-blur-xl"
                style={{ backgroundColor: "rgba(9, 14, 20, 0.92)", borderColor: `${accentColor}70` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${accentColor}2A`, border: `1px solid ${accentColor}50` }}
                  >
                    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Event booked successfully</p>
                    <p className="text-xs text-gray-300">WhatsApp confirmation sent successfully.</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}30`, border: `1px solid ${accentColor}40` }}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white">Booking Confirmed ✅</h2>
              <p className="text-sm text-gray-300 mt-1">Your table has been reserved successfully.</p>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-300">We&apos;ll notify you on WhatsApp 📲</div>

          {reservationId && (
            <div className="mt-3 text-xs text-gray-500 font-mono">Reference: {reservationId}</div>
          )}
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 z-20 p-4 backdrop-blur-xl bg-black/80 border-t border-white/10"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <motion.button
            type="button"
            onClick={() => router.push(`/${brand.id}`)}
            className="w-full py-3.5 text-sm font-bold text-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 24px ${accentColor}50` }}
          >
            Back to Outlet
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pb-24">
      {formData.eventId && (
        <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/75">
          Booking for selected event
        </div>
      )}
      {/* A. Horizontal Date Picker */}
      <div>
        <div
          ref={dateScrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {datePickerDays.map((day) => {
            const selected = currentDate === day.dateStr;
            return (
              <motion.button
                key={day.dateStr}
                type="button"
                onClick={() => handleDateSelect(day.dateStr)}
                className="flex-shrink-0 flex flex-col items-center justify-center w-14 py-2.5 rounded-xl border transition-all"
                style={{
                  backgroundColor: selected ? `${accentColor}30` : "rgba(255,255,255,0.06)",
                  borderColor: selected ? accentColor : "rgba(255,255,255,0.12)",
                  boxShadow: selected ? `0 0 14px ${accentColor}40` : undefined,
                }}
              >
                <span className="text-[10px] font-medium text-gray-400">{day.dayName}</span>
                <span className="text-base font-bold text-white">{day.dayNum}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* B. Time Slots */}
      {formData.date && (
        <div className="space-y-2">
          <div className="flex gap-1.5 p-1 bg-white/5 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => { setTimeSlotTab("lunch"); setFormData((p) => ({ ...p, timeSlot: "", selectedDiscounts: [] })); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${timeSlotTab === "lunch" ? "text-white" : "text-gray-400"}`}
              style={{ backgroundColor: timeSlotTab === "lunch" ? `${accentColor}80` : "transparent" }}
            >
              Lunch
            </button>
            <button
              type="button"
              onClick={() => { setTimeSlotTab("dinner"); setFormData((p) => ({ ...p, timeSlot: "", selectedDiscounts: [] })); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${timeSlotTab === "dinner" ? "text-white" : "text-gray-400"}`}
              style={{ backgroundColor: timeSlotTab === "dinner" ? `${accentColor}80` : "transparent" }}
            >
              Dinner
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {timeSlots.map((slot) => {
              const past = isSlotInPast(formData.date, slot.value24);
              const sel = formData.timeSlot === slot.value24;
              return (
                <motion.button
                  key={slot.value24}
                  type="button"
                  onClick={() => handleSlotSelect(slot.value24)}
                  disabled={past}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${past ? "opacity-50 text-gray-500 cursor-not-allowed" : sel ? "text-white" : "text-gray-300 bg-white/5 border-white/10 hover:bg-white/10"}`}
                  style={{
                    backgroundColor: sel ? accentColor : undefined,
                    borderColor: sel ? accentColor : undefined,
                    boxShadow: sel ? `0 0 12px ${accentColor}50` : undefined,
                  }}
                >
                  {slot.display12}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* C. Discounts - reveal only after slot selected */}
      <AnimatePresence>
        {formData.timeSlot && discounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <p className="text-xs font-semibold text-gray-300">
              ✨ Available discounts for {formatTo12Hour(formData.timeSlot)}
            </p>
            <div className="flex flex-col gap-2">
              {discounts.map((offer) => {
                const soldOut = offer.soldOut;
                const sel = formData.selectedDiscounts.includes(offer.id);
                const urgencyLabel = getUrgencyLabel(offer.slotsLeft);
                return (
                  <motion.button
                    key={offer.id}
                    type="button"
                    onClick={() => handleDiscountToggle(offer.id)}
                    disabled={soldOut}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${soldOut ? "opacity-60 cursor-not-allowed border-white/5 bg-white/5" : sel ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}
                    style={{ boxShadow: sel ? `0 0 14px ${accentColor}25` : undefined }}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${sel ? "border-white" : "border-white/40"}`} style={{ backgroundColor: sel ? accentColor : "transparent" }}>
                      {sel && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{offer.title}</div>
                      {offer.description && <div className="text-xs text-gray-400 mt-0.5">{offer.description}</div>}
                      {!soldOut && urgencyLabel && (
                        <div className="text-xs font-medium text-gray-400 mt-1">
                          {urgencyLabel}
                        </div>
                      )}
                      {soldOut && <div className="text-xs font-semibold text-amber-400 mt-1">SOLD OUT</div>}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* D. Guests Selector */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium text-gray-300">Guests</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M20 12H4" /></svg>
          </button>
          <span className="w-8 text-center text-sm font-semibold text-white">{guests}</span>
          <button
            type="button"
            onClick={() => setGuests((g) => Math.min(20, g + 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
            style={{ backgroundColor: `${accentColor}60`, border: `1px solid ${accentColor}` }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      {/* Contact - compact; text-base prevents iOS zoom on focus */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Full name *"
          value={formData.fullName}
          onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
          className="w-full px-3 py-2.5 text-base bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
          style={{ fontSize: "16px" }}
        />
        <input
          type="tel"
          inputMode="numeric"
          placeholder="10-digit mobile *"
          maxLength={10}
          value={formData.contactNumber}
          onChange={(e) => setFormData((p) => ({ ...p, contactNumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
          className={`w-full px-3 py-2.5 text-base bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors ${formData.contactNumber && !isValidPhone(formData.contactNumber) ? "border-red-500/50" : "border-white/15"}`}
          style={{ fontSize: "16px" }}
        />
        {formData.contactNumber && !isValidPhone(formData.contactNumber) && (
          <p className="text-xs text-red-400">Enter a valid 10-digit number</p>
        )}
      </div>

      {brand.id === "the-hub" && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Select outlet</p>
          <div className="flex gap-2">
            {["c53", "boiler-room", "firefly"].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setFormData((p) => ({ ...p, hubSpotId: id }))}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${formData.hubSpotId === id ? "text-white" : "text-gray-400 border-white/15"}`}
                style={{
                  backgroundColor: formData.hubSpotId === id ? `${accentColor}60` : "rgba(255,255,255,0.05)",
                  borderColor: formData.hubSpotId === id ? accentColor : undefined,
                }}
              >
                {id === "c53" ? "C53" : id === "boiler-room" ? "Boiler Room" : "Firefly"}
              </button>
            ))}
          </div>
        </div>
      )}

      {submitStatus.type === "error" && (
        <div className="p-3 rounded-xl text-sm bg-red-500/20 text-red-300 border border-red-500/30">
          {submitStatus.message}
        </div>
      )}

      {/* E. Sticky Continue Button */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 p-4 backdrop-blur-xl bg-black/80 border-t border-white/10"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <motion.button
          type="submit"
          disabled={!canSubmit() || isSubmitting}
          className="w-full py-3.5 text-sm font-bold text-black rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: accentColor,
            boxShadow: canSubmit() && !isSubmitting ? `0 0 24px ${accentColor}50` : undefined,
          }}
        >
          {isSubmitting ? "Processing..." : "Confirm Booking"}
        </motion.button>
      </div>
    </form>
  );
}
