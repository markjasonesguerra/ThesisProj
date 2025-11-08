USE `alu`;

-- Prerequisite admin identity
INSERT INTO admin_roles (code, name, description, permissions, created_at)
VALUES ('super_admin', 'Super Administrator', 'Full platform administration rights', JSON_ARRAY('system.manage','ai.manage','members.read','audit.review'), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), permissions = VALUES(permissions);

INSERT INTO admins (uuid, email, password_hash, first_name, last_name, status, last_login_at)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin.super@alu.org', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZag0/4WW7nilV4//0G6Fxz3Bz2F.u', 'Alicia', 'Reyes', 'active', NOW())
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), status = VALUES(status), last_login_at = VALUES(last_login_at);

INSERT INTO admin_role_assignments (admin_id, role_id, assigned_at)
SELECT a.id, r.id, NOW()
FROM admins a
JOIN admin_roles r ON r.code = 'super_admin'
WHERE a.email = 'admin.super@alu.org'
ON DUPLICATE KEY UPDATE assigned_at = VALUES(assigned_at);

-- Minimal table bootstrap for seed-only artifacts
DROP TABLE IF EXISTS id_card_requests;

CREATE TABLE IF NOT EXISTS id_card_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_no VARCHAR(50) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  card_type ENUM('physical','digital','replacement') NOT NULL DEFAULT 'physical',
  status ENUM('pending','printing','ready','active','rejected','on_hold') NOT NULL DEFAULT 'pending',
  reason VARCHAR(255) NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  metadata JSON NULL,
  UNIQUE KEY uq_id_card_requests_request_no (request_no),
  KEY idx_id_card_requests_user (user_id),
  KEY idx_id_card_requests_status (status),
  KEY idx_id_card_requests_requested_at (requested_at),
  CONSTRAINT fk_id_card_requests_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dashboard seed (baseline member + activity metrics)
INSERT INTO users (uuid, email, phone, status, membership_no, created_at, updated_at)
VALUES ('c2d7c1c0-3b57-4d21-a2d6-08f0b6a5f1e3', 'member.juan@alu.org', '+639171234567', 'approved', 'ALU-000001', NOW(), NOW())
ON DUPLICATE KEY UPDATE phone = VALUES(phone), status = VALUES(status), membership_no = VALUES(membership_no);

INSERT INTO digital_ids (user_id, card_number, is_active, issued_at)
VALUES ((SELECT id FROM users WHERE email = 'member.juan@alu.org'), 'DID-000001-ALU', 1, DATE_SUB(NOW(), INTERVAL 7 DAY))
ON DUPLICATE KEY UPDATE card_number = VALUES(card_number), is_active = VALUES(is_active), issued_at = VALUES(issued_at);


-- Approvals seed (registration and ID card reviews)
INSERT INTO id_card_requests (request_no, user_id, card_type, status, reason, requested_at, processed_at, metadata)
VALUES ('CARD-2025-0001', (SELECT id FROM users WHERE email = 'member.juan@alu.org'), 'physical', 'printing', 'Initial membership kit', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, JSON_OBJECT('memberAlias','ALU-000001','priority','standard'))
ON DUPLICATE KEY UPDATE status = VALUES(status), processed_at = VALUES(processed_at), metadata = VALUES(metadata);

INSERT INTO id_card_requests (request_no, user_id, card_type, status, reason, requested_at, processed_at, metadata)
VALUES ('CARD-2025-0002', (SELECT id FROM users WHERE email = 'member.juan@alu.org'), 'replacement', 'pending', 'Damaged card reported', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, JSON_OBJECT('memberAlias','ALU-000001','priority','expedite'))
ON DUPLICATE KEY UPDATE status = VALUES(status), processed_at = VALUES(processed_at), metadata = VALUES(metadata);

INSERT INTO approval_queues (queue_type, status, reference_table, reference_id, created_at, updated_at)
VALUES ('registration', 'pending', 'users', (SELECT id FROM users WHERE email = 'member.juan@alu.org'), NOW(), NOW())
ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = VALUES(updated_at);

-- Members seed (profile and employment details)
INSERT INTO user_profiles (user_id, first_name, last_name, date_of_birth, city, province)
SELECT u.id, 'Juan', 'Dela Cruz', '1990-05-18', 'Quezon City', 'Metro Manila'
FROM users u
WHERE u.email = 'member.juan@alu.org'
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), city = VALUES(city), province = VALUES(province);

INSERT INTO user_employment (user_id, company, department, position, union_affiliation, union_position, years_employed)
SELECT u.id, 'Banco de Oro (BDO)', 'Operations', 'Senior Officer', 'BDO Employees Union', 'Member', 8
FROM users u
WHERE u.email = 'member.juan@alu.org'
ON DUPLICATE KEY UPDATE company = VALUES(company), department = VALUES(department), position = VALUES(position), union_affiliation = VALUES(union_affiliation), union_position = VALUES(union_position), years_employed = VALUES(years_employed);

