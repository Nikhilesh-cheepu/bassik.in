"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type AdminShellProps = {
  title: string;
  children: ReactNode;
  showBack?: boolean;
  onBackHref?: string;
};

export default function AdminShell({
  title,
  children,
  showBack = false,
  onBackHref = "/admin/dashboard",
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Venues", href: "/admin/dashboard/venues" },
    { label: "Bookings", href: "/admin/dashboard/bookings" },
    { label: "Admins", href: "/admin/dashboard/admins" },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin/dashboard" && pathname?.startsWith(href));

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                type="button"
                onClick={() => router.push(onBackHref)}
                className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:inline-flex"
              >
                ← Back
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-900 sm:text-base">
                  {title}
                </h1>
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-600">
                  Admin
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Bassik internal control panel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-2 px-4 pb-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                isActive(tab.href)
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:pt-6">{children}</main>
    </div>
  );
}

