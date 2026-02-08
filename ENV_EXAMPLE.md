# Environment Variables Template

This file shows all required environment variables for the Bassik.in application.

## Required Variables

### Database
```env
DATABASE_URL="postgresql://postgres:password@hostname:port/railway"
```
Get this from Railway → PostgreSQL → Variables → DATABASE_URL

### NextAuth (Optional - for legacy admin auth)
```env
NEXTAUTH_SECRET="your-nextauth-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Admin Credentials (Optional - for legacy admin auth)
```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="changeme123"
ADMIN_ROLE="MAIN_ADMIN"
```

### Clerk Authentication (REQUIRED for admin pages)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_SECRET_KEY
```

**Get your Clerk keys from:** https://dashboard.clerk.com/last-active?path=api-keys

### Next.js Server Actions (fixes "Server Action not found" / UnrecognizedActionError)
```env
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=your-base64-key
```
Generate a key: `openssl rand -base64 32`  
Add the output to `.env.local` so Server Action IDs stay consistent across restarts and builds.

**Localhost issues?** See **LOCALHOST_FIX.md** for "Server Action not found" and venue API 500/404.

## Quick Setup

1. Copy your `.env.local` file
2. Replace `YOUR_PUBLISHABLE_KEY` with your Clerk Publishable Key
3. Replace `YOUR_SECRET_KEY` with your Clerk Secret Key
4. Save the file
5. Restart your dev server: `npm run dev`

## Notes

- `.env.local` is gitignored (never commit real keys)
- Clerk keys are required for admin pages to work
- The build will fail until Clerk keys are added (expected behavior)
