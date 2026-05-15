<div align="center">

# LUMINA

### Sistema de Gestao de Apartamentos para Airbnb e Booking.com

**Aplicativo Desktop Windows · Alpha A.0.1.0**

[![Release](https://img.shields.io/github/v/release/Sitr3n01/apartment_rental_manager?label=release&color=blue)](https://github.com/Sitr3n01/apartment_rental_manager/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](https://github.com/Sitr3n01/apartment_rental_manager/releases)
[![Python](https://img.shields.io/badge/python-3.11%2B-yellow)](https://www.python.org/)
[![Electron](https://img.shields.io/badge/electron-29-47848F)](https://www.electronjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

> Aplicativo desktop **all-in-one** para proprietarios no Airbnb e Booking.com. Sincroniza calendarios iCal, detecta conflitos entre plataformas, gera documentos de condominio em `.docx`, envia notificacoes por Telegram e e-mail, e exibe um dashboard com ocupacao e receita — tudo rodando **localmente**, sem servidores externos.

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
| Configuracoes | Painel completo com edicao via UI (sem precisar editar arquivos) |

---

## Download e Instalacao

### Para Usuarios (Windows 10/11)

1. Acesse a pagina de [**Releases**](https://github.com/Sitr3n01/apartment_rental_manager/releases)
2. Baixe o arquivo `LUMINA-Setup-A.0.1.0.exe`
3. Execute o instalador e siga as instrucoes
4. Na primeira execucao, o **Wizard de Configuracao** abrira automaticamente

> **Nota:** O LUMINA e um aplicativo desktop autossuficiente — o backend Python roda localmente, sem servidores externos.

---

## Arquitetura

LUMINA e composto por tres camadas integradas:

- **Electron Shell** — main process, IPC, gerenciamento do subprocesso Python, tray, auto-update
- **Frontend (React 18 + Vite)** — 10 paginas, state-based routing, JWT auth via AuthContext
- **Backend (FastAPI + SQLAlchemy)** — ~45 endpoints REST em 11 routers, SQLite, sync iCal, IA multi-provider

Diagramas detalhados, estrutura de diretorios completa e decisoes de design: [`docs/architecture/ARQUITETURA_GERAL.md`](docs/architecture/ARQUITETURA_GERAL.md).

A API REST documentada com Swagger UI esta disponivel em `http://127.0.0.1:<porta>/docs` com o backend rodando. Referencia completa: [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md).

---

## Seguranca

O projeto passou por uma **revisao interna de seguranca** com correcoes aplicadas. Principais medidas implementadas:

- JWT (HS256) com blacklist server-side + bcrypt + account lockout (5 tentativas, 15 min)
- Rate limiting via `slowapi` e protecao CSRF via middleware
- Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- Validacao de inputs contra XSS, path traversal e SSTI (Server-Side Template Injection)
- Jinja2 `SandboxedEnvironment` em templates de e-mail
- Electron com `nodeIntegration: false`, `contextIsolation: true` e `will-navigate` bloqueado
- Registro invite-only (modelo de unico administrador)
- Protecao IDOR nos endpoints de documentos

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
| Distribuicao | PyInstaller (backend), electron-builder (instalador `.exe`) |
| Testes | pytest, TestClient (FastAPI), SQLite in-memory |

---

## Desenvolvimento

### Pre-requisitos

- Windows 10/11
- Python 3.11+
- Node.js 20+

### Setup rapido

```bash
git clone https://github.com/Sitr3n01/apartment_rental_manager.git
cd apartment_rental_manager

python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

npm install
cd frontend && npm install && cd ..

copy .env.example .env
# Edite .env: SECRET_KEY, credenciais de e-mail, iCal URLs, etc.

npm run dev
```

`npm run dev` inicia backend, frontend Vite e Electron em paralelo. Setup detalhado, troubleshooting e variaveis de configuracao: [`docs/development/setup.md`](docs/development/setup.md).

Gerar `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Testes

```bash
python -m pytest tests/ -v
```

Cobertura atual: 35 testes (autenticacao, middleware JWT, parser de plataformas).

---

## Roadmap

| Versao | Foco |
|--------|------|
| **A.0.1.0** (atual) | Release inicial — todas as funcionalidades core |
| **A.0.2.0** | Otimizacoes de UX, multi-propriedade, testes E2E |
| **A.0.3.0** | Integracao Gmail API, importacao de historico, exportacao |
| **Beta** | Cobertura de testes 80%+, CI/CD, code signing |

Roadmap completo: [`docs/roadmap.md`](docs/roadmap.md).

---

## Contribuindo

1. Fork o repositorio
2. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
3. Siga as convencoes do projeto descritas no README e na documentacao de arquitetura
4. Escreva testes para sua mudanca quando aplicavel
5. Abra um Pull Request

Bugs e pedidos de feature: [Issues](https://github.com/Sitr3n01/apartment_rental_manager/issues).

---

## Documentacao

| Documento | Descricao |
|-----------|-----------|
| [`docs/development/setup.md`](docs/development/setup.md) | Guia completo de setup para desenvolvimento |
| [`docs/LUMINA_PROJECT_STATE.md`](docs/LUMINA_PROJECT_STATE.md) | Estado completo do projeto, arquitetura, modulos |
| [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md) | Documentacao completa da API REST |
| [`docs/architecture/ARQUITETURA_GERAL.md`](docs/architecture/ARQUITETURA_GERAL.md) | Decisoes de arquitetura, diagramas e estrutura de diretorios |
| [`docs/guides/GUIA_USO_DIARIO.md`](docs/guides/GUIA_USO_DIARIO.md) | Guia de uso diario para usuarios finais |
| [`docs/roadmap.md`](docs/roadmap.md) | Roadmap e melhorias planejadas |

---

> **Nota historica:** Este repositorio foi renomeado de `AP_Controller` para `apartment_rental_manager`. Links antigos continuam funcionando por redirect do GitHub.

---

## Licenca

MIT License. Veja [`LICENSE`](LICENSE) para detalhes.
