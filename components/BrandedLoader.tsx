"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface BrandedLoaderProps {
  accentColor: string;
  logoPath: string;
  brandName: string;
}

export default function BrandedLoader({ accentColor, logoPath, brandName }: BrandedLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center">
        {/* Animated gradient ring around logo */}
        <div className="relative inline-block">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, ${accentColor}40, transparent, ${accentColor}40)`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative w-20 h-20 rounded-full bg-black/80 flex items-center justify-center m-1">
            <div className="relative w-12 h-12">
              <Image
                src={logoPath}
                alt={brandName}
                fill
                className="object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Pulse dots */}
        <div className="flex gap-2 justify-center mt-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accentColor }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
