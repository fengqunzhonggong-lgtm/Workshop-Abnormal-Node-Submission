const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'factory_anomaly.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
    seedDefaultAdmin();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('superadmin','manager','employee')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS abnormal_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS source_departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS source_processes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      department_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES source_departments(id)
    );

    CREATE TABLE IF NOT EXISTS found_processes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS abnormal_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_no TEXT UNIQUE NOT NULL,
      work_order_no TEXT NOT NULL,
      product_model_id INTEGER NOT NULL,
      abnormal_type_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      source_department_id INTEGER NOT NULL,
      source_process_id INTEGER NOT NULL,
      found_process_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      submitter_id INTEGER NOT NULL,
      submitter_name TEXT NOT NULL,
      submitter_employee_id TEXT NOT NULL,
      submitter_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
      week_label TEXT,
      month_label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_model_id) REFERENCES product_models(id),
      FOREIGN KEY (abnormal_type_id) REFERENCES abnormal_types(id),
      FOREIGN KEY (source_department_id) REFERENCES source_departments(id),
      FOREIGN KEY (source_process_id) REFERENCES source_processes(id),
      FOREIGN KEY (found_process_id) REFERENCES found_processes(id),
      FOREIGN KEY (submitter_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_records_record_no ON abnormal_records(record_no);
    CREATE INDEX IF NOT EXISTS idx_records_created_at ON abnormal_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_records_submitter ON abnormal_records(submitter_id);
    CREATE INDEX IF NOT EXISTS idx_records_status ON abnormal_records(status);
    CREATE INDEX IF NOT EXISTS idx_records_week ON abnormal_records(week_label);
    CREATE INDEX IF NOT EXISTS idx_records_month ON abnormal_records(month_label);
  `);
}

function seedDefaultAdmin() {
  const bcrypt = require('bcrypt');
  const existing = db.prepare('SELECT id FROM users WHERE employee_id = ?').get('admin');
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (employee_id, name, password_hash, role)
      VALUES (?, ?, ?, 'superadmin')
    `).run('admin', '系统管理员', hash);
  }
}

module.exports = { getDb };
