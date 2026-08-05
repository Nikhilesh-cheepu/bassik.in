import type { Metadata } from "next";
import AgencyHome from "@/components/agency/AgencyHome";
import HomeTrail from "@/components/HomeTrail";
import { AGENCY_SEO } from "@/lib/bassik-agency";
import { getHomeFeedEvents } from "@/lib/home-events-feed";
import { getHomeReviewsFeed } from "@/lib/home-reviews";
import { isPublicVenueBookingLive } from "@/lib/site-mode";

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  if (isPublicVenueBookingLive()) {
    return {
      title: "Bassik Reservations",
      description: "Book your table at any of our venues in one place.",
    };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://bassik.in";

  return {
    title: AGENCY_SEO.title,
    description: AGENCY_SEO.description,
    keywords: [...AGENCY_SEO.keywords],
    alternates: { canonical: base },
    openGraph: {
      type: "website",
      url: base,
      siteName: "Bassik",
      title: AGENCY_SEO.title,
      description: AGENCY_SEO.description,
      images: [{ url: `${base}/logos/bassik.png`, alt: "Bassik" }],
    },
    twitter: {
      card: "summary_large_image",
      title: AGENCY_SEO.title,
      description: AGENCY_SEO.description,
      images: [`${base}/logos/bassik.png`],
    },
    robots: { index: true, follow: true },
  };
}

export default async function LandingPage() {
  if (!isPublicVenueBookingLive()) {
    const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://bassik.in";
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${base}/#organization`,
          name: "Bassik",
          url: base,
          logo: `${base}/logos/bassik.png`,
          description: AGENCY_SEO.description,
          areaServed: "IN",
          sameAs: [],
        },
        {
          "@type": "ProfessionalService",
          "@id": `${base}/#agency`,
          name: "Bassik Digital Marketing Agency",
          url: base,
          image: `${base}/logos/bassik.png`,
          description: AGENCY_SEO.description,
          priceRange: "₹30000-₹150000",
          areaServed: {
            "@type": "City",
            name: "Hyderabad",
          },
          serviceType: [
            "360 degree marketing",
            "Lead generation",
            "Lead conversion",
            "Brand storytelling",
            "Content shoot and reels",
            "Social media management",
          ],
          parentOrganization: { "@id": `${base}/#organization` },
        },
        {
          "@type": "WebSite",
          "@id": `${base}/#website`,
          url: base,
          name: "Bassik",
          description: AGENCY_SEO.description,
          publisher: { "@id": `${base}/#organization` },
          inLanguage: "en-IN",
        },
      ],
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AgencyHome />
      </>
    );
  }

  const initialHomeEvents = await getHomeFeedEvents();
  const initialHomeReviews = await getHomeReviewsFeed();
  return (
    <HomeTrail
      initialHomeEvents={initialHomeEvents}
      initialHomeReviews={initialHomeReviews}
    />
  );
}
