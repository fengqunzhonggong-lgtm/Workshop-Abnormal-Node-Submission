const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { employee_id, password } = req.body;

  if (!employee_id || !password) {
    return res.status(400).json({ error: '请输入工号和密码' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE employee_id = ?').get(employee_id);

  if (!user) {
    return res.status(401).json({ error: '工号或密码错误' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: '账号已被停用，请联系管理员' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: '工号或密码错误' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      role: user.role,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
