import { runQuery } from '../../db.js';
import { computeTimeAgo } from './helpers.js';

const parseAdminId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const loadAdminProfile = async (adminId) => {
  const rows = await runQuery(
    `SELECT
       a.id,
       a.email,
       a.first_name AS firstName,
       a.last_name AS lastName,
       a.status,
       a.last_login_at AS lastLoginAt,
       GROUP_CONCAT(DISTINCT ar.name ORDER BY ar.name SEPARATOR ',') AS roleNames
     FROM admins a
     LEFT JOIN admin_role_assignments ara ON ara.admin_id = a.id
     LEFT JOIN admin_roles ar ON ar.id = ara.role_id
     WHERE a.id = ?
     GROUP BY a.id
     LIMIT 1;`,
    [adminId],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const roles = row.roleNames
    ? row.roleNames.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  const initials = [row.firstName?.[0], row.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.email || 'Admin User',
    title: roles[0] ?? 'Admin User',
    roles,
    status: row.status ?? 'active',
    lastLoginAt: row.lastLoginAt,
    initials: initials || (row.email ? row.email[0].toUpperCase() : 'A'),
  };
};

const loadNotificationBuckets = async () => {
  const [row = {}] = await runQuery(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE COALESCE(status, 'pending') IN ('pending','email_verified','under_review')) AS pendingRegistrations,
      (SELECT COUNT(*) FROM approval_queues WHERE status IN ('pending','in_review')) AS pendingApprovals,
      (SELECT COUNT(*) FROM tickets WHERE status IN ('new','open','pending','escalated')) AS openTickets,
      (SELECT COUNT(*) FROM benefit_requests WHERE status IN ('pending','assigned','in_progress')) AS benefitRequests
  `);

  const buckets = [
    { key: 'registrations', label: 'Registrations awaiting review', count: Number(row.pendingRegistrations ?? 0) },
    { key: 'approvals', label: 'Final approvals pending', count: Number(row.pendingApprovals ?? 0) },
    { key: 'tickets', label: 'Support tickets in queue', count: Number(row.openTickets ?? 0) },
    { key: 'benefits', label: 'Benefit requests in triage', count: Number(row.benefitRequests ?? 0) },
  ];

  const badgeCount = buckets.reduce((total, bucket) => total + (Number.isFinite(bucket.count) ? bucket.count : 0), 0);

  return {
    badgeCount,
    buckets,
    generatedAt: new Date().toISOString(),
  };
};

const loadSecuritySnapshot = async () => {
  const [row = {}] = await runQuery(`
    SELECT
      (SELECT COUNT(*) FROM admin_sessions WHERE terminated_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())) AS activeSessions,
      (SELECT COUNT(*) FROM audit_logs WHERE action = 'admin_login_failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS loginFailures24h,
      (SELECT MAX(created_at) FROM audit_logs WHERE action LIKE 'security_%' OR action LIKE 'admin_login_%') AS lastSecurityEvent
  `);

  const activeSessions = Number(row.activeSessions ?? 0);
  const loginFailures24h = Number(row.loginFailures24h ?? 0);
  const lastSecurityEvent = row.lastSecurityEvent ?? null;

  const healthy = loginFailures24h === 0;
  const message = healthy
    ? 'Secure channel active'
    : `${loginFailures24h} failed login${loginFailures24h === 1 ? '' : 's'} in 24h`;

  return {
    message,
    healthy,
    activeSessions,
    loginFailures24h,
    lastEvent: lastSecurityEvent,
    lastEventAgo: computeTimeAgo(lastSecurityEvent),
    checkedAt: new Date().toISOString(),
  };
};

const registerTopBarRoutes = (router) => {
  router.get('/topbar/overview', async (req, res) => {
    try {
      let adminId = parseAdminId(req.query.adminId);
      if (!adminId && process.env.DEFAULT_ADMIN_ID) {
        adminId = parseAdminId(process.env.DEFAULT_ADMIN_ID);
      }

      if (!adminId) {
        const [fallback] = await runQuery('SELECT id FROM admins ORDER BY id ASC LIMIT 1;');
        adminId = fallback?.id ?? null;
      }

      if (!adminId) {
        res.status(404).json({ message: 'No admin user found for top bar data' });
        return;
      }

      const adminProfile = await loadAdminProfile(adminId);
      if (!adminProfile) {
        res.status(404).json({ message: 'Admin profile not found' });
        return;
      }

      const [notifications, security] = await Promise.all([
        loadNotificationBuckets(),
        loadSecuritySnapshot(),
      ]);

      res.json({
        admin: adminProfile,
        notifications,
        security,
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load top bar data', error: error.message });
    }
  });
};

export default registerTopBarRoutes;
