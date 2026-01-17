# Railway PostgreSQL Setup - Quick Start

## Step 1: Create PostgreSQL Database on Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Provision PostgreSQL"**
4. Wait for it to be created
5. Click on the PostgreSQL service
6. Go to the **"Variables"** tab
7. Copy the `DATABASE_URL` - it looks like:
   ```
   postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```

## Step 2: Set Up Environment Variables

Create a `.env` file in your project root:

```env
# Railway PostgreSQL (paste your DATABASE_URL from Railway)
DATABASE_URL="postgresql://postgres:password@hostname:port/railway"

# NextAuth Secret (generate a random string)
NEXTAUTH_SECRET="your-random-secret-key-here"

# Admin Login (you can change these)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="changeme123"
ADMIN_ROLE="MAIN_ADMIN"
```

## Step 3: Run Database Migrations

```bash
# This will create all tables in your Railway PostgreSQL database
npx prisma migrate dev --name init
```

## Step 4: Create Admin User

```bash
npm run create-admin
```

This will create the first admin user with:
- Username: `admin` (or from ADMIN_USERNAME)
- Password: `changeme123` (or from ADMIN_PASSWORD)
- Role: `MAIN_ADMIN`

## Step 5: Start Development Server

```bash
npm run dev
```

## Step 6: Access Admin Panel

1. Open your browser
2. Go to: **http://localhost:3000/admin**
3. Login with:
   - Username: `admin`
   - Password: `changeme123`

## Troubleshooting

### Connection Issues
- Make sure your `DATABASE_URL` is correct
- Check that Railway PostgreSQL is running
- Verify the connection string includes SSL if needed

### Migration Issues
- If migrations fail, try: `npx prisma migrate reset` (⚠️ deletes all data)
- Then: `npx prisma migrate dev`

### Admin Creation Issues
- Make sure migrations ran successfully
- Check that DATABASE_URL is set correctly
- Verify the database is accessible

## Production Deployment

When deploying to Railway:
1. Add your `.env` variables in Railway dashboard
2. Railway will automatically provide `DATABASE_URL`
3. Run: `npx prisma migrate deploy` in production
