import { pool } from './db.js';

async function checkUsers() {
  try {
    const [rows] = await pool.query('SELECT id, email, status, is_approved FROM users ORDER BY id DESC LIMIT 5');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkUsers();
