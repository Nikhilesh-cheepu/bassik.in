# Database schema (Bassik.in)

This doc describes the Postgres tables and how they map to the app. Use it to check your database and fix missing columns.

---

## Tables (no separate Video table)

| Table | Purpose |
|-------|--------|
| **Venue** | One row per outlet (The Hub, Alehouse, C53, Firefly, etc.). Includes **cover video** and contact numbers. |
| **VenueImage** | Cover and gallery **images** per venue (`type`: COVER or GALLERY). |
| **Menu** | Menus per venue (e.g. Food Menu, Liquor Menu). |
| **MenuImage** | Images (pages) per menu. |
| **Reservation** | Bookings; linked to Venue and optionally User. |
| **User** | Clerk-linked users (for my-bookings). |
| **Admin** | Legacy admin accounts (Clerk is used for admin auth now). |
| **AdminVenuePermission** | Legacy venue-per-admin (optional). |
| **_prisma_migrations** | Migration history (used by Prisma). |

**Video is not a separate table.** Each venue has **one optional cover video** stored in the **Venue** table as the column **`coverVideoUrl`** (TEXT). So you will not see a “Video” table; that’s correct.

---

## Venue table columns (must all exist)

If `/api/venues/...` returns 500 or “column does not exist”, the **Venue** table is missing columns. It should have:

| Column | Type | Notes |
|--------|------|--------|
| id | TEXT | Primary key (cuid). |
| brandId | TEXT | Unique; matches brand id in code (e.g. `the-hub`, `firefly`, `c53`). |
| name | TEXT | Full name. |
| shortName | TEXT | Display name. |
| address | TEXT | Address. |
| mapUrl | TEXT | Optional Google Maps URL. |
| **contactPhone** | TEXT | Optional single number (legacy). |
| **contactNumbers** | JSONB | Optional array: `[{"phone":"...","label":"..."}]`. |
| **coverVideoUrl** | TEXT | Optional cover video URL (or base64 data URL). **This is the “video” field.** |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |

If any of **contactPhone**, **contactNumbers**, or **coverVideoUrl** are missing, run migrations or the manual SQL below.

---

## How to fix missing Venue columns

**Option A – Migrations (recommended)**  
With `DATABASE_URL` set (e.g. in Vercel or `.env.local`):

```bash
npx prisma migrate deploy
```

The build script already runs this on Vercel deploy.

**Option B – Manual SQL**  
Run this on your Postgres database (Railway, etc.). Safe to run more than once:

```sql
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "coverVideoUrl" TEXT;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "contactNumbers" JSONB;
```

Same content is in `prisma/migrations/MANUAL_VENUE_COLUMNS.sql`.

---

## Venues (outlets) in code

Outlets are defined in `lib/brands.ts` (e.g. the-hub, alehouse, c53, firefly, boiler-room, …). Each has a `brandId`. A row in **Venue** with that `brandId` holds that outlet’s data (address, map, cover image/video, gallery images, menus, contact numbers). If the row or columns are missing, the venue API will fail until the schema is fixed as above.
