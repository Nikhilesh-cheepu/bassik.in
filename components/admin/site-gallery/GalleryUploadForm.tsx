"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { compressImageToMaxBytes, sanitizedFilename } from "@/lib/compress-image";

const MAX_BEFORE_COMPRESS = 5 * 1024 * 1024;
const MULTIPART_BYTES = 4 * 1024 * 1024;

export default function GalleryUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const locking = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [altDefault, setAltDefault] = useState("");

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length || locking.current) return;
      const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (!files.length) {
        setError("No image files selected.");
        return;
      }
      setError(null);
      locking.current = true;
      setBusy(true);
      setProgressPct(0);

      const handleUrl = `${window.location.origin}/api/admin/blob`;
      let cumulativeLoaded = 0;
      let grandTotalEstimate = files.reduce((s, f) => s + Math.min(f.size, MAX_BEFORE_COMPRESS), 0);
      grandTotalEstimate = Math.max(grandTotalEstimate, 1);

      try {
        for (let fi = 0; fi < files.length; fi++) {
          let file = files[fi];
          let body: Blob | File = file;

          if (file.size > MAX_BEFORE_COMPRESS) {
            body = await compressImageToMaxBytes(file, MAX_BEFORE_COMPRESS);
          }

          const base = sanitizedFilename(file.name.replace(/\.[^.]+$/, "")) || "photo";
          const pathname = `gallery/site-${Date.now()}-${fi}-${base}`;

          await upload(pathname, body, {
            access: "public",
            handleUploadUrl: handleUrl,
            multipart: body.size > MULTIPART_BYTES,
            clientPayload: JSON.stringify({
              alt: altDefault.trim() || undefined,
            }),
            onUploadProgress: ({ loaded, total }) => {
              const batch = total ? loaded / total : 0;
              const span = Math.min(files[fi].size, MAX_BEFORE_COMPRESS);
              const before = cumulativeLoaded + batch * span;
              setProgressPct(Math.min(99, Math.round((before / grandTotalEstimate) * 100)));
            },
          });
          cumulativeLoaded += Math.min(files[fi].size, MAX_BEFORE_COMPRESS);
          setProgressPct(Math.min(99, Math.round((cumulativeLoaded / grandTotalEstimate) * 100)));
        }
        setProgressPct(100);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        locking.current = false;
        setBusy(false);
      }
    },
    [altDefault, router]
  );

  const onPick = () => inputRef.current?.click();

  return (
    <div className="mb-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-6">
      <p className="text-sm font-semibold text-slate-900 mb-2">Upload images</p>
      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        Client-safe compression (~5&nbsp;MB). Large blobs use multipart (&gt;4&nbsp;MB). Stored under{" "}
        <span className="font-mono text-[11px]">gallery/</span> in Blob; Postgres row is written on completion.
      </p>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-600 mb-1">
        Alt text prefix (optional, all in batch)
      </label>
      <input
        type="text"
        value={altDefault}
        onChange={(e) => setAltDefault(e.target.value)}
        maxLength={200}
        className="mb-4 w-full max-w-lg rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
        placeholder="e.g. Alehouse nightlife"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={onPick}
        className="w-full rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-55"
      >
        {busy ? `Uploading… ${progressPct}%` : "Click or tap to choose files (multi-select)"}
      </button>
      {busy ? (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
