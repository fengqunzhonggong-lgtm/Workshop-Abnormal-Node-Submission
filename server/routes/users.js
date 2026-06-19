const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize('superadmin'));

// GET /api/users
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, employee_id, name, role, is_active, created_at FROM users ORDER BY id').all();
  res.json(users);
});

// POST /api/users
router.post('/', (req, res) => {
  const { employee_id, name, password, role } = req.body;
  if (!employee_id || !name || !password || !role) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }
  if (!['superadmin', 'manager', 'employee'].includes(role)) {
    return res.status(400).json({ error: '无效的角色' });
  }

  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE employee_id = ?').get(employee_id);
  if (exists) {
    return res.status(400).json({ error: '工号已存在' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare('INSERT INTO users (employee_id, name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(employee_id, name, hash, role, now, now);
  res.status(201).json({ message: '用户创建成功' });
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const { name, role } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare('UPDATE users SET name = ?, role = ?, updated_at = ? WHERE id = ?')
    .run(name || user.name, role || user.role, now, req.params.id);
  res.json({ message: '更新成功' });
});

// PUT /api/users/:id/reset-password
router.put('/:id/reset-password', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: '请输入新密码' });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, now, req.params.id);
  res.json({ message: '密码已重置' });
});

// PUT /api/users/:id/toggle-status
router.put('/:id/toggle-status', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, is_active FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const newStatus = user.is_active ? 0 : 1;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, now, req.params.id);
  res.json({ message: newStatus ? '用户已启用' : '用户已停用' });
});

module.exports = router;
