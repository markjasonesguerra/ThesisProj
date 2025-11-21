import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { runQuery, pool } from '../db.js';

const createSuperAdmin = async () => {
  const email = 'superadmin@alu.com';
  const password = 'SuperAdmin123!';
  const firstName = 'Super';
  const lastName = 'Admin';
  
  try {
    console.log('Starting Super Admin creation...');

    // 1. Ensure SUPER_ADMIN role exists
    let roleId;
    const roleCode = 'SUPER_ADMIN';
    const roleName = 'Super Administrator';
    const roleDesc = 'Full access to all system features and settings.';
    const rolePerms = JSON.stringify(['*']); // Wildcard permission

    const existingRole = await runQuery('SELECT id FROM admin_roles WHERE code = ?', [roleCode]);
    
    if (existingRole.length === 0) {
      console.log(`Role ${roleCode} not found. Creating...`);
      const result = await runQuery(
        'INSERT INTO admin_roles (code, name, description, permissions) VALUES (?, ?, ?, ?)',
        [roleCode, roleName, roleDesc, rolePerms]
      );
      roleId = result.insertId;
      console.log(`Created role ${roleCode} with ID: ${roleId}`);
    } else {
      roleId = existingRole[0].id;
      console.log(`Role ${roleCode} exists with ID: ${roleId}`);
    }

    // 2. Create the Admin User
    // Check if user exists first
    const existingUser = await runQuery('SELECT id FROM admins WHERE email = ?', [email]);
    let adminId;

    if (existingUser.length > 0) {
      console.log(`User ${email} already exists. Updating password and ensuring role...`);
      adminId = existingUser[0].id;
      const hashedPassword = await bcrypt.hash(password, 10);
      await runQuery('UPDATE admins SET password_hash = ?, status = ? WHERE id = ?', [hashedPassword, 'active', adminId]);
    } else {
      console.log(`Creating user ${email}...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      const uuid = crypto.randomUUID();
      const result = await runQuery(
        'INSERT INTO admins (uuid, email, password_hash, first_name, last_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [uuid, email, hashedPassword, firstName, lastName, 'active']
      );
      adminId = result.insertId;
      console.log(`Created user with ID: ${adminId}`);
    }

    // 3. Assign the Role
    const existingAssignment = await runQuery(
      'SELECT * FROM admin_role_assignments WHERE admin_id = ? AND role_id = ?',
      [adminId, roleId]
    );

    if (existingAssignment.length === 0) {
      await runQuery(
        'INSERT INTO admin_role_assignments (admin_id, role_id, assigned_at) VALUES (?, ?, NOW())',
        [adminId, roleId]
      );
      console.log(`Assigned ${roleCode} role to user.`);
    } else {
      console.log(`User already has ${roleCode} role.`);
    }

    console.log('-----------------------------------');
    console.log('Super Admin Account Ready:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    pool.end();
  }
};

createSuperAdmin();
