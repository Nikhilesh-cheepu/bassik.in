"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  username: string;
  role: string;
  venuePermissions: string[];
}

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
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ status?: string; brandId?: string; date?: string }>({});

  const loadBookings = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filter.status) queryParams.append("status", filter.status);
      if (filter.brandId) queryParams.append("brandId", filter.brandId);
      if (filter.date) queryParams.append("date", filter.date);

      const res = await fetch(`/api/admin/bookings?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  }, [filter]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) {
          router.push("/admin");
          return;
        }
        const data = await res.json();
        setAdmin(data.admin);
      } catch (error) {
        router.push("/admin");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (admin) {
      loadBookings();
    }
  }, [filter, admin, loadBookings]);

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
        notesSection = "\n🎉 Birthday";
      } else if (notesLower.includes("anniversary")) {
        notesSection = "\n🎉 Anniversary";
      } else if (notesLower.includes("celebration")) {
        notesSection = "\n🎉 Celebration";
      } else {
        notesSection = `\n📝 ${reservation.notes}`;
      }
    }

    const message = `🍽️ Table Reservation | ${reservation.brandName}

👤 ${reservation.fullName} | 📞 ${reservation.contactNumber}

📅 ${dateStr} | ⏰ ${timeStr}

👥 ${guestCountStr}${notesSection}

Status: ${reservation.status}

Reservation ID: ${reservation.id}`;

    return message;
  };

  const handleWhatsAppMessage = (reservation: Reservation) => {
    const RESERVATION_PHONE_NUMBER = "7013884485";
    const message = generateWhatsAppMessage(reservation);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${RESERVATION_PHONE_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
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

  if (!admin) {
    return null;
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    COMPLETED: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage reservations and update status
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filter.status || ""}
                onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={filter.date || ""}
                onChange={(e) => setFilter({ ...filter, date: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <button
                onClick={() => setFilter({})}
                className="mt-6 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(reservation.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">{reservation.timeSlot}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {reservation.fullName}
                        </div>
                        <div className="text-sm text-gray-500">{reservation.contactNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{reservation.brandName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Men: {reservation.numberOfMen} | Women: {reservation.numberOfWomen} | Couples: {reservation.numberOfCouples}
                        </div>
                        {reservation.notes && (
                          <div className="text-xs text-gray-500 mt-1">{reservation.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusColors[reservation.status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {reservation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={reservation.status}
                            onChange={(e) => handleStatusUpdate(reservation.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs sm:text-sm"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                          <button
                            onClick={() => handleWhatsAppMessage(reservation)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm flex items-center justify-center gap-1"
                            title="Send WhatsApp message"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                            WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
