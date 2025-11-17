USE alu;

-- =====================================================================
-- Admin test seed tuned for the alu2 schema
-- Safe, idempotent sample records that support the admin event management
-- =====================================================================

-- ---------------------------------------------------------------------
-- Seed admin roles and admins (parents for events)
-- ---------------------------------------------------------------------
INSERT INTO admin_roles (code, name, description, permissions, created_at)
VALUES
  ('super_admin', 'Super Administrator', 'Full access for QA seeding', JSON_ARRAY('events:manage','reports:view','members:review'), NOW()),
  ('events_manager', 'Events Manager', 'Manages events and registrations', JSON_ARRAY('events:view','events:edit','events:registrations'), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  permissions = VALUES(permissions);

INSERT INTO admins (uuid, email, password_hash, first_name, last_name, status, last_login_at, created_at, updated_at)
VALUES
  ('11111111-2222-3333-4444-555555555555', 'admin.super@alu.org', '$2a$10$seedHashSuperAdmin.0u5dIhKf1Gm8RtpQ3M4X7nvxM2B2B8JMIK8hG', 'Ana', 'Villanueva', 'active', DATE_SUB(NOW(), INTERVAL 1 DAY), NOW(), NOW()),
  ('22222222-3333-4444-5555-666666666666', 'admin.events@alu.org', '$2a$10$seedHashEventsAdmin.0u5dIhKf1Gm8RtpQ3M4X7nvxM2B2B8JMIK8hG', 'Marco', 'Reyes', 'active', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  status = VALUES(status),
  last_login_at = VALUES(last_login_at),
  updated_at = VALUES(updated_at);

-- Assign roles (idempotent via unique constraint on admin_id + role_id)
INSERT INTO admin_role_assignments (admin_id, role_id, assigned_at)
SELECT a.id, r.id, NOW()
FROM admins a
JOIN admin_roles r ON r.code = 'super_admin'
WHERE a.email = 'admin.super@alu.org'
ON DUPLICATE KEY UPDATE assigned_at = VALUES(assigned_at);

INSERT INTO admin_role_assignments (admin_id, role_id, assigned_at)
SELECT a.id, r.id, NOW()
FROM admins a
JOIN admin_roles r ON r.code = 'events_manager'
WHERE a.email = 'admin.events@alu.org'
ON DUPLICATE KEY UPDATE assigned_at = VALUES(assigned_at);

-- ---------------------------------------------------------------------
-- Core member records referenced by events and registrations
-- ---------------------------------------------------------------------
INSERT INTO users (uuid, email, phone, status, membership_no, last_login_at, created_at, updated_at)
VALUES
  ('33333333-4444-5555-6666-777777777777', 'member.juan@alu.org', '+639171234567', 'approved', 'ALU-000001', DATE_SUB(NOW(), INTERVAL 4 DAY), NOW(), NOW()),
  ('44444444-5555-6666-7777-888888888888', 'member.maria@alu.org', '+639188765432', 'approved', 'ALU-000002', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(), NOW()),
  ('55555555-6666-7777-8888-999999999999', 'member.lito@alu.org', '+639175551212', 'approved', 'ALU-000003', DATE_SUB(NOW(), INTERVAL 7 DAY), NOW(), NOW()),
  ('66666666-7777-8888-9999-000000000000', 'member.anne@alu.org', '+639177778888', 'email_verified', 'ALU-000004', NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  phone = VALUES(phone),
  status = VALUES(status),
  membership_no = VALUES(membership_no),
  last_login_at = VALUES(last_login_at),
  updated_at = VALUES(updated_at);

INSERT INTO user_profiles (user_id, first_name, middle_initial, last_name, suffix, date_of_birth, gender, marital_status, children_count, religion, education, address_line1, city, province, postal_code)
SELECT u.id, data.first_name, data.middle_initial, data.last_name, data.suffix, data.date_of_birth, data.gender, data.marital_status,
       data.children_count, data.religion, data.education, data.address_line1, data.city, data.province, data.postal_code
FROM (
  SELECT 'member.juan@alu.org' AS email, 'Juan' AS first_name, 'M' AS middle_initial, 'Dela Cruz' AS last_name, NULL AS suffix,
         '1985-05-14' AS date_of_birth, 'Male' AS gender, 'Married' AS marital_status, 2 AS children_count, 'Catholic' AS religion,
         'Bachelor of Science' AS education, '123 Main Street' AS address_line1, 'Quezon City' AS city, 'Metro Manila' AS province, '1105' AS postal_code
  UNION ALL
  SELECT 'member.maria@alu.org', 'Maria', NULL, 'Santos', NULL, '1987-11-02', 'Female', 'Single', 0, 'Catholic',
         'Masters in Education', '45 Jupiter Street', 'Makati', 'Metro Manila', '1209'
  UNION ALL
  SELECT 'member.lito@alu.org', 'Lito', 'R', 'Garcia', NULL, '1990-08-23', 'Male', 'Married', 1, 'Iglesia ni Cristo',
         'Bachelor of Arts', '88 Riverside Drive', 'Cebu City', 'Cebu', '6000'
  UNION ALL
  SELECT 'member.anne@alu.org', 'Anne', NULL, 'Reyes', NULL, '1995-03-09', 'Female', 'Single', 0, 'Christian',
         'Bachelor of Commerce', '9 Sampaguita Lane', 'Davao City', 'Davao del Sur', '8000'
) AS data
JOIN users u ON u.email = data.email
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  gender = VALUES(gender),
  marital_status = VALUES(marital_status),
  address_line1 = VALUES(address_line1),
  city = VALUES(city),
  province = VALUES(province);

INSERT INTO user_employment (user_id, company, department, position, employment_status, years_employed, payroll_number, union_position, union_affiliation)
SELECT u.id, data.company, data.department, data.position, data.employment_status, data.years_employed, data.payroll_number,
       data.union_position, data.union_affiliation
FROM (
  SELECT 'member.juan@alu.org' AS email, 'LRT Operations' AS company, 'Maintenance' AS department, 'Supervisor' AS position,
         'Regular' AS employment_status, 8.5 AS years_employed, 'LR-2211' AS payroll_number, 'Shop Steward' AS union_position,
         'LRT Workers Union' AS union_affiliation
  UNION ALL
  SELECT 'member.maria@alu.org', 'PAG-IBIG Fund', 'Member Services', 'Coordinator', 'Regular', 5.2, 'PF-1099', NULL,
         'PAG-IBIG Employees Union'
  UNION ALL
  SELECT 'member.lito@alu.org', 'Jollibee Foods Corp.', 'Operations', 'Assistant Manager', 'Regular', 3.8, 'JB-3377', NULL,
         'FFW'
  UNION ALL
  SELECT 'member.anne@alu.org', 'Ayala Land Inc.', 'Finance', 'Analyst', 'Probationary', 0.6, 'AL-5521', NULL,
         'ALU-Young Professionals'
) AS data
JOIN users u ON u.email = data.email
ON DUPLICATE KEY UPDATE
  company = VALUES(company),
  department = VALUES(department),
  position = VALUES(position),
  employment_status = VALUES(employment_status),
  years_employed = VALUES(years_employed);

-- ---------------------------------------------------------------------
-- Event catalogue with a mix of past, current, and future items
-- ---------------------------------------------------------------------
INSERT INTO events (slug, title, description, category, venue, start_at, end_at, capacity, created_by)
VALUES
  ('leadership-summit-2025', 'Leadership Summit 2025', 'Strategic planning session for chapter leaders.', 'Assembly', 'ALU Convention Hall', DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY) + INTERVAL 6 HOUR, 300, (SELECT id FROM admins WHERE email = 'admin.super@alu.org' LIMIT 1)),
  ('community-outreach-2025', 'Community Outreach Caravan', 'Union-wide volunteer outreach with partner NGOs.', 'Outreach', 'Cavite Community Center', DATE_ADD(CURDATE(), INTERVAL 35 DAY), DATE_ADD(CURDATE(), INTERVAL 35 DAY) + INTERVAL 8 HOUR, 120, (SELECT id FROM admins WHERE email = 'admin.events@alu.org' LIMIT 1)),
  ('skills-upgrade-lab', 'Skills Upgrade Lab', 'Upskilling workshop for frontline personnel.', 'Training', 'ALU Learning Hub', DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 20 DAY) + INTERVAL 5 HOUR, 80, (SELECT id FROM admins WHERE email = 'admin.events@alu.org' LIMIT 1)),
  ('solidarity-night-2025', 'Solidarity Night & Awards', 'Evening gala celebrating union achievement stories and volunteers.', 'Benefit', 'Manila Grand Ballroom', DATE_ADD(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 60 DAY) + INTERVAL 4 HOUR, 450, (SELECT id FROM admins WHERE email = 'admin.events@alu.org' LIMIT 1))
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  venue = VALUES(venue),
  start_at = VALUES(start_at),
  end_at = VALUES(end_at),
  capacity = VALUES(capacity);

-- Link preview images for each event via uploads catalog (no schema change needed)
INSERT INTO uploads (owner_admin_id, category, original_name, storage_path, mime_type, size_bytes, created_at)
SELECT
  (SELECT id FROM admins WHERE email = 'admin.events@alu.org' LIMIT 1) AS owner_admin_id,
  data.category,
  data.slug,
  data.storage_path,
  data.mime_type,
  data.size_bytes,
  NOW()
FROM (
  SELECT 'event_preview' AS category, 'leadership-summit-2025' AS slug, 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80' AS storage_path, 'image/jpeg' AS mime_type, 240000 AS size_bytes
  UNION ALL
  SELECT 'event_preview', 'community-outreach-2025', 'https://images.unsplash.com/photo-1521737604893-0f3a27d7a057?auto=format&fit=crop&w=1200&q=80', 'image/jpeg', 240000
  UNION ALL
  SELECT 'event_preview', 'skills-upgrade-lab', 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80', 'image/jpeg', 240000
  UNION ALL
  SELECT 'event_preview', 'solidarity-night-2025', 'https://tse3.mm.bing.net/th/id/OIP.5XI2LS0Biio0NKaFAk3G2gHaEo?pid=Api&P=0&h=220', 'image/jpeg', 240000
) AS data
WHERE NOT EXISTS (
  SELECT 1
  FROM uploads u
  WHERE u.category = data.category
    AND u.original_name = data.slug
);

-- Registration mix (registered, waitlisted, attended, cancelled)
INSERT INTO event_registrations (event_id, user_id, status, registered_at)
SELECT e.id, u.id, data.status, data.registered_at
FROM (
  SELECT 'leadership-summit-2025' AS slug, 'member.juan@alu.org' AS email, 'registered' AS status, DATE_SUB(NOW(), INTERVAL 5 DAY) AS registered_at
  UNION ALL
  SELECT 'leadership-summit-2025', 'member.maria@alu.org', 'registered', DATE_SUB(NOW(), INTERVAL 4 DAY)
  UNION ALL
  SELECT 'leadership-summit-2025', 'member.lito@alu.org', 'waitlisted', DATE_SUB(NOW(), INTERVAL 3 DAY)
  UNION ALL
  SELECT 'community-outreach-2025', 'member.maria@alu.org', 'registered', NOW()
  UNION ALL
  SELECT 'community-outreach-2025', 'member.anne@alu.org', 'registered', NOW()
  UNION ALL
  SELECT 'skills-upgrade-lab', 'member.juan@alu.org', 'attended', DATE_SUB(NOW(), INTERVAL 30 DAY)
  UNION ALL
  SELECT 'skills-upgrade-lab', 'member.lito@alu.org', 'cancelled', DATE_SUB(NOW(), INTERVAL 28 DAY)
  UNION ALL
  SELECT 'solidarity-night-2025', 'member.juan@alu.org', 'registered', DATE_SUB(NOW(), INTERVAL 1 DAY)
  UNION ALL
  SELECT 'solidarity-night-2025', 'member.maria@alu.org', 'registered', DATE_SUB(NOW(), INTERVAL 2 DAY)
  UNION ALL
  SELECT 'solidarity-night-2025', 'member.anne@alu.org', 'waitlisted', DATE_SUB(NOW(), INTERVAL 1 DAY)
) AS data
JOIN events e ON e.slug = data.slug
JOIN users u ON u.email = data.email
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  registered_at = VALUES(registered_at);

-- ---------------------------------------------------------------------
-- Optional: provide dues activity for reports/finance to avoid blanks
-- ---------------------------------------------------------------------
INSERT INTO dues_ledger (user_id, billing_period, amount, status, due_date, paid_at, reference_no, created_at)
VALUES
  ((SELECT id FROM users WHERE email = 'member.juan@alu.org' LIMIT 1), DATE_FORMAT(CURDATE(), '%Y-%m'), 1500.00, 'paid', DATE_ADD(CURDATE(), INTERVAL 15 DAY), NOW(), 'PAY-2025-0001', NOW()),
  ((SELECT id FROM users WHERE email = 'member.maria@alu.org' LIMIT 1), DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m'), 1500.00, 'pending', DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), INTERVAL 20 DAY), NULL, 'PAY-2025-0002', NOW()),
  ((SELECT id FROM users WHERE email = 'member.lito@alu.org' LIMIT 1), DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 2 MONTH), '%Y-%m'), 1500.00, 'overdue', DATE_SUB(CURDATE(), INTERVAL 40 DAY), NULL, 'PAY-2025-0003', NOW())
