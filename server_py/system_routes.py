import os
import sys
import shutil
from datetime import datetime
from flask import Blueprint, request, jsonify
from database import get_db, DB_PATH
from auth import require_auth, require_role
from environment import run_diagnostics

system_bp = Blueprint('system', __name__)

if getattr(sys, 'frozen', False):
    BASE = os.path.dirname(sys.executable)
else:
    BASE = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE, 'backups')


@system_bp.route('/api/system/backup', methods=['POST'])
@require_auth
@require_role('superadmin')
def backup():
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        ts = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
        dst = os.path.join(BACKUP_DIR, f'factory_anomaly_backup_{ts}.db')
        shutil.copy2(DB_PATH, dst)
        return jsonify({'message': f'备份成功: {dst}'})
    except Exception as e:
        return jsonify({'error': f'备份失败: {e}'}), 500


@system_bp.route('/api/system/archive', methods=['POST'])
@require_auth
@require_role('superadmin')
def archive():
    data = request.get_json()
    year = data.get('year') if data else None
    if not year:
        return jsonify({'error': '请提供归档年份'}), 400
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        ts = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
        dst = os.path.join(BACKUP_DIR, f'archive_{year}_{ts}.db')
        shutil.copy2(DB_PATH, dst)

        db = get_db()
        cur = db.execute("DELETE FROM abnormal_records WHERE strftime('%Y', created_at)=?", (str(year),))
        db.commit()
        db.close()
        return jsonify({'message': f'已归档 {cur.rowcount} 条 {year} 年记录'})
    except Exception as e:
        return jsonify({'error': f'归档失败: {e}'}), 500


@system_bp.route('/api/system/history', methods=['DELETE'])
@require_auth
@require_role('superadmin')
def delete_history():
    data = request.get_json()
    before = data.get('before_date') if data else None
    if not before:
        return jsonify({'error': '请提供删除截止日期'}), 400
    db = get_db()
    cur = db.execute("DELETE FROM abnormal_records WHERE date(created_at) < ?", (before,))
    db.commit()
    db.close()
    return jsonify({'message': f'已删除 {cur.rowcount} 条 {before} 之前的历史记录'})


@system_bp.route('/api/system/status', methods=['GET'])
@require_auth
@require_role('superadmin')
def system_status():
    """Run full environment diagnostics and return results."""
    result = run_diagnostics()
    return jsonify(result)


@system_bp.route('/api/system/info', methods=['GET'])
def system_info():
    """Lightweight system info — no auth needed, for startup check."""
    import socket
    import platform
    from environment import get_all_ips
    return jsonify({
        'hostname': socket.gethostname(),
        'ips': get_all_ips(),
        'os': platform.system() + ' ' + platform.release(),
        'version': 'V1.0',
        'db_exists': os.path.exists(DB_PATH),
    })
