// Create admins for each outlet with specific permissions
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { BRANDS } = require('../lib/brands.ts');

async function createOutletAdmins() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get main admin to use as creator
    const mainAdminResult = await client.query(
      'SELECT id FROM "Admin" WHERE role = $1 LIMIT 1',
      ['MAIN_ADMIN']
    );

    if (mainAdminResult.rows.length === 0) {
      console.log('❌ Main admin not found. Please create main admin first.');
      return;
    }

    const mainAdminId = mainAdminResult.rows[0].id;

    // Create admin for each outlet
    for (const brand of BRANDS) {
      const username = `${brand.id}_admin`;
      const password = `${brand.id}123`; // Simple password pattern

      // Check if admin already exists
      const checkResult = await client.query(
        'SELECT id FROM "Admin" WHERE username = $1',
        [username]
      );

      if (checkResult.rows.length > 0) {
        console.log(`ℹ️  Admin already exists: ${username}`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate UUID for admin
      const idResult = await client.query('SELECT gen_random_uuid()::text as id');
      const adminId = idResult.rows[0].id;

      // Create admin
      await client.query(
        `INSERT INTO "Admin" (id, username, password, role, "createdById", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [adminId, username, hashedPassword, 'ADMIN', mainAdminId]
      );

      // Get or create venue
      let venueResult = await client.query(
        'SELECT id FROM "Venue" WHERE "brandId" = $1',
        [brand.id]
      );

      let venueId;
      if (venueResult.rows.length === 0) {
        // Create venue if it doesn't exist
        const venueIdResult = await client.query('SELECT gen_random_uuid()::text as id');
        venueId = venueIdResult.rows[0].id;
        
        await client.query(
          `INSERT INTO "Venue" (id, "brandId", name, "shortName", address, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [venueId, brand.id, brand.name, brand.shortName, '']
        );
      } else {
        venueId = venueResult.rows[0].id;
      }

      // Create venue permission
      await client.query(
        `INSERT INTO "AdminVenuePermission" (id, "adminId", "venueId", "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, NOW())
         ON CONFLICT DO NOTHING`,
        [adminId, venueId]
      );

      console.log(`✅ Created admin: ${username} (Password: ${password}) for ${brand.shortName}`);
    }

    console.log('\n✅ All outlet admins created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('='.repeat(60));
    BRANDS.forEach(brand => {
      console.log(`${brand.shortName.padEnd(25)} | Username: ${brand.id}_admin | Password: ${brand.id}123`);
    });
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error creating admins:', error);
  } finally {
    await client.end();
  }
}

createOutletAdmins();
