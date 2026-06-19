import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify, g

SECRET = 'factory_anomaly_system_secret_key_2026'
auth_bp = Blueprint('auth', __name__)


def make_token(user):
    return jwt.encode({
        'id': user['id'],
        'employee_id': user['employee_id'],
        'name': user['name'],
        'role': user['role'],
        'exp': datetime.utcnow() + timedelta(hours=12)
    }, SECRET, algorithm='HS256')


def check_auth():
    """Before-request handler that verifies JWT."""
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return jsonify({'error': '未登录，请先登录'}), 401
    try:
        g.user = jwt.decode(header[7:], SECRET, algorithms=['HS256'])
    except Exception:
        return jsonify({'error': '登录已过期，请重新登录'}), 401
    return None


def require_auth(f):
    """Decorator to require authentication on a single route."""
    @wraps(f)
    def decorated(*args, **kwargs):
        err = check_auth()
        if err:
            return err
        return f(*args, **kwargs)
    return decorated


def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if g.user['role'] not in roles:
                return jsonify({'error': '权限不足'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('employee_id') or not data.get('password'):
        return jsonify({'error': '请输入工号和密码'}), 400

    from database import get_db
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE employee_id = ?",
                      (data['employee_id'],)).fetchone()
    if not user:
        db.close()
        return jsonify({'error': '工号或密码错误'}), 401
    if not user['is_active']:
        db.close()
        return jsonify({'error': '账号已被停用'}), 403
    if not bcrypt.checkpw(data['password'].encode(), user['password_hash'].encode()):
        db.close()
        return jsonify({'error': '工号或密码错误'}), 401

    token = make_token(user)
    db.close()
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'], 'employee_id': user['employee_id'],
            'name': user['name'], 'role': user['role']
        }
    })


@auth_bp.route('/api/auth/me', methods=['GET'])
@require_auth
def me():
    return jsonify({'user': g.user})
