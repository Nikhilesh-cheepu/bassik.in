import { BRANDS } from "@/lib/brands";

/** Preload hero ambient video early so the top section paints without waiting on discovery. */
// App deploys on Vercel; DB schema updates are applied separately (e.g. prisma migrate deploy on Railway).
export default async function OutletLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ outlet: string }>;
}) {
  const { outlet } = await params;
  const brand = BRANDS.find((b) => b.id === outlet);
  const videoHref = brand?.heroAmbientVideoUrl?.trim();
  return (
    <>
      {videoHref ? (
        <link rel="preload" href={videoHref} as="video" crossOrigin="anonymous" />
      ) : null}
      {children}
    </>
  );
}
