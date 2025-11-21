import { runQuery, withTransaction } from '../../db.js';

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

const formatSessionRow = (row) => ({
  id: row.id,
  adminId: row.adminId,
  token: row.token,
  ipAddress: row.ipAddress ?? null,
  userAgent: row.userAgent ?? null,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  terminatedAt: row.terminatedAt,
  isActive: !row.terminatedAt && (!row.expiresAt || new Date(row.expiresAt) > new Date()),
  admin: {
    id: row.adminId,
    name: [row.adminFirstName, row.adminLastName].filter(Boolean).join(' ').trim() || null,
    email: row.adminEmail ?? null,
    status: row.adminStatus ?? null,
  },
});

const loadSecuritySettings = async () => {
  const rows = await runQuery(
    `SELECT
       setting_key AS settingKey,
       setting_value AS settingValue,
       updated_by AS updatedBy,
       updated_at AS updatedAt
     FROM system_settings
     WHERE category = 'security'
     ORDER BY setting_key ASC;`,
  );

  const settings = rows.reduce((accumulator, row) => {
    accumulator[row.settingKey] = parseJsonColumn(row.settingValue);
    return accumulator;
  }, {});

  return {
    settings,
    meta: {
      count: rows.length,
      updatedAt: rows.reduce((latest, row) => {
        if (!row.updatedAt) {
          return latest;
        }
        if (!latest) {
          return row.updatedAt;
        }
        return new Date(row.updatedAt) > new Date(latest) ? row.updatedAt : latest;
      }, null),
    },
  };
};

