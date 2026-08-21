import type { Metadata } from "next";
import GrowLeadLanding from "@/components/agency/GrowLeadLanding";
import { GROW_SEO } from "@/lib/bassik-agency";

export const metadata: Metadata = {
  title: GROW_SEO.title,
  description: GROW_SEO.description,
  openGraph: {
    title: GROW_SEO.title,
    description: GROW_SEO.description,
  },
  twitter: {
    card: "summary_large_image",
    title: GROW_SEO.title,
    description: GROW_SEO.description,
  },
  robots: { index: true, follow: true },
};

/** Meta / ads lead landing — empathy → capture → WhatsApp. */
export default function GrowPage() {
  return <GrowLeadLanding />;
}
