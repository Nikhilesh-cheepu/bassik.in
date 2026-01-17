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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        setSubmitStatus({
          type: "success",
          message: "Reservation request sent! Our team will reach out shortly.",
        });

        // Open WhatsApp with the reservation message
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
        }

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
        });
        setCurrentStep(1);
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

  // Step indicator
  const steps = [
    { number: 1, title: "Date & Time" },
    { number: 2, title: "Guests & Offers" },
    { number: 3, title: "Contact Details" },
    { number: 4, title: "Review" },
  ];

  return (
    <div className="w-full">
      {/* Step Indicator - Swiggy Style - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all ${
                    currentStep >= step.number
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                  style={{
                    backgroundColor:
                      currentStep >= step.number ? brand.accentColor : undefined,
                  }}
                >
                  {step.number}
                </div>
                <span
                  className={`text-[10px] sm:text-xs mt-1 ${
                    currentStep >= step.number
                      ? "text-gray-900 font-medium"
                      : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 sm:mx-2 ${
                    currentStep > step.number
                      ? "bg-blue-600"
                      : "bg-gray-200"
                  }`}
                  style={{
                    backgroundColor:
                      currentStep > step.number ? brand.accentColor : undefined,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Date & Time Slot Selection */}
        {currentStep === 1 && (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Select Date & Time
              </h3>

              {/* Date Selection - Fully Clickable */}
              <div className="mb-4 sm:mb-5">
                <label 
                  htmlFor="date-input"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 cursor-pointer"
                >
                  Select Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="date-input"
                    type="date"
                    value={formData.date}
                    onChange={handleDateChange}
                    min={todayStr}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 3px ${brand.accentColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    onClick={(e) => {
                      // Ensure calendar opens on click anywhere
                      e.currentTarget.showPicker?.();
                    }}
                  />
                </div>
              </div>

              {/* Time Slot Selection */}
              {formData.date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Time Slot <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Lunch/Dinner Tabs */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTimeSlotTab("lunch");
                        setFormData((prev) => ({ ...prev, timeSlot: "" }));
                      }}
                      className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-lg border transition-all ${
                        timeSlotTab === "lunch"
                          ? "text-white border-transparent shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                      style={{
                        backgroundColor:
                          timeSlotTab === "lunch" ? brand.accentColor : undefined,
                      }}
                    >
                      Lunch
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimeSlotTab("dinner");
                        setFormData((prev) => ({ ...prev, timeSlot: "" }));
                      }}
                      className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-lg border transition-all ${
                        timeSlotTab === "dinner"
                          ? "text-white border-transparent shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                      style={{
                        backgroundColor:
                          timeSlotTab === "dinner" ? brand.accentColor : undefined,
                      }}
                    >
                      Dinner
                    </button>
                  </div>

                  {/* Time Slot Grid - Mobile Optimized */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2 max-h-56 sm:max-h-64 overflow-y-auto p-2 sm:p-3 border border-gray-200 rounded-lg bg-gray-50">
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
                          className={`w-full px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md sm:rounded-lg border transition-all touch-manipulation ${
                            isPast
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : isSelected
                              ? "text-white border-transparent shadow-sm cursor-pointer"
                              : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 cursor-pointer active:scale-95"
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? brand.accentColor
                              : undefined,
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
          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Number of Guests
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Men
                  </label>
                  <input
                    type="number"
                    name="numberOfMen"
                    min="0"
                    value={formData.numberOfMen}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 3px ${brand.accentColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Women
                  </label>
                  <input
                    type="number"
                    name="numberOfWomen"
                    min="0"
                    value={formData.numberOfWomen}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 3px ${brand.accentColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couples
                  </label>
                  <input
                    type="number"
                    name="numberOfCouples"
                    min="0"
                    value={formData.numberOfCouples}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 3px ${brand.accentColor}20`;
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
          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Contact Information
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 3px ${brand.accentColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    required
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                    onFocus={(e) => {
                      e.target.style.borderColor = brand.accentColor;
                      e.target.style.boxShadow = `0 0 0 3px ${brand.accentColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                    placeholder="Enter your contact number"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Review Your Booking
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-5 space-y-3 sm:space-y-4">
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

        {/* Navigation Buttons - Mobile Optimized */}
        <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-200 gap-2 sm:gap-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 flex-1 sm:flex-initial"
              style={{
                backgroundColor: brand.accentColor,
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit()}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
              style={{
                backgroundColor: brand.accentColor,
              }}
            >
              {isSubmitting
                ? "Submitting..."
                : `Confirm Booking`}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
