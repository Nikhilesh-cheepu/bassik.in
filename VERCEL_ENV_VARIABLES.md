# 🔐 Vercel Environment Variables for bassik.in

## Required Environment Variables

Add these **3 variables** in Vercel → Project Settings → Environment Variables:

### 1. DATABASE_URL
```
Value: [Your Railway PostgreSQL connection string]
Source: Railway → PostgreSQL → Variables → DATABASE_URL
Example: postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

### 1b. DATABASE_PUBLIC_URL (required for Vercel runtime)
```
Value: Same as your public Railway URL (e.g. from Railway → Variables → DATABASE_PUBLIC_URL, or the public postgres URL that works from the internet)
Source: Railway → PostgreSQL → Variables → DATABASE_PUBLIC_URL (or use the same value as DATABASE_URL if it's already a public URL)
```
**Why:** Vercel serverless runs on the public internet and cannot reach Railway’s private URL (`postgres.railway.internal`). The app uses `DATABASE_PUBLIC_URL` at runtime on Vercel so outlets, admin panel, and uploads can read/write the database. Build uses `DATABASE_PUBLIC_URL` for migrations; set both in Vercel for data and uploads to work.

### 2. NEXTAUTH_SECRET
```
Value: a569e8397369c96b8514f460854da881a66f4bc121520d278b2d83ef199551a5
Or generate new: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. NEXTAUTH_URL
```
Value: https://bassik.in
Note: Your custom domain
```

---

## 📋 Quick Copy-Paste for Vercel

```
DATABASE_URL=postgresql://postgres:password@hostname:port/railway
NEXTAUTH_SECRET=a569e8397369c96b8514f460854da881a66f4bc121520d278b2d83ef199551a5
NEXTAUTH_URL=https://bassik.in
```

**⚠️ Replace `DATABASE_URL` with your actual Railway connection string!**

---

## 🌐 Domain Setup in Vercel

1. Go to Vercel → Your Project → Settings → Domains
2. Add `bassik.in` as custom domain
3. Follow Vercel's DNS configuration:
   - Add A record pointing to Vercel's IP
   - Or add CNAME record pointing to Vercel's domain
4. Wait for DNS propagation (can take a few minutes to 24 hours)
5. Once verified, your site will be live at `https://bassik.in`

---

## ✅ After Deployment Checklist

- [ ] Added `DATABASE_URL` from Railway
- [ ] Added `DATABASE_PUBLIC_URL` from Railway (same as public Postgres URL; required for data + uploads on Vercel)
- [ ] Added `NEXTAUTH_SECRET` (production secret)
- [ ] Added `NEXTAUTH_URL` = `https://bassik.in`
- [ ] Connected `bassik.in` domain in Vercel
- [ ] DNS records configured correctly
- [ ] Domain verified in Vercel
- [ ] Tested: `https://bassik.in/admin` login works
- [ ] Ran database migrations (if needed)

---

## 🔗 Important URLs

- **Admin Panel**: `https://bassik.in/admin`
- **Public Site**: `https://bassik.in`
- **Vercel Dashboard**: [vercel.com](https://vercel.com)

---

**Ready to deploy!** 🚀
