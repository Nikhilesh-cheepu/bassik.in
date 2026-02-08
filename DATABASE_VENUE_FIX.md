# Fix: "The column does not exist" / Venue 500 Error

If you see **PrismaClientKnownRequestError** or **500 on `/api/venues/the-hub`** (or any outlet), the database is missing columns that the app expects on the `Venue` table.

## Fix 1: Run migrations (recommended)

**Vercel / production:** The build script runs `prisma migrate deploy` automatically. Ensure **`DATABASE_URL`** is set in your Vercel project (Settings → Environment Variables) for the **Build** environment so migrations apply on every deploy.

**Local** with `DATABASE_URL` in `.env.local`:

```bash
npx prisma migrate deploy
```

This applies all pending migrations and adds `contactPhone`, `coverVideoUrl`, and `contactNumbers` to `Venue`.

## Fix 2: Add columns manually

If you can’t use migrations (e.g. no migration history or different workflow), run this SQL on your Postgres database:

```bash
# From project root, with DATABASE_URL set:
psql "$DATABASE_URL" -f prisma/migrations/MANUAL_VENUE_COLUMNS.sql
```

Or run the contents of `prisma/migrations/MANUAL_VENUE_COLUMNS.sql` in your DB client (Railway, Supabase, etc.). It is safe to run more than once.

After the columns exist, restart your app and the venue API should work.
