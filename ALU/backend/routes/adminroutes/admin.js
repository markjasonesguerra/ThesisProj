import express from 'express';
import { runQuery } from '../../db.js';
import {
  MEMBER_STATUS_LABEL,
  APPROVAL_STATUS_LABEL,
  APPROVAL_STATUS_TONE,
  DUES_STATUS_LABEL,
  priorityConfidence,
  toMemberStatus,
  toDuesStatus,
  toApprovalStatus,
  computeTimeAgo,
  safeNumber,
  formatDisplayDate,
  formatCurrency,
} from './helpers.js';
import registerDashboardRoute from './dashboard.js';
import registerMemberRoutes from './members.js';

const router = express.Router();

registerDashboardRoute(router);
registerMemberRoutes(router);

router.get('/approvals/final-queue', async (_req, res) => {
  try {
    const approvals = await runQuery(`
      SELECT
        aq.id,
        aq.queue_type AS queueType,
        aq.status,
        aq.created_at AS createdAt,
        aq.updated_at AS updatedAt,
        aq.reference_table AS referenceTable,
        aq.reference_id AS referenceId,
        t.ticket_no AS ticketNo,
        t.category,
        t.priority,
        t.status AS ticketStatus,
        t.user_id AS ticketUserId,
        CONCAT_WS(' ', mp.first_name, mp.last_name) AS memberName,
        COALESCE(ue.company, '') AS employer,
        COALESCE(u.membership_no, CONCAT('member-', LPAD(u.id, 4, '0'), '-ALU')) AS memberAlias,
        CONCAT_WS(' ', pa.first_name, pa.last_name) AS proponentName,
        pr.name AS proponentRole
      FROM approval_queues aq
      LEFT JOIN tickets t ON t.id = aq.reference_id AND aq.reference_table = 'tickets'
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN user_profiles mp ON mp.user_id = u.id
      LEFT JOIN user_employment ue ON ue.user_id = u.id
      LEFT JOIN admins pa ON pa.id = t.assigned_to
      LEFT JOIN admin_role_assignments pra ON pra.admin_id = pa.id
      LEFT JOIN admin_roles pr ON pr.id = pra.role_id
      WHERE aq.queue_type IN ('registration','id_card','benefit','dues_adjustment')
      ORDER BY aq.updated_at DESC, aq.created_at DESC
      LIMIT 50;
    `);

    const items = approvals.map((row) => {
      const statusLabel = toApprovalStatus(row.status);
      return {
        id: row.id,
        ticketId: row.ticketNo ?? row.referenceId,
        member: row.memberAlias ?? row.memberName ?? 'Unknown member',
        category: row.category ?? row.queueType,
        proponent: row.proponentName ?? 'Unassigned',
        proponentRole: row.proponentRole ?? 'Staff',
        aiConfidence: priorityConfidence(row.priority),
        timeSince: computeTimeAgo(row.updatedAt ?? row.createdAt),
        updatedAt: row.updatedAt,
        createdAt: row.createdAt,
        status: statusLabel,
        tone: APPROVAL_STATUS_TONE[statusLabel] ?? 'admin-chip',
      };
    });

    const stats = {
      pendingFinal: items.filter((item) => item.status === 'Pending Final Approval').length,
      approvedToday: approvals.filter((row) => row.status === 'approved' && row.updatedAt && new Date(row.updatedAt).toDateString() === new Date().toDateString()).length,
      returned: items.filter((item) => item.status === 'Returned to Proponent').length,
      rejected: items.filter((item) => item.status === 'Rejected').length,
    };

    res.json({ stats, items });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load approval queue', error: error.message });
  }
});

