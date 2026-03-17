"use client";

import { useState, useEffect } from "react";
import { BRANDS } from "@/lib/brands";
import AdminShell from "@/components/admin/AdminShell";

interface AdminUser {
  id: string;
  username: string;
  role: string;
  active: boolean;
  venuePermissions: { venue: { brandId: string } }[];
  createdAt: string;
}

export default function AdminsPageClient() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
    loadAdmins();
  }, []);

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

  if (loading) {
    return (
      <AdminShell title="Admins">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-500/60 border-t-transparent" />
            <p className="mt-3 text-xs text-slate-400">Loading admins…</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Manage Admins">
      <main className="pb-8 pt-2">
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-700/60 bg-sky-950/40 px-4 py-3">
          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/90 text-xs font-semibold text-white">
            i
          </div>
          <p className="text-xs text-slate-100 sm:text-sm">
            <span className="font-semibold text-sky-100">Single admin mode.</span> Bassik
            currently uses a single admin passcode for access. This screen will surface multiple
            named admins and granular roles once we expand permissions.
          </p>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {admins.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-10 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-6 2.24-6 5v1h12v-1c0-2.76-2.67-5-6-5z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-100">No admins yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Admin access is handled by the shared passcode. This view will list named admins
                once role-based access is enabled.
              </p>
            </div>
          ) : (
            admins.map((adminUser) => (
              <div
                key={adminUser.id}
                className={`rounded-2xl border p-3 shadow-[0_18px_45px_rgba(15,23,42,0.9)] sm:p-4 transition-all ${
                  adminUser.active
                    ? "border-slate-800 bg-slate-900/80"
                    : "border-slate-800 bg-slate-900/40 opacity-70"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-50 sm:text-base">
                            {adminUser.username}
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              adminUser.role === "MAIN_ADMIN"
                                ? "bg-fuchsia-500/15 text-fuchsia-200"
                                : "bg-sky-500/15 text-sky-200"
                            }`}
                          >
                            {adminUser.role === "MAIN_ADMIN" ? "Main Admin" : "Admin"}
                          </span>
                          {!adminUser.active && (
                            <span className="inline-flex rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 sm:text-sm">
                          Created: {new Date(adminUser.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 sm:text-sm">
                      {adminUser.role === "MAIN_ADMIN" ? (
                        <span className="text-slate-400">All venues</span>
                      ) : adminUser.venuePermissions.length === 0 ? (
                        <span className="text-rose-300">No permissions</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {adminUser.venuePermissions.map((perm) => (
                            <span
                              key={perm.venue.brandId}
                              className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200"
                            >
                              {BRANDS.find((b) => b.id === perm.venue.brandId)?.shortName || perm.venue.brandId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <div className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 sm:text-sm">
                      Status: {adminUser.active ? "Active" : "Inactive"}
                    </div>
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
