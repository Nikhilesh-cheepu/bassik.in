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
        body: JSON.stringify({ id: "bassikadmin", password: value }),
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
      router.push("/admin/dashboard");
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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-slate-950">
      {/* ambient blobs */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-40 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-amber-400/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-sky-500/30 via-cyan-400/20 to-lime-400/40 blur-3xl" />
      </div>

      <div className="relative max-w-md w-full">
        <div className="text-center mb-8 animate-[fadeIn_500ms_ease-out]">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 rounded-2xl shadow-lg shadow-fuchsia-500/40 mb-4">
            <svg
              className="w-8 h-8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-slate-50 mb-1 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-sm text-slate-300/80">
            Enter the 4-digit admin passcode to continue
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`bg-slate-900/80 backdrop-blur-2xl rounded-2xl shadow-[0_18px_60px_rgba(0,0,0,0.65)] border border-slate-700/70 p-8 space-y-5 transform transition-all duration-200 ${
            error ? "animate-shake border-red-500/70" : "hover:shadow-[0_22px_70px_rgba(0,0,0,0.8)] hover:-translate-y-0.5"
          }`}
        >
          {error && (
            <p className="text-sm text-red-300 bg-red-950/60 border border-red-500/40 rounded-lg px-3 py-2">
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
                        ? "border-violet-400 bg-violet-500/20 text-violet-50 shadow-[0_0_12px_rgba(139,92,246,0.7)]"
                        : "border-slate-600/80 bg-slate-900/60 text-slate-100"
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
            className="w-full py-2.5 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 hover:from-violet-400 hover:via-fuchsia-400 hover:to-amber-300 focus:ring-2 focus:ring-fuchsia-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-60 flex items-center justify-center gap-2 transition-[background,box-shadow,transform] shadow-[0_10px_35px_rgba(236,72,153,0.65)] hover:-translate-y-0.5"
          >
            {loading && (
              <span className="inline-flex h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? "Signing you in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center mt-6 text-xs text-slate-400/80">
          Secure access for authorized Bassik admins only
        </p>
      </div>
    </div>
  );
}
