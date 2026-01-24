# Database Migration Setup - Link Reservations to Clerk Users

## 🎯 What This Does

This migration creates the `User` table and links reservations to Clerk users, so you can:
- ✅ Track which user made each reservation
- ✅ Show booking history per user
- ✅ Link Clerk authentication to your database

## 📋 Current Status

**The setup is already correct in code:**
- ✅ Schema has `User` model (uses Clerk user ID)
- ✅ `Reservation` model has `userId` field
- ✅ Reservation API syncs Clerk users to database automatically
- ✅ Webhook exists to auto-sync users when they sign up

**What's missing:**
- ❌ Database migration hasn't been run yet
- ❌ `User` table doesn't exist in database (that's why you see the error)
- ❌ `userId` column doesn't exist in `Reservation` table

**The error you're seeing:**
```
The table 'public.User' does not exist in the current database.
```

This is because the migration hasn't been run! The code is ready, we just need to create the tables.

## 🚀 How to Fix (Run Migration)

### Option 1: Local Development (Recommended First)

1. **Make sure your `.env.local` has the correct `DATABASE_URL`:**
   ```bash
   DATABASE_URL="your-postgresql-connection-string"
   ```

2. **Generate Prisma Client (to sync with schema):**
   ```bash
   npm run db:generate
   ```

3. **Create and run the migration:**
   ```bash
   npm run db:migrate
   ```
   - This will create a new migration file for the `User` table
   - It will ask for a migration name (e.g., "add_user_table")
   - It will apply the migration to your database

4. **Verify it worked:**
   ```bash
   npm run db:studio
   ```
   - This opens Prisma Studio
   - You should see `User` table and `Reservation` table with `userId` column

### Option 2: Production (Vercel/Railway)

**For Vercel:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Make sure `DATABASE_URL` is set correctly
3. In Vercel, you can't run migrations directly, so you have two options:

   **Option A: Run migration locally pointing to production DB**
   ```bash
   # Temporarily set DATABASE_URL to production
   export DATABASE_URL="your-production-database-url"
   npm run db:migrate
   ```

   **Option B: Use Prisma Migrate Deploy (for production)**
   ```bash
   # The script is already added to package.json
   # Set DATABASE_URL to production database
   export DATABASE_URL="your-production-database-url"
   
   # Run production migration (doesn't create new migration, just applies existing ones)
   npm run db:migrate:deploy
   ```

**For Railway:**
1. Railway usually runs migrations automatically if you have a `postinstall` script
2. Check Railway logs to see if migration ran
3. If not, SSH into Railway or use Railway CLI to run:
   ```bash
   npx prisma migrate deploy
   ```

## ✅ After Migration

Once migration is complete:

1. **New reservations will automatically:**
   - Sync Clerk user to `User` table
   - Link reservation to user via `userId`

2. **Existing reservations:**
   - Will have `userId = null` (they were created before migration)
   - New reservations will be properly linked

3. **User booking history will work:**
   - `/my-bookings` page will show user's reservations
   - `/api/my-bookings` API will filter by `userId`

## 🔍 Verify It's Working

1. **Check database:**
   ```bash
   npm run db:studio
   ```
   - Look for `User` table
   - Look for `userId` column in `Reservation` table

2. **Make a test reservation:**
   - Sign in with Clerk
   - Make a reservation
   - Check database: reservation should have `userId` set

3. **Check logs:**
   - In Vercel logs, you should see: `[RESERVATION API] User synced to database: ...`
   - No more "User table not found" warnings

## 🐛 Troubleshooting

**Error: "Table 'User' does not exist"**
- ✅ Migration hasn't been run → Run `npm run db:migrate`

**Error: "Unknown field 'userId'"**
- ✅ Migration hasn't been run → Run `npm run db:migrate`

**Error: "Database connection failed"**
- ✅ Check `DATABASE_URL` in `.env.local`
- ✅ Make sure database is accessible

**Reservations work but userId is null:**
- ✅ This is expected for reservations created before migration
- ✅ New reservations will have userId set

## 📝 Summary

**The code is ready!** You just need to run the database migration to create the `User` table and add `userId` to `Reservation` table.

**Command:**
```bash
npm run db:migrate
```

After that, all new reservations will be automatically linked to Clerk users! 🎉
