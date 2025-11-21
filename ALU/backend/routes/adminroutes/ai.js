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

const formatPolicyRow = (row) => {
  const autoActions = parseJsonColumn(row.autoActions) ?? {};
  const confidenceThreshold = row.confidenceThreshold === null || row.confidenceThreshold === undefined
    ? null
    : Number(row.confidenceThreshold);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    modelIdentifier: row.modelIdentifier ?? null,
    confidenceThreshold,
    autoActions,
    isActive: row.isActive === 1,
    createdBy: row.createdBy ?? null,
    createdByName: row.createdByName ?? null,
    createdByEmail: row.createdByEmail ?? null,
    createdAt: row.createdAt,
  };
};

const normalizeBooleanQuery = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = value.toString().trim().toLowerCase();
  if (['1', 'true', 'yes', 'active'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'inactive'].includes(normalized)) {
    return false;
  }
  return undefined;
};

const loadPolicyById = async (policyId) => {
  const rows = await runQuery(
    `SELECT
       p.id,
       p.name,
       p.description,
       p.model_identifier AS modelIdentifier,
       p.confidence_threshold AS confidenceThreshold,
       p.auto_actions AS autoActions,
       p.is_active AS isActive,
       p.created_by AS createdBy,
       p.created_at AS createdAt,
       CONCAT_WS(' ', admin.first_name, admin.last_name) AS createdByName,
       admin.email AS createdByEmail
     FROM ai_policies p
     LEFT JOIN admins admin ON admin.id = p.created_by
     WHERE p.id = ?
     LIMIT 1;`,
    [policyId],
  );

  const row = rows[0];
  return row ? formatPolicyRow(row) : null;
};

