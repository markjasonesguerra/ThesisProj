import { runQuery } from '../../db.js';
import { safeNumber } from './helpers.js';

const registerReportsRoutes = (router) => {
  // summary report combining tickets, events, benefits and dues
  router.get('/reports/summary', async (_req, res) => {
    try {
      const padMonth = (value) => value.toString().padStart(2, '0');
      const trendMonths = 8;
      const now = new Date();
      const firstMonth = new Date(now.getFullYear(), now.getMonth() - (trendMonths - 1), 1);

      const growthSeries = Array.from({ length: trendMonths }, (_v, idx) => {
        const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + idx, 1);
        return {
          key: `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}-01`,
          label: date.toLocaleString('en-US', { month: 'short' }),
        };
      });

      const trendStartKey = growthSeries[0]?.key;

      const membersRow = await runQuery(`
        SELECT
          COUNT(*) AS totalMembers,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedMembers,
          SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS newJoiners30d,
          SUM(CASE WHEN created_at BETWEEN DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND DATE_SUB(CURDATE(), INTERVAL 31 DAY) THEN 1 ELSE 0 END) AS newJoinersPrev30
        FROM users;
      `);

      const activeEmployersRow = await runQuery(`
        SELECT COUNT(DISTINCT company) AS activeEmployers
        FROM user_employment
        WHERE company IS NOT NULL AND company <> '';
      `);

      const payingEmployersRow = await runQuery(`
        SELECT COUNT(DISTINCT ue.company) AS payingEmployers
        FROM dues_payments dp
        JOIN dues_ledger dl ON dl.id = dp.ledger_id
        JOIN users u ON u.id = dl.user_id
        LEFT JOIN user_employment ue ON ue.user_id = u.id
        WHERE ue.company IS NOT NULL AND ue.company <> '';
      `);

      let growthTrendRows = [];
      let approvedBeforeRows = [];
      if (trendStartKey) {
        growthTrendRows = await runQuery(
          `SELECT DATE_FORMAT(created_at, '%Y-%m-01') AS period,
                  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedCount,
                  COUNT(*) AS registrations
           FROM users
           WHERE created_at >= ?
           GROUP BY period
           ORDER BY period;`,
          [trendStartKey],
        );

        approvedBeforeRows = await runQuery(
          `SELECT SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedBefore
           FROM users
           WHERE created_at < ?;`,
          [trendStartKey],
        );
      }

      const paymentsRow = await runQuery(`
        SELECT
          COALESCE(SUM(CASE WHEN YEAR(paid_at) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) AS collectedYtd,
          COALESCE(SUM(CASE WHEN YEAR(paid_at) = YEAR(CURDATE()) - 1 THEN amount ELSE 0 END), 0) AS collectedPrevYear
        FROM dues_payments;
      `);

      const billedRow = await runQuery(`
        SELECT
          COALESCE(SUM(CASE WHEN YEAR(due_date) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0) AS billedYtd,
          COALESCE(SUM(CASE WHEN YEAR(due_date) = YEAR(CURDATE()) - 1 THEN amount ELSE 0 END), 0) AS billedPrevYear
        FROM dues_ledger;
      `);

      const ticketsRow = await runQuery(`
        SELECT
          COUNT(*) AS totalTickets,
          SUM(CASE WHEN status IN ('open','triaged','in_progress') THEN 1 ELSE 0 END) AS openTickets,
          SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END) AS closedTickets
        FROM tickets;
      `);

      const eventsRow = await runQuery(`
        SELECT
          COUNT(*) AS totalEvents,
          SUM(CASE WHEN start_at >= CURDATE() THEN 1 ELSE 0 END) AS upcomingEvents
        FROM events;
      `);

      const benefitsRow = await runQuery(`
        SELECT
          COUNT(*) AS totalRequests,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) AS denied,
          SUM(CASE WHEN status IN ('pending','in_review','processing','in_progress') THEN 1 ELSE 0 END) AS inProgress
        FROM benefit_requests;
      `);

      const duesRow = await runQuery(`
        SELECT
          COUNT(*) AS totalLedgerEntries,
          COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) AS arrears
        FROM dues_ledger;
      `);

      const collectionsRecentRow = await runQuery(`
        SELECT COALESCE(SUM(amount), 0) AS collectedLast30
        FROM dues_payments
        WHERE paid_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);
      `);

      let idCardStatsRow;
      try {
        idCardStatsRow = await runQuery(`
          SELECT
            SUM(CASE WHEN card_type = 'physical' AND status IN ('ready','released','completed','fulfilled','delivered','printing') THEN 1 ELSE 0 END) AS physicalIssued,
            SUM(CASE WHEN status IN ('pending','in_review','processing','printing','ready') THEN 1 ELSE 0 END) AS activeQueue
          FROM id_card_requests;
        `);
      } catch (error) {
        idCardStatsRow = [{ physicalIssued: 0, activeQueue: 0 }];
      }

      const companyDistributionRows = await runQuery(`
        SELECT
          CASE WHEN ue.company IS NULL OR ue.company = '' THEN 'Unspecified' ELSE ue.company END AS company,
          COUNT(DISTINCT u.id) AS memberCount
        FROM users u
        LEFT JOIN user_employment ue ON ue.user_id = u.id
        WHERE u.status = 'approved'
        GROUP BY company
        HAVING memberCount > 0
        ORDER BY memberCount DESC
        LIMIT 8;
      `);

      const totalMembers = safeNumber(membersRow[0]?.approvedMembers ?? membersRow[0]?.totalMembers);
      const newJoiners30d = safeNumber(membersRow[0]?.newJoiners30d);
      const newJoinersPrev30 = safeNumber(membersRow[0]?.newJoinersPrev30);
      const membersGrowthPercent = newJoinersPrev30 > 0
        ? ((newJoiners30d - newJoinersPrev30) / newJoinersPrev30) * 100
        : null;

      const approvedBefore = safeNumber(approvedBeforeRows[0]?.approvedBefore);
      const growthTrendMap = new Map((growthTrendRows || []).map((row) => [row.period, row]));
      let runningApprovedTotal = approvedBefore;
      const growthTrend = growthSeries.map((entry) => {
        const row = growthTrendMap.get(entry.key) || {};
        const newApproved = safeNumber(row.approvedCount);
        const registrations = safeNumber(row.registrations);
        runningApprovedTotal += newApproved;
        return {
          month: entry.key,
          label: entry.label,
          totalMembers: runningApprovedTotal,
          newMembers: newApproved,
          registrations,
        };
      });

      const distributionTotal = companyDistributionRows.reduce((acc, row) => acc + safeNumber(row.memberCount), 0);
      const membersDistribution = companyDistributionRows.map((row) => ({
        company: row.company,
        count: safeNumber(row.memberCount),
      }));
      if (totalMembers > distributionTotal) {
        membersDistribution.push({
          company: 'Others',
          count: totalMembers - distributionTotal,
        });
      }

      const revenueYtd = safeNumber(paymentsRow[0]?.collectedYtd);
      const revenuePrevYear = safeNumber(paymentsRow[0]?.collectedPrevYear);
      const revenueYoYPercent = revenuePrevYear > 0
        ? ((revenueYtd - revenuePrevYear) / revenuePrevYear) * 100
        : (revenueYtd > 0 ? 100 : null);

      const billedYtd = safeNumber(billedRow[0]?.billedYtd);
      const collectionRate = billedYtd > 0 ? (revenueYtd / billedYtd) * 100 : null;
      const collectionNote = collectionRate == null
        ? null
        : collectionRate >= 95
          ? 'Above target'
          : collectionRate >= 85
            ? 'On track'
            : 'Needs attention';

      const totalAllStatuses = safeNumber(membersRow[0]?.totalMembers);
      const approvedMembers = safeNumber(membersRow[0]?.approvedMembers);
      const retentionRate = totalAllStatuses > 0 ? (approvedMembers / totalAllStatuses) * 100 : null;
      const newJoinersChange = newJoinersPrev30 > 0
        ? ((newJoiners30d - newJoinersPrev30) / newJoinersPrev30) * 100
        : null;

      const monthlyCollections = safeNumber(collectionsRecentRow[0]?.collectedLast30);
      const physicalCards = safeNumber(idCardStatsRow[0]?.physicalIssued);
      const physicalQueue = safeNumber(idCardStatsRow[0]?.activeQueue);
      const assistanceActive = safeNumber(benefitsRow[0]?.inProgress);
      const outstandingDues = Number(duesRow[0]?.arrears ?? 0);

      const payload = {
        meta: { isSample: false },
        members: {
          total: totalMembers,
          totalAllStatuses: safeNumber(membersRow[0]?.totalMembers),
          newJoiners30d,
          newJoinersPrev30,
          growthPercent: membersGrowthPercent,
          activeEmployers: safeNumber(activeEmployersRow[0]?.activeEmployers),
          payingEmployers: safeNumber(payingEmployersRow[0]?.payingEmployers),
          retentionRate,
          newJoinersChange,
          growthTrend,
          distribution: membersDistribution,
        },
        financial: {
          revenueYtd,
          revenuePrevYear,
          revenueYoYPercent,
          collectionRate,
          collectionNote,
          billedYtd,
          collectedYtd: revenueYtd,
          monthlyCollections,
        },
        tickets: {
          total: safeNumber(ticketsRow[0]?.totalTickets),
          open: safeNumber(ticketsRow[0]?.openTickets),
          closed: safeNumber(ticketsRow[0]?.closedTickets),
        },
        events: {
          total: safeNumber(eventsRow[0]?.totalEvents),
          upcoming: safeNumber(eventsRow[0]?.upcomingEvents),
        },
        benefits: {
          totalRequests: safeNumber(benefitsRow[0]?.totalRequests),
          approved: safeNumber(benefitsRow[0]?.approved),
          denied: safeNumber(benefitsRow[0]?.denied),
          inProgress: assistanceActive,
        },
        dues: {
          entries: safeNumber(duesRow[0]?.totalLedgerEntries),
          arrears: Number(duesRow[0]?.arrears ?? 0),
        },
        performance: {
          membership: [
            {
              label: 'Active Members',
              value: approvedMembers,
              format: 'count',
              meta: totalAllStatuses > 0 ? `${((approvedMembers / totalAllStatuses) * 100).toFixed(1)}% of records active` : null,
            },
            {
              label: 'New Registrations (30d)',
              value: newJoiners30d,
              format: 'count',
              meta: newJoinersChange != null ? `${newJoinersChange >= 0 ? '+' : ''}${newJoinersChange.toFixed(1)}% vs prior 30d` : null,
            },
            {
              label: 'Retention Rate',
              value: retentionRate,
              format: 'percent',
              meta: 'Approved vs all member records',
            },
          ],
          financial: [
            {
              label: 'Monthly Collections',
              value: monthlyCollections,
              format: 'currency',
              meta: 'Collected in the last 30 days',
            },
            {
              label: 'Outstanding Dues',
              value: outstandingDues,
              format: 'currency',
              meta: 'Ledger entries flagged overdue',
            },
            {
              label: 'Collection Efficiency',
              value: collectionRate,
              format: 'percent',
              meta: collectionNote,
            },
          ],
          operations: [
            {
              label: 'Physical Cards',
              value: physicalCards,
              format: 'count',
              meta: Number.isFinite(physicalQueue) ? `${physicalQueue.toLocaleString()} in production` : 'Queue size unavailable',
            },
            {
              label: 'Assistance Requests',
              value: assistanceActive,
              format: 'count',
              meta: `${safeNumber(benefitsRow[0]?.totalRequests)} total this year`,
            },
            {
              label: 'Tickets Open',
              value: safeNumber(ticketsRow[0]?.openTickets),
              format: 'count',
              meta: `${safeNumber(ticketsRow[0]?.totalTickets)} total monitored`,
            },
          ],
        },
      };

      const hasRealData = (
        (payload.members.total ?? 0) > 0
        || (payload.financial.revenueYtd ?? 0) > 0
        || (payload.tickets.total ?? 0) > 0
        || (payload.events.total ?? 0) > 0
        || (payload.benefits.totalRequests ?? 0) > 0
        || (payload.dues.entries ?? 0) > 0
      );

      if (!hasRealData) {
        res.json({
          meta: { isSample: true },
          members: {
            total: 19803,
            totalAllStatuses: 20937,
            newJoiners30d: 42,
            newJoinersPrev30: 39,
            growthPercent: 7.7,
            activeEmployers: 58,
            payingEmployers: 58,
            retentionRate: 94.6,
            newJoinersChange: 7.7,
            growthTrend: [
              { month: '2025-01-01', label: 'Jan', totalMembers: 18203, newMembers: 32, registrations: 45 },
              { month: '2025-02-01', label: 'Feb', totalMembers: 18396, newMembers: 34, registrations: 49 },
              { month: '2025-03-01', label: 'Mar', totalMembers: 18512, newMembers: 28, registrations: 43 },
              { month: '2025-04-01', label: 'Apr', totalMembers: 18758, newMembers: 41, registrations: 52 },
              { month: '2025-05-01', label: 'May', totalMembers: 19012, newMembers: 39, registrations: 55 },
              { month: '2025-06-01', label: 'Jun', totalMembers: 19348, newMembers: 48, registrations: 60 },
              { month: '2025-07-01', label: 'Jul', totalMembers: 19586, newMembers: 44, registrations: 57 },
              { month: '2025-08-01', label: 'Aug', totalMembers: 19803, newMembers: 38, registrations: 53 },
            ],
            distribution: [
              { company: 'BDO', count: 4250 },
              { company: 'SM Corp', count: 2890 },
              { company: 'Ayala Corp', count: 2340 },
              { company: 'PLDT', count: 1890 },
              { company: 'Jollibee', count: 1567 },
              { company: 'Others', count: 6866 },
            ],
          },
          financial: {
            revenueYtd: 7300000,
            revenuePrevYear: 6350000,
            revenueYoYPercent: 15,
            collectionRate: 94.6,
            collectionNote: 'Above target',
            billedYtd: 7720000,
            collectedYtd: 7300000,
            monthlyCollections: 1020000,
          },
          tickets: {
            total: 312,
            open: 46,
            closed: 266,
          },
          events: {
            total: 24,
            upcoming: 6,
          },
          benefits: {
            totalRequests: 247,
            approved: 186,
            denied: 18,
            inProgress: 47,
          },
          dues: {
            entries: 1184,
            arrears: 186000,
          },
          performance: {
            membership: [
              { label: 'Active Members', value: 19803, format: 'count', meta: '94.6% of records active' },
              { label: 'New Registrations (30d)', value: 47, format: 'count', meta: '+7.7% vs prior 30d' },
              { label: 'Retention Rate', value: 94.6, format: 'percent', meta: 'Approved vs total records' },
            ],
            financial: [
              { label: 'Monthly Collections', value: 1020000, format: 'currency', meta: 'Collected in the last 30 days' },
              { label: 'Outstanding Dues', value: 890000, format: 'currency', meta: 'Ledger entries flagged overdue' },
              { label: 'Collection Efficiency', value: 107, format: 'percent', meta: 'Above target' },
            ],
            operations: [
              { label: 'Physical Cards', value: 1247, format: 'count', meta: '312 in production' },
              { label: 'Assistance Requests', value: 47, format: 'count', meta: 'Active cases this month' },
              { label: 'Tickets Open', value: 46, format: 'count', meta: '312 monitored in total' },
            ],
          },
        });
        return;
      }

      res.json(payload);
    } catch (error) {
      res.status(500).json({ message: 'Unable to generate summary report', error: error.message });
    }
  });

  // example: simple CSV-style export endpoint for tickets (paginated)
  router.get('/reports/tickets', async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(1000, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 500));
    const offset = (page - 1) * pageSize;

    try {
      const rows = await runQuery(
        `SELECT t.id, t.ticket_no AS ticketNo, t.subject, t.category, t.priority, t.status, t.created_at AS createdAt, u.email AS userEmail
         FROM tickets t
         LEFT JOIN users u ON u.id = t.user_id
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?;`,
        [pageSize, offset],
      );

      res.json({ meta: { page, pageSize, count: rows.length }, results: rows });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load tickets for report', error: error.message });
    }
  });
};

export default registerReportsRoutes;
