const express = require('express');
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const TABLE_MAP = {
  product_models: 'product_models',
  abnormal_types: 'abnormal_types',
  source_departments: 'source_departments',
  source_processes: 'source_processes',
  found_processes: 'found_processes',
};

// GET /api/base-data/:table — list all
router.get('/:table', (req, res) => {
  const table = TABLE_MAP[req.params.table];
  if (!table) return res.status(400).json({ error: '无效的数据表' });

  const db = getDb();
  const { department_id } = req.query;

  let query = `SELECT * FROM ${table}`;
  const params = [];

  if (table === 'source_processes' && department_id) {
    query += ' WHERE department_id = ?';
    params.push(department_id);
  }

  query += ' ORDER BY id';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// POST /api/base-data/:table — create (admin only)
router.post('/:table', authorize('superadmin'), (req, res) => {
  const table = TABLE_MAP[req.params.table];
  if (!table) return res.status(400).json({ error: '无效的数据表' });

  const { name, department_id } = req.body;
  if (!name) return res.status(400).json({ error: '名称不能为空' });

  const db = getDb();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    if (table === 'source_processes') {
      db.prepare(`INSERT INTO ${table} (name, department_id, created_at, updated_at) VALUES (?, ?, ?, ?)`).run(name, department_id || null, now, now);
    } else {
      db.prepare(`INSERT INTO ${table} (name, created_at, updated_at) VALUES (?, ?, ?)`).run(name, now, now);
    }
    res.status(201).json({ message: '创建成功' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: '名称已存在' });
    } else {
      res.status(500).json({ error: '创建失败' });
    }
  }
});

// PUT /api/base-data/:table/:id — update (admin only)
router.put('/:table/:id', authorize('superadmin'), (req, res) => {
  const table = TABLE_MAP[req.params.table];
  if (!table) return res.status(400).json({ error: '无效的数据表' });

  const { name, is_active, department_id } = req.body;
  const db = getDb();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: '记录不存在' });

    if (table === 'source_processes') {
      db.prepare(`UPDATE ${table} SET name = ?, is_active = ?, department_id = ?, updated_at = ? WHERE id = ?`)
        .run(name ?? existing.name, is_active ?? existing.is_active, department_id ?? existing.department_id, now, req.params.id);
    } else {
      db.prepare(`UPDATE ${table} SET name = ?, is_active = ?, updated_at = ? WHERE id = ?`)
        .run(name ?? existing.name, is_active ?? existing.is_active, now, req.params.id);
    }
    res.json({ message: '更新成功' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: '名称已存在' });
    } else {
      res.status(500).json({ error: '更新失败' });
    }
  }
});

// DELETE /api/base-data/:table/:id — soft delete (admin only)
router.delete('/:table/:id', authorize('superadmin'), (req, res) => {
  const table = TABLE_MAP[req.params.table];
  if (!table) return res.status(400).json({ error: '无效的数据表' });

  const db = getDb();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare(`UPDATE ${table} SET is_active = 0, updated_at = ? WHERE id = ?`).run(now, req.params.id);
  res.json({ message: '已停用' });
});

module.exports = router;
