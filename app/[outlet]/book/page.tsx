import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";
import ReservationForm from "@/components/ReservationForm";
import AppBackLink from "@/components/AppBackLink";

function pickParam(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export default async function OutletBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ outlet: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { outlet: outletSlug } = await params;
  const sp = await searchParams;
  const publicBrands = BRANDS.filter((b) => !HIDDEN_BRAND_IDS.has(b.id));
  const activeBrand = publicBrands.find((b) => b.id === outletSlug) || publicBrands[0] || BRANDS[0];

  const partyRaw = pickParam(sp.party);
  const partyNum = partyRaw ? parseInt(partyRaw, 10) : NaN;

  const prefill = {
    name: pickParam(sp.name),
    phone: pickParam(sp.phone),
    date: pickParam(sp.date),
    time: pickParam(sp.time),
    party: Number.isFinite(partyNum) && partyNum > 0 ? partyNum : undefined,
    eventId: pickParam(sp.eventId),
  };

  return (
    <div className="min-h-screen bg-black">
      <main className="max-w-5xl mx-auto w-full px-4 pt-3 pb-4">
        <header className="mb-5 border-b border-white/[0.08] pb-4">
          <AppBackLink href={`/${outletSlug}`} label="Back to venue" className="mb-3" />
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Book a table</h1>
          <p className="text-sm text-stone-500 mt-1">{activeBrand.shortName}</p>
        </header>
        <ReservationForm brand={activeBrand} prefill={prefill} />
      </main>
    </div>
  );
}
