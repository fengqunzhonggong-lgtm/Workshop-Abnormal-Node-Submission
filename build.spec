# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['server_py/app.py'],
    pathex=['.'],
    binaries=[],
    datas=[('server_py/static', 'static')],
    hiddenimports=['sqlite3', 'bcrypt', 'jwt', 'openpyxl', 'flask', 'flask_cors'],
    hookspath=[],
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'pandas', 'scipy', 'PIL', 'cv2'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='总装异常管理系统',
    debug=False,
    strip=False,
    upx=True,
    console=True,
    icon=None,
)
