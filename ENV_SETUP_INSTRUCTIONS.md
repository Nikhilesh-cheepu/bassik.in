# .env File Setup Instructions

## ✅ What You Need to Do

### Step 1: Get DATABASE_URL from Railway

1. In your Railway dashboard, you're already on the **Postgres** service
2. You're on the **"Variables"** tab (I can see it in your screenshot)
3. Find the variable named **`DATABASE_URL`** in the list
4. Click the **copy icon** (📋) next to `DATABASE_URL`
5. The value will look something like:
   ```
   postgresql://postgres:xxxxx@containers-us-west-xxx.railway.app:5432/railway
   ```

### Step 2: Update .env File

1. Open the `.env` file in your project root
2. Find this line:
   ```env
   DATABASE_URL="postgresql://postgres:password@hostname:port/railway"
   ```
3. Replace the entire value (inside quotes) with the DATABASE_URL you copied from Railway
4. It should look like:
   ```env
   DATABASE_URL="postgresql://postgres:actualpassword@containers-us-west-xxx.railway.app:5432/railway"
   ```

### Step 3: Clerk Authentication Keys

Get your Clerk keys from: https://dashboard.clerk.com/last-active?path=api-keys

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_SECRET_KEY
```

Replace `YOUR_PUBLISHABLE_KEY` and `YOUR_SECRET_KEY` with your actual keys from the Clerk Dashboard.

### Step 4: Keep Everything Else As Is

- ✅ `NEXTAUTH_SECRET` - Already generated, keep it
- ✅ `NEXTAUTH_URL` - Already set for localhost, keep it
- ✅ `ADMIN_USERNAME` - Set to "admin", you can change if needed
- ✅ `ADMIN_PASSWORD` - Set to "changeme123", you can change if needed
- ✅ `ADMIN_ROLE` - Set to "MAIN_ADMIN", keep it

## 🚀 After Updating .env

Once you've pasted your Railway DATABASE_URL:

1. **Run migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

2. **Create admin user:**
   ```bash
   npm run create-admin
   ```

3. **Start server:**
   ```bash
   npm run dev
   ```

4. **Access admin:**
   - Go to: http://localhost:3000/admin
   - Login: username `admin`, password `changeme123`

## 📝 Quick Checklist

- [ ] Copied `DATABASE_URL` from Railway Variables tab
- [ ] Pasted it into `.env` file (replacing the placeholder)
- [ ] Saved the `.env` file
- [ ] Ready to run migrations
