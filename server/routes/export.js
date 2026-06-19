const express = require('express');
const ExcelJS = require('exceljs');
const { getDb } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/export/excel
router.get('/excel', authenticate, authorize('manager', 'superadmin'), async (req, res) => {
  const db = getDb();
  const {
    date_from, date_to, work_order_no, product_model_id,
    abnormal_type_id, source_department_id, status,
  } = req.query;

  let where = [];
  let params = [];

  if (date_from) { where.push('date(r.created_at) >= ?'); params.push(date_from); }
  if (date_to) { where.push('date(r.created_at) <= ?'); params.push(date_to); }
  if (work_order_no) { where.push('r.work_order_no LIKE ?'); params.push(`%${work_order_no}%`); }
  if (product_model_id) { where.push('r.product_model_id = ?'); params.push(product_model_id); }
  if (abnormal_type_id) { where.push('r.abnormal_type_id = ?'); params.push(abnormal_type_id); }
  if (source_department_id) { where.push('r.source_department_id = ?'); params.push(source_department_id); }
  if (status) { where.push('r.status = ?'); params.push(status); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT r.*,
      pm.name as product_model_name,
      at2.name as abnormal_type_name,
      sd.name as source_department_name,
      sp.name as source_process_name,
      fp.name as found_process_name
    FROM abnormal_records r
    LEFT JOIN product_models pm ON r.product_model_id = pm.id
    LEFT JOIN abnormal_types at2 ON r.abnormal_type_id = at2.id
    LEFT JOIN source_departments sd ON r.source_department_id = sd.id
    LEFT JOIN source_processes sp ON r.source_process_id = sp.id
    LEFT JOIN found_processes fp ON r.found_process_id = fp.id
    ${whereClause}
    ORDER BY r.created_at DESC
  `).all(...params);

  // Summary stats
  const stats = {
    total: rows.length,
    open: rows.filter(r => r.status === 'open').length,
    resolved: rows.filter(r => r.status === 'resolved').length,
    byType: {},
    byDept: {},
    bySeverity: { '高': 0, '中': 0, '低': 0 },
  };
  rows.forEach(r => {
    stats.byType[r.abnormal_type_name] = (stats.byType[r.abnormal_type_name] || 0) + 1;
    stats.byDept[r.source_department_name] = (stats.byDept[r.source_department_name] || 0) + 1;
  });

  const wb = new ExcelJS.Workbook();

  // Summary sheet
  const wsSummary = wb.addWorksheet('汇总统计');
  wsSummary.columns = [
    { header: '统计项', key: 'label', width: 20 },
    { header: '数值', key: 'value', width: 15 },
  ];
  wsSummary.addRows([
    { label: '总记录数', value: stats.total },
    { label: '待处理', value: stats.open },
    { label: '已解决', value: stats.resolved },
    { label: '', value: '' },
    { label: '--- 按异常类别 ---', value: '' },
    ...Object.entries(stats.byType).map(([k, v]) => ({ label: k, value: v })),
    { label: '', value: '' },
    { label: '--- 按来源部门 ---', value: '' },
    ...Object.entries(stats.byDept).map(([k, v]) => ({ label: k, value: v })),
  ]);

  wsSummary.getCell('A1').font = { bold: true };
  wsSummary.getCell('B1').font = { bold: true };

  // Detail sheet
  const wsDetail = wb.addWorksheet('异常明细');
  wsDetail.columns = [
    { header: '序号', key: 'seq', width: 6 },
    { header: '异常编号', key: 'record_no', width: 16 },
    { header: '工单号', key: 'work_order_no', width: 18 },
    { header: '产品型号', key: 'product_model_name', width: 14 },
    { header: '异常类别', key: 'abnormal_type_name', width: 12 },
    { header: '数量', key: 'quantity', width: 8 },
    { header: '来源部门', key: 'source_department_name', width: 12 },
    { header: '来源工序', key: 'source_process_name', width: 14 },
    { header: '发现工序', key: 'found_process_name', width: 14 },
    { header: '异常描述', key: 'description', width: 30 },
    { header: '提交人', key: 'submitter_name', width: 12 },
    { header: '工号', key: 'submitter_employee_id', width: 12 },
    { header: '状态', key: 'status_text', width: 10 },
    { header: '提交时间', key: 'created_at', width: 20 },
  ];

  rows.forEach((r, i) => {
    wsDetail.addRow({
      seq: i + 1,
      record_no: r.record_no,
      work_order_no: r.work_order_no,
      product_model_name: r.product_model_name,
      abnormal_type_name: r.abnormal_type_name,
      quantity: r.quantity,
      source_department_name: r.source_department_name,
      source_process_name: r.source_process_name,
      found_process_name: r.found_process_name,
      description: r.description,
      submitter_name: r.submitter_name,
      submitter_employee_id: r.submitter_employee_id,
      status_text: r.status === 'open' ? '待处理' : '已解决',
      created_at: r.created_at,
    });
  });

  // Style header
  [wsSummary, wsDetail].forEach(ws => {
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 22;
  });

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''异常记录_导出_${timestamp}.xlsx`);

  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