const registerSecurityRoutes = (router) => {
  router.get('/security/overview', async (_req, res) => {
    try {
      const metricsRows = await runQuery(`
        SELECT
          (SELECT COUNT(*) FROM admins) AS totalAdmins,
          (SELECT COUNT(*) FROM admins WHERE status = 'active') AS activeAdmins,
          (SELECT COUNT(*) FROM admins WHERE status IN ('suspended','disabled')) AS restrictedAdmins,
          (SELECT COUNT(*) FROM admin_sessions WHERE terminated_at IS NULL AND expires_at > NOW()) AS activeSessions,
          (SELECT COUNT(*) FROM admin_sessions WHERE terminated_at IS NULL AND expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 DAY)) AS sessionsExpiring,
          (SELECT COUNT(*) FROM password_resets WHERE consumed_at IS NULL AND expires_at > NOW()) AS openPasswordResets
      `);

      const metricsRow = metricsRows[0] ?? {};

      const loginStatsRows = await runQuery(`
        SELECT
          SUM(CASE WHEN action = 'admin_login_success' THEN 1 ELSE 0 END) AS successCount,
          SUM(CASE WHEN action = 'admin_login_failed' THEN 1 ELSE 0 END) AS failedCount
        FROM audit_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
          AND action IN ('admin_login_success','admin_login_failed')
      `);

      const loginStats = loginStatsRows[0] ?? {};
      const securitySettings = await loadSecuritySettings();

      res.json({
        metrics: {
          totalAdmins: Number(metricsRow.totalAdmins ?? 0),
          activeAdmins: Number(metricsRow.activeAdmins ?? 0),
          restrictedAdmins: Number(metricsRow.restrictedAdmins ?? 0),
          activeSessions: Number(metricsRow.activeSessions ?? 0),
          sessionsExpiringSoon: Number(metricsRow.sessionsExpiring ?? 0),
          openPasswordResets: Number(metricsRow.openPasswordResets ?? 0),
        },
        activity: {
          loginSuccess24h: Number(loginStats.successCount ?? 0),
          loginFailed24h: Number(loginStats.failedCount ?? 0),
        },
        settings: securitySettings.settings,
        settingsMeta: securitySettings.meta,
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load security overview', error: error.message });
    }
  });

  router.get('/security/sessions', async (req, res) => {
    try {
      const filters = [];
      const params = [];

      if (req.query.adminId) {
        filters.push('s.admin_id = ?');
        params.push(req.query.adminId);
      }

      if (req.query.active) {
        const normalized = req.query.active.toString().trim().toLowerCase();
        if (['1', 'true', 'yes', 'active'].includes(normalized)) {
          filters.push('s.terminated_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > NOW())');
        } else if (['0', 'false', 'no', 'inactive'].includes(normalized)) {
          filters.push('s.terminated_at IS NOT NULL OR (s.expires_at IS NOT NULL AND s.expires_at <= NOW())');
        }
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const rows = await runQuery(
        `SELECT
           s.id,
           s.admin_id AS adminId,
           s.token,
           s.ip_address AS ipAddress,
           s.user_agent AS userAgent,
           s.created_at AS createdAt,
           s.expires_at AS expiresAt,
           s.terminated_at AS terminatedAt,
           a.first_name AS adminFirstName,
           a.last_name AS adminLastName,
           a.email AS adminEmail,
           a.status AS adminStatus
         FROM admin_sessions s
         LEFT JOIN admins a ON a.id = s.admin_id
         ${whereClause}
         ORDER BY s.created_at DESC, s.id DESC;`,
        params,
      );

      const sessions = rows.map((row) => formatSessionRow(row));
      const meta = {
        total: sessions.length,
        active: sessions.filter((session) => session.isActive).length,
        inactive: sessions.filter((session) => !session.isActive).length,
      };

      res.json({ sessions, meta });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load sessions', error: error.message });
    }
  });

  router.delete('/security/sessions/:sessionId', async (req, res) => {
    const sessionId = Number.parseInt(req.params.sessionId, 10);
    if (!Number.isFinite(sessionId)) {
      res.status(400).json({ message: 'Invalid session id' });
      return;
    }

    try {
      const result = await runQuery(
        `UPDATE admin_sessions
         SET terminated_at = NOW()
         WHERE id = ? AND terminated_at IS NULL
         LIMIT 1;`,
        [sessionId],
      );

      if (!result.affectedRows) {
        res.status(404).json({ message: 'Active session not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Unable to terminate session', error: error.message });
    }
  });

  router.get('/security/login-attempts', async (req, res) => {
    const limit = Math.max(1, Math.min(200, Number.parseInt(req.query.limit, 10) || 100));

    try {
      const rows = await runQuery(
        `SELECT
           al.id,
           al.action,
           al.metadata,
           al.ip_address AS ipAddress,
           al.created_at AS createdAt,
           al.actor_admin_id AS adminId,
           a.first_name AS adminFirstName,
           a.last_name AS adminLastName,
           a.email AS adminEmail
         FROM audit_logs al
         LEFT JOIN admins a ON a.id = al.actor_admin_id
         WHERE al.action IN ('admin_login_success','admin_login_failed','admin_password_reset')
            OR al.entity_type = 'admin_auth'
         ORDER BY al.created_at DESC, al.id DESC
         LIMIT ?;`,
        [limit],
      );

      const attempts = rows.map((row) => ({
        id: row.id,
        action: row.action,
        metadata: parseJsonColumn(row.metadata) ?? {},
        ipAddress: row.ipAddress ?? null,
        createdAt: row.createdAt,
        admin: {
          id: row.adminId ?? null,
          name: [row.adminFirstName, row.adminLastName].filter(Boolean).join(' ').trim() || null,
          email: row.adminEmail ?? null,
        },
      }));

      res.json({ attempts, meta: { limit } });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load login attempts', error: error.message });
    }
  });

  router.get('/security/settings', async (_req, res) => {
    try {
      const payload = await loadSecuritySettings();
      res.json(payload);
    } catch (error) {
      res.status(500).json({ message: 'Unable to load security settings', error: error.message });
    }
  });

  router.put('/security/settings', async (req, res) => {
    const { settings, updatedBy } = req.body ?? {};

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      res.status(400).json({ message: 'settings payload must be an object' });
      return;
    }

    const entries = Object.entries(settings);
    if (!entries.length) {
      res.status(400).json({ message: 'No settings provided' });
      return;
    }

    try {
      await withTransaction(async (connection) => {
        for (const [key, value] of entries) {
          await connection.query(
            `INSERT INTO system_settings (category, setting_key, setting_value, updated_by)
             VALUES ('security', ?, CAST(? AS JSON), ?)
             ON DUPLICATE KEY UPDATE
               setting_value = VALUES(setting_value),
               updated_by = VALUES(updated_by),
               updated_at = CURRENT_TIMESTAMP;`,
            [key, JSON.stringify(value ?? null), updatedBy ?? null],
          );
        }
      });

      const payload = await loadSecuritySettings();
      res.json(payload);
    } catch (error) {
      res.status(500).json({ message: 'Unable to update security settings', error: error.message });
    }
  });
};

export default registerSecurityRoutes;
