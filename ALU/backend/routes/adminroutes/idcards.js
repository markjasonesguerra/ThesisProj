import { runQuery } from '../../db.js';
import { safeNumber } from './helpers.js';

const parseJsonColumn = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
};

const buildMemberLabel = (membershipNo, firstName, lastName, metadata) => {
  if (membershipNo && membershipNo.trim()) {
    return membershipNo;
  }
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName;
  }
  if (metadata?.memberAlias) {
    return metadata.memberAlias;
  }
  if (metadata?.memberName) {
    return metadata.memberName;
  }
  return 'Member';
};

const mapQueueRow = (row) => {
  const metadata = parseJsonColumn(row.metadata) ?? {};
  return {
    id: row.id,
    requestNo: row.requestNo,
    cardType: row.cardType,
    status: row.status,
    requestedAt: row.requestedAt,
    requestedOn: row.requestedOn,
    member: buildMemberLabel(row.membershipNo, row.firstName, row.lastName, metadata),
    memberName: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || metadata.memberName || null,
    metadata,
  };
};

const loadIdCardSettings = async () => {
  const rows = await runQuery(
    `SELECT setting_key AS settingKey, setting_value AS settingValue
       FROM system_settings
      WHERE category = 'id_cards';`,
  );

  return rows.reduce((accumulator, row) => {
    accumulator[row.settingKey] = parseJsonColumn(row.settingValue);
    return accumulator;
  }, {});
};

const registerIdCardRoutes = (router) => {
  router.get('/id-cards/overview', async (_req, res) => {
    try {
      const metricsRows = await runQuery(`
        SELECT
          (SELECT COUNT(*) FROM digital_ids WHERE is_active = 1) AS digitalActive,
          (SELECT COUNT(*) FROM id_card_requests WHERE card_type = 'physical' AND status IN ('pending','printing','ready')) AS physicalQueue,
          (SELECT COUNT(*) FROM id_card_requests WHERE card_type = 'replacement' AND DATE(requested_at) = CURDATE()) AS replacementsToday,
          (SELECT COUNT(*) FROM id_card_requests WHERE status IN ('pending','printing','ready')) AS totalQueued
      `);

      const metricsRow = metricsRows[0] ?? {};

      const queueRows = await runQuery(`
        SELECT
          r.id,
          r.request_no AS requestNo,
          r.card_type AS cardType,
          r.status,
          DATE(r.requested_at) AS requestedOn,
          r.requested_at AS requestedAt,
          r.metadata,
          u.membership_no AS membershipNo,
          up.first_name AS firstName,
          up.last_name AS lastName
        FROM id_card_requests r
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        ORDER BY r.requested_at DESC, r.id DESC
        LIMIT 25;
      `);

      const settings = await loadIdCardSettings();
      const guides = Array.isArray(settings.guides) ? settings.guides : [];
      const digitalMetrics = settings.digitalMetrics ?? {};

      res.json({
        metrics: {
          digitalActive: safeNumber(metricsRow.digitalActive),
          physicalQueued: safeNumber(metricsRow.physicalQueue),
          replacementsToday: safeNumber(metricsRow.replacementsToday),
          totalQueued: safeNumber(metricsRow.totalQueued),
        },
        queue: queueRows.map((row) => mapQueueRow(row)),
        guides,
        digital: {
          verificationPassRate: safeNumber(digitalMetrics.verificationPassRate, 0),
          walletAdoption: safeNumber(digitalMetrics.walletAdoption, 0),
          badges: Array.isArray(digitalMetrics.badges) ? digitalMetrics.badges : [],
        },
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load ID card overview', error: error.message });
    }
  });
};

export default registerIdCardRoutes;
