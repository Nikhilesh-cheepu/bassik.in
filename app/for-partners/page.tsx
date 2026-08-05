import type { Metadata } from "next";
import GrowthSalesDoc from "@/components/agency/GrowthSalesDoc";

export const metadata: Metadata = {
  title: "Bassik · Partner discussion",
  description: "Confidential growth partnership overview for Bassik discussions.",
  robots: { index: false, follow: false, nocache: true },
};

/** Unlisted sales document — send after WhatsApp/call. Not linked from public nav. */
export default function ForPartnersPage() {
  return <GrowthSalesDoc showPrivatePricing />;
}
