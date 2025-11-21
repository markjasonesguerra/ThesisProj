import { pool } from './db.js';

async function fixUsersStatus() {
  try {
    console.log('Altering users table status enum...');
    await pool.query(`
      ALTER TABLE users
      MODIFY COLUMN status ENUM('pending','email_verified','under_review','approved','rejected','suspended','incomplete') DEFAULT 'pending'
    `);
    
    console.log('Table fixed.');
    
    const [rows] = await pool.query('DESCRIBE users');
    const statusRow = rows.find(r => r.Field === 'status');
    console.log('New status column definition:', statusRow);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

fixUsersStatus();
