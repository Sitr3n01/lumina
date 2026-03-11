# CLAUDE.md - Instrucoes para Agentes Claude

> Este arquivo e lido automaticamente por agentes Claude ao abrir o projeto.

## Projeto

**LUMINA A.0.1.0** - Sistema de Gestao de Apartamentos para Airbnb/Booking.com
Aplicativo Desktop Windows via Electron + Backend FastAPI embutido (PyInstaller).

## Status Atual

| Modulo | Status |
|--------|--------|
| MVP1 (Calendarios, Reservas, Conflitos, Estatisticas) | Completo |
| MVP2 (Documentos, Emails, Telegram, Notificacoes) | Completo |
| MVP3 (AI multi-provider, sugestoes de preco) | Completo |
| Migracao Electron Desktop | Completa |
| Auditoria de Seguranca (Partes 1+2+3) | Completa |
| Autenticacao Frontend (Login, AuthContext, JWT) | Completo |
| Testes automatizados (pytest, auth coverage) | Implementado |
| Release A.0.1.0 publicada | Completo |

**Nota de seguranca:** Score atual ~9.0/10.
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
    routers/              # bookings, conflicts, statistics, calendar, documents, emails, settings, notifications, ai
    schemas/              # Pydantic request/response models (auth.py tem _validate_password_strength)
    services/             # Business logic layer (14 services)
    telegram/             # Bot Telegram (opcional)
    templates/email/      # Templates HTML de email (Jinja2 SandboxedEnvironment)
    utils/                # Logger, date utils
    version.py            # Single source of truth para versao
  frontend/               # Frontend React
    src/
      components/         # Calendar, Sidebar (com logout+user), EventModal, ErrorBoundary
      pages/              # Login, Dashboard, Calendar, Conflicts, Statistics, Documents,
                          # Emails, Notifications, Settings, AISuggestions, CondoTemplate
      contexts/           # AuthContext (JWT, login/logout/register) + PropertyContext
      services/api.js     # Axios HTTP client com authAPI e Bearer token interceptor
      styles/global.css   # CSS design system
      utils/formatters.js
  electron/               # Electron main process
    main.js               # Entry point, will-navigate, wizard, splash, tray, auto-login
    preload.js            # Context bridge (window.electronAPI + window.wizardAPI)
    python-manager.js     # Gerencia processo Python
    ipc-handlers.js       # IPC handlers (incl. factoryReset completo)
    tray.js               # Bandeja do sistema (Windows: prioriza .ico)
    updater.js            # Auto-update GitHub Releases
    splash.html           # Tela de carregamento
    wizard/               # Wizard configuracao inicial (wizard.html, wizard.js, wizard.css)
  tests/                  # Testes pytest
    conftest.py           # Fixtures: db_session, client, admin_user, auth_headers
    test_auth_endpoints.py  # 16 testes de endpoints auth
    test_auth_middleware.py # 8 testes de middleware JWT + lockout
    test_platform_parser.py # Testes do parser de plataformas
  data/                   # Runtime: db, logs, backups, docs gerados (gitignored)
  templates/              # Templates DOCX (gitignored)
  docs/                   # Documentacao
  release/                # Instaladores gerados (gitignored)
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
| `electron/ipc-handlers.js` | IPC handlers (app:factoryReset, backend:*, dialog:*, update:*) |
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
- SEM Tailwind — usar apenas CSS modules e variaveis do design system

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
cross-env LUMINA_DESKTOP=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (desenvolvimento)
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build

# Electron (desenvolvimento) — requer backend + frontend ja rodando
cross-env ELECTRON_DEV=true LUMINA_DEV_BACKEND_PORT=8000 electron .

# Dev completo (backend + frontend + Electron via concurrently)
npm run dev

# Rodar testes
python -m pytest tests/ -v

# Criar admin padrao (primeiro acesso sem UI)
python scripts/create_default_admin.py

# Gerar SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Reset completo do estado de dev (apaga DB, .env, pending-admin.json)
scripts\reset_dev_state.bat

# Build do instalador Windows
BUILD.bat
```

## Ambiente de Desenvolvimento

- OS: Windows 11
- Python: 3.11+ (testado ate 3.13)
- Node.js: 20+
- Repo: `C:\Users\zegil\Documents\GitHub\AP_Controller`
- Branch principal: `feature/electron-migration`

## Arquitetura do Electron — Conceitos Criticos

### Dois Bancos de Dados (Dev vs Producao)

Em **dev** (`npm run dev:python` sem `DATABASE_URL`), o Python usa:
- `sqlite:///./data/sentinel.db` — relativo ao diretorio do projeto

