const { getDb } = require('../database');

/**
 * Generate anomaly record number: YYYYMMDD + 4-digit daily sequence
 * e.g. 202606060001, 202606060002
 */
function generateRecordNo() {
  const db = getDb();
  const today = new Date();
  const prefix = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const row = db.prepare(`
    SELECT record_no FROM abnormal_records
    WHERE record_no LIKE ?
    ORDER BY record_no DESC
    LIMIT 1
  `).get(prefix + '%');

  let seq = 1;
  if (row) {
    seq = parseInt(row.record_no.slice(-4), 10) + 1;
  }

  return prefix + String(seq).padStart(4, '0');
}

/**
 * Get week label: e.g. '2026-W23'
 */
function getWeekLabel(date) {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get month label: e.g. '2026-06'
 */
function getMonthLabel(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = { generateRecordNo, getWeekLabel, getMonthLabel };
