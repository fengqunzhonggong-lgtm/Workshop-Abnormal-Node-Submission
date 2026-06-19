"""
Environment detection and auto-repair module.
Runs at startup to validate the deployment environment.
"""
import os
import sys
import socket
import shutil
import platform
import datetime
import logging

logger = logging.getLogger(__name__)

# ── Resolve paths ──────────────────────────────────────────────
if getattr(sys, 'frozen', False):
    EXE_DIR = os.path.dirname(sys.executable)
    MEIPASS = sys._MEIPASS
else:
    EXE_DIR = os.path.dirname(os.path.abspath(__file__))
    MEIPASS = EXE_DIR

DB_PATH = os.path.join(EXE_DIR, 'factory_anomaly.db')
BACKUP_DIR = os.path.join(EXE_DIR, 'backups')
STATIC_DIR = os.path.join(MEIPASS, 'static')
LOG_DIR = os.path.join(EXE_DIR, 'logs')

check_results = []  # accumulates (label, status, detail)


def _ok(label, detail=''):
    check_results.append({'label': label, 'status': 'ok', 'detail': str(detail)})

def _warn(label, detail=''):
    check_results.append({'label': label, 'status': 'warn', 'detail': str(detail)})

def _error(label, detail=''):
    check_results.append({'label': label, 'status': 'error', 'detail': str(detail)})

def _repair(label, detail=''):
    check_results.append({'label': label, 'status': 'repaired', 'detail': str(detail)})


# ── Individual checks ──────────────────────────────────────────

def check_os():
    """Detect operating system."""
    try:
        info = f"{platform.system()} {platform.release()} ({platform.version()})"
        win_ver = sys.getwindowsversion()
        info = f"Windows {win_ver.major}.{win_ver.minor} Build {win_ver.build}  {'64-bit' if sys.maxsize > 2**32 else '32-bit'}"
        _ok('操作系统', info)
        return True
    except Exception as e:
        _error('操作系统', str(e))
        return False


def check_python():
    """Detect Python runtime."""
    try:
        info = f"Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        _ok('Python 运行环境', info)
        return True
    except Exception as e:
        _error('Python 运行环境', str(e))
        return False


def check_hostname():
    """Detect hostname and IP addresses."""
    try:
        hostname = socket.gethostname()
        _ok('主机名', hostname)
        return True
    except Exception as e:
        _error('主机名', str(e))
        return False


def get_all_ips():
    """Return all non-loopback IPv4 addresses."""
    ips = []
    try:
        for name in socket.gethostbyname_ex(socket.gethostname())[2]:
            if not name.startswith('127.'):
                ips.append(name)
    except Exception:
        pass
    # Also try the connection method
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
        s.close()
        if ip not in ips:
            ips.append(ip)
    except Exception:
        pass
    return ips


def check_network():
    """Detect network connectivity."""
    try:
        ips = get_all_ips()
        if ips:
            _ok('网络地址', ', '.join(ips))
            return True
        else:
            _warn('网络地址', '未检测到可用IP，WiFi可能未连接')
            return True
    except Exception as e:
        _warn('网络检测', f'检测失败: {e}')
        return True


def check_disk_space():
    """Check available disk space."""
    try:
        total, used, free = shutil.disk_usage(EXE_DIR)
        free_mb = free // (1024 * 1024)
        if free_mb < 100:
            _warn('磁盘空间', f'剩余 {free_mb} MB，空间不足可能影响运行')
        else:
            _ok('磁盘空间', f'剩余 {free_mb} MB')
        return True
    except Exception as e:
        _warn('磁盘空间', f'无法检测: {e}')
        return True


def check_write_permission():
    """Check if we can write to the execution directory."""
    try:
        test_file = os.path.join(EXE_DIR, '.env_test_write')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        _ok('目录写入权限', EXE_DIR)
        return True
    except Exception as e:
        _error('目录写入权限', f'无法写入 {EXE_DIR}: {e}')
        return False


def check_dirs():
    """Ensure required directories exist."""
    repaired = False
    for d, label in [(BACKUP_DIR, '备份目录'), (LOG_DIR, '日志目录')]:
        try:
            if not os.path.exists(d):
                os.makedirs(d, exist_ok=True)
                _repair(label, f'已自动创建: {d}')
                repaired = True
            else:
                _ok(label, d)
        except Exception as e:
            _error(label, f'创建失败: {e}')
    return True