Em **producao** (PythonManager injeta env vars), o Python usa:
- `sqlite:///userData/data/lumina.db` — em `%APPDATA%\lumina-desktop\`

Scripts como `reset_dev_state.bat` precisam limpar AMBOS.

### Fluxo Wizard → App (janela unica)

```
app.whenReady()
  ├─ isFirstRun()? → verifica .env em userData
  │   ├─ SIM: openWizard()
  │   │     wizard.html na mesma mainWindow
  │   │     wizard-done → startNormalApp()
  │   └─ NAO: startNormalApp() direto
  │
  startNormalApp():
  │   ├─ mainWindow ja existe? → loadFile(splash.html)
  │   │   NAO: createMainWindow() → splash.html
  │   ├─ PythonManager.start()
  │   ├─ polling health check
  │   ├─ pending-admin.json → POST /api/v1/auth/register
  │   │   └─ 403 (usuario ja existe)? → tenta login com as credenciais
  │   ├─ pending-template.pdf → backend
  │   └─ loadURL(React app) → AuthContext faz auto-login via getAutoLoginToken()
```

### Auto-Login Pos-Wizard

Apos wizard concluido, `startNormalApp()` registra o JWT em `autoLoginToken` (memoria Node.js).
O IPC handler `auth:getAutoLoginToken` retorna esse token ao React.
`AuthContext.jsx` chama `window.electronAPI.getAutoLoginToken()` via IPC diretamente
(nao via evento `backend:ready` — race condition corrigida).

### Factory Reset Completo

`app:factoryReset` (IPC em `ipc-handlers.js`) agora apaga:
1. `userData/.env`
2. `userData/data/lumina.db`
3. `userData/pending-admin.json`

Entao chama `app.relaunch() + app.exit(0)`.

### Tray Icon no Windows

`tray.js` prioriza `assets/tray-icon.ico` no Windows (PNG falha silenciosamente).
Fallback para PNG em outros sistemas.

### Wizard API no Preload

`electron/preload.js` expoe TANTO `window.electronAPI` (app principal)
QUANTO `window.wizardAPI` (wizard). O arquivo `wizard-preload.js` e
mantido para compatibilidade, mas o preload principal e suficiente.

## Armadilhas Conhecidas (Evitar)

### Register 403 em Testes Dev
Se `reset_dev_state.bat` nao limpar `data/sentinel.db` (banco dev),
o banco tera usuario antigo → `/register` retorna 403 → auto-login tenta
as credenciais do wizard — se forem as mesmas, funciona; se diferentes, precisa
de factory reset ou usar as credenciais originais.

### Rate Limiter Desabilitado em Desktop
`slowapi` desabilitado quando `LUMINA_DESKTOP=true` ou `APP_ENV=test`.
Em dev, o env var `LUMINA_DESKTOP=true` (setado por `dev:python`) desabilita rate limits.

### LUMINA_DESKTOP Obrigatorio
`app/main.py` linha ~36 para o processo com CRITICAL log se `LUMINA_DESKTOP != 'true'`
e `APP_ENV != 'test'`. Sempre setar via `cross-env LUMINA_DESKTOP=true`.

### validate_username Lowercase
`UserCreate` em `app/schemas/auth.py` possui validator que faz `.lower()` no username.
Nomes como "Admin" sao salvos como "admin" no banco.

### extra: "forbid" em UserCreate
`UserCreate.model_config = {"extra": "forbid"}` — body do registro nao pode ter campos extras.
Apenas: `email`, `username`, `password`, `full_name`.

### Proxy Vite vs Electron Renderer
Em dev web, `vite.config.js` proxeia `/api/*` para `127.0.0.1:8000`.
Em Electron renderer, `api.js` sobrescreve `config.baseURL` via `getBackendUrl()` IPC —
o proxy do Vite nao e usado; a URL e a do backend embutido.

## Referencias

- Estado completo do projeto: `docs/LUMINA_PROJECT_STATE.md`
- API docs: `docs/architecture/API_DOCUMENTATION.md`
- Arquitetura geral: `docs/architecture/ARQUITETURA_GERAL.md`
- Guia de uso diario: `docs/guides/GUIA_USO_DIARIO.md`
- Setup de desenvolvimento: `DEV_SETUP.md`
