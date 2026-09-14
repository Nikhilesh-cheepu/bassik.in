"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/tribecacafe?tab=credentials", label: "Credentials" },
  { href: "/tribecacafe?tab=calendar", label: "Calendar" },
  { href: "/tribecacafe?tab=todo", label: "Todo" },
  { href: "/tribecacafe?tab=budget", label: "Ad budget" },
  { href: "/tribecacafe/discussions", label: "Discussion", active: true },
];

export default function TribecaDiscussionsClient() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const draftRef = useRef("");
  const dirtyRef = useRef(false);

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

  const save = useCallback(
    async (andLeave = false) => {
      setSaving(true);
      setStatus("Saving…");
      try {
        const res = await fetch("/api/tribecacafe/discussions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: draftRef.current }),
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");
        const notes = typeof data.notes === "string" ? data.notes : draftRef.current;
        setDraft(notes);
        draftRef.current = notes;
        dirtyRef.current = false;
        setStatus("Saved");
        if (andLeave) {
          router.push("/tribecacafe?tab=calendar");
          return;
        }
        window.setTimeout(() => setStatus(""), 1600);
      } catch {
        setStatus("Could not save");
      } finally {
        setSaving(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!loaded || !dirtyRef.current) return;
    const t = window.setTimeout(() => {
      if (dirtyRef.current) void save(false);
    }, 900);
    return () => window.clearTimeout(t);
  }, [draft, loaded, save]);

  if (!authChecked || !authenticated) {
    return <div className="proposal-doc min-h-[100dvh] bg-[#0b0c10]" />;
  }

  return (
    <div className="proposal-doc min-h-[100dvh] bg-[#0b0c10] text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col px-5 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <Link href="/tribecacafe?tab=calendar" className="text-[13px] font-bold text-[#B8FF3C]">
            ← Back
          </Link>
          <button
            type="button"
            onClick={() => void save(true)}
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
          One shared pad · expectations · content · resources
        </p>
        {status ? (
          <p className="mt-2 text-[11px] font-bold text-white/45">{status}</p>
        ) : null}

        <textarea
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            draftRef.current = v;
            dirtyRef.current = true;
          }}
          onBlur={() => {
            if (dirtyRef.current) void save(false);
          }}
          disabled={!loaded}
          placeholder={`Write freely…

Expectations
What’s going on with content
Resources they have
Resources we have`}
          className="mt-5 min-h-[60dvh] flex-1 resize-none border-0 bg-transparent px-0 py-2 text-[16px] font-semibold leading-relaxed text-white outline-none placeholder:text-white/25"
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#22242c] bg-[#0b0c10] px-2 py-2.5">
        <div className="mx-auto flex max-w-[430px] gap-1">
          {NAV.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-0.5 text-[10px] font-bold ${
                t.active ? "bg-[#B8FF3C] text-[#0b0c10]" : "text-white/45"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
