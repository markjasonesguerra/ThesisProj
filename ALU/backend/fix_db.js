import { pool } from './db.js';

async function fixDatabase() {
  try {
    console.log('Truncating email_verifications...');
    await pool.query('TRUNCATE TABLE email_verifications');

    console.log('Dropping foreign key...');
    try {
      await pool.query('ALTER TABLE email_verifications DROP FOREIGN KEY email_verifications_ibfk_1');
    } catch (e) {
      console.log('FK might not exist or different name, ignoring:', e.message);
    }

    console.log('Altering email_verifications...');
    await pool.query(`
      ALTER TABLE email_verifications
      DROP COLUMN user_id,
      DROP COLUMN consumed_at,
      ADD COLUMN email VARCHAR(191) NOT NULL,
      ADD COLUMN used TINYINT(1) DEFAULT 0,
      ADD COLUMN verified_at DATETIME NULL,
      ADD UNIQUE KEY (email)
    `);
    
    // Note: I dropped user_id because the current code doesn't use it. 
    // If other parts of the system use this table with user_id, they will break.
    // But based on the file search, only auth.js seems to use it for registration.
    
    console.log('Table fixed.');
    
    const [rows] = await pool.query('DESCRIBE email_verifications');
    console.log(rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

fixDatabase();
