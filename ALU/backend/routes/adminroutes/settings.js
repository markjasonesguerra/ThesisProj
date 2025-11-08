import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { runQuery, withTransaction } from '../../db.js';
import { SALT_ROUNDS } from '../../utils.js';

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

const toArrayFromCsv = (value) => {
  if (!value) {
    return [];
  }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const formatAdminListRow = (row) => {
  const roles = toArrayFromCsv(row.roleNames);
  const roleCodes = toArrayFromCsv(row.roleCodes);
  const roleIds = toArrayFromCsv(row.roleIds).map((item) => Number(item));

  return {
    id: row.id,
    uuid: row.uuid,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || null,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    roles,
    roleCodes,
    roleIds,
  };
};

const buildOrganizationCode = (name) => {
  if (!name) {
    return null;
  }
  const initials = name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (initials.length >= 2) {
    return initials.slice(0, 6);
  }

  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || null;
};

const loadAdminByIdentifier = async (identifier) => {
  const rows = await runQuery(
    `SELECT
       a.id,
       a.uuid,
       a.email,
       a.first_name AS firstName,
       a.last_name AS lastName,
       a.status,
       a.last_login_at AS lastLoginAt,
       a.created_at AS createdAt,
       a.updated_at AS updatedAt,
       ara.id AS assignmentId,
       ara.assigned_at AS assignedAt,
       ar.id AS roleId,
       ar.code AS roleCode,
       ar.name AS roleName,
       ar.description AS roleDescription,
       ar.permissions AS rolePermissions
     FROM admins a
     LEFT JOIN admin_role_assignments ara ON ara.admin_id = a.id
     LEFT JOIN admin_roles ar ON ar.id = ara.role_id
     WHERE a.id = ? OR a.uuid = ? OR a.email = ?;`,
    [identifier, identifier, identifier],
  );

  if (!rows.length) {
    return null;
  }

  const base = rows[0];
  const roles = rows
    .filter((row) => row.roleId)
    .map((row) => ({
      id: row.roleId,
      code: row.roleCode,
      name: row.roleName,
      description: row.roleDescription,
      permissions: parseJsonColumn(row.rolePermissions) ?? [],
      assignedAt: row.assignedAt,
    }));

  return {
    id: base.id,
    uuid: base.uuid,
    email: base.email,
    firstName: base.firstName,
    lastName: base.lastName,
    fullName: [base.firstName, base.lastName].filter(Boolean).join(' ').trim() || null,
    status: base.status,
    lastLoginAt: base.lastLoginAt,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    roles,
  };
};

const loadSystemSettings = async () => {
  const rows = await runQuery(
    `SELECT
       setting_key AS settingKey,
       setting_value AS settingValue,
       updated_by AS updatedBy,
       updated_at AS updatedAt
     FROM system_settings
     WHERE category = 'system'
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

const registerAdminSettingsRoutes = (router) => {
  router.get('/settings/admin-users', async (_req, res) => {
    try {
      const rows = await runQuery(
        `SELECT
           a.id,
           a.uuid,
           a.email,
           a.first_name AS firstName,
           a.last_name AS lastName,
           a.status,
           a.last_login_at AS lastLoginAt,
           a.created_at AS createdAt,
           a.updated_at AS updatedAt,
           GROUP_CONCAT(DISTINCT ar.name ORDER BY ar.name SEPARATOR ',') AS roleNames,
           GROUP_CONCAT(DISTINCT ar.code ORDER BY ar.name SEPARATOR ',') AS roleCodes,
           GROUP_CONCAT(DISTINCT ar.id ORDER BY ar.name SEPARATOR ',') AS roleIds
         FROM admins a
         LEFT JOIN admin_role_assignments ara ON ara.admin_id = a.id
         LEFT JOIN admin_roles ar ON ar.id = ara.role_id
         GROUP BY a.id
         ORDER BY a.created_at DESC, a.id DESC;`,
      );

      const admins = rows.map((row) => formatAdminListRow(row));
      const stats = await runQuery(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN status IN ('suspended','disabled') THEN 1 ELSE 0 END) AS restricted
        FROM admins;
      `);

      res.json({
        admins,
        meta: {
          total: Number(stats[0]?.total ?? 0),
          active: Number(stats[0]?.active ?? 0),
          restricted: Number(stats[0]?.restricted ?? 0),
        },
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load admin users', error: error.message });
    }
  });

  router.get('/settings/admin-users/:adminId', async (req, res) => {
    const { adminId } = req.params;

    try {
      const admin = await loadAdminByIdentifier(adminId);
      if (!admin) {
        res.status(404).json({ message: 'Admin not found' });
        return;
      }

      res.json({ admin });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load admin user', error: error.message });
    }
  });

  router.post('/settings/admin-users', async (req, res) => {
    const {
      email,
      password,
      firstName,
      lastName,
      status = 'invited',
      roles = [],
    } = req.body ?? {};

    if (!email || !email.toString().trim()) {
      res.status(400).json({ message: 'email is required' });
      return;
    }

    if (!password || password.toString().length < 8) {
      res.status(400).json({ message: 'password must be at least 8 characters' });
      return;
    }

    if (!firstName || !lastName) {
      res.status(400).json({ message: 'firstName and lastName are required' });
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(password.toString(), SALT_ROUNDS);
      let newAdminId;

      await withTransaction(async (connection) => {
        const [insertResult] = await connection.query(
          `INSERT INTO admins (
             uuid,
             email,
             password_hash,
             first_name,
             last_name,
             status
           ) VALUES (?, ?, ?, ?, ?, ?);`,
          [
            randomUUID(),
            email.trim().toLowerCase(),
            passwordHash,
            firstName.trim(),
            lastName.trim(),
            status,
          ],
        );

        newAdminId = insertResult.insertId;

        const uniqueRoles = Array.isArray(roles)
          ? [...new Set(roles.map((role) => Number(role)).filter((value) => Number.isFinite(value)))]
          : [];

        if (uniqueRoles.length) {
          const placeholders = uniqueRoles.map(() => '(?, ?)').join(', ');
          const params = uniqueRoles.flatMap((roleId) => [newAdminId, roleId]);
          await connection.query(
            `INSERT INTO admin_role_assignments (admin_id, role_id) VALUES ${placeholders};`,
            params,
          );
        }
      });

      const admin = await loadAdminByIdentifier(newAdminId);
      res.status(201).json({ admin });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ message: 'Email already in use' });
        return;
      }
      res.status(500).json({ message: 'Unable to create admin user', error: error.message });
    }
  });

  router.put('/settings/admin-users/:adminId', async (req, res) => {
    const adminId = Number.parseInt(req.params.adminId, 10);
    if (!Number.isFinite(adminId)) {
      res.status(400).json({ message: 'Invalid admin id' });
      return;
    }

    const {
      email,
      firstName,
      lastName,
      status,
      roles,
    } = req.body ?? {};

    const existing = await runQuery('SELECT id FROM admins WHERE id = ? LIMIT 1;', [adminId]);
    if (!existing.length) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    const updates = [];
    const params = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email ? email.toString().trim().toLowerCase() : null);
    }

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      params.push(firstName ? firstName.toString().trim() : null);
    }

    if (lastName !== undefined) {
      updates.push('last_name = ?');
      params.push(lastName ? lastName.toString().trim() : null);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    const updateRoles = Array.isArray(roles);

    if (!updates.length && !updateRoles) {
      res.status(400).json({ message: 'No updates provided' });
      return;
    }

    try {
      await withTransaction(async (connection) => {
        if (updates.length) {
          params.push(adminId);
          await connection.query(
            `UPDATE admins SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? LIMIT 1;`,
            params,
          );
        }

        if (updateRoles) {
          await connection.query('DELETE FROM admin_role_assignments WHERE admin_id = ?;', [adminId]);

          const normalizedRoles = [...new Set(roles.map((role) => Number(role)).filter((value) => Number.isFinite(value)))];
          if (normalizedRoles.length) {
            const placeholders = normalizedRoles.map(() => '(?, ?)').join(', ');
            const roleParams = normalizedRoles.flatMap((roleId) => [adminId, roleId]);
            await connection.query(
              `INSERT INTO admin_role_assignments (admin_id, role_id) VALUES ${placeholders};`,
              roleParams,
            );
          }
        }
      });

      const admin = await loadAdminByIdentifier(adminId);
      res.json({ admin });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ message: 'Email already in use' });
        return;
      }
      res.status(500).json({ message: 'Unable to update admin user', error: error.message });
    }
  });

  router.patch('/settings/admin-users/:adminId/password', async (req, res) => {
    const adminId = Number.parseInt(req.params.adminId, 10);
    if (!Number.isFinite(adminId)) {
      res.status(400).json({ message: 'Invalid admin id' });
      return;
    }

    const { password } = req.body ?? {};
    if (!password || password.toString().length < 8) {
      res.status(400).json({ message: 'password must be at least 8 characters' });
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(password.toString(), SALT_ROUNDS);
      const result = await runQuery(
        `UPDATE admins
           SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
         LIMIT 1;`,
        [passwordHash, adminId],
      );

      if (!result.affectedRows) {
        res.status(404).json({ message: 'Admin not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Unable to update password', error: error.message });
    }
  });

  router.delete('/settings/admin-users/:adminId', async (req, res) => {
    const adminId = Number.parseInt(req.params.adminId, 10);
    if (!Number.isFinite(adminId)) {
      res.status(400).json({ message: 'Invalid admin id' });
      return;
    }

    try {
      const result = await runQuery('DELETE FROM admins WHERE id = ? LIMIT 1;', [adminId]);
      if (!result.affectedRows) {
        res.status(404).json({ message: 'Admin not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Unable to delete admin user', error: error.message });
    }
  });

  router.get('/settings/roles', async (_req, res) => {
    try {
      const rows = await runQuery(
        `SELECT
           ar.id,
           ar.code,
           ar.name,
           ar.description,
           ar.permissions,
           ar.created_at AS createdAt,
           COUNT(ara.id) AS adminCount
         FROM admin_roles ar
         LEFT JOIN admin_role_assignments ara ON ara.role_id = ar.id
         GROUP BY ar.id
         ORDER BY ar.name ASC;`,
      );

      const roles = rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description ?? null,
        permissions: parseJsonColumn(row.permissions) ?? [],
        createdAt: row.createdAt,
        adminCount: Number(row.adminCount ?? 0),
      }));

      res.json({ roles });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load admin roles', error: error.message });
    }
  });

  router.get('/settings/roles/:roleId', async (req, res) => {
    const roleId = Number.parseInt(req.params.roleId, 10);
    if (!Number.isFinite(roleId)) {
      res.status(400).json({ message: 'Invalid role id' });
      return;
    }

    try {
      const rows = await runQuery(
        `SELECT
           ar.id,
           ar.code,
           ar.name,
           ar.description,
           ar.permissions,
           ar.created_at AS createdAt,
           COUNT(ara.id) AS adminCount
         FROM admin_roles ar
         LEFT JOIN admin_role_assignments ara ON ara.role_id = ar.id
         WHERE ar.id = ?
         GROUP BY ar.id
         LIMIT 1;`,
        [roleId],
      );

      const roleRow = rows[0];
      if (!roleRow) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }

      const assignedAdmins = await runQuery(
        `SELECT
           a.id,
           a.uuid,
           a.email,
           a.first_name AS firstName,
           a.last_name AS lastName,
           ara.assigned_at AS assignedAt
         FROM admin_role_assignments ara
         JOIN admins a ON a.id = ara.admin_id
         WHERE ara.role_id = ?
         ORDER BY ara.assigned_at DESC;
        `,
        [roleId],
      );

      const role = {
        id: roleRow.id,
        code: roleRow.code,
        name: roleRow.name,
        description: roleRow.description ?? null,
        permissions: parseJsonColumn(roleRow.permissions) ?? [],
        createdAt: roleRow.createdAt,
        adminCount: Number(roleRow.adminCount ?? 0),
        admins: assignedAdmins.map((admin) => ({
          id: admin.id,
          uuid: admin.uuid,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          fullName: [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim() || null,
          assignedAt: admin.assignedAt,
        })),
      };

      res.json({ role });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load role', error: error.message });
    }
  });

  router.post('/settings/roles', async (req, res) => {
    const {
      code,
      name,
      description,
      permissions,
    } = req.body ?? {};

    if (!code || !code.toString().trim()) {
      res.status(400).json({ message: 'code is required' });
      return;
    }

    if (!name || !name.toString().trim()) {
      res.status(400).json({ message: 'name is required' });
      return;
    }

    try {
      const result = await runQuery(
        `INSERT INTO admin_roles (
           code,
           name,
           description,
           permissions
         ) VALUES (?, ?, ?, CAST(? AS JSON));`,
        [
          code.trim(),
          name.trim(),
          description ?? null,
          JSON.stringify(permissions ?? []),
        ],
      );

      const role = await runQuery(
        `SELECT
           ar.id,
           ar.code,
           ar.name,
           ar.description,
           ar.permissions,
           ar.created_at AS createdAt
         FROM admin_roles ar
         WHERE ar.id = ?
         LIMIT 1;`,
        [result.insertId],
      );

      const row = role[0];
      res.status(201).json({
        role: {
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description ?? null,
          permissions: parseJsonColumn(row.permissions) ?? [],
          createdAt: row.createdAt,
          adminCount: 0,
        },
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ message: 'Role code already exists' });
        return;
      }
      res.status(500).json({ message: 'Unable to create role', error: error.message });
    }
  });

  router.put('/settings/roles/:roleId', async (req, res) => {
    const roleId = Number.parseInt(req.params.roleId, 10);
    if (!Number.isFinite(roleId)) {
      res.status(400).json({ message: 'Invalid role id' });
      return;
    }

    const {
      code,
      name,
      description,
      permissions,
    } = req.body ?? {};

    const updates = [];
    const params = [];

    if (code !== undefined) {
      updates.push('code = ?');
      params.push(code ? code.toString().trim() : null);
    }

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name ? name.toString().trim() : null);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ?? null);
    }

    if (permissions !== undefined) {
      updates.push('permissions = CAST(? AS JSON)');
      params.push(JSON.stringify(permissions ?? []));
    }

    if (!updates.length) {
      res.status(400).json({ message: 'No fields provided for update' });
      return;
    }

    try {
      params.push(roleId);
      const result = await runQuery(
        `UPDATE admin_roles SET ${updates.join(', ')} WHERE id = ? LIMIT 1;`,
        params,
      );

      if (!result.affectedRows) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }

      const role = await runQuery(
        `SELECT
           ar.id,
           ar.code,
           ar.name,
           ar.description,
           ar.permissions,
           ar.created_at AS createdAt,
           COUNT(ara.id) AS adminCount
         FROM admin_roles ar
         LEFT JOIN admin_role_assignments ara ON ara.role_id = ar.id
         WHERE ar.id = ?
         GROUP BY ar.id;`,
        [roleId],
      );

      const row = role[0];
      res.json({
        role: {
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description ?? null,
          permissions: parseJsonColumn(row.permissions) ?? [],
          createdAt: row.createdAt,
          adminCount: Number(row.adminCount ?? 0),
        },
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ message: 'Role code already exists' });
        return;
      }
      res.status(500).json({ message: 'Unable to update role', error: error.message });
    }
  });

  router.delete('/settings/roles/:roleId', async (req, res) => {
    const roleId = Number.parseInt(req.params.roleId, 10);
    if (!Number.isFinite(roleId)) {
      res.status(400).json({ message: 'Invalid role id' });
      return;
    }

    try {
      const result = await runQuery('DELETE FROM admin_roles WHERE id = ? LIMIT 1;', [roleId]);
      if (!result.affectedRows) {
        res.status(404).json({ message: 'Role not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Unable to delete role', error: error.message });
    }
  });

  router.get('/settings/permissions', async (_req, res) => {
    try {
      const rows = await runQuery('SELECT permissions FROM admin_roles WHERE permissions IS NOT NULL;');
      const permissionSet = new Set();

      rows.forEach((row) => {
        const value = parseJsonColumn(row.permissions);
        if (Array.isArray(value)) {
          value.filter((item) => typeof item === 'string').forEach((item) => permissionSet.add(item));
        } else if (value && typeof value === 'object') {
          Object.entries(value).forEach(([key, enabled]) => {
            if (enabled) {
              permissionSet.add(key);
            }
          });
        }
      });

      res.json({ permissions: Array.from(permissionSet).sort() });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load permissions', error: error.message });
    }
  });

  router.get('/settings/organizations', async (_req, res) => {
    try {
      const companyRows = await runQuery(
        `SELECT
           ue.company AS name,
           COUNT(DISTINCT ue.user_id) AS memberCount,
           SUM(CASE WHEN u.status = 'approved' THEN 1 ELSE 0 END) AS activeCount
         FROM user_employment ue
         JOIN users u ON u.id = ue.user_id
         WHERE ue.company IS NOT NULL AND ue.company <> ''
         GROUP BY ue.company
         ORDER BY memberCount DESC, ue.company ASC;`,
      );

      const unionRows = await runQuery(
        `SELECT
           ue.union_affiliation AS name,
           COUNT(DISTINCT ue.user_id) AS memberCount,
           SUM(CASE WHEN u.status = 'approved' THEN 1 ELSE 0 END) AS activeCount
         FROM user_employment ue
         JOIN users u ON u.id = ue.user_id
         WHERE ue.union_affiliation IS NOT NULL AND ue.union_affiliation <> ''
         GROUP BY ue.union_affiliation
         ORDER BY memberCount DESC, ue.union_affiliation ASC;`,
      );

      const companies = companyRows.map((row) => ({
        name: row.name,
        code: buildOrganizationCode(row.name),
        memberCount: Number(row.memberCount ?? 0),
        activeMembers: Number(row.activeCount ?? 0),
      }));

      const unions = unionRows.map((row) => ({
        name: row.name,
        code: buildOrganizationCode(row.name),
        memberCount: Number(row.memberCount ?? 0),
        activeMembers: Number(row.activeCount ?? 0),
      }));

      res.json({ companies, unions });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load organization data', error: error.message });
    }
  });

  router.get('/settings/system', async (_req, res) => {
    try {
      const payload = await loadSystemSettings();
      res.json(payload);
    } catch (error) {
      res.status(500).json({ message: 'Unable to load system settings', error: error.message });
    }
  });

  router.put('/settings/system', async (req, res) => {
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
             VALUES ('system', ?, CAST(? AS JSON), ?)
             ON DUPLICATE KEY UPDATE
               setting_value = VALUES(setting_value),
               updated_by = VALUES(updated_by),
               updated_at = CURRENT_TIMESTAMP;`,
            [key, JSON.stringify(value ?? null), updatedBy ?? null],
          );
        }
      });

      const payload = await loadSystemSettings();
      res.json(payload);
    } catch (error) {
      res.status(500).json({ message: 'Unable to update system settings', error: error.message });
    }
  });
};

export default registerAdminSettingsRoutes;
