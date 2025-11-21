import { runQuery, pool } from '../db.js';

const checkRoles = async () => {
  try {
    const email = 'superadmin@alu.com';
    console.log(`Checking roles for ${email}...`);

    const users = await runQuery('SELECT id, email, first_name FROM admins WHERE email = ?', [email]);
    if (users.length === 0) {
      console.log('User not found!');
      return;
    }
    const user = users[0];
    console.log('User found:', user);

    const roles = await runQuery(
      `SELECT ar.code, ar.name 
       FROM admin_role_assignments ara
       JOIN admin_roles ar ON ar.id = ara.role_id
       WHERE ara.admin_id = ?`,
      [user.id]
    );

    console.log('Roles:', roles);

  } catch (error) {
    console.error('Error checking roles:', error);
  } finally {
    pool.end();
  }
};

checkRoles();
