import bcrypt
from datetime import datetime
from flask import Blueprint, request, jsonify
from database import get_db
from auth import require_auth, require_role

users_bp = Blueprint('users', __name__)


@users_bp.route('/api/users', methods=['GET'])
@require_auth
@require_role('superadmin')
def list_users():
    db = get_db()
    rows = db.execute(
        "SELECT id, employee_id, name, role, is_active, created_at FROM users ORDER BY id"
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


@users_bp.route('/api/users', methods=['POST'])
@require_auth
@require_role('superadmin')
def create_user():
    data = request.get_json()
    if not data.get('employee_id') or not data.get('name') or not data.get('password') or not data.get('role'):
        return jsonify({'error': '请填写所有必填字段'}), 400
    if data['role'] not in ('superadmin', 'manager', 'employee'):
        return jsonify({'error': '无效的角色'}), 400

    db = get_db()
    if db.execute("SELECT id FROM users WHERE employee_id=?", (data['employee_id'],)).fetchone():
        db.close()
        return jsonify({'error': '工号已存在'}), 400

    h = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.execute(
        "INSERT INTO users (employee_id, name, password_hash, role, created_at, updated_at) VALUES (?,?,?,?,?,?)",
        (data['employee_id'], data['name'], h, data['role'], now, now)
    )
    db.commit()
    db.close()
    return jsonify({'message': '用户创建成功'}), 201


@users_bp.route('/api/users/<int:id>', methods=['PUT'])
@require_auth
@require_role('superadmin')
def update_user(id):
    data = request.get_json()
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id=?", (id,)).fetchone()
    if not user:
        db.close()
        return jsonify({'error': '用户不存在'}), 404
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.execute("UPDATE users SET name=?, role=?, updated_at=? WHERE id=?",
               (data.get('name', user['name']), data.get('role', user['role']), now, id))
    db.commit()
    db.close()
    return jsonify({'message': '更新成功'})


@users_bp.route('/api/users/<int:id>/reset-password', methods=['PUT'])
@require_auth
@require_role('superadmin')
def reset_password(id):
    data = request.get_json()
    if not data.get('password'):
        return jsonify({'error': '请输入新密码'}), 400
    db = get_db()
    if not db.execute("SELECT id FROM users WHERE id=?", (id,)).fetchone():
        db.close()
        return jsonify({'error': '用户不存在'}), 404
    h = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.execute("UPDATE users SET password_hash=?, updated_at=? WHERE id=?", (h, now, id))
    db.commit()
    db.close()
    return jsonify({'message': '密码已重置'})


@users_bp.route('/api/users/<int:id>/toggle-status', methods=['PUT'])
@require_auth
@require_role('superadmin')
def toggle_status(id):
    db = get_db()
    user = db.execute("SELECT id, is_active FROM users WHERE id=?", (id,)).fetchone()
    if not user:
        db.close()
        return jsonify({'error': '用户不存在'}), 404
    new = 0 if user['is_active'] else 1
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.execute("UPDATE users SET is_active=?, updated_at=? WHERE id=?", (new, now, id))
    db.commit()
    db.close()
    return jsonify({'message': '用户已启用' if new else '用户已停用'})
