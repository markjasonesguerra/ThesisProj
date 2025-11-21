import { runQuery, withTransaction } from '../../db.js';
import { computeTimeAgo } from './helpers.js';

const resolvePreviewUrl = (value) => {
  if (!value) return null;
  const url = String(value).trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const baseCandidates = [
    process.env.MEDIA_BASE_URL,
    process.env.UPLOADS_BASE_URL,
    process.env.API_BASE_URL,
    process.env.FILE_BASE_URL,
    process.env.CLIENT_URL,
    process.env.PORT ? `http://localhost:${process.env.PORT}` : null,
  ];

  const base = baseCandidates.find((candidate) => {
    if (!candidate) return false;
    const trimmed = String(candidate).trim();
    return trimmed.length > 0;
  });

  if (!base) {
    return url;
  }

  const normalizedBase = String(base).trim().replace(/\/+$/, '');
  return `${normalizedBase}/${url.replace(/^\/+/, '')}`;
};

const CATEGORY_OPTIONS = ['Assembly', 'Training', 'Outreach', 'Benefit', 'Other'];
const STATUS_OPTIONS = ['Draft', 'Published', 'Archived'];

class HttpError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code ?? null;
    this.details = options.details ?? null;
  }
}

const handleRouteError = (res, error, fallbackMessage, fallbackCode) => {
  if (error instanceof HttpError) {
    if (error.status >= 500) {
      console.error('[events routes] unexpected error', error);
    }
    const payload = { message: error.message };
    if (error.code) {
      payload.errorCode = error.code;
    }
    if (error.details) {
      payload.details = error.details;
    }
    return res.status(error.status).json(payload);
  }

  console.error('[events routes] unhandled error', error);

  const response = {
    message: fallbackMessage,
    errorCode: fallbackCode,
  };

  if (error && error.code) {
    response.details = { driverCode: error.code };
  }

  if (error && typeof error.sqlMessage === 'string' && error.sqlMessage.trim()) {
    if (!response.details) {
      response.details = {};
    }
    response.details.reason = error.sqlMessage.trim();
  }

  if (error && typeof error.message === 'string' && error.message.trim()) {
    response.details = response.details || {};
    if (!response.details.reason) {
      response.details.reason = error.message.trim();
    }
  }

  return res.status(500).json(response);
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const toOptionalInteger = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  return Math.floor(num);
};

const normalizeSqlDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const buildSampleEvents = () => {
  const base = new Date();
  base.setHours(9, 0, 0, 0);

  const template = [
    {
      slug: 'sample-leadership-huddle',
      title: 'Leadership Huddle & Briefing',
      description: 'Quick sync for chapter leads covering negotiations, safety checkpoints, and upcoming community drives.',
      category: 'Assembly',
      venue: 'ALU Headquarters - Union Hall',
      startOffsetDays: 5,
      durationHours: 2,
      capacity: 60,
      status: 'Draft',
      previewImage: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
      externalLink: null,
    },
    {
      slug: 'sample-campus-outreach',
      title: 'Campus Outreach Caravan',
      description: 'Member-volunteers introduce union services to graduating students and endorse internship openings.',
      category: 'Outreach',
      venue: 'Polytechnic University of the Philippines - Main Grounds',
      startOffsetDays: -12,
      durationHours: 6,
      capacity: 180,
      status: 'Published',
      previewImage: 'https://images.unsplash.com/photo-1521737604893-0f3a27d7a057?auto=format&fit=crop&w=1200&q=80',
      externalLink: 'https://www.aluzon.org/events/campus-outreach',
    },
    {
      slug: 'sample-union-wellness-fair',
      title: 'Union Wellness Fair',
      description: 'Health screenings, financial coaching booths, and family-friendly activities for members.',
      category: 'Benefit',
      venue: 'Quezon City Memorial Circle - People\'s Hall',
      startOffsetDays: 18,
      durationHours: 8,
      capacity: 250,
      status: 'Published',
      previewImage: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1200&q=80',
      externalLink: null,
    },
  ];

  return template.map((item, index) => {
    const start = new Date(base.getTime() + item.startOffsetDays * MS_IN_DAY);
    const end = new Date(start.getTime() + (item.durationHours ?? 2) * 60 * 60 * 1000);

    return {
      id: `sample-${String(index + 1).padStart(3, '0')}`,
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: item.category,
      venue: item.venue,
      startAt: normalizeSqlDate(start),
      endAt: normalizeSqlDate(end),
      capacity: item.capacity ?? null,
      createdBy: null,
      timeAgo: null,
      previewImage: resolvePreviewUrl(item.previewImage),
      status: item.status,
      externalLink: item.externalLink,
    };
  });
};

