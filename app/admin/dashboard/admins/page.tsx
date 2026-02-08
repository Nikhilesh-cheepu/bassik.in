"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignOutButton } from "@clerk/nextjs";
import { BRANDS } from "@/lib/brands";

interface AdminUser {
  id: string;
  username: string;
  role: string;
  active: boolean;
  venuePermissions: { venue: { brandId: string } }[];
  createdAt: string;
}

export default function AdminsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      if (!isSignedIn) {
        router.push("/admin");
        return;
      }
      setLoading(false);
      loadAdmins();
    }
  }, [isLoaded, isSignedIn, router]);

  const loadAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins");
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error("Error loading admins:", error);
    }
  };

  const handleToggleAdmin = async (adminId: string, currentActive: boolean) => {
    // Admins are managed in Clerk Dashboard via user metadata
    alert("Admins are managed in Clerk Dashboard. To modify admins, go to Clerk Dashboard → Users → Edit user → Metadata → Set role to 'admin' or 'main_admin'");
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
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Manage Admins</h1>
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4">
          <p className="text-xs sm:text-sm text-blue-800">
            <strong>Note:</strong> Admins are managed in Clerk Dashboard. To add or modify admins, go to <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="underline">Clerk Dashboard</a> → Users → Edit user → Metadata → Set role to <code className="bg-blue-100 px-1 py-0.5 rounded">&quot;admin&quot;</code> or <code className="bg-blue-100 px-1 py-0.5 rounded">&quot;main_admin&quot;</code>
          </p>
        </div>
        {/* Card-Based Admins List */}
        <div className="space-y-2 sm:space-y-3">
          {admins.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
              <p className="text-gray-500">No admins found</p>
            </div>
          ) : (
            admins.map((adminUser) => (
              <div
                key={adminUser.id}
                className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 border transition-all ${
                  adminUser.active ? "border-gray-100" : "border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Left: Admin Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-sm sm:text-base font-semibold text-gray-900">
                            {adminUser.username}
                          </div>
                          <span
                            className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${
                              adminUser.role === "MAIN_ADMIN"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {adminUser.role === "MAIN_ADMIN" ? "Main Admin" : "Admin"}
                          </span>
                          {!adminUser.active && (
                            <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          Created: {new Date(adminUser.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      {adminUser.role === "MAIN_ADMIN" ? (
                        <span className="text-gray-500">All venues</span>
                      ) : adminUser.venuePermissions.length === 0 ? (
                        <span className="text-red-500">No permissions</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {adminUser.venuePermissions.map((perm) => (
                            <span
                              key={perm.venue.brandId}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {BRANDS.find((b) => b.id === perm.venue.brandId)?.shortName || perm.venue.brandId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Status (Read-only) */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs sm:text-sm font-medium">
                      Active
                    </div>
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
