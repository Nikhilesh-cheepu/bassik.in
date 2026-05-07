"use client";

import AdminShell from "@/components/admin/AdminShell";
import GalleryUploadForm from "@/components/admin/site-gallery/GalleryUploadForm";
import GalleryGridManager from "@/components/admin/site-gallery/GalleryGridManager";

type Row = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export default function SiteGalleryAdminClient({
  initialImages,
}: {
  initialImages: Row[];
}) {
  return (
    <AdminShell title="Site gallery">
      <p className="mb-6 text-sm leading-relaxed text-slate-600">
        Global marketing reel for the homepage and{" "}
        <span className="font-mono text-xs text-slate-800">/gallery</span>. Main admin only. Requires{" "}
        <span className="font-mono text-[11px]">BLOB_READ_WRITE_TOKEN</span> and Postgres with{" "}
        <span className="font-mono text-[11px]">GalleryImage</span> migrated.
      </p>
      <GalleryUploadForm />
      <GalleryGridManager images={initialImages} />
    </AdminShell>
  );
}
