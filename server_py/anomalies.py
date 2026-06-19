from datetime import datetime
from flask import Blueprint, request, jsonify, g
from database import get_db
from auth import require_auth, require_role, check_auth
from utils import generate_record_no, get_week_label, get_month_label

anomalies_bp = Blueprint('anomalies', __name__)


@anomalies_bp.before_request
def _check():
    return check_auth()


@anomalies_bp.route('/api/anomalies', methods=['POST'])
def create():
    data = request.get_json()
    required = ['work_order_no', 'product_model_name', 'abnormal_type_id',
                'source_department_id', 'source_process_id', 'found_process_id']
    for f in required:
        if not data.get(f):
            return jsonify({'error': '请填写所有必填字段'}), 400

    db = get_db()
    now = datetime.now()
    record_no = generate_record_no()

    # Look up or create product model by name
    name = data['product_model_name'].strip()
    row = db.execute("SELECT id FROM product_models WHERE name = ?", (name,)).fetchone()
    if row:
        product_model_id = row['id']
    else:
        cur2 = db.execute("INSERT INTO product_models (name) VALUES (?)", (name,))
        product_model_id = cur2.lastrowid

    cur = db.execute("""
        INSERT INTO abnormal_records (
            record_no, work_order_no, product_model_id, abnormal_type_id,
            quantity, source_department_id, source_process_id, found_process_id,
            description, submitter_id, submitter_name, submitter_employee_id,
            submitter_role, week_label, month_label
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record_no, data['work_order_no'], product_model_id,
        data['abnormal_type_id'], data.get('quantity', 1),
        data['source_department_id'], data['source_process_id'],
        data['found_process_id'], data.get('description', ''),
        g.user['id'], g.user['name'], g.user['employee_id'], g.user['role'],
        get_week_label(now), get_month_label(now)
    ))
    db.commit()
    row = db.execute("SELECT * FROM abnormal_records WHERE id = ?",
                     (cur.lastrowid,)).fetchone()
    db.close()
    return jsonify(dict(row)), 201


@anomalies_bp.route('/api/anomalies', methods=['GET'])
def list_all():
    db = get_db()
    page = max(int(request.args.get('page', 1)), 1)
    page_size = min(int(request.args.get('page_size', 20)), 100)
    offset = (page - 1) * page_size

    where = []
    params = []

    if g.user['role'] == 'employee':
        where.append("r.submitter_id = ?")
        params.append(g.user['id'])

    for f in ['work_order_no', 'submitter_id', 'status', 'product_model_id',
              'abnormal_type_id', 'source_department_id', 'source_process_id',
              'found_process_id']:
        v = request.args.get(f)
        if v:
            where.append(f"r.{f} = ?")
            params.append(v)

    product_model_name = request.args.get('product_model_name')
    if product_model_name:
        where.append("pm.name LIKE ?")
        params.append(f"%{product_model_name}%")

    kw = request.args.get('keyword')
    if kw:
        where.append("(r.work_order_no LIKE ? OR r.description LIKE ? OR r.record_no LIKE ? OR pm.name LIKE ?)")
        params.extend([f"%{kw}%", f"%{kw}%", f"%{kw}%", f"%{kw}%"])

    for f, op in [('date_from', '>='), ('date_to', '<=')]:
        v = request.args.get(f)
        if v:
            where.append(f"date(r.created_at) {op} ?")
            params.append(v)

    where_clause = ('WHERE ' + ' AND '.join(where)) if where else ''

    total = db.execute(
        f"SELECT COUNT(*) as c FROM abnormal_records r {where_clause}", params
    ).fetchone()['c']

    rows = db.execute(f"""
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
        {where_clause}
        ORDER BY r.created_at DESC LIMIT ? OFFSET ?
    """, params + [page_size, offset]).fetchall()

    db.close()
    return jsonify({
        'items': [dict(r) for r in rows],
        'total': total, 'page': page, 'page_size': page_size,
        'total_pages': max((total + page_size - 1) // page_size, 1)
    })


@anomalies_bp.route('/api/anomalies/<int:id>', methods=['GET'])
def detail(id):
    db = get_db()
    row = db.execute("""
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
        WHERE r.id = ?
    """, (id,)).fetchone()
    db.close()
    if not row:
        return jsonify({'error': '记录不存在'}), 404
    if g.user['role'] == 'employee' and row['submitter_id'] != g.user['id']:
        return jsonify({'error': '无权查看此记录'}), 403
    return jsonify(dict(row))


@anomalies_bp.route('/api/anomalies/batch', methods=['DELETE'])
@require_role('superadmin')
def batch_delete():
    data = request.get_json()
    ids = data.get('ids', []) if data else []
    if not ids:
        return jsonify({'error': '请提供要删除的记录ID列表'}), 400
    db = get_db()
    ph = ','.join(['?'] * len(ids))
    cur = db.execute(f"DELETE FROM abnormal_records WHERE id IN ({ph})", ids)
    db.commit()
    db.close()
    return jsonify({'message': f'已删除 {cur.rowcount} 条记录', 'deleted': cur.rowcount})


@anomalies_bp.route('/api/anomalies/<int:id>/status', methods=['PATCH'])
def update_status(id):
    data = request.get_json()
    new_status = data.get('status') if data else None
    if new_status not in ('open', 'resolved'):
        return jsonify({'error': '无效的状态值'}), 400
    db = get_db()
    row = db.execute("SELECT id, submitter_id FROM abnormal_records WHERE id = ?", (id,)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': '记录不存在'}), 404
    db.execute("UPDATE abnormal_records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
               (new_status, id))
    db.commit()
    db.close()
    return jsonify({'message': '状态已更新', 'status': new_status})


@anomalies_bp.route('/api/anomalies/<int:id>', methods=['DELETE'])
@require_role('superadmin')
def delete(id):
    db = get_db()
    row = db.execute("SELECT id FROM abnormal_records WHERE id = ?", (id,)).fetchone()
    if not row:
        db.close()
        return jsonify({'error': '记录不存在'}), 404
    db.execute("DELETE FROM abnormal_records WHERE id = ?", (id,))
    db.commit()
    db.close()
    return jsonify({'message': '已删除'})
