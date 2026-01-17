"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Admin {
  id: string;
  username: string;
  role: string;
  venuePermissions: string[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVenues: 0,
    pendingBookings: 0,
    todayBookings: 0,
  });

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
        loadStats(data.admin);
      } catch (error) {
        router.push("/admin");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  const loadStats = async (adminData: Admin) => {
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
        const today = new Date().toISOString().split("T")[0];
        const todayBookings = bookingsData.reservations?.filter(
          (b: any) => b.date === today
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

  const handleLogout = () => {
    document.cookie = "admin-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/admin");
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, <span className="font-semibold">{admin.username}</span> 
                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                  {admin.role === "MAIN_ADMIN" ? "Main Admin" : "Admin"}
                </span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            <Link
              href="/admin/dashboard"
              className="border-b-2 border-orange-500 px-1 py-4 text-sm font-medium text-orange-600"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/dashboard/venues"
              className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Venues
            </Link>
            <Link
              href="/admin/dashboard/bookings"
              className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Bookings
            </Link>
            {admin.role === "MAIN_ADMIN" && (
              <Link
                href="/admin/dashboard/admins"
                className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Admins
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-600">Total Venues</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalVenues}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <h3 className="text-sm font-medium text-gray-600">Pending Bookings</h3>
            <p className="text-3xl font-bold text-orange-500 mt-2">{stats.pendingBookings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-600">Today&apos;s Bookings</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayBookings}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/dashboard/venues"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Manage Venues</h2>
                <p className="text-sm text-gray-600">
                  Add, edit venues, upload images and menus
                </p>
              </div>
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/admin/dashboard/bookings"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">View Bookings</h2>
                <p className="text-sm text-gray-600">
                  Manage reservations and update status
                </p>
              </div>
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {admin.role === "MAIN_ADMIN" && (
            <Link
              href="/admin/dashboard/admins"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Manage Admins</h2>
                  <p className="text-sm text-gray-600">
                    Create and manage admin users
                  </p>
                </div>
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
