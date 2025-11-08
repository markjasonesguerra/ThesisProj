import { runQuery } from '../../db.js';
import { safeNumber, computeTimeAgo } from './helpers.js';

const registerDashboardRoute = (router) => {
  router.get('/dashboard', async (_req, res) => {
    try {
      const memberCounts = await runQuery(`
        SELECT
          COUNT(*) AS totalMembers,
          SUM(CASE WHEN status IN ('pending','email_verified','under_review') THEN 1 ELSE 0 END) AS pendingRegistrations,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS activeMembers,
          SUM(CASE WHEN status IN ('rejected','suspended') THEN 1 ELSE 0 END) AS offboarded
        FROM users;
      `);

      const memberRow = memberCounts[0] ?? {};
      const totalMembers = safeNumber(memberRow.totalMembers);
      const pendingMembers = safeNumber(memberRow.pendingRegistrations);
      const activeMembers = safeNumber(memberRow.activeMembers);

      const duesRows = await runQuery(`
        SELECT
          SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) AS overdueEntries,
          COUNT(DISTINCT CASE WHEN status = 'overdue' THEN user_id END) AS overdueMembers,
          COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) AS arrearsTotal,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pendingTotalAmount,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingEntries
        FROM dues_ledger;
      `);

      const duesRow = duesRows[0] ?? {};
      const overdueMembers = safeNumber(duesRow.overdueMembers);
      const arrearsTotal = safeNumber(duesRow.arrearsTotal);
      const pendingEntries = safeNumber(duesRow.pendingEntries);

      const newMembers = await runQuery(`
        SELECT COUNT(*) AS createdMonth
        FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL DAYOFMONTH(CURDATE()) - 1 DAY);
      `);
      const createdThisMonth = safeNumber(newMembers[0]?.createdMonth);

      const approvals = await runQuery(`
        SELECT
          SUM(CASE WHEN queue_type = 'registration' AND status IN ('pending','in_review') THEN 1 ELSE 0 END) AS pendingRegistrations,
          SUM(CASE WHEN queue_type = 'id_card' AND status IN ('pending','in_review') THEN 1 ELSE 0 END) AS pendingIds,
          SUM(CASE WHEN queue_type = 'registration' AND status = 'approved' AND DATE(updated_at) = CURDATE() THEN 1 ELSE 0 END) AS registrationsApprovedToday
        FROM approval_queues;
      `);

      const approvalRow = approvals[0] ?? {};
      const pendingIds = safeNumber(approvalRow.pendingIds);
      const approvalsToday = safeNumber(approvalRow.registrationsApprovedToday);

      const tickets = await runQuery(`
        SELECT
          SUM(CASE WHEN category = 'membership' AND status IN ('open','triaged','in_progress') THEN 1 ELSE 0 END) AS membershipOpen,
          SUM(CASE WHEN category = 'membership' AND status IN ('resolved','closed') THEN 1 ELSE 0 END) AS membershipClosed,
          SUM(CASE WHEN status IN ('open','triaged','in_progress') THEN 1 ELSE 0 END) AS totalOpen
        FROM tickets;
      `);

      const ticketRow = tickets[0] ?? {};
      const membershipOpen = safeNumber(ticketRow.membershipOpen);
      const membershipClosed = safeNumber(ticketRow.membershipClosed);

      const recentActivityRows = await runQuery(`
        SELECT action, entity_type AS entityType, entity_id AS entityId, metadata, created_at AS createdAt
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 5;
      `);

      const pingStart = Date.now();
      await runQuery('SELECT 1');
      const pingMs = Date.now() - pingStart;

      const storageRows = await runQuery(`
        SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS storageMb
        FROM information_schema.tables
        WHERE table_schema = DATABASE();
      `);

      const storageMb = safeNumber(storageRows[0]?.storageMb, 0);
      const storagePercentage = Math.min(100, Math.round((storageMb / 512) * 100));

      const kpis = [
        {
          id: 'total-members',
          title: 'Total Members',
          value: totalMembers,
          change: `${createdThisMonth} added this month`,
          icon: 'users',
          tone: 'is-blue',
        },
        {
          id: 'pending-registrations',
          title: 'Pending Registrations',
          value: pendingMembers,
          change: approvalsToday > 0
            ? `${approvalsToday} approved today`
            : 'Awaiting review',
          icon: 'user-check',
          tone: 'is-orange',
        },
        {
          id: 'active-members',
          title: 'Active Members',
          value: activeMembers,
          change: `${totalMembers ? ((activeMembers / totalMembers) * 100).toFixed(1) : '0.0'}% active rate`,
          icon: 'trending-up',
          tone: 'is-green',
        },
        {
          id: 'dues-overdue',
          title: 'Dues Overdue',
          value: overdueMembers,
          change: `Overdue balance ₱${arrearsTotal.toLocaleString()}`,
          icon: 'alert-triangle',
          tone: 'is-red',
        },
        {
          id: 'id-issuance',
          title: 'ID Issuance Queue',
          value: pendingIds,
          change: 'Awaiting print or pickup',
          icon: 'credit-card',
          tone: 'is-purple',
        },
        {
          id: 'card-requests',
          title: 'Card Requests',
          value: membershipOpen + membershipClosed,
          change: `${membershipOpen} open • ${membershipClosed} closed`,
          icon: 'file-text',
          tone: 'is-blue',
        },
      ];

      const quickActions = [
        { label: 'Approve Registrations', action: 'registration-review', count: pendingMembers },
        { label: 'Bulk Import Excel', action: 'members', count: null },
        { label: 'Reconcile Dues', action: 'dues-finance', count: pendingEntries },
        { label: 'Export Reports', action: 'reports-analytics', count: null },
      ];

      const recentActivity = recentActivityRows.map((row) => ({
        action: row.action,
        subject: row.entityType ? `${row.entityType}${row.entityId ? ` #${row.entityId}` : ''}` : null,
        detail: row.metadata ?? null,
        createdAt: row.createdAt,
        tone: row.action?.toLowerCase().includes('approved') ? 'is-green' : 'is-blue',
        time: computeTimeAgo(row.createdAt),
      }));

      const systemStatus = [
        { label: 'Database Health', value: 100, unit: '%', accent: 'is-green' },
        { label: 'API Response Time', value: pingMs, unit: 'ms', accent: pingMs < 300 ? 'is-green' : 'is-orange' },
        { label: 'Storage Usage', value: storagePercentage, unit: '%', accent: storagePercentage > 85 ? 'is-red' : storagePercentage > 65 ? 'is-orange' : 'is-green' },
      ];

      res.json({ kpis, quickActions, recentActivity, systemStatus });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load admin dashboard data', error: error.message });
    }
  });
};

export default registerDashboardRoute;