const resolveAdminOwnerId = async (connection, candidateId) => {
  const candidate = toOptionalInteger(candidateId);
  if (candidate) {
    const [existing] = await connection.query('SELECT id FROM admins WHERE id = ? LIMIT 1;', [candidate]);
    if (existing.length) {
      return existing[0].id;
    }
  }

  const [fallback] = await connection.query('SELECT id FROM admins ORDER BY id ASC LIMIT 1;');
  if (fallback.length) {
    return fallback[0].id;
  }

  return null;
};

const normalizeCategory = (value) => {
  if (!value) return 'Other';
  const match = CATEGORY_OPTIONS.find((option) => option === value);
  return match ?? 'Other';
};

const normalizeStatus = (value) => {
  if (!value) return 'Draft';
  const match = STATUS_OPTIONS.find((option) => option.toLowerCase() === String(value).toLowerCase());
  return match ?? 'Draft';
};

const toSqlDateTime = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const dateTimeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?$/);
    if (dateTimeMatch) {
      const [, datePart, timePart] = dateTimeMatch;
      const normalizedTime = timePart ? `${timePart.length === 5 ? `${timePart}:00` : timePart}` : '00:00:00';
      return `${datePart} ${normalizedTime}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const parseCapacity = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
};

const slugify = (value) => {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const buildSlug = (title) => {
  const base = slugify(title);
  if (!base) {
    return `event-${Date.now()}`;
  }
  return base;
};

const ensureUniqueSlug = async (connection, slug, excludeEventId = null) => {
  let candidate = slug && slug.length ? slug : `event-${Date.now()}`;
  let suffix = 1;

  while (true) {
    const params = [candidate];
    let sql = 'SELECT id FROM events WHERE slug = ?';
    if (excludeEventId) {
      sql += ' AND id <> ?';
      params.push(excludeEventId);
    }

    const [rows] = await connection.query(sql, params);
    if (!rows.length) {
      return candidate;
    }

    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }
};

const toNullableText = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const upsertUpload = async (connection, {
  category,
  slug,
  previousSlug,
  value,
  adminId,
  mimeType = 'text/plain',
}) => {
  if (!category || !slug) return;

  if (previousSlug && previousSlug !== slug) {
    await connection.query(
      `DELETE FROM uploads WHERE category = ? AND original_name = ?`,
      [category, previousSlug],
    );
  }

  await connection.query(
    `DELETE FROM uploads WHERE category = ? AND original_name = ?`,
    [category, slug],
  );

  if (!value) {
    return;
  }

  await connection.query(
    `INSERT INTO uploads (owner_admin_id, category, original_name, storage_path, mime_type, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, NOW())`,
    [adminId ?? null, category, slug, value, mimeType],
  );
};

const baseEventSelect = `
  SELECT
    e.id,
    e.slug,
    e.title,
    e.description,
    e.category,
    e.venue,
    e.start_at AS startAt,
    e.end_at AS endAt,
    e.capacity,
    e.created_by AS createdBy,
    preview.storage_path AS previewImage,
    status_upload.storage_path AS statusLabel,
    link_upload.storage_path AS externalLink
  FROM events e
  LEFT JOIN uploads preview
    ON preview.category = 'event_preview'
   AND preview.original_name = e.slug
  LEFT JOIN uploads status_upload
    ON status_upload.category = 'event_status'
   AND status_upload.original_name = e.slug
  LEFT JOIN uploads link_upload
    ON link_upload.category = 'event_link'
   AND link_upload.original_name = e.slug
`;

const mapEventRow = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  category: row.category,
  venue: row.venue,
  startAt: row.startAt,
  endAt: row.endAt,
  capacity: row.capacity,
  createdBy: row.createdBy,
  timeAgo: row.startAt ? computeTimeAgo(row.startAt) : null,
  previewImage: resolvePreviewUrl(row.previewImage),
  status: row.statusLabel ?? 'Draft',
  externalLink: row.externalLink ?? null,
});

const fetchEventById = async (eventId, connection) => {
  if (connection) {
    const [rows] = await connection.query(
      `${baseEventSelect}
       WHERE e.id = ?
       LIMIT 1;`,
      [eventId],
    );
    const row = rows[0];
    if (!row) return null;
    return mapEventRow(row);
  }

  const rows = await runQuery(
    `${baseEventSelect}
     WHERE e.id = ?
     LIMIT 1;`,
    [eventId],
  );
  const row = rows[0];
  if (!row) return null;
  return mapEventRow(row);
};

const registerEventsRoutes = (router) => {
  router.get('/events', async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize, 10) || 20));
    const offset = (page - 1) * pageSize;

    const filters = [];
    const params = [];

    if (req.query.category) {
      filters.push('e.category = ?');
      params.push(req.query.category);
    }
    if (req.query.slug) {
      filters.push('e.slug = ?');
      params.push(req.query.slug);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    try {
      const rows = await runQuery(
        `${baseEventSelect}
         ${where}
         ORDER BY e.start_at DESC, e.id DESC
         LIMIT ? OFFSET ?;`,
        [...params, pageSize, offset],
      );

      const totals = await runQuery(`SELECT COUNT(*) AS total FROM events e ${where};`, params);
      const total = Number(totals[0]?.total ?? 0);

      const results = rows.map(mapEventRow);

      if (!results.length) {
        const sampleEvents = buildSampleEvents();
        res.json({
          meta: { total: sampleEvents.length, page, pageSize, isSample: true },
          results: sampleEvents,
        });
        return;
      }

      res.json({ meta: { total, page, pageSize }, results });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load events', error: error.message });
    }
  });

  router.get('/events/:eventId', async (req, res) => {
    const eventId = Number.parseInt(req.params.eventId, 10);
    if (!Number.isFinite(eventId)) {
      res.status(400).json({ message: 'Invalid event id' });
      return;
    }

    try {
      const event = await fetchEventById(eventId);
      if (!event) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      const registrations = await runQuery(
        `SELECT er.id, er.user_id AS userId, er.status, er.registered_at AS registeredAt, CONCAT_WS(' ', up.first_name, up.last_name) AS userName, u.email AS userEmail
         FROM event_registrations er
         LEFT JOIN users u ON u.id = er.user_id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE er.event_id = ?
         ORDER BY er.registered_at ASC;`,
        [eventId],
      );

      res.json({
        event,
        registrations,
      });
    } catch (error) {
      res.status(500).json({ message: 'Unable to load event', error: error.message });
    }
  });

  router.post('/events', async (req, res) => {
    const {
      title,
      description,
      category,
      venue,
      startAt,
      endAt,
      capacity,
      previewImage,
      status,
      externalLink,
      adminId,
    } = req.body ?? {};

    if (!title || !startAt || !endAt || !venue) {
      res.status(400).json({
        message: 'Missing required event fields',
        errorCode: 'EVENT_FIELDS_INCOMPLETE',
        details: {
          missing: {
            title: !title,
            startAt: !startAt,
            endAt: !endAt,
            venue: !venue,
          },
        },
      });
      return;
    }

    try {
      const event = await withTransaction(async (connection) => {
        const ownerAdminId = await resolveAdminOwnerId(connection, adminId);
        if (!ownerAdminId) {
          throw new HttpError(400, 'No admin accounts available to own the event.', {
            code: 'EVENT_OWNER_NOT_FOUND',
            details: {
              hint: 'Create at least one admin user before adding events.',
            },
          });
        }

        const normalizedCategory = normalizeCategory(category);
        const normalizedStatus = normalizeStatus(status);
        const normalizedVenue = String(venue).trim();
        const normalizedDescription = toNullableText(description);
        const startDate = toSqlDateTime(startAt);
        const endDate = toSqlDateTime(endAt);
        const slugBase = buildSlug(title);
        const slug = await ensureUniqueSlug(connection, slugBase);
        const capacityValue = parseCapacity(capacity);

        if (!startDate) {
          throw new HttpError(400, 'Invalid start date provided.', {
            code: 'EVENT_INVALID_START',
            details: { startAt },
          });
        }

        if (!endDate) {
          throw new HttpError(400, 'Invalid end date provided.', {
            code: 'EVENT_INVALID_END',
            details: { endAt },
          });
        }

        if (new Date(endDate) < new Date(startDate)) {
          throw new HttpError(400, 'Event end time must be later than the start time.', {
            code: 'EVENT_INVALID_RANGE',
            details: { startAt, endAt },
          });
        }

        const [result] = await connection.query(
          `INSERT INTO events (slug, title, description, category, venue, start_at, end_at, capacity, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            slug,
            String(title).trim(),
            normalizedDescription,
            normalizedCategory,
            normalizedVenue,
            startDate,
            endDate,
            capacityValue,
            ownerAdminId,
          ],
        );

        const eventId = result.insertId;

        const previewValue = toNullableText(previewImage);
        const externalValue = toNullableText(externalLink);

        if (previewImage !== undefined) {
          await upsertUpload(connection, {
            category: 'event_preview',
            slug,
            value: previewValue,
            adminId: ownerAdminId,
            mimeType: 'image/jpeg',
          });
        }

        await upsertUpload(connection, {
          category: 'event_status',
          slug,
          value: normalizedStatus,
          adminId: ownerAdminId,
        });

        if (externalLink !== undefined) {
          await upsertUpload(connection, {
            category: 'event_link',
            slug,
            value: externalValue,
            adminId: ownerAdminId,
            mimeType: 'text/uri-list',
          });
        }

        return fetchEventById(eventId, connection);
      });

      if (!event) {
        res.status(500).json({ message: 'Unable to create event' });
        return;
      }

      res.status(201).json({ event });
    } catch (error) {
      return handleRouteError(res, error, 'Unable to create event', 'EVENT_CREATE_FAILED');
    }
  });

  router.put('/events/:eventId', async (req, res) => {
    const eventId = Number.parseInt(req.params.eventId, 10);
    if (!Number.isFinite(eventId)) {
      res.status(400).json({ message: 'Invalid event id' });
      return;
    }

    const {
      title,
      description,
      category,
      venue,
      startAt,
      endAt,
      capacity,
      previewImage,
      status,
      externalLink,
      adminId,
    } = req.body ?? {};

    try {
      const event = await withTransaction(async (connection) => {
        const existing = await fetchEventById(eventId, connection);
        if (!existing) {
          return null;
        }

        const updates = [];
        const params = [];

        if (title !== undefined) {
          updates.push('title = ?');
          params.push(String(title).trim());
        }

        if (description !== undefined) {
          updates.push('description = ?');
          params.push(toNullableText(description));
        }

        if (category !== undefined) {
          updates.push('category = ?');
          params.push(normalizeCategory(category));
        }

        if (venue !== undefined) {
          updates.push('venue = ?');
          params.push(String(venue).trim());
        }

        let startDateValue = null;
        if (startAt !== undefined) {
          const date = toSqlDateTime(startAt);
          if (!date) {
            throw new HttpError(400, 'Invalid start date provided.', {
              code: 'EVENT_INVALID_START',
              details: { startAt },
            });
          }
          updates.push('start_at = ?');
          startDateValue = date;
          params.push(date);
        }

        if (endAt !== undefined) {
          const date = toSqlDateTime(endAt);
          if (!date) {
            throw new HttpError(400, 'Invalid end date provided.', {
              code: 'EVENT_INVALID_END',
              details: { endAt },
            });
          }
          const startDateReference = startDateValue ?? existing.startAt ?? null;
          if (startDateReference && new Date(date) < new Date(startDateReference)) {
            throw new HttpError(400, 'Event end time must be later than the start time.', {
              code: 'EVENT_INVALID_RANGE',
              details: { startAt: startDateReference, endAt },
            });
          }
          updates.push('end_at = ?');
          params.push(date);
        }

        if (capacity !== undefined) {
          updates.push('capacity = ?');
          params.push(parseCapacity(capacity));
        }

        let slug = existing.slug;
        if (title !== undefined && title) {
          const newSlugBase = buildSlug(title);
          if (newSlugBase && newSlugBase !== existing.slug) {
            const uniqueSlug = await ensureUniqueSlug(connection, newSlugBase, eventId);
            updates.push('slug = ?');
            params.push(uniqueSlug);
            slug = uniqueSlug;
          }
        }

        if (updates.length) {
          params.push(eventId);
          await connection.query(
            `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
            params,
          );
        }

        const previewValue = toNullableText(previewImage);
        const externalValue = toNullableText(externalLink);
        const ownerAdminId = await resolveAdminOwnerId(connection, adminId ?? existing.createdBy);

        if (previewImage !== undefined) {
          await upsertUpload(connection, {
            category: 'event_preview',
            slug,
            previousSlug: existing.slug,
            value: previewValue,
            adminId: ownerAdminId,
            mimeType: 'image/jpeg',
          });
        }

        if (status !== undefined) {
          await upsertUpload(connection, {
            category: 'event_status',
            slug,
            previousSlug: existing.slug,
            value: normalizeStatus(status),
            adminId: ownerAdminId,
          });
        }

        if (externalLink !== undefined) {
          await upsertUpload(connection, {
            category: 'event_link',
            slug,
            previousSlug: existing.slug,
            value: externalValue,
            adminId: ownerAdminId,
            mimeType: 'text/uri-list',
          });
        }

        return fetchEventById(eventId, connection);
      });

      if (!event) {
        res.status(404).json({ message: 'Event not found' });
        return;
      }

      res.json({ event });
    } catch (error) {
      return handleRouteError(res, error, 'Unable to update event', 'EVENT_UPDATE_FAILED');
    }
  });

  router.delete('/events/:eventId', async (req, res) => {
    const eventId = Number.parseInt(req.params.eventId, 10);
    if (!Number.isFinite(eventId)) {
      res.status(400).json({ message: 'Invalid event id' });
      return;
    }

    try {
      const removed = await withTransaction(async (connection) => {
        const existing = await fetchEventById(eventId, connection);
        if (!existing) {
          throw new HttpError(404, 'Event not found', {
            code: 'EVENT_NOT_FOUND',
          });
        }

        if (existing.slug) {
          await connection.query(
            `DELETE FROM uploads WHERE original_name = ? AND category IN ('event_preview','event_status','event_link')`,
            [existing.slug],
          );
        }

        await connection.query('DELETE FROM events WHERE id = ? LIMIT 1;', [eventId]);
        return existing;
      });

      res.json({ success: true, event: removed });
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        return res.status(404).json({
          message: error.message,
          errorCode: error.code,
        });
      }
      return handleRouteError(res, error, 'Unable to delete event', 'EVENT_DELETE_FAILED');
    }
  });
};

export default registerEventsRoutes;
