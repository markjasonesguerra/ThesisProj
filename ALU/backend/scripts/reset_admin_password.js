import bcrypt from 'bcryptjs';
import { runQuery, pool } from '../db.js';

const email = process.argv[2];
const newPassword = process.argv[3] || 'Admin123!';

if (!email) {
  console.log('Usage: node scripts/reset_admin_password.js <email> [newPassword]');
  process.exit(1);
}

const resetPassword = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    const result = await runQuery(
      'UPDATE admins SET password_hash = ?, status = "active" WHERE email = ?',
      [hash, email]
    );

    if (result.affectedRows > 0) {
      console.log(`Password for ${email} has been reset to: ${newPassword}`);
      console.log(`Status set to: active`);
    } else {
      console.log(`User with email ${email} not found.`);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    pool.end();
  }
};

resetPassword();
