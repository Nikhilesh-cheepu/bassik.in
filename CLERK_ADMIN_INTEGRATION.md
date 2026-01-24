# Clerk Authentication for Admin Pages - Complete

Clerk authentication has been successfully integrated into all admin pages.

## ✅ What's Been Done

### 1. **Admin Layout Protection**
- Created `app/admin/layout.tsx` that requires Clerk authentication
- Redirects unauthenticated users to `/admin` (sign-in page)

### 2. **Admin Login Page**
- Replaced custom login form with Clerk's `<SignIn>` component
- Uses Clerk's built-in authentication UI
- Automatically redirects to `/admin/dashboard` after sign-in

### 3. **Middleware Protection**
- Updated `middleware.ts` to protect all `/admin/*` routes
- Uses `createRouteMatcher` to identify admin routes
- Redirects unauthenticated users to sign-in

### 4. **Admin API Routes Updated**
All admin API routes now use Clerk's `auth()` instead of `verifyAdminToken`:
- ✅ `/api/admin/me` - Returns Clerk user info
- ✅ `/api/admin/bookings` - Protected with Clerk auth
- ✅ `/api/admin/venues` - Protected with Clerk auth
- ✅ `/api/admin/venues/[brandId]/images` - Protected with Clerk auth
- ✅ `/api/admin/venues/[brandId]/menus` - Protected with Clerk auth
- ✅ `/api/admin/admins` - Protected with Clerk auth
- ✅ `/api/admin/upload` - Protected with Clerk auth

### 5. **Admin Dashboard Pages Updated**
All admin pages now use Clerk's `useUser()` hook:
- ✅ `/admin/dashboard` - Uses `useUser()` and `SignOutButton`
- ✅ `/admin/dashboard/bookings` - Uses `useUser()` and `SignOutButton`
- ✅ `/admin/dashboard/venues` - Uses `useUser()` and `SignOutButton`
- ✅ `/admin/dashboard/admins` - Uses `useUser()` and `SignOutButton`

### 6. **Components Updated**
- `VenueEditor` - Admin prop made optional (can be `null`)

## 🔑 Required Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_SECRET_KEY
```

Get your keys from: https://dashboard.clerk.com/last-active?path=api-keys

## 🚀 How It Works

1. **User visits `/admin`** → Clerk SignIn component is shown
2. **User signs in** → Clerk authenticates and redirects to `/admin/dashboard`
3. **All `/admin/*` routes** → Protected by middleware and layout
4. **API calls** → Check Clerk `auth()` for `userId`
5. **Logout** → Uses Clerk's `SignOutButton` component

## 📝 Notes

- **Old admin auth system** (`lib/admin-auth.ts`) is still present but not used by admin pages
- **Role-based permissions** are currently disabled - all authenticated Clerk users have full access
- **To add role-based permissions later**: Use Clerk's metadata feature to store roles/permissions per user
- **Build will fail** until Clerk keys are added to `.env.local` (expected behavior)

## 🔄 Migration Notes

The old system used:
- JWT tokens in cookies (`admin-token`)
- Hardcoded admin credentials
- Role-based venue permissions

The new system uses:
- Clerk session management
- Email/password or social auth (configurable in Clerk Dashboard)
- All authenticated users have admin access (can be restricted later with Clerk metadata)

## 🎯 Next Steps (Optional)

1. **Add role-based permissions**:
   - Use Clerk's user metadata to store roles
   - Check metadata in API routes and pages
   - Example: `user.publicMetadata.role === "MAIN_ADMIN"`

2. **Configure sign-up**:
   - In Clerk Dashboard, control who can sign up
   - Or disable sign-up and manually invite users

3. **Customize Clerk UI**:
   - Use Clerk's appearance customization
   - Match your brand colors
