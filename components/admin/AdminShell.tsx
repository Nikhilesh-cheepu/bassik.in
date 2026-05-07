"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type AdminMe = { scope: "main" | "outlet"; brandIds: string[] | null };
type MeState = AdminMe | "pending";

type AdminShellProps = {
  title: string;
  children: ReactNode;
  showBack?: boolean;
  onBackHref?: string;
  onBack?: () => void;
};

export default function AdminShell({
  title,
  children,
  showBack = false,
  onBackHref = "/admin/dashboard",
  onBack,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeState>("pending");

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AdminMe | null) => {
        if (d?.scope) setMe(d);
        else setMe({ scope: "main", brandIds: null });
      })
      .catch(() => setMe({ scope: "main", brandIds: null }));
  }, []);

  const allTabs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Assistant", href: "/admin/dashboard/assistant" },
    { label: "Site gallery", href: "/admin/dashboard/gallery" },
    { label: "Venues", href: "/admin/dashboard/venues" },
    { label: "Bookings", href: "/admin/dashboard/bookings" },
    { label: "Reviews", href: "/admin/dashboard/reviews" },
    { label: "Admins", href: "/admin/dashboard/admins" },
  ];

  const outletTabs = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Bookings", href: "/admin/dashboard/bookings" },
    { label: "Reviews", href: "/admin/dashboard/reviews" },
    { label: "Venues", href: "/admin/dashboard/venues" },
  ];

  const tabs =
    me === "pending"
      ? []
      : me.scope === "outlet"
        ? outletTabs
        : allTabs;

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:py-3">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                type="button"
                onClick={() => {
                  if (onBack) onBack();
                  else router.push(onBackHref);
                }}
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
                  {me !== "pending" && me.scope === "outlet" ? "Outlet admin" : "Admin"}
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

        {me === "pending" ? (
          <div className="mx-auto max-w-6xl px-4 pb-1">
            <div className="h-8 max-w-xs animate-pulse rounded-full bg-slate-100" />
          </div>
        ) : (
          <nav className="mx-auto flex max-w-6xl flex-nowrap gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                  isActive(tab.href)
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-3 sm:pt-6">{children}</main>
    </div>
  );
}

