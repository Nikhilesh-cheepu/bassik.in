# Vercel + Squarespace Domain Setup Fix

## Problem Identified

You have a **redirect loop**:
- Vercel: `bassik.in` → redirects (308) to `www.bassik.in`
- Middleware: `www.bassik.in` → redirects (301) to `bassik.in`
- This causes infinite redirects and the flashing issue on mobile

## Solution: Fix Vercel Domain Settings

### Step 1: Change `bassik.in` in Vercel

1. Go to your Vercel project → **Settings** → **Domains**
2. Find `bassik.in` in the list
3. Click **Edit** on `bassik.in`
4. Change from:
   - ❌ **"Redirect to Another Domain"** → `www.bassik.in`
   
   To:
   - ✅ **"Connect to an environment"** → Select **"Production"**

5. Click **Save**

### Step 2: Keep `www.bassik.in` as is

- `www.bassik.in` should stay connected to **Production**
- The middleware will automatically redirect `www.bassik.in` → `bassik.in`

### Step 3: Verify Squarespace DNS

Your Squarespace DNS should have:
- **A Record**: `@` → `216.150.1.1` ✅ (This is correct)
- **CNAME Record**: `www` → `86af89f3d02cc553.vercel-dns-016.com.` ✅ (This is correct)

**No changes needed in Squarespace DNS!**

## After Making Changes

1. **Wait 5-10 minutes** for Vercel to update
2. **Clear mobile browser cache** or use incognito mode
3. Test:
   - `bassik.in` → Should work directly ✅
   - `www.bassik.in` → Should redirect to `bassik.in` ✅

## Expected Behavior After Fix

- `bassik.in` → Works directly (no redirect)
- `www.bassik.in` → Redirects to `bassik.in` (handled by middleware)
- No more flashing/refreshing issues
- Mobile will work correctly

## Why This Fixes Mobile Issues

1. **No redirect loop** = No infinite refreshes
2. **Consistent domain** = Better mobile browser handling
3. **Proper SSL** = Both domains work correctly
4. **Middleware handles www** = Clean redirects

