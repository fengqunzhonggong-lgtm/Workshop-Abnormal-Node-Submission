const express = require('express');
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(authorize('superadmin'));

// GET /api/flow/analysis — source → found process flow matrix
router.get('/analysis', (req, res) => {
  const db = getDb();
  const { date_from, date_to } = req.query;

  let where = [];
  let params = [];
  if (date_from) { where.push('date(r.created_at) >= ?'); params.push(date_from); }
  if (date_to) { where.push('date(r.created_at) <= ?'); params.push(date_to); }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT sp.name as source_name, fp.name as found_name, COUNT(*) as count
    FROM abnormal_records r
    LEFT JOIN source_processes sp ON r.source_process_id = sp.id
    LEFT JOIN found_processes fp ON r.found_process_id = fp.id
    ${whereClause}
    GROUP BY sp.name, fp.name
    ORDER BY count DESC
  `).all(...params);

  // Build matrix: source_processes x found_processes
  const sourceNames = [...new Set(rows.map(r => r.source_name))].filter(Boolean);
  const foundNames = [...new Set(rows.map(r => r.found_name))].filter(Boolean);

  const matrix = {};
  sourceNames.forEach(s => {
    matrix[s] = {};
    foundNames.forEach(f => { matrix[s][f] = 0; });
  });

  rows.forEach(r => {
    if (r.source_name && r.found_name) {
      matrix[r.source_name][r.found_name] = r.count;
    }
  });

  res.json({ sourceNames, foundNames, matrix, rows });
});

module.exports = router;
