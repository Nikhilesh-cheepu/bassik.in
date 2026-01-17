# DATABASE_URL Format Issue - Fix Guide

## Common Issues with Railway DATABASE_URL

### Issue 1: Special Characters in Password
If your Railway password has special characters, they need to be URL-encoded:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `&` becomes `%26`
- etc.

### Issue 2: Using DATABASE_PUBLIC_URL Instead
Railway provides two URLs:
- `DATABASE_URL` - Internal connection (for Railway services)
- `DATABASE_PUBLIC_URL` - External connection (for local development)

**For local development, use `DATABASE_PUBLIC_URL` instead!**

## Quick Fix Steps:

1. In Railway Variables tab, look for **`DATABASE_PUBLIC_URL`**
2. Copy that instead of `DATABASE_URL`
3. Replace in your `.env` file

OR

If `DATABASE_PUBLIC_URL` doesn't exist or doesn't work:

1. Use `DATABASE_URL` but make sure:
   - It's wrapped in quotes: `"postgresql://..."`
   - Password is URL-encoded if it has special characters
   - No extra spaces or line breaks

## Example Format:

```env
DATABASE_URL="postgresql://postgres:password123@containers-us-west-xxx.railway.app:5432/railway"
```

If password has special chars:
```env
DATABASE_URL="postgresql://postgres:pass%40word%23@containers-us-west-xxx.railway.app:5432/railway"
```
