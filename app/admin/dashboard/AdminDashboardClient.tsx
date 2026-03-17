"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVenues: 0,
    pendingBookings: 0,
    todayBookings: 0,
  });

  useEffect(() => {
    loadStats();
    setLoading(false);
  }, []);

  const loadStats = async () => {
    try {
      const [venuesRes, bookingsRes] = await Promise.all([
        fetch("/api/admin/venues"),
        fetch("/api/admin/bookings"),
      ]);

      if (venuesRes.ok) {
        const venuesData = await venuesRes.json();
        setStats((prev) => ({
          ...prev,
          totalVenues: venuesData.venues?.length || 0,
        }));
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const localTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const todayBookings = bookingsData.reservations?.filter(
          (b: any) => b.date === todayStr || b.date === localTodayStr
        ).length || 0;
        const pending = bookingsData.reservations?.filter(
          (b: any) => b.status === "PENDING"
        ).length || 0;

        setStats((prev) => ({
          ...prev,
          pendingBookings: pending,
          todayBookings: todayBookings,
        }));
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  return (
    <AdminShell title="Dashboard">
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-500">Loading dashboard…</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Venues
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {stats.totalVenues}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Total outlets onboarded.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Pending
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-amber-500">
                    {stats.pendingBookings}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Reservations waiting for confirmation.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Today
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-500">
                    {stats.todayBookings}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Bookings scheduled for today across outlets.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            <Link
              href="/admin/dashboard/venues"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow group-hover:scale-105 transition-transform">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Manage Venues</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Logos, galleries, offers, discounts and contacts.
                </p>
              </div>
              <svg
                className="h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/dashboard/bookings"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow group-hover:scale-105 transition-transform">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">View Bookings</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Filter, confirm, cancel and export reservations.
                </p>
              </div>
              <svg
                className="h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/admin/dashboard/admins"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white shadow group-hover:scale-105 transition-transform">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Manage Admins</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Future-proof roles and venue-level access.
                </p>
              </div>
              <svg
                className="h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
      )}
    </AdminShell>
  );
}
