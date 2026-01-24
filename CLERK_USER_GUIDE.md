# Clerk User Management Guide

## 📋 Overview

This guide explains how to create and manage both **normal users** and **admin users** in Clerk for your Bassik.in application.

---

## 👥 Creating Normal Users (Public Site)

### Option 1: Self-Sign-Up (Recommended for Public Users)

1. **Enable Sign-Up in Clerk Dashboard:**
   - Go to https://dashboard.clerk.com
   - Navigate to **User & Authentication** → **Email, Phone, Username**
   - Enable **"Allow users to sign up"**
   - Choose authentication methods (Email, Google, etc.)

2. **Add Sign-In/Sign-Up to Your Navbar:**
   - The Navbar will show Clerk's `<SignInButton>` and `<SignUpButton>` components
   - Users can click these to create accounts or sign in

3. **Users Can Now:**
   - Sign up with email/password
   - Sign in with social providers (if enabled)
   - Access user-specific features (when you add them)

### Option 2: Manual User Creation (Clerk Dashboard)

1. Go to Clerk Dashboard → **Users**
2. Click **"+ Add User"**
3. Enter email address
4. Click **"Create User"**
5. Clerk will send an invitation email

---

## 🔐 Creating Admin Users

### Method 1: Mark Existing Users as Admin (Recommended)

1. **User Signs Up Normally:**
   - User creates account via public sign-up
   - They're a normal user by default

2. **Mark as Admin in Clerk Dashboard:**
   - Go to Clerk Dashboard → **Users**
   - Find the user you want to make admin
   - Click on the user
   - Go to **"Metadata"** tab
   - Add to **Public Metadata**:
     ```json
     {
       "role": "admin"
     }
     ```
   - Or for main admin:
     ```json
     {
       "role": "main_admin"
     }
     ```
   - Click **"Save"**

### Method 2: Create Admin User Directly

1. **Create User in Clerk Dashboard:**
   - Go to **Users** → **"+ Add User"**
   - Enter email and create user

2. **Set Admin Metadata:**
   - Immediately after creation, go to user's **Metadata** tab
   - Add `role: "admin"` or `role: "main_admin"` to Public Metadata

### Method 3: Invite Admin Users

1. Go to Clerk Dashboard → **Users** → **Invitations**
2. Enter admin email address
3. Send invitation
4. After they sign up, add admin metadata (see Method 1, step 2)

---

## 🎯 How to Differentiate Admin vs Normal Users in Code

### Check User Role in Server Components/API Routes:

```typescript
import { auth, currentUser } from "@clerk/nextjs/server";

// In API route or server component
const { userId } = await auth();
if (!userId) {
  // Not authenticated
}

const user = await currentUser();
const role = user?.publicMetadata?.role as string;

if (role === "admin" || role === "main_admin") {
  // User is admin
} else {
  // User is normal user
}
```

### Check User Role in Client Components:

```typescript
import { useUser } from "@clerk/nextjs";

const { user } = useUser();
const role = user?.publicMetadata?.role as string;

if (role === "admin" || role === "main_admin") {
  // User is admin
}
```

---

## 🔧 Updating Your Code to Use Admin Roles

### 1. Update Admin API Routes to Check Role:

```typescript
// Example: app/api/admin/bookings/route.ts
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string;
  
  // Only admins can access
  if (role !== "admin" && role !== "main_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Continue with admin logic...
}
```

### 2. Update Middleware to Check Admin Role:

```typescript
// In middleware.ts
if (isAdminRoute(request) && pathname !== "/admin") {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const user = await currentUser();
  const role = user?.publicMetadata?.role as string;
  
  // Only admins can access admin routes
  if (role !== "admin" && role !== "main_admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
```

---

## 📝 Quick Reference

### Normal User Flow:
1. User visits your site
2. Clicks "Sign Up" in Navbar
3. Creates account with Clerk
4. Can access public features
5. Cannot access `/admin/*` routes

### Admin User Flow:
1. User signs up normally OR you create them in Clerk Dashboard
2. You add `role: "admin"` to their Public Metadata in Clerk Dashboard
3. User can now access `/admin/*` routes
4. Admin features are available

---

## 🎨 Adding Sign-In/Sign-Up to Navbar

I'll add Clerk sign-in/sign-up buttons to your Navbar so normal users can create accounts. Would you like me to do that now?
