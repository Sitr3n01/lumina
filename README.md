# LUMINA — Apartment Management System

**Gerenciamento automatizado de imóveis para Airbnb e Booking.com.**

`Version A.0.1.0` · `Alpha` · `Windows 10/11 Desktop`

---

## O que é o LUMINA?

LUMINA é um aplicativo desktop Windows que sincroniza automaticamente seus calendários do Airbnb e Booking.com, detecta conflitos de reservas, gera documentos de autorização de condomínio, envia notificações por Telegram e e-mail, e mostra um dashboard com ocupação e receita mensal — tudo em um único lugar.

**Para quem é:** Proprietários individuais ou pequenos gestores que precisam controlar reservas em múltiplas plataformas sem cruzar planilhas manualmente.

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 📅 **Calendário** | Sincronização automática iCal (Airbnb + Booking) a cada 30 min |
| ⚠️ **Conflitos** | Detecção e resolução de sobreposições entre plataformas |
| 📊 **Dashboard** | Ocupação, receita, próximos check-ins, alertas em tempo real |
| 📄 **Documentos** | Geração de autorização de condomínio (.docx) com logo personalizado |
| ✉️ **Emails** | Confirmação de reserva e lembretes de check-in automáticos |
| 🤖 **Telegram** | Notificações e aprovação de reservas via bot |
| 🧠 **IA** | Sugestões de precificação e assistente via Anthropic/OpenAI |
| 🔔 **Notificações** | Central de alertas persistida, com polling do system tray |
| ⚙️ **Configurações** | Painel completo com edição via UI (DB override pattern) |

---

## Instalação

### Beta Tester (Windows)

1. Acesse [Releases](https://github.com/Sitr3n01/AP_Controller/releases)
2. Baixe `LUMINA-Setup-A.0.1.0.exe`
3. Execute o instalador
4. O **Wizard de Configuração** abrirá na primeira execução para criar sua conta e configurar o imóvel

### Desenvolvedor / Contribuidor

Consulte o **[DEV_SETUP.md](DEV_SETUP.md)** para instruções completas de setup.

**Resumo rápido:**
```bash
git clone https://github.com/Sitr3n01/AP_Controller.git
cd AP_Controller
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cd frontend && npm install && cd ..
npm install
copy .env.example .env   # Edite com seus dados
npm run dev              # Inicia tudo (backend + frontend + Electron)
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| **Desktop** | Electron 29, electron-builder |
| **Backend** | Python 3.11+, FastAPI 0.115+, SQLAlchemy 2.0, SQLite |
| **Frontend** | React 18, Vite 5, Recharts, Lucide-react |
| **Auth** | JWT (HS256) + token blacklist + bcrypt |
| **Email** | aiosmtplib + aioimaplib, Jinja2 SandboxedEnvironment |
| **AI** | Anthropic Claude / OpenAI / providers compatíveis |
| **Testes** | pytest, TestClient, SQLite in-memory |

---

## Arquitetura

```
AP_Controller/
  app/                    # Backend FastAPI (Python)
    api/v1/               # Auth, Health
    core/                 # iCal sync, conflict detection, security, backup
    middleware/           # JWT, CSRF, security headers
    models/               # SQLAlchemy (User, Booking, Property, Guest…)
    routers/              # 11 routers (bookings, calendar, conflicts,
    │                     #   statistics, documents, emails, settings,
    │                     #   notifications, ai, sync_actions, health)
    services/             # 13 services (business logic layer)
    telegram/             # Bot + NotificationService
  frontend/               # React 18 + Vite
    src/
      components/         # Calendar, Sidebar, ErrorBoundary, EventModal
      contexts/           # AuthContext (JWT), PropertyContext
      pages/              # 10 páginas: Dashboard, Calendar, Conflicts,
      │                   #   Statistics, Documents, Emails, Notifications,
      │                   #   AISuggestions, CondoTemplate, Settings
      services/api.js     # Axios client com Bearer interceptor
  electron/               # Electron (main process)
    main.js               # Entry point, splash, tray, wizard
    preload.js            # contextBridge (APIs expostas ao frontend)
    python-manager.js     # Spawn + health check + crash recovery
    ipc-handlers.js       # IPC: sistema, updates, factory reset
  tests/                  # pytest (SQLite in-memory)
  docs/                   # Documentação técnica
```

---

## API

O backend expõe ~45 endpoints REST organizados em 11 routers:

| Prefixo | Módulo |
|---------|--------|
| `/api/v1/auth` | Login, logout, change-password, me |
| `/api/bookings` | CRUD completo de reservas |
| `/api/calendar` | Eventos, sync manual, sync-status |
| `/api/conflicts` | Listagem, resumo, resolução, detect |
| `/api/statistics` | Dashboard, ocupação, receita |
| `/api/sync-actions` | Fila de ações pendentes |
| `/api/v1/documents` | Geração, download, delete, analyze-template |
| `/api/v1/emails` | Send, templates, confirmação, lembretes, IMAP |
| `/api/v1/settings` | GET, PUT, POST /reset |
| `/api/v1/notifications` | Lista, resumo, mark-read |
| `/api/v1/ai` | Chat, price-suggestions, test, settings |

Documentação completa: [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md)

Swagger UI disponível em `http://127.0.0.1:<porta>/docs` com o backend rodando.

---

## Segurança

- JWT com blacklist server-side + account lockout (5 tentativas → 15 min bloqueio)
- Bcrypt + rate limiting (slowapi) por endpoint
- CSRF, HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- Validação de inputs contra XSS, path traversal e SSTI
- Proteção IDOR em endpoints de documentos
- Registro invite-only (apenas 1 usuário admin)
- `nodeIntegration: false` + `contextIsolation: true` no Electron
- `will-navigate` bloqueado para prevenir navegação externa

**Nota de auditoria:** Score de segurança ~9.0/10 após auditoria completa (10/03/2026).

---

## Desenvolvimento

| Comando | Ação |
|---------|------|
| `npm run dev` | Inicia tudo em modo dev |
| `npm run dist` | Gera instalador Windows |
| `python -m pytest tests/ -v` | Roda testes |
| `scripts\reset_dev_state.bat` | Reseta estado de dev |

Veja [`DEV_SETUP.md`](DEV_SETUP.md) para guia completo.

---

## Roadmap

Veja [`IMPROVEMENTS.md`](IMPROVEMENTS.md) para oportunidades de melhoria identificadas na auditoria, incluindo roadmap de versões A.0.2.0, A.0.3.0 e Beta.

**Nota geral do projeto (auditoria 03/2026): 7.9 / 10**

---

## Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Siga as convenções em [`CLAUDE.md`](CLAUDE.md)
4. Abra um Pull Request para `feature/electron-migration`

Bugs e sugestões: [Issues](https://github.com/Sitr3n01/AP_Controller/issues)

---

## Licença

MIT License. Veja [`LICENSE`](LICENSE) para detalhes.
