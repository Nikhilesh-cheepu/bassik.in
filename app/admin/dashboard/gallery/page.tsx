import SiteGalleryAdminClient from "@/components/admin/site-gallery/SiteGalleryAdminClient";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SiteGalleryAdminPage() {
  const images = await prisma.galleryImage.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return <SiteGalleryAdminClient initialImages={images} />;
}
