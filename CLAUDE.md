# CLAUDE.md - Instrucoes para Agentes Claude

> Este arquivo e lido automaticamente por agentes Claude ao abrir o projeto.

## Projeto

**LUMINA v3.0.0** - Sistema de Gestao de Apartamentos para Airbnb/Booking.com
Aplicativo Desktop Windows via Electron + Backend FastAPI embutido.

## Status Atual

| Modulo | Status |
|--------|--------|
| MVP1 (Calendarios, Reservas, Conflitos, Estatisticas) | Completo |
| MVP2 (Documentos, Emails, Telegram, Notificacoes) | Completo |
| Migracao Electron Desktop | Completa |
| Auditoria de Seguranca (Partes 1+2+3) | Completa |
| Autenticacao Frontend (Login, AuthContext, JWT) | Completo |
| Testes automatizados (pytest, auth coverage) | Implementado |
| MVP3 (AI, Gmail API, sugestoes automaticas) | Planejado |

**Nota de seguranca:** O sistema passou por auditoria completa. Score atual ~9.0/10.
Correcoes aplicadas: str(e) leaks, Jinja2 sandbox, will-navigate Electron, datetime.utcnow,
register invite-only, JWT interceptor frontend, SandboxedEnvironment email templates.

## Stack

- **Backend:** Python 3.11+, FastAPI 0.115+, SQLAlchemy 2.0, SQLite, Uvicorn
- **Frontend:** React 18, Vite 5, Axios, Recharts, Lucide-react
- **Desktop:** Electron, electron-builder, PyInstaller
- **Config:** Pydantic Settings via .env
- **Tests:** pytest, TestClient (SQLite in-memory)

## Estrutura de Diretorios

```
raiz/
  app/                    # Backend FastAPI (Python)
    api/v1/               # auth.py, health.py
    core/                 # calendar_sync, conflict_detector, backup, validators, security, token_blacklist
    database/             # connection.py, session.py
    middleware/           # auth JWT, CSRF, security headers
    models/               # User, Booking, Property, Guest, BookingConflict, SyncAction, SyncLog, etc.
    routers/              # bookings, conflicts, statistics, calendar, documents, emails, settings, notifications
    schemas/              # Pydantic request/response models (auth.py tem _validate_password_strength)
    services/             # Business logic layer
    telegram/             # Bot Telegram (opcional)
    templates/email/      # Templates HTML de email (Jinja2 SandboxedEnvironment)
    utils/                # Logger, date utils
    version.py            # Single source of truth para versao
  frontend/               # Frontend React
    src/
      components/         # Calendar, Sidebar (com logout+user), EventModal, ErrorBoundary
      pages/              # Login, Dashboard, Calendar, Conflicts, Statistics, Documents,
                          # Emails, Notifications, Settings
      contexts/           # AuthContext (JWT, login/logout/register) + PropertyContext
      services/api.js     # Axios HTTP client com authAPI e Bearer token interceptor
      styles/global.css   # CSS design system
      utils/formatters.js
  electron/               # Electron main process
    main.js               # Entry point, will-navigate, wizard, splash, tray
    preload.js            # Context bridge (window.electronAPI)
    python-manager.js     # Gerencia processo Python
    ipc-handlers.js       # IPC handlers
    tray.js               # Bandeja do sistema
    updater.js            # Auto-update GitHub Releases
    splash.html           # Tela de carregamento
    wizard/               # Wizard configuracao inicial
  legacy/web-deployment/  # Docker, nginx, systemd (legado, nao usar)
  tests/                  # Testes pytest
    conftest.py           # Fixtures: db_session, client, admin_user, auth_headers
    test_auth_endpoints.py  # 16 testes de endpoints auth
    test_auth_middleware.py # 8 testes de middleware JWT + lockout
    test_platform_parser.py # Testes do parser de plataformas
  data/                   # Runtime: db, logs, backups, docs gerados (gitignored)
  templates/              # Templates DOCX (gitignored)
  docs/                   # Documentacao
  scripts/                # Scripts utilitarios
```

## Arquivos Criticos

