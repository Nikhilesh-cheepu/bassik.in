"use client";

import { useState, FormEvent, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BRANDS } from "@/lib/brands";
import Navbar from "@/components/Navbar";

interface Reservation {
  id: string;
  brandName: string;
  brandId: string;
  date: string;
  timeSlot: string;
  fullName: string;
  contactNumber: string;
  numberOfMen: string;
  numberOfWomen: string;
  numberOfCouples: string;
  notes: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
}

function MyBookingsContent() {
  const params = useParams();
  const outletSlug = (params?.outlet as string) || "";
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const activeBrand = BRANDS.find((b) => b.id === outletSlug) || BRANDS[0];

  const loadBookings = async (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter at least 10 digits");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(true);
    try {
      const url = `/api/my-bookings?phone=${encodeURIComponent(digits)}${outletSlug ? `&brandId=${encodeURIComponent(outletSlug)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setBookings([]);
        setError(data.error || "Could not load bookings");
        return;
      }
      setBookings(data.bookings || []);
    } catch {
      setBookings([]);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const formatTime = (time24: string) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "bg-green-100 text-green-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      case "COMPLETED": return "bg-blue-100 text-blue-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <Link
            href={`/${outletSlug}/reservations`}
            className="inline-flex items-center text-gray-300 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Reservations
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Bookings – {activeBrand.shortName}</h1>
          <p className="text-gray-400">Enter your phone number to view reservations for this outlet</p>
        </div>

        <form onSubmit={loadBookings} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? "Loading…" : "View Bookings"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </form>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
          </div>
        )}

        {!loading && searched && bookings.length === 0 && (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 sm:p-12 text-center border border-white/10">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">No Bookings Found</h2>
            <p className="text-gray-400 mb-6">No reservations found for this phone number at {activeBrand.shortName}.</p>
            <Link href={`/${outletSlug}/reservations`} className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors">
              Make a Reservation
            </Link>
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{booking.brandName}</h3>
                        <p className="text-gray-400 text-sm">{formatDate(booking.date)} • {formatTime(booking.timeSlot)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div><span className="font-medium">Contact:</span> {booking.contactNumber}</div>
                      <div>
                        <span className="font-medium">Guests:</span>{" "}
                        {parseInt(booking.numberOfMen) > 0 && `${booking.numberOfMen}M `}
                        {parseInt(booking.numberOfWomen) > 0 && `${booking.numberOfWomen}W `}
                        {parseInt(booking.numberOfCouples) > 0 && `${booking.numberOfCouples} Couple${parseInt(booking.numberOfCouples) > 1 ? "s" : ""}`}
                      </div>
                      {booking.notes && <div><span className="font-medium">Notes:</span> {booking.notes}</div>}
                      <div className="text-xs text-gray-500">Booked on {formatDate(booking.createdAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" /></div>}>
      <MyBookingsContent />
    </Suspense>
  );
}
