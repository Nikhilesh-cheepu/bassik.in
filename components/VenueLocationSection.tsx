"use client";

import { motion } from "framer-motion";

interface VenueLocationSectionProps {
  loading: boolean;
  address: string;
  mapUrl: string | null;
  accentColor: string;
}

export default function VenueLocationSection({
  loading,
  address,
  mapUrl,
  accentColor,
}: VenueLocationSectionProps) {
  if (loading) {
    return <div className="h-20 bg-white/5 rounded-xl animate-pulse" />;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-3 overflow-hidden"
    >
      <h2 className="text-sm font-semibold text-white mb-2">Location</h2>
      {mapUrl ? (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="relative h-16 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 mb-2">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-6 h-6 transition-colors"
                style={{ color: accentColor }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <svg
              className="w-3 h-3 mt-0.5 flex-shrink-0"
              style={{ color: accentColor }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium mb-0.5 truncate">
                {address || "Address"}
              </p>
              <p
                className="text-[10px] font-medium transition-colors group-hover:opacity-80"
                style={{ color: accentColor }}
              >
                Open in Google Maps →
              </p>
            </div>
          </div>
        </a>
      ) : (
        <div className="py-3 text-center text-gray-400">
          <p className="text-xs">Location not set</p>
        </div>
      )}
    </motion.section>
  );
}

