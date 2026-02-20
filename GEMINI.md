# GEMINI.md - Instrucoes para Agentes Gemini

> Este arquivo e lido automaticamente por agentes Gemini ao abrir o projeto.
> Para instrucoes Claude: `CLAUDE.md`. Para estado completo: `docs/LUMINA_PROJECT_STATE.md`.

---

## Projeto

**LUMINA v3.0.0** - Sistema Desktop de Gestao de Apartamentos (Airbnb/Booking.com)
Stack: Electron + FastAPI (Python) + React 18

---

## Estado Atual (Fevereiro 2026)

### O que ja foi implementado (NAO refazer):

**MVP1 - Core**
- Sincronizacao de calendarios iCal (Airbnb + Booking.com)
- Gestao de reservas (CRUD completo)
- Deteccao de conflitos de datas
- Dashboard de estatisticas e graficos

**MVP2 - Automacao**
- Geracao de documentos DOCX (autorizacao de condominio)
- Sistema de emails (SMTP/IMAP, templates Jinja2)
- Bot Telegram para notificacoes
- Central de notificacoes persistente

**Electron Desktop**
- PythonManager com crash recovery e backoff exponencial
- Wizard de configuracao inicial
- Auto-update via GitHub Releases
- Icone na bandeja do sistema
- Modo desktop com rate limits desabilitados

**Seguranca (Auditoria Completa ~9.0/10)**
- JWT auth com token blacklist + account lockout
- CSRF protection, rate limiting, security headers
- Path traversal + SSTI + IMAP injection protection
- Jinja2 SandboxedEnvironment para templates de email
- Electron: sandbox, contextIsolation, will-navigate handlers
- Register invite-only (so permite primeiro usuario)

**Frontend Auth**
- `AuthContext.jsx`: AuthProvider com login/logout/register
- `Login.jsx`: tela de login + primeiro setup automatico
- `api.js`: Bearer token interceptor + 401 auto-logout
- Sidebar: exibe username + botao de logout

**Testes**
- `tests/conftest.py`: fixtures pytest (SQLite in-memory)
- `tests/test_auth_endpoints.py`: 16 testes de endpoints auth
- `tests/test_auth_middleware.py`: 8 testes de middleware JWT

---

## Proximas Tarefas — MVP3

### Alta Prioridade

#### A1. Sugestoes de preco com AI
**Escopo:** Analisar historico de reservas + sazonalidade e sugerir precos otimos por periodo.
**Tecnologia sugerida:** Claude API (claude-haiku-4-5) para analise de dados + sugestao
**Arquivos a criar:** `app/services/ai_pricing_service.py`, `app/routers/ai.py`
**Frontend:** Nova pagina `frontend/src/pages/AISuggestions.jsx`
**Endpoint:** `POST /api/v1/ai/price-suggestions` (requer auth admin)
**Input:** historico de ocupacao dos ultimos 12 meses
**Output:** sugestoes de preco para proximos 90 dias com justificativa

#### A2. Gmail API Integration
**Escopo:** Alternativa ao SMTP/IMAP manual — autenticar com Google OAuth2 e usar Gmail API.
**Arquivo a modificar:** `app/services/email_service.py` — adicionar GmailProvider
**Novo arquivo:** `app/services/gmail_service.py`
**Configuracao:** adicionar `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` ao `app/config.py`
**Wizard:** adicionar passo de autorizacao Gmail no `electron/wizard/wizard.js`
**Nota importante:** O email_service.py usa Jinja2 SandboxedEnvironment. Manter isso.

#### A3. Relatorio automatico semanal
**Escopo:** Email automatico toda segunda-feira com resumo da semana anterior.
**Arquivo a modificar:** `app/main.py` — adicionar task `weekly_report_task()`
**Usa:** `emailsAPI.send_template()` + template `app/templates/email/weekly_report.html`
**Configuracao:** `ENABLE_WEEKLY_REPORT: bool = False` em `app/config.py`

### Media Prioridade

