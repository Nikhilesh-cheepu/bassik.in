import GrowthSalesDoc from "@/components/agency/GrowthSalesDoc";

/** Public homepage — persona stories + marketing, no pricing. */
export default function AgencyHome() {
  return <GrowthSalesDoc showPrivatePricing={false} />;
}
