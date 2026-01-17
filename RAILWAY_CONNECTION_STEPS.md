# Step-by-Step: Connect Railway PostgreSQL

## Step 1: Create PostgreSQL Database on Railway

1. In your Railway dashboard, click **"+ New"** button (purple button in top right)
2. Select **"Database"** → **"Add PostgreSQL"**
3. Wait for Railway to provision your PostgreSQL database (takes ~30 seconds)
4. Once created, click on the PostgreSQL service card

## Step 2: Get Your Database Connection String

1. In the PostgreSQL service page, click on the **"Variables"** tab
2. Find the `DATABASE_URL` variable
3. Click the **copy icon** next to it to copy the connection string
   - It will look like: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`

## Step 3: Add DATABASE_URL to Your Project

1. In your project root, create/update the `.env` file:
   ```bash
   # Open/create .env file
   ```

2. Add these variables:
   ```env
   DATABASE_URL="paste-your-railway-database-url-here"
   NEXTAUTH_SECRET="generate-a-random-string-here"
   ADMIN_USERNAME="admin"
   ADMIN_PASSWORD="changeme123"
   ```

3. **Generate NEXTAUTH_SECRET** (run this command):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste it as `NEXTAUTH_SECRET`

## Step 4: Run Database Migrations

```bash
# This creates all tables in your Railway PostgreSQL database
npx prisma migrate dev --name init
```

You'll be prompted to create a new migration. Type `y` and press Enter.

## Step 5: Create Admin User

```bash
npm run create-admin
```

This creates the first admin user with:
- Username: `admin`
- Password: `changeme123`

## Step 6: Start Development Server

```bash
npm run dev
```

## Step 7: Access Admin Panel

1. Open your browser
2. Go to: **http://localhost:3000/admin**
3. Login with:
   - **Username:** `admin`
   - **Password:** `changeme123`

## Troubleshooting

### If migrations fail:
- Check that `DATABASE_URL` is correct in `.env`
- Make sure Railway PostgreSQL is running (green status)
- Try: `npx prisma db push` as alternative

### If admin creation fails:
- Make sure migrations completed successfully
- Check database connection: `npx prisma studio` (opens database viewer)

### Connection issues:
- Verify DATABASE_URL includes the full connection string
- Check Railway PostgreSQL service is active
- Ensure no firewall blocking the connection