#### B1. Expandir cobertura de testes
**Escopo:** Adicionar testes para routers de bookings, conflitos e documentos.
**Padrao ja estabelecido em:** `tests/conftest.py`, `tests/test_auth_endpoints.py`
**Fixtures ja disponiveis:** `client`, `db_session`, `admin_user`, `auth_headers`
**Arquivos a criar:**
- `tests/test_bookings.py` (CRUD + validacoes de data)
- `tests/test_conflicts.py` (deteccao, resolucao)
- `tests/test_documents.py` (geracao + download)

#### B2. Multi-property support
**Escopo:** O sistema ja tem `PropertyContext` no frontend e `property_id` no backend,
mas a maioria dos endpoints assume uma unica propriedade (`property_id=1` como default).
**O que fazer:** Garantir que todos os endpoints exigem `property_id` explicito,
e o frontend usa o `propertyId` do PropertyContext em todas as chamadas API.
**Arquivo critico:** `frontend/src/contexts/PropertyContext.jsx`

#### B3. Export de dados (CSV/Excel)
**Escopo:** Exportar reservas, estatisticas e relatorios em CSV/Excel.
**Novo endpoint:** `GET /api/v1/export/bookings?format=csv&property_id=1`
**Biblioteca:** `openpyxl` para Excel (adicionar ao requirements.txt)

---

## Padroes de Codigo (OBRIGATORIO seguir)

### Python Backend
- Datas: `datetime.now(timezone.utc).replace(tzinfo=None)` — NUNCA `datetime.utcnow()`
- Erros ao cliente: mensagens genericas, NUNCA `str(e)` no response
- Logger: `from app.utils.logger import get_logger; logger = get_logger(__name__)`
- Validacao: Pydantic schemas com `extra="forbid"` para prevenir mass assignment
- Novos endpoints de auth: adicionar em `app/api/v1/auth.py`
- Novos routers de features: adicionar em `app/routers/`

### React Frontend
- Auth: `import { useAuth } from '../contexts/AuthContext'` — sempre verificar isAuthenticated
- API calls: sempre usar as funcoes exportadas de `frontend/src/services/api.js`
- Para novos grupos de endpoints: adicionar objeto `nomeAPI` em `api.js`
- Routing: adicionar novo case no switch em `frontend/src/App.jsx` (AppContent.renderPage)
- Sidebar: adicionar item no array `menuItems` em `frontend/src/components/Sidebar.jsx`
- CSS: usar classes globais de `frontend/src/styles/global.css` — nao reinventar

### Seguranca (nao regredir)
- Nenhum endpoint novo deve vazar detalhes de excecao
- Endpoints que retornam dados sensiveis devem ter `Depends(get_current_active_user)`
- Endpoints admin devem ter `Depends(get_current_admin_user)`
- Templates email: sempre usar `SandboxedEnvironment` (ja configurado no `email_service.py`)

---

## Como Rodar para Testar

```bash
# Instalar dependencias Python
pip install -r requirements.txt

# Rodar backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Rodar testes (em outro terminal)
python -m pytest tests/ -v

# Rodar frontend
cd frontend && npm install && npm run dev

# Primeiro acesso: acessar http://localhost:5173
# A tela de login detecta automaticamente se e primeiro setup
# Criar conta admin via UI ou: python scripts/create_default_admin.py
```

---

## Arquivos que NAO Devem Ser Modificados Sem Necessidade

- `electron/preload.js` — context bridge seguro, qualquer mudanca afeta seguranca
- `app/middleware/auth.py` — middleware JWT critico
- `app/middleware/csrf.py` — protecao CSRF
- `app/core/validators.py` — validators de seguranca (XSS, path traversal, SSTI)
- `app/core/security.py` — criacao/verificacao de tokens JWT

---

## Regras de Commit

- Branch: `feature/electron-migration`
- Prefixos: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- Mensagens em ingles
- Um commit por mudanca logica
- Nunca commitar: `.env`, `data/`, `python-dist/`, `release/`, `node_modules/`
