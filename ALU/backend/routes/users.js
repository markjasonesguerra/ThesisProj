import express from 'express';
import { runQuery } from '../db.js';
import { mapUserRow, normalizeString, normalizeNumber } from '../utils.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const rows = await runQuery(
      `SELECT
         u.id,
         u.first_name AS firstName,
         u.middle_initial AS middleInitial,
         u.last_name AS lastName,
         u.email,
         u.phone,
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
       WHERE u.id = ?
       LIMIT 1`,
      [req.params.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ user: mapUserRow(rows[0]) });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch user.', error: error.message });
  }
});

router.get('/:id/dues', async (req, res) => {
  try {
    const dues = await runQuery(
      `SELECT id, billing_period AS billingPeriod, amount, status, paid_at AS paidAt
         FROM dues WHERE user_id = ? ORDER BY billing_period DESC`,
      [req.params.id],
    );

    res.json({ dues });
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch dues.', error: error.message });
  }
});

router.post('/:id/dues', async (req, res) => {
  const { billingPeriod, amount, status } = req.body ?? {};
  if (!normalizeString(billingPeriod) || !normalizeNumber(amount)) {
    return res.status(400).json({ message: 'Billing period and amount are required.' });
  }

  try {
    const result = await runQuery(
      `INSERT INTO dues (user_id, billing_period, amount, status)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, billingPeriod, Number(amount), status ?? 'pending'],
    );

    res.status(201).json({ id: result.insertId, message: 'Dues record created.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create dues record.', error: error.message });
  }
});

export default router;