ON DUPLICATE KEY UPDATE
  amount = VALUES(amount),
  status = VALUES(status),
  due_date = VALUES(due_date),
  paid_at = VALUES(paid_at),
  reference_no = VALUES(reference_no);

-- Populate matching payments where applicable
INSERT INTO dues_payments (ledger_id, method, amount, paid_at, receipt_path, processed_by)
SELECT l.id, 'online', 1500.00, NOW(), 'receipts/PAY-2025-0001.pdf', (SELECT id FROM admins WHERE email = 'admin.super@alu.org' LIMIT 1)
FROM dues_ledger l
JOIN users u ON u.id = l.user_id
WHERE u.email = 'member.juan@alu.org'
  AND NOT EXISTS (
    SELECT 1
    FROM dues_payments dp
    WHERE dp.ledger_id = l.id
  );

-- ---------------------------------------------------------------------
-- Notifications to show event-related alerts in the UI (optional)
-- ---------------------------------------------------------------------
INSERT INTO notifications (user_id, title, message, category, is_read, link_url, created_at)
SELECT u.id, data.title, data.message, data.category, data.is_read, data.link_url, data.created_at
FROM (
  SELECT
    'member.juan@alu.org' AS email,
    'Event reminder: Leadership Summit' AS title,
    'See you at the Leadership Summit next week.' AS message,
    'event' AS category,
    0 AS is_read,
    '/events/leadership-summit-2025' AS link_url,
    DATE_SUB(NOW(), INTERVAL 3 DAY) AS created_at
  UNION ALL
  SELECT
    'member.maria@alu.org',
    'Outreach caravan registration',
    'Your slot for the Community Outreach Caravan is confirmed.',
    'event',
    0,
    '/events/community-outreach-2025',
    NOW()
  UNION ALL
  SELECT
    'member.lito@alu.org',
    'Waitlist update',
    'You are currently waitlisted for Leadership Summit. We will notify you if a slot opens.',
    'event',
    0,
    '/events/leadership-summit-2025',
    DATE_SUB(NOW(), INTERVAL 2 DAY)
) AS data
JOIN users u ON u.email = data.email
WHERE NOT EXISTS (
  SELECT 1
  FROM notifications n
  WHERE n.user_id = u.id
    AND n.title = data.title
);

-- End of alu2 admin test seed
