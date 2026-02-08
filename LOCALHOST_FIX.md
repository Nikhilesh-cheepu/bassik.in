# Fix localhost errors

Two common issues and how to fix them.

---

## 1. "Server Action ... was not found" / POST /the-hub 404

**Cause:** Next.js Server Action IDs change between restarts when no encryption key is set, so the client sends an old ID and the server can’t find it (often triggered by Clerk on the outlet page).

**Fix (automatic):** Running `npm run dev` now ensures `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is in `.env.local` before starting. If you still see the error:

1. **Stop the dev server** (Ctrl+C).
2. **Clear cache and restart:**
   ```bash
   rm -rf .next && npm run dev
   ```
3. **Hard-refresh the browser** (Ctrl+Shift+R or Cmd+Shift+R) so the page doesn’t use an old cached action ID.

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
