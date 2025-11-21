import { runQuery, pool } from '../db.js';

const roles = [
  {
    code: 'FINANCE_ADMIN',
    name: 'Finance Admin',
    description: 'Manages dues, finances, and budget reports.',
    permissions: JSON.stringify(['finance_read', 'finance_write']),
  },
  {
    code: 'APPROVAL_ADMIN',
    name: 'Approval Admin',
    description: 'Reviews and approves membership applications and requests.',
    permissions: JSON.stringify(['approvals_read', 'approvals_write']),
  },
  {
    code: 'ID_MANAGER',
    name: 'ID Manager',
    description: 'Manages ID card production, distribution, and verification.',
    permissions: JSON.stringify(['idcards_read', 'idcards_write']),
  },
];

const createRoles = async () => {
  try {
    console.log('Creating roles...');
    for (const role of roles) {
      const existing = await runQuery('SELECT id FROM admin_roles WHERE code = ?', [role.code]);
      if (existing.length === 0) {
        await runQuery(
          'INSERT INTO admin_roles (code, name, description, permissions) VALUES (?, ?, ?, ?)',
          [role.code, role.name, role.description, role.permissions]
        );
        console.log(`Created role: ${role.name}`);
      } else {
        console.log(`Role already exists: ${role.name}`);
      }
    }
    console.log('Roles setup complete.');
  } catch (error) {
    console.error('Error creating roles:', error);
  } finally {
    pool.end();
  }
};

createRoles();
