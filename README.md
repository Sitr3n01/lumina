<div align="center">

# LUMINA

### Sistema de Gestão de Apartamentos para Airbnb e Booking.com

**Aplicativo Desktop Windows · Alpha A.0.1.0**

[![Release](https://img.shields.io/github/v/release/Sitr3n01/AP_Controller?label=release&color=blue)](https://github.com/Sitr3n01/AP_Controller/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](https://github.com/Sitr3n01/AP_Controller/releases)
[![Python](https://img.shields.io/badge/python-3.11%2B-yellow)](https://www.python.org/)
[![Electron](https://img.shields.io/badge/electron-29-47848F)](https://www.electronjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## O que é o LUMINA?

LUMINA é um aplicativo desktop **all-in-one** para proprietários de imóveis no Airbnb e Booking.com. Ele sincroniza automaticamente seus calendários, detecta conflitos de reservas entre plataformas, gera documentos de autorização de condomínio, envia notificações por Telegram e e-mail, e exibe um dashboard com ocupação e receita — tudo rodando **localmente** no seu computador, sem servidores externos.

**Para quem é:** Proprietários individuais ou pequenos gestores que precisam controlar reservas em múltiplas plataformas sem cruzar planilhas manualmente.

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 📅 **Calendário** | Sincronização automática via iCal (Airbnb + Booking.com) a cada 30 minutos |
| ⚠️ **Conflitos** | Detecção automática de sobreposições entre plataformas com resolução manual |
| 📊 **Dashboard** | Visão geral com ocupação mensal, receita, próximos check-ins e alertas |
| 📄 **Documentos** | Geração de autorização de condomínio em `.docx` com logo personalizado |
| ✉️ **E-mail** | Confirmação de reservas e lembretes de check-in automáticos (Gmail, Outlook, Yahoo) |
| 🤖 **Telegram** | Notificações em tempo real e aprovação de reservas via bot |
| 🧠 **Inteligência Artificial** | Sugestões de precificação e assistente de chat via Anthropic Claude / OpenAI |
| 🔔 **Notificações** | Central de alertas persistida com polling do system tray |
| ⚙️ **Configurações** | Painel completo com edição via UI (sem precisar editar arquivos de configuração) |

---

## Download e Instalação

### Para Usuários (Windows 10/11)

1. Acesse a página de [**Releases**](https://github.com/Sitr3n01/AP_Controller/releases)
2. Baixe o arquivo `LUMINA-Setup-A.0.1.0.exe`
3. Execute o instalador e siga as instruções
4. Na primeira execução, o **Wizard de Configuração** abrirá automaticamente para:
   - Criar sua conta de administrador
   - Configurar os dados do imóvel e condomínio
   - Inserir URLs iCal do Airbnb e Booking.com
   - Configurar e-mail e Telegram (opcionais)
   - Definir o provedor de IA (opcional)

> **Nota:** O LUMINA é um aplicativo desktop autossuficiente. O backend Python roda localmente — não há servidores externos envolvidos.

---

## Arquitetura

LUMINA é composto por três camadas integradas:

```
┌─────────────────────────────────────────────────────────────┐
│                       ELECTRON SHELL                         │
│  main.js → gerencia ciclo de vida, splash, wizard, tray      │
│  PythonManager → spawn + health check + crash recovery       │
│  preload.js → contextBridge (window.electronAPI)             │
│  ipc-handlers.js → IPC: dialogs, updates, factory reset      │
├─────────────────────────────────────────────────────────────┤
│                   FRONTEND (React 18 + Vite)                  │
│  10 páginas, state-based routing em App.jsx                   │
│  AuthContext (JWT) + PropertyContext                          │
│  Axios HTTP client com interceptors de auth (api.js)          │
├─────────────────────────────────────────────────────────────┤
│                  BACKEND (FastAPI + SQLAlchemy)               │
│  REST API com ~45 endpoints em 11 routers                     │
│  JWT auth (BCrypt + blacklist server-side) + slowapi          │
│  SQLite database, background tasks assíncronas                │
│  iCal sync, geração de .docx, SMTP/IMAP, Telegram bot        │
│  AI multi-provider (Anthropic / OpenAI / compatíveis)         │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Diretórios

```
AP_Controller/
├── app/                      # Backend FastAPI (Python)
│   ├── api/v1/               # Endpoints: auth, health
│   ├── core/                 # iCal sync, conflict detection, security, backup
│   ├── database/             # Conexão SQLAlchemy, sessões
│   ├── middleware/           # JWT, CSRF, security headers
│   ├── models/               # ORM: User, Booking, Property, Guest, BookingConflict...
│   ├── routers/              # 11 routers: bookings, calendar, conflicts, statistics,
│   │                         #   documents, emails, settings, notifications, ai, sync-actions
│   ├── schemas/              # Pydantic: request/response models + validação de senha
│   ├── services/             # 14 services: business logic desacoplada
│   ├── telegram/             # Bot Telegram + NotificationService
│   └── templates/email/      # Templates HTML de e-mail (Jinja2 SandboxedEnvironment)
├── frontend/                 # Frontend React 18 + Vite 5
│   └── src/
│       ├── components/       # Calendar, Sidebar, EventModal, ErrorBoundary
│       ├── contexts/         # AuthContext (JWT), PropertyContext
│       ├── pages/            # 10 páginas: Dashboard, Calendar, Conflicts, Statistics,
│       │                     #   Documents, Emails, Notifications, AISuggestions, Settings...
│       ├── services/api.js   # Axios client com Bearer interceptor
│       └── styles/global.css # Design system com variáveis CSS
├── electron/                 # Electron (main process)
│   ├── main.js               # Entry point: splash, wizard, tray, auto-login
│   ├── preload.js            # contextBridge (electronAPI + wizardAPI)
│   ├── python-manager.js     # Spawn + health check + crash recovery do Python
│   ├── ipc-handlers.js       # IPC: sistema, updates, factory reset
│   ├── tray.js               # Ícone da bandeja do Windows
│   ├── updater.js            # Auto-update via GitHub Releases
│   └── wizard/               # Wizard de configuração inicial (HTML/JS/CSS standalone)
├── tests/                    # Testes pytest (SQLite in-memory)
│   ├── conftest.py           # Fixtures: db_session, client, admin_user, auth_headers
│   ├── test_auth_endpoints.py
│   ├── test_auth_middleware.py
│   └── test_platform_parser.py
└── docs/                     # Documentação técnica
```

---

## API REST

O backend expõe ~45 endpoints REST organizados em 11 routers:

| Prefixo | Módulo | Descrição |
|---------|--------|-----------|
| `/api/v1/auth` | Autenticação | Login, logout, change-password, me, register |
| `/api/bookings` | Reservas | CRUD completo, upload manual, filtros |
| `/api/calendar` | Calendário | Eventos, sync manual, sync-status, sources |
| `/api/conflicts` | Conflitos | Lista, resumo, resolução, detect |
| `/api/statistics` | Estatísticas | Dashboard, ocupação, receita, plataformas, relatório mensal |
| `/api/sync-actions` | Sync Actions | Fila de ações pendentes, mark-done, dismiss |
| `/api/v1/documents` | Documentos | Gerar .docx, download, delete, analyze-template |
| `/api/v1/emails` | E-mail | Send, templates, confirmação de reserva, lembretes bulk, IMAP fetch |
| `/api/v1/settings` | Configurações | GET, PUT, POST /reset |
| `/api/v1/notifications` | Notificações | Lista, resumo, mark-read, mark-all-read |
| `/api/v1/ai` | Inteligência Artificial | Chat, price-suggestions, test, settings |

**Swagger UI** disponível em `http://127.0.0.1:<porta>/docs` com o backend rodando.

Documentação completa: [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md)

---

## Segurança

O LUMINA passou por auditoria completa de segurança (Score: ~9.0/10 em 03/2026).

| Medida | Status |
|--------|--------|
| JWT com blacklist server-side | ✅ |
| Account lockout (5 tentativas → 15 min bloqueio) | ✅ |
| Bcrypt para senhas | ✅ |
| Rate limiting via slowapi (desabilitado em desktop/localhost) | ✅ |
| CSRF protection middleware | ✅ |
| Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) | ✅ |
| Validação de inputs (XSS, path traversal, SSTI) | ✅ |
| Jinja2 SandboxedEnvironment em templates | ✅ |
| Proteção IDOR em endpoints de documentos | ✅ |
| Registro invite-only (apenas 1 usuário admin) | ✅ |
| `nodeIntegration: false` + `contextIsolation: true` no Electron | ✅ |
| `will-navigate` bloqueado para prevenir navegação externa | ✅ |

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Desktop Shell** | [Electron 29](https://electronjs.org/), [electron-builder](https://www.electron.build/) |
| **Backend** | [Python 3.11+](https://python.org/), [FastAPI 0.115+](https://fastapi.tiangolo.com/), [SQLAlchemy 2.0](https://sqlalchemy.org/), SQLite |
| **Frontend** | [React 18](https://react.dev/), [Vite 5](https://vitejs.dev/), [Axios](https://axios-http.com/), [Recharts](https://recharts.org/), [Lucide React](https://lucide.dev/) |
| **Autenticação** | JWT (HS256) + blacklist in-memory + [Bcrypt](https://passlib.readthedocs.io/) |
| **E-mail** | [aiosmtplib](https://aiosmtplib.readthedocs.io/) + [aioimaplib](https://github.com/bamthomas/aioimaplib), Jinja2 SandboxedEnvironment |
| **Calendário** | [icalendar](https://icalendar.readthedocs.io/) + parsing customizado por plataforma |
| **Documentos** | [python-docx](https://python-docx.readthedocs.io/) |
| **AI** | [Anthropic Claude](https://anthropic.com/), [OpenAI](https://openai.com/), providers compatíveis |
| **Telegram** | [pyTelegramBotAPI](https://github.com/eternnoir/pyTelegramBotAPI) |
| **Distribuição** | [PyInstaller](https://pyinstaller.org/) (backend), [electron-builder](https://electron.build/) (instalador .exe) |
| **Testes** | [pytest](https://pytest.org/), TestClient (FastAPI), SQLite in-memory |

---

## Pré-requisitos de Desenvolvimento

| Ferramenta | Versão mínima |
|-----------|--------------|
| Windows | 10 / 11 |
| Python | 3.11+ |
| Node.js | 20+ |
| Git | Qualquer versão recente |

---

## Setup para Desenvolvimento

```bash
# 1. Clonar o repositório
git clone https://github.com/Sitr3n01/AP_Controller.git
cd AP_Controller

# 2. Criar e ativar ambiente virtual Python
python -m venv venv
venv\Scripts\activate

# 3. Instalar dependências Python
pip install -r requirements.txt

# 4. Instalar dependências Node.js (raiz + frontend)
npm install
cd frontend && npm install && cd ..

# 5. Criar arquivo de configuração
copy .env.example .env
# Edite o .env com seus dados (SECRET_KEY, credenciais de e-mail, iCal URLs, etc.)

# 6. Iniciar em modo desenvolvimento (backend + frontend + Electron)
npm run dev
```

> O script `npm run dev` inicia o backend Python, o servidor Vite (frontend), e o Electron em paralelo, aguardando que cada um fique pronto antes de iniciar o próximo.

### Comandos Individuais

```bash
# Backend (com hot-reload)
cross-env LUMINA_DESKTOP=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (dev server)
cd frontend && npm run dev

# Electron (após backend e frontend já rodando)
cross-env ELECTRON_DEV=true LUMINA_DEV_BACKEND_PORT=8000 electron .

# Rodar todos os testes
python -m pytest tests/ -v

# Build do instalador Windows
BUILD.bat

# Resetar estado de desenvolvimento (apaga DB, .env, pending-admin)
scripts\reset_dev_state.bat
```

---

## Configuração (.env)

O arquivo `.env` é gerado automaticamente pelo Wizard na primeira execução. Para desenvolvimento, crie um `.env` baseado no exemplo:

| Variável | Descrição | Obrigatório |
|----------|-----------|------------|
| `APP_ENV` | `development` / `production` / `test` | Sim |
| `SECRET_KEY` | Chave JWT (mínimo 32 caracteres) | Sim |
| `LUMINA_DESKTOP` | Deve ser `true` para executar o backend | Sim |
| `PROPERTY_NAME` | Nome do imóvel | Sim |
| `PROPERTY_ADDRESS` | Endereço completo | Sim |
| `CONDO_NAME` | Nome do condomínio | Sim |
| `OWNER_NAME` | Nome do proprietário | Sim |
| `AIRBNB_ICAL_URL` | URL iCal do Airbnb | Para sincronização |
| `BOOKING_ICAL_URL` | URL iCal do Booking.com | Para sincronização |
| `EMAIL_PROVIDER` | `gmail` / `outlook` / `yahoo` / `custom` | Para e-mails |
| `EMAIL_FROM` | Endereço de e-mail de envio | Para e-mails |
| `EMAIL_PASSWORD` | Senha do e-mail (App Password) | Para e-mails |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram | Para Telegram |
| `TELEGRAM_ADMIN_USER_IDS` | IDs dos admins Telegram (separados por vírgula) | Para Telegram |

Gerar `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Testes

```bash
# Rodar todos os testes
python -m pytest tests/ -v

# Rodar com cobertura
python -m pytest tests/ -v --tb=short
```

**Cobertura atual:** 35 testes (34 passando). Os testes cobrem:
- Endpoints de autenticação (login, register, logout, change-password, delete-account)
- Middleware JWT (validação de token, account lockout, blacklist)
- Parser de plataformas de reservas

---

## Roadmap

Veja [`IMPROVEMENTS.md`](IMPROVEMENTS.md) para o roadmap completo. Resumo:

| Versão | Foco |
|--------|------|
| **A.0.1.0** (atual) | Release inicial — todas as funcionalidades core |
| **A.0.2.0** | Otimizações de UX, multi-propriedade, testes E2E |
| **A.0.3.0** | Integração Gmail API, importação de histórico, exportação |
| **Beta** | Cobertura de testes 80%+, CI/CD, sign code signing |

**Nota geral do projeto (auditoria 03/2026): 7.9 / 10**

---

## Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do repositório
2. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
3. Siga as convenções do projeto descritas em [`CLAUDE.md`](CLAUDE.md)
4. Escreva testes para sua mudança quando aplicável
5. Abra um Pull Request para a branch `feature/electron-migration`

Bugs, sugestões e pedidos de feature: [Issues](https://github.com/Sitr3n01/AP_Controller/issues)

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [`DEV_SETUP.md`](DEV_SETUP.md) | Guia completo de setup para desenvolvimento |
| [`docs/LUMINA_PROJECT_STATE.md`](docs/LUMINA_PROJECT_STATE.md) | Estado completo do projeto, arquitetura, módulos |
| [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md) | Documentação completa da API REST |
| [`docs/architecture/ARQUITETURA_GERAL.md`](docs/architecture/ARQUITETURA_GERAL.md) | Decisões de arquitetura e diagramas |
| [`docs/guides/GUIA_USO_DIARIO.md`](docs/guides/GUIA_USO_DIARIO.md) | Guia de uso diário para usuários finais |
| [`IMPROVEMENTS.md`](IMPROVEMENTS.md) | Roadmap e melhorias planejadas |
| [`CLAUDE.md`](CLAUDE.md) | Instruções para agentes de IA (manutenção do código) |

---

## Licença

Este projeto está licenciado sob a **MIT License** — veja o arquivo [`LICENSE`](LICENSE) para detalhes.

---

<div align="center">

Feito com ☕ para simplificar a gestão de imóveis por temporada.

</div>
