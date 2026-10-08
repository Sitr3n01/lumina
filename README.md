<div align="center">

# LUMINA

### Sistema de Gestão de Apartamentos para Airbnb e Booking.com

**Aplicativo Desktop Windows · Alpha A.0.1.0**

[![Release](https://img.shields.io/github/v/release/Sitr3n01/lumina?label=release&color=blue)](https://github.com/Sitr3n01/lumina/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](https://github.com/Sitr3n01/lumina/releases)
[![Python](https://img.shields.io/badge/python-3.11%2B-yellow)](https://www.python.org/)
[![Electron](https://img.shields.io/badge/electron-29-47848F)](https://www.electronjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## Status

Release Alpha A.0.1.0, distribuída como instalador Windows: backend, banco e interface rodam na máquina do usuário, sem servidor externo. O repositório está em desenvolvimento ativo — as faixas de versão planejadas estão no [Roadmap](#roadmap).

---

> Aplicativo desktop **all-in-one** para proprietários no Airbnb e Booking.com. Sincroniza calendários iCal, detecta conflitos entre plataformas, gera documentos de condomínio em `.docx`, envia notificações por Telegram e e-mail, e exibe um dashboard com ocupação e receita — tudo rodando **localmente**, sem servidores externos.

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| Calendário | Sincronização automática via iCal (Airbnb + Booking.com) a cada 30 minutos |
| Conflitos | Detecção automática de sobreposições entre plataformas com resolução manual |
| Dashboard | Visão geral com ocupação mensal, receita, próximos check-ins e alertas |
| Documentos | Geração de autorização de condomínio em `.docx` com logo personalizado |
| E-mail | Confirmação de reservas e lembretes de check-in automáticos (Gmail, Outlook, Yahoo) |
| Telegram | Notificações em tempo real e aprovação de reservas via bot |
| Inteligência Artificial | Sugestões de precificação e assistente de chat via Anthropic Claude / OpenAI |
| Notificações | Central de alertas persistida com polling do system tray |
| Configurações | Painel completo com edição via UI (sem precisar editar arquivos) |

---

## Download e Instalação

### Para Usuários (Windows 10/11)

1. Acesse a página de [**Releases**](https://github.com/Sitr3n01/lumina/releases)
2. Baixe o arquivo `LUMINA-Setup-A.0.1.0.exe`
3. Execute o instalador e siga as instruções
4. Na primeira execução, o **Wizard de Configuração** abrirá automaticamente

> **Nota:** O LUMINA é um aplicativo desktop autossuficiente — o backend Python roda localmente, sem servidores externos.

---

## Arquitetura

LUMINA é composto por três camadas integradas:

- **Electron Shell** — main process, IPC, gerenciamento do subprocesso Python, tray, auto-update
- **Frontend (React 18 + Vite)** — 10 páginas, state-based routing, JWT auth via AuthContext
- **Backend (FastAPI + SQLAlchemy)** — ~45 endpoints REST em 11 routers, SQLite, sync iCal, IA multi-provider

Diagramas detalhados, estrutura de diretórios completa e decisões de design: [`docs/architecture/ARQUITETURA_GERAL.md`](docs/architecture/ARQUITETURA_GERAL.md).

A API REST documentada com Swagger UI está disponível em `http://127.0.0.1:<porta>/docs` com o backend rodando. Referência completa: [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md).

---

## Segurança

O projeto passou por uma **revisão interna de segurança** com correções aplicadas. Principais medidas implementadas:

- JWT (HS256) com blacklist server-side + bcrypt + account lockout (5 tentativas, 15 min)
- Rate limiting via `slowapi` e proteção CSRF via middleware
- Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- Validação de inputs contra XSS, path traversal e SSTI (Server-Side Template Injection)
- Jinja2 `SandboxedEnvironment` em templates de e-mail
- Electron com `nodeIntegration: false`, `contextIsolation: true` e `will-navigate` bloqueado
- Registro invite-only (modelo de único administrador)
- Proteção IDOR nos endpoints de documentos

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Desktop Shell | Electron 29, electron-builder |
| Backend | Python 3.11+, FastAPI 0.115+, SQLAlchemy 2.0, SQLite |
| Frontend | React 18, Vite 5, Axios, Recharts, Lucide React |
| Autenticação | JWT (HS256) + blacklist in-memory + Bcrypt |
| E-mail | aiosmtplib + aioimaplib, Jinja2 SandboxedEnvironment |
| Calendário | icalendar + parsing customizado por plataforma |
| Documentos | python-docx |
| AI | Anthropic Claude, OpenAI, providers compatíveis |
| Telegram | pyTelegramBotAPI |
| Distribuição | PyInstaller (backend), electron-builder (instalador `.exe`) |
| Testes | pytest, TestClient (FastAPI), SQLite in-memory |

---

## Desenvolvimento

### Pré-requisitos

- Windows 10/11
- Python 3.11+
- Node.js 20+

### Setup rápido

```bash
git clone https://github.com/Sitr3n01/lumina.git
cd lumina

python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

npm install
cd frontend && npm install && cd ..

copy .env.example .env
# Edite .env: SECRET_KEY, credenciais de e-mail, iCal URLs, etc.

npm run dev
```

`npm run dev` inicia backend, frontend Vite e Electron em paralelo. Setup detalhado, troubleshooting e variáveis de configuração: [`docs/development/setup.md`](docs/development/setup.md).

Gerar `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Testes

```bash
python -m pytest tests/ -v
```

Cobertura atual: 35 testes (endpoints de autenticação, middleware JWT, reservas, conflitos, documentos, parser de plataformas).

---

## Roadmap

| Versão | Foco |
|--------|------|
| **A.0.1.0** (atual) | Release inicial — todas as funcionalidades core |
| **A.0.2.0** | Otimizações de UX, multi-propriedade, testes E2E |
| **A.0.3.0** | Integração Gmail API, importação de histórico, exportação |
| **Beta** | Cobertura de testes 80%+, CI/CD, code signing |

Roadmap completo: [`docs/roadmap.md`](docs/roadmap.md).

---

## Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
3. Siga as convenções do projeto descritas no README e na documentação de arquitetura
4. Escreva testes para sua mudança quando aplicável
5. Abra um Pull Request

Bugs e pedidos de feature: [Issues](https://github.com/Sitr3n01/lumina/issues).

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [`docs/development/setup.md`](docs/development/setup.md) | Guia completo de setup para desenvolvimento |
| [`docs/LUMINA_PROJECT_STATE.md`](docs/LUMINA_PROJECT_STATE.md) | Estado completo do projeto, arquitetura, módulos |
| [`docs/architecture/API_DOCUMENTATION.md`](docs/architecture/API_DOCUMENTATION.md) | Documentação completa da API REST |
| [`docs/architecture/ARQUITETURA_GERAL.md`](docs/architecture/ARQUITETURA_GERAL.md) | Decisões de arquitetura, diagramas e estrutura de diretórios |
| [`docs/guides/GUIA_USO_DIARIO.md`](docs/guides/GUIA_USO_DIARIO.md) | Guia de uso diário para usuários finais |
| [`docs/roadmap.md`](docs/roadmap.md) | Roadmap e melhorias planejadas |

---

> **Nota histórica:** Este repositório foi renomeado de `AP_Controller` para `apartment_rental_manager` e, em outubro de 2026, para `lumina`. Links antigos continuam funcionando por redirect do GitHub.

---

## Licença

MIT License. Veja [`LICENSE`](LICENSE) para detalhes.
