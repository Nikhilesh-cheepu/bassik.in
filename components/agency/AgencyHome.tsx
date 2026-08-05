"use client";

import GrowthSalesDoc from "@/components/agency/GrowthSalesDoc";

/** Public homepage — growth story + paths, no exact prices. */
export default function AgencyHome() {
  return <GrowthSalesDoc showPrivatePricing={false} />;
}
