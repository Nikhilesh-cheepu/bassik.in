"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function verifyPasscode(value: string) {
    if (value.length !== 4) {
      setError("Enter the 4-digit admin passcode");
      return;
    }

    setError("");
    setLoading(true);
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid passcode");
        setPassword("");
        setLoading(false);
        setVerifying(false);
        return;
      }
      // Small delay for a smoother transition animation
      await new Promise((resolve) => setTimeout(resolve, 250));
      const next =
        typeof data.redirectTo === "string" && data.redirectTo.startsWith("/admin")
          ? data.redirectTo
          : "/admin/dashboard";
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      setVerifying(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await verifyPasscode(password);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 text-white rounded-2xl mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-1 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-sm text-slate-600">
            Enter the 4-digit admin passcode to continue
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5 ${
            error ? "ring-2 ring-rose-200" : ""
          }`}
        >
          {error && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-200 mb-2"
            >
              Admin passcode
            </label>
            <div className="space-y-3">
              <div
                className="flex justify-between gap-2 cursor-text"
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
              >
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-11 w-11 rounded-2xl border text-lg font-semibold flex items-center justify-center transition-all duration-150 ${
                      password.length > idx
                        ? "border-slate-300 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {password[idx] ? "•" : ""}
                  </div>
                ))}
              </div>
              <input
                id="admin-pin"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={password}
                ref={inputRef}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPassword(value);
                  if (error) setError("");
                  if (value.length === 4 && !verifying) {
                    void verifyPasscode(value);
                  }
                }}
                className="sr-only"
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="text-xs text-slate-400">
                Numbers only. You&apos;ll be redirected automatically after entering 4 digits.
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-white bg-slate-900 hover:bg-slate-800 focus:ring-2 focus:ring-slate-300 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {loading && (
              <span className="inline-flex h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Signing you in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center mt-6 text-xs text-slate-500">
          Secure access for authorized Bassik admins only
        </p>
      </div>
    </div>
  );
}
