"use client";

import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <div className="text-gray-900 font-bold text-lg">
              <span className="text-2xl">B</span>assik
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="/"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Home
            </a>
            <a
              href="/reservations"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Reservations
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Venues
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              About
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-900 p-2"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-2 border-t border-gray-200">
            <div className="flex flex-col gap-3 pt-3">
              <a
                href="/"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </a>
              <a
                href="/reservations"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Reservations
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Venues
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

