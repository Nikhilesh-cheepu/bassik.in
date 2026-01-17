"use client";

import { useState, FormEvent, useMemo } from "react";
import { Brand } from "@/lib/brands";

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
}

type Discount = {
  id: string;
  title: string;
  description: string;
  applicable: boolean;
};

export default function ReservationForm({ brand }: ReservationFormProps) {
  // Convert 24-hour format to 12-hour format with AM/PM
  const formatTo12Hour = (time24: string): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")}${period}`;
  };

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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [timeSlotTab, setTimeSlotTab] = useState<"lunch" | "dinner">("lunch");

  // Generate time slots (15 min intervals) - stored in 24-hour format
  // Club Rogue: 5PM-12AM, Others: 12PM-12AM
  // Lunch: 12PM-7PM (or 5PM-7PM for Club Rogue), Dinner: 7PM-12AM
  const allTimeSlots = useMemo(() => {
    const slots: { value24: string; display12: string; category: "lunch" | "dinner" }[] = [];
    const isClubRogue = brand.id.startsWith("club-rogue");
    const startHour = isClubRogue ? 17 : 12; // Club Rogue starts at 5PM (17:00), others at 12PM
    
    for (let hour = startHour; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time24 = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        // Lunch: 12:00-18:45 (12PM-6:45PM) or 17:00-18:45 (5PM-6:45PM) for Club Rogue
        // Dinner: 19:00-23:45 (7PM-11:45PM)
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

  // Filter slots based on selected tab
  const timeSlots = useMemo(() => {
    return allTimeSlots.filter((slot) => slot.category === timeSlotTab);
  }, [allTimeSlots, timeSlotTab]);

  // Get available discounts/offers for the brand
  const availableDiscounts = useMemo((): Discount[] => {
    const discounts: Discount[] = [];
    const isClubRogue = brand.id.startsWith("club-rogue");
    const lunchStart = isClubRogue ? "17:00" : "12:00"; // Club Rogue starts at 5PM
    const isLunchTime = formData.timeSlot && 
      formData.timeSlot >= lunchStart && 
      ((brand.id === "kiik69" || brand.id === "alehouse" || brand.id === "skyhy") ? formData.timeSlot < "20:00" : formData.timeSlot < "19:00");

    // Club Rogue - No discounts
    if (brand.id.startsWith("club-rogue")) {
      return [];
    }

    // KIIK 69
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

    // C53 & Boiler Room
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

    // Alehouse
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

    // SkyHy
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

  // Get minimum date (today)
  const todayStr = useMemo(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }, []);

  // Check if selected slot is in the past
  const isSlotInPast = (date: string, slot: string): boolean => {
    if (!date || !slot) return false;
    const selected = new Date(`${date}T${slot}`);
    return selected.getTime() < new Date().getTime();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, date: e.target.value, timeSlot: "" }));
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

  // Validate Indian phone number (10 digits, starts with 6, 7, 8, or 9)
  const validateIndianPhoneNumber = (phone: string): boolean => {
    // Remove spaces, dashes, and country code if present
    const cleaned = phone.replace(/[\s\-+91]/g, '');
    // Should be exactly 10 digits and start with 6, 7, 8, or 9
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Special handling for phone number - only allow digits and format
    if (name === "contactNumber") {
      // Remove all non-digits
      const digitsOnly = value.replace(/\D/g, '');
      // Limit to 10 digits
      const limited = digitsOnly.slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: limited }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const canProceedToStep2 = () => {
    return formData.date && formData.timeSlot;
  };

  const canProceedToStep3 = () => {
    return (
      formData.numberOfMen !== "" ||
      formData.numberOfWomen !== "" ||
      formData.numberOfCouples !== ""
    );
  };

  const canSubmit = () => {
    return (
      formData.fullName &&
      formData.contactNumber &&
      validateIndianPhoneNumber(formData.contactNumber) &&
      (formData.numberOfMen !== "" ||
        formData.numberOfWomen !== "" ||
        formData.numberOfCouples !== "")
    );
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedToStep2()) {
      setSubmitStatus({
        type: "error",
        message: "Please select a date and time slot.",
      });
      return;
    }
    if (currentStep === 2 && !canProceedToStep3()) {
      setSubmitStatus({
        type: "error",
        message: "Please enter at least one guest count.",
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
    if (!canSubmit()) {
      setSubmitStatus({
        type: "error",
        message: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    // Validate date/time
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Reset form first
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
        });
        setCurrentStep(1);

        // Redirect to WhatsApp with the reservation message
        if (data.whatsappUrl) {
          // Redirect directly to WhatsApp (works better than window.open)
          window.location.href = data.whatsappUrl;
        } else {
          // Fallback if whatsappUrl is not provided
          setSubmitStatus({
            type: "success",
            message: "Reservation request sent! Our team will reach out shortly.",
          });
        }
      } else {
        throw new Error("Failed to submit reservation");
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator - Shorter labels to prevent wrapping
  const steps = [
    { number: 1, title: "Date & Time" },
    { number: 2, title: "Guests" },
    { number: 3, title: "Contact" },
    { number: 4, title: "Review" },
  ];

  return (
    <div className="w-full">
      {/* Modern Step Indicator - Fixed Alignment */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-start w-full">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1" style={{ minWidth: 0 }}>
              {/* Step Circle and Label Container */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Step Circle */}
                <div className="relative mb-2">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 shadow-md ${
                      currentStep >= step.number
                        ? "text-white scale-110"
                        : "bg-gray-100 text-gray-400 scale-100"
                    }`}
                    style={{
                      backgroundColor:
                        currentStep >= step.number ? brand.accentColor : undefined,
                      boxShadow:
                        currentStep >= step.number
                          ? `0 4px 14px ${brand.accentColor}40`
                          : undefined,
                    }}
                  >
                    {currentStep > step.number ? (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  {/* Pulse animation for current step */}
                  {currentStep === step.number && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-75 -z-10"
                      style={{ backgroundColor: brand.accentColor }}
                    />
                  )}
                </div>
                {/* Step Label - Fixed to prevent wrapping */}
                <span
                  className={`text-[10px] sm:text-xs font-semibold text-center transition-all leading-tight px-0.5 ${
                    currentStep >= step.number
                      ? "text-gray-900"
                      : "text-gray-500"
                  }`}
                  style={{
                    color: currentStep >= step.number ? brand.accentColor : undefined,
                  }}
                >
                  {step.title}
                </span>
              </div>
              {/* Progress Line - Between circles */}
              {index < steps.length - 1 && (
                <div className="flex items-center px-2 sm:px-3 relative" style={{ top: '-22px' }}>
                  <div
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: "100%",
                      minWidth: "24px",
                      backgroundColor: currentStep > step.number ? brand.accentColor : "#e5e7eb",
                      background: currentStep > step.number
                        ? `linear-gradient(to right, ${brand.accentColor}, ${brand.accentColor}80)`
                        : undefined,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Date & Time Slot Selection */}
        {currentStep === 1 && (
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full" style={{ backgroundColor: brand.accentColor }} />
                Select Date & Time
              </h3>
              <p className="text-sm text-gray-500 mb-6">Choose when you'd like to visit us</p>

              {/* Date Selection - Modern Style */}
              <div className="mb-6">
                <label 
                  htmlFor="date-input"
                  className="block text-sm font-semibold text-gray-700 mb-2 cursor-pointer"
                >
                  Select Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="date-input"
                    type="date"
                    value={formData.date}
                    onChange={handleDateChange}
                    min={todayStr}
                    className="w-full pl-12 pr-4 py-3.5 text-sm font-medium bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    style={{ cursor: "pointer" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 4px ${brand.accentColor}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    onClick={(e) => {
                      e.currentTarget.showPicker?.();
                    }}
                  />
                </div>
              </div>

              {/* Time Slot Selection */}
              {formData.date && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Time Slot <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Lunch/Dinner Tabs - Modern */}
                  <div className="flex gap-3 mb-4 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setTimeSlotTab("lunch");
                        setFormData((prev) => ({ ...prev, timeSlot: "" }));
                      }}
                      className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        timeSlotTab === "lunch"
                          ? "text-white shadow-lg scale-105"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      style={{
                        backgroundColor:
                          timeSlotTab === "lunch" ? brand.accentColor : undefined,
                        boxShadow:
                          timeSlotTab === "lunch"
                            ? `0 4px 14px ${brand.accentColor}40`
                            : undefined,
                      }}
                    >
                      🍽️ Lunch
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimeSlotTab("dinner");
                        setFormData((prev) => ({ ...prev, timeSlot: "" }));
                      }}
                      className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                        timeSlotTab === "dinner"
                          ? "text-white shadow-lg scale-105"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      style={{
                        backgroundColor:
                          timeSlotTab === "dinner" ? brand.accentColor : undefined,
                        boxShadow:
                          timeSlotTab === "dinner"
                            ? `0 4px 14px ${brand.accentColor}40`
                            : undefined,
                      }}
                    >
                      🌙 Dinner
                    </button>
                  </div>

                  {/* Time Slot Grid - Modern Styling */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 max-h-64 sm:max-h-72 overflow-y-auto p-3 sm:p-4 border-2 border-gray-100 rounded-xl bg-gradient-to-br from-gray-50 to-white">
                    {timeSlots.map((slot) => {
                      const isPast = isSlotInPast(formData.date, slot.value24);
                      const isSelected = formData.timeSlot === slot.value24;
                      return (
                        <button
                          key={slot.value24}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isPast) {
                              handleSlotSelect(slot.value24);
                            }
                          }}
                          disabled={isPast}
                          className={`w-full px-3 py-2.5 text-xs sm:text-sm font-medium rounded-xl border-2 transition-all touch-manipulation ${
                            isPast
                              ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                              : isSelected
                              ? "text-white border-transparent shadow-lg scale-105 cursor-pointer"
                              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer active:scale-95"
                          }`}
                          style={{
                            backgroundColor: isSelected ? brand.accentColor : undefined,
                            boxShadow: isSelected ? `0 4px 14px ${brand.accentColor}40` : undefined,
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          {slot.display12}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {timeSlotTab === "lunch"
                      ? brand.id.startsWith("club-rogue")
                        ? "Lunch slots: 5:00 PM - 6:45 PM"
                        : "Lunch slots: 12:00 PM - 6:45 PM"
                      : "Dinner slots: 7:00 PM - 11:45 PM"}
                  </p>
                </div>
              )}

              {/* Show Offers Immediately After Time Slot Selection */}
              {formData.timeSlot && availableDiscounts.length > 0 && (
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                    Available Offers for {formatTo12Hour(formData.timeSlot)}
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    {availableDiscounts.map((discount) => (
                      <label
                        key={discount.id}
                        className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-all"
                        style={{
                          borderColor: formData.selectedDiscounts.includes(
                            discount.id
                          )
                            ? brand.accentColor
                            : undefined,
                          backgroundColor: formData.selectedDiscounts.includes(
                            discount.id
                          )
                            ? `${brand.accentColor}10`
                            : undefined,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedDiscounts.includes(
                            discount.id
                          )}
                          onChange={() => handleDiscountToggle(discount.id)}
                          className="mt-0.5 sm:mt-1 w-4 h-4 rounded border-gray-300 flex-shrink-0"
                          style={{
                            accentColor: brand.accentColor,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-xs sm:text-sm">
                            {discount.title}
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            {discount.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* No Offers Message */}
              {formData.timeSlot && availableDiscounts.length === 0 && !brand.id.startsWith("club-rogue") && (
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    No special offers available for this time slot.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Guests & Discounts */}
        {currentStep === 2 && (
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full" style={{ backgroundColor: brand.accentColor }} />
                Number of Guests
              </h3>
              <p className="text-sm text-gray-500 mb-6">Tell us how many guests to expect</p>
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    👨 Men
                  </label>
                  <input
                    type="number"
                    name="numberOfMen"
                    min="0"
                    value={formData.numberOfMen}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-sm font-medium bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm hover:shadow-md"
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 4px ${brand.accentColor}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    👩 Women
                  </label>
                  <input
                    type="number"
                    name="numberOfWomen"
                    min="0"
                    value={formData.numberOfWomen}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-sm font-medium bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm hover:shadow-md"
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 4px ${brand.accentColor}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    💑 Couples
                  </label>
                  <input
                    type="number"
                    name="numberOfCouples"
                    min="0"
                    value={formData.numberOfCouples}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-sm font-medium bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm hover:shadow-md"
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 4px ${brand.accentColor}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Discounts/Offers */}
            {availableDiscounts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Available Offers
                </h3>
                <div className="space-y-3">
                  {availableDiscounts.map((discount) => (
                    <label
                      key={discount.id}
                      className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-all"
                      style={{
                        borderColor: formData.selectedDiscounts.includes(
                          discount.id
                        )
                          ? brand.accentColor
                          : undefined,
                        backgroundColor: formData.selectedDiscounts.includes(
                          discount.id
                        )
                          ? `${brand.accentColor}10`
                          : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedDiscounts.includes(
                          discount.id
                        )}
                        onChange={() => handleDiscountToggle(discount.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-300"
                        style={{
                          accentColor: brand.accentColor,
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {discount.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {discount.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests (Optional)
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none"
                onFocus={(e) => {
                  e.target.style.borderColor = brand.accentColor;
                  e.target.style.boxShadow = `0 0 0 3px ${brand.accentColor}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
                placeholder="Any special occasion, dietary requirements, or preferences..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Contact Details */}
        {currentStep === 3 && (
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full" style={{ backgroundColor: brand.accentColor }} />
                Contact Information
              </h3>
              <p className="text-sm text-gray-500 mb-6">We'll use this to confirm your reservation</p>
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 text-sm font-medium bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm hover:shadow-md"
                      onFocus={(e) => {
                        e.target.style.borderColor = brand.accentColor;
                        e.target.style.boxShadow = `0 0 0 4px ${brand.accentColor}15`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "";
                        e.target.style.boxShadow = "";
                      }}
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      name="contactNumber"
                      required
                      value={formData.contactNumber}
                      onChange={handleChange}
                      className={`w-full pl-12 pr-4 py-3.5 text-sm font-medium bg-white border-2 rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all shadow-sm hover:shadow-md ${
                        formData.contactNumber && !validateIndianPhoneNumber(formData.contactNumber)
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                      onFocus={(e) => {
                        e.target.style.borderColor = brand.accentColor;
                        e.target.style.boxShadow = `0 0 0 4px ${brand.accentColor}15`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = formData.contactNumber && !validateIndianPhoneNumber(formData.contactNumber) ? "#ef4444" : "";
                        e.target.style.boxShadow = "";
                      }}
                      placeholder="10 digit mobile number"
                      maxLength={10}
                    />
                  </div>
                  {formData.contactNumber && !validateIndianPhoneNumber(formData.contactNumber) && (
                    <p className="text-xs text-red-500 mt-1">Please enter a valid 10-digit Indian mobile number (starts with 6-9)</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full" style={{ backgroundColor: brand.accentColor }} />
                Review Your Booking
              </h3>
              <p className="text-sm text-gray-500 mb-6">Please review your details before confirming</p>
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-100 p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium text-gray-900">
                    {formData.date && formData.timeSlot
                      ? `${new Date(formData.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })} at ${formatTo12Hour(formData.timeSlot)}`
                      : "Not selected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-medium text-gray-900">
                    {[
                      formData.numberOfMen !== "" && formData.numberOfMen !== "0"
                        ? `${formData.numberOfMen} Men`
                        : null,
                      formData.numberOfWomen !== "" &&
                      formData.numberOfWomen !== "0"
                        ? `${formData.numberOfWomen} Women`
                        : null,
                      formData.numberOfCouples !== "" &&
                      formData.numberOfCouples !== "0"
                        ? `${formData.numberOfCouples} Couples`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "0"}
                  </span>
                </div>
                {formData.selectedDiscounts.length > 0 && availableDiscounts.length > 0 && (
                  <div>
                    <span className="text-gray-600">Selected Offers:</span>
                    <div className="mt-2 space-y-1">
                      {formData.selectedDiscounts.map((discountId) => {
                        const discount = availableDiscounts.find(
                          (d) => d.id === discountId
                        );
                        return discount ? (
                          <div
                            key={discountId}
                            className="text-sm font-medium"
                            style={{ color: brand.accentColor }}
                          >
                            ✓ {discount.title}
                          </div>
                        ) : (
                          <div
                            key={discountId}
                            className="text-sm font-medium text-gray-700"
                          >
                            ✓ {discountId}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">
                    {formData.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contact:</span>
                  <span className="font-medium text-gray-900">
                    {formData.contactNumber}
                  </span>
                </div>
                {formData.notes && (
                  <div>
                    <span className="text-gray-600">Special Requests:</span>
                    <p className="text-sm text-gray-700 mt-1">
                      {formData.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {submitStatus.type && (
          <div
            className={`p-4 rounded-lg text-sm ${
              submitStatus.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {submitStatus.message}
          </div>
        )}

        {/* Navigation Buttons - Modern */}
        <div className="flex items-center justify-between pt-6 sm:pt-8 border-t-2 border-gray-100 gap-3 sm:gap-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-3.5 text-sm font-bold text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg"
              style={{
                backgroundColor: brand.accentColor,
                boxShadow: `0 4px 14px ${brand.accentColor}40`,
              }}
            >
              Continue
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit()}
              className="px-8 py-3.5 text-sm font-bold text-white rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center gap-2 shadow-lg"
              style={{
                backgroundColor: brand.accentColor,
                boxShadow: !(isSubmitting || !canSubmit()) ? `0 4px 14px ${brand.accentColor}40` : undefined,
              }}
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
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
