"use client";

import { useState, FormEvent, useRef } from "react";
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
  time: string;
  notes: string;
}

export default function ReservationForm({ brand }: ReservationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    contactNumber: "",
    numberOfMen: "",
    numberOfWomen: "",
    numberOfCouples: "",
    date: "",
    time: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Helpers to restrict past dates/times
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const timeInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      // For date/time, block past selections immediately
      if (name === "date" || name === "time") {
        const candidate = { ...prev, [name]: value };
        const { date, time } = candidate;

        if (date && time) {
          const selected = new Date(`${date}T${time}`);
          const nowCheck = new Date();

          if (selected.getTime() < nowCheck.getTime()) {
            setSubmitStatus({
              type: "error",
              message: "Please choose a date and time in the future.",
            });
            return prev; // keep previous valid value
          }
        }

        return candidate;
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    // Prevent past date/time
    try {
      const { date, time } = formData;
      const nowCheck = new Date();

      if (!date || !time) {
        setSubmitStatus({
          type: "error",
          message: "Please select both date and time.",
        });
        setIsSubmitting(false);
        return;
      }

      const selectedDateTime = new Date(`${date}T${time}`);
      if (selectedDateTime.getTime() < nowCheck.getTime()) {
        setSubmitStatus({
          type: "error",
          message: "Please choose a date and time in the future.",
        });
        setIsSubmitting(false);
        return;
      }
    } catch {
      setSubmitStatus({
        type: "error",
        message: "Invalid date or time. Please adjust your selection.",
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
          ...formData,
          brandId: brand.id,
          brandName: brand.name,
        }),
      });

      if (response.ok) {
        setSubmitStatus({
          type: "success",
          message: "Reservation submitted! We'll get back to you soon.",
        });
        setFormData({
          fullName: "",
          contactNumber: "",
          numberOfMen: "",
          numberOfWomen: "",
          numberOfCouples: "",
          date: "",
          time: "",
          notes: "",
        });
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

  return (
    <div className="w-full">
      <div
        className="rounded-3xl border border-white/8 bg-gradient-to-b from-black/70 via-surface/80 to-black/95 shadow-[0_30px_80px_rgba(0,0,0,0.9)] backdrop-blur-xl p-4 md:p-6"
        style={{
          borderColor: `${brand.accentColor}30`,
        }}
      >
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div
              className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-[10px] md:text-[11px] text-gray-200"
              style={{ borderColor: `${brand.accentColor}40`, borderWidth: 1 }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: brand.accentColor }}
              />
              <span>{brand.shortName}</span>
            </div>
            <h2
              className="text-base md:text-lg font-semibold tracking-wide text-white"
            >
              Reserve at {brand.name}
            </h2>
          </div>
          <span className="rounded-full bg-black/40 px-3 py-1 text-[10px] md:text-xs text-gray-300 border border-white/10">
            Quick request · under 1 minute
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-2.5 md:space-y-3 text-xs md:text-sm text-gray-200"
        >
          <div>
            <label
              htmlFor="fullName"
              className="block text-[11px] md:text-xs font-medium text-gray-300 mb-0.5"
            >
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-2.5 py-2 text-sm bg-black/40 border border-gray-800/80 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
              onFocus={(e) => {
                e.target.style.borderColor = brand.accentColor;
                e.target.style.boxShadow = `0 0 0 2px ${brand.accentColor}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "";
                e.target.style.boxShadow = "";
              }}
              placeholder="Full name"
            />
          </div>

          <div>
            <label
              htmlFor="contactNumber"
              className="block text-[11px] md:text-xs font-medium text-gray-300 mb-0.5"
            >
              Contact <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              required
              value={formData.contactNumber}
              onChange={handleChange}
              className="w-full px-2.5 py-2 text-sm bg-black/40 border border-gray-800/80 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
              onFocus={(e) => {
                e.target.style.borderColor = brand.accentColor;
                e.target.style.boxShadow = `0 0 0 2px ${brand.accentColor}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "";
                e.target.style.boxShadow = "";
              }}
              placeholder="Contact number"
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5 md:gap-2">
            <div>
              <label
                htmlFor="numberOfMen"
                className="block text-[11px] md:text-xs font-medium text-gray-300 mb-0.5"
              >
                Men <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="numberOfMen"
                name="numberOfMen"
                required
                min="0"
                value={formData.numberOfMen}
                onChange={handleChange}
                className="w-full px-2.5 py-2 text-sm bg-black/40 border border-gray-800/80 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
                onFocus={(e) => {
                  e.target.style.borderColor = brand.accentColor;
                  e.target.style.boxShadow = `0 0 0 2px ${brand.accentColor}40`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
                placeholder="0"
              />
            </div>
            <div>
              <label
                htmlFor="numberOfWomen"
                className="block text-[11px] md:text-xs font-medium text-gray-300 mb-0.5"
              >
                Women <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="numberOfWomen"
                name="numberOfWomen"
                required
                min="0"
                value={formData.numberOfWomen}
                onChange={handleChange}
                className="w-full px-2.5 py-2 text-sm bg-black/40 border border-gray-800/80 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
                onFocus={(e) => {
                  e.target.style.borderColor = brand.accentColor;
                  e.target.style.boxShadow = `0 0 0 2px ${brand.accentColor}40`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
                placeholder="0"
              />
            </div>
            <div>
              <label
                htmlFor="numberOfCouples"
                className="block text-[11px] md:text-xs font-medium text-gray-300 mb-0.5"
              >
                Couples <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="numberOfCouples"
                name="numberOfCouples"
                required
                min="0"
                value={formData.numberOfCouples}
                onChange={handleChange}
                className="w-full px-2.5 py-2 text-sm bg-black/40 border border-gray-800/80 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
                onFocus={(e) => {
                  e.target.style.borderColor = brand.accentColor;
                  e.target.style.boxShadow = `0 0 0 2px ${brand.accentColor}40`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 md:gap-2">
            <div
              onClick={() => {
                if (dateInputRef.current) {
                  // showPicker is not in all browsers but works where supported
                  dateInputRef.current.showPicker?.();
                  dateInputRef.current.focus();
                }
              }}
              className="cursor-pointer"
            >
              <label
                htmlFor="date"
                className="block text-[11px] md:text-xs font-medium text-gray-300 mb-0.5"
              >
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full px-2.5 py-2 text-sm bg-black/40 border border-gray-800/80 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
                min={todayStr}
                ref={dateInputRef}
                onKeyDown={(e) => e.preventDefault()}
                onFocus={(e) => {
                  e.target.style.borderColor = brand.accentColor;
                  e.target.style.boxShadow = `0 0 0 2px ${brand.accentColor}40`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
              />
            </div>
            <div
              onClick={() => {
                if (timeInputRef.current) {
                  // showPicker is not in all browsers but works where supported
                  timeInputRef.current.showPicker?.();
                  timeInputRef.current.focus();
                }
              }}
              className="cursor-pointer"
            >
              <label
                htmlFor="time"
                className="block text-[11px] md:text-xs font-medium text-gray-300 mb-0.5"
              >
                Time <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                id="time"
                name="time"
                required
                value={formData.time}
                onChange={handleChange}
                className="w-full px-2.5 py-2 text-sm bg-black/40 border border-gray-800/80 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
                min={formData.date === todayStr ? currentTimeStr : undefined}
                ref={timeInputRef}
                onKeyDown={(e) => e.preventDefault()}
                onFocus={(e) => {
                  e.target.style.borderColor = brand.accentColor;
                  e.target.style.boxShadow = `0 0 0 2px ${brand.accentColor}40`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "";
                  e.target.style.boxShadow = "";
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-[11px] md:text-xs font-medium text-gray-300 mb-0.5"
            >
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-2.5 py-2 text-sm bg-black/40 border border-gray-800/80 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all resize-none"
              onFocus={(e) => {
                e.target.style.borderColor = brand.accentColor;
                e.target.style.boxShadow = `0 0 0 2px ${brand.accentColor}40`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "";
                e.target.style.boxShadow = "";
              }}
              placeholder="Special requests..."
            />
          </div>

          {submitStatus.type && (
            <div
              className={`p-2 rounded text-[11px] md:text-xs ${
                submitStatus.type === "success"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {submitStatus.type === "success"
                ? "Reservation request sent! Our team will reach out shortly."
                : submitStatus.message}
            </div>
          )}

          <div className="flex flex-col gap-1.5 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(0,0,0,0.9)] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_12px_30px_rgba(0,0,0,0.8)]"
              style={{
                backgroundColor: brand.accentColor,
              }}
            >
              {isSubmitting
                ? "Sending your request..."
                : `Book Table at ${brand.shortName}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
