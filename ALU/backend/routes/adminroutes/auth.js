import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { runQuery } from '../../db.js';
import crypto from 'crypto';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const rows = await runQuery(
      'SELECT id, email, password_hash, first_name, last_name, status FROM admins WHERE email = ? LIMIT 1',
      [email]
    );

    const admin = rows[0];

    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Create a session record
    const sessionToken = crypto.randomBytes(32).toString('hex'); // 64 chars
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

    await runQuery(
      'INSERT INTO admin_sessions (admin_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [admin.id, sessionToken, req.ip, req.headers['user-agent'], expiresAt]
    );

    // Log the login
    await runQuery(
      'INSERT INTO audit_logs (action, actor_admin_id, entity_type, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      ['admin_login_success', admin.id, 'auth', JSON.stringify({ ip: req.ip }), req.ip]
    );

    // Fetch roles
    const roleRows = await runQuery(
      `SELECT ar.code, ar.name 
       FROM admin_role_assignments ara
       JOIN admin_roles ar ON ar.id = ara.role_id
       WHERE ara.admin_id = ?`,
      [admin.id]
    );
    const roles = roleRows.map(r => r.code);

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        roles,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.put('/auth/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const adminId = decoded.id;
  const { firstName, lastName, password } = req.body;

  try {
    if (firstName || lastName) {
      await runQuery(
        'UPDATE admins SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name) WHERE id = ?',
        [firstName, lastName, adminId]
      );
    }

    if (password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message:
            'Password must be at least 8 characters long and include uppercase, lowercase, and special characters.',
        });
      }

      const hash = await bcrypt.hash(password, 10);
      await runQuery('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, adminId]);
    }

    await runQuery(
      'INSERT INTO audit_logs (action, actor_admin_id, entity_type, metadata, ip_address, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [
        'admin_profile_update',
        adminId,
        'admin',
        JSON.stringify({ changes: Object.keys(req.body) }),
        req.ip,
      ]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default (parentRouter) => {
  parentRouter.use('/', router);
};
