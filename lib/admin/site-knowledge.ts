import { BRANDS, HIDDEN_BRAND_IDS } from "@/lib/brands";

/**
 * Marketing-style offer lines shown on the public homepage accordion.
 * Keep aligned with `getOffersCopy` in `components/HomeTrail.tsx`.
 */
function offerBulletsForBrand(brandId: string): string[] {
  switch (brandId) {
    case "alehouse":
    case "c53":
    case "boiler-room":
      return [
        "Eat & Drink @ ₹127 (12PM – 7PM)",
        "15% flat discount on à la carte (12PM – 10PM)",
      ];
    case "kiik69":
      return [
        "Eat & Drink @ ₹128 (12PM – 8PM)",
        "10% Flat Discount (12PM – 10PM)",
      ];
    case "skyhy":
      return [
        "Eat & Drink @ ₹128 (12PM – 8PM)",
        "15% flat discount on à la carte (12PM – 10PM)",
      ];
    case "sound-of-soul":
      return [
        "15% flat discount on à la carte (12PM – 10PM)",
        "Live music nights & events",
      ];
    case "firefly":
      return [
        "Menu items starting from ₹75",
        "Telugu club nights with a low-rate menu",
      ];
    case "club-rogue-gachibowli":
    case "club-rogue-kondapur":
    case "club-rogue-jubilee-hills":
      return [
        "Premium club nights & parties",
        "Cover, tables & packages vary by day",
      ];
    default:
      return [
        "Curated experiences at this venue",
        "Check menu & events before you book",
      ];
  }
}

/**
 * Text snapshot of public product + venue list for the admin assistant.
 * Does not include secrets, live DB counts, or per-venue CMS-only content.
 */
export function getSiteKnowledgeForAssistant(): string {
  const sections: string[] = [];

  sections.push(`# Bassik.in — staff assistant context (codebase snapshot)`);
  sections.push("");
  sections.push(`## What Bassik is`);
  sections.push(
    `- Multi-outlet table reservations for Hyderabad: clubs, lounges, sports bars, dining.`
  );
  sections.push(
    `- Positioning: "Book Direct. Unlock Website-Only Deals" — better savings than Swiggy/Zomato, limited slots, instant booking.`
  );
  sections.push(
    `- Homepage ticker themes: Eat & Drink @ ₹127/₹128, flat discounts, limited slots, website-only offers.`
  );
  sections.push(
    `- Promo blocks mention: unlimited-style happy-hour style value at selected venues, flat 25–30% style website-only framing, experiences (DJs, screenings, parties).`
  );
  sections.push("");

  sections.push(`## Public URLs (Next.js app)`);
  sections.push(`- \`/\` — Landing: outlet directory, links to each venue.`);
  sections.push(
    `- \`/{outletSlug}\` — Venue hub: offers, gallery, menus (from admin), location, WhatsApp / call CTAs. Slug matches venue \`id\` in config.`
  );
  sections.push(
    `- \`/{outletSlug}/book\` — Booking form for that outlet.`
  );
  sections.push(`- \`/reservations?brand={id}\` — Redirects to \`/{id}/book\`.`);
  sections.push(`- \`/my-bookings\` — Guests look up bookings (e.g. by reference).`);
  sections.push("");

  sections.push(`## Admin (internal)`);
  sections.push(
    `- Dashboard: venue count, booking stats (live data — tell user to open Dashboard/Bookings for numbers).`
  );
  sections.push(
    `- Venues: edit menus, gallery, offers, discounts, images (stored via uploads / blob).`
  );
  sections.push(`- Bookings: list and manage reservation requests.`);
  sections.push(
    `- Automations: import contacts from Excel/PDF/images, map columns, optional WhatsApp via Twilio.`
  );
  sections.push("");

  sections.push(`## Venues configured in code (\`lib/brands.ts\`)`);
  for (const b of BRANDS) {
    const hidden = HIDDEN_BRAND_IDS.has(b.id);
    const visibility = hidden
      ? "Hidden from default homepage outlet list (still reachable by URL if linked)."
      : "Shown on public homepage directory.";
    const lines = [
      `### ${b.name} (\`${b.id}\`)`,
      `- ${visibility}`,
      `- Short description: ${b.description ?? "—"}`,
      `- Tag / vibe: ${b.tag ?? "—"}`,
    ];
    const offers = offerBulletsForBrand(b.id);
    if (offers.length) {
      lines.push(`- Homepage-style offer bullets: ${offers.join("; ")}`);
    }
    if (b.websiteUrl && b.websiteUrl !== "#") {
      lines.push(`- Official / external site (if set): ${b.websiteUrl}`);
    }
    if (b.instagramUrls?.length) {
      lines.push(`- Instagram: ${b.instagramUrls.join(", ")}`);
    }
    sections.push(lines.join("\n"));
    sections.push("");
  }

  sections.push(`## Limits of this context`);
  sections.push(
    `- Live menus, gallery images, admin-uploaded offers, and today's availability are NOT fully listed here — they live in the database/CMS.`
  );
  sections.push(
    `- For exact policies, prices, or event nights, prefer what is shown on the live site or what staff confirms.`
  );
  sections.push(
    `- When unsure, say you need the live admin panel or the public venue page.`
  );

  return sections.join("\n");
}
