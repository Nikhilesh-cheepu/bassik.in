// Direct SQL approach to create admin (bypasses Prisma 7 adapter issue)
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const role = process.env.ADMIN_ROLE || 'MAIN_ADMIN';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if admin exists
    const checkResult = await client.query(
      'SELECT id FROM "Admin" WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length > 0) {
      console.log('ℹ️  Admin already exists with username:', username);
      await client.end();
      return;
    }

    // Generate UUID for id
    const idResult = await client.query('SELECT gen_random_uuid()::text as id');
    const adminId = idResult.rows[0].id;

    // Create admin
    const result = await client.query(
      `INSERT INTO "Admin" (id, username, password, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, username, role`,
      [adminId, username, hashedPassword, role]
    );

    const admin = result.rows[0];
    console.log('✅ Admin created successfully!');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   ID: ${admin.id}`);
  } catch (error) {
    if (error.code === '23505') {
      console.log('ℹ️  Admin already exists');
    } else {
      console.error('❌ Error creating admin:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Detail:', error.detail);
      console.error('   Full error:', error);
    }
  } finally {
    await client.end();
  }
}

createAdmin();
