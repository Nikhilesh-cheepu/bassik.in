"use client";

import { useState, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BRANDS } from "@/lib/brands";
import ReservationForm from "@/components/ReservationForm";
import Navbar from "@/components/Navbar";

function ReservationsContent() {
  const params = useParams();
  const router = useRouter();
  const outletSlug = params?.outlet as string;

  const findBrandBySlug = (slug: string) => {
    return BRANDS.find(b => b.id === slug) || BRANDS[0];
  };

  const initialBrand = findBrandBySlug(outletSlug);
  const [activeBrandId, setActiveBrandId] = useState<string>(initialBrand.id);

  const activeBrand =
    BRANDS.find((brand) => brand.id === activeBrandId) || BRANDS[0];

  useEffect(() => {
    if (activeBrandId !== outletSlug) {
      router.replace(`/${activeBrandId}/reservations`);
    }
  }, [activeBrandId, outletSlug, router]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="fixed inset-0 -z-10"
        animate={{
          background: [
            `radial-gradient(circle at 20% 50%, ${activeBrand.accentColor}20 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${activeBrand.accentColor}15 0%, transparent 50%), black`,
            `radial-gradient(circle at 80% 50%, ${activeBrand.accentColor}20 0%, transparent 50%), radial-gradient(circle at 20% 80%, ${activeBrand.accentColor}15 0%, transparent 50%), black`,
            `radial-gradient(circle at 20% 50%, ${activeBrand.accentColor}20 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${activeBrand.accentColor}15 0%, transparent 50%), black`,
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <Navbar />
      <main className="min-h-screen relative z-10">
        {/* Premium Header - Glassmorphic */}
        <div className="backdrop-blur-xl bg-black/60 border-b border-white/10 sticky top-0 z-10" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Back button */}
              <motion.button
                type="button"
                onClick={() => router.push(`/${activeBrandId}`)}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 text-white hover:text-white/80 backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 transition-all duration-200 touch-manipulation"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline text-xs sm:text-sm font-medium">Back</span>
              </motion.button>

              {/* Outlet Dropdown - Premium */}
              <div className="flex-1 relative min-w-0">
                <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 mb-1 sm:mb-2 uppercase tracking-wide">
                  Select Outlet
                </label>
                <div className="relative">
                  <select
                    value={activeBrandId}
                    onChange={(e) => {
                      setActiveBrandId(e.target.value);
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-8 sm:pr-10 text-xs sm:text-sm font-semibold backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer touch-manipulation"
                    style={{
                      borderColor: `${activeBrand.accentColor}60`,
                      touchAction: 'manipulation',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = activeBrand.accentColor;
                      e.target.style.boxShadow = `0 0 20px ${activeBrand.accentColor}50`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = `${activeBrand.accentColor}60`;
                      e.target.style.boxShadow = "";
                    }}
                  >
                    {BRANDS.map((brand) => (
                      <option key={brand.id} value={brand.id} className="bg-black text-white">
                        {brand.shortName}
                        {brand.id.startsWith("club-rogue") && ` - ${brand.name.split("–")[1]?.trim()}`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form Section - Premium Dark Card */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 overflow-visible">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-6 sm:p-8 md:p-10 relative overflow-hidden shadow-2xl"
            style={{
              boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px ${activeBrand.accentColor}10`,
            }}
          >
            {/* Decorative gradient orbs */}
            <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30" style={{ backgroundColor: activeBrand.accentColor }} />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: activeBrand.accentColor }} />
            
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
