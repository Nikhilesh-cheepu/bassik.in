# Railway PostgreSQL Setup Guide

## Step 1: Create PostgreSQL Database on Railway

1. Go to [Railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Provision PostgreSQL"
4. Once created, click on the PostgreSQL service
5. Go to the "Variables" tab
6. Copy the `DATABASE_URL` - it will look like:
   ```
   postgresql://postgres:password@hostname:port/railway
   ```

## Step 2: Update Environment Variables

Create or update your `.env` file:

```env
# Railway PostgreSQL Connection
DATABASE_URL="postgresql://postgres:password@hostname:port/railway"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Admin credentials (optional - will use defaults if not set)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="changeme123"
ADMIN_ROLE="MAIN_ADMIN"
```

## Step 3: Run Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations to create tables
npx prisma migrate dev --name init
```

## Step 4: Create Admin User

```bash
npm run create-admin
```

Or use the script:
```bash
npx tsx scripts/create-admin.ts
```

## Step 5: Access Admin Panel

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Go to: `http://localhost:3000/admin`

3. Login with:
   - Username: `admin` (or your ADMIN_USERNAME)
   - Password: `changeme123` (or your ADMIN_PASSWORD)

## Railway Production Deployment

When deploying to Railway:

1. Add `DATABASE_URL` as an environment variable in Railway
2. Railway will automatically provide the PostgreSQL connection string
3. Run migrations in production:
   ```bash
   npx prisma migrate deploy
   ```

## Connection String Format

Railway provides the connection string in this format:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

Make sure to:
- Keep it secure (don't commit to git)
- Use Railway's environment variables in production
- The connection string includes SSL by default
