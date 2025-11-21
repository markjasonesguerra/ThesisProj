import { runQuery } from '../../db.js';
import { computeTimeAgo } from './helpers.js';

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

const determineActorType = (row, metadata) => {
  if (row.actorAdminId) {
    return 'admin';
  }
  if (row.actorUserId) {
    const metaActor = metadata?.actorType;
    if (typeof metaActor === 'string' && metaActor.trim().length) {
      const normalized = metaActor.trim().toLowerCase();
      if (normalized === 'ai') {
        return 'AI';
      }
      if (normalized === 'proponent' || normalized === 'member') {
        return 'proponent';
      }
    }
    return 'proponent';
  }
  const metaActor = metadata?.actorType;
  if (typeof metaActor === 'string' && metaActor.trim().length) {
    const normalized = metaActor.trim().toLowerCase();
    if (normalized === 'ai') {
      return 'AI';
    }
    if (normalized === 'system') {
      return 'system';
    }
  }
  return 'system';
};

const buildActorName = (row, actorType, metadata) => {
  if (actorType === 'admin') {
    const fullName = [row.adminFirstName, row.adminLastName].filter(Boolean).join(' ').trim();
    return fullName || row.adminEmail || 'Admin User';
  }
  if (actorType === 'proponent') {
    return row.userFullName || row.userEmail || 'Member';
  }
  if (actorType === 'AI') {
    if (metadata?.actorName && typeof metadata.actorName === 'string') {
      return metadata.actorName;
    }
    return 'AI Automation';
  }
  if (metadata?.actorName && typeof metadata.actorName === 'string') {
    return metadata.actorName;
  }
  return 'System';
};

const buildActorEmail = (row, actorType) => {
  if (actorType === 'admin') {
    return row.adminEmail ?? null;
  }
  if (actorType === 'proponent') {
    return row.userEmail ?? null;
  }
  return null;
};

