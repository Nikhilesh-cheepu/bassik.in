"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";

/**
 * Opens the venue editor directly (first allowed outlet).
 * Full card grid lives at /admin/dashboard/venues/overview.
 */
export default function VenuesIndexRedirect() {
  const router = useRouter();
  const [msg, setMsg] = useState("Opening venues…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const me = meRes.ok ? await meRes.json() : { scope: "main", brandIds: null };
        if (cancelled) return;

        let target: string | null = null;
        if (me?.scope === "outlet" && Array.isArray(me.brandIds) && me.brandIds.length > 0) {
          target = me.brandIds[0] as string;
        } else {
          const first = BRANDS.find((b) => !HIDDEN_BRAND_IDS.has(b.id));
          target = first?.id ?? null;
        }

        if (target) {
          router.replace(`/admin/dashboard/venues/${target}`);
        } else {
          router.replace("/admin/dashboard/venues/overview");
        }
      } catch {
        if (!cancelled) {
          setMsg("Something went wrong. Try All venues below.");
          router.replace("/admin/dashboard/venues/overview");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
        <p className="mt-3 text-sm text-slate-600">{msg}</p>
        <Link
          href="/admin/dashboard/venues/overview"
          className="mt-4 inline-block text-xs text-slate-500 underline"
        >
          All venues (grid)
        </Link>
      </div>
    </div>
  );
}
