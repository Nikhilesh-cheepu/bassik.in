"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TribecaDiscussionsClient() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const draftRef = useRef("");
  const lastSavedRef = useRef("");
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const persist = useCallback(async () => {
    if (!dirtyRef.current) return true;
    if (savingRef.current) return false;
    const payload = draftRef.current;
    if (payload === lastSavedRef.current) {
      dirtyRef.current = false;
      return true;
    }
    savingRef.current = true;
    setStatus("Saving…");
    try {
      const res = await fetch("/api/tribecacafe/discussions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: payload }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      const notes = typeof data.notes === "string" ? data.notes : payload;
      lastSavedRef.current = notes;
      // Only clear dirty if user hasn't typed more while we were saving
      if (draftRef.current === payload) {
        dirtyRef.current = false;
        setStatus("Saved");
        window.setTimeout(() => setStatus(""), 1200);
      } else {
        dirtyRef.current = true;
        setStatus("Saving…");
      }
      return draftRef.current === payload;
    } catch {
      setStatus("Could not save — will retry");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist();
    }, 450);
  }, [persist]);

  const flushAndLeave = useCallback(async () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    await persist();
    // If still dirty (typed during save), one more pass
    if (dirtyRef.current) await persist();
    router.push("/tribecacafe?tab=plan");
  }, [persist, router]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tribecacafe/discussions", { cache: "no-store" });
      if (res.status === 401) {
        setAuthenticated(false);
        router.replace("/tribecacafe");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      const notes = typeof data.notes === "string" ? data.notes : "";
      setDraft(notes);
      draftRef.current = notes;
      lastSavedRef.current = notes;
      dirtyRef.current = false;
      setLoaded(true);
      setStatus("");
    } catch {
      setStatus("Could not load notes");
    }
  }, [router]);

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

  // Flush pending save when leaving the tab/app
  useEffect(() => {
    const onHide = () => {
      if (!dirtyRef.current) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      const body = JSON.stringify({ notes: draftRef.current });
      try {
        void fetch("/api/tribecacafe/discussions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
          cache: "no-store",
        });
        lastSavedRef.current = draftRef.current;
        dirtyRef.current = false;
      } catch {
        void persist();
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [persist]);

  // Retry if still dirty after a failed/partial save
  useEffect(() => {
    if (!loaded) return;
    const t = window.setInterval(() => {
      if (dirtyRef.current && !savingRef.current) void persist();
    }, 2000);
    return () => window.clearInterval(t);
  }, [loaded, persist]);

  if (!authChecked || !authenticated) {
    return <div className="proposal-doc min-h-[100dvh] bg-[#0b0c10]" />;
  }

  return (
    <div className="proposal-doc min-h-[100dvh] bg-[#0b0c10] text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col px-5 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void flushAndLeave()}
            className="text-[13px] font-bold text-[#B8FF3C]"
          >
            ← Plan
          </button>
          <p className="text-[11px] font-bold text-white/40">
            {status || (loaded ? "Auto-saves" : "Loading…")}
          </p>
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

        <textarea
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            draftRef.current = v;
            scheduleSave();
          }}
          onBlur={() => {
            if (saveTimer.current) window.clearTimeout(saveTimer.current);
            void persist();
          }}
          disabled={!loaded}
          placeholder={`Write freely…

Expectations
What’s going on with content
Resources they have
Resources we have`}
          className="mt-5 min-h-[65dvh] flex-1 resize-none border-0 bg-transparent px-0 py-2 text-[16px] font-semibold leading-relaxed text-white outline-none placeholder:text-white/25"
        />
      </div>
    </div>
  );
}