const loadAiSettings = async () => {
  const rows = await runQuery(
    `SELECT
       setting_key AS settingKey,
       setting_value AS settingValue,
       updated_by AS updatedBy,
       updated_at AS updatedAt
     FROM system_settings
     WHERE category = 'ai'
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

const registerAIRoutes = (router) => {
  router.get('/ai/policies', async (req, res) => {
    try {
      const filters = [];
      const params = [];

      const search = req.query.search ? req.query.search.toString().trim() : '';
      if (search) {
        const like = `%${search.toLowerCase()}%`;
        filters.push(`(
          LOWER(p.name) LIKE ?
          OR LOWER(COALESCE(p.description, '')) LIKE ?
          OR LOWER(COALESCE(p.model_identifier, '')) LIKE ?
        )`);
        params.push(like, like, like);
      }

      const isActiveFilter = normalizeBooleanQuery(req.query.isActive);
      if (isActiveFilter !== undefined) {
        filters.push('p.is_active = ?');
        params.push(isActiveFilter ? 1 : 0);
      }

      if (req.query.model) {
        filters.push('p.model_identifier = ?');
        params.push(req.query.model);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const baseJoin = `
        FROM ai_policies p
        LEFT JOIN admins admin ON admin.id = p.created_by
        ${whereClause}
      `;

      const rows = await runQuery(
        `SELECT
           p.id,
           p.name,
           p.description,
           p.model_identifier AS modelIdentifier,
           p.confidence_threshold AS confidenceThreshold,
           p.auto_actions AS autoActions,
           p.is_active AS isActive,
           p.created_by AS createdBy,
           p.created_at AS createdAt,
           CONCAT_WS(' ', admin.first_name, admin.last_name) AS createdByName,
           admin.email AS createdByEmail
         ${baseJoin}
         ORDER BY p.created_at DESC, p.id DESC;`,
        params,
      );

      const statsRows = await runQuery(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN p.is_active = 1 THEN 1 ELSE 0 END) AS activeCount
         ${baseJoin};`,
        params,
      );

      const policies = rows.map((row) => formatPolicyRow(row));
      const modelSet = new Set(
        policies
          .map((policy) => policy.modelIdentifier)
          .filter((value) => value && value.trim().length),
      );

      res.json({
        meta: {
          total: Number(statsRows[0]?.total ?? 0),
          active: Number(statsRows[0]?.activeCount ?? 0),
          models: Array.from(modelSet).sort(),
        },
        policies,
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load AI policies', error: error.message });
    }
  });

  router.get('/ai/policies/:policyId', async (req, res) => {
    const policyId = Number.parseInt(req.params.policyId, 10);
    if (!Number.isFinite(policyId)) {
      res.status(400).json({ message: 'Invalid policy id' });
      return;
    }

    try {
      const policy = await loadPolicyById(policyId);
      if (!policy) {
        res.status(404).json({ message: 'Policy not found' });
        return;
      }

      res.json({ policy });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load policy', error: error.message });
    }
  });

  router.post('/ai/policies', async (req, res) => {
    const {
      name,
      description,
      modelIdentifier,
      confidenceThreshold,
      autoActions,
      isActive,
      createdBy,
    } = req.body ?? {};

    if (!name || !name.toString().trim()) {
      res.status(400).json({ message: 'name is required' });
      return;
    }

    const numericThreshold = Number(confidenceThreshold);
    const boundedThreshold = Number.isFinite(numericThreshold)
      ? Math.min(1, Math.max(0, numericThreshold))
      : 0.8;

    try {
      const insertion = await runQuery(
        `INSERT INTO ai_policies (
           name,
           description,
           model_identifier,
           confidence_threshold,
           auto_actions,
           is_active,
           created_by
         ) VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?);`,
        [
          name.trim(),
          description ?? null,
          modelIdentifier ?? null,
          boundedThreshold,
          JSON.stringify(autoActions ?? {}),
          isActive === false ? 0 : 1,
          createdBy ?? null,
        ],
      );

      const newId = insertion.insertId;
      const policy = await loadPolicyById(newId);
      res.status(201).json({ policy });
    } catch (error) {
      res.status(500).json({ message: 'Unable to create AI policy', error: error.message });
    }
  });

  router.put('/ai/policies/:policyId', async (req, res) => {
    const policyId = Number.parseInt(req.params.policyId, 10);
    if (!Number.isFinite(policyId)) {
      res.status(400).json({ message: 'Invalid policy id' });
      return;
    }

    const {
      name,
      description,
      modelIdentifier,
      confidenceThreshold,
      autoActions,
      isActive,
      createdBy,
    } = req.body ?? {};

    const updates = [];
    const params = [];

    if (name !== undefined) {
      const trimmed = name === null ? null : name.toString().trim();
      updates.push('name = ?');
      params.push(trimmed);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ?? null);
    }

    if (modelIdentifier !== undefined) {
      updates.push('model_identifier = ?');
      params.push(modelIdentifier ?? null);
    }

    if (confidenceThreshold !== undefined) {
      const numeric = Number(confidenceThreshold);
      const bounded = Number.isFinite(numeric) ? Math.min(1, Math.max(0, numeric)) : null;
      updates.push('confidence_threshold = ?');
      params.push(bounded);
    }

    if (autoActions !== undefined) {
      if (autoActions === null) {
        updates.push('auto_actions = NULL');
      } else {
        updates.push('auto_actions = CAST(? AS JSON)');
        params.push(JSON.stringify(autoActions));
      }
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (createdBy !== undefined) {
      updates.push('created_by = ?');
      params.push(createdBy ?? null);
    }

    if (!updates.length) {
      res.status(400).json({ message: 'No fields provided for update' });
      return;
    }

    try {
      params.push(policyId);
      const result = await runQuery(
        `UPDATE ai_policies SET ${updates.join(', ')} WHERE id = ? LIMIT 1;`,
        params,
      );

      if (!result.affectedRows) {
        res.status(404).json({ message: 'Policy not found' });
        return;
      }

      const policy = await loadPolicyById(policyId);
      res.json({ policy });
    } catch (error) {
      res.status(500).json({ message: 'Unable to update AI policy', error: error.message });
    }
  });

  router.delete('/ai/policies/:policyId', async (req, res) => {
    const policyId = Number.parseInt(req.params.policyId, 10);
    if (!Number.isFinite(policyId)) {
      res.status(400).json({ message: 'Invalid policy id' });
      return;
    }

    try {
      const result = await runQuery(
        'DELETE FROM ai_policies WHERE id = ? LIMIT 1;',
        [policyId],
      );

      if (!result.affectedRows) {
        res.status(404).json({ message: 'Policy not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Unable to delete AI policy', error: error.message });
    }
  });

  router.get('/ai/settings', async (_req, res) => {
    try {
      const payload = await loadAiSettings();
      res.json(payload);
    } catch (error) {
      res.status(500).json({ message: 'Unable to load AI settings', error: error.message });
    }
  });

  router.put('/ai/settings', async (req, res) => {
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
             VALUES ('ai', ?, CAST(? AS JSON), ?)
             ON DUPLICATE KEY UPDATE
               setting_value = VALUES(setting_value),
               updated_by = VALUES(updated_by),
               updated_at = CURRENT_TIMESTAMP;`,
            [key, JSON.stringify(value ?? null), updatedBy ?? null],
          );
        }
      });

      const payload = await loadAiSettings();
      res.json(payload);
    } catch (error) {
      res.status(500).json({ message: 'Unable to update AI settings', error: error.message });
    }
  });
};

export default registerAIRoutes;
