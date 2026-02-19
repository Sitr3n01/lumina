# -*- mode: python ; coding: utf-8 -*-
"""
Configuração PyInstaller para empacotar o backend LUMINA.

Uso:
    pyinstaller --noconfirm lumina.spec

Gera: dist/lumina-backend/ com lumina-backend.exe
"""

block_cipher = None

a = Analysis(
    ['run_backend.py'],
    pathex=[],
    binaries=[],
    datas=[
        # Templates de email HTML
        ('app/templates/email', 'app/templates/email'),
        # Templates DOCX (se existirem)
        ('templates', 'templates'),
    ],
    hiddenimports=[
        # Uvicorn internals
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        # Pydantic e settings
        'pydantic',
        'pydantic.v1',
        'pydantic_settings',
        'pydantic.deprecated.decorator',
        'pydantic.deprecated.class_validators',
        # SQLAlchemy e banco de dados
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.ext.baked',
        'aiosqlite',
        # Email
        'email.mime.text',
        'email.mime.multipart',
        'email.mime.base',
        'email.mime.application',
        # Segurança / Auth
        'passlib',
        'passlib.handlers',
        'passlib.handlers.bcrypt',
        'passlib.handlers.des_crypt',
        'passlib.handlers.pbkdf2',
        'jose',
        'jose.jwt',
        'cryptography',
        'cryptography.hazmat.primitives',
        # Documentos
        'docxtpl',
        'docx',
        'docx.oxml',
        # Imagens
        'PIL',
        'PIL.Image',
        # Templates
        'jinja2',
        'jinja2.ext',
        # Logging
        'loguru',
        # HTTP client
        'httpx',
        'httpx._transports.default',
        # Retry / resilience
        'tenacity',
        # iCal parser
        'icalendar',
        # Rate limiting
        'slowapi',
        'slowapi.util',
        # CSRF / Sessions
        'itsdangerous',
        # Multipart form
        'multipart',
        'python_multipart',
        # FastAPI e Starlette
        'fastapi',
        'starlette',
        'starlette.middleware',
        'starlette.middleware.cors',
        # h11 (HTTP/1.1 parser)
        'h11',
        # anyio async
        'anyio',
        'anyio._backends._asyncio',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        '_tkinter',
        'test',
        'unittest',
        'pytest',
        'doctest',
        'pdb',
        'IPython',
        'jupyter',
        'notebook',
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='lumina-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Comprimir com UPX para reduzir tamanho
    console=False,  # Sem janela de console no Windows
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='lumina-backend',
)
