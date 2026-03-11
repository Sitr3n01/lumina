<div align="center">

# LUMINA

### Sistema de Gestao de Apartamentos para Airbnb e Booking.com

**Aplicativo Desktop Windows · Alpha A.0.1.0**

[![Release](https://img.shields.io/github/v/release/Sitr3n01/AP_Controller?label=release&color=blue)](https://github.com/Sitr3n01/AP_Controller/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](https://github.com/Sitr3n01/AP_Controller/releases)
[![Python](https://img.shields.io/badge/python-3.11%2B-yellow)](https://www.python.org/)
[![Electron](https://img.shields.io/badge/electron-29-47848F)](https://www.electronjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## O que e o LUMINA?

LUMINA e um aplicativo desktop **all-in-one** para proprietarios de imoveis no Airbnb e Booking.com. Ele sincroniza automaticamente seus calendarios, detecta conflitos de reservas entre plataformas, gera documentos de autorizacao de condominio, envia notificacoes por Telegram e e-mail, e exibe um dashboard com ocupacao e receita — tudo rodando **localmente** no seu computador, sem servidores externos.

**Para quem e:** Proprietarios individuais ou pequenos gestores que precisam controlar reservas em multiplas plataformas sem cruzar planilhas manualmente.

---

## Funcionalidades

| Modulo | Descricao |
|--------|-----------|
| Calendario | Sincronizacao automatica via iCal (Airbnb + Booking.com) a cada 30 minutos |
| Conflitos | Deteccao automatica de sobreposicoes entre plataformas com resolucao manual |
| Dashboard | Visao geral com ocupacao mensal, receita, proximos check-ins e alertas |
| Documentos | Geracao de autorizacao de condominio em `.docx` com logo personalizado |
| E-mail | Confirmacao de reservas e lembretes de check-in automaticos (Gmail, Outlook, Yahoo) |
| Telegram | Notificacoes em tempo real e aprovacao de reservas via bot |
| Inteligencia Artificial | Sugestoes de precificacao e assistente de chat via Anthropic Claude / OpenAI |
| Notificacoes | Central de alertas persistida com polling do system tray |
| Configuracoes | Painel completo com edicao via UI (sem precisar editar arquivos de configuracao) |

---

## Download e Instalacao

### Para Usuarios (Windows 10/11)

1. Acesse a pagina de [**Releases**](https://github.com/Sitr3n01/AP_Controller/releases)
2. Baixe o arquivo `LUMINA-Setup-A.0.1.0.exe`
3. Execute o instalador e siga as instrucoes
4. Na primeira execucao, o **Wizard de Configuracao** abrira automaticamente para:
   - Criar sua conta de administrador
   - Configurar os dados do imovel e condominio
   - Inserir URLs iCal do Airbnb e Booking.com
   - Configurar e-mail e Telegram (opcionais)
   - Definir o provedor de IA (opcional)

> **Nota:** O LUMINA e um aplicativo desktop autossuficiente. O backend Python roda localmente — nao ha servidores externos envolvidos.

---

## Arquitetura

LUMINA e composto por tres camadas integradas:

```
+-------------------------------------------------------------+
|                       ELECTRON SHELL                        |
|  main.js -> gerencia ciclo de vida, splash, wizard, tray    |
|  PythonManager -> spawn + health check + crash recovery     |
|  preload.js -> contextBridge (window.electronAPI)           |
|  ipc-handlers.js -> IPC: dialogs, updates, factory reset    |
+-------------------------------------------------------------+
|                   FRONTEND (React 18 + Vite)                |
|  10 paginas, state-based routing em App.jsx                 |
|  AuthContext (JWT) + PropertyContext                        |
|  Axios HTTP client com interceptors de auth (api.js)        |
+-------------------------------------------------------------+
|                  BACKEND (FastAPI + SQLAlchemy)              |
|  REST API com ~45 endpoints em 11 routers                   |
|  JWT auth (BCrypt + blacklist server-side) + slowapi        |
|  SQLite database, background tasks assincronas              |
|  iCal sync, geracao de .docx, SMTP/IMAP, Telegram bot      |
|  AI multi-provider (Anthropic / OpenAI / compativeis)       |
+-------------------------------------------------------------+
```

### Estrutura de Diretorios

```
AP_Controller/
  app/                      # Backend FastAPI (Python)
    api/v1/                 # Endpoints: auth, health
    core/                   # iCal sync, conflict detection, security, backup
    database/               # Conexao SQLAlchemy, sessoes
    middleware/             # JWT, CSRF, security headers
    models/                 # ORM: User, Booking, Property, Guest, BookingConflict...
    routers/                # 11 routers: bookings, calendar, conflicts, statistics,
    |                       #   documents, emails, settings, notifications, ai, sync-actions
    schemas/                # Pydantic: request/response models + validacao de senha
    services/               # 14 services: business logic desacoplada
    telegram/               # Bot Telegram + NotificationService
    templates/email/        # Templates HTML de e-mail (Jinja2 SandboxedEnvironment)
  frontend/                 # Frontend React 18 + Vite 5
    src/
      components/           # Calendar, Sidebar, EventModal, ErrorBoundary
      contexts/             # AuthContext (JWT), PropertyContext
      pages/                # 10 paginas: Dashboard, Calendar, Conflicts, Statistics,
      |                     #   Documents, Emails, Notifications, AISuggestions, Settings...
      services/api.js       # Axios client com Bearer interceptor
      styles/global.css     # Design system com variaveis CSS
  electron/                 # Electron (main process)
    main.js                 # Entry point: splash, wizard, tray, auto-login
    preload.js              # contextBridge (electronAPI + wizardAPI)
    python-manager.js       # Spawn + health check + crash recovery do Python
    ipc-handlers.js         # IPC: sistema, updates, factory reset
    tray.js                 # Icone da bandeja do Windows
    updater.js              # Auto-update via GitHub Releases
    wizard/                 # Wizard de configuracao inicial (HTML/JS/CSS standalone)
  tests/                    # Testes pytest (SQLite in-memory)
    conftest.py             # Fixtures: db_session, client, admin_user, auth_headers
    test_auth_endpoints.py
    test_auth_middleware.py
    test_platform_parser.py
  docs/                     # Documentacao tecnica
```

---

## API REST

O backend expoe ~45 endpoints REST organizados em 11 routers:

| Prefixo | Modulo | Descricao |
|---------|--------|-----------|
| `/api/v1/auth` | Autenticacao | Login, logout, change-password, me, register |
| `/api/bookings` | Reservas | CRUD completo, upload manual, filtros |
| `/api/calendar` | Calendario | Eventos, sync manual, sync-status, sources |
| `/api/conflicts` | Conflitos | Lista, resumo, resolucao, detect |
| `/api/statistics` | Estatisticas | Dashboard, ocupacao, receita, plataformas, relatorio mensal |
| `/api/sync-actions` | Sync Actions | Fila de acoes pendentes, mark-done, dismiss |
| `/api/v1/documents` | Documentos | Gerar .docx, download, delete, analyze-template |
| `/api/v1/emails` | E-mail | Send, templates, confirmacao de reserva, lembretes bulk, IMAP fetch |
| `/api/v1/settings` | Configuracoes | GET, PUT, POST /reset |
| `/api/v1/notifications` | Notificacoes | Lista, resumo, mark-read, mark-all-read |
| `/api/v1/ai` | Inteligencia Artificial | Chat, price-suggestions, test, settings |

**Swagger UI** disponivel em `http://127.0.0.1:<porta>/docs` com o backend rodando.

Documentacao completa: [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md)

---

## Seguranca

O LUMINA passou por auditoria completa de seguranca (Score: ~9.0/10 em 03/2026).

| Medida | Status |
|--------|--------|
| JWT com blacklist server-side | Implementado |
| Account lockout (5 tentativas, 15 min bloqueio) | Implementado |
| Bcrypt para senhas | Implementado |
| Rate limiting via slowapi | Implementado |
| CSRF protection middleware | Implementado |
| Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) | Implementado |
| Validacao de inputs (XSS, path traversal, SSTI) | Implementado |
| Jinja2 SandboxedEnvironment em templates | Implementado |
| Protecao IDOR em endpoints de documentos | Implementado |
| Registro invite-only (unico usuario admin) | Implementado |
| `nodeIntegration: false` + `contextIsolation: true` no Electron | Implementado |
| `will-navigate` bloqueado para prevenir navegacao externa | Implementado |

---

## Stack Tecnologico

| Camada | Tecnologia |
|--------|-----------|
| Desktop Shell | Electron 29, electron-builder |
| Backend | Python 3.11+, FastAPI 0.115+, SQLAlchemy 2.0, SQLite |
| Frontend | React 18, Vite 5, Axios, Recharts, Lucide React |
| Autenticacao | JWT (HS256) + blacklist in-memory + Bcrypt |
| E-mail | aiosmtplib + aioimaplib, Jinja2 SandboxedEnvironment |
| Calendario | icalendar + parsing customizado por plataforma |
| Documentos | python-docx |
| AI | Anthropic Claude, OpenAI, providers compativeis |
| Telegram | pyTelegramBotAPI |
| Distribuicao | PyInstaller (backend), electron-builder (instalador .exe) |
| Testes | pytest, TestClient (FastAPI), SQLite in-memory |

---

## Pre-requisitos de Desenvolvimento

| Ferramenta | Versao minima |
|-----------|--------------|
| Windows | 10 / 11 |
| Python | 3.11+ |
| Node.js | 20+ |
| Git | Qualquer versao recente |

---

## Setup para Desenvolvimento

```bash
# 1. Clonar o repositorio
git clone https://github.com/Sitr3n01/AP_Controller.git
cd AP_Controller

# 2. Criar e ativar ambiente virtual Python
python -m venv venv
venv\Scripts\activate

# 3. Instalar dependencias Python
pip install -r requirements.txt

# 4. Instalar dependencias Node.js (raiz + frontend)
npm install
cd frontend && npm install && cd ..

# 5. Criar arquivo de configuracao
copy .env.example .env
# Edite o .env com seus dados (SECRET_KEY, credenciais de e-mail, iCal URLs, etc.)

# 6. Iniciar em modo desenvolvimento (backend + frontend + Electron)
npm run dev
```

O script `npm run dev` inicia o backend Python, o servidor Vite (frontend), e o Electron em paralelo, aguardando que cada um fique pronto antes de iniciar o proximo.

### Comandos Individuais

```bash
# Backend (com hot-reload)
cross-env LUMINA_DESKTOP=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (dev server)
cd frontend && npm run dev

# Electron (apos backend e frontend ja rodando)
cross-env ELECTRON_DEV=true LUMINA_DEV_BACKEND_PORT=8000 electron .

# Rodar todos os testes
python -m pytest tests/ -v

# Build do instalador Windows
BUILD.bat

# Resetar estado de desenvolvimento (apaga DB, .env, pending-admin)
scripts\reset_dev_state.bat
```

---

## Configuracao (.env)

O arquivo `.env` e gerado automaticamente pelo Wizard na primeira execucao. Para desenvolvimento, crie um `.env` baseado no exemplo:

| Variavel | Descricao | Obrigatorio |
|----------|-----------|------------|
| `APP_ENV` | `development` / `production` / `test` | Sim |
| `SECRET_KEY` | Chave JWT (minimo 32 caracteres) | Sim |
| `LUMINA_DESKTOP` | Deve ser `true` para executar o backend | Sim |
| `PROPERTY_NAME` | Nome do imovel | Sim |
| `PROPERTY_ADDRESS` | Endereco completo | Sim |
| `CONDO_NAME` | Nome do condominio | Sim |
| `OWNER_NAME` | Nome do proprietario | Sim |
| `AIRBNB_ICAL_URL` | URL iCal do Airbnb | Para sincronizacao |
| `BOOKING_ICAL_URL` | URL iCal do Booking.com | Para sincronizacao |
| `EMAIL_PROVIDER` | `gmail` / `outlook` / `yahoo` / `custom` | Para e-mails |
| `EMAIL_FROM` | Endereco de e-mail de envio | Para e-mails |
| `EMAIL_PASSWORD` | Senha do e-mail (App Password) | Para e-mails |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram | Para Telegram |
| `TELEGRAM_ADMIN_USER_IDS` | IDs dos admins Telegram (separados por virgula) | Para Telegram |

Gerar `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Testes

```bash
# Rodar todos os testes
python -m pytest tests/ -v

# Rodar com saida detalhada
python -m pytest tests/ -v --tb=short
```

Cobertura atual: 35 testes (34 passando). Os testes cobrem:
- Endpoints de autenticacao (login, register, logout, change-password, delete-account)
- Middleware JWT (validacao de token, account lockout, blacklist)
- Parser de plataformas de reservas

---

## Roadmap

Veja [`IMPROVEMENTS.md`](IMPROVEMENTS.md) para o roadmap completo.

| Versao | Foco |
|--------|------|
| **A.0.1.0** (atual) | Release inicial — todas as funcionalidades core |
| **A.0.2.0** | Otimizacoes de UX, multi-propriedade, testes E2E |
| **A.0.3.0** | Integracao Gmail API, importacao de historico, exportacao |
| **Beta** | Cobertura de testes 80%+, CI/CD, code signing |

Nota geral do projeto (auditoria 03/2026): 7.9 / 10

---

## Contribuindo

Contribuicoes sao bem-vindas.

1. Fork o repositorio
2. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
3. Siga as convencoes do projeto descritas em [`CLAUDE.md`](CLAUDE.md)
4. Escreva testes para sua mudanca quando aplicavel
5. Abra um Pull Request para a branch `feature/electron-migration`

Bugs, sugestoes e pedidos de feature: [Issues](https://github.com/Sitr3n01/AP_Controller/issues)

---

## Documentacao

| Documento | Descricao |
|-----------|-----------|
| [`DEV_SETUP.md`](DEV_SETUP.md) | Guia completo de setup para desenvolvimento |
| [`docs/LUMINA_PROJECT_STATE.md`](docs/LUMINA_PROJECT_STATE.md) | Estado completo do projeto, arquitetura, modulos |
| [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md) | Documentacao completa da API REST |
| [`docs/architecture/ARQUITETURA_GERAL.md`](docs/architecture/ARQUITETURA_GERAL.md) | Decisoes de arquitetura e diagramas |
| [`docs/guides/GUIA_USO_DIARIO.md`](docs/guides/GUIA_USO_DIARIO.md) | Guia de uso diario para usuarios finais |
| [`IMPROVEMENTS.md`](IMPROVEMENTS.md) | Roadmap e melhorias planejadas |
| [`CLAUDE.md`](CLAUDE.md) | Instrucoes para agentes de IA (manutencao do codigo) |

---

## Licenca

MIT License. Veja [`LICENSE`](LICENSE) para detalhes.
