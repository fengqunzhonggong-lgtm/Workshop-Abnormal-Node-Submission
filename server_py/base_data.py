from datetime import datetime
from flask import Blueprint, request, jsonify, g
from database import get_db
from auth import require_auth, require_role, check_auth

base_data_bp = Blueprint('base_data', __name__)

TABLES = ['product_models', 'abnormal_types', 'source_departments',
          'source_processes', 'found_processes']


@base_data_bp.before_request
def _check():
    return check_auth()


@base_data_bp.route('/api/base-data/<table>', methods=['GET'])
def list_all(table):
    if table not in TABLES:
        return jsonify({'error': '无效的数据表'}), 400
    db = get_db()
    did = request.args.get('department_id')
    if table == 'source_processes' and did:
        rows = db.execute(
            "SELECT * FROM source_processes WHERE department_id = ? ORDER BY id", (did,)
        ).fetchall()
    else:
        rows = db.execute(f"SELECT * FROM {table} ORDER BY id").fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


@base_data_bp.route('/api/base-data/<table>', methods=['POST'])
@require_role('superadmin')
def create(table):
    if table not in TABLES:
        return jsonify({'error': '无效的数据表'}), 400
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': '名称不能为空'}), 400

    db = get_db()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
        if table == 'source_processes':
            db.execute(
                f"INSERT INTO {table} (name, department_id, created_at, updated_at) VALUES (?,?,?,?)",
                (name, data.get('department_id'), now, now)
            )
        else:
            db.execute(
                f"INSERT INTO {table} (name, created_at, updated_at) VALUES (?,?,?)",
                (name, now, now)
            )
        db.commit()
    except Exception as e:
        db.close()
        return jsonify({'error': '名称已存在' if 'UNIQUE' in str(e) else '创建失败'}), 400
    db.close()
    return jsonify({'message': '创建成功'}), 201


@base_data_bp.route('/api/base-data/<table>/<int:id>', methods=['PUT'])
@require_role('superadmin')
def update(table, id):
    if table not in TABLES:
        return jsonify({'error': '无效的数据表'}), 400
    data = request.get_json()
    db = get_db()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    existing = db.execute(f"SELECT * FROM {table} WHERE id = ?", (id,)).fetchone()
    if not existing:
        db.close()
        return jsonify({'error': '记录不存在'}), 404
    try:
        name = data.get('name', existing['name'])
        is_active = data.get('is_active', existing['is_active'])
        if table == 'source_processes':
            did = data.get('department_id', existing['department_id'])
            db.execute(f"UPDATE {table} SET name=?, is_active=?, department_id=?, updated_at=? WHERE id=?",
                       (name, is_active, did, now, id))
        else:
            db.execute(f"UPDATE {table} SET name=?, is_active=?, updated_at=? WHERE id=?",
                       (name, is_active, now, id))
        db.commit()
    except Exception as e:
        db.close()
        return jsonify({'error': '更新失败'}), 400
    db.close()
    return jsonify({'message': '更新成功'})


@base_data_bp.route('/api/base-data/<table>/<int:id>', methods=['DELETE'])
@require_role('superadmin')
def delete(table, id):
    if table not in TABLES:
        return jsonify({'error': '无效的数据表'}), 400
    db = get_db()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.execute(f"UPDATE {table} SET is_active=0, updated_at=? WHERE id=?", (now, id))
    db.commit()
    db.close()
    return jsonify({'message': '已停用'})