router.get('/dues/overview', async (_req, res) => {
  try {
    const metricsRows = await runQuery(`
      SELECT
        COALESCE((SELECT SUM(amount) FROM dues_payments WHERE paid_at >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE()) - 1 DAY)), 0) AS collectedThisMonth,
        COALESCE((SELECT SUM(amount) FROM dues_ledger WHERE status = 'pending'), 0) AS pendingPayroll,
        COALESCE((SELECT SUM(amount) FROM dues_ledger WHERE status = 'overdue'), 0) AS arrears,
        COALESCE((SELECT COUNT(*) FROM users WHERE status = 'approved'), 0) AS activeMembers
    `);

    const metricsRow = metricsRows[0] ?? {};

    const payrollBatches = await runQuery(`
      SELECT
        DATE(dl.due_date) AS dueDate,
        COALESCE(ue.company, 'Unspecified Employer') AS employer,
        SUM(dl.amount) AS totalAmount,
        COUNT(DISTINCT dl.user_id) AS memberCount
      FROM dues_ledger dl
      LEFT JOIN users u ON u.id = dl.user_id
      LEFT JOIN user_employment ue ON ue.user_id = u.id
      WHERE dl.status = 'pending'
      GROUP BY dueDate, employer
      ORDER BY dueDate ASC
      LIMIT 12;
    `);

    const arrears = await runQuery(`
      SELECT
        dl.id,
        dl.user_id AS userId,
        CONCAT_WS(' ', up.first_name, up.last_name) AS fullName,
        COALESCE(ue.company, 'Unspecified Employer') AS employer,
        DATEDIFF(CURDATE(), dl.due_date) AS daysOverdue,
        dl.amount,
        u.membership_no AS membershipNo
      FROM dues_ledger dl
      LEFT JOIN users u ON u.id = dl.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_employment ue ON ue.user_id = u.id
      WHERE dl.status = 'overdue'
      ORDER BY dl.due_date ASC
      LIMIT 15;
    `);

    const metrics = [
      { id: 'collected', label: 'Collected this month', value: safeNumber(metricsRow.collectedThisMonth), tone: 'is-green' },
      { id: 'pending', label: 'Pending payroll', value: safeNumber(metricsRow.pendingPayroll), tone: safeNumber(metricsRow.pendingPayroll) > 0 ? 'is-orange' : 'is-green' },
      { id: 'arrears', label: 'Arrears', value: safeNumber(metricsRow.arrears), tone: safeNumber(metricsRow.arrears) > 0 ? 'is-red' : 'is-green' },
      { id: 'members', label: 'Active members', value: safeNumber(metricsRow.activeMembers), tone: 'is-blue' },
    ];

    const payroll = payrollBatches.map((batch, index) => {
      const dueDate = batch.dueDate ? new Date(batch.dueDate) : null;
      const today = new Date();
      let status = 'Scheduled';
      if (dueDate) {
        if (dueDate < today) {
          status = 'Awaiting file';
        } else if ((dueDate - today) / (1000 * 60 * 60 * 24) <= 2) {
          status = 'Processing';
        }
      }

      return {
        id: `batch-${String(index + 1).padStart(2, '0')}`,
        employer: batch.employer,
        amount: safeNumber(batch.totalAmount),
        dueDate: batch.dueDate,
        status,
        memberCount: safeNumber(batch.memberCount),
      };
    });

    const arrearsMembers = arrears.map((item) => ({
      id: item.id,
      memberAlias: item.membershipNo ?? `member-${String(item.userId).padStart(4, '0')}-ALU`,
      name: item.fullName ?? 'Unknown Member',
      employer: item.employer,
      daysOverdue: safeNumber(item.daysOverdue),
      amount: safeNumber(item.amount),
    }));

    const guidance = [
      'Verify payroll batch files within 12 hours of receipt.',
      'Escalate any arrears beyond 45 days to the finance committee.',
      'Send monthly statements to employers summarizing deductions and remittances.',
    ];

    res.json({ metrics, payroll, arrears: arrearsMembers, guidance });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load dues and finance data', error: error.message });
  }
});