-- Dues and Finance seed (ledger snapshot)
INSERT INTO dues_ledger (user_id, billing_period, due_date, amount, status, created_at)
VALUES ((SELECT id FROM users WHERE email = 'member.juan@alu.org'), DATE_FORMAT(CURDATE(), '%Y-%m'), DATE_SUB(CURDATE(), INTERVAL 10 DAY), 1250.00, 'overdue', NOW())
ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = VALUES(status), due_date = VALUES(due_date);

-- Audit Logs seed (admin activity trail)
INSERT INTO audit_logs (actor_admin_id, actor_user_id, action, entity_type, entity_id, metadata, ip_address, created_at)
VALUES ((SELECT id FROM admins WHERE email = 'admin.super@alu.org'), (SELECT id FROM users WHERE email = 'member.juan@alu.org'), 'settings-change', 'system_settings', 'notificationSettings', JSON_OBJECT('actorType','admin','change','aiSummary=true'), '10.0.0.5', NOW())
ON DUPLICATE KEY UPDATE metadata = VALUES(metadata), ip_address = VALUES(ip_address), created_at = VALUES(created_at);

-- Security seed (security settings and active session)
INSERT INTO system_settings (category, setting_key, setting_value, updated_by)
VALUES
  ('security', 'sessionControls', JSON_OBJECT('timeoutMinutes',30,'lockAfterAttempts',5), (SELECT id FROM admins WHERE email = 'admin.super@alu.org')),
  ('security', 'notificationChannels', JSON_OBJECT('email',TRUE,'sms',TRUE,'web',TRUE), (SELECT id FROM admins WHERE email = 'admin.super@alu.org'))
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW();

INSERT INTO admin_sessions (admin_id, token, ip_address, user_agent, created_at, expires_at)
VALUES ((SELECT id FROM admins WHERE email = 'admin.super@alu.org'), 'sess_dashboard_sample', '203.16.102.14', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW(), DATE_ADD(NOW(), INTERVAL 4 HOUR))
ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at), terminated_at = NULL;

-- AI Settings seed (automation configuration)
INSERT INTO system_settings (category, setting_key, setting_value, updated_by)
VALUES
  ('ai', 'automationControls', JSON_OBJECT('autoAssign',TRUE,'autoResolve',FALSE,'auditLogging',TRUE,'suggestionDiff',TRUE), (SELECT id FROM admins WHERE email = 'admin.super@alu.org')),
  ('ai', 'modelRollouts', JSON_ARRAY(JSON_OBJECT('id','gpt4','name','OpenAI GPT-4 Turbo','capabilities',JSON_ARRAY('Routing','Summaries'),'coverage',0.75,'lastUpdate',CURDATE())), (SELECT id FROM admins WHERE email = 'admin.super@alu.org')),
  ('ai', 'metrics', JSON_OBJECT('autoAssignRate',68,'avgConfidence',0.82,'overrideRate',9), (SELECT id FROM admins WHERE email = 'admin.super@alu.org'))
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW();

INSERT INTO ai_policies (name, description, model_identifier, confidence_threshold, auto_actions, is_active, created_by)
VALUES ('AI Routing v1', 'Automatically routes tickets with confidence above threshold.', 'gpt-4-turbo', 0.8, JSON_OBJECT('autoAssign',TRUE,'fallback','manual-review'), 1, (SELECT id FROM admins WHERE email = 'admin.super@alu.org'))
ON DUPLICATE KEY UPDATE description = VALUES(description), model_identifier = VALUES(model_identifier), confidence_threshold = VALUES(confidence_threshold), auto_actions = VALUES(auto_actions), is_active = VALUES(is_active);

-- ID Cards settings seed (guidelines + digital experience metrics)
INSERT INTO system_settings (category, setting_key, setting_value, updated_by)
VALUES
  ('id_cards', 'guides', JSON_ARRAY('Ensure member profile photo is updated','Validate membership number before printing','Confirm payroll deduction status before release'), (SELECT id FROM admins WHERE email = 'admin.super@alu.org')),
  ('id_cards', 'digitalMetrics', JSON_OBJECT('verificationPassRate',0.92,'walletAdoption',0.68,'badges',JSON_ARRAY('Verified','Wallet Ready','Biometric Checks Active')), (SELECT id FROM admins WHERE email = 'admin.super@alu.org'))
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW();

-- Admin Settings seed (tenant configuration overview)
INSERT INTO system_settings (category, setting_key, setting_value, updated_by)
VALUES
  ('system', 'environment', JSON_OBJECT('name','Production','description','Live tenant for testing','defaultResponseSlaHours',24,'aiAssistRolloutPercent',60), (SELECT id FROM admins WHERE email = 'admin.super@alu.org')),
  ('system', 'notificationSettings', JSON_OBJECT('dailyDigest',TRUE,'aiSummary',TRUE,'escalationSms',FALSE), (SELECT id FROM admins WHERE email = 'admin.super@alu.org')),
  ('system', 'escalationMatrix', JSON_ARRAY(JSON_OBJECT('id','level-1','name','Standard Requests','owner','Member Services','response','24 hours','fallback','AI summary only')), (SELECT id FROM admins WHERE email = 'admin.super@alu.org'))
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW();
