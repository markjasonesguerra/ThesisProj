import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

export const normalizeString = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

export const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const generateDigitalId = (company) => {
  const now = new Date();
  const year = now.getFullYear();
  const prefix = (company || 'ALU')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');
  const randomSequence = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  return `ALU-${prefix}-${year}-${randomSequence}`;
};

export const mapUserRow = (row) => {
  if (!row) return null;
  const emergencyContact = row.emergencyContactName
    ? {
        name: row.emergencyContactName,
        relationship: row.emergencyContactRelationship,
        phone: row.emergencyContactPhone,
        address: row.emergencyContactAddress,
      }
    : null;

  return {
    id: row.id,
    firstName: row.firstName,
    middleInitial: row.middleInitial,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    address: row.address,
    dateOfBirth: row.dateOfBirth,
    placeOfBirth: row.placeOfBirth,
    maritalStatus: row.maritalStatus,
    numberOfChildren: row.numberOfChildren,
    gender: row.gender,
    religion: row.religion,
    education: row.education,
    company: row.company,
    position: row.position,
    department: row.department,
    yearsEmployed: row.yearsEmployed,
    unionAffiliation: row.unionAffiliation,
    unionPosition: row.unionPosition,
    membershipDate: row.membershipDate,
    digitalId: row.digitalId,
    profilePicture: row.profilePictureUrl,
    isApproved: Boolean(row.isApproved),
    emergencyContact,
  };
};

export const sanitizeUser = (row) => {
  if (!row) return null;
  const { passwordHash, ...rest } = row;
  return rest;
};
