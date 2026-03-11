# LUMINA A.0.1.0 - Estado do Projeto

> Atualizado em: 11/03/2026
> Branch: `feature/electron-migration`
> Versao: **A.0.1.0** (Alpha 0.1.0 - Desktop Electron)
> Release: publicada no GitHub (LUMINA-Setup-A.0.1.0.exe)

---

## 1. Visao Geral

**LUMINA** e um sistema de gestao de apartamentos para hosts de Airbnb e Booking.com.
Aplicativo Desktop Windows usando Electron, com backend Python (FastAPI) embutido via PyInstaller.

### Numeros do Projeto

| Metrica | Valor |
|---------|-------|
| Backend Python | ~12.500 linhas |
| Frontend React | ~9.000 linhas |
| Electron Desktop | ~3.500 linhas |
| **Total** | **~25.000 linhas** |
| Modelos ORM | 11 |
| Routers API | 11 |
| Services | 14 |
| Paginas Frontend | 10 |
| Componentes Compartilhados | 5 |
| Testes Automatizados | 35 testes (34 passando) |

---

## 2. Arquitetura

```
+-----------------------------------------------------+
|                   ELECTRON SHELL                    |
|  main.js -> PythonManager -> Backend FastAPI        |
|  preload.js -> contextBridge -> window.electronAPI  |
|  tray.js, updater.js, ipc-handlers.js               |
|  wizard/ (setup inicial, IPC handlers separados)    |
+-----------------------------------------------------+
|              FRONTEND (React 18 + Vite)             |
|  10 paginas, state-based routing em App.jsx         |
|  AuthContext (JWT) + PropertyContext                |
|  Axios HTTP client (api.js) com interceptors        |
+-----------------------------------------------------+
|              BACKEND (FastAPI + SQLAlchemy)         |
|  REST API, JWT auth (BCrypt + blacklist), slowapi   |
|  SQLite database, background tasks async            |
|  Calendar sync (iCal), document generation (.docx) |
|  Email (SMTP/IMAP aiosmtplib), Telegram bot        |
|  AI multi-provider (Anthropic / OpenAI / compativel)|
+-----------------------------------------------------+
```

---

## 3. Status dos Modulos por MVP

| Modulo | Status | Notas |
|--------|--------|-------|
| **MVP1: Calendarios** | Completo | Sync iCal Airbnb + Booking, deteccao de conflitos |
| **MVP1: Reservas** | Completo | CRUD, upload manual, filtros, plataformas |
| **MVP1: Conflitos** | Completo | Deteccao automatica, resolucao manual |
| **MVP1: Estatisticas** | Completo | Ocupacao, receita, plataformas, relatorio mensal |
| **MVP2: Documentos** | Completo | Geracao .docx, logo do condominio, preview HTML |
| **MVP2: Emails** | Completo | SMTP/IMAP, templates Jinja2 Sandboxed, Outlook/Gmail/Yahoo |
| **MVP2: Telegram** | Completo | Bot polling, comandos, aprovacao de reservas |
| **MVP2: Notificacoes** | Completo | Central DB-backed, polling do Electron tray |
| **MVP3: AI Chat** | Completo | Multi-provider (Anthropic/OpenAI/compatible), chat streaming |
| **MVP3: AI Pricing** | Completo | Sugestoes de precificacao via AI |
| **Electron Desktop** | Completo | Wizard setup, splash unificado, tray, auto-update, janela unica |
| **Autenticacao** | Completo | JWT, register invite-only, lockout, blacklist |
| **Auditoria de Seguranca** | Score ~9.0/10 | Jinja2 sandbox, will-navigate, path traversal bloqueado |
| **Testes Automatizados** | 34/35 passando | 1 falha pre-existente (token blacklist isolation) |

---

## 4. Arquitetura do Electron

### Fluxo de Inicializacao

