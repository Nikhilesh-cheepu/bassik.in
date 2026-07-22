# Venue booking soft archive

Public guest booking / outlet marketing is **off by default** so [bassik.in](https://bassik.in) leads as the Bassik digital marketing agency.

## What stays safe

- All Prisma data (venues, events, bookings, reviews, gallery, etc.) remains in the database.
- Outlet and book routes remain in the codebase (`app/[outlet]/*`, reservation APIs, admin).
- The old homepage UI stays in `components/HomeTrail.tsx` and loads again when booking is live.

## Re-enable public venue booking

Set either env var and redeploy:

```bash
VENUE_BOOKING_LIVE=true
# or
NEXT_PUBLIC_VENUE_BOOKING_LIVE=true
```

Then:

1. Homepage switches back to venue explore + events (`HomeTrail`).
2. Outlet / book pages become indexable again.
3. `sitemap.xml` includes public outlet URLs.

## Agency mode (current default)

With the flag unset/false:

- Homepage = `components/agency/AgencyHome.tsx` (premium digital marketing pitch).
- Outlet / book pages: `robots: noindex`.
- Sitemap: homepage only.
- HQ WhatsApp: `BASSIK_HQ_PHONE` or `NEXT_PUBLIC_BASSIK_HQ_PHONE` (defaults to `7013884485`).

Admin (`/admin`) and team (`/team`) are unchanged.

## Related surfaces (also soft-archived for SEO)

When booking is off, these stay reachable but are **noindex**:

- `/{outlet}`, `/{outlet}/book`
- `/{outlet}/chat` (and `/lead` redirect)
- `/my-bookings`, `/{outlet}/my-bookings`
