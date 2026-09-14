"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { currentYearMonth } from "@/lib/tribeca";

export default function TribecaDiscussionsClient() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const ym = currentYearMonth();
    setYearMonth(ym);
    try {
      const res = await fetch(`/api/tribecacafe/month?month=${ym}`);
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      setDraft(typeof data.month?.notes === "string" ? data.month.notes : "");
      setYearMonth(data.month?.yearMonth || ym);
      setLoaded(true);
    } catch {
      setStatus("Could not load notes");
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("proposal-active");
    return () => document.body.classList.remove("proposal-active");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tribecacafe/auth");
        const data = await res.json();
        setAuthChecked(true);
        if (!data.authenticated) {
          setAuthenticated(false);
          router.replace("/tribecacafe");
          return;
        }
        setAuthenticated(true);
        await load();
      } catch {
        setAuthChecked(true);
        router.replace("/tribecacafe");
      }
    })();
  }, [load, router]);

  const save = async () => {
    setSaving(true);
    setStatus("Saving…");
    try {
      const res = await fetch("/api/tribecacafe/discussions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth, notes: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDraft(data.month?.notes ?? draft);
      setStatus("Saved");
      window.setTimeout(() => setStatus(""), 1600);
    } catch {
      setStatus("Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked || !authenticated) {
    return <div className="proposal-doc min-h-[100dvh] bg-[#0b0c10]" />;
  }

  return (
    <div className="proposal-doc min-h-[100dvh] bg-[#0b0c10] text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/tribecacafe"
            className="text-[13px] font-bold text-[#B8FF3C]"
          >
            ← Back
          </Link>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !loaded}
            className="rounded-full bg-[#B8FF3C] px-4 py-1.5 text-[12px] font-bold text-[#0b0c10] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Done"}
          </button>
        </div>

        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
          Discussion
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-agency-display)] text-[1.6rem] font-bold">
          Notes
        </h1>
        <p className="mt-1 text-[12px] font-semibold text-white/40">
          Expectations · content · resources
        </p>
        {status ? (
          <p className="mt-2 text-[11px] font-bold text-white/45">{status}</p>
        ) : null}

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!loaded}
          placeholder={`Write freely…

Expectations
What’s going on with content
Resources they have
Resources we have`}
          className="mt-5 min-h-[60dvh] flex-1 resize-none border-0 bg-transparent px-0 py-2 text-[16px] font-semibold leading-relaxed text-white outline-none placeholder:text-white/25"
        />
      </div>
    </div>
  );
}