```
app.whenReady()
  +- isFirstRun()? (verifica .env em userData)
  |   +- SIM -> openWizard() -> registra wizard IPC handlers
  |   |         wizard-done event -> startNormalApp()
  |   +- NAO -> startNormalApp()
  |             +- createMainWindow() -> splash.html
  |             +- PythonManager.start() -> PyInstaller bundle
  |             +- health check polling
  |             +- pending-admin.json -> POST /register
  |             +- pending-template.pdf -> backend
  |             +- loadURL(React app)
  +- registerIpcHandlers() -> todos os canais IPC
```

### Tamanhos de Janela (padronizados)

| Janela | width | height | minWidth | minHeight |
|--------|-------|--------|----------|-----------|
| Wizard (setup inicial) | 1440 | 900 | 1024 | 720 |
| App principal (dashboard) | 1440 | 900 | 1024 | 720 |

### IPC Handlers Registrados

| Canal | Tipo | Descricao |
|-------|------|-----------|
| `backend:getUrl` | handle | URL do backend Python |
| `backend:restart` | handle | Reinicia processo Python |
| `backend:status` | handle | Status do backend |
| `dialog:saveFile` | handle | Salvar arquivo via dialog nativo |
| `dialog:confirm` | handle | Dialog de confirmacao nativo |
| `notification:show` | handle | Notificacao nativa do sistema |
| `app:version` | handle | Versao do app |
| `app:path` | handle | userData path |
| `app:getAutoLaunch` | handle | Status inicio com Windows |
| `app:setAutoLaunch` | handle | Configurar inicio com Windows |
| `app:factoryReset` | handle | Apaga .env + lumina.db + pending-admin.json + relanca para wizard |
| `app:quit` | on | Encerra o app |
| `window:minimize` | on | Minimiza janela |
| `window:close` | on | Esconde (vai para tray) |
| `update:check` | on | Verificar atualizacoes |
| `update:download` | handle | Baixar atualizacao |
| `update:install` | handle | Instalar atualizacao |

---

## 5. Routers e Prefixos da API

| Router | Prefix | Versao |
|--------|--------|--------|
| auth | `/api/v1/auth` | v1 |
| health | `/api/v1/health` | v1 |
| documents | `/api/v1/documents` | v1 |
| emails | `/api/v1/emails` | v1 |
| settings | `/api/v1/settings` | v1 |
| notifications | `/api/v1/notifications` | v1 |
| ai | `/api/v1/ai` | v1 |
| bookings | `/api/bookings` | legado |
| calendar | `/api/calendar` | legado |
| conflicts | `/api/conflicts` | legado |
| statistics | `/api/statistics` | legado |
| sync_actions | `/api/sync-actions` | legado |

> Nota: Routers MVP1 (bookings, calendar, etc.) usam prefixo sem `/v1/` por compatibilidade retroativa.

---

## 6. Services e Responsabilidades

| Service | Arquivo | Responsabilidade |
|---------|---------|-----------------|
| CalendarService | `app/services/calendar_service.py` | Orquestra sync iCal + conflict detection |
| BookingService | `app/services/booking_service.py` | CRUD de reservas, merge de dados |
| EmailService | `app/services/email_service.py` | SMTP/IMAP, templates Jinja2 Sandboxed |
| EmailProcessor | `app/services/email_processor.py` | Processamento de emails recebidos |
| DocumentService | `app/services/document_service.py` | Geracao .docx, insercao de logo |
| SettingsService | `app/services/settings_service.py` | Merge .env + DB, EDITABLE_FIELDS |
| AIService | `app/services/ai_service.py` | Chat multi-provider (Anthropic/OpenAI) |
| AIPricingService | `app/services/ai_pricing_service.py` | Sugestoes de precificacao via AI |
| NotificationDBService | `app/services/notification_db_service.py` | Central de notificacoes (DB-backed) |
| NotificationService | `app/telegram/notifications.py` | Envio de notificacoes via Telegram |
| SyncActionService | `app/services/sync_action_service.py` | Fila de acoes de sincronizacao pendentes |
| StatisticsService | `app/services/statistics_service.py` | Calculos de ocupacao e receita |
| PlatformParserService | `app/services/platform_parser_service.py` | Parse de nomes/plataformas de reservas |

