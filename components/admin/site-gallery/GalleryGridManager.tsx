"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteSiteGalleryImages, moveSiteGalleryImage } from "@/app/admin/dashboard/gallery/gallery-actions";

type Row = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export default function GalleryGridManager({ images }: { images: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const runDeleteMany = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} image(s) from Blob + database?`)) return;
    startTransition(async () => {
      await deleteSiteGalleryImages(ids);
      setSelected({});
      router.refresh();
    });
  };

  const runMove = async (id: string, dir: "up" | "down") => {
    startTransition(async () => {
      await moveSiteGalleryImage(id, dir);
      router.refresh();
    });
  };

  if (!images.length) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No images yet. Upload above.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{images.length} image(s)</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || selectedIds.length === 0}
            onClick={() => runDeleteMany(selectedIds)}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-45"
          >
            Delete selected ({selectedIds.length})
          </button>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, index) => {
          const sel = Boolean(selected[img.id]);
          return (
            <li
              key={img.id}
              className={`flex gap-3 rounded-2xl border p-3 ${sel ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200 bg-white"}`}
            >
              <button
                type="button"
                aria-pressed={sel}
                onClick={() => toggle(img.id)}
                className={`relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-1 ${sel ? "ring-emerald-400" : "ring-transparent"} `}
              >
                <Image src={img.url} alt="" fill className="object-cover" sizes="80px" unoptimized />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-mono text-slate-400" title={img.url}>
                  {img.url.slice(-48)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-600">{img.alt || "(no alt)"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={pending || index === 0}
                    onClick={() => runMove(img.id, "up")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold disabled:opacity-35"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={pending || index >= images.length - 1}
                    onClick={() => runMove(img.id, "down")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold disabled:opacity-35"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => runDeleteMany([img.id])}
                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
