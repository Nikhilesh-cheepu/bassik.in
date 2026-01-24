# Clerk User Management - Step by Step Guide

## 🎯 Overview

This guide shows you exactly how to create **normal users** and **admin users in Clerk for your Bassik.in application.

---

## 👥 Part 1: Creating Normal Users (Public Site)

### Step 1: Enable Sign-Up in Clerk Dashboard

1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **"User & Authentication"** → **"Email, Phone, Username"**
4. Make sure **"Allow users to sign up"** is **enabled** ✅
5. Choose authentication methods:
   - ✅ **Email** (recommended)
   - ✅ **Google** (optional - for social login)
   - ✅ **Phone** (optional)

### Step 2: Users Can Now Sign Up

Normal users can now:
- Visit your site at `localhost:3000` (or your domain)
- Click **"Sign Up"** button in the Navbar
- Create an account with email/password
- Sign in anytime with **"Sign In"** button

**That's it!** Normal users are automatically created when they sign up.

---

## 🔐 Part 2: Creating Admin Users

### Method 1: Mark Existing User as Admin (Recommended)

**Step 1:** User signs up normally via your public site
- They create account using "Sign Up" button
- They're a normal user by default

**Step 2:** Mark them as admin in Clerk Dashboard

1. Go to Clerk Dashboard → **"Users"** tab
2. Find the user you want to make admin (search by email)
3. Click on the user to open their profile
4. Go to **"Metadata"** tab
5. In **"Public Metadata"** section, click **"Edit"**
6. Add this JSON:
   ```json
   {
     "role": "admin"
   }
   ```
   Or for main admin (full access):
   ```json
   {
     "role": "main_admin"
   }
   ```
7. Click **"Save"**

**Done!** That user can now access `/admin/*` routes.

### Method 2: Create Admin User Directly in Clerk

**Step 1:** Create user in Clerk Dashboard

1. Go to Clerk Dashboard → **"Users"** tab
2. Click **"+ Add User"** button
3. Enter:
   - **Email address** (required)
   - **First name** (optional)
   - **Last name** (optional)
4. Click **"Create User"**
5. Clerk will send an invitation email to the user

**Step 2:** Set admin metadata immediately

1. Right after creating, the user profile opens
2. Go to **"Metadata"** tab
3. In **"Public Metadata"**, add:
   ```json
   {
     "role": "admin"
   }
   ```
4. Click **"Save"**

**Step 3:** User completes sign-up

- User receives email invitation
- Clicks link to set password
- Can now sign in at `/admin`

### Method 3: Invite Admin User

1. Go to Clerk Dashboard → **"Users"** → **"Invitations"** tab
2. Click **"+ Send Invitation"**
3. Enter admin email address
4. Click **"Send Invitation"**
5. After user signs up, add admin metadata (see Method 1, Step 2)

---

## 🎨 What Users See

### Normal Users:
- **Navbar shows:** "Sign In" and "Sign Up" buttons
- **After sign-in:** Shows their profile avatar (UserButton)
- **Can access:** Public pages, make reservations
- **Cannot access:** `/admin/*` routes (redirected to home)

### Admin Users:
- **Navbar shows:** Same as normal users (Sign In/Sign Up)
- **After sign-in:** Can access `/admin` → Clerk SignIn page
- **After admin sign-in:** Can access all `/admin/*` routes
- **Admin dashboard:** Full access to manage venues, bookings, etc.

---

## 🔧 How It Works in Code

### Normal User Flow:
```
User visits site → Clicks "Sign Up" → Creates account → Can use public features
```

### Admin User Flow:
```
User signs up → You add role="admin" in Clerk → User can access /admin routes
```

### Code Checks:
- **Middleware** checks: `user.publicMetadata.role === "admin" || "main_admin"`
- **API routes** check: Same role check before allowing admin operations
- **Normal users** without admin role: Redirected away from `/admin/*`

---

## 📝 Quick Reference

### To Create Normal User:
1. User clicks "Sign Up" on your site
2. Done! ✅

### To Create Admin User:
1. User signs up (or you create them in Clerk Dashboard)
2. Go to Clerk Dashboard → Users → Find user → Metadata tab
3. Add `{"role": "admin"}` to Public Metadata
4. Save ✅

### To Check if User is Admin:
- In Clerk Dashboard: Look at user's Metadata tab
- In code: `user.publicMetadata.role === "admin"` or `"main_admin"`

---

## 🚀 Next Steps

1. **Test normal user sign-up:**
   - Visit your site
   - Click "Sign Up" in Navbar
   - Create an account
   - Verify you can sign in/out

2. **Create your first admin:**
   - Sign up as normal user
   - Go to Clerk Dashboard → Users
   - Find your user → Add `{"role": "admin"}` to metadata
   - Try accessing `/admin` → Should work!

3. **Test admin access:**
   - Sign in at `/admin`
   - Should see admin dashboard
   - Normal users (without admin role) will be redirected

---

## ⚠️ Important Notes

- **Normal users** can sign up automatically (if enabled in Clerk Dashboard)
- **Admin users** must have `role: "admin"` or `role: "main_admin"` in Public Metadata
- **Public Metadata** is visible to your app, safe for role storage
- **Private Metadata** is only visible to Clerk (use for sensitive data)
- You can change a user's role anytime in Clerk Dashboard

---

## 🎯 Example: Creating Your First Admin

1. **Sign up on your site:**
   - Go to `localhost:3000`
   - Click "Sign Up"
   - Use your email: `admin@bassik.in`
   - Create password
   - Sign in

2. **Make yourself admin:**
   - Go to https://dashboard.clerk.com
   - Users → Find `admin@bassik.in`
   - Click user → Metadata tab
   - Public Metadata → Edit
   - Add: `{"role": "main_admin"}`
   - Save

3. **Test admin access:**
   - Go to `localhost:3000/admin`
   - Sign in with your account
   - You should see the admin dashboard! ✅

---

That's it! You now know how to create both normal and admin users in Clerk. 🎉
