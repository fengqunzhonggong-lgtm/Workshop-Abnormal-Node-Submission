const express = require('express');
const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');
const { generateRecordNo, getWeekLabel, getMonthLabel } = require('../utils/id_generator');

const router = express.Router();
router.use(authenticate);

// POST /api/anomalies — submit a new anomaly
router.post('/', (req, res) => {
  const db = getDb();
  const {
    work_order_no,
    product_model_id,
    abnormal_type_id,
    quantity,
    source_department_id,
    source_process_id,
    found_process_id,
    description,
  } = req.body;

  if (!work_order_no || !product_model_id || !abnormal_type_id || !source_department_id || !source_process_id || !found_process_id || !description) {
    return res.status(400).json({ error: '请填写所有必填字段' });
  }

  const now = new Date();
  const recordNo = generateRecordNo();

  const result = db.prepare(`
    INSERT INTO abnormal_records (
      record_no, work_order_no, product_model_id, abnormal_type_id,
      quantity, source_department_id, source_process_id, found_process_id,
      description, submitter_id, submitter_name, submitter_employee_id,
      submitter_role, week_label, month_label
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    recordNo, work_order_no, product_model_id, abnormal_type_id,
    quantity || 1, source_department_id, source_process_id, found_process_id,
    description, req.user.id, req.user.name, req.user.employee_id,
    req.user.role, getWeekLabel(now), getMonthLabel(now)
  );

  const record = db.prepare('SELECT * FROM abnormal_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(record);
});

// GET /api/anomalies — list anomalies (role-based filtering)
router.get('/', (req, res) => {
  const db = getDb();
  const {
    page = 1,
    page_size = 20,
    work_order_no,
    product_model_id,
    abnormal_type_id,
    source_department_id,
    source_process_id,
    found_process_id,
    submitter_id,
    status,
    date_from,
    date_to,
    keyword,
  } = req.query;

  const limit = Math.min(parseInt(page_size) || 20, 100);
  const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

  let where = [];
  let params = [];

  // Role-based: employee sees only their own records
  if (req.user.role === 'employee') {
    where.push('r.submitter_id = ?');
    params.push(req.user.id);
  }

  if (work_order_no) {
    where.push('r.work_order_no LIKE ?');
    params.push(`%${work_order_no}%`);
  }
  if (product_model_id) {
    where.push('r.product_model_id = ?');
    params.push(product_model_id);
  }
  if (abnormal_type_id) {
    where.push('r.abnormal_type_id = ?');
    params.push(abnormal_type_id);
  }
  if (source_department_id) {
    where.push('r.source_department_id = ?');
    params.push(source_department_id);
  }
  if (source_process_id) {
    where.push('r.source_process_id = ?');
    params.push(source_process_id);
  }
  if (found_process_id) {
    where.push('r.found_process_id = ?');
    params.push(found_process_id);
  }
  if (submitter_id) {
    where.push('r.submitter_id = ?');
    params.push(submitter_id);
  }
  if (status) {
    where.push('r.status = ?');
    params.push(status);
  }
  if (date_from) {
    where.push('date(r.created_at) >= ?');
    params.push(date_from);
  }
  if (date_to) {
    where.push('date(r.created_at) <= ?');
    params.push(date_to);
  }
  if (keyword) {
    where.push('(r.work_order_no LIKE ? OR r.description LIKE ? OR r.record_no LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM abnormal_records r ${whereClause}
  `).get(...params);

  const rows = db.prepare(`
    SELECT r.*,
      pm.name as product_model_name,
      at.name as abnormal_type_name,
      sd.name as source_department_name,
      sp.name as source_process_name,
      fp.name as found_process_name
    FROM abnormal_records r
    LEFT JOIN product_models pm ON r.product_model_id = pm.id
    LEFT JOIN abnormal_types at ON r.abnormal_type_id = at.id
    LEFT JOIN source_departments sd ON r.source_department_id = sd.id
    LEFT JOIN source_processes sp ON r.source_process_id = sp.id
    LEFT JOIN found_processes fp ON r.found_process_id = fp.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    items: rows,
    total: countRow.total,
    page: parseInt(page) || 1,
    page_size: limit,
    total_pages: Math.ceil(countRow.total / limit) || 1,
  });
});

// GET /api/anomalies/:id — single anomaly detail
router.get('/:id', (req, res) => {
  const db = getDb();
  const record = db.prepare(`
    SELECT r.*,
      pm.name as product_model_name,
      at.name as abnormal_type_name,
      sd.name as source_department_name,
      sp.name as source_process_name,
      fp.name as found_process_name
    FROM abnormal_records r
    LEFT JOIN product_models pm ON r.product_model_id = pm.id
    LEFT JOIN abnormal_types at ON r.abnormal_type_id = at.id
    LEFT JOIN source_departments sd ON r.source_department_id = sd.id
    LEFT JOIN source_processes sp ON r.source_process_id = sp.id
    LEFT JOIN found_processes fp ON r.found_process_id = fp.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: '记录不存在' });
  }

  // Employee can only see their own
  if (req.user.role === 'employee' && record.submitter_id !== req.user.id) {
    return res.status(403).json({ error: '无权查看此记录' });
  }

  res.json(record);
});

// DELETE /api/anomalies/batch — batch delete (must be before /:id)
router.delete('/batch', (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: '只有系统管理员可以删除记录' });
  }

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请提供要删除的记录ID列表' });
  }

  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM abnormal_records WHERE id IN (${placeholders})`).run(...ids);

  res.json({ message: `已删除 ${result.changes} 条记录`, deleted: result.changes });
});

// DELETE /api/anomalies/:id — single delete
router.delete('/:id', (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: '只有系统管理员可以删除记录' });
  }

  const db = getDb();
  const record = db.prepare('SELECT id FROM abnormal_records WHERE id = ?').get(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '记录不存在' });
  }

  db.prepare('DELETE FROM abnormal_records WHERE id = ?').run(req.params.id);
  res.json({ message: '已删除' });
});

module.exports = router;
