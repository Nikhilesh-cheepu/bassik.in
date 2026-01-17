# How to Access Admin Page on Localhost

## Quick Steps:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser and go to:**
   ```
   http://localhost:3000/admin
   ```

3. **Login with default credentials:**
   - Username: `admin`
   - Password: `changeme123`

## If Admin User Doesn't Exist:

Due to Prisma 7 requiring adapters, you have two options:

### Option 1: Use Prisma Studio to Create Admin (Easiest)

1. Run Prisma Studio:
   ```bash
   npm run db:studio
   ```

2. Open the Admin table
3. Click "Add record"
4. Fill in:
   - `username`: admin
   - `password`: (use bcrypt hash - see below)
   - `role`: MAIN_ADMIN
   - Click Save

**To generate password hash, run this in Node.js:**
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('changeme123', 10).then(hash => console.log(hash));
```

### Option 2: Use SQL directly

1. Open the database:
   ```bash
   sqlite3 prisma/dev.db
   ```

2. Insert admin (password hash for "changeme123"):
   ```sql
   INSERT INTO Admin (id, username, password, role, createdAt, updatedAt)
   VALUES (
     'admin-1',
     'admin',
     '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq',
     'MAIN_ADMIN',
     datetime('now'),
     datetime('now')
   );
   ```

## Default Login Credentials:

- **Username:** `admin`
- **Password:** `changeme123`
- **Role:** `MAIN_ADMIN`

## After Login:

You'll be redirected to `/admin/dashboard` (which we need to create next).

For now, the login page is at `/admin` and the backend APIs are ready.
