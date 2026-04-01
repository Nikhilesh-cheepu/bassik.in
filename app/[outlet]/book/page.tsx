import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import ReservationForm from "@/components/ReservationForm";

export default async function OutletBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ outlet: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { outlet: outletSlug } = await params;
  const { eventId } = await searchParams;
  const publicBrands = BRANDS.filter((b) => !HIDDEN_BRAND_IDS.has(b.id));
  const activeBrand = publicBrands.find((b) => b.id === outletSlug) || publicBrands[0] || BRANDS[0];

  return (
    <div className="min-h-screen bg-black">
      <main className="max-w-5xl mx-auto w-full px-4 py-4">
        <ReservationForm brand={activeBrand} initialEventId={eventId ?? null} />
      </main>
    </div>
  );
}
