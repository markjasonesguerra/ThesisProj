import bcrypt from 'bcryptjs';
import { runQuery, pool } from '../db.js';

const email = 'don@gmail.com';
const password = 'Admin123!';

const testLogin = async () => {
  try {
    console.log(`Testing login for ${email}...`);

    // 1. Fetch Admin
    const rows = await runQuery(
      'SELECT id, email, password_hash, first_name, last_name, status FROM admins WHERE email = ? LIMIT 1',
      [email]
    );
    const admin = rows[0];

    if (!admin) {
      console.error('Admin not found');
      return;
    }
    console.log('Admin found:', admin.id, admin.status);

    // 2. Check Password
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.error('Password does not match');
      return;
    }

    // 3. Test Audit Log Insert
    console.log('Testing Audit Log Insert...');
    try {
      await runQuery(
        'INSERT INTO audit_logs (action, actor_admin_id, entity_type, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        ['admin_login_success', admin.id, 'auth', JSON.stringify({ ip: '127.0.0.1' }), '127.0.0.1']
      );
      console.log('Audit Log Insert Success');
    } catch (e) {
      console.error('Audit Log Insert Failed:', e.message);
    }

    // 4. Test Session Insert
    console.log('Testing Session Insert...');
    try {
      const sessionToken = 'test_token_' + Date.now();
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      await runQuery(
        'INSERT INTO admin_sessions (admin_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
        [admin.id, sessionToken, '127.0.0.1', 'TestScript', expiresAt]
      );
      console.log('Session Insert Success');
    } catch (e) {
      console.error('Session Insert Failed:', e.message);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    pool.end();
  }
};

testLogin();
