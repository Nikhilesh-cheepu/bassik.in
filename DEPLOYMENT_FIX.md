# Fix Mobile TLS Error - Deployment Instructions

## Critical: Fix Vercel Domain Settings FIRST

The TLS error on mobile is caused by a **redirect loop** in your Vercel domain configuration.

### Step 1: Fix Vercel Domain Settings

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Domains**
2. Find `bassik.in` in the list
3. Click **Edit** (or the three dots menu)
4. **CHANGE FROM:**
   - ❌ "Redirect to Another Domain" → `www.bassik.in`
   
   **TO:**
   - ✅ "Connect to an environment" → Select **"Production"**
5. Click **Save**
6. Wait 5-10 minutes for Vercel to update

### Step 2: Deploy Latest Code

The latest code fixes are already pushed to GitHub. Vercel should auto-deploy, but if not:

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click **Redeploy** on the latest deployment (or it should auto-deploy from GitHub)
3. Wait for deployment to complete

### Step 3: Test on Mobile

After Vercel updates (5-10 minutes):

1. **Clear mobile browser cache** or use **Incognito/Private mode**
2. Try accessing `bassik.in` on mobile
3. The TLS error should be fixed

## Why This Fixes the TLS Error

- **No redirect loop** = Mobile browsers can establish secure connection
- **HSTS header** = Forces HTTPS and helps mobile browsers trust the connection
- **Simplified middleware** = Doesn't interfere with Vercel's SSL/TLS handling

## If Still Not Working

1. Check Vercel domain status (should show green checkmark)
2. Wait 10-15 minutes for DNS/SSL propagation
3. Try different mobile network (WiFi vs mobile data)
4. Clear mobile browser cache completely

