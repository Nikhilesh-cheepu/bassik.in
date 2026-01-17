// Update/Create admin with new credentials
// Username: bassik.in
// Password: bassik123
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function updateAdminCredentials() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const username = 'bassik.in';
    const password = 'bassik123';
    const role = 'MAIN_ADMIN';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed');

    // Check if admin exists
    const checkResult = await client.query(
      'SELECT id, username FROM "Admin" WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length > 0) {
      // Update existing admin
      console.log('ℹ️  Admin exists, updating password...');
      // Use upsert to handle active field if it doesn't exist
      const updateResult = await client.query(
        `UPDATE "Admin" 
         SET password = $1, role = $2, "updatedAt" = NOW()
         WHERE username = $3
         RETURNING id, username, role`,
        [hashedPassword, role, username]
      );
      
      // Try to update active field if it exists
      try {
        await client.query(
          `UPDATE "Admin" SET active = true WHERE username = $1`,
          [username]
        );
      } catch (e) {
        // Active column might not exist yet, ignore
      }
      const admin = updateResult.rows[0];
      console.log('✅ Admin updated successfully!');
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   ID: ${admin.id}`);
    } else {
      // Create new admin
      console.log('ℹ️  Admin does not exist, creating new admin...');
      const idResult = await client.query('SELECT gen_random_uuid()::text as id');
      const adminId = idResult.rows[0].id;

      // Try with active field first
      let insertResult;
      try {
        insertResult = await client.query(
          `INSERT INTO "Admin" (id, username, password, role, "createdAt", "updatedAt", active)
           VALUES ($1, $2, $3, $4, NOW(), NOW(), true)
           RETURNING id, username, role`,
          [adminId, username, hashedPassword, role]
        );
      } catch (e) {
        // If active column doesn't exist, insert without it
        insertResult = await client.query(
          `INSERT INTO "Admin" (id, username, password, role, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id, username, role`,
          [adminId, username, hashedPassword, role]
        );
      }

      const admin = insertResult.rows[0];
      console.log('✅ Admin created successfully!');
      console.log(`   Username: ${admin.username}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   ID: ${admin.id}`);
    }

    console.log('\n📋 Login Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    if (error.code === '23505') {
      console.log('ℹ️  Admin already exists');
    } else {
      console.error('❌ Error updating admin credentials:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Detail:', error.detail);
      console.error('   Full error:', error);
    }
  } finally {
    await client.end();
  }
}

updateAdminCredentials();