---

## 7. Settings Architecture (DB Override Pattern)

```
.env (imutavel em producao)     AppSetting (DB, editavel via UI)
        |                               |
        +------------ merge ------------+
                         |
                  get_all_settings()
                         |
                    SettingsResponse
```

**EDITABLE_FIELDS** (campos que podem ser alterados via frontend):
- `condoEmail`, `maxGuests`, `syncIntervalMinutes`
- `enableAutoDocumentGeneration`, `enableConflictNotifications`
- `propertyName`, `propertyAddress` (override do wizard)
- `condoName`, `condoAdminName` (override do wizard)
- `ownerName`, `ownerEmail`, `ownerPhone`, `ownerApto`, `ownerBloco`, `ownerGaragem`
- `aiProvider`, `aiApiKey`, `aiModel`, `aiBaseUrl`
- `condoLogoUrl`

---

## 8. Auditoria de Seguranca (Score: ~9.0/10)

| Item | Status |
|------|--------|
| JWT com blacklist | Implementado |
| Lockout apos 5 tentativas | Implementado |
| Jinja2 SandboxedEnvironment | Implementado |
| Electron will-navigate bloqueado | Implementado |
| Path traversal em documentos | Bloqueado (sanitize_filename) |
| IDOR em download de documentos | Protegido |
| str(e) nao exposto ao cliente | Verificado (Telegram fix aplicado) |
| Rate limiting | Implementado (desabilitado em desktop/localhost) |
| CSRF protection middleware | Implementado |
| Security headers middleware | Implementado |
| nodeIntegration: false | Implementado |
| contextIsolation: true | Implementado |
| Register invite-only | Implementado |
| datetime.utcnow() substituido | Substituido por timezone.utc |

---

## 9. Bugs Corrigidos

### Sessao 10/03/2026

| Bug | Arquivo | Descricao | Severidade |
|-----|---------|-----------|-----------|
| Endpoint fantasma | `frontend/src/services/api.js` | `generateReceiptFromBooking` - endpoint nao existe no backend | CRITICO |
| str(e) no Telegram | `app/telegram/bot.py` | Erro de sync expunha detalhes internos ao usuario | ALTO |
| Logo nao passada | `app/telegram/bot.py` | `generate_condo_authorization()` sem `logo_url` - logo nunca aparecia em docs Telegram | MEDIO |
| print() em producao | `app/telegram/bot.py` | Usando print() em vez de logger nos metodos start/stop | BAIXO |
| Wizard gigante | `electron/main.js` | Janela do wizard era 1920x1000 vs dashboard 1440x900 | UX |

### Sessao 11/03/2026

| Bug | Arquivo | Descricao | Severidade |
|-----|---------|-----------|-----------|
| Auto-login falha apos wizard | `electron/main.js` | Wizard concluia mas app abria na tela de login sem autenticar | CRITICO |
| Register 403 loop | `electron/main.js` | Em segundas execucoes, register retornava 403 (usuario ja existe) - autoLoginToken nunca era setado | CRITICO |
| Factory reset incompleto | `electron/ipc-handlers.js` | Reset apagava apenas `.env`, mantinha DB - wizard rodava mas register voltava 403 | ALTO |
| sentinel.db nao limpo no reset dev | `scripts/reset_dev_state.bat` | Dev usava banco diferente (`data/sentinel.db`) nao incluido no script de reset | MEDIO |
| Tray icon ausente na build | `electron/tray.js` | Windows requer .ico para bandeja - PNG falhava silenciosamente; fallback buscava `icon.ico` inexistente | MEDIO |

---

## 10. Arquivos Legados / Para Limpeza

