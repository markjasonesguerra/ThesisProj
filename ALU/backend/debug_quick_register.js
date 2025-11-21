import { pool } from './db.js';
import { normalizeString } from './utils.js';

async function testQuickRegister() {
  const email = 'test@example.com';
  const normalizedEmail = normalizeString(email);
  
  console.log('Testing quick register for:', normalizedEmail);

  try {
    // check if a user already exists with password (complete account)
    const [existing] = await pool.query(
      `SELECT u.id, ua.password_hash 
       FROM users u 
       LEFT JOIN user_auth ua ON ua.user_id = u.id 
       WHERE u.email = ? LIMIT 1`, 
      [normalizedEmail]
    );
    
    console.log('Existing user check result:', existing);

    if (existing.length && existing[0].password_hash) {
      console.log('User already exists with password.');
      return;
    }

    const code = '000000'; 
    const expiresAt = new Date(Date.now() + (15 * 60 * 1000));

    console.log('Inserting verification code...');
    
    // upsert verification record
    const [result] = await pool.query(
      `INSERT INTO email_verifications (email, code, expires_at, used)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), used = 0, verified_at = NULL, created_at = CURRENT_TIMESTAMP`,
      [normalizedEmail, code, expiresAt],
    );

    console.log('Insert result:', result);
    console.log('Success!');

  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    pool.end();
  }
}

testQuickRegister();
