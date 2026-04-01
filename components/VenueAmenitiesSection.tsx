"use client";

import { motion } from "framer-motion";

interface VenueAmenitiesSectionProps {
  amenities: string[];
}

export default function VenueAmenitiesSection({ amenities }: VenueAmenitiesSectionProps) {
  const displayAmenities = amenities.length > 0 ? amenities : ["Amenity 1", "Amenity 2", "Amenity 3"];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
      className="w-full min-w-0 overflow-x-hidden"
    >
      <h2 className="mb-2 px-1 text-sm font-semibold text-white">Amenities ({displayAmenities.length})</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {displayAmenities.map((amenity, idx) => (
          <div key={`${amenity}-${idx}`} className="flex items-center gap-2 text-sm text-white/85">
            <span className="text-white/70">☆</span>
            <span className="truncate">{amenity}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

