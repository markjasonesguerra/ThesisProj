import { runQuery, withTransaction } from '../../db.js';
import { computeTimeAgo } from './helpers.js';

const registerTicketsRoutes = (router) => {
  // list tickets with pagination and basic filters
  router.get('/tickets', async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const filters = [];
    const params = [];

    if (req.query.status) {
      filters.push('t.status = ?');
      params.push(req.query.status);
    }

    if (req.query.category) {
      filters.push('t.category = ?');
      params.push(req.query.category);
    }

    if (req.query.query) {
      const q = `%${req.query.query.trim().toLowerCase()}%`;
      filters.push('(LOWER(t.ticket_no) LIKE ? OR LOWER(t.subject) LIKE ? OR LOWER(u.email) LIKE ?)');
      params.push(q, q, q);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    try {
      const rows = await runQuery(
        `SELECT
           t.id,
           t.ticket_no AS ticketNo,
           t.subject,
           t.category,
           t.priority,
           t.status,
           t.assigned_to AS assignedTo,
           t.user_id AS userId,
           u.email AS userEmail,
           CONCAT_WS(' ', up.first_name, up.last_name) AS userName,
           t.created_at AS createdAt,
           t.updated_at AS updatedAt
         FROM tickets t
         LEFT JOIN users u ON u.id = t.user_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         ${where}
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT ? OFFSET ?;`,
        [...params, pageSize, offset],
      );

      const totalRows = await runQuery(
        `SELECT COUNT(*) AS total FROM tickets t ${where};`,
        params,
      );

      const total = Number(totalRows[0]?.total ?? 0);

      const results = rows.map((r) => ({
        id: r.id,
        ticketNo: r.ticketNo,
        subject: r.subject,
        category: r.category,
        priority: r.priority,
        status: r.status,
        assignedTo: r.assignedTo,
        user: {
          id: r.userId,
          email: r.userEmail,
          name: r.userName,
        },
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        timeAgo: computeTimeAgo(r.updatedAt ?? r.createdAt),
      }));

      res.json({ meta: { total, page, pageSize }, results });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load tickets', error: error.message });
    }
  });

  // ticket detail with messages
  router.get('/tickets/:ticketId', async (req, res) => {
    const ticketId = Number.parseInt(req.params.ticketId, 10);
    if (!Number.isFinite(ticketId)) {
      res.status(400).json({ message: 'Invalid ticket id' });
      return;
    }

    try {
      const ticketRows = await runQuery(
        `SELECT
           t.id,
           t.ticket_no AS ticketNo,
           t.subject,
           t.category,
           t.priority,
           t.status,
           t.assigned_to AS assignedTo,
           t.user_id AS userId,
           t.created_at AS createdAt,
           t.updated_at AS updatedAt,
           t.description
         FROM tickets t
         WHERE t.id = ?
         LIMIT 1;`,
        [ticketId],
      );

      const ticket = ticketRows[0];
      if (!ticket) {
        res.status(404).json({ message: 'Ticket not found' });
        return;
      }

      const messages = await runQuery(
        `SELECT
           tm.id,
           tm.message,
           tm.author_user_id AS authorUserId,
           tm.author_admin_id AS authorAdminId,
           CONCAT_WS(' ', up.first_name, up.last_name) AS authorUserName,
           CONCAT_WS(' ', pa.first_name, pa.last_name) AS authorAdminName,
           tm.created_at AS createdAt
         FROM ticket_messages tm
         LEFT JOIN users u ON u.id = tm.author_user_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN admins pa ON pa.id = tm.author_admin_id
         WHERE tm.ticket_id = ?
         ORDER BY tm.created_at ASC, tm.id ASC;`,
        [ticketId],
      );

      res.json({ ticket, messages });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load ticket', error: error.message });
    }
  });

  // post a message to ticket (admin-side)
  router.post('/tickets/:ticketId/messages', async (req, res) => {
    const ticketId = Number.parseInt(req.params.ticketId, 10);
    if (!Number.isFinite(ticketId)) {
      res.status(400).json({ message: 'Invalid ticket id' });
      return;
    }

    const { message, authorAdminId, authorUserId } = req.body ?? {};
    if (!message || !message.toString().trim()) {
      res.status(400).json({ message: 'message is required' });
      return;
    }

    try {
      const payload = [ticketId, authorUserId ?? null, authorAdminId ?? null, message.toString().trim()];
      const result = await runQuery(
        `INSERT INTO ticket_messages (ticket_id, author_user_id, author_admin_id, message) VALUES (?, ?, ?, ?);`,
        payload,
      );

      const newId = result.insertId;
      const [row] = await runQuery(
        `SELECT id, ticket_id AS ticketId, message, author_user_id AS authorUserId, author_admin_id AS authorAdminId, created_at AS createdAt FROM ticket_messages WHERE id = ? LIMIT 1;`,
        [newId],
      );

      res.status(201).json({ message: row });
    } catch (error) {
      res.status(500).json({ message: 'Unable to add message', error: error.message });
    }
  });

  // update ticket status or assigned admin (lightweight admin actions)
  router.patch('/tickets/:ticketId', async (req, res) => {
    const ticketId = Number.parseInt(req.params.ticketId, 10);
    if (!Number.isFinite(ticketId)) {
      res.status(400).json({ message: 'Invalid ticket id' });
      return;
    }

    const { status, assignedTo } = req.body ?? {};
    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (assignedTo !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assignedTo);
    }

    if (!updates.length) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    try {
      params.push(ticketId);
      const result = await runQuery(`UPDATE tickets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1;`, params);
      if (!result.affectedRows) {
        res.status(404).json({ message: 'Ticket not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Unable to update ticket', error: error.message });
    }
  });
};

export default registerTicketsRoutes;
