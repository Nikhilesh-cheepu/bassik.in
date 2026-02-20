"use client";

import { useState, FormEvent, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Brand } from "@/lib/brands";
import { trackWhatsAppClick } from "@/lib/analytics";

interface ReservationFormProps {
  brand: Brand;
}

interface FormData {
  fullName: string;
  contactNumber: string;
  numberOfMen: string;
  numberOfWomen: string;
  numberOfCouples: string;
  date: string;
  timeSlot: string;
  selectedDiscounts: string[];
  notes: string;
  hubSpotId?: string; // For The Hub only: which spot (C53 / Boiler Room / Firefly)
}

type Discount = {
  id: string;
  title: string;
  description: string;
  applicable: boolean;
  /** From API: false when limit reached for selected date */
  soldOut?: boolean;
};

export default function ReservationForm({ brand }: ReservationFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    contactNumber: "",
    numberOfMen: "",
    numberOfWomen: "",
    numberOfCouples: "",
    date: "",
    timeSlot: "",
    selectedDiscounts: [],
    notes: "",
    hubSpotId: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [timeSlotTab, setTimeSlotTab] = useState<"lunch" | "dinner">("lunch");
  const [timeSlotPickerOpen, setTimeSlotPickerOpen] = useState(true);
  /** Discount availability for selected date (used/max, sold out). Fetched when date is set. */
  const [discountAvailability, setDiscountAvailability] = useState<Record<string, { available: boolean; used?: number; max?: number | null }>>({});

  // Helper function (not a hook)
  const formatTo12Hour = (time24: string): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")}${period}`;
  };

  // ALL useMemo hooks must be called before any returns
  const allTimeSlots = useMemo(() => {
    const slots: { value24: string; display12: string; category: "lunch" | "dinner" }[] = [];
    const isClubRogue = brand.id.startsWith("club-rogue");
    const startHour = isClubRogue ? 17 : 12;
    
    for (let hour = startHour; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time24 = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const category: "lunch" | "dinner" = hour < 19 ? "lunch" : "dinner";
        slots.push({
          value24: time24,
          display12: formatTo12Hour(time24),
          category,
        });
      }
    }
    return slots;
  }, [brand.id]);

  const timeSlots = useMemo(() => {
    return allTimeSlots.filter((slot) => slot.category === timeSlotTab);
  }, [allTimeSlots, timeSlotTab]);

  const availableDiscounts = useMemo((): Discount[] => {
    const discounts: Discount[] = [];
    const isClubRogue = brand.id.startsWith("club-rogue");
    const lunchStart = isClubRogue ? "17:00" : "12:00";
    const isLunchTime = formData.timeSlot && 
      formData.timeSlot >= lunchStart && 
      ((brand.id === "kiik69" || brand.id === "alehouse" || brand.id === "skyhy") ? formData.timeSlot < "20:00" : formData.timeSlot < "19:00");

    if (brand.id.startsWith("club-rogue")) {
      return [];
    }

    if (brand.id === "kiik69") {
      discounts.push({
        id: "kiik-10-percent",
        title: "10% off on total bill",
        description: "Get 10% discount on your total bill",
        applicable: true,
      });
      if (isLunchTime) {
        discounts.push({
          id: "kiik-lunch",
          title: "Lunch Special @ ₹128",
          description: "Eat & drink anything @ ₹128 (12PM - 8PM)",
          applicable: true,
        });
      }
    }

    if (brand.id === "c53" || brand.id === "boiler-room") {
      if (isLunchTime) {
        discounts.push({
          id: "lunch-special",
          title: "Lunch Special @ ₹127",
          description: "Eat & drink anything @ ₹127 (12PM - 7PM)",
          applicable: true,
        });
      }
    }

    if (brand.id === "alehouse") {
      if (isLunchTime) {
        discounts.push({
          id: "alehouse-lunch",
          title: "Lunch Special @ ₹128",
          description: "Eat & drink anything @ ₹128 (12PM - 8PM)",
          applicable: true,
        });
      }
      discounts.push({
        id: "alehouse-liquor",
        title: "50% off on liquor",
        description: "Get 50% discount on all liquor (All day)",
        applicable: true,
      });
    }

    if (brand.id === "skyhy") {
      if (isLunchTime) {
        discounts.push({
          id: "skyhy-lunch",
          title: "Lunch Special @ ₹128",
          description: "Eat & drink anything @ ₹128 (12PM - 8PM)",
          applicable: true,
        });
      }
    }

    return discounts;
  }, [brand.id, formData.timeSlot]);

  /** Merge API availability: mark soldOut when limit reached for selected date */
  const availableDiscountsWithAvailability = useMemo((): Discount[] => {
    return availableDiscounts.map((d) => ({
      ...d,
      soldOut: discountAvailability[d.id]?.available === false,
    }));
  }, [availableDiscounts, discountAvailability]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    setCurrentStep(1);
    setFormData({
      fullName: "",
      contactNumber: "",
      numberOfMen: "",
      numberOfWomen: "",
      numberOfCouples: "",
      date: "",
      timeSlot: "",
      selectedDiscounts: [],
      notes: "",
      hubSpotId: undefined,
    });
    setTimeSlotTab("lunch");
    setTimeSlotPickerOpen(false);
    setSubmitStatus({ type: null, message: "" });
    setDiscountAvailability({});
  }, [brand.id]);

  // Fetch discount availability once when date is set (no repeated loops)
  useEffect(() => {
    if (!formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      setDiscountAvailability({});
      return;
    }
    if (brand.id.startsWith("club-rogue")) return;
    let cancelled = false;
    fetch(`/api/venues/${brand.id}/discounts-availability?date=${formData.date}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: { availability?: { discountId: string; available: boolean; used?: number; max?: number | null }[] } | null) => {
        if (cancelled || !data?.availability) return;
        const map: Record<string, { available: boolean; used?: number; max?: number | null }> = {};
        data.availability.forEach((a: { discountId: string; available: boolean; used?: number; max?: number | null }) => {
          map[a.discountId] = { available: a.available, used: a.used, max: a.max };
        });
        setDiscountAvailability(map);
      })
      .catch(() => { if (!cancelled) setDiscountAvailability({}); });
    return () => { cancelled = true; };
  }, [brand.id, formData.date]);

  const isSlotInPast = (date: string, slot: string): boolean => {
    if (!date || !slot) return false;
    const selected = new Date(`${date}T${slot}`);
    return selected.getTime() < new Date().getTime();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    setFormData((prev) => ({ ...prev, date: selectedDate, timeSlot: "" }));
    setTimeSlotPickerOpen(true);
    
    // If date is today and lunch time is over, automatically switch to dinner
    if (selectedDate === todayStr) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime24 = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
      
      // Check if lunch time is over (after 7 PM for most venues, 8 PM for some)
      const lunchEndTime = (brand.id === "kiik69" || brand.id === "alehouse" || brand.id === "skyhy") ? "20:00" : "19:00";
      if (currentTime24 >= lunchEndTime) {
        setTimeSlotTab("dinner");
      } else {
        setTimeSlotTab("lunch");
      }
    } else {
      // For future dates, default to lunch
      setTimeSlotTab("lunch");
    }
  };

  const handleSlotSelect = (slot24: string) => {
    if (isSlotInPast(formData.date, slot24)) {
      setSubmitStatus({
        type: "error",
        message: "Cannot select a time slot in the past.",
      });
      return;
    }
    setFormData((prev) => ({ ...prev, timeSlot: slot24 }));
    setTimeSlotPickerOpen(false);
    setSubmitStatus({ type: null, message: "" });
  };

  const handleDiscountToggle = (discountId: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedDiscounts.includes(discountId);
      return {
        ...prev,
        selectedDiscounts: isSelected
          ? prev.selectedDiscounts.filter((id) => id !== discountId)
          : [...prev.selectedDiscounts, discountId],
      };
    });
  };

  const isValid10DigitPhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, "");
    return /^\d{10}$/.test(digits);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "contactNumber") {
      let digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length > 10 && (digitsOnly.startsWith("91") || digitsOnly.startsWith("0"))) {
        digitsOnly = digitsOnly.replace(/^(91|0)+/, "").slice(0, 10);
      } else {
        digitsOnly = digitsOnly.slice(0, 10);
      }
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const canProceedToStep2 = () => {
    return !!formData.date;
  };

  const canProceedToStep2To3 = () => {
    return formData.date && formData.timeSlot;
  };

  const canProceedToStep3 = () => {
    return (
      formData.numberOfMen !== "" ||
      formData.numberOfWomen !== "" ||
      formData.numberOfCouples !== ""
    );
  };

  const canProceedToStep4 = () => {
    const hasBasicContact =
      formData.fullName.trim().length > 0 &&
      formData.contactNumber.length === 10 &&
      isValid10DigitPhone(formData.contactNumber);

    if (brand.id === "the-hub") {
      return hasBasicContact && !!formData.hubSpotId;
    }
    return hasBasicContact;
  };

  const canSubmit = () => {
    const baseOk =
      !!formData.fullName &&
      !!formData.contactNumber &&
      isValid10DigitPhone(formData.contactNumber) &&
      (formData.numberOfMen !== "" ||
        formData.numberOfWomen !== "" ||
        formData.numberOfCouples !== "");

    if (brand.id === "the-hub") {
      return baseOk && !!formData.hubSpotId;
    }
    return baseOk;
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedToStep2()) {
      setSubmitStatus({
        type: "error",
        message: "Please select a date.",
      });
      return;
    }
    if (currentStep === 2 && !canProceedToStep2To3()) {
      setSubmitStatus({
        type: "error",
        message: "Please select a time slot.",
      });
      return;
    }
    if (currentStep === 3 && !canProceedToStep3()) {
      setSubmitStatus({
        type: "error",
        message: "Please enter at least one guest count.",
      });
      return;
    }
    if (currentStep === 4 && !canProceedToStep4()) {
      setSubmitStatus({
        type: "error",
        message: "Please enter your name and a valid 10-digit contact number before continuing.",
      });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
    setSubmitStatus({ type: null, message: "" });
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setSubmitStatus({ type: null, message: "" });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!canSubmit()) {
      setSubmitStatus({
        type: "error",
        message: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    if (isSlotInPast(formData.date, formData.timeSlot)) {
      setSubmitStatus({
        type: "error",
        message: "Please choose a date and time in the future.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          contactNumber: formData.contactNumber,
          numberOfMen: formData.numberOfMen || "0",
          numberOfWomen: formData.numberOfWomen || "0",
          numberOfCouples: formData.numberOfCouples || "0",
          date: formData.date,
          timeSlot: formData.timeSlot,
          notes: formData.notes,
          selectedDiscounts: formData.selectedDiscounts,
          brandId: brand.id,
          brandName: brand.name,
          hubSpotId: brand.id === "the-hub" ? formData.hubSpotId || null : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Reset form
        setFormData({
          fullName: "",
          contactNumber: "",
          numberOfMen: "",
          numberOfWomen: "",
          numberOfCouples: "",
          date: "",
          timeSlot: "",
          selectedDiscounts: [],
          notes: "",
          hubSpotId: undefined,
        });
        setCurrentStep(1);

        // Redirect to WhatsApp if URL is provided
        if (data.whatsappUrl) {
          const match = String(data.whatsappUrl).match(/wa\.me\/(\d+)/);
          const number = match ? match[1] : "";
          trackWhatsAppClick({ number, source: "reservation", outlet: brand.id });
          // Small delay to ensure form state is reset, then redirect
          setTimeout(() => {
            window.location.href = data.whatsappUrl;
          }, 100);
        } else {
          // Fallback: Show success message if no WhatsApp URL
          setSubmitStatus({
            type: "success",
            message: "Reservation submitted successfully! Our team will reach out shortly.",
          });
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        const errorMessage = errData.error || errData.details || "Failed to submit reservation";
        throw new Error(errorMessage);
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Date", icon: "📅" },
    { number: 2, title: "Time", icon: "🕐" },
    { number: 3, title: "Guests & Offers", icon: "👥" },
    { number: 4, title: "Contact & Confirm", icon: "✓" },
  ];

  // Next 14 days for tap-only date picker (no past dates)
  const datePickerDays = useMemo(() => {
    const days: { dateStr: string; dayName: string; dayNum: string; monthShort: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        dateStr,
        dayName: d.toLocaleDateString("en-IN", { weekday: "short" }),
        dayNum: d.getDate().toString(),
        monthShort: d.toLocaleDateString("en-IN", { month: "short" }),
      });
    }
    return days;
  }, []);

  const handleDateSelect = (dateStr: string) => {
    setFormData((prev) => ({ ...prev, date: dateStr, timeSlot: "" }));
    setTimeSlotPickerOpen(true);
    if (dateStr === todayStr) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime24 = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
      const lunchEndTime = (brand.id === "kiik69" || brand.id === "alehouse" || brand.id === "skyhy") ? "20:00" : "19:00";
      setTimeSlotTab(currentTime24 >= lunchEndTime ? "dinner" : "lunch");
    } else {
      setTimeSlotTab("lunch");
    }
  };

  return (
    <div className="w-full">
      {/* Premium Step Indicator - Glowing & Animated */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center w-full">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1" style={{ minWidth: 0 }}>
              <div className="flex flex-col items-center flex-1 min-w-0 relative z-10">
                <motion.div
                  className="relative mb-2"
                  initial={false}
                  animate={{
                    scale: currentStep === step.number ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className={`w-10 h-10 sm:w-12 sm:h-14 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 backdrop-blur-md border-2 ${
                    currentStep >= step.number
                        ? "text-white"
                        : "text-gray-400 border-white/10"
                  }`}
                  style={{
                      backgroundColor: currentStep >= step.number 
                        ? `${brand.accentColor}80` 
                        : "rgba(255, 255, 255, 0.05)",
                      borderColor: currentStep >= step.number 
                        ? brand.accentColor 
                        : "rgba(255, 255, 255, 0.1)",
                      boxShadow: currentStep >= step.number
                        ? `0 0 20px ${brand.accentColor}60, 0 4px 14px ${brand.accentColor}40`
                        : undefined,
                    }}
                    animate={{
                      boxShadow: currentStep === step.number
                        ? [
                            `0 0 20px ${brand.accentColor}60, 0 4px 14px ${brand.accentColor}40`,
                            `0 0 30px ${brand.accentColor}80, 0 4px 14px ${brand.accentColor}40`,
                            `0 0 20px ${brand.accentColor}60, 0 4px 14px ${brand.accentColor}40`,
                          ]
                        : undefined,
                    }}
                    transition={{
                      duration: 2,
                      repeat: currentStep === step.number ? Infinity : 0,
                      ease: "easeInOut",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {currentStep > step.number ? (
                        <motion.svg
                          key="check"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </motion.svg>
                      ) : (
                        <motion.span
                          key="number"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                >
                  {step.number}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
                <motion.span
                  className={`text-[9px] sm:text-[10px] font-semibold text-center transition-all leading-tight ${
                    currentStep >= step.number ? "text-white" : "text-gray-500"
                  }`}
                  style={{
                    color: currentStep >= step.number ? brand.accentColor : undefined,
                    textShadow: currentStep >= step.number ? `0 0 10px ${brand.accentColor}40` : undefined,
                  }}
                >
                  {step.title}
                </motion.span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex items-center px-1 sm:px-2 flex-1 relative" style={{ marginTop: '-20px' }}>
                  <motion.div
                    className="h-0.5 sm:h-1 rounded-full w-full"
                    initial={{ scaleX: 0 }}
                    animate={{
                      scaleX: currentStep > step.number ? 1 : 0.3,
                      backgroundColor: currentStep > step.number 
                        ? brand.accentColor 
                        : "rgba(255, 255, 255, 0.1)",
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Date only – tap-only picker */}
        {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 min-w-0 overflow-visible"
            >
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 flex items-center gap-2">
                  <span className="w-1 h-6 sm:h-8 rounded-full flex-shrink-0" style={{ backgroundColor: brand.accentColor, boxShadow: `0 0 20px ${brand.accentColor}60` }} />
                  Select Date
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">Tap a date to continue</p>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
                  {datePickerDays.map((day) => {
                    const isSelected = formData.date === day.dateStr;
                    return (
                      <motion.button
                        key={day.dateStr}
                        type="button"
                        onClick={() => handleDateSelect(day.dateStr)}
                        className={`flex flex-col items-center justify-center py-3 sm:py-4 px-2 rounded-xl border-2 transition-all touch-manipulation ${
                          isSelected
                            ? "text-white border-transparent"
                            : "bg-white/10 text-gray-300 border-white/20 hover:bg-white/15 hover:border-white/30"
                        }`}
                        style={{
                          backgroundColor: isSelected ? brand.accentColor : undefined,
                          boxShadow: isSelected ? `0 0 16px ${brand.accentColor}50` : undefined,
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                        }}
                        whileTap={{ scale: 0.96 }}
                      >
                        <span className="text-[10px] sm:text-xs font-medium text-current opacity-90">{day.dayName}</span>
                        <span className="text-base sm:text-lg font-bold mt-0.5">{day.dayNum}</span>
                        <span className="text-[10px] sm:text-xs text-current opacity-75">{day.monthShort}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
        )}

          {/* Step 2: Time only */}
        {currentStep === 2 && formData.date && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 flex items-center gap-2">
                  <span className="w-1 h-6 sm:h-8 rounded-full flex-shrink-0" style={{ backgroundColor: brand.accentColor, boxShadow: `0 0 20px ${brand.accentColor}60` }} />
                  Select Time
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-3">Choose your preferred slot</p>

                <div className="flex gap-2 mb-3 backdrop-blur-xl bg-white/5 p-1 rounded-xl border border-white/10">
                  <motion.button
                    type="button"
                    onClick={() => { setTimeSlotTab("lunch"); setFormData((prev) => ({ ...prev, timeSlot: "" })); setTimeSlotPickerOpen(true); }}
                    className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all touch-manipulation ${timeSlotTab === "lunch" ? "text-white" : "text-gray-400"}`}
                    style={{ backgroundColor: timeSlotTab === "lunch" ? `${brand.accentColor}80` : "transparent", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🍽️ Lunch
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => { setTimeSlotTab("dinner"); setFormData((prev) => ({ ...prev, timeSlot: "" })); setTimeSlotPickerOpen(true); }}
                    className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all touch-manipulation ${timeSlotTab === "dinner" ? "text-white" : "text-gray-400"}`}
                    style={{ backgroundColor: timeSlotTab === "dinner" ? `${brand.accentColor}80` : "transparent", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🌙 Dinner
                  </motion.button>
                </div>

                {formData.timeSlot && !timeSlotPickerOpen ? (
                  <motion.div className="flex items-center justify-between gap-3 p-3 backdrop-blur-xl bg-white/5 rounded-xl border border-white/10">
                    <span className="text-sm font-semibold text-white">{formatTo12Hour(formData.timeSlot)} <span className="text-green-400">✓</span></span>
                    <motion.button type="button" onClick={() => setTimeSlotPickerOpen(true)} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ color: brand.accentColor, backgroundColor: `${brand.accentColor}30` }} whileTap={{ scale: 0.95 }}>Change</motion.button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-52 sm:max-h-60 overflow-y-auto p-2 backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 scrollbar-hide">
                    {timeSlots.map((slot) => {
                      const isPast = isSlotInPast(formData.date, slot.value24);
                      const isSelected = formData.timeSlot === slot.value24;
                      return (
                        <motion.button
                          key={slot.value24}
                          type="button"
                          onClick={(e) => { e.preventDefault(); if (!isPast) handleSlotSelect(slot.value24); }}
                          disabled={isPast}
                          className={`w-full px-2 py-2.5 text-xs font-medium rounded-lg border-2 transition-all touch-manipulation ${
                            isPast ? "bg-white/5 text-gray-600 border-white/5 cursor-not-allowed" : isSelected ? "text-white border-transparent" : "bg-white/10 text-gray-300 border-white/20 hover:bg-white/20"
                          }`}
                          style={{ backgroundColor: isSelected ? brand.accentColor : undefined, boxShadow: isSelected ? `0 0 14px ${brand.accentColor}50` : undefined, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          whileTap={!isPast ? { scale: 0.95 } : {}}
                        >
                          {slot.display12}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
        )}

          {/* Step 3: Guests & Offers */}
        {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
                  <span className="w-1 h-6 sm:h-8 rounded-full flex-shrink-0" style={{ backgroundColor: brand.accentColor, boxShadow: `0 0 20px ${brand.accentColor}60` }} />
                  <span>Number of Guests</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">Tell us how many guests to expect</p>
                
                {/* Guest Inputs - Animated +/- Buttons */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {[
                    { key: "numberOfMen", label: "👨 Men", emoji: "👨" },
                    { key: "numberOfWomen", label: "👩 Women", emoji: "👩" },
                    { key: "numberOfCouples", label: "💑 Couples", emoji: "💑" },
                  ].map(({ key, label, emoji }) => (
                    <motion.div
                      key={key}
                      className="backdrop-blur-xl bg-white/10 rounded-xl sm:rounded-2xl border border-white/20 p-2.5 sm:p-4"
                      whileHover={{ scale: 1.02 }}
                    >
                      <label className="block text-[10px] sm:text-xs font-semibold text-gray-300 mb-2 sm:mb-3 text-center">
                        {label}
                      </label>
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        <motion.button
                          type="button"
                          onClick={() => {
                            const current = parseInt(formData[key as keyof FormData] as string) || 0;
                            if (current > 0) {
                              setFormData((prev) => ({
                                ...prev,
                                [key]: (current - 1).toString(),
                              }));
                            }
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg backdrop-blur-md bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all touch-manipulation"
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </motion.button>
                        <input
                          type="number"
                          name={key}
                          min="0"
                          value={formData[key as keyof FormData] as string}
                          onChange={handleChange}
                          className="w-12 sm:w-16 text-center py-1.5 sm:py-2 text-base sm:text-lg font-bold text-white bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                        <motion.button
                          type="button"
                          onClick={() => {
                            const current = parseInt(formData[key as keyof FormData] as string) || 0;
                            setFormData((prev) => ({
                              ...prev,
                              [key]: (current + 1).toString(),
                            }));
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg backdrop-blur-md bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all touch-manipulation"
                          style={{ backgroundColor: `${brand.accentColor}40`, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
            </div>

              {/* Optional Offers in Step 3 – sold out from API when limit reached */}
            {availableDiscountsWithAvailability.length > 0 && (
              <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>✨</span> Optional Offers
                </h3>
                <div className="space-y-3">
                  {availableDiscountsWithAvailability.map((discount) => {
                    const soldOut = discount.soldOut;
                    const isSelected = formData.selectedDiscounts.includes(discount.id);
                    return (
                      <motion.div
                        key={discount.id}
                        role="button"
                        tabIndex={soldOut ? -1 : 0}
                        onClick={() => !soldOut && handleDiscountToggle(discount.id)}
                        onKeyDown={(e) => {
                          if (!soldOut && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); handleDiscountToggle(discount.id); }
                        }}
                        className={`flex items-start gap-3 p-4 backdrop-blur-md rounded-xl border-2 transition-all ${
                          soldOut ? "cursor-not-allowed opacity-75 border-white/5 bg-white/5" : "cursor-pointer border-white/10 hover:border-white/20"
                        } ${isSelected ? "border-white/30" : ""}`}
                        style={{
                          backgroundColor: isSelected ? `${brand.accentColor}20` : "rgba(255, 255, 255, 0.05)",
                          boxShadow: isSelected ? `0 0 20px ${brand.accentColor}30` : undefined,
                        }}
                        whileHover={!soldOut ? { scale: 1.02 } : {}}
                        whileTap={!soldOut ? { scale: 0.98 } : {}}
                      >
                        <motion.div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? "border-white" : "border-white/30"
                          }`}
                          style={{ backgroundColor: isSelected ? brand.accentColor : "transparent" }}
                        >
                          {isSelected && (
                            <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </motion.svg>
                          )}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm">{discount.title}</div>
                          <div className="text-xs text-gray-400 mt-1">{discount.description}</div>
                          {soldOut && <div className="text-xs font-medium text-amber-400 mt-1">Sold out for this date</div>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                Special Requests (Optional)
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                  className="w-full px-4 py-3 text-sm backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-all resize-none"
                  style={{
                    borderColor: formData.notes ? `${brand.accentColor}60` : undefined,
                    boxShadow: formData.notes ? `0 0 20px ${brand.accentColor}30` : undefined,
                  }}
                onFocus={(e) => {
                  e.target.style.borderColor = brand.accentColor;
                    e.target.style.boxShadow = `0 0 30px ${brand.accentColor}50`;
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = formData.notes ? `${brand.accentColor}60` : "rgba(255, 255, 255, 0.2)";
                    e.target.style.boxShadow = formData.notes ? `0 0 20px ${brand.accentColor}30` : "";
                }}
                placeholder="Any special occasion, dietary requirements, or preferences..."
              />
            </div>
            </motion.div>
        )}

          {/* Step 4: Contact & Confirm */}
        {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Review summary at top of step 4 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4 space-y-2"
              >
                <div className="text-xs text-gray-400">Booking summary</div>
                <div className="font-semibold text-white">
                  {formData.date && formData.timeSlot
                    ? `${new Date(formData.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} at ${formatTo12Hour(formData.timeSlot)}`
                    : "—"}
                </div>
                <div className="text-sm text-gray-300">
                  {[formData.numberOfMen !== "" && formData.numberOfMen !== "0" ? `${formData.numberOfMen} Men` : null, formData.numberOfWomen !== "" && formData.numberOfWomen !== "0" ? `${formData.numberOfWomen} Women` : null, formData.numberOfCouples !== "" && formData.numberOfCouples !== "0" ? `${formData.numberOfCouples} Couples` : null].filter(Boolean).join(", ") || "0"} guests
                  {formData.selectedDiscounts.length > 0 && ` · ${formData.selectedDiscounts.length} offer(s)`}
                </div>
              </motion.div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-1 h-6 sm:h-8 rounded-full flex-shrink-0" style={{ backgroundColor: brand.accentColor, boxShadow: `0 0 20px ${brand.accentColor}60` }} />
                  Contact Information
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-4">We&apos;ll use this to confirm your reservation</p>
                <div className="space-y-4 sm:space-y-5">
                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-2 sm:mb-3">
                      Full Name <span className="text-red-400">*</span>
                  </label>
                    <div className="relative max-w-full">
                      <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                        className="w-full max-w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-xs sm:text-sm font-medium backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-xl sm:rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-white/40 transition-all touch-manipulation"
                        style={{
                          borderColor: formData.fullName ? `${brand.accentColor}60` : undefined,
                          boxShadow: formData.fullName ? `0 0 20px ${brand.accentColor}30` : undefined,
                          touchAction: 'manipulation',
                        }}
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                          e.target.style.boxShadow = `0 0 30px ${brand.accentColor}50`;
                    }}
                    onBlur={(e) => {
                          e.target.style.borderColor = formData.fullName ? `${brand.accentColor}60` : "rgba(255, 255, 255, 0.2)";
                          e.target.style.boxShadow = formData.fullName ? `0 0 20px ${brand.accentColor}30` : "";
                    }}
                    placeholder="Enter your full name"
                  />
                    </div>
                </div>
                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-2 sm:mb-3">
                      Contact Number <span className="text-red-400">*</span>
                  </label>
                    <div className="relative max-w-full">
                      <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="contactNumber"
                    required
                    value={formData.contactNumber}
                    onChange={handleChange}
                        className={`w-full max-w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-xs sm:text-sm font-medium backdrop-blur-xl bg-white/10 border-2 rounded-xl sm:rounded-2xl text-white placeholder-gray-500 focus:outline-none transition-all touch-manipulation ${
                          formData.contactNumber && !isValid10DigitPhone(formData.contactNumber)
                            ? "border-red-500/60"
                            : "border-white/20"
                        }`}
                        style={{
                          touchAction: 'manipulation',
                          borderColor: formData.contactNumber && isValid10DigitPhone(formData.contactNumber)
                            ? `${brand.accentColor}60`
                            : formData.contactNumber && !isValid10DigitPhone(formData.contactNumber)
                            ? "rgba(239, 68, 68, 0.6)"
                            : undefined,
                          boxShadow: formData.contactNumber && isValid10DigitPhone(formData.contactNumber)
                            ? `0 0 20px ${brand.accentColor}30`
                            : undefined,
                        }}
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                          e.target.style.boxShadow = `0 0 30px ${brand.accentColor}50`;
                    }}
                    onBlur={(e) => {
                          const isValid = isValid10DigitPhone(formData.contactNumber);
                          e.target.style.borderColor = formData.contactNumber && !isValid
                            ? "rgba(239, 68, 68, 0.6)"
                            : formData.contactNumber && isValid
                            ? `${brand.accentColor}60`
                            : "rgba(255, 255, 255, 0.2)";
                          e.target.style.boxShadow = formData.contactNumber && isValid
                            ? `0 0 20px ${brand.accentColor}30`
                            : "";
                        }}
                        placeholder="10 digit mobile number"
                        maxLength={10}
                  />
                </div>
                    {formData.contactNumber && !isValid10DigitPhone(formData.contactNumber) && (
                      <p className="text-xs text-red-400 mt-2">Please enter a valid 10-digit number.</p>
                    )}
              </div>

              {/* The Hub only: select specific spot for routing (C53 / Boiler Room / Firefly) */}
              {brand.id === "the-hub" && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-2 sm:mb-3">
                    Select Hub Outlet <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { id: "c53", label: "C53" },
                      { id: "boiler-room", label: "Boiler Room" },
                      { id: "firefly", label: "Firefly" },
                    ].map((spot) => {
                      const isSelected = formData.hubSpotId === spot.id;
                      return (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, hubSpotId: spot.id }))
                          }
                          className={`w-full px-3 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold border transition-all ${
                            isSelected
                              ? "bg-white/15 border-white/40 text-white"
                              : "bg-white/5 border-white/15 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          {spot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
                </div>
              </div>
            </motion.div>
        )}

          {/* Step 4 Review card removed – summary now shown at top of Contact & Confirm step */}
        {false && currentStep === 4 && (
            <motion.div
              key="step4-review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
                  <span className="w-1 h-6 sm:h-8 rounded-full flex-shrink-0" style={{ backgroundColor: brand.accentColor, boxShadow: `0 0 20px ${brand.accentColor}60` }} />
                  <span>Review Your Booking</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">Please review your details before confirming</p>
                
                {/* VIP Ticket Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 rounded-2xl sm:rounded-3xl border-2 border-white/20 p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4 md:space-y-5 shadow-2xl"
                  style={{
                    boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px ${brand.accentColor}20`,
                  }}
                >
                  <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full backdrop-blur-md bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-gray-400 text-xs sm:text-sm block">Date & Time</span>
                        <div className="font-bold text-white text-sm sm:text-base md:text-lg truncate">
                          {formData.date && formData.timeSlot
                            ? `${new Date(formData.date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })} at ${formatTo12Hour(formData.timeSlot)}`
                            : "Not selected"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full backdrop-blur-md bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-gray-400 text-xs sm:text-sm block">Guests</span>
                        <div className="font-bold text-white text-sm sm:text-base md:text-lg truncate">
                          {[
                            formData.numberOfMen !== "" && formData.numberOfMen !== "0"
                              ? `${formData.numberOfMen} Men`
                              : null,
                            formData.numberOfWomen !== "" && formData.numberOfWomen !== "0"
                              ? `${formData.numberOfWomen} Women`
                              : null,
                            formData.numberOfCouples !== "" && formData.numberOfCouples !== "0"
                              ? `${formData.numberOfCouples} Couples`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(", ") || "0"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {formData.selectedDiscounts.length > 0 && availableDiscounts.length > 0 && (
                    <div className="pb-3 sm:pb-4 border-b border-white/10">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full backdrop-blur-md bg-white/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm sm:text-lg">✨</span>
                        </div>
                        <span className="text-gray-400 text-xs sm:text-sm">Selected Offers</span>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2 pl-[40px] sm:pl-[52px]">
                        {formData.selectedDiscounts.map((discountId) => {
                          const discount = availableDiscounts.find((d) => d.id === discountId);
                          return discount ? (
                            <motion.div
                              key={discountId}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
                              style={{ color: brand.accentColor }}
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="truncate">{discount.title}</span>
                            </motion.div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full backdrop-blur-md bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-gray-400 text-xs sm:text-sm block">Name</span>
                        <div className="font-bold text-white text-sm sm:text-base md:text-lg truncate">{formData.fullName}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full backdrop-blur-md bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-gray-400 text-xs sm:text-sm block">Contact</span>
                        <div className="font-bold text-white text-sm sm:text-base md:text-lg truncate">{formData.contactNumber}</div>
                      </div>
                    </div>
                  </div>

                  {formData.notes && (
                    <div className="pt-3 sm:pt-4 border-t border-white/10">
                      <span className="text-gray-400 text-xs sm:text-sm block mb-1 sm:mb-2">Special Requests</span>
                      <p className="text-xs sm:text-sm text-gray-300 break-words">{formData.notes}</p>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Messages */}
        {submitStatus.type && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl text-sm backdrop-blur-xl border-2 ${
              submitStatus.type === "success"
                ? "bg-green-500/20 text-green-300 border-green-500/30"
                : "bg-red-500/20 text-red-300 border-red-500/30"
            }`}
          >
            {submitStatus.message}
          </motion.div>
        )}

        {/* Navigation Buttons - Premium */}
        <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-white/10 gap-3 sm:gap-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {currentStep > 1 ? (
            <motion.button
              type="button"
              onClick={handleBack}
              onPointerDown={(e) => {
                e.preventDefault();
                handleBack();
              }}
              className="px-4 sm:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-lg sm:rounded-xl hover:bg-white/20 transition-all duration-200 flex items-center gap-1.5 sm:gap-2 min-w-[80px] sm:min-w-[100px] justify-center touch-manipulation relative z-20"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </motion.button>
          ) : (
            <div className="min-w-[80px] sm:min-w-[100px]" />
          )}

          {currentStep < 4 ? (
            (() => {
              const canAdvance =
                (currentStep === 1 && canProceedToStep2()) ||
                (currentStep === 2 && canProceedToStep2To3()) ||
                (currentStep === 3 && canProceedToStep3());
              return (
                <motion.button
                  type="button"
                  onClick={() => canAdvance && handleNext()}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (canAdvance) handleNext();
                  }}
                  disabled={!canAdvance}
                  className={`px-6 sm:px-8 py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold text-white rounded-lg sm:rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 backdrop-blur-xl border-2 border-white/20 min-w-[100px] sm:min-w-[140px] justify-center touch-manipulation relative z-20 ${
                    !canAdvance ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  style={{
                    backgroundColor: brand.accentColor,
                    boxShadow: canAdvance ? `0 8px 32px ${brand.accentColor}50` : undefined,
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  whileHover={canAdvance ? { scale: 1.05, boxShadow: `0 12px 40px ${brand.accentColor}70` } : {}}
                  whileTap={canAdvance ? { scale: 0.95 } : {}}
                >
                  <span>Continue</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              );
            })()
          ) : (
            <motion.button
              type="submit"
              disabled={isSubmitting || !canSubmit()}
              className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold text-white rounded-lg sm:rounded-xl transition-all duration-200 flex items-center gap-1.5 sm:gap-2 backdrop-blur-xl border-2 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed relative z-20 touch-manipulation min-w-[120px] sm:min-w-[160px] justify-center"
              style={{
                backgroundColor: brand.accentColor,
                boxShadow: !(isSubmitting || !canSubmit()) ? `0 8px 32px ${brand.accentColor}50` : undefined,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
              whileHover={!(isSubmitting || !canSubmit()) ? { scale: 1.05, boxShadow: `0 12px 40px ${brand.accentColor}70` } : {}}
              whileTap={!(isSubmitting || !canSubmit()) ? { scale: 0.95 } : {}}
              animate={!(isSubmitting || !canSubmit()) ? {
                boxShadow: [
                  `0 8px 32px ${brand.accentColor}50`,
                  `0 12px 40px ${brand.accentColor}70`,
                  `0 8px 32px ${brand.accentColor}50`,
                ],
              } : {}}
              transition={{ duration: 2, repeat: !(isSubmitting || !canSubmit()) ? Infinity : 0 }}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  Confirm Booking
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </motion.button>
          )}
        </div>
      </form>
    </div>
  );
}
