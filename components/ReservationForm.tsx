"use client";

import { useState, FormEvent } from "react";
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

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

  const handleExplore = () => {
    if (brand.exploreUrl && brand.exploreUrl !== "#") {
      window.open(brand.exploreUrl, "_blank");
    }
  };

  return (
    <div className="w-full">
      <div
        className="bg-surface rounded-lg border p-3"
        style={{
          borderColor: `${brand.accentColor}30`,
        }}
      >
        <div className="mb-2">
          <h2
            className="text-sm font-bold mb-0.5"
            style={{ color: brand.accentColor }}
          >
            Reserve at {brand.name}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label
              htmlFor="fullName"
              className="block text-[10px] font-medium text-gray-300 mb-0.5"
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
              className="w-full px-2 py-1.5 text-xs bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
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
              className="block text-[10px] font-medium text-gray-300 mb-0.5"
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
              className="w-full px-2 py-1.5 text-xs bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
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

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label
                htmlFor="numberOfMen"
                className="block text-[10px] font-medium text-gray-300 mb-0.5"
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
                className="w-full px-2 py-1.5 text-xs bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
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
                className="block text-[10px] font-medium text-gray-300 mb-0.5"
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
                className="w-full px-2 py-1.5 text-xs bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
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
                className="block text-[10px] font-medium text-gray-300 mb-0.5"
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
                className="w-full px-2 py-1.5 text-xs bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
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

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label
                htmlFor="date"
                className="block text-[10px] font-medium text-gray-300 mb-0.5"
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
                className="w-full px-2 py-1.5 text-xs bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
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
            <div>
              <label
                htmlFor="time"
                className="block text-[10px] font-medium text-gray-300 mb-0.5"
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
                className="w-full px-2 py-1.5 text-xs bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all"
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
              className="block text-[10px] font-medium text-gray-300 mb-0.5"
            >
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-2 py-1.5 text-xs bg-black/30 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all resize-none"
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
              className={`p-2 rounded text-[10px] ${
                submitStatus.type === "success"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {submitStatus.message}
            </div>
          )}

          <div className="flex flex-col gap-1.5 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: brand.accentColor,
              }}
            >
              {isSubmitting ? "Submitting..." : "Book Now"}
            </button>
            <button
              type="button"
              onClick={handleExplore}
              className="w-full py-2 px-4 rounded-lg text-xs font-semibold transition-all border-2 hover:opacity-80"
              style={{
                borderColor: brand.accentColor,
                color: brand.accentColor,
                backgroundColor: "transparent",
              }}
            >
              Explore {brand.shortName}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
