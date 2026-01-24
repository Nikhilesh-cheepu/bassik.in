"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignOutButton } from "@clerk/nextjs";

interface Reservation {
  id: string;
  fullName: string;
  contactNumber: string;
  numberOfMen: string;
  numberOfWomen: string;
  numberOfCouples: string;
  date: string;
  timeSlot: string;
  notes: string | null;
  status: string;
  brandId: string;
  brandName: string;
  createdAt: string;
}

export default function BookingsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get today's date in YYYY-MM-DD format
  const getToday = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Get yesterday's date
  const getYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  };

  // Get tomorrow's date
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const [filter, setFilter] = useState<{ dateFrom?: string; dateTo?: string }>({
    dateFrom: getToday(),
    dateTo: getToday(),
  });

  const loadBookings = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      // Always send dateFrom and dateTo (default to today if not set)
      const dateFrom = filter.dateFrom || getToday();
      const dateTo = filter.dateTo || getToday();
      queryParams.append("dateFrom", dateFrom);
      queryParams.append("dateTo", dateTo);

      const res = await fetch(`/api/admin/bookings?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      } else {
        console.error("Failed to load bookings:", res.status);
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  }, [filter]);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/admin");
        return;
      }
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadBookings();
    }
  }, [filter, isLoaded, isSignedIn, loadBookings]);

  const handleStatusUpdate = async (reservationId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reservationId, status: newStatus }),
      });

      if (res.ok) {
        loadBookings();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    return date.toLocaleDateString("en-IN", options);
  };

  const formatTime = (time24: string): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };


  const generateWhatsAppMessage = (reservation: Reservation): string => {
    const dateStr = formatDate(reservation.date);
    const timeStr = formatTime(reservation.timeSlot);

    const guestCountParts: string[] = [];
    if (reservation.numberOfMen && reservation.numberOfMen !== "0") {
      guestCountParts.push(`${reservation.numberOfMen} ${reservation.numberOfMen === "1" ? "Man" : "Men"}`);
    }
    if (reservation.numberOfWomen && reservation.numberOfWomen !== "0") {
      guestCountParts.push(`${reservation.numberOfWomen} ${reservation.numberOfWomen === "1" ? "Woman" : "Women"}`);
    }
    if (reservation.numberOfCouples && reservation.numberOfCouples !== "0") {
      guestCountParts.push(`${reservation.numberOfCouples} ${reservation.numberOfCouples === "1" ? "Couple" : "Couples"}`);
    }
    const guestCountStr = guestCountParts.join(" | ");

    let notesSection = "";
    if (reservation.notes && reservation.notes.trim()) {
      const notesLower = reservation.notes.toLowerCase();
      if (notesLower.includes("birthday") || notesLower.includes("bday")) {
        notesSection = "\n\nBirthday";
      } else if (notesLower.includes("anniversary")) {
        notesSection = "\n\nAnniversary";
      } else if (notesLower.includes("celebration")) {
        notesSection = "\n\nCelebration";
      } else {
        notesSection = `\n\n${reservation.notes.trim()}`;
      }
    }

    const message = `Table Reservation | ${reservation.brandName}

${reservation.fullName} | ${reservation.contactNumber}

${dateStr} | ${timeStr}

${guestCountStr}${notesSection}

Status: ${reservation.status}

Reservation ID: ${reservation.id}`;

    return message;
  };

  const handleWhatsAppMessage = (reservation: Reservation) => {
    const RESERVATION_PHONE_NUMBER = "917013884485";
    const message = generateWhatsAppMessage(reservation);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${RESERVATION_PHONE_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleAccept = async (reservationId: string) => {
    await handleStatusUpdate(reservationId, "CONFIRMED");
  };

  const handleReject = async (reservationId: string) => {
    await handleStatusUpdate(reservationId, "CANCELLED");
  };

  const exportToPDF = () => {
    // Simple CSV export (can be enhanced to PDF later)
    const headers = ["Date", "Time", "Name", "Contact", "Venue", "Guests", "Status"];
    const rows = reservations.map((r) => [
      formatDate(r.date),
      r.timeSlot,
      r.fullName,
      r.contactNumber,
      r.brandName,
      `M:${r.numberOfMen} W:${r.numberOfWomen} C:${r.numberOfCouples}`,
      r.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bookings-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Compact Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Bookings</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back
              </button>
            <SignOutButton>
              <button className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Logout
              </button>
            </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Compact Filters */}
        <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-3 sm:mb-4 border border-gray-100">
          {/* Date Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-gray-200">
            <span className="text-xs sm:text-sm text-gray-600 font-medium">Quick:</span>
            <button
              onClick={() => setFilter({ dateFrom: getYesterday(), dateTo: getYesterday() })}
              className="px-3 py-1.5 text-xs sm:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Yesterday
            </button>
            <button
              onClick={() => setFilter({ dateFrom: getToday(), dateTo: getToday() })}
              className="px-3 py-1.5 text-xs sm:text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setFilter({ dateFrom: getTomorrow(), dateTo: getTomorrow() })}
              className="px-3 py-1.5 text-xs sm:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tomorrow
            </button>
          </div>
          
          {/* Date Range Picker */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm text-gray-600 font-medium">From:</label>
            <input
              type="date"
              value={filter.dateFrom || getToday()}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value || getToday() })}
              className="px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <label className="text-xs sm:text-sm text-gray-600 font-medium">To:</label>
            <input
              type="date"
              value={filter.dateTo || getToday()}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value || getToday() })}
              className="px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => setFilter({ dateFrom: getToday(), dateTo: getToday() })}
              className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset
            </button>
            <div className="flex-1"></div>
            <button
              onClick={exportToPDF}
              className="px-3 py-1.5 text-xs sm:text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Card-Based Bookings List - No Horizontal Scroll */}
        <div className="space-y-2 sm:space-y-3">
          {reservations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <p className="text-gray-500">No bookings found</p>
            </div>
          ) : (
            reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Date, Customer, Venue */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm sm:text-base font-semibold text-gray-900">
                            {new Date(reservation.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <span className="text-xs sm:text-sm text-gray-500">•</span>
                          <div className="text-sm sm:text-base font-medium text-gray-700">
                            {formatTime(reservation.timeSlot)}
                          </div>
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {reservation.fullName}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">{reservation.contactNumber}</div>
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded whitespace-nowrap">
                        {reservation.brandName}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                      <span>{reservation.numberOfMen}M</span>
                      <span>{reservation.numberOfWomen}W</span>
                      <span>{reservation.numberOfCouples}C</span>
                      {reservation.notes && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="truncate max-w-[200px]" title={reservation.notes}>
                            {reservation.notes}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(reservation.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        reservation.status === "CONFIRMED"
                          ? "bg-green-500 text-white"
                          : "bg-green-100 text-green-600 hover:bg-green-200"
                      }`}
                      title="Accept/Confirm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReject(reservation.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        reservation.status === "CANCELLED"
                          ? "bg-red-500 text-white"
                          : "bg-red-100 text-red-600 hover:bg-red-200"
                      }`}
                      title="Reject/Cancel"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleWhatsAppMessage(reservation)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="WhatsApp"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
