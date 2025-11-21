# ALU Backend

Express server that exposes authentication and membership endpoints for the ALUzon portal.

## Quick Start

1. Copy `.env.example` to `.env` and configure the MySQL credentials.
2. Install dependencies:
   ```powershell
   Set-Location -Path 'd:\Thesis\ALU\backend'; npm install
   ```
  3. Run the development server with hot reload:
   ```powershell
   npm run dev
   ```

The API runs on `http://localhost:5000` by default.

## Database

Create a MySQL schema named `alu` (or override via `DB_NAME`) and run the full setup script below. It creates the database, tables, and indexes required by the backend, including member services, news, notifications, file uploads, and session tracking.

```sql
-- create the database (skip if you already have one)
CREATE DATABASE IF NOT EXISTS alu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alu;

-- users table stores the master membership profile
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_initial VARCHAR(10),
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255),
  address VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  place_of_birth VARCHAR(150) NOT NULL,
  marital_status VARCHAR(50),
  number_of_children INT,
  gender VARCHAR(50),
  religion VARCHAR(100),
  education VARCHAR(150) NOT NULL,
  company VARCHAR(150) NOT NULL,
  position VARCHAR(150) NOT NULL,
  department VARCHAR(150),
  years_employed INT,
  union_affiliation VARCHAR(150),
  union_position VARCHAR(150) NOT NULL,
  membership_date DATETIME,
  digital_id VARCHAR(32),
  profile_picture_url TEXT,
  is_approved TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT uq_users_phone UNIQUE (phone),
  CONSTRAINT uq_users_digital_id UNIQUE (digital_id)
);

-- emergency contact records linked 1:1 with users
CREATE TABLE IF NOT EXISTS user_emergency_contacts (
  user_id INT PRIMARY KEY,
  name VARCHAR(150),
  relationship VARCHAR(100),
  phone VARCHAR(50),
  address VARCHAR(255),
  CONSTRAINT fk_user_emergency_contact
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- dues ledger for each member
CREATE TABLE IF NOT EXISTS dues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  billing_period VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','paid','overdue') DEFAULT 'pending',
  paid_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dues_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- helper index for faster dues lookups by member and period
CREATE INDEX idx_dues_user_period ON dues (user_id, billing_period);

-- benefit requests submitted by members
CREATE TABLE IF NOT EXISTS benefit_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category ENUM('medical','legal','recreation','education','general','emergency') NOT NULL,
  description TEXT,
  status ENUM('pending','assigned','in_progress','resolved','rejected') DEFAULT 'pending',
  priority ENUM('low','normal','high') DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_benefit_requests_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- news articles for members
CREATE TABLE IF NOT EXISTS news_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  summary TEXT,
  category VARCHAR(100),
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_featured TINYINT(1) DEFAULT 0
);

-- notifications delivered to members
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- active sessions / tokens for authenticated users
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_sessions_token UNIQUE (token),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- uploaded files tied to a user record
CREATE TABLE IF NOT EXISTS uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_uploads_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

Adjust the schema as the project evolves (e.g., add password reset tokens, audit logs, etc.).

## Available Scripts

- `npm run dev` – start the server using nodemon
- `npm start` – run the server with Node.js in production mode
