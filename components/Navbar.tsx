"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin" || user?.publicMetadata?.role === "main_admin";

  return (
    <nav className="w-full bg-gray-950 border-b border-white/10 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 py-2.5 sm:py-3" style={{ paddingLeft: "max(1rem, env(safe-area-inset-left))", paddingRight: "max(1rem, env(safe-area-inset-right))" }}>
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="block">
              <div className="bg-white/10 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 overflow-hidden relative w-24 sm:w-28 h-9 sm:h-10 md:h-11">
                <Image
                  src="/logos/bassik.png"
                  alt="Bassik"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Home
            </Link>
            <Link
              href="/reservations"
              className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Reservations
            </Link>
            <a
              href="#"
              className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Venues
            </a>
            <a
              href="#"
              className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              About
            </a>
            
            {/* Clerk Auth Buttons */}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/my-bookings"
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                My Bookings
              </Link>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            </SignedIn>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white p-2 -mr-2 touch-manipulation"
            aria-label="Toggle menu"
            style={{ WebkitTapHighlightColor: "transparent" }}
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
          <div className="md:hidden mt-3 pb-2 border-t border-white/10">
            <div className="flex flex-col gap-1 pt-3">
              <Link
                href="/"
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors py-2.5 px-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/reservations"
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors py-2.5 px-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Reservations
              </Link>
              <a
                href="#"
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors py-2.5 px-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Venues
              </a>
              <a
                href="#"
                className="text-gray-300 hover:text-white text-sm font-medium transition-colors py-2.5 px-1"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </a>
              
              {/* Mobile Auth Buttons */}
              <div className="pt-2 border-t border-white/10 mt-2">
                <SignedOut>
                  <div className="flex flex-col gap-2">
                    <SignInButton mode="modal">
                      <button className="text-gray-300 hover:text-white text-sm font-medium transition-colors py-2.5 px-1 text-left w-full">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors w-full text-center">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </div>
                </SignedOut>
                <SignedIn>
                  <div className="flex flex-col gap-2">
                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors text-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                    <Link
                      href="/my-bookings"
                      className="text-gray-300 hover:text-white text-sm font-medium transition-colors py-2.5 px-1"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      My Bookings
                    </Link>
                    <div className="flex items-center gap-2 py-2.5 px-1">
                      <UserButton 
                        appearance={{
                          elements: {
                            avatarBox: "w-8 h-8",
                          },
                        }}
                      />
                      <span className="text-gray-300 text-sm">Account</span>
                    </div>
                  </div>
                </SignedIn>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

