import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { normalizeString, normalizeNumber, generateDigitalId, sanitizeUser, SALT_ROUNDS, mapUserRow } from '../utils.js';

const router = express.Router();

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
