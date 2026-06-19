import sqlite3
import os
import sys
import bcrypt

if getattr(sys, 'frozen', False):
    DB_DIR = os.path.dirname(sys.executable)
else:
    DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, 'factory_anomaly.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
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
    """)
    conn.commit()
    conn.close()


def seed_admin():
    conn = get_db()
    row = conn.execute("SELECT id FROM users WHERE employee_id = ?", ('admin',)).fetchone()
    if not row:
        h = bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode()
        conn.execute(
            "INSERT INTO users (employee_id, name, password_hash, role) VALUES (?,?,?,'superadmin')",
            ('admin', '系统管理员', h)
        )
        conn.commit()
    conn.close()


def seed_base_data():
    conn = get_db()
    models = ['型号A-X100', '型号B-Y200', '型号C-Z300']
    types = ['外观缺陷', '装配不良', '漏装', '错装', '划伤', '异响', '其他']
    depts = ['总装', '机加工', '锻压', '清洗', '外协', '仓库', '供应商', '客户', '未知']
    sps = [('组装-前段', 1), ('组装-后段', 1), ('焊接', 2), ('车削', 2),
           ('冲压', 3), ('清洗-超声波', 4), ('喷涂', 5), ('来料检验', 6)]
    fps = ['总装检测', 'IPQC巡检', '成品检验', '过程检验', '来料检验']

    for m in models:
        conn.execute("INSERT OR IGNORE INTO product_models (name) VALUES (?)", (m,))
    for t in types:
        conn.execute("INSERT OR IGNORE INTO abnormal_types (name) VALUES (?)", (t,))
    for d in depts:
        conn.execute("INSERT OR IGNORE INTO source_departments (name) VALUES (?)", (d,))
    for s, did in sps:
        conn.execute("INSERT OR IGNORE INTO source_processes (name, department_id) VALUES (?,?)", (s, did))
    for f in fps:
        conn.execute("INSERT OR IGNORE INTO found_processes (name) VALUES (?)", (f,))

    conn.commit()
    conn.close()
