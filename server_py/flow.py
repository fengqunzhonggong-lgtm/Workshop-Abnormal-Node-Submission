from flask import Blueprint, request, jsonify
from database import get_db
from auth import require_auth, require_role

flow_bp = Blueprint('flow', __name__)


@flow_bp.route('/api/flow/analysis', methods=['GET'])
@require_auth
@require_role('superadmin')
def analysis():
    where = []
    params = []
    for f, op in [('date_from', '>='), ('date_to', '<=')]:
        v = request.args.get(f)
        if v:
            where.append(f"date(r.created_at) {op} ?")
            params.append(v)
    where_clause = ('WHERE ' + ' AND '.join(where)) if where else ''

    db = get_db()
    rows = db.execute(f"""
        SELECT sp.name as source_name, fp.name as found_name, COUNT(*) as count
        FROM abnormal_records r
        LEFT JOIN source_processes sp ON r.source_process_id = sp.id
        LEFT JOIN found_processes fp ON r.found_process_id = fp.id
        {where_clause}
        GROUP BY sp.name, fp.name ORDER BY count DESC
    """, params).fetchall()

    source_names = list(dict.fromkeys(r['source_name'] for r in rows if r['source_name']))
    found_names = list(dict.fromkeys(r['found_name'] for r in rows if r['found_name']))

    matrix = {s: {f: 0 for f in found_names} for s in source_names}
    for r in rows:
        if r['source_name'] and r['found_name']:
            matrix[r['source_name']][r['found_name']] = r['count']

    db.close()
    return jsonify({
        'sourceNames': source_names, 'foundNames': found_names,
        'matrix': matrix, 'rows': [dict(r) for r in rows]
    })
