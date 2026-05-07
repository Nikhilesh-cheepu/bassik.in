import GalleryMasonryClient, {
  GalleryPageHeaderBar,
} from "@/components/site-gallery/GalleryMasonryClient";
import { getGalleryImages } from "@/lib/site-gallery-data";

export const revalidate = 30;

export default async function PublicGalleryPage() {
  const images = await getGalleryImages();

  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <GalleryPageHeaderBar />
        <GalleryMasonryClient images={images} />
      </div>
    </div>
  );
}
