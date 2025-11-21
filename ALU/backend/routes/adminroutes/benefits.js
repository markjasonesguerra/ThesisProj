import { runQuery } from '../../db.js';
import { formatCurrency } from './helpers.js';

const registerBenefitsRoutes = (router) => {
  // list benefit programs
  router.get('/benefits/programs', async (_req, res) => {
    try {
      const rows = await runQuery(
        `SELECT id, title, description, tag, eligibility, is_active AS isActive, created_at AS createdAt
         FROM benefit_programs
         ORDER BY created_at DESC, id DESC;`,
      );

      const programs = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        tag: r.tag,
        eligibility: r.eligibility,
        isActive: Boolean(r.isActive),
        createdAt: r.createdAt,
      }));

      res.json({ programs });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load benefit programs', error: error.message });
    }
  });

  // list benefit requests
  router.get('/benefits/requests', async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const filters = [];
    const params = [];

    if (req.query.status) {
      filters.push('br.status = ?');
      params.push(req.query.status);
    }

    if (req.query.programId) {
      filters.push('br.program_id = ?');
      params.push(req.query.programId);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    try {
      const rows = await runQuery(
        `SELECT
           br.id,
           br.user_id AS userId,
           br.program_id AS programId,
           br.status,
           br.amount_requested AS amountRequested,
           br.justification,
           br.submitted_at AS submittedAt,
           CONCAT_WS(' ', up.first_name, up.last_name) AS userName,
           u.email AS userEmail,
           p.title AS programTitle
         FROM benefit_requests br
         LEFT JOIN users u ON u.id = br.user_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN benefit_programs p ON p.id = br.program_id
         ${where}
         ORDER BY br.submitted_at DESC, br.id DESC
         LIMIT ? OFFSET ?;`,
        [...params, pageSize, offset],
      );

      const totalRows = await runQuery(`SELECT COUNT(*) AS total FROM benefit_requests br ${where};`, params);
      const total = Number(totalRows[0]?.total ?? 0);

      const results = rows.map((r) => ({
        id: r.id,
        user: { id: r.userId, name: r.userName, email: r.userEmail },
        program: { id: r.programId, title: r.programTitle },
        status: r.status,
        amountRequested: formatCurrency(r.amountRequested),
        justification: r.justification,
        submittedAt: r.submittedAt,
      }));

      res.json({ meta: { total, page, pageSize }, results });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load benefit requests', error: error.message });
    }
  });

  router.get('/benefits/requests/:id', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    try {
      const rows = await runQuery(
        `SELECT
           br.*, CONCAT_WS(' ', up.first_name, up.last_name) AS userName, u.email AS userEmail, p.title AS programTitle
         FROM benefit_requests br
         LEFT JOIN users u ON u.id = br.user_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN benefit_programs p ON p.id = br.program_id
         WHERE br.id = ?
         LIMIT 1;`,
        [id],
      );

      const row = rows[0];
      if (!row) {
        res.status(404).json({ message: 'Request not found' });
        return;
      }

      const payload = {
        id: row.id,
        user: { id: row.user_id, name: row.userName, email: row.userEmail },
        program: { id: row.program_id, title: row.programTitle },
        status: row.status,
        amountRequested: formatCurrency(row.amount_requested),
        justification: row.justification,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at ?? null,
        reviewerId: row.reviewer_id ?? null,
      };

      res.json({ request: payload });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load benefit request', error: error.message });
    }
  });
};

export default registerBenefitsRoutes;
