import GrowthSalesDoc from "@/components/agency/GrowthSalesDoc";

/** Public homepage — linear Q / A / voice blocks, no pricing or choices. */
export default function AgencyHome() {
  return <GrowthSalesDoc showPrivatePricing={false} />;
}
