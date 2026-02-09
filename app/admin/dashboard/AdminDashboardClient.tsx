"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export default function AdminDashboardClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVenues: 0,
    pendingBookings: 0,
    todayBookings: 0,
  });

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/admin");
        return;
      }
      setLoading(false);
      loadStats();
    }
  }, [isLoaded, isSignedIn, router]);

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

  if (!isLoaded || !isSignedIn || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Dashboard</h1>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                Admin
              </span>
            </div>
            <SignOutButton>
              <button className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Logout
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-[53px] sm:top-[57px] z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex space-x-4 sm:space-x-6 overflow-x-auto scrollbar-hide -mb-px">
            <Link
              href="/admin/dashboard"
              className="border-b-2 border-orange-500 px-2 py-2.5 text-xs sm:text-sm font-medium text-orange-600 whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/dashboard/venues"
              className="border-b-2 border-transparent px-2 py-2.5 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
            >
              Venues
            </Link>
            <Link
              href="/admin/dashboard/bookings"
              className="border-b-2 border-transparent px-2 py-2.5 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
            >
              Bookings
            </Link>
            <Link
              href="/admin/dashboard/admins"
              className="border-b-2 border-transparent px-2 py-2.5 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
            >
              Admins
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Venues</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalVenues}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-500">{stats.pendingBookings}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Today</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.todayBookings}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Link
            href="/admin/dashboard/venues"
            className="bg-white rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all border border-gray-100 group"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">Manage Venues</h3>
                <p className="text-xs text-gray-500 line-clamp-1">Upload images, menus & details</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/admin/dashboard/bookings"
            className="bg-white rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all border border-gray-100 group"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">View Bookings</h3>
                <p className="text-xs text-gray-500 line-clamp-1">Manage reservations & status</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/admin/dashboard/admins"
            className="bg-white rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-all border border-gray-100 group"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5">Manage Admins</h3>
                <p className="text-xs text-gray-500 line-clamp-1">Create & manage admins</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
