import { runQuery } from '../../db.js';
import { computeTimeAgo } from './helpers.js';

const normalizeQuery = (value) => {
  if (!value) {
    return '';
  }
  return value.toString().trim();
};

const buildLike = (query) => `%${query.replace(/[%_]/g, '\\$&').toLowerCase()}%`;

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_GROUP = 5;

const registerQuickSearchRoutes = (router) => {
  router.get('/search/quick', async (req, res) => {
    const query = normalizeQuery(req.query.q ?? req.query.query ?? '');

    if (!query || query.length < MIN_QUERY_LENGTH) {
      res.json({
        query,
        results: {
          members: [],
          tickets: [],
          registrations: [],
        },
        meta: {
          minQueryLength: MIN_QUERY_LENGTH,
          exhausted: false,
        },
      });
      return;
    }

    const like = buildLike(query);

    try {
      const [memberRows, ticketRows, registrationRows] = await Promise.all([
        runQuery(
          `SELECT
             u.id,
             u.email,
             u.phone,
             u.status,
             u.membership_no AS membershipNo,
             CONCAT_WS(' ', up.first_name, up.last_name) AS fullName,
             up.first_name AS firstName,
             up.last_name AS lastName,
             ue.company,
             u.updated_at AS updatedAt
           FROM users u
           LEFT JOIN user_profiles up ON up.user_id = u.id
           LEFT JOIN user_employment ue ON ue.user_id = u.id
           WHERE LOWER(u.email) LIKE ?
              OR LOWER(CONCAT_WS(' ', up.first_name, up.last_name)) LIKE ?
              OR LOWER(u.membership_no) LIKE ?
           ORDER BY u.updated_at DESC
           LIMIT ?;`,
          [like, like, like, MAX_RESULTS_PER_GROUP],
        ),
        runQuery(
          `SELECT
             t.id,
             t.ticket_no AS ticketNo,
             t.subject,
             t.status,
             t.priority,
             t.updated_at AS updatedAt,
             u.email AS userEmail
           FROM tickets t
           LEFT JOIN users u ON u.id = t.user_id
           WHERE LOWER(t.ticket_no) LIKE ?
              OR LOWER(t.subject) LIKE ?
           ORDER BY t.updated_at DESC
           LIMIT ?;`,
          [like, like, MAX_RESULTS_PER_GROUP],
        ),
        runQuery(
          `SELECT
             u.id,
             u.email,
             u.status,
             COALESCE(rf.submitted_at, u.created_at) AS submittedAt,
             CONCAT_WS(' ', up.first_name, up.last_name) AS fullName
           FROM users u
           LEFT JOIN user_profiles up ON up.user_id = u.id
           LEFT JOIN registration_forms rf ON rf.user_id = u.id
           WHERE COALESCE(u.status, 'pending') IN ('pending','email_verified','under_review')
             AND (
               LOWER(u.email) LIKE ?
               OR LOWER(CONCAT_WS(' ', up.first_name, up.last_name)) LIKE ?
               OR LOWER(CONCAT('REG-', LPAD(u.id, 6, '0'))) LIKE ?
             )
           ORDER BY submittedAt DESC
           LIMIT ?;`,
          [like, like, like, MAX_RESULTS_PER_GROUP],
        ),
      ]);

      const members = memberRows.map((row) => ({
        id: row.id,
        fullName: row.fullName || 'Member',
        email: row.email,
        membershipNo: row.membershipNo,
        status: row.status,
        company: row.company,
        updatedAt: row.updatedAt,
        updatedAgo: computeTimeAgo(row.updatedAt),
      }));

      const tickets = ticketRows.map((row) => ({
        id: row.id,
        ticketNo: row.ticketNo,
        subject: row.subject,
        status: row.status,
        priority: row.priority,
        updatedAt: row.updatedAt,
        updatedAgo: computeTimeAgo(row.updatedAt),
        userEmail: row.userEmail,
      }));

      const registrations = registrationRows.map((row) => ({
        id: row.id,
        fullName: row.fullName || 'Pending Member',
        email: row.email,
        status: row.status,
        submittedAt: row.submittedAt,
        submittedAgo: computeTimeAgo(row.submittedAt),
      }));

      res.json({
        query,
        results: {
          members,
          tickets,
          registrations,
        },
        meta: {
          minQueryLength: MIN_QUERY_LENGTH,
          exhausted: members.length < MAX_RESULTS_PER_GROUP
            && tickets.length < MAX_RESULTS_PER_GROUP
            && registrations.length < MAX_RESULTS_PER_GROUP,
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to run quick search', error: error.message });
    }
  });
};

export default registerQuickSearchRoutes;
