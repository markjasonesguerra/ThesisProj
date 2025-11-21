import { pool } from './db.js';

async function debugTable() {
  try {
    const [rows] = await pool.query('DESCRIBE email_verifications');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

debugTable();
