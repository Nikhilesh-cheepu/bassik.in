# 🚀 Vercel Deployment Guide

## 📋 Environment Variables for Vercel

Add these environment variables in your Vercel project settings:

### 🔐 Required Variables (MUST ADD)

```env
# Database Connection (Railway PostgreSQL)
DATABASE_URL="postgresql://postgres:password@hostname:port/railway"
# ⚠️ Use your Railway DATABASE_URL (same as local)

# Authentication Secret
NEXTAUTH_SECRET="your-production-secret-key-here"
# ⚠️ Generate a new random secret for production (see below)

# Application URL
NEXTAUTH_URL="https://bassik.in"
# ⚠️ Your custom domain
```

### 📝 Optional Variables (For Reference Only)

These are stored in the database, but you can keep them for reference:

```env
# Main Admin (Reference Only - actual admin is in database)
MAIN_ADMIN_USERNAME="admin"
MAIN_ADMIN_PASSWORD="changeme123"

# Outlet Admins (Reference Only - actual admins are in database)
ALEHOUSE_ADMIN_USERNAME="alehouse_admin"
ALEHOUSE_ADMIN_PASSWORD="alehouse123"
# ... (all other outlet admins)
```

**Note**: The admin credentials above are just for reference. The actual admins are stored in your database, so they'll work the same in production.

## 🔑 How to Get Values

### 1. DATABASE_URL
- Go to Railway dashboard
- Open your PostgreSQL service
- Go to "Variables" tab
- Copy `DATABASE_URL` or `DATABASE_PUBLIC_URL`
- Use the same one you're using locally

### 2. NEXTAUTH_SECRET
Generate a new random secret for production:

```bash
# Run this command locally:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `NEXTAUTH_SECRET` in Vercel.

### 3. NEXTAUTH_URL
- Your custom domain: `https://bassik.in`
- Use this as `NEXTAUTH_URL`
- Make sure your domain is connected in Vercel settings

## 📝 Steps to Deploy

### 1. Push to Git (Already Done ✅)
```bash
git push
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Vercel will auto-detect Next.js

### 3. Add Environment Variables
1. In Vercel project settings
2. Go to "Environment Variables"
3. Add each variable:
   - `DATABASE_URL` (from Railway)
   - `NEXTAUTH_SECRET` (generate new one)
   - `NEXTAUTH_URL` = `https://bassik.in`

### 4. Deploy
- Vercel will automatically deploy
- Wait for build to complete
- Your site will be live!

## ⚠️ Important Notes

### Database Migrations
After deploying, run migrations on production:

```bash
# Connect to your production database
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

Or use Railway's console to run migrations.

### Image Storage
- Images are stored in `/public/uploads/` folder
- **For production**, consider using:
  - **Vercel Blob Storage** (recommended)
  - **AWS S3**
  - **Cloudinary**
  - **Railway Volume** (if using Railway for hosting)

Currently, images are stored locally which works for development but may need cloud storage for production.

### Admin Access
- All admins created locally are in the database
- They'll work in production with the same credentials
- Main admin: `admin` / `changeme123`
- Outlet admins: See `OUTLET_ADMINS_CREATED.md`

## 🔒 Security Checklist

- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Use production `DATABASE_URL` from Railway
- [ ] Set `NEXTAUTH_URL` to your production domain
- [ ] Change default admin passwords after first login
- [ ] Enable Vercel's security headers
- [ ] Consider using environment-specific secrets

## 📊 Environment Variables Summary

| Variable | Required | Source | Example |
|----------|----------|--------|---------|
| `DATABASE_URL` | ✅ Yes | Railway | `postgresql://...` |
| `NEXTAUTH_SECRET` | ✅ Yes | Generate | `random-32-char-hex` |
| `NEXTAUTH_URL` | ✅ Yes | Custom Domain | `https://bassik.in` |
| `MAIN_ADMIN_*` | ❌ No | Reference | (in database) |
| `*_ADMIN_*` | ❌ No | Reference | (in database) |

## 🎯 Quick Setup Checklist

1. ✅ Code pushed to Git
2. ⬜ Connect repository to Vercel
3. ⬜ Add `DATABASE_URL` from Railway
4. ⬜ Generate and add `NEXTAUTH_SECRET`
5. ⬜ Add `NEXTAUTH_URL` (after first deploy)
6. ⬜ Run database migrations
7. ⬜ Test admin login
8. ⬜ Change default passwords

## 🆘 Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check Railway PostgreSQL is running
- Ensure `DATABASE_PUBLIC_URL` is used if `DATABASE_URL` doesn't work

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear cookies and try again

### Image Upload Issues
- Check `/public/uploads/` folder exists
- Verify write permissions
- Consider using cloud storage for production

---

**Ready to deploy!** 🚀
