# Fix localhost errors

Two common issues and how to fix them.

---

## 1. "Server Action ... was not found" / POST /the-hub 404

**Cause:** Next.js Server Action IDs change between restarts when no encryption key is set, so the client sends an old ID and the server can’t find it (often triggered by Clerk on the outlet page).

**Fix:**

1. **Add a stable key to `.env.local`** (one-time):

   ```bash
   echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.local
   ```

   Or generate a key and add it manually:

   ```bash
   openssl rand -base64 32
   ```

   Then add this line to `.env.local`:

   ```env
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=<paste the key here>
   ```

2. **Clear build cache and restart:**

   ```bash
   rm -rf .next && npm run dev
   ```

---

## 2. GET /api/venues/the-hub 500 or 404

**500 – "column does not exist"**  
The `Venue` table is missing columns (`contactPhone`, `coverVideoUrl`, `contactNumbers`).

**Fix:** Run migrations (with `DATABASE_URL` in `.env.local`):

```bash
npx prisma migrate deploy
```

**404 – "Venue not found"**  
The database has no row for that outlet yet.

**Fix:** Create the venue from admin: open the app → sign in as admin → **Manage Venues** → click **The Hub** (or the outlet) → fill **Location** (address + map URL) → **Save**. Then reload the outlet page.

---

## Quick one-time setup (all in one)

```bash
# 1. Add Server Action key (if not already in .env.local)
echo "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.local

# 2. Apply DB migrations
npx prisma migrate deploy

# 3. Clean and start
rm -rf .next && npm run dev
```

Ensure `DATABASE_URL` and Clerk keys are already in `.env.local` (see **ENV_EXAMPLE.md**).
