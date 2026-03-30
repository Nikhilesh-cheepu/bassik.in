import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import ReservationForm from "@/components/ReservationForm";

export default async function OutletBookPage({
  params,
}: {
  params: Promise<{ outlet: string }>;
}) {
  const { outlet: outletSlug } = await params;
  const publicBrands = BRANDS.filter((b) => !HIDDEN_BRAND_IDS.has(b.id));
  const activeBrand = publicBrands.find((b) => b.id === outletSlug) || publicBrands[0] || BRANDS[0];

  return (
    <div className="min-h-screen bg-black">
      <main className="max-w-5xl mx-auto w-full px-4 py-4">
        <ReservationForm brand={activeBrand} />
      </main>
    </div>
  );
}
