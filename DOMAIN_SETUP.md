# Domain Setup Guide for bassik.in

## Issues Fixed

1. **www Redirect**: Middleware now automatically redirects `www.bassik.in` to `bassik.in`
2. **Mobile Compatibility**: Added proper headers and redirects for mobile browsers
3. **HTTPS Enforcement**: Automatic HTTPS redirect in production

## DNS Configuration Required

To fix the mobile domain issues, you need to configure your DNS settings:

### Option 1: Redirect www to non-www (Recommended)

**DNS Records Needed:**

1. **A Record** (or CNAME):
   - Name: `@` (or `bassik.in`)
   - Value: Your server IP address (or CNAME target)
   - TTL: 3600

2. **CNAME Record**:
   - Name: `www`
   - Value: `bassik.in` (or your server hostname)
   - TTL: 3600

### Option 2: Point both to same server

1. **A Record for root domain**:
   - Name: `@`
   - Value: Your server IP
   - TTL: 3600

2. **A Record for www**:
   - Name: `www`
   - Value: Same server IP
   - TTL: 3600

## SSL Certificate

Make sure you have SSL certificates for:
- ✅ `bassik.in`
- ✅ `www.bassik.in` (or redirect www to non-www)

If using Vercel/Netlify, they automatically provide SSL for both.

## Deployment Platform Specific

### If using Vercel:

1. Go to your project settings
2. Add both domains:
   - `bassik.in`
   - `www.bassik.in`
3. Vercel will auto-configure SSL and redirects

### If using other platforms:

1. Ensure both domains point to your server
2. Configure SSL for both domains
3. The middleware will handle www → non-www redirect

## Testing

After DNS changes (can take up to 48 hours):

1. Test `bassik.in` on mobile
2. Test `www.bassik.in` (should redirect to `bassik.in`)
3. Clear mobile browser cache if issues persist

## Mobile Browser Cache Issue

If mobile still shows issues after DNS is correct:

1. Clear browser cache on mobile
2. Try incognito/private mode
3. Wait for DNS propagation (up to 48 hours)

