import { pool } from './db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { normalizeString, generateDigitalId } from './utils.js';

async function debugSetPassword() {
  const email = 'test_setpass@example.com';
  const password = 'password123';
  const firstName = 'Test';
  const lastName = 'User';
  // Try without names to see if it fails
  // const firstName = null; 
  // const lastName = null;

  const normalizedEmail = normalizeString(email);
  const SALT_ROUNDS = 10;

  console.log('Testing set-password for:', normalizedEmail);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Setup: Ensure email is verified
    console.log('Setting up verified email...');
    await connection.query(
      `INSERT INTO email_verifications (email, code, expires_at, used, verified_at)
       VALUES (?, '000000', DATE_ADD(NOW(), INTERVAL 1 HOUR), 1, NOW())
       ON DUPLICATE KEY UPDATE used=1, verified_at=NOW()`,
      [normalizedEmail]
    );

    // 2. Simulate the route logic
    console.log('Simulating route logic...');

    // ensure verified within TTL (used=1 and verified_at not null)
    const [verRows] = await connection.query(
      'SELECT id, verified_at FROM email_verifications WHERE email = ? AND used = 1 LIMIT 1',
      [normalizedEmail],
    );
    if (!verRows.length) {
      throw new Error('Email not verified (simulation failed).');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [existing] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    
    if (existing.length) {
      console.log('User exists, updating...');
      // ... existing user logic ...
    } else {
      console.log('User does not exist, creating...');
      const digitalId = generateDigitalId('PENDING');
      const userUuid = crypto.randomUUID();

      // 1. Insert into users
      console.log('Inserting into users...');
      const [result] = await connection.query(
        `INSERT INTO users (uuid, email, status, membership_no, created_at, updated_at)
         VALUES (?, ?, 'incomplete', ?, NOW(), NOW())`,
        [userUuid, normalizedEmail, digitalId],
      );
      const userId = result.insertId;
      console.log('User ID:', userId);

      // 2. Insert into user_profiles
      console.log('Inserting into user_profiles...');
      // NOTE: This is where I suspect it might fail if names are null
      await connection.query(
        `INSERT INTO user_profiles (user_id, first_name, middle_initial, last_name)
         VALUES (?, ?, ?, ?)`,
        [userId, normalizeString(firstName), normalizeString(null), normalizeString(lastName)]
      );

      // 3. Insert into user_auth
      console.log('Inserting into user_auth...');
      await connection.query(
        `INSERT INTO user_auth (user_id, password_hash)
         VALUES (?, ?)`,
        [userId, passwordHash]
      );

      // 4. Insert empty emergency contact
      console.log('Inserting into user_emergency_contacts...');
      await connection.query(
        `INSERT INTO user_emergency_contacts (user_id, full_name, relationship, phone, address)
         VALUES (?, '', '', '', '')`,
        [userId],
      );
    }

    await connection.commit();
    console.log('Success!');

  } catch (err) {
    await connection.rollback();
    console.error('FAILED:', err);
  } finally {
    connection.release();
    pool.end();
  }
}

debugSetPassword();
