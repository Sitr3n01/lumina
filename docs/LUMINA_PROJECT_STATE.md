# LUMINA v3.0.0 - Documentacao Completa do Estado do Projeto

> Gerado em: 20/02/2026
> Branch: `feature/electron-migration`
> Versao: 3.0.0 (Desktop Electron)

---

## 1. Visao Geral

**LUMINA** e um sistema de gestao de apartamentos para hosts de Airbnb e Booking.com.
Originalmente uma aplicacao web (FastAPI + React), foi migrado para um aplicativo
desktop Windows usando Electron, com o backend Python embutido via PyInstaller.

### Numeros do Projeto

| Metrica | Valor |
|---------|-------|
| Backend Python | ~11.750 linhas |
| Frontend React | ~7.500 linhas |
| Electron Desktop | ~3.180 linhas |
| **Total** | **~22.430 linhas** |
| Modelos ORM | 11 |
| Routers API | 9 |
| Services | 11 |
| Paginas Frontend | 8 |
| Componentes Compartilhados | 4 |

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────┐
│                  ELECTRON SHELL                  │
│  main.js → PythonManager → Backend FastAPI       │
│  preload.js → contextBridge → window.electronAPI │
│  tray.js, updater.js, ipc-handlers.js            │
├─────────────────────────────────────────────────┤
│              FRONTEND (React 18 + Vite)          │
│  8 paginas, state-based routing (App.jsx)        │
│  Axios HTTP client → /api/v1/*                   │
├─────────────────────────────────────────────────┤
│              BACKEND (FastAPI + SQLAlchemy)       │
│  REST API, JWT auth, rate limiting               │
│  SQLite database, background tasks               │
│  Calendar sync, document generation, email       │
└─────────────────────────────────────────────────┘
```

### Fluxo de Inicializacao (Desktop)

1. Electron inicia → exibe `splash.html`
2. Verifica se e primeira execucao → se sim, abre Wizard de configuracao
3. Wizard coleta: dados do proprietario, imovel, iCal URLs, email SMTP/IMAP, Telegram
4. Wizard gera arquivo `.env` no `userData` do Electron
5. `PythonManager` inicia o backend Python em porta aleatoria
6. Health check polling ate backend responder (`/health`)
7. Frontend carrega em `BrowserWindow` com `file://` (dist pre-compilado)
8. `api.js` detecta Electron e usa porta dinamica via `window.electronAPI.getBackendUrl()`

### Fluxo de Inicializacao (Web - Legacy)

1. `uvicorn app.main:app` sobe o FastAPI na porta 8000
2. Frontend servido por Vite dev server (porta 5173) com proxy para `/api`
3. Ou frontend compilado servido por nginx em producao

---

## 3. Stack Tecnologica

### Backend
| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.115+ | Framework web |
| SQLAlchemy | 2.0 | ORM |
| SQLite | 3 | Banco de dados |
| Uvicorn | 0.32+ | ASGI server |
| Pydantic | 2.10+ | Validacao de dados |
| python-jose | 3.3+ | JWT tokens |
| passlib + bcrypt | 1.7+ | Hashing de senhas |
| slowapi | 0.1+ | Rate limiting |
| httpx | 0.28+ | HTTP client (calendar sync) |
| icalendar | 6.1+ | Parsing de calendarios iCal |
| python-docx / docxtpl | 1.1+ / 0.18+ | Geracao de documentos DOCX |
| aiosmtplib / aioimaplib | 3.0+ / 1.0+ | Email SMTP/IMAP async |
| python-telegram-bot | 21.0+ | Bot Telegram |
| Jinja2 | 3.1+ | Templates de email HTML |
| loguru | 0.7+ | Logging |
| redis | 5.0+ | Token blacklist (opcional) |

### Frontend
| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| React | 18 | UI framework |
| Vite | 5 | Build tool |
| Axios | - | HTTP client |
| Recharts | - | Graficos e estatisticas |
| Lucide React | - | Icones |

### Desktop
| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| Electron | 28+ | Shell desktop |
| electron-builder | 24+ | Empacotamento e instalador |
| electron-updater | 6.1+ | Auto-update via GitHub Releases |
| electron-log | 5.1+ | Logging estruturado |
| PyInstaller | - | Bundling do Python backend |

---

## 4. Estrutura de Diretorios

```
AP_Controller/
├── app/                          # Backend FastAPI
│   ├── api/v1/                   # Auth + Health endpoints
│   │   ├── auth.py               # Login, registro, logout, delete-account
│   │   └── health.py             # Health check, metrics, info
│   ├── core/                     # Logica central
│   │   ├── backup.py             # Backup automatico do SQLite
│   │   ├── calendar_sync.py      # Sincronizacao de calendarios iCal
│   │   ├── conflict_detection.py # Deteccao de conflitos de reservas
│   │   ├── token_blacklist.py    # Blacklist de JWT (Redis ou in-memory)
│   │   └── validators.py         # Sanitizacao de inputs (XSS, path traversal)
│   ├── database/
│   │   ├── connection.py         # SQLAlchemy engine + session factory
│   │   └── session.py            # get_db dependency
│   ├── middleware/
│   │   ├── auth.py               # JWT authentication dependencies
│   │   ├── csrf.py               # CSRF protection
│   │   └── security_headers.py   # Security headers (CSP, HSTS, etc.)
│   ├── models/                   # 11 modelos ORM
│   │   ├── user.py               # Usuario (admin, auth)
│   │   ├── booking.py            # Reserva (Airbnb/Booking)
│   │   ├── property.py           # Imovel
│   │   ├── guest.py              # Hospede
│   │   ├── calendar_source.py    # Fonte de calendario iCal
│   │   ├── booking_conflict.py   # Conflito entre reservas
│   │   ├── sync_action.py        # Acao de sincronizacao
│   │   ├── sync_log.py           # Log de sincronizacao
│   │   ├── notification.py       # Notificacao persistente
│   │   └── app_settings.py       # Configuracoes da aplicacao
│   ├── routers/                  # 9 routers de API
│   │   ├── bookings.py           # CRUD de reservas
│   │   ├── calendar.py           # Fontes de calendario
│   │   ├── conflicts.py          # Listagem de conflitos
│   │   ├── documents.py          # Geracao/download de documentos
│   │   ├── emails.py             # Envio de emails (SMTP/IMAP)
│   │   ├── notifications.py      # Central de notificacoes
│   │   ├── settings.py           # Configuracoes persistentes
│   │   ├── statistics.py         # Estatisticas e graficos
│   │   └── sync_actions.py       # Acoes de sincronizacao
│   ├── schemas/                  # Pydantic schemas (request/response)
│   ├── services/                 # 11 servicos (business logic)
│   │   ├── booking_service.py
│   │   ├── calendar_service.py
│   │   ├── document_service.py
│   │   ├── email_processor.py
│   │   ├── email_service.py
│   │   ├── notification_db_service.py
│   │   ├── notification_service.py
│   │   ├── platform_parser_service.py
│   │   ├── settings_service.py
│   │   ├── statistics_service.py
│   │   └── sync_action_service.py
│   ├── telegram/                 # Bot Telegram
│   ├── templates/email/          # Templates HTML de email (Jinja2)
│   ├── utils/
│   │   ├── logger.py             # Loguru setup
│   │   └── date_utils.py         # Formatacao de datas
│   ├── config.py                 # Pydantic Settings (.env)
│   └── main.py                   # Entry point FastAPI
│
├── frontend/                     # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Calendar.jsx      # Componente de calendario visual
│   │   │   ├── EventModal.jsx    # Modal de detalhes de evento
│   │   │   ├── Sidebar.jsx       # Navegacao lateral
│   │   │   └── ErrorBoundary.jsx # Error boundary React
│   │   ├── contexts/
│   │   │   └── PropertyContext.jsx  # Contexto multi-propriedade
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Painel principal com metricas
│   │   │   ├── Calendar.jsx      # Visualizacao de calendario
│   │   │   ├── Conflicts.jsx     # Conflitos de reservas
│   │   │   ├── Statistics.jsx    # Graficos e estatisticas
│   │   │   ├── Documents.jsx     # Geracao de documentos
│   │   │   ├── Emails.jsx        # Gestao de emails
│   │   │   ├── Notifications.jsx # Central de notificacoes
│   │   │   └── Settings.jsx      # Configuracoes do sistema
│   │   ├── services/
│   │   │   └── api.js            # Axios HTTP client (CRITICO)
│   │   ├── styles/
│   │   │   └── global.css        # Design system CSS
│   │   └── utils/
│   │       └── formatters.js     # Formatacao de datas e moeda
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── electron/                     # Electron main process
│   ├── main.js                   # Entry point, lifecycle, wizard
│   ├── preload.js                # Context bridge (window.electronAPI)
│   ├── python-manager.js         # Gerencia processo Python
│   ├── ipc-handlers.js           # IPC handlers (dialogs, backend)
│   ├── tray.js                   # Icone da bandeja do sistema
│   ├── updater.js                # Auto-update via GitHub Releases
│   ├── splash.html               # Tela de carregamento
│   ├── assets/                   # Icones do app
│   └── wizard/                   # Wizard de configuracao inicial
│       ├── wizard.html           # Interface do wizard (5 passos)
│       ├── wizard.js             # Logica do wizard
│       ├── wizard.css            # Estilos do wizard
│       └── wizard-preload.js     # Context bridge do wizard
│
├── legacy/                       # Arquivos de deploy web (legado)
│   └── web-deployment/
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── INICIAR_SISTEMA.bat
│       ├── configs/              # nginx, systemd, logrotate
│       └── docs/                 # Guias de deploy VPS
│
├── data/                         # Runtime (gitignored)
│   ├── lumina.db                 # Banco SQLite
│   ├── logs/                     # Logs da aplicacao
│   ├── backups/                  # Backups automaticos
│   ├── generated_docs/           # Documentos DOCX gerados
│   └── downloads/                # Downloads temporarios
│
├── templates/                    # Templates DOCX (gitignored)
├── scripts/                      # Scripts utilitarios
├── tests/                        # Testes (a expandir)
├── docs/                         # Documentacao
│
├── CLAUDE.md                     # Instrucoes para agentes Claude
├── package.json                  # Dependencias Electron
├── electron-builder.yml          # Config do instalador Windows
├── requirements.txt              # Dependencias Python
├── run_backend.py                # Entry point para PyInstaller
└── lumina.spec                   # Config PyInstaller
```

---

## 5. Funcionalidades (MVP Status)

### MVP1 - Calendario e Reservas (Completo)

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Sincronizacao iCal | OK | Importa calendarios Airbnb/Booking via URLs iCal |
| Gerenciamento de reservas | OK | CRUD completo com paginacao e filtros |
| Deteccao de conflitos | OK | Identifica sobreposicao entre reservas de diferentes plataformas |
| Dashboard | OK | Metricas: reservas ativas, proximos check-ins, taxa de ocupacao |
| Estatisticas | OK | Graficos de receita, ocupacao por mes, distribuicao por plataforma |
| Calendario visual | OK | Visualizacao mensal com eventos coloridos por plataforma |
| Sincronizacao periodica | OK | Background task configuravel (padrao: 30 min) |
| Backup automatico | OK | Backup do SQLite em modo desktop/producao |

### MVP2 - Comunicacao e Documentos (Completo)

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Geracao de documentos | OK | Autorizacao de condominio em DOCX a partir de templates |
| Download de documentos | OK | Via API ou dialogo nativo (Electron) |
| Email SMTP | OK | Envio de emails via configuracao SMTP customizada |
| Email IMAP | OK | Leitura de emails recebidos |
| Templates de email | OK | Confirmacao de reserva, check-in reminder, email customizado |
| Envio em massa | OK | Lembretes de check-in para reservas proximas |
| Notificacoes | OK | Central de notificacoes persistente (DB) |
| Telegram Bot | OK | Notificacoes via Telegram (opcional) |

### MVP3 - Inteligencia Artificial (Planejado)

| Funcionalidade | Status | Descricao |
|----------------|--------|-----------|
| Gmail API | Planejado | Integracao direta com Gmail (OAuth2) |
| Respostas automaticas | Planejado | IA para responder hospedes |
| Analise de sentimento | Planejado | Analise de reviews e mensagens |

---

## 6. Seguranca

### Implementado

- **JWT Authentication**: Login com token Bearer, refresh via re-login
- **Token Blacklist**: Invalidacao de tokens no logout (Redis ou in-memory)
- **Rate Limiting**: 100 req/min, 1000 req/hora (desabilitado no desktop)
- **CORS**: Restrito a origins configuradas (aberto no desktop/localhost)
- **CSRF Protection**: Middleware com token validation
- **Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Password Hashing**: bcrypt via passlib
- **Input Validation**: sanitize_html, sanitize_filename, validate_email_safe
- **Path Traversal Protection**: Validacao em downloads de documentos
- **IDOR Protection**: Verificacao de ownership em documentos
- **Global Exception Handler**: Nunca expoe stack traces ao cliente
- **Account Lockout**: Bloqueio apos tentativas falhas de login

### Vulnerabilidades Conhecidas (Auditoria 20/02/2026)

**CRITICAS (3)**
1. Endpoint `/api/v1/shutdown` sem autenticacao - qualquer processo local pode encerrar o backend
2. Endpoint `/api/v1/health/metrics` sem autenticacao - expoe metricas do sistema
3. IMAP folder injection - parametro `folder` no email router nao e sanitizado

**ALTAS (7)**
1. `/api/info` expoe PII (nome, email, telefone do proprietario) sem auth
2. Email router vaza detalhes de excecoes em mensagens de erro
3. `connection.py` loga DATABASE_URL completa (pode conter credenciais)
4. `python-jose` tem vulnerabilidades conhecidas (considerar `PyJWT`)
5. `delete-account` envia senha como query parameter
6. Token blacklist in-memory e perdida ao reiniciar (replay attack risk)
7. `sandbox: false` no Electron BrowserWindow (CRITICA para desktop)

**MEDIAS (7)**
1. Bulk email reminders sem verificacao de admin
2. Telegram error disclosure em mensagens de erro
3. `sanitize_filename` pode ser bypassed com caracteres Unicode
4. Sem limite de paginacao no endpoint de listagem de documentos
5. CORS wildcard com credentials no modo desktop
6. Geracao silenciosa de SECRET_KEY em dev/desktop
7. Sem limite de tamanho nos inputs de geracao de documentos

---

## 7. Electron Desktop - Estado Detalhado

### Arquivos e Responsabilidades

| Arquivo | Linhas | Funcao |
|---------|--------|--------|
| `main.js` | ~650 | Entry point: splash, wizard, window, tray, lifecycle |
| `preload.js` | ~120 | Context bridge: backend URL, dialogs, notifications |
| `python-manager.js` | ~330 | Spawn Python, health check, crash recovery, shutdown |
| `ipc-handlers.js` | ~180 | IPC: saveFile, confirm, backend status, window controls |
| `tray.js` | ~100 | Icone na bandeja + menu de contexto |
| `updater.js` | ~80 | Auto-update via GitHub Releases (electron-updater) |
| `splash.html` | ~150 | Tela de loading com animacao CSS |
| `wizard/wizard.html` | ~400 | Wizard de 5 passos (config inicial) |
| `wizard/wizard.js` | ~600 | Logica do wizard + validacao + review |
| `wizard/wizard.css` | ~400 | Estilos do wizard |
| `wizard/wizard-preload.js` | ~80 | Context bridge do wizard |

### Wizard de Configuracao (5 Passos)

1. **Boas-vindas** - Introducao ao sistema
2. **Dados do Proprietario** - Nome, email, telefone, CPF
3. **Dados do Imovel** - Nome, endereco, condominio, Airbnb/Booking URLs
4. **Comunicacao** - Email SMTP/IMAP, Telegram bot token
5. **Revisao** - Resumo de todas as configuracoes

### Ciclo de Vida do Python Backend

```
start() → findFreePort() → spawn(python/exe) → waitForHealthy()
                                                    ↓
                                               Backend pronto
                                                    ↓
                                              onReady callbacks
                                                    ↓
                                         [crash?] → _handleCrash()
                                                    ↓
                                         Exponential backoff (2s, 4s, 8s)
                                         Max 3 restarts
                                                    ↓
stop() → SIGTERM → timeout 10s → taskkill /F /T (Windows)
```

### Build e Distribuicao

```bash
# Pipeline completo de build
npm run dist
# Equivale a:
# 1. pyinstaller --noconfirm lumina.spec  (gera python-dist/)
# 2. cd frontend && npm run build          (gera frontend/dist/)
# 3. electron-builder --win               (gera release/*.exe)
```

**Instalador**: NSIS (Windows), permite escolher diretorio de instalacao.
**Auto-update**: Via GitHub Releases com electron-updater.
**Dados do usuario**: Armazenados em `%APPDATA%/LUMINA/` (separado do app).

---

## 8. API Endpoints

### Autenticacao (`/api/v1`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/auth/register` | Nao | Registrar usuario |
| POST | `/auth/login` | Nao | Login (retorna JWT) |
| POST | `/auth/change-password` | Sim | Alterar senha |
| POST | `/auth/logout` | Sim | Logout (blacklist token) |
| DELETE | `/auth/delete-account` | Sim | Deletar conta |
| POST | `/auth/unlock-user` | Admin | Desbloquear usuario |

### Health (`/api/v1`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/health` | Nao | Health check simples |
| GET | `/health/metrics` | **Nao** | Metricas do sistema |
| GET | `/health/info` | Nao | Info do app |

### Reservas (`/api/v1/bookings`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/` | Sim | Listar reservas (paginacao, filtros) |
| GET | `/{id}` | Sim | Detalhe de uma reserva |
| POST | `/` | Sim | Criar reserva manual |
| PUT | `/{id}` | Sim | Atualizar reserva |
| DELETE | `/{id}` | Sim | Deletar reserva |
| GET | `/statistics/overview` | Sim | Estatisticas de reservas |

### Calendario (`/api/v1/calendar`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/sources` | Sim | Listar fontes de calendario |
| POST | `/sources` | Sim | Adicionar fonte iCal |
| DELETE | `/sources/{id}` | Sim | Remover fonte |
| POST | `/sync` | Sim | Sincronizar agora |
| POST | `/sync/{source_id}` | Sim | Sincronizar fonte especifica |

### Conflitos (`/api/v1/conflicts`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/` | Sim | Listar conflitos |
| PUT | `/{id}/resolve` | Sim | Resolver conflito |

### Documentos (`/api/v1/documents`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/generate` | Sim | Gerar documento (dados manuais) |
| POST | `/generate-from-booking` | Sim | Gerar de reserva existente |
| POST | `/generate-and-download` | Sim | Gerar e download direto |
| GET | `/list` | Sim | Listar documentos gerados |
| GET | `/download/{filename}` | Sim | Download de documento |
| DELETE | `/{filename}` | Admin | Deletar documento |

### Emails (`/api/v1/emails`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/send` | Sim | Enviar email customizado |
| POST | `/send-template` | Sim | Enviar email de template |
| POST | `/booking-confirmation` | Sim | Confirmacao de reserva |
| POST | `/checkin-reminder` | Sim | Lembrete de check-in |
| POST | `/bulk-checkin-reminders` | Sim | Lembretes em massa |
| GET | `/inbox` | Sim | Ler inbox via IMAP |
| POST | `/test` | Sim | Enviar email de teste |

### Estatisticas (`/api/v1/statistics`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/` | Sim | Estatisticas gerais |
| GET | `/monthly` | Sim | Dados mensais |
| GET | `/revenue` | Sim | Dados de receita |

### Configuracoes (`/api/v1/settings`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/` | Sim | Listar configuracoes |
| PUT | `/` | Sim | Atualizar configuracoes |

### Notificacoes (`/api/v1/notifications`)

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/` | Sim | Listar notificacoes |
| PUT | `/{id}/read` | Sim | Marcar como lida |
| PUT | `/read-all` | Sim | Marcar todas como lidas |
| DELETE | `/{id}` | Sim | Deletar notificacao |

### Sistema

| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| GET | `/` | Nao | Info basica do app |
| GET | `/health` | Nao | Health check |
| GET | `/api/info` | **Nao** | Info detalhada (PII!) |
| POST | `/api/v1/shutdown` | **Nao** | Shutdown (desktop only) |

---

## 9. Modelos de Dados

### User
- id, username, email, hashed_password, is_admin, is_active
- failed_login_attempts, locked_until

### Property
- id, name, address, condo_name, condo_admin_name, platform_urls
- airbnb_ical_url, booking_ical_url

### Booking
- id, property_id, guest_id, guest_name, platform (airbnb/booking/manual)
- check_in_date, check_out_date, status, total_price, external_id

### Guest
- id, name, email, phone, document_number, nationality

### CalendarSource
- id, property_id, platform, ical_url, is_active, last_sync

### BookingConflict
- id, booking_a_id, booking_b_id, conflict_type, status, resolved_at

### Notification
- id, user_id, type, title, message, is_read, created_at

### AppSettings
- id, key, value, category

### SyncAction / SyncLog
- Historico de sincronizacoes e acoes tomadas

---

## 10. Dependencias e Build

### Python (requirements.txt)
- 25 dependencias diretas
- Organizadas por MVP (Core, MVP2-Docs, MVP2-Telegram, MVP2-Email)
- Testing dependencies comentadas (pytest, faker)

### Node.js (package.json raiz - Electron)
- **Runtime**: electron-updater, electron-log
- **Dev**: electron, electron-builder, concurrently, wait-on, cross-env

### Node.js (frontend/package.json)
- React 18, Vite 5, Axios, Recharts, Lucide-react, date-fns

### Build Pipeline
```
npm run dist
├── build:python   → PyInstaller → python-dist/lumina-backend/
├── build:frontend → Vite → frontend/dist/
└── build:electron → electron-builder → release/LUMINA Setup X.X.X.exe
```

### Desenvolvimento
```bash
# Tudo junto (3 processos)
npm run dev

# Ou separadamente:
npm run dev:python    # Backend na porta 8000
npm run dev:frontend  # Frontend na porta 5173
npm run dev:electron  # Electron com ELECTRON_DEV=true
```

---

## 11. Configuracao (.env)

O sistema usa Pydantic Settings com suporte a `.env`. No modo desktop,
o arquivo `.env` fica em `%APPDATA%/LUMINA/.env` (gerado pelo Wizard).

### Variaveis Principais

| Variavel | Padrao | Descricao |
|----------|--------|-----------|
| APP_ENV | development | Ambiente (development/production/desktop) |
| SECRET_KEY | (gerado) | Chave JWT (auto-gerada em dev/desktop) |
| DATABASE_URL | sqlite:///data/lumina.db | URL do banco de dados |
| LUMINA_DESKTOP | false | Modo desktop Electron |
| LUMINA_DATA_DIR | (vazio) | Diretorio de dados (desktop) |
| LUMINA_ENV_FILE | (vazio) | Caminho do .env (desktop) |
| PROPERTY_NAME | - | Nome do imovel |
| PROPERTY_ADDRESS | - | Endereco |
| OWNER_NAME | - | Nome do proprietario |
| OWNER_EMAIL | - | Email do proprietario |
| AIRBNB_ICAL_URL | - | URL do calendario iCal Airbnb |
| BOOKING_ICAL_URL | - | URL do calendario iCal Booking |
| SMTP_SERVER | - | Servidor SMTP |
| SMTP_PORT | 587 | Porta SMTP |
| SMTP_USERNAME | - | Usuario SMTP |
| SMTP_PASSWORD | - | Senha SMTP |
| IMAP_SERVER | - | Servidor IMAP |
| IMAP_PORT | 993 | Porta IMAP |
| TELEGRAM_BOT_TOKEN | - | Token do bot Telegram |
| TELEGRAM_CHAT_ID | - | Chat ID do Telegram |

---

## 12. Testes

O projeto tem estrutura de testes em `tests/` mas cobertura limitada.
Dependencias de teste estao comentadas no `requirements.txt`.

**Estado atual**: Testes nao foram priorizados durante a migracao Electron.
Recomenda-se adicionar testes para os servicos criticos antes do lancamento.

---

## 13. Deploy Legacy (Web)

Os arquivos de deploy web foram movidos para `legacy/web-deployment/`:

- `Dockerfile` - Container Docker com Python + build frontend
- `docker-compose.yml` - Orquestracao com volumes e restart policy
- `INICIAR_SISTEMA.bat` - Script Windows para iniciar localmente
- `configs/` - nginx, systemd, logrotate configs
- `docs/` - Guias de deploy em VPS

Estes arquivos estao funcionais mas nao sao mais o foco do desenvolvimento.

---

## 14. Proximos Passos Recomendados

### Seguranca (Prioritario)
1. Adicionar auth ao endpoint `/api/v1/shutdown`
2. Adicionar auth ao endpoint `/api/v1/health/metrics`
3. Remover PII do endpoint `/api/info` ou adicionar auth
4. Habilitar `sandbox: true` no Electron BrowserWindow
5. Validar input `folder` no email IMAP router
6. Migrar de `python-jose` para `PyJWT`
7. Sanitizar dados do wizard antes de gravar no `.env`

### Qualidade
1. Adicionar testes unitarios para servicos criticos
2. Substituir `console.log` por `electron-log` no python-manager
3. Code signing para o instalador Windows
4. Adicionar AbortController nos useEffect do frontend
5. Implementar cleanup de intervalos no tray.js

### Features
1. MVP3: Integracao Gmail API
2. MVP3: Respostas automaticas com IA
3. Multi-propriedade no frontend
4. Export de relatorios em PDF
