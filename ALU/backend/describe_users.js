import { pool } from './db.js';

async function describeUsers() {
  try {
    const [rows] = await pool.query('DESCRIBE users');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

describeUsers();
