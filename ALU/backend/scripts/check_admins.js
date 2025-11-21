import { runQuery, pool } from '../db.js';

const checkAdmins = async () => {
  try {
    const rows = await runQuery('SELECT id, email, status, password_hash FROM admins');
    console.log('Found', rows.length, 'admins.');
    rows.forEach(admin => {
      const isHashed = admin.password_hash && (admin.password_hash.startsWith('$2a$') || admin.password_hash.startsWith('$2b$'));
      console.log(`ID: ${admin.id}, Email: ${admin.email}, Status: ${admin.status}, Hash Valid Format: ${isHashed}`);
      if (!isHashed) {
        console.log('  WARNING: Password does not look like a bcrypt hash.');
      }
    });
  } catch (error) {
    console.error('Error checking admins:', error);
  } finally {
    pool.end();
  }
};

checkAdmins();
