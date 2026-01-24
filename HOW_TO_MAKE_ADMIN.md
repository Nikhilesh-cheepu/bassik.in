# How to Make a User an Admin - Quick Guide

## 🎯 Step-by-Step Instructions

### Step 1: Go to Clerk Dashboard
1. Open https://dashboard.clerk.com
2. Sign in to your Clerk account
3. Select your **Bassik.in** application

### Step 2: Find the User
1. Click on **"Users"** in the left sidebar
2. You'll see a list of all users who have signed up
3. Find the user you want to make admin (search by email if needed)
4. **Click on the user** to open their profile

### Step 3: Add Admin Role
1. In the user profile, click on the **"Metadata"** tab (at the top)
2. You'll see two sections:
   - **Public Metadata** (visible to your app)
   - **Private Metadata** (only visible to Clerk)
3. Click **"Edit"** button in the **Public Metadata** section
4. You'll see a JSON editor

### Step 4: Add Role
In the JSON editor, add this:

```json
{
  "role": "admin"
}
```

Or for **main admin** (full access to all venues):

```json
{
  "role": "main_admin"
}
```

### Step 5: Save
1. Click **"Save"** button
2. Done! ✅

## 🎉 That's It!

The user can now:
- Access `/admin` routes
- See "Admin" link in the Navbar
- Manage venues, bookings, etc.

## 📝 Quick Reference

**For Regular Admin:**
```json
{"role": "admin"}
```

**For Main Admin (Full Access):**
```json
{"role": "main_admin"}
```

## 🔍 How to Verify

1. Ask the user to sign in at `yourdomain.com/admin`
2. They should be redirected to `/admin/dashboard` (not home page)
3. They should see "Admin" link in the Navbar

## ⚠️ Important Notes

- **Public Metadata** is what your app reads to check roles
- **Private Metadata** won't work for role checking
- Changes take effect immediately (user may need to refresh)
- You can change or remove the role anytime by editing the metadata

---

**Need to remove admin access?** Just delete the `role` field from Public Metadata or set it to an empty object `{}`.
