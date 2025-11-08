import { runQuery } from '../../db.js';
import {
  MEMBER_STATUS_LABEL,
  toMemberStatus,
  toDuesStatus,
  safeNumber,
  formatCurrency,
} from './helpers.js';

const registerMemberRoutes = (router) => {
  router.get('/members', async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 8));
    const offset = (page - 1) * pageSize;

    const filters = [];
    const params = [];

    const normalizedQuery = req.query.query?.trim();
    if (normalizedQuery) {
      const like = `%${normalizedQuery.toLowerCase()}%`;
      filters.push(`(
        LOWER(u.email) LIKE ?
        OR LOWER(u.membership_no) LIKE ?
        OR LOWER(CONCAT_WS(' ', up.first_name, up.middle_initial, up.last_name)) LIKE ?
      )`);
      params.push(like, like, like);
    }

    if (req.query.company) {
      filters.push('ue.company = ?');
      params.push(req.query.company);
    }

    if (req.query.union) {
      filters.push('ue.union_affiliation = ?');
      params.push(req.query.union);
    }

    if (req.query.status) {
      const invertedStatus = Object.entries(MEMBER_STATUS_LABEL)
        .find(([, label]) => label === req.query.status)?.[0];
      if (invertedStatus) {
        filters.push('u.status = ?');
        params.push(invertedStatus);
      }
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    try {
      const members = await runQuery(
        `SELECT
           u.id,
           u.uuid,
           u.membership_no AS membershipNo,
           u.email,
           u.status AS accountStatus,
           DATE(u.created_at) AS registeredDate,
           COALESCE(ue.company, '') AS company,
           COALESCE(ue.union_affiliation, '') AS unionAffiliation,
           CONCAT_WS(' ', up.first_name, up.middle_initial, up.last_name) AS fullName,
           (SELECT dl.status FROM dues_ledger dl WHERE dl.user_id = u.id ORDER BY dl.due_date DESC LIMIT 1) AS duesStatus,
           CASE
             WHEN di.is_active = 1 THEN 'Issued'
             WHEN di.card_number IS NOT NULL THEN 'Pending Activation'
             ELSE 'Not Issued'
           END AS idStatus
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN user_employment ue ON ue.user_id = u.id
         LEFT JOIN digital_ids di ON di.user_id = u.id
         ${whereClause}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?;`,
        [...params, pageSize, offset],
      );

      const totalRows = await runQuery(
        `SELECT COUNT(DISTINCT u.id) AS total
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN user_employment ue ON ue.user_id = u.id
         ${whereClause};`,
        params,
      );

      const total = safeNumber(totalRows[0]?.total);
      const pageCount = Math.max(1, Math.ceil(total / pageSize));

      const companies = await runQuery(
        `SELECT DISTINCT company
           FROM user_employment
           WHERE company IS NOT NULL AND company <> ''
           ORDER BY company ASC;`,
      );

      const unions = await runQuery(
        `SELECT DISTINCT union_affiliation AS unionAffiliation
           FROM user_employment
           WHERE union_affiliation IS NOT NULL AND union_affiliation <> ''
           ORDER BY union_affiliation ASC;`,
      );

      const results = members.map((row) => ({
        id: row.id,
        uuid: row.uuid,
        memberID: row.membershipNo ?? `MEM-${String(row.id).padStart(5, '0')}`,
        fullName: row.fullName ?? 'Unknown Member',
        email: row.email,
        company: row.company,
        unionAffiliation: row.unionAffiliation,
        status: toMemberStatus(row.accountStatus),
        duesStatus: toDuesStatus(row.duesStatus),
        idStatus: row.idStatus,
        registeredDate: row.registeredDate,
      }));

      res.json({
        metadata: {
          total,
          page,
          pageSize,
          pageCount,
          filters: {
            companies: companies.map((item) => item.company),
            unions: unions.map((item) => item.unionAffiliation),
            statuses: [...new Set(Object.values(MEMBER_STATUS_LABEL))],
          },
        },
        results,
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load members directory', error: error.message });
    }
  });

  router.get('/members/:memberId', async (req, res) => {
    try {
      const { memberId } = req.params;

      const memberRows = await runQuery(
        `SELECT
           u.id,
           u.uuid,
           u.email,
           u.phone,
           u.status,
           u.membership_no AS membershipNo,
           u.last_login_at AS lastLoginAt,
           u.created_at AS createdAt,
           u.updated_at AS updatedAt,
           up.first_name AS firstName,
           up.middle_initial AS middleInitial,
           up.last_name AS lastName,
           up.suffix,
           up.date_of_birth AS dateOfBirth,
           up.address_line1 AS addressLine1,
           up.address_line2 AS addressLine2,
           up.city,
           up.province,
           up.postal_code AS postalCode,
           ue.company,
           ue.department,
           ue.position,
           ue.employment_status AS employmentStatus,
           ue.years_employed AS yearsEmployed,
           ue.payroll_number AS payrollNumber,
           ue.union_position AS unionPosition,
           ue.union_affiliation AS unionAffiliation,
           di.card_number AS cardNumber,
           di.is_active AS isCardActive,
           di.issued_at AS idIssuedAt
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN user_employment ue ON ue.user_id = u.id
         LEFT JOIN digital_ids di ON di.user_id = u.id
         WHERE u.id = ? OR u.uuid = ? OR u.membership_no = ?
         LIMIT 1;`,
        [memberId, memberId, memberId],
      );

      const memberRow = memberRows[0];
      if (!memberRow) {
        res.status(404).json({ message: 'Member not found' });
        return;
      }

      const addressParts = [
        memberRow.addressLine1,
        memberRow.addressLine2,
        memberRow.city,
        memberRow.province,
        memberRow.postalCode,
      ].filter(Boolean);
      const address = addressParts.join(', ');

      const [emergencyContact] = await runQuery(
        `SELECT full_name AS fullName, relationship, phone
           FROM user_emergency_contacts
           WHERE user_id = ?
           ORDER BY is_primary DESC, id ASC
           LIMIT 1;`,
        [memberRow.id],
      );

      const duesRows = await runQuery(
        `SELECT
           dl.id,
           dl.billing_period AS billingPeriod,
           dl.amount,
           dl.status,
           dl.due_date AS dueDate,
           dl.paid_at AS paidAt,
           dl.reference_no AS referenceNo
         FROM dues_ledger dl
         WHERE dl.user_id = ?
         ORDER BY dl.due_date DESC, dl.created_at DESC;`,
        [memberRow.id],
      );

      const paymentRows = await runQuery(
        `SELECT
           dp.id,
           dp.ledger_id AS ledgerId,
           dp.method,
           dp.amount,
           dp.paid_at AS paidAt,
           dp.receipt_path AS receiptPath
         FROM dues_payments dp
         WHERE dp.ledger_id IN (
           SELECT dl.id FROM dues_ledger dl WHERE dl.user_id = ?
         );`,
        [memberRow.id],
      );

      const documentRows = await runQuery(
        `SELECT
           id,
           category,
           file_path AS filePath,
           mime_type AS mimeType,
           uploaded_at AS uploadedAt,
           verified_at AS verifiedAt
         FROM user_documents
         WHERE user_id = ?
         ORDER BY uploaded_at DESC, id DESC;`,
        [memberRow.id],
      );

      const methodLabels = {
        payroll: 'Payroll deduction',
        cash: 'Cash',
        transfer: 'Bank transfer',
        online: 'Online payment',
      };

      const paymentByLedger = paymentRows.reduce((accumulator, row) => {
        if (!accumulator[row.ledgerId]) {
          accumulator[row.ledgerId] = [];
        }
        accumulator[row.ledgerId].push(row);
        return accumulator;
      }, {});

      const paymentHistory = duesRows.map((ledger) => {
        const payments = paymentByLedger[ledger.id] ?? [];
        const primaryPayment = payments[0] ?? null;
        const statusLabel = (() => {
          if (ledger.status === 'paid') return 'Cleared';
          if (ledger.status === 'overdue') return 'Overdue';
          return 'Pending';
        })();
        const methodLabel = primaryPayment ? methodLabels[primaryPayment.method] ?? primaryPayment.method : 'Pending remittance';

        return {
          date: primaryPayment?.paidAt ?? ledger.dueDate,
          amount: formatCurrency(ledger.amount),
          method: methodLabel,
          status: statusLabel,
          reference: ledger.referenceNo ?? primaryPayment?.id ?? null,
        };
      });

      const totalPaidAmount = paymentRows.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      const outstandingAmount = duesRows
        .filter((ledger) => ledger.status !== 'paid')
        .reduce((sum, ledger) => sum + (Number(ledger.amount) || 0), 0);

      const nextDueDate = duesRows
        .filter((ledger) => ledger.status !== 'paid')
        .map((ledger) => ledger.dueDate)
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b))[0] ?? null;

      const duesStatus = (() => {
        if (!duesRows.length) return 'Pending';
        if (duesRows.some((ledger) => ledger.status === 'overdue')) return 'Overdue';
        if (duesRows.some((ledger) => ledger.status === 'pending')) return 'Pending';
        return 'Paid';
      })();

      const documentTypeLabels = {
        id_photo: { name: 'ID photo', type: 'Identification' },
        government_id: { name: 'Government ID', type: 'Identification' },
        employment_proof: { name: 'Employment certificate', type: 'Employment' },
        other: { name: 'Supporting document', type: 'Document' },
      };

      const documents = documentRows.map((doc) => {
        const label = documentTypeLabels[doc.category] ?? { name: doc.category, type: 'Document' };
        return {
          id: doc.id,
          name: label.name,
          type: label.type,
          uploadedAt: doc.uploadedAt,
          verifiedAt: doc.verifiedAt,
          filePath: doc.filePath,
          mimeType: doc.mimeType,
          status: doc.verifiedAt ? 'Verified' : 'Pending review',
        };
      });

      const member = {
        id: memberRow.id,
        uuid: memberRow.uuid,
        memberID: memberRow.membershipNo ?? `MEM-${String(memberRow.id).padStart(5, '0')}`,
        fullName: [memberRow.firstName, memberRow.middleInitial, memberRow.lastName, memberRow.suffix]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Unnamed member',
        email: memberRow.email,
        mobile: memberRow.phone,
        status: toMemberStatus(memberRow.status),
        accountStatus: memberRow.status,
        unionAffiliation: memberRow.unionAffiliation,
        unionPosition: memberRow.unionPosition,
        company: memberRow.company,
        department: memberRow.department,
        position: memberRow.position,
        employmentStatus: memberRow.employmentStatus,
        yearsEmployed: memberRow.yearsEmployed,
        payrollNumber: memberRow.payrollNumber,
        registeredDate: memberRow.createdAt,
        joinDate: memberRow.createdAt,
        lastLoginAt: memberRow.lastLoginAt,
        address,
        dateOfBirth: memberRow.dateOfBirth,
        digitalID: memberRow.cardNumber ?? 'Pending issuance',
        digitalIdStatus: memberRow.isCardActive ? 'Active' : 'Pending',
        duesStatus,
        totalPaid: formatCurrency(totalPaidAmount),
        outstanding: formatCurrency(outstandingAmount),
        nextDueDate,
        paymentHistory,
        documents,
        emergencyContact: emergencyContact
          ? `${emergencyContact.fullName} (${emergencyContact.relationship}) • ${emergencyContact.phone}`
          : null,
        membershipType: memberRow.unionAffiliation ? 'Regular' : 'Associate',
      };

      res.json({ member });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load member profile', error: error.message });
    }
  });
};

export default registerMemberRoutes;
