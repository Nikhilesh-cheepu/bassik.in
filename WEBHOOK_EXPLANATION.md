# What is a Webhook? (Simple Explanation)

## 🤔 What is a Webhook?

Think of a webhook like a **phone call notification**:

- **Normal API**: You call Clerk and ask "Do I have any new users?" (you have to keep asking)
- **Webhook**: Clerk calls YOU automatically when a new user signs up (you get notified instantly)

## 🎯 Why Use Webhooks for Clerk?

When a user signs up in Clerk, Clerk knows about them, but **your database doesn't automatically know**.

**Without Webhook:**
- User signs up in Clerk ✅
- Your database doesn't know about them ❌
- You have to manually check Clerk every time

**With Webhook:**
- User signs up in Clerk ✅
- Clerk **automatically calls your server** ✅
- Your database creates the user record instantly ✅

## 🔧 How It Works

1. **User signs up** on your site using Clerk
2. **Clerk sends webhook** to your server: "Hey! New user created!"
3. **Your server receives it** and creates user in your database
4. **Done!** User data is now synced

## 📝 Do You Need It?

**YES, if you want:**
- Users automatically created in your database when they sign up
- Booking history linked to users
- User profiles with past bookings

**NO, if:**
- You only use Clerk for authentication (login/logout)
- You don't need to store user data in your database

## 🚀 For Your Use Case

Since you want to:
- Store user data in database ✅
- Link bookings to users ✅
- Show booking history ✅

**You SHOULD set up the webhook!** It's already created in the code - you just need to configure it in Clerk Dashboard.

## ⚙️ Setup Steps (After Code is Ready)

1. Deploy your app (so Clerk can reach your webhook URL)
2. Go to Clerk Dashboard → **Webhooks**
3. Add webhook endpoint: `https://yourdomain.com/api/webhooks/clerk`
4. Select events: `user.created`, `user.updated`
5. Copy the webhook secret to your `.env.local`
6. Done! Users will auto-sync to your database

---

**TL;DR:** Webhook = Clerk automatically tells your database when users sign up. You need it for storing user data and booking history.
