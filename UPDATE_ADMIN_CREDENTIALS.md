# Update Admin Credentials

## New Default Credentials

- **Username:** `bassik.in`
- **Password:** `bassik123`
- **Role:** `MAIN_ADMIN`

## How to Update Admin Credentials in Production

### Option 1: Run the Update Script (Recommended)

If you have access to your production environment with Node.js:

```bash
node scripts/update-admin-credentials.js
```

This script will:
- Update the password for existing admin "bassik.in"
- Create the admin if it doesn't exist
- Set active status to true

### Option 2: Direct SQL Update (If you have database access)

Connect to your PostgreSQL database and run:

```sql
-- Password hash for "bassik123": $2b$10$6t2Ytzv7ZUWIXn.byCyOL.5MFZNbxmdV1veXgXrdzYd.hADJcnkxW

-- Update existing admin (if exists)
UPDATE "Admin" 
SET password = '$2b$10$6t2Ytzv7ZUWIXn.byCyOL.5MFZNbxmdV1veXgXrdzYd.hADJcnkxW',
    role = 'MAIN_ADMIN',
    "updatedAt" = NOW()
WHERE username = 'bassik.in';

-- If admin doesn't exist, create it
INSERT INTO "Admin" (id, username, password, role, "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    'bassik.in',
    '$2b$10$6t2Ytzv7ZUWIXn.byCyOL.5MFZNbxmdV1veXgXrdzYd.hADJcnkxW',
    'MAIN_ADMIN',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "Admin" WHERE username = 'bassik.in'
);

-- If active column exists, set it to true
UPDATE "Admin" SET active = true WHERE username = 'bassik.in';
```

### Option 3: Update via Railway/Vercel Environment Variables

If you're using environment variables for admin creation:

1. Set `ADMIN_USERNAME=bassik.in` in your environment variables
2. Set `ADMIN_PASSWORD=bassik123` in your environment variables
3. Run the admin creation script in your production environment

## Testing the Login

After updating, test the login with:
- **Username:** `bassik.in`
- **Password:** `bassik123`

## Notes

- The script handles the case where the `active` column might not exist yet (for backward compatibility)
- If you have an existing admin with username "admin", you can keep it or delete it
- The password hash is stored securely using bcrypt
- All admins are set to `MAIN_ADMIN` role by default
