"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import ReservationForm from "@/components/ReservationForm";

function ReservationsContent() {
  const params = useParams();
  const router = useRouter();
  const outletSlug = params?.outlet as string;
  const [activeBrandId, setActiveBrandId] = useState(() => {
    const b = BRANDS.find((b) => b.id === outletSlug) || BRANDS[0];
    return b.id;
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeBrand = BRANDS.find((b) => b.id === activeBrandId) || BRANDS[0];
  const logoPath = activeBrand.logoPath ?? (activeBrand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${activeBrand.id}.png`);

  useEffect(() => {
    if (activeBrandId !== outletSlug) {
      router.replace(`/${activeBrandId}/reservations`);
    }
  }, [activeBrandId, outletSlug, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
      <motion.div
        className="fixed inset-0 -z-10"
        animate={{
          background: [
            `radial-gradient(circle at 20% 50%, ${activeBrand.accentColor}20 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${activeBrand.accentColor}15 0%, transparent 50%), black`,
            `radial-gradient(circle at 80% 50%, ${activeBrand.accentColor}20 0%, transparent 50%), radial-gradient(circle at 20% 80%, ${activeBrand.accentColor}15 0%, transparent 50%), black`,
            `radial-gradient(circle at 20% 50%, ${activeBrand.accentColor}20 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${activeBrand.accentColor}15 0%, transparent 50%), black`,
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Compact header: back | outlet | hamburger */}
      <header
        className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 backdrop-blur-xl bg-black/70 border-b border-white/10 sticky top-0 z-20"
        style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top))", paddingLeft: "max(0.75rem, env(safe-area-inset-left))", paddingRight: "max(0.75rem, env(safe-area-inset-right))" }}
      >
        <button
          type="button"
          onClick={() => router.push(`/${activeBrandId}`)}
          className="p-2 -ml-1 text-white hover:text-white/80 rounded-lg touch-manipulation"
          aria-label="Back"
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div ref={dropdownRef} className="flex-1 flex justify-center min-w-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/20 max-w-[180px] min-w-0 touch-manipulation"
            style={{ borderColor: `${activeBrand.accentColor}50`, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            <div className="relative w-5 h-5 flex-shrink-0">
              <Image src={logoPath} alt="" fill className="object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            </div>
            <span className="text-sm font-semibold text-white truncate">{activeBrand.shortName}</span>
            <svg className={`w-4 h-4 text-white flex-shrink-0 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[200px] max-h-[240px] overflow-y-auto scrollbar-hide rounded-xl border border-white/20 backdrop-blur-xl bg-black/95 shadow-xl z-30"
                style={{ boxShadow: `0 8px 32px ${activeBrand.accentColor}20` }}
              >
                {BRANDS.map((brand) => {
                  const bp = brand.logoPath ?? (brand.id.startsWith("club-rogue") ? "/logos/club-rogue.png" : `/logos/${brand.id}.png`);
                  const sel = brand.id === activeBrandId;
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => {
                        setActiveBrandId(brand.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${sel ? "bg-white/10" : "hover:bg-white/5"}`}
                    >
                      <div className="relative w-4 h-4 flex-shrink-0">
                        <Image src={bp} alt="" fill className="object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                      </div>
                      <span className={`text-sm flex-1 ${sel ? "text-white font-medium" : "text-gray-300"}`}>{brand.shortName}</span>
                      {sel && <svg className="w-4 h-4" style={{ color: activeBrand.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 -mr-1 text-white rounded-lg touch-manipulation"
            aria-label="Menu"
            style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 w-40 py-2 rounded-xl border border-white/20 backdrop-blur-xl bg-black/95 shadow-xl z-30"
              >
                <Link
                  href={`/${activeBrandId}/my-bookings`}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-white/5"
                >
                  My Bookings
                </Link>
                <Link
                  href="/"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-white/5"
                >
                  Home
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="max-w-5xl mx-auto w-full py-4 px-4"
          style={{ paddingLeft: "max(1rem, env(safe-area-inset-left))", paddingRight: "max(1rem, env(safe-area-inset-right))" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-5 sm:p-6 relative overflow-visible"
            style={{ boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 0 32px ${activeBrand.accentColor}08` }}
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-25" style={{ backgroundColor: activeBrand.accentColor }} />
            <div className="relative z-10">
              <ReservationForm brand={activeBrand} />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="relative w-16 h-16 mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 rounded-full border-4 border-orange-500/30" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500" />
            </motion.div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ReservationsContent />
    </Suspense>
  );
}
