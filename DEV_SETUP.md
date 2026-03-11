# LUMINA — Guia de Instalação e Desenvolvimento

> Versão A.0.1.0 — Alpha Desktop
> Plataforma: **Windows 10/11 x64**

---

## Escolha seu perfil

| Perfil | O que você quer | Vá para |
|--------|----------------|---------|
| 🧪 **Beta Tester** | Rodar o app sem configurar nada | [Instalação Rápida](#-instalação-rápida-beta-tester) |
| 🛠️ **Contribuidor / Dev** | Editar código e ver mudanças ao vivo | [Setup de Desenvolvimento](#-setup-de-desenvolvimento) |

---

## 🧪 Instalação Rápida (Beta Tester)

### Pré-requisitos
- Windows 10 ou 11 (64-bit)
- Nenhum outro software necessário

### Passos
1. Acesse a página de [Releases](https://github.com/Sitr3n01/AP_Controller/releases)
2. Baixe o arquivo `LUMINA-Setup-A.0.1.0.exe` (ou `.zip` portátil)
3. Execute o instalador e siga os passos
4. Na primeira execução, o **Wizard de Configuração** abrirá automaticamente para guiar você pela configuração inicial

> **Nota Alpha:** Esta é uma versão de testes. Recomendamos manter backups dos seus dados. Relate bugs em [Issues](https://github.com/Sitr3n01/AP_Controller/issues).

---

## 🛠️ Setup de Desenvolvimento

### Pré-requisitos

| Ferramenta | Versão Mínima | Download |
|-----------|--------------|---------|
| Python | 3.11+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| Git | qualquer | [git-scm.com](https://git-scm.com/) |

Verifique as versões instaladas:
```bash
python --version    # Python 3.11+
node --version      # v20+
npm --version       # 10+
```

---

### 1. Clonar o repositório

```bash
git clone https://github.com/Sitr3n01/AP_Controller.git
cd AP_Controller
```

---

### 2. Configurar o Backend (Python / FastAPI)

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar (Windows)
venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt
```

---

### 3. Configurar o Frontend (React / Vite)

```bash
cd frontend
npm install
cd ..
```

---

### 4. Configurar o Electron

```bash
# Na raiz do projeto
npm install
```

---

### 5. Criar arquivo `.env`

Copie o arquivo de exemplo e preencha com seus dados:

```bash
copy .env.example .env
```

Edite `.env` com as configurações mínimas para rodar:

```env
# Obrigatório para iniciar
SECRET_KEY=gere_uma_chave_com_python_secrets_token_urlsafe_32
LUMINA_DESKTOP=true

# Dados do seu imóvel
PROPERTY_NAME=Meu Apartamento
PROPERTY_ADDRESS=Rua Exemplo, 100, Ap 101
CONDO_NAME=Nome do Condomínio

# URLs dos calendários iCal (obter no Airbnb/Booking)
AIRBNB_ICAL_URL=https://www.airbnb.com.br/calendar/ical/SEU_ID.ics?s=SEU_TOKEN
BOOKING_ICAL_URL=https://ical.booking.com/v1/export?t=SEU_TOKEN
```

Gerar uma `SECRET_KEY` segura:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

### 6. Iniciar em modo de desenvolvimento

Você tem duas opções:

#### Opção A — Tudo junto (recomendado)

Um único comando inicia backend, frontend e Electron em paralelo:

```bash
npm run dev
```

> O script aguarda o backend (porta 8000) e o frontend (porta 5173) estarem prontos antes de abrir o Electron.

#### Opção B — Processos separados (para debug)

**Terminal 1 — Backend Python:**
```bash
# Ativar venv primeiro
venv\Scripts\activate

# Iniciar FastAPI
npm run dev:python
# Equivalente a: cross-env LUMINA_DESKTOP=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend React:**
```bash
npm run dev:frontend
# Equivalente a: cd frontend && npm run dev
```

**Terminal 3 — Electron:**
```bash
npm run dev:electron
# Abre o Electron conectando ao backend e frontend já rodando
```

---

### 7. Criar o primeiro usuário admin

Na **primeira execução**, o Wizard de Configuração cria o admin automaticamente.

Se precisar criar via terminal (sem UI):
```bash
# Com venv ativado
python scripts/create_default_admin.py
```

---

### 8. Acessar a API diretamente

Com o backend rodando, acesse:
- **Swagger UI (docs interativos):** http://127.0.0.1:8000/docs
- **ReDoc:** http://127.0.0.1:8000/redoc

---

## 🧪 Rodando os Testes

```bash
# Com venv ativado
python -m pytest tests/ -v

# Apenas um módulo
python -m pytest tests/test_auth_endpoints.py -v

# Com cobertura
python -m pytest tests/ -v --cov=app --cov-report=term-missing
```

---

## 📦 Build do Executável (Distribuição)

> **Atenção:** O build gera um instalador Windows (.exe). Requer Python 3.11 e Node.js 20+.

```bash
# 1. Build do frontend
cd frontend && npm run build && cd ..

# 2. Empacotar backend com PyInstaller
pyinstaller lumina.spec --clean

# 3. Build do Electron + instalador
npm run dist
```

O instalador gerado estará em `release/`.

---

## 🗂️ Estrutura do Projeto

```
AP_Controller/
  app/                  # Backend FastAPI (Python)
    api/v1/             # Endpoints auth, health
    core/               # Sync, conflict detection, security
    middleware/         # JWT, CSRF, security headers
    models/             # SQLAlchemy models
    routers/            # Endpoints por módulo
    services/           # Lógica de negócio
    telegram/           # Bot Telegram (opcional)
  frontend/             # React 18 + Vite
    src/
      components/       # Calendar, Sidebar, ErrorBoundary
      contexts/         # AuthContext, PropertyContext
      pages/            # 10 páginas da aplicação
      services/api.js   # Axios HTTP client
  electron/             # Electron (process principal)
    main.js             # Entry point + splash + wizard
    preload.js          # Context bridge (APIs expostas ao frontend)
    python-manager.js   # Spawn + health check do backend Python
    ipc-handlers.js     # Handlers IPC (system, update, factory reset)
  tests/                # Testes pytest (SQLite in-memory)
  docs/                 # Documentação técnica
  scripts/              # Utilitários (create_admin, reset_dev_state)
```

---

## 🐛 Problemas Comuns

| Problema | Solução |
|----------|---------|
| `LUMINA_DESKTOP must be true` | Verifique se `.env` tem `LUMINA_DESKTOP=true` |
| Electron abre mas tela branca | Backend ainda iniciando — aguarde o splash concluir |
| `ModuleNotFoundError` no Python | Execute `pip install -r requirements.txt` com venv ativo |
| Porta 8000 em uso | Mude `LUMINA_DEV_BACKEND_PORT` no `.env` ou finalize o processo na porta |
| Wizard não aparece | Delete o `.env` de `%APPDATA%\lumina-desktop\` para forçar primeiro setup |
| Reset completo em dev | Execute `scripts\reset_dev_state.bat` |

---

## 📋 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia tudo (backend + frontend + Electron) |
| `npm run dev:python` | Apenas backend FastAPI |
| `npm run dev:frontend` | Apenas frontend Vite |
| `npm run dev:electron` | Apenas Electron (requer os outros rodando) |
| `npm run build` | Build frontend de produção |
| `npm run dist` | Gera instalador Windows |
| `python -m pytest tests/ -v` | Roda todos os testes |
| `python scripts/create_default_admin.py` | Cria usuário admin padrão |
| `scripts\reset_dev_state.bat` | Reseta estado de dev (DB, .env, pending-admin) |

---

## 🔗 Links Úteis

- [Documentação da API](docs/architecture/API_DOCUMENTATION.md)
- [Estado do Projeto](docs/LUMINA_PROJECT_STATE.md)
- [Oportunidades de Melhoria](IMPROVEMENTS.md)
- [Issues / Bug Reports](https://github.com/Sitr3n01/AP_Controller/issues)
- [Releases](https://github.com/Sitr3n01/AP_Controller/releases)