const toArrayFromCsv = (value) => {
  if (!value) {
    return [];
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const formatAuditEntry = (row) => {
  const metadata = parseJsonColumn(row.metadata) ?? {};
  const actorType = determineActorType(row, metadata);
  const actorName = buildActorName(row, actorType, metadata);
  const actorEmail = buildActorEmail(row, actorType);
  const reason = metadata.reason ?? metadata.note ?? metadata.notes ?? null;
  const status = metadata.status ?? null;
  const ticketId = metadata.ticketId ?? (row.entityType === 'ticket' ? row.entityId : null);

  return {
    id: row.id,
    action: row.action,
    actor: actorType,
    actorName,
    actorEmail,
    actorRoles: toArrayFromCsv(row.adminRoleNames),
    actorId: row.actorAdminId ?? row.actorUserId ?? null,
    entityType: row.entityType,
    entityId: row.entityId,
    ticketId,
    reason,
    status,
    metadata,
    ipAddress: row.ipAddress ?? null,
    timestamp: row.createdAt,
    createdAt: row.createdAt,
    timeAgo: computeTimeAgo(row.createdAt),
  };
};

const registerAuditRoutes = (router) => {
  router.get('/audit/logs', async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 25));
    const offset = (page - 1) * pageSize;

    const filters = [];
    const params = [];

    const actionFilter = (req.query.action ?? '').toString().split(',').map((item) => item.trim()).filter(Boolean);
    if (actionFilter.length === 1) {
      filters.push('al.action = ?');
      params.push(actionFilter[0]);
    } else if (actionFilter.length > 1) {
      filters.push(`al.action IN (${actionFilter.map(() => '?').join(', ')})`);
      params.push(...actionFilter);
    }

    const actorFilterRaw = req.query.actor ? req.query.actor.toString().trim() : '';
    const actorFilter = actorFilterRaw.toLowerCase();
    if (actorFilter === 'admin') {
      filters.push('al.actor_admin_id IS NOT NULL');
    } else if (actorFilter === 'proponent') {
      filters.push('al.actor_user_id IS NOT NULL');
    } else if (actorFilter === 'ai') {
      filters.push("LOWER(JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.actorType'))) = 'ai'");
    } else if (actorFilter === 'system') {
      filters.push("al.actor_admin_id IS NULL AND al.actor_user_id IS NULL AND (JSON_EXTRACT(al.metadata, '$.actorType') IS NULL OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.actorType'))) = 'system')");
    }

    if (req.query.dateFrom) {
      const from = new Date(req.query.dateFrom);
      if (!Number.isNaN(from.getTime())) {
        filters.push('al.created_at >= ?');
        params.push(from);
      }
    }

    if (req.query.dateTo) {
      const to = new Date(req.query.dateTo);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        filters.push('al.created_at <= ?');
        params.push(to);
      }
    }

    if (req.query.entityType) {
      filters.push('al.entity_type = ?');
      params.push(req.query.entityType);
    }

    if (req.query.entityId) {
      filters.push('al.entity_id = ?');
      params.push(req.query.entityId);
    }

    const searchValue = req.query.search ? req.query.search.toString().trim().toLowerCase() : '';
    if (searchValue) {
      const like = `%${searchValue}%`;
      filters.push(`(
        LOWER(al.action) LIKE ?
        OR LOWER(al.entity_type) LIKE ?
        OR LOWER(COALESCE(al.entity_id, '')) LIKE ?
        OR LOWER(COALESCE(admin.email, '')) LIKE ?
        OR LOWER(CONCAT_WS(' ', admin.first_name, admin.last_name)) LIKE ?
        OR LOWER(COALESCE(u.email, '')) LIKE ?
        OR LOWER(CONCAT_WS(' ', up.first_name, up.last_name)) LIKE ?
        OR LOWER(COALESCE(al.ip_address, '')) LIKE ?
      )`);
      params.push(like, like, like, like, like, like, like, like);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    try {
      const baseJoin = `
        FROM audit_logs al
        LEFT JOIN admins admin ON admin.id = al.actor_admin_id
        LEFT JOIN users u ON u.id = al.actor_user_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
      `;

      const totalRows = await runQuery(
        `SELECT COUNT(*) AS total ${baseJoin} ${whereClause};`,
        params,
      );
      const total = Number(totalRows[0]?.total ?? 0);

      const rows = await runQuery(
        `SELECT
           al.id,
           al.action,
           al.entity_type AS entityType,
           al.entity_id AS entityId,
           al.metadata,
           al.ip_address AS ipAddress,
           al.created_at AS createdAt,
           al.actor_admin_id AS actorAdminId,
           al.actor_user_id AS actorUserId,
           admin.email AS adminEmail,
           admin.first_name AS adminFirstName,
           admin.last_name AS adminLastName,
           role_map.role_names AS adminRoleNames,
           u.email AS userEmail,
           CONCAT_WS(' ', up.first_name, up.last_name) AS userFullName
         ${baseJoin}
         LEFT JOIN (
           SELECT
             ara.admin_id,
             GROUP_CONCAT(ar.name ORDER BY ar.name SEPARATOR ', ') AS role_names
           FROM admin_role_assignments ara
           JOIN admin_roles ar ON ar.id = ara.role_id
           GROUP BY ara.admin_id
         ) role_map ON role_map.admin_id = al.actor_admin_id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?;`,
        [...params, pageSize, offset],
      );

      const statsRows = await runQuery(
        `SELECT al.action, COUNT(*) AS count ${baseJoin} ${whereClause} GROUP BY al.action;`,
        params,
      );

      const actorStatsRows = await runQuery(
        `SELECT
           SUM(CASE WHEN al.actor_admin_id IS NOT NULL THEN 1 ELSE 0 END) AS adminCount,
           SUM(CASE WHEN al.actor_user_id IS NOT NULL THEN 1 ELSE 0 END) AS proponentCount,
           SUM(CASE WHEN al.actor_admin_id IS NULL AND al.actor_user_id IS NULL AND (JSON_EXTRACT(al.metadata, '$.actorType') IS NULL OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.actorType'))) <> 'ai') THEN 1 ELSE 0 END) AS systemCount,
           SUM(CASE WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(al.metadata, '$.actorType'))) = 'ai' THEN 1 ELSE 0 END) AS aiCount
         ${baseJoin}
         ${whereClause};`,
        params,
      );

      const entityRows = await runQuery(
        `SELECT DISTINCT al.entity_type AS entityType ${baseJoin} ${whereClause} ORDER BY entityType ASC;`,
        params,
      );

      const entries = rows.map((row) => formatAuditEntry(row));

      const actionStats = statsRows.reduce((accumulator, row) => {
        if (row.action) {
          accumulator[row.action] = Number(row.count) || 0;
        }
        return accumulator;
      }, {});

      const actorCounts = {
        admin: Number(actorStatsRows[0]?.adminCount ?? 0),
        proponent: Number(actorStatsRows[0]?.proponentCount ?? 0),
        system: Number(actorStatsRows[0]?.systemCount ?? 0),
        AI: Number(actorStatsRows[0]?.aiCount ?? 0),
      };

      const availableEntities = entityRows
        .map((row) => row.entityType)
        .filter((value) => value && value.trim().length)
        .sort();

      res.json({
        meta: {
          page,
          pageSize,
          total,
          hasMore: page * pageSize < total,
          filters: {
            actions: Object.keys(actionStats).sort(),
            entities: availableEntities,
            actorTypes: ['AI', 'admin', 'proponent', 'system'],
          },
        },
        stats: {
          total,
          byAction: actionStats,
          actors: actorCounts,
        },
        entries,
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load audit logs', error: error.message });
    }
  });

  router.post('/audit/logs', async (req, res) => {
    try {
      const {
        action,
        entityType,
        entityId,
        actorAdminId,
        actorUserId,
        metadata,
        ipAddress,
      } = req.body ?? {};

      if (!action || !entityType) {
        res.status(400).json({ message: 'action and entityType are required' });
        return;
      }

      if (actorAdminId && actorUserId) {
        res.status(400).json({ message: 'Provide either actorAdminId or actorUserId, not both' });
        return;
      }

      const preparedMetadata = metadata && typeof metadata === 'object' ? metadata : metadata ? { value: metadata } : {};

      const insertResult = await runQuery(
        `INSERT INTO audit_logs (
           actor_admin_id,
           actor_user_id,
           action,
           entity_type,
           entity_id,
           metadata,
           ip_address
         ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?);`,
        [
          actorAdminId ?? null,
          actorUserId ?? null,
          action,
          entityType,
          entityId ?? null,
          JSON.stringify(preparedMetadata),
          ipAddress ?? null,
        ],
      );

      const newId = insertResult.insertId;
      const rows = await runQuery(
        `SELECT
           al.id,
           al.action,
           al.entity_type AS entityType,
           al.entity_id AS entityId,
           al.metadata,
           al.ip_address AS ipAddress,
           al.created_at AS createdAt,
           al.actor_admin_id AS actorAdminId,
           al.actor_user_id AS actorUserId,
           admin.email AS adminEmail,
           admin.first_name AS adminFirstName,
           admin.last_name AS adminLastName,
           role_map.role_names AS adminRoleNames,
           u.email AS userEmail,
           CONCAT_WS(' ', up.first_name, up.last_name) AS userFullName
         FROM audit_logs al
         LEFT JOIN admins admin ON admin.id = al.actor_admin_id
         LEFT JOIN (
           SELECT
             ara.admin_id,
             GROUP_CONCAT(ar.name ORDER BY ar.name SEPARATOR ', ') AS role_names
           FROM admin_role_assignments ara
           JOIN admin_roles ar ON ar.id = ara.role_id
           GROUP BY ara.admin_id
         ) role_map ON role_map.admin_id = al.actor_admin_id
         LEFT JOIN users u ON u.id = al.actor_user_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE al.id = ?
         LIMIT 1;`,
        [newId],
      );

      if (!rows.length) {
        res.status(201).json({ entry: null });
        return;
      }

      const entry = formatAuditEntry(rows[0]);
      res.status(201).json({ entry });
    } catch (error) {
      res.status(500).json({ message: 'Unable to create audit log entry', error: error.message });
    }
  });
};

export default registerAuditRoutes;
