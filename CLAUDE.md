# CLAUDE.md - Instrucoes para Agentes Claude

> Este arquivo e lido automaticamente por agentes Claude ao abrir o projeto.
> Para o plano completo e contexto compartilhado, leia `docs/PLANO_UNIVERSAL.md`.

## Projeto

**LUMINA v3.0.0** - Sistema de Gestao de Apartamentos para Airbnb/Booking.com
Migracao em andamento: Web App → Electron Desktop (Windows)

## Stack

- **Backend:** Python 3.11+, FastAPI 0.115+, SQLAlchemy 2.0, SQLite, Uvicorn
- **Frontend:** React 18, Vite 5, Axios, Recharts, Lucide-react
- **Desktop:** Electron (em implementacao), electron-builder, PyInstaller
- **Config:** Pydantic Settings via .env

## Estrutura de Diretorios

```
raiz/
  app/                    # Backend FastAPI (Python)
    api/v1/               # Auth, health endpoints
    core/                 # Calendar sync, conflict detection, backup
    database/             # SQLAlchemy connection, session
    middleware/           # Auth JWT, CSRF, security headers
    models/               # ORM models (User, Booking, Property, etc.)
    routers/              # Route handlers por dominio
    schemas/              # Pydantic request/response models
    services/             # Business logic layer
    telegram/             # Bot Telegram (opcional)
    templates/email/      # Templates HTML de email
    utils/                # Logger, date utils
  frontend/               # Frontend React
    src/
      components/         # Calendar, Sidebar, EventModal, ErrorBoundary
      pages/              # Dashboard, Calendar, Conflicts, Statistics, Documents, Emails, Notifications, Settings
      contexts/           # PropertyContext (multi-property ready)
      services/api.js     # Axios HTTP client (ARQUIVO CRITICO)
      utils/formatters.js # Date, currency formatting
  electron/               # Electron main process (A CRIAR)
  data/                   # Runtime: db, logs, backups, docs gerados
  templates/              # Templates DOCX para documentos
  docs/                   # Documentacao
```

## Arquivos Criticos

| Arquivo | Papel | Notas |
|---------|-------|-------|
| `app/main.py` | Entry point FastAPI, lifespan, middleware | Precisa: shutdown endpoint, relaxar rate limits para desktop |
| `app/config.py` | Pydantic Settings, carrega .env | Precisa: suportar LUMINA_ENV_FILE e LUMINA_DATA_DIR |
| `app/database/connection.py` | SQLAlchemy engine | DATABASE_URL deve vir de env var no modo desktop |
| `frontend/src/services/api.js` | Axios instance, todos os endpoints | Precisa: base URL dinamica para Electron |
| `frontend/vite.config.js` | Build config, proxy /api | Precisa: `base: './'` para Electron |
| `frontend/src/pages/Documents.jsx` | Download docs, confirm dialogs | Precisa: IPC para dialogos nativos |

## Convencoes de Codigo

### Python (Backend)
- Docstrings em portugues
- Type hints em todos os parametros e retornos
- Async para I/O (email, HTTP, file)
- Logger via `from app.utils.logger import get_logger; logger = get_logger(__name__)`
- Validacao via Pydantic schemas
- Erros nunca expoe detalhes ao cliente (global exception handler)
- Seguranca: validar inputs contra XSS, path traversal, SSTI (veja `app/core/validators.py`)

### JavaScript (Electron Main Process)
- CommonJS (`require`) para arquivos em `electron/`
- JSDoc para documentacao de funcoes
- `electron-log` para logging (nao console.log em producao)
- Preload scripts usam `contextBridge.exposeInMainWorld`
- NUNCA `nodeIntegration: true` - sempre via preload

### React (Frontend)
- Functional components com hooks
- State-based routing (sem React Router) em `App.jsx`
- CSS em arquivos separados por componente
- Deteccao Electron: `if (window.electronAPI) { ... }`

## Responsabilidades do Agente Claude na Migracao

### Fase 1: Scaffolding Electron
- [x] Criar `electron/main.js` (main process)
- [x] Criar `electron/preload.js` (context bridge)
- [x] Criar `electron/splash.html` (tela loading)
- [x] Criar `package.json` raiz
- [x] Criar `electron-builder.yml`

### Fase 2: Python Bundling
- [x] Criar `run_backend.py` (entry point PyInstaller)
- [x] Criar `lumina.spec` (config PyInstaller)
- [x] Criar `electron/python-manager.js` (gerenciador ciclo de vida)
- [x] Modificar `app/config.py` (suporte LUMINA_DATA_DIR, LUMINA_ENV_FILE)
- [x] Modificar `app/main.py` (shutdown endpoint, relaxar rate limits)

### Fase 4: IPC + Features Nativas
- [x] Criar `electron/ipc-handlers.js` (todos os handlers IPC)
- [x] Criar `electron/tray.js` (icone bandeja + menu)
- [x] Criar `electron/updater.js` (auto-update)

### Fase 5: Wizard
- [x] Criar `electron/wizard/wizard.html`
- [x] Criar `electron/wizard/wizard.js`
- [x] Criar `electron/wizard/wizard.css`
- [x] Criar `electron/wizard/wizard-preload.js`

## Regras de Commits

- Branch: `feature/electron-migration`
- Prefixos: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Mensagens em ingles
- Um commit por mudanca logica (nao commits gigantes)
- Nunca commitar: `.env`, `data/`, `python-dist/`, `release/`, `node_modules/`

## Comandos Uteis

```bash
# Backend (desenvolvimento)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (desenvolvimento)
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build

# Criar admin padrao
python scripts/create_default_admin.py

# Gerar SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Ambiente de Desenvolvimento

- OS: Windows 11
- Python: 3.11+
- Node.js: 20+
- Repo: `C:\Users\zegil\Documents\GitHub\AP_Controller`
- Worktree: `.claude\worktrees\mystifying-feistel`
- Branch: `claude/mystifying-feistel`

## Como Executar Tarefas

1. Abra `docs/PLANO_IMPLEMENTACAO.md`
2. Encontre suas tarefas (marcadas `[CLAUDE]`)
3. Execute na ordem (respeitar `[BLOQUEIO]` e `[PARALELO]`)
4. Cada tarefa tem: arquivo(s), o que fazer, e criterio de aceite
5. Commit apos cada tarefa completada (nao acumular)

## Referencias

- Plano de implementacao: `docs/PLANO_IMPLEMENTACAO.md`
- Plano completo: `docs/PLANO_UNIVERSAL.md`
- Instrucoes Gemini: `GEMINI.md`
- API docs: `docs/architecture/API_DOCUMENTATION.md`
- Arquitetura geral: `docs/architecture/ARQUITETURA_GERAL.md`
