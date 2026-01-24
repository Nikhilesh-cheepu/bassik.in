# Clerk Webhook Setup for Vercel - Step by Step Guide

## 🎯 What is a Webhook?

A webhook is like a **phone call from Clerk to your server**. When a user signs up in Clerk, Clerk automatically calls your server to sync the user data to your database.

**You DON'T need webhooks for reservations to work!** Webhooks are only for automatically syncing user data to your database. Reservations will work fine without them.

## 📋 When Do You Need Webhooks?

**YES, if you want:**
- Users automatically created in your database when they sign up
- Booking history linked to users automatically
- User profiles with past bookings

**NO, if:**
- You only need reservations to work (they work without webhooks)
- You don't need user data in your database
- You're okay with users being created manually or on first booking

## 🚀 How to Set Up Webhook on Vercel (Optional)

### Step 1: Deploy Your App to Vercel

1. Make sure your app is deployed to Vercel
2. Get your Vercel deployment URL (e.g., `https://bassik.in`)

### Step 2: Go to Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Select your **Bassik.in** application
3. Click on **"Webhooks"** in the left sidebar

### Step 3: Create Webhook Endpoint

1. Click **"+ Add Endpoint"** button
2. Enter your webhook URL:
   ```
   https://bassik.in/api/webhooks/clerk
   ```
   (Replace `bassik.in` with your actual domain)

### Step 4: Select Events

Select these events:
- ✅ `user.created` - When a new user signs up
- ✅ `user.updated` - When user info is updated
- ✅ `user.deleted` - When a user is deleted

### Step 5: Copy Webhook Secret

1. After creating the endpoint, Clerk will show a **"Signing Secret"**
2. It starts with `whsec_...`
3. **Copy this secret** - you'll need it in the next step

### Step 6: Add Secret to Vercel

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Click **"Add New"**
4. Add:
   - **Name:** `CLERK_WEBHOOK_SECRET`
   - **Value:** Paste the `whsec_...` secret you copied
   - **Environment:** Production (and Preview if you want)
5. Click **"Save"**

### Step 7: Redeploy

1. Go to **Deployments** tab in Vercel
2. Click **"Redeploy"** on your latest deployment
3. This will pick up the new environment variable

## ✅ Done!

Now when users sign up:
1. User signs up in Clerk ✅
2. Clerk sends webhook to your server ✅
3. Your server creates user in database ✅
4. User data is synced automatically ✅

## 🔍 How to Test

1. Sign up a new user on your site
2. Check your database - user should be created automatically
3. Check Vercel logs for webhook calls

## ⚠️ Important Notes

- **Webhooks are OPTIONAL** - Reservations work without them
- **Webhooks only sync user data** - They don't affect booking functionality
- **If webhook fails**, users can still sign up and make bookings
- **The 500 error is NOT because of missing webhooks** - It's a database/API issue

## 🐛 Troubleshooting

**Webhook not working?**
- Check Vercel logs for errors
- Verify `CLERK_WEBHOOK_SECRET` is set correctly
- Make sure your app is deployed and accessible
- Check Clerk Dashboard → Webhooks → See delivery logs

**Reservations still failing?**
- This is NOT a webhook issue
- Check if database migration is run: `npm run db:migrate`
- Check server logs for actual error
- The error is likely in the reservation API, not webhooks

---

**TL;DR:** Webhooks are optional for syncing users. They don't affect reservations. Your 500 error is likely a database migration issue, not a webhook issue.