| Arquivo | Papel |
|---------|-------|
| `app/main.py` | Entry point FastAPI, lifespan, middleware, shutdown endpoint |
| `app/config.py` | Pydantic Settings, LUMINA_ENV_FILE, LUMINA_DATA_DIR |
| `app/api/v1/auth.py` | Login, register (invite-only), setup-status, logout, me |
| `app/schemas/auth.py` | Pydantic schemas auth + _validate_password_strength() centralizada |
| `frontend/src/contexts/AuthContext.jsx` | AuthProvider, useAuth(), login/logout/register |
| `frontend/src/services/api.js` | Axios + authAPI + Bearer token interceptor + 401 handler |
| `frontend/src/App.jsx` | AuthProvider wrap + AppContent + rota para Login |
| `electron/main.js` | Entry point Electron, will-navigate, setWindowOpenHandler, destroyTray |
| `electron/python-manager.js` | Spawn/health check/crash recovery do Python |
| `tests/conftest.py` | Fixtures pytest (SQLite in-memory, TestClient) |

## Convencoes de Codigo

### Python (Backend)
- Docstrings em portugues
- Type hints em todos os parametros e retornos
- Async para I/O (email, HTTP, file)
- Logger via `from app.utils.logger import get_logger; logger = get_logger(__name__)`
- Validacao via Pydantic schemas — NUNCA expor str(e) ao cliente
- Erros: usar mensagens genericas no response, detalhes apenas nos logs internos
- Datas: usar `datetime.now(timezone.utc).replace(tzinfo=None)` (nunca `datetime.utcnow()`)
- Seguranca: validar inputs contra XSS, path traversal, SSTI (veja `app/core/validators.py`)

### JavaScript (Electron Main Process)
- CommonJS (`require`) para arquivos em `electron/`
- JSDoc para documentacao de funcoes
- `electron-log` para logging (nao console.log em producao)
- Preload scripts usam `contextBridge.exposeInMainWorld`
- NUNCA `nodeIntegration: true` - sempre via preload
- Validar TODOS os inputs IPC no main process

### React (Frontend)
- Functional components com hooks
- State-based routing (sem React Router) em `App.jsx`
- Autenticacao via `useAuth()` do AuthContext
- CSS em arquivos separados por componente
- Deteccao Electron: `if (window.electronAPI) { ... }`
- Design system: variaveis CSS em `frontend/src/styles/global.css`
- Classes globais: `.glass-card`, `.form-field`, `.btn-primary`, `.loading-state`, `.message`

### Testes
- Rodar com: `python -m pytest tests/ -v`
- Fixtures em `tests/conftest.py` — sempre usar `client` fixture (nao instanciar app direto)
- Banco isolado: SQLite in-memory via `db_session` fixture
- Nao testar logica interna, testar comportamento HTTP (status codes, response body)

## Regras de Commits

- Branch: `feature/electron-migration`
- Prefixos: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- Mensagens em ingles
- Um commit por mudanca logica
- Nunca commitar: `.env`, `data/`, `python-dist/`, `release/`, `node_modules/`, `venv/`, `.claude/settings.json`

## Comandos Uteis

```bash
# Backend (desenvolvimento)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (desenvolvimento)
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build

# Electron (desenvolvimento)
ELECTRON_DEV=true npx electron electron/main.js

# Rodar testes
python -m pytest tests/ -v

# Criar admin padrao (primeiro acesso sem UI)
python scripts/create_default_admin.py

# Gerar SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Ambiente de Desenvolvimento

- OS: Windows 11
- Python: 3.11+ (testado ate 3.13)
- Node.js: 20+
- Repo: `C:\Users\zegil\Documents\GitHub\AP_Controller`
- Branch principal: `feature/electron-migration`

## Referencias

- Estado completo do projeto: `docs/LUMINA_PROJECT_STATE.md`
- API docs: `docs/architecture/API_DOCUMENTATION.md`
- Arquitetura geral: `docs/architecture/ARQUITETURA_GERAL.md`
- Guia de uso diario: `docs/guides/GUIA_USO_DIARIO.md`
- Instrucoes Gemini: `GEMINI.md`
