"use client";

import { useState, useEffect, useCallback } from "react";
import { trackWhatsAppClick } from "@/lib/analytics";
import { BRANDS } from "@/lib/brands";
import AdminShell from "@/components/admin/AdminShell";

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
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export default function BookingsPageClient() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const getToday = () => new Date().toISOString().split("T")[0];
  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  };
  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const [filter, setFilter] = useState<{ dateFrom?: string; dateTo?: string }>({
    dateFrom: undefined,
    dateTo: undefined,
  });
  const [brandFilter, setBrandFilter] = useState<string>("all");

  const isAllTime = filter.dateFrom == null && filter.dateTo == null;

  const loadBookings = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filter.dateFrom) queryParams.append("dateFrom", filter.dateFrom);
      if (filter.dateTo) queryParams.append("dateTo", filter.dateTo);
      if (brandFilter && brandFilter !== "all") queryParams.append("venueId", brandFilter);
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
  }, [filter, brandFilter]);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [filter, loadBookings]);

  const handleStatusUpdate = async (reservationId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reservationId, status: newStatus }),
      });
      if (res.ok) loadBookings();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const formatDate = (dateStr: string): string =>
    new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
    const men = parseInt(reservation.numberOfMen || "0", 10) || 0;
    const women = parseInt(reservation.numberOfWomen || "0", 10) || 0;
    const couples = parseInt(reservation.numberOfCouples || "0", 10) || 0;
    const totalGuests = men + women + couples * 2;
    const noteText = reservation.notes?.trim() || "-";

    const isClubRogue =
      reservation.brandId === "club-rogue-gachibowli" ||
      reservation.brandId === "club-rogue-kondapur" ||
      reservation.brandId === "club-rogue-jubilee-hills";

    const coverLine = isClubRogue
      ? "\n\nCover charge: ₹2000 (fully refundable at the venue)"
      : "";

    return `${reservation.brandName}

Name : ${reservation.fullName}
Mobile number : ${reservation.contactNumber}
Date : ${dateStr}
Time : ${timeStr}
Total pax : ${totalGuests} guests
Note : ${noteText}

Booking status :
${reservation.status}

Reservation made through bassik.in${coverLine}`;
  };

  const handleWhatsAppMessage = (reservation: Reservation) => {
    const RESERVATION_PHONE_NUMBER = "917013884485";
    trackWhatsAppClick({ number: RESERVATION_PHONE_NUMBER, source: "admin" });
    const message = generateWhatsAppMessage(reservation);
    window.open(`https://wa.me/${RESERVATION_PHONE_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleAccept = (reservationId: string) => handleStatusUpdate(reservationId, "CONFIRMED");
  const handleReject = (reservationId: string) => handleStatusUpdate(reservationId, "CANCELLED");

  const handleDelete = async (reservationId: string) => {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reservationId }),
      });
      if (res.ok) loadBookings();
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Failed to delete booking");
    }
  };

  const exportToPDF = () => {
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
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AdminShell title="Bookings">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-500/60 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-400">Loading bookings…</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Bookings">
      <main className="pb-8 pt-2">
        <div className="mb-3 text-xs text-slate-400">
          Filter, review and export reservations across all outlets.
        </div>
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            <span className="text-xs font-medium text-slate-300 sm:text-sm">Quick range:</span>
            <button
              onClick={() => setFilter({ dateFrom: undefined, dateTo: undefined })}
              className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                isAllTime
                  ? "bg-fuchsia-500 text-slate-950 hover:bg-fuchsia-400"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              All time
            </button>
            <button
              onClick={() => setFilter({ dateFrom: getYesterday(), dateTo: getYesterday() })}
              className="rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 sm:text-sm"
            >
              Yesterday
            </button>
            <button
              onClick={() => setFilter({ dateFrom: getToday(), dateTo: getToday() })}
              className={`rounded-full px-3 py-1.5 text-xs sm:text-sm transition-colors ${
                !isAllTime && filter.dateFrom === getToday() && filter.dateTo === getToday()
                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-medium"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilter({ dateFrom: getTomorrow(), dateTo: getTomorrow() })}
              className="rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 sm:text-sm"
            >
              Tomorrow
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="text-xs font-medium text-slate-300 sm:text-sm">From:</label>
            <input
              type="date"
              value={filter.dateFrom ?? ""}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value || undefined })}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 sm:text-sm"
            />
            <label className="text-xs font-medium text-slate-300 sm:text-sm">To:</label>
            <input
              type="date"
              value={filter.dateTo ?? ""}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value || undefined })}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 sm:text-sm"
            />
            <button
              onClick={() => setFilter({ dateFrom: undefined, dateTo: undefined })}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Reset
            </button>
            <div className="hidden h-6 w-px bg-slate-800 sm:block" />
            <label className="text-xs font-medium text-slate-300 sm:text-sm">Outlet:</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 sm:text-sm"
            >
              <option value="all">All outlets</option>
              {BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName}
                </option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={exportToPDF}
              className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-slate-950 shadow hover:bg-sky-400 sm:text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-10 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3M5 11h14M5 19h14M7 15h.01M11 15h.01M15 15h.01"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-100">No bookings found</p>
              <p className="mt-1 text-xs text-slate-400">
                Try adjusting the date range or selecting a different outlet.
              </p>
            </div>
          ) : (
            reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.9)] transition-all hover:-translate-y-0.5 hover:border-slate-600/80"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-50 sm:text-base">
                            {new Date(reservation.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <span className="text-xs text-slate-500 sm:text-sm">•</span>
                          <div className="text-sm font-medium text-slate-100 sm:text-base">
                            {formatTime(reservation.timeSlot)}
                          </div>
                        </div>
                        <div className="truncate text-sm font-semibold text-slate-50 sm:text-base">
                          {reservation.fullName}
                        </div>
                        <div className="space-y-0.5 text-xs text-slate-400 sm:text-sm">
                          <div className="font-mono text-slate-300">{reservation.contactNumber}</div>
                          {reservation.user?.email && (
                            <div className="text-slate-500">{reservation.user.email}</div>
                          )}
                          {(reservation.user?.firstName || reservation.user?.lastName) && (
                            <div className="text-slate-500">
                              {[reservation.user?.firstName, reservation.user?.lastName].filter(Boolean).join(" ")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="whitespace-nowrap rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 sm:text-sm">
                        {reservation.brandName}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 sm:text-sm">
                      <span>{reservation.numberOfMen}M</span>
                      <span>{reservation.numberOfWomen}W</span>
                      <span>{reservation.numberOfCouples}C</span>
                      {reservation.notes && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="max-w-[200px] truncate" title={reservation.notes}>
                            {reservation.notes}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2 sm:gap-2.5">
                    <button
                      onClick={() => handleAccept(reservation.id)}
                      className={`rounded-lg p-2 transition-colors ${
                        reservation.status === "CONFIRMED"
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      }`}
                      title="Accept/Confirm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReject(reservation.id)}
                      className={`rounded-lg p-2 transition-colors ${
                        reservation.status === "CANCELLED"
                          ? "bg-rose-500 text-slate-950"
                          : "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                      }`}
                      title="Reject/Cancel"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleWhatsAppMessage(reservation)}
                      className="rounded-lg bg-emerald-500 p-2 text-slate-950 transition-colors hover:bg-emerald-400"
                      title="WhatsApp"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(reservation.id)}
                      className="rounded-lg bg-slate-900 p-2 text-rose-300 transition-colors hover:bg-rose-500/10"
                      title="Delete booking"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </AdminShell>
  );
}