### Removidos:
- `legacy/web-deployment/` - **13 arquivos** de Docker/nginx/systemd (modo web legado arquivado)
- `GEMINI.md` - instrucoes removidas
- `electron-builder.yml` - substituido por config em `package.json`
- `pyproject.toml` - substituido por `lumina.spec` (PyInstaller)

### Scripts obsoletos (manter para referencia historica):
- `scripts/add_lockout_fields.py` - Migracao DB (campos ja existem nos modelos)
- `scripts/create_users_table.py` - Criacao de tabela (SQLAlchemy cria automaticamente)
- `scripts/protect_routes.py` - Auditoria de seguranca (fase concluida)
- `scripts/create_admin_user.py` - Substituido por `create_default_admin.py` e pelo Wizard

### Arquivo de pycache suspeito:
- `tests/__pycache__/conftest.cpython-313-pytest-9.0.2.pyc.56892` - Extensao incomum, residuo de crash

---

## 11. Paginas Frontend

| Pagina | Rota | Descricao |
|--------|------|-----------|
| Login | (auth gate) | JWT login, remember-me, pre-fill username |
| Dashboard | `dashboard` | Resumo geral, proximas reservas, bento cards |
| Calendar | `calendar` | Visualizacao de reservas no calendario |
| Conflicts | `conflicts` | Conflitos detectados, resolucao |
| Statistics | `statistics` | Graficos de ocupacao, receita, plataformas |
| Documents | `documents` | Geracao de .docx, preview HTML (CondoTemplate) |
| Emails | `emails` | Envio de emails, templates, bulk reminders |
| Notifications | `notifications` | Central de notificacoes com filtros |
| AI Suggestions | `ai-pricing` | Chat com AI + sugestoes de preco |
| Settings | `settings` | Configuracoes (Easy / Advanced / AI tabs) |

---

## 12. Comandos de Desenvolvimento

```bash
# Backend (desenvolvimento)
cross-env LUMINA_DESKTOP=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Frontend (desenvolvimento)
cd frontend && npm run dev

# Electron (desenvolvimento) - apos backend e frontend rodando
cross-env ELECTRON_DEV=true LUMINA_DEV_BACKEND_PORT=8000 electron .

# Dev completo (todos juntos)
npm run dev

# Build frontend
cd frontend && npm run build

# Rodar testes
python -m pytest tests/ -v

# Criar admin padrao (sem wizard)
python scripts/create_default_admin.py

# Reset completo do estado de dev
scripts/reset_dev_state.bat

# Verificar versao atual
python -c "from app.version import __version__; print(__version__)"
```

---

## 13. Variaveis de Ambiente (.env)

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `APP_ENV` | development / production / test | Sim |
| `SECRET_KEY` | Chave JWT (min 32 chars) | Sim |
| `LUMINA_DESKTOP` | Deve ser `true` para executar | Sim |
| `PROPERTY_NAME` | Nome do imovel | Sim |
| `PROPERTY_ADDRESS` | Endereco completo | Sim |
| `CONDO_NAME` | Nome do condominio | Sim |
| `CONDO_ADMIN_NAME` | Nome do administrador | Recomendado |
| `CONDO_EMAIL` | Email do condominio (para envio de docs) | Recomendado |
| `OWNER_NAME` | Nome do proprietario | Sim |
| `OWNER_PHONE` | Telefone do proprietario | Recomendado |
| `EMAIL_PROVIDER` | gmail / outlook / yahoo / custom | Para emails |
| `EMAIL_FROM` | Email de envio | Para emails |
| `EMAIL_PASSWORD` | Senha do email (App Password) | Para emails |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram | Para Telegram |
| `TELEGRAM_ADMIN_USER_IDS` | IDs dos admins Telegram (csv) | Para Telegram |
| `AIRBNB_ICAL_URL` | URL iCal Airbnb | Para sync |
| `BOOKING_ICAL_URL` | URL iCal Booking.com | Para sync |
| `CALENDAR_SYNC_INTERVAL_MINUTES` | Intervalo de sync (default: 30) | Nao |
