from flask import Blueprint, request, jsonify, g
from database import get_db
from auth import require_auth, require_role

stats_bp = Blueprint('stats', __name__)


@stats_bp.route('/api/stats/summary', methods=['GET'])
@require_auth
@require_role('superadmin')
def summary():
    where, params = [], []
    for f, op in [('date_from', '>='), ('date_to', '<=')]:
        v = request.args.get(f)
        if v:
            where.append(f"date(r.created_at) {op} ?")
            params.append(v)
    # Department filter for per-department analysis
    dept_id = request.args.get('source_department_id')
    if dept_id:
        where.append("r.source_department_id = ?")
        params.append(int(dept_id))
    base_where = ('WHERE ' + ' AND '.join(where)) if where else ''

    def status_where(cond):
        return f"{base_where} AND {cond}" if base_where else f"WHERE {cond}"

    db = get_db()
    total = db.execute(f"SELECT COUNT(*) as c FROM abnormal_records r {base_where}", params).fetchone()['c']
    op = db.execute(f"SELECT COUNT(*) as c FROM abnormal_records r {status_where('r.status=?')}", params + ['open']).fetchone()['c']
    res = db.execute(f"SELECT COUNT(*) as c FROM abnormal_records r {status_where('r.status=?')}", params + ['resolved']).fetchone()['c']

    def q(sql):
        # Insert WHERE clause before GROUP BY, not after ORDER BY
        return [dict(r) for r in db.execute(sql.format(where=base_where), params).fetchall()]

    by_type = q("SELECT at2.name, COUNT(*) as count FROM abnormal_records r LEFT JOIN abnormal_types at2 ON r.abnormal_type_id=at2.id {where} GROUP BY at2.name ORDER BY count DESC")
    by_dept = q("SELECT sd.name, COUNT(*) as count FROM abnormal_records r LEFT JOIN source_departments sd ON r.source_department_id=sd.id {where} GROUP BY sd.name ORDER BY count DESC")
    by_sp = q("SELECT sp.name, COUNT(*) as count FROM abnormal_records r LEFT JOIN source_processes sp ON r.source_process_id=sp.id {where} GROUP BY sp.name ORDER BY count DESC")
    by_fp = q("SELECT fp.name, COUNT(*) as count FROM abnormal_records r LEFT JOIN found_processes fp ON r.found_process_id=fp.id {where} GROUP BY fp.name ORDER BY count DESC")

    db.close()
    return jsonify({
        'total': total, 'open': op, 'resolved': res,
        'byType': by_type, 'byDept': by_dept,
        'bySourceProcess': by_sp, 'byFoundProcess': by_fp
    })


@stats_bp.route('/api/stats/trend', methods=['GET'])
@require_auth
@require_role('superadmin')
def trend():
    days = int(request.args.get('days', 30))
    db = get_db()
    rows = db.execute("""
        SELECT date(created_at) as date, COUNT(*) as count
        FROM abnormal_records
        WHERE created_at >= date('now', '-' || ? || ' days')
        GROUP BY date(created_at) ORDER BY date ASC
    """, (days,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


@stats_bp.route('/api/stats/top', methods=['GET'])
@require_auth
@require_role('superadmin')
def top():
    where, params = [], []
    for f, op in [('date_from', '>='), ('date_to', '<=')]:
        v = request.args.get(f)
        if v:
            where.append(f"date(r.created_at) {op} ?")
            params.append(v)
    base_where = ('WHERE ' + ' AND '.join(where)) if where else ''
    db = get_db()
    top_types = [dict(r) for r in db.execute(
        f"SELECT at2.name, COUNT(*) as count FROM abnormal_records r LEFT JOIN abnormal_types at2 ON r.abnormal_type_id=at2.id {base_where} GROUP BY at2.name ORDER BY count DESC LIMIT 10",
        params).fetchall()]
    top_depts = [dict(r) for r in db.execute(
        f"SELECT sd.name, COUNT(*) as count FROM abnormal_records r LEFT JOIN source_departments sd ON r.source_department_id=sd.id {base_where} GROUP BY sd.name ORDER BY count DESC LIMIT 10",
        params).fetchall()]
    db.close()
    return jsonify({'topTypes': top_types, 'topDepts': top_depts})
