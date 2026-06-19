const express = require('express');
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize('superadmin'));

// GET /api/stats/summary — aggregate counts
router.get('/summary', (req, res) => {
  const db = getDb();
  const { date_from, date_to } = req.query;

  let where = [];
  let params = [];
  if (date_from) { where.push('date(r.created_at) >= ?'); params.push(date_from); }
  if (date_to) { where.push('date(r.created_at) <= ?'); params.push(date_to); }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const baseWhere = whereClause;
  const statusWhere = (cond) => baseWhere ? `${baseWhere} AND ${cond}` : `WHERE ${cond}`;

  const total = db.prepare(`SELECT COUNT(*) as c FROM abnormal_records r ${baseWhere}`).get(...params).c;
  const open = db.prepare(`SELECT COUNT(*) as c FROM abnormal_records r ${statusWhere("r.status = 'open'")}`).get(...params).c;
  const resolved = db.prepare(`SELECT COUNT(*) as c FROM abnormal_records r ${statusWhere("r.status = 'resolved'")}`).get(...params).c;

  const byType = db.prepare(`
    SELECT at2.name, COUNT(*) as count
    FROM abnormal_records r
    LEFT JOIN abnormal_types at2 ON r.abnormal_type_id = at2.id
    ${baseWhere}
    GROUP BY at2.name ORDER BY count DESC
  `).all(...params);

  const byDept = db.prepare(`
    SELECT sd.name, COUNT(*) as count
    FROM abnormal_records r
    LEFT JOIN source_departments sd ON r.source_department_id = sd.id
    ${baseWhere}
    GROUP BY sd.name ORDER BY count DESC
  `).all(...params);

  const bySourceProcess = db.prepare(`
    SELECT sp.name, COUNT(*) as count
    FROM abnormal_records r
    LEFT JOIN source_processes sp ON r.source_process_id = sp.id
    ${baseWhere}
    GROUP BY sp.name ORDER BY count DESC
  `).all(...params);

  const byFoundProcess = db.prepare(`
    SELECT fp.name, COUNT(*) as count
    FROM abnormal_records r
    LEFT JOIN found_processes fp ON r.found_process_id = fp.id
    ${baseWhere}
    GROUP BY fp.name ORDER BY count DESC
  `).all(...params);

  res.json({ total, open, resolved, byType, byDept, bySourceProcess, byFoundProcess });
});

// GET /api/stats/trend — daily trend
router.get('/trend', (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days) || 30;
  const trend = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM abnormal_records
    WHERE created_at >= date('now', ? || ' days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all(`-${days}`);

  res.json(trend);
});

// GET /api/stats/top — TOP ranking
router.get('/top', (req, res) => {
  const db = getDb();
  const { date_from, date_to } = req.query;

  let where = [];
  let params = [];
  if (date_from) { where.push('date(r.created_at) >= ?'); params.push(date_from); }
  if (date_to) { where.push('date(r.created_at) <= ?'); params.push(date_to); }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const topTypes = db.prepare(`
    SELECT at2.name, COUNT(*) as count
    FROM abnormal_records r
    LEFT JOIN abnormal_types at2 ON r.abnormal_type_id = at2.id
    ${whereClause}
    GROUP BY at2.name ORDER BY count DESC LIMIT 10
  `).all(...params);

  const topDepts = db.prepare(`
    SELECT sd.name, COUNT(*) as count
    FROM abnormal_records r
    LEFT JOIN source_departments sd ON r.source_department_id = sd.id
    ${whereClause}
    GROUP BY sd.name ORDER BY count DESC LIMIT 10
  `).all(...params);

  res.json({ topTypes, topDepts });
});

module.exports = router;
