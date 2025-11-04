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
  if (!normalizeString(email)) return res.status(400).json({ message: 'Email is required.' });

  try {
    // check if a user already exists with password (complete account)
    const [existing] = await pool.query('SELECT id, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length && existing[0].password_hash) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + (Number(process.env.VERIFICATION_TTL_MS ?? 15 * 60 * 1000))).toISOString().slice(0, 19).replace('T', ' ');

    // upsert verification record
    await pool.query(
      `INSERT INTO email_verifications (email, code, expires_at, used)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), used = 0, verified_at = NULL, created_at = CURRENT_TIMESTAMP`,
      [email, code, expiresAt],
    );

    await sendVerificationEmail(email, code);
    return res.json({ message: 'Verification code sent.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to send verification code.' });
  }
});

// verify code
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body ?? {};
  if (!normalizeString(email) || !normalizeString(code)) return res.status(400).json({ message: 'Email and code are required.' });

  try {
    const [rows] = await pool.query(
      'SELECT id, code, expires_at, used FROM email_verifications WHERE email = ? LIMIT 1',
      [email],
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
  const { email, password, firstName, lastName } = req.body ?? {};
  if (!normalizeString(email) || !normalizeString(password)) return res.status(400).json({ message: 'Email and password are required.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // ensure verified within TTL (used=1 and verified_at not null)
    const [verRows] = await connection.query(
      'SELECT id, verified_at FROM email_verifications WHERE email = ? AND used = 1 LIMIT 1',
      [email],
    );
    if (!verRows.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Email not verified.' });
    }

    // upsert user entry
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [existing] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    let userId = null;
    if (existing.length) {
      userId = existing[0].id;
      await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    } else {
      const membershipDate = new Date();
      const digitalId = generateDigitalId(null);
      const [result] = await connection.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, membership_date, digital_id, is_approved)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [normalizeString(firstName) ?? null, normalizeString(lastName) ?? null, normalizeString(email), passwordHash, membershipDate, digitalId],
      );
      userId = result.insertId;
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
         u.first_name AS firstName,
         u.middle_initial AS middleInitial,
         u.last_name AS lastName,
         u.email,
         u.phone,
         u.password_hash AS passwordHash,
         u.address,
         u.date_of_birth AS dateOfBirth,
         u.place_of_birth AS placeOfBirth,
         u.marital_status AS maritalStatus,
         u.number_of_children AS numberOfChildren,
         u.gender,
         u.religion,
         u.education,
         u.company,
         u.position,
         u.department,
         u.years_employed AS yearsEmployed,
         u.union_affiliation AS unionAffiliation,
         u.union_position AS unionPosition,
         u.membership_date AS membershipDate,
         u.digital_id AS digitalId,
         u.profile_picture_url AS profilePictureUrl,
         u.is_approved AS isApproved,
         ec.name AS emergencyContactName,
         ec.relationship AS emergencyContactRelationship,
         ec.phone AS emergencyContactPhone,
         ec.address AS emergencyContactAddress
       FROM users u
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
