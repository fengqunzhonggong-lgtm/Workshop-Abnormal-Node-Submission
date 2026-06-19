const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize('superadmin'));

const DB_PATH = path.join(__dirname, '..', '..', 'factory_anomaly.db');

// POST /api/system/backup
router.post('/backup', (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const backupPath = path.join(backupDir, `factory_anomaly_backup_${timestamp}.db`);

    fs.copyFileSync(DB_PATH, backupPath);
    res.json({ message: `备份成功: ${backupPath}` });
  } catch (err) {
    res.status(500).json({ error: '备份失败: ' + err.message });
  }
});

// POST /api/system/archive — archive records by year
router.post('/archive', (req, res) => {
  const { year } = req.body;
  if (!year) return res.status(400).json({ error: '请提供归档年份' });

  try {
    const db = getDb();
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const archivePath = path.join(backupDir, `archive_${year}_${timestamp}.db`);
    fs.copyFileSync(DB_PATH, archivePath);

    // Delete records from the specified year
    const result = db.prepare(`
      DELETE FROM abnormal_records
      WHERE strftime('%Y', created_at) = ?
    `).run(String(year));

    res.json({ message: `已归档 ${result.changes} 条 ${year} 年记录` });
  } catch (err) {
    res.status(500).json({ error: '归档失败: ' + err.message });
  }
});

// DELETE /api/system/history — delete records before a date
router.delete('/history', (req, res) => {
  const { before_date } = req.body;
  if (!before_date) return res.status(400).json({ error: '请提供删除截止日期' });

  const db = getDb();
  const result = db.prepare('DELETE FROM abnormal_records WHERE date(created_at) < ?').run(before_date);
  res.json({ message: `已删除 ${result.changes} 条 ${before_date} 之前的历史记录` });
});

module.exports = router;