router.get('/registrations/review', async (_req, res) => {
  try {
    const rows = await runQuery(`
      SELECT
        u.id,
        up.first_name AS firstName,
        up.middle_initial AS middleInitial,
        up.last_name AS lastName,
        u.email,
        u.phone,
        ue.company,
        ue.department,
        ue.position,
        ue.union_affiliation AS unionAffiliation,
        CONCAT_WS(', ', NULLIF(up.address_line1, ''), NULLIF(up.city, ''), NULLIF(up.province, '')) AS address,
        ue.years_employed AS yearsEmployed,
        u.created_at AS createdAt,
        u.status AS accountStatus,
        rf.submitted_at AS submittedAt,
        rf.remarks AS registrationRemarks,
        rf.address_proof AS addressProof,
        rf.employment_proof AS employmentProof,
        rf.id_document AS idDocument,
        COALESCE(dup.email_count, 0) AS emailDuplicateCount,
        COALESCE(docStats.document_count, 0) AS documentCount,
        COALESCE(docStats.verified_count, 0) AS verifiedDocumentCount
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_employment ue ON ue.user_id = u.id
      LEFT JOIN registration_forms rf ON rf.user_id = u.id
      LEFT JOIN (
        SELECT email, COUNT(*) AS email_count
        FROM users
        WHERE email IS NOT NULL AND email <> ''
        GROUP BY email
        HAVING COUNT(*) > 1
      ) dup ON dup.email = u.email
      LEFT JOIN (
        SELECT user_id,
               COUNT(*) AS document_count,
               SUM(CASE WHEN verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified_count
        FROM user_documents
        GROUP BY user_id
      ) docStats ON docStats.user_id = u.id
      WHERE u.status IN ('pending', 'email_verified', 'under_review')
         OR rf.id IS NOT NULL
      ORDER BY COALESCE(rf.submitted_at, u.created_at) DESC;
    `);

    const userIds = rows.map((row) => row.id);
    let documentsByUser = {};

    if (userIds.length) {
      const placeholders = userIds.map(() => '?').join(', ');
      const documentRows = await runQuery(
        `SELECT
           id,
           user_id AS userId,
           category,
           file_path AS filePath,
           mime_type AS mimeType,
           uploaded_at AS uploadedAt,
           verified_at AS verifiedAt
         FROM user_documents
         WHERE user_id IN (${placeholders})`,
        userIds,
      );

      documentsByUser = documentRows.reduce((accumulator, doc) => {
        if (!accumulator[doc.userId]) {
          accumulator[doc.userId] = [];
        }
        accumulator[doc.userId].push(doc);
        return accumulator;
      }, {});
    }

    const queue = rows.map((row) => {
      const fullName = [row.firstName, row.middleInitial, row.lastName].filter(Boolean).join(' ').trim();
      const submittedDate = row.submittedAt ?? row.createdAt;
      const duplicateFlag = Number(row.emailDuplicateCount ?? 0) > 1;
      const hasEmployment = Boolean(row.company) && Boolean(row.position);
      const userDocs = documentsByUser[row.id] ?? [];

      const findDocByCategory = (category) => userDocs.find((doc) => doc.category === category) ?? null;
      const idPhotoDoc = findDocByCategory('id_photo');
      const employmentDoc = findDocByCategory('employment_proof');

      const registrationFormEntry = {
        key: 'registration_form',
        label: 'Registration form',
        filePath: row.addressProof ?? null,
        source: row.addressProof ? 'registration_forms' : null,
        verifiedAt: null,
      };

      const employmentEntry = {
        key: 'employment_certificate',
        label: 'Employment certificate',
        filePath: employmentDoc?.filePath ?? row.employmentProof ?? null,
        source: employmentDoc ? 'user_documents' : row.employmentProof ? 'registration_forms' : null,
        verifiedAt: employmentDoc?.verifiedAt ?? null,
      };

      const idPhotoEntry = {
        key: 'id_photo',
        label: 'ID photo',
        filePath: idPhotoDoc?.filePath ?? row.idDocument ?? null,
        source: idPhotoDoc ? 'user_documents' : row.idDocument ? 'registration_forms' : null,
        verifiedAt: idPhotoDoc?.verifiedAt ?? null,
      };

      const documentFiles = [registrationFormEntry, employmentEntry, idPhotoEntry].map((entry) => ({
        ...entry,
        status: entry.filePath
          ? entry.verifiedAt
            ? 'Uploaded (verified)'
            : 'Uploaded (pending verification)'
          : 'Missing upload',
      }));

      const documentsComplete = Boolean(employmentEntry.filePath && idPhotoEntry.filePath);
      const phoneValid = Boolean(row.phone);
      const emailValid = Boolean(row.email && row.email.includes('@'));
      const hasUnion = Boolean(row.unionAffiliation);
      const statusLabel = (() => {
        switch (row.accountStatus) {
          case 'under_review':
            return 'Under Review';
          case 'email_verified':
            return 'Email Verified';
          default:
            return 'Pending Review';
        }
      })();

      const priority = (() => {
        if (row.accountStatus === 'under_review' || duplicateFlag) return 'High';
        if (!documentsComplete || !phoneValid) return 'Normal';
        return 'Normal';
      })();

      const timeline = [];
      if (submittedDate) {
        timeline.push({ time: formatDisplayDate(submittedDate), detail: 'Registration submitted by member' });
      }
      if (row.accountStatus === 'email_verified') {
        timeline.push({ time: formatDisplayDate(row.createdAt), detail: 'Email verification completed' });
      }
      if (row.accountStatus === 'under_review') {
        timeline.push({ time: formatDisplayDate(row.createdAt), detail: 'Queued for manual review' });
      }
      if (row.registrationRemarks) {
        timeline.push({ time: 'Notes', detail: row.registrationRemarks });
      }

      const riskNotes = [];
      if (duplicateFlag) {
        riskNotes.push('Potential duplicate detected based on email');
      }
      if (!phoneValid) {
        riskNotes.push('Phone number missing or invalid');
      }
      if (!documentsComplete || !hasEmployment) {
        riskNotes.push('Employment documentation incomplete');
      }
      if (!riskNotes.length) {
        riskNotes.push('No risk indicators detected by system checks');
      }

      return {
        id: `REG-${String(row.id).padStart(6, '0')}`,
        userId: row.id,
        fullName: fullName || 'Pending Member',
        email: row.email,
        phone: row.phone,
        company: row.company,
        department: row.department,
        position: row.position,
        unionAffiliation: row.unionAffiliation,
        address: row.address,
        yearsEmployed: row.yearsEmployed,
        membershipType: hasUnion ? 'Regular' : 'Associate',
        payrollConsent: null,
        submittedDate,
        status: statusLabel,
        priority,
        duplicateFlag,
        documents: {
          registrationForm: registrationFormEntry.filePath ? 'Uploaded' : 'Missing',
          employmentCertificate: employmentEntry.filePath ? 'Uploaded' : 'Missing',
          idPhoto: idPhotoEntry.filePath ? 'Uploaded' : 'Pending upload',
          unionForm: hasUnion ? 'Union affiliation stated' : 'Pending confirmation',
        },
        documentFiles,
        validationChecks: {
          emailValid,
          phoneValid,
          documentsComplete,
          companyVerified: Boolean(row.company),
          noDuplicates: !duplicateFlag,
        },
        riskNotes,
        timeline,
      };
    });

    const summary = {
      totalPending: queue.length,
      highPriority: queue.filter((item) => item.priority === 'High').length,
      duplicates: queue.filter((item) => item.duplicateFlag).length,
      docIssues: queue.filter((item) => !item.validationChecks.documentsComplete).length,
    };

    res.json({ summary, queue });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load registration review data', error: error.message });
  }
});

export default router;
