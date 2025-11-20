import { pool } from './db.js';

async function debugUsers() {
  try {
    console.log('--- Users & Auth ---');
    const [rows] = await pool.query(`
      SELECT u.id, u.email, u.status, ua.password_hash 
      FROM users u 
      LEFT JOIN user_auth ua ON ua.user_id = u.id
    `);
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

debugUsers();