def check_database():
    """Check database integrity and auto-repair if needed."""
    import sqlite3
    try:
        if not os.path.exists(DB_PATH):
            _warn('数据库文件', '数据库不存在，将在首次请求时自动创建')
            return False

        conn = sqlite3.connect(DB_PATH)
        cur = conn.execute("PRAGMA integrity_check")
        result = cur.fetchone()[0]
        if result == 'ok':
            # Check all required tables exist
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            table_names = [t[0] for t in tables]
            required = ['users', 'product_models', 'abnormal_types',
                       'source_departments', 'source_processes',
                       'found_processes', 'abnormal_records']
            missing = [t for t in required if t not in table_names]
            if missing:
                _warn('数据库表', f'缺少表: {", ".join(missing)}，将自动修复')
                conn.close()
                return False
            _ok('数据库', f'正常 ({len(table_names)} 张表)')
        else:
            _error('数据库完整性', f'检查失败: {result}')
            conn.close()
            return False
        conn.close()
        return True
    except Exception as e:
        _error('数据库', f'检查失败: {e}')
        return False


def check_static_files():
    """Check static frontend files exist."""
    try:
        index_path = os.path.join(STATIC_DIR, 'index.html')
        if os.path.isfile(index_path):
            # Count assets
            file_count = 0
            for root, dirs, files in os.walk(STATIC_DIR):
                file_count += len(files)
            _ok('前端静态文件', f'{file_count} 个文件')
            return True
        else:
            _error('前端静态文件', f'index.html 不存在: {STATIC_DIR}')
            return False
    except Exception as e:
        _error('前端静态文件', str(e))
        return False


def check_port(port=3000):
    """Check if the target port is available."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        result = s.connect_ex(('127.0.0.1', port))
        s.close()
        if result == 0:
            _warn(f'端口 {port}', f'端口 {port} 已被占用，服务可能无法启动')
            return False
        else:
            _ok(f'端口 {port}', '可用')
            return True
    except Exception as e:
        _warn(f'端口 {port}', f'无法检测: {e}')
        return True


# ── Auto-repair ────────────────────────────────────────────────

def auto_repair():
    """Run auto-repair procedures for detected issues."""
    # Ensure directories
    for d in [BACKUP_DIR, LOG_DIR]:
        try:
            os.makedirs(d, exist_ok=True)
        except Exception:
            pass

    # If database is missing or corrupted, it will be recreated on next init_db()
    if not os.path.exists(DB_PATH):
        logger.info('Database not found — will be created on startup.')

    # If static files are missing (shouldn't happen with PyInstaller), flag it
    index_path = os.path.join(STATIC_DIR, 'index.html')
    if not os.path.isfile(index_path):
        logger.error('Static files missing — frontend will not work!')


# ── Main diagnostic entry point ────────────────────────────────

def run_diagnostics(port=3000):
    """Run all environment checks and return results list."""
    check_results.clear()

    logger.info('=' * 50)
    logger.info('  环境诊断开始')
    logger.info('=' * 50)

    checks = [
        ('操作系统', check_os),
        ('Python 环境', check_python),
        ('主机名', check_hostname),
        ('网络地址', check_network),
        ('磁盘空间', check_disk_space),
        ('写入权限', check_write_permission),
        ('目录结构', check_dirs),
        ('数据库', check_database),
        ('静态文件', check_static_files),
        ('服务端口', lambda: check_port(port)),
    ]

    for label, fn in checks:
        logger.info(f'  [{label}] 检测中...')
        try:
            fn()
        except Exception as e:
            _error(label, str(e))

    # Run auto-repair
    auto_repair()

    # Count statuses
    ok_count = sum(1 for r in check_results if r['status'] == 'ok')
    warn_count = sum(1 for r in check_results if r['status'] == 'warn')
    error_count = sum(1 for r in check_results if r['status'] == 'error')
    repair_count = sum(1 for r in check_results if r['status'] == 'repaired')

    logger.info('-' * 50)
    logger.info(f'  结果: {ok_count} 正常, {warn_count} 警告, {error_count} 错误, {repair_count} 已修复')
    logger.info('=' * 50)

    return {
        'items': list(check_results),
        'summary': {
            'ok': ok_count,
            'warn': warn_count,
            'error': error_count,
            'repaired': repair_count,
            'healthy': error_count == 0,
        },
        'system': {
            'hostname': socket.gethostname(),
            'ips': get_all_ips(),
            'os': platform.system() + ' ' + platform.release(),
            'python': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            'frozen': getattr(sys, 'frozen', False),
            'exe_dir': EXE_DIR,
            'db_path': DB_PATH,
            'db_exists': os.path.exists(DB_PATH),
            'db_size_mb': round(os.path.getsize(DB_PATH) / (1024 * 1024), 2) if os.path.exists(DB_PATH) else 0,
            'static_dir': STATIC_DIR,
            'static_exists': os.path.isdir(STATIC_DIR),
            'time': datetime.datetime.now().isoformat(),
        }
    }
