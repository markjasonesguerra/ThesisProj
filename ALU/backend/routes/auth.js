import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '../db.js';
import { normalizeString, normalizeNumber, generateDigitalId, sanitizeUser, SALT_ROUNDS, mapUserRow } from '../utils.js';

const router = express.Router();

// setup mail transporter if SMTP config is present
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
let transporter = null;
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Boolean(Number(process.env.SMTP_SECURE ?? 0)),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const sendVerificationEmail = async (email, code) => {
  const from = process.env.SMTP_FROM ?? 'no-reply@example.com';
  const subject = 'Your verification code';
  const text = `Your verification code is: ${code}`;
  const html = `<p>Your verification code is: <strong>${code}</strong></p>`;

  if (transporter) {
    try {
      await transporter.sendMail({ from, to: email, subject, text, html });
      return true;
    } catch (err) {
      console.error('Failed sending mail:', err.message);
      return false;
    }
  }

  // fallback: log to console for development
  console.log(`Verification code for ${email}: ${code}`);
  return true;
};

router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body ?? {};

  if (!normalizeString(firstName) || !normalizeString(lastName)) {
    return res.status(400).json({ message: 'First name and last name are required.' });
  }

  const hasEmail = !!normalizeString(email);
  const hasPhone = !!normalizeString(phone);

  if (!hasEmail && !hasPhone) {
    return res.status(400).json({ message: 'Email or phone number is required.' });
  }

  if (!normalizeString(password)) {
    return res.status(400).json({ message: 'Password is required.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check for existing user with same email OR phone
    const checks = [];
    const params = [];
    if (hasEmail) {
      checks.push('email = ?');
      params.push(email);
    }
    if (hasPhone) {
      checks.push('phone = ?');
      params.push(phone);
    }

    const [existing] = await connection.query(
      `SELECT id FROM users WHERE ${checks.join(' OR ')} LIMIT 1`,
      params,
    );

    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ message: 'An account with that email or phone already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const digitalId = generateDigitalId('PENDING');
    const userUuid = crypto.randomUUID();

    // 1. Insert into users table
    const [userResult] = await connection.query(
      `INSERT INTO users (
        uuid,
        email,
        phone,
        status,
        membership_no,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 'pending', ?, NOW(), NOW())`,
      [
        userUuid,
        normalizeString(email) || null,
        normalizeString(phone) || null,
        digitalId
      ]
    );

    const userId = userResult.insertId;

    // 2. Insert into user_profiles table
    await connection.query(
      `INSERT INTO user_profiles (
        user_id,
        first_name,
        last_name
      ) VALUES (?, ?, ?)`,
      [
        userId,
        normalizeString(firstName),
        normalizeString(lastName)
      ]
    );

    // 3. Insert into user_auth table
    await connection.query(
      `INSERT INTO user_auth (
        user_id,
        password_hash
      ) VALUES (?, ?)`,
      [
        userId,
        passwordHash
      ]
    );

    // 4. Insert empty emergency contact (optional, but keeping for consistency if needed)
    await connection.query(
      `INSERT INTO user_emergency_contacts (user_id, full_name, relationship, phone, address)
       VALUES (?, '', '', '', '')`,
      [userId],
    );

    await connection.commit();

    res.status(201).json({ id: userId, message: 'Account created successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  } finally {
    connection.release();
  }
});

router.post('/register', async (req, res) => {
  const {
    firstName,
    middleInitial,
    lastName,
    email,
    phone,
    password,
    address,
    dateOfBirth,
    placeOfBirth,
    maritalStatus,
    numberOfChildren,
    gender,
    religion,
    education,
    company,
    position,
    department,
    yearsEmployed,
    unionAffiliation,
    unionPosition,
    emergencyContact = {},
  } = req.body ?? {};

  if (!normalizeString(firstName) || !normalizeString(lastName)) {
    return res.status(400).json({ message: 'First name and last name are required.' });
  }

  if (!normalizeString(email) || !normalizeString(phone)) {
    return res.status(400).json({ message: 'Email and phone are required.' });
  }

  if (!normalizeString(address) || !normalizeString(dateOfBirth) || !normalizeString(placeOfBirth)) {
    return res.status(400).json({ message: 'Address, place of birth, and date of birth are required.' });
  }

  if (!normalizeString(education) || !normalizeString(company) || !normalizeString(position) || !normalizeString(unionPosition)) {
    return res.status(400).json({ message: 'Education, company, position, and union position are required.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [email, phone],
    );

    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ message: 'An account with that email or phone already exists.' });
    }

    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    const membershipDate = new Date();
    const digitalId = generateDigitalId(company);

    const [userResult] = await connection.query(
      `INSERT INTO users (
        first_name,
        middle_initial,
        last_name,
        email,
        phone,
        password_hash,
        date_of_birth,
        place_of_birth,
        address,
        marital_status,
        number_of_children,
        gender,
        religion,
        education,
        company,
        position,
        department,
        years_employed,
        union_affiliation,
        union_position,
        membership_date,
        digital_id,
        profile_picture_url,
        is_approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizeString(firstName),
        normalizeString(middleInitial),
        normalizeString(lastName),
        normalizeString(email),
        normalizeString(phone),
        passwordHash,
        normalizeString(dateOfBirth),
        normalizeString(placeOfBirth),
        normalizeString(address),
        normalizeString(maritalStatus),
        normalizeNumber(numberOfChildren),
        normalizeString(gender),
        normalizeString(religion),
        normalizeString(education),
        normalizeString(company),
        normalizeString(position),
        normalizeString(department),
        normalizeNumber(yearsEmployed),
        normalizeString(unionAffiliation),
        normalizeString(unionPosition),
        membershipDate,
        digitalId,
        null,
        0,
      ],
    );

    const userId = userResult.insertId;

    await connection.query(
      `INSERT INTO user_emergency_contacts (user_id, name, relationship, phone, address)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), relationship = VALUES(relationship), phone = VALUES(phone), address = VALUES(address)`,
      [
        userId,
        normalizeString(emergencyContact.name),
        normalizeString(emergencyContact.relationship),
        normalizeString(emergencyContact.phone),
        normalizeString(emergencyContact.address),
      ],
    );

    await connection.commit();

    res.status(201).json({ id: userId, digitalId, message: 'Membership application submitted.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  } finally {
    connection.release();
  }
});

// quick registration: send a 6-digit code to the provided email
router.post('/quick-register', async (req, res) => {
  const { email, firstName, lastName } = req.body ?? {};
  const normalizedEmail = normalizeString(email);
  
  if (!normalizedEmail) return res.status(400).json({ message: 'Email is required.' });

  try {
    // check if a user already exists with password (complete account)
    const [existing] = await pool.query(
      `SELECT u.id, ua.password_hash 
       FROM users u 
       LEFT JOIN user_auth ua ON ua.user_id = u.id 
       WHERE u.email = ? LIMIT 1`, 
      [normalizedEmail]
    );
    
    if (existing.length && existing[0].password_hash) {
      return res.status(409).json({ message: 'This email is already registered. Please sign in instead.' });
    }

    // For development/demo purposes, use 000000
    const code = '000000'; 
    // const code = crypto.randomInt(100000, 999999).toString();
    
    // Use a Date object directly so the mysql2 driver handles timezone conversion correctly
    const expiresAt = new Date(Date.now() + (Number(process.env.VERIFICATION_TTL_MS ?? 15 * 60 * 1000)));

    // upsert verification record
    await pool.query(
      `INSERT INTO email_verifications (email, code, expires_at, used)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), used = 0, verified_at = NULL, created_at = CURRENT_TIMESTAMP`,
      [normalizedEmail, code, expiresAt],
    );

    await sendVerificationEmail(normalizedEmail, code);
    return res.json({ message: 'Verification code sent.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to send verification code.' });
  }
});

// verify code
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body ?? {};
  const normalizedEmail = normalizeString(email);
  if (!normalizedEmail || !normalizeString(code)) return res.status(400).json({ message: 'Email and code are required.' });

  try {
    const [rows] = await pool.query(
      'SELECT id, code, expires_at, used FROM email_verifications WHERE email = ? LIMIT 1',
      [normalizedEmail],
    );
    if (!rows.length) return res.status(400).json({ message: 'No verification requested for that email.' });

    const row = rows[0];
    if (row.used) return res.status(400).json({ message: 'Code already used.' });
    if (String(row.code) !== String(code)) return res.status(400).json({ message: 'Invalid code.' });
    const now = new Date();
    if (new Date(row.expires_at) < now) return res.status(400).json({ message: 'Code expired.' });

    await pool.query('UPDATE email_verifications SET used = 1, verified_at = ? WHERE id = ?', [new Date(), row.id]);
    return res.json({ message: 'Verified.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
});

// set password after verification (creates minimal user if not exists)
router.post('/set-password', async (req, res) => {
  const { email, password, firstName, middleInitial, lastName } = req.body ?? {};
  const normalizedEmail = normalizeString(email);
  if (!normalizedEmail || !normalizeString(password)) return res.status(400).json({ message: 'Email and password are required.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // ensure verified within TTL (used=1 and verified_at not null)
    const [verRows] = await connection.query(
      'SELECT id, verified_at FROM email_verifications WHERE email = ? AND used = 1 LIMIT 1',
      [normalizedEmail],
    );
    if (!verRows.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Email not verified.' });
    }

    // upsert user entry
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [existing] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    let userId = null;
    
    if (existing.length) {
      userId = existing[0].id;
      // Update password in user_auth
      await connection.query(
        `INSERT INTO user_auth (user_id, password_hash) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
        [userId, passwordHash]
      );
      
      // Update profile if names provided
      if (firstName || lastName) {
        await connection.query(
          `INSERT INTO user_profiles (user_id, first_name, middle_initial, last_name) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), middle_initial = VALUES(middleInitial), last_name = VALUES(lastName)`,
          [userId, normalizeString(firstName), normalizeString(middleInitial), normalizeString(lastName)]
        );
      }

      // Force update status to incomplete if it is currently pending (default)
      // This ensures users who exist but haven't completed the full profile are marked correctly
      await connection.query(
        `UPDATE users SET status = 'incomplete' WHERE id = ? AND status = 'pending'`,
        [userId]
      );
    } else {
      const digitalId = generateDigitalId('PENDING');
      const userUuid = crypto.randomUUID();

      // 1. Insert into users
      const [result] = await connection.query(
        `INSERT INTO users (uuid, email, status, membership_no, created_at, updated_at)
         VALUES (?, ?, 'incomplete', ?, NOW(), NOW())`,
        [userUuid, normalizedEmail, digitalId],
      );
      userId = result.insertId;

      // 2. Insert into user_profiles
      await connection.query(
        `INSERT INTO user_profiles (user_id, first_name, middle_initial, last_name)
         VALUES (?, ?, ?, ?)`,
        [userId, normalizeString(firstName), normalizeString(middleInitial), normalizeString(lastName)]
      );

      // 3. Insert into user_auth
      await connection.query(
        `INSERT INTO user_auth (user_id, password_hash)
         VALUES (?, ?)`,
        [userId, passwordHash]
      );

      // 4. Insert empty emergency contact
      await connection.query(
        `INSERT INTO user_emergency_contacts (user_id, full_name, relationship, phone, address)
         VALUES (?, '', '', '', '')`,
        [userId],
      );
    }

    await connection.commit();
    return res.json({ message: 'Password set.', id: userId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Failed to set password.' });
  } finally {
    connection.release();
  }
});

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body ?? {};

  if (!normalizeString(identifier) || !normalizeString(password)) {
    return res.status(400).json({ message: 'Credentials are required.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         u.id,
         up.first_name AS firstName,
         up.middle_initial AS middleInitial,
         up.last_name AS lastName,
         u.email,
         u.phone,
         ua.password_hash AS passwordHash,
         up.address_line1 AS address,
         up.date_of_birth AS dateOfBirth,
         up.gender,
         up.religion,
         up.education,
         ue.company AS company,
         ue.position,
         ue.department,
         u.membership_no AS digitalId,
         u.status AS isApproved,
         ec.full_name AS emergencyContactName,
         ec.relationship AS emergencyContactRelationship,
         ec.phone AS emergencyContactPhone,
         ec.address AS emergencyContactAddress
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       LEFT JOIN user_auth ua ON ua.user_id = u.id
       LEFT JOIN user_employment ue ON ue.user_id = u.id
       LEFT JOIN user_emergency_contacts ec ON ec.user_id = u.id
       WHERE u.email = ? OR u.phone = ?
       LIMIT 1`,
      [identifier, identifier],
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const userRow = rows[0];

    if (!userRow.passwordHash) {
      return res.status(403).json({ message: 'Password setup required. Please complete verification.' });
    }

    const passwordMatches = await bcrypt.compare(password, userRow.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    res.json({ user: sanitizeUser(mapUserRow(userRow)) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});
export default router;
