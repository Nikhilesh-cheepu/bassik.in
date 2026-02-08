"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
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
  const router = useRouter();
  const outletSlug = params?.outlet as string;
  const { isLoaded, isSignedIn } = useUser();
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const findBrandBySlug = (slug: string) => {
    return BRANDS.find(b => b.id === slug) || BRANDS[0];
  };

  const activeBrand = findBrandBySlug(outletSlug);

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch(`/api/my-bookings?brandId=${outletSlug}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [outletSlug]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLoading(false);
      return;
    }
    if (isLoaded && isSignedIn) {
      loadBookings();
    }
  }, [isLoaded, isSignedIn, loadBookings]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time24: string) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 sm:p-12 text-center border border-white/10">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">My Bookings - {activeBrand.shortName}</h1>
            <p className="text-gray-300 mb-8">Please sign in to view your booking history for this outlet.</p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Bookings - {activeBrand.shortName}</h1>
          <p className="text-gray-400">View your reservations for this outlet</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 sm:p-12 text-center border border-white/10">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">No Bookings Yet</h2>
            <p className="text-gray-400 mb-6">You haven&apos;t made any reservations for {activeBrand.shortName} yet.</p>
            <Link
              href={`/${outletSlug}/reservations`}
              className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              Make a Reservation
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-white/10"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{booking.brandName}</h3>
                        <p className="text-gray-400 text-sm">
                          {formatDate(booking.date)} • {formatTime(booking.timeSlot)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-300">
                      <div>
                        <span className="font-medium">Contact:</span> {booking.contactNumber}
                      </div>
                      <div>
                        <span className="font-medium">Guests:</span>{" "}
                        {parseInt(booking.numberOfMen) > 0 && `${booking.numberOfMen}M `}
                        {parseInt(booking.numberOfWomen) > 0 && `${booking.numberOfWomen}W `}
                        {parseInt(booking.numberOfCouples) > 0 &&
                          `${booking.numberOfCouples} Couple${parseInt(booking.numberOfCouples) > 1 ? "s" : ""}`}
                      </div>
                      {booking.notes && (
                        <div>
                          <span className="font-medium">Notes:</span> {booking.notes}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Booked on {formatDate(booking.createdAt)}
                      </div>
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}
