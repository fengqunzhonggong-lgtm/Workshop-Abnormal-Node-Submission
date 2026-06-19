import os
import sys
import webbrowser
import threading
import socket
from flask import Flask, send_from_directory
from flask_cors import CORS

from database import init_db, seed_admin, seed_base_data
from environment import run_diagnostics, get_all_ips
from auth import auth_bp
from anomalies import anomalies_bp
from base_data import base_data_bp
from stats import stats_bp
from flow import flow_bp
from export_routes import export_bp
from user_routes import users_bp
from system_routes import system_bp

# Determine static folder path (works for both dev and PyInstaller)
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, static_folder=None)
CORS(app)

# Register API blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(anomalies_bp)
app.register_blueprint(base_data_bp)
app.register_blueprint(stats_bp)
app.register_blueprint(flow_bp)
app.register_blueprint(export_bp)
app.register_blueprint(users_bp)
app.register_blueprint(system_bp)


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return {'error': 'Not found'}, 404
    # Try to serve exact file (for assets: js, css, png, ico, etc.)
    if path and '.' in path.split('/')[-1]:
        full = os.path.join(STATIC_DIR, path)
        if os.path.isfile(full):
            return send_from_directory(STATIC_DIR, path)
    # SPA fallback: let React Router handle all other paths
    return send_from_directory(STATIC_DIR, 'index.html')


def open_browser():
    webbrowser.open('http://localhost:3000')


if __name__ == '__main__':
    # ── Environment diagnostics ──
    print("=" * 56)
    print("  总装车间异常管理系统 V1.0")
    print("=" * 56)
    print()
    print("  [环境检测] 正在检查运行环境...")
    print()

    diag = run_diagnostics(port=3000)

    for item in diag['items']:
        icon = {'ok': '[OK]', 'warn': '[!!]', 'error': '[XX]', 'repaired': '[OK]'}.get(item['status'], '[??]')
        print(f"    {icon} {item['label']}: {item['detail']}")

    print()
    print(f"  检测结果: {diag['summary']['ok']}项正常, "
          f"{diag['summary']['warn']}项警告, "
          f"{diag['summary']['error']}项异常, "
          f"{diag['summary']['repaired']}项已修复")
    print()

    if not diag['summary']['healthy']:
        print("  [!] 存在异常项，但系统将尝试继续启动...")
        print()

    # ── Initialize database ──
    init_db()
    seed_admin()
    seed_base_data()

    # ── Print service URLs ──
    print("-" * 56)
    print("  服务已启动:")
    print(f"    本地访问:  http://localhost:3000")
    ips = get_all_ips()
    for ip in ips:
        print(f"    局域网:    http://{ip}:3000")
    print()
    print("  默认管理员:  admin / admin123")
    print("-" * 56)

    # Start Flask server in background thread
    flask_thread = threading.Thread(
        target=lambda: app.run(host='0.0.0.0', port=3000, debug=False, use_reloader=False),
        daemon=True
    )
    flask_thread.start()

    # Wait for server to be ready
    import time
    time.sleep(1.5)

    # Show Windows confirmation dialog
    import ctypes
    ips = get_all_ips()
    msg = "服务已启动！\n\n"
    msg += "    本地访问:  http://localhost:3000\n"
    for ip in ips:
        msg += f"    局域网:    http://{ip}:3000\n"
    msg += "\n    默认管理员:  admin / admin123\n"
    msg += "\n点击「确定」后窗口将隐藏至后台运行"
    ctypes.windll.user32.MessageBoxW(0, msg, "总装车间异常管理系统 V1.0", 0x40)

    # Hide console window
    hwnd = ctypes.windll.kernel32.GetConsoleWindow()
    if hwnd:
        ctypes.windll.user32.ShowWindow(hwnd, 0)  # SW_HIDE

    # Open browser after console is hidden
    open_browser()

    # Keep main thread alive (Flask is daemon, so main thread must survive)
    while True:
        time.sleep(60)
