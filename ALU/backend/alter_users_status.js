import { pool } from './db.js';

async function alterUsersTable() {
  try {
    await pool.query("ALTER TABLE users MODIFY COLUMN status ENUM('incomplete', 'pending', 'email_verified', 'under_review', 'approved', 'rejected', 'suspended') DEFAULT 'pending'");
    console.log("Table altered successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

alterUsersTable();
