# PLANO UNIVERSAL - Migracao LUMINA para Electron Desktop

> **Leia este documento antes de qualquer implementacao.**
> Este e o documento de referencia compartilhado entre todos os agentes (Claude e Gemini).
> Ultima atualizacao: 2026-02-19

---

## 1. Visao Geral

### O que e o LUMINA
Sistema de gestao automatizada para apartamentos de aluguel de curta temporada (Airbnb, Booking.com). Funcionalidades: sincronizacao de calendarios, deteccao de conflitos, geracao de documentos, envio de emails, notificacoes, dashboard de estatisticas.

### Objetivo da Migracao
Transformar o LUMINA de uma aplicacao web (que requer conhecimento tecnico para rodar) em um aplicativo desktop Windows com instalador, wizard de configuracao e atualizacoes automaticas - acessivel para usuarios que nao sabem programacao.

### Resultado Esperado
- Instalador `.exe` Windows (~117 MB)
- Wizard de configuracao na primeira execucao
- Backend Python rodando em background automaticamente
- Icone na bandeja do sistema
- Atualizacoes automaticas via GitHub Releases

---

## 2. Arquitetura

### Atual (Web)
```
[Browser] → [Vite :5173] → proxy /api → [FastAPI :8000] → [SQLite]
```

### Alvo (Electron Desktop)
```
[Electron Main Process]
  ├─ [BrowserWindow] ← frontend/dist/index.html
  │    └─ [React App] ── HTTP :porta ──→ [FastAPI PyInstaller]
  ├─ [Python Manager] → spawn/monitor Python
  ├─ [Tray Icon] → bandeja do sistema
  ├─ [IPC Bridge] → main ↔ renderer
  └─ [Auto Updater] → GitHub Releases
```

### Fluxo de Dados no Modo Desktop
1. Electron inicia → encontra porta livre → spawn Python com a porta
2. Python (FastAPI) sobe → health check OK
3. Electron carrega `frontend/dist/index.html` no BrowserWindow
4. React detecta `window.electronAPI` → usa URL dinamica para API
5. Todas as chamadas HTTP vao para `http://127.0.0.1:{porta}/api/...`
6. Dados persistem em `%APPDATA%/lumina/data/lumina.db`

---

## 3. Stack Tecnologica

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Desktop Shell | Electron | latest |
| Build/Installer | electron-builder + NSIS | latest |
| Auto-update | electron-updater | latest |
| Logging (Electron) | electron-log | latest |
| Backend Framework | FastAPI | 0.115+ |
| Backend Server | Uvicorn | 0.32+ |
| ORM | SQLAlchemy | 2.0+ |
| Database | SQLite | embedded |
| Python Bundler | PyInstaller | latest |
| Frontend Framework | React | 18.3.1 |
| Build Tool | Vite | 5.1.4 |
| HTTP Client | Axios | 1.6.7 |
| Charts | Recharts | 3.7.0 |
| Icons | Lucide-react | 0.344.0 |

---

## 4. Mapa de Arquivos

### Arquivos a CRIAR

| Arquivo | Responsavel | Fase | Descricao |
|---------|-------------|------|-----------|
| `package.json` (raiz) | Claude | 1 | Manifesto Electron |
| `electron-builder.yml` | Gemini | 1,6 | Config instalador |
| `electron/main.js` | Claude | 1 | Processo principal |
| `electron/preload.js` | Claude | 1 | Context bridge |
| `electron/splash.html` | Claude | 1 | Tela de loading |
| `electron/python-manager.js` | Claude | 2 | Gerenciador Python |
| `electron/ipc-handlers.js` | Claude | 4 | Handlers IPC |
| `electron/tray.js` | Claude | 4 | Bandeja do sistema |
| `electron/updater.js` | Claude | 4 | Auto-atualizacao |
| `electron/wizard/wizard.html` | Claude | 5 | UI do wizard |
| `electron/wizard/wizard.js` | Claude | 5 | Logica do wizard |
| `electron/wizard/wizard.css` | Claude | 5 | Estilo do wizard |
| `electron/wizard/wizard-preload.js` | Claude | 5 | Preload wizard |
| `electron/assets/icon.ico` | - | 1 | Icone Windows |
| `electron/assets/tray-icon.png` | - | 4 | Icone bandeja |
| `run_backend.py` | Claude | 2 | Entry point PyInstaller |
| `lumina.spec` | Claude | 2 | Config PyInstaller |

### Arquivos a MODIFICAR

| Arquivo | Responsavel | Fase | Mudanca |
|---------|-------------|------|---------|
| `app/config.py` | Claude | 2 | LUMINA_ENV_FILE, LUMINA_DATA_DIR, APP_ENV=desktop |
| `app/main.py` | Claude | 2 | Shutdown endpoint, relaxar rate limits, CORS desktop |
| `frontend/src/services/api.js` | Gemini | 3 | Base URL dinamica |
| `frontend/src/pages/Documents.jsx` | Gemini | 3 | Dialogos nativos |
| `frontend/src/pages/Dashboard.jsx` | Gemini | 3 | Substituir alert() |
| `frontend/vite.config.js` | Gemini | 3 | `base: './'` |
| `.gitignore` | Claude | 1 | python-dist/, release/ |

---

## 5. Protocolo de Trabalho entre Agentes

### Branch Strategy
```
main
  └─ feature/electron-migration    ← branch principal da migracao
       ├─ claude/electron-core     ← trabalho do Claude (Fase 1,2,4,5)
       └─ gemini/frontend-adapt    ← trabalho do Gemini (Fase 3,6,7)
```

### Regras de Merge
1. Cada agente trabalha na sua branch
2. Merge para `feature/electron-migration` quando uma fase completa estiver funcional
3. Merge para `main` apenas quando toda a migracao estiver funcional

### Comunicacao entre Agentes
Os agentes sincronizam via:
1. **Este documento** (`docs/PLANO_UNIVERSAL.md`) - status geral atualizado
2. **Commits** - cada commit descreve o que foi feito
3. **Checklist abaixo** - marcar itens conforme completados

### Ordem de Dependencias
```
Claude: Fase 1 (Scaffolding) ← PRIMEIRO, Gemini depende disto
  ↓
Claude: Fase 2 (Python) | Gemini: Fase 3 (Frontend) ← PARALELO
  ↓
Claude: Fase 4 (IPC) ← depende de Fase 1
  ↓
Claude: Fase 5 (Wizard) ← depende de Fase 2 + 4
  ↓
Gemini: Fase 6 (Installer) ← depende de TODAS as fases anteriores
  ↓
Gemini: Fase 7 (DX) ← pode comecar em paralelo com Fase 1
  ↓
Ambos: Fase 8 (Testes) ← apos tudo
```

**IMPORTANTE:** Gemini NAO deve comecar a Fase 3 antes que Claude complete a Fase 1 (o `electron/preload.js` define a API `window.electronAPI` que o frontend precisa conhecer).

---

## 6. Checklist de Progresso

### Fase 1: Scaffolding Electron
- [ ] `package.json` raiz criado com dependencias Electron
- [ ] `electron/main.js` funcional (cria janela, carrega HTML)
- [ ] `electron/preload.js` com `contextBridge` basico
- [ ] `electron/splash.html` com tela de loading
- [ ] `electron-builder.yml` com config basica
- [ ] `.gitignore` atualizado

### Fase 2: Python Bundling
- [ ] `run_backend.py` criado e testado
- [ ] `lumina.spec` criado e testado
- [ ] `electron/python-manager.js` funcional (start/stop/health check)
- [ ] `app/config.py` suporta LUMINA_DATA_DIR e LUMINA_ENV_FILE
- [ ] `app/main.py` tem endpoint shutdown e suporte LUMINA_DESKTOP
- [ ] PyInstaller gera executavel funcional

### Fase 3: Frontend Adaptation
- [ ] `api.js` com base URL dinamica
- [ ] `Documents.jsx` com downloads nativos Electron
- [ ] `Documents.jsx` com confirm dialog nativo
- [ ] `Dashboard.jsx` sem alert()
- [ ] `vite.config.js` com `base: './'`
- [ ] Todas as paginas funcionam no Electron
- [ ] Compatibilidade web mantida

### Fase 4: IPC + Features Nativas
- [ ] `electron/ipc-handlers.js` com todos os canais
- [ ] `electron/tray.js` funcional
- [ ] `electron/updater.js` configurado
- [ ] Notificacoes nativas funcionando
- [ ] Fechar janela = minimizar para bandeja

### Fase 5: Setup Wizard
- [ ] Wizard detecta primeira execucao
- [ ] 7 passos navegaveis
- [ ] Validacao de campos
- [ ] Teste de URL iCal funcional
- [ ] Teste de conexao email funcional
- [ ] .env gerado corretamente
- [ ] Usuario admin criado
- [ ] App inicia apos wizard

### Fase 6: Installer
- [ ] electron-builder.yml completo
- [ ] NSIS gera instalador funcional
- [ ] Atalhos desktop/menu criados
- [ ] Desinstalacao limpa
- [ ] Auto-update configurado

### Fase 7: Developer Experience
- [ ] `npm run dev` inicia 3 processos
- [ ] Hot reload funciona (React + Python)
- [ ] Debug configs documentados

### Fase 8: Testes
- [ ] Fresh install testado
- [ ] Wizard testado end-to-end
- [ ] Crash recovery testado
- [ ] Download de documentos testado
- [ ] Fechar/reabrir via tray testado

---

## 7. Environment Variables - Modo Desktop

Quando `LUMINA_DESKTOP=true`, o backend se comporta diferente:

| Variavel | Valor Desktop | Efeito |
|----------|--------------|--------|
| `LUMINA_DESKTOP` | `true` | Ativa modo desktop |
| `LUMINA_DATA_DIR` | `%APPDATA%/lumina` | Diretorio base para dados |
| `LUMINA_ENV_FILE` | `%APPDATA%/lumina/.env` | Localizacao do .env |
| `APP_ENV` | `desktop` | Ambiente desktop |
| `DATABASE_URL` | `sqlite:///%APPDATA%/lumina/data/lumina.db` | Banco no AppData |
| `TEMPLATE_DIR` | `{resources}/templates` | Templates bundled |
| `OUTPUT_DIR` | `%APPDATA%/lumina/data/generated_docs` | Docs gerados |
| `CORS_ORIGINS` | `*` | CORS aberto (localhost only) |
| `RATE_LIMIT_ENABLED` | `false` | Sem rate limiting |
| `SECRET_KEY` | Auto-gerada | Gerada no primeiro run |

---

## 8. IPC Channels - Contrato

Estes sao os canais IPC que o `preload.js` expoe via `window.electronAPI`:

```typescript
interface ElectronAPI {
  // Backend
  getBackendUrl(): Promise<string>;           // "http://127.0.0.1:8742"
  restartBackend(): Promise<void>;
  getBackendStatus(): Promise<{ running: boolean; port: number; pid: number }>;

  // Dialogs
  saveFile(options: {
    defaultPath: string;
    filters: Array<{ name: string; extensions: string[] }>;
    data: number[];  // Uint8Array as regular array
  }): Promise<{ success: boolean; path?: string }>;

  showConfirmDialog(options: {
    title: string;
    message: string;
    buttons: string[];
    defaultId?: number;
    cancelId?: number;
  }): Promise<boolean>;

  // Notifications
  showNotification(title: string, body: string): Promise<void>;

  // App Info
  getAppVersion(): Promise<string>;
  getAppPath(): Promise<string>;

  // Window
  minimize(): void;
  close(): void;

  // Events (main → renderer)
  onBackendReady(callback: () => void): void;
  onBackendError(callback: (error: string) => void): void;
  onUpdateAvailable(callback: (info: UpdateInfo) => void): void;

  // Updates
  installUpdate(): Promise<void>;
}
```

---

## 9. Glossario

| Termo | Significado |
|-------|-------------|
| Main Process | Processo Node.js do Electron (acesso ao OS) |
| Renderer Process | Processo do BrowserWindow (React app) |
| Preload Script | Bridge entre main e renderer (contextBridge) |
| IPC | Inter-Process Communication (Electron) |
| PyInstaller | Empacotador Python → executavel standalone |
| NSIS | Nullsoft Scriptable Install System (instalador Windows) |
| electron-builder | Ferramenta de build/empacotamento para Electron |
| electron-updater | Biblioteca de auto-atualizacao |
| AppData | `%APPDATA%` - diretorio de dados do usuario no Windows |
| Resources | Diretorio de recursos bundled no app Electron |

---

## 10. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| SmartScreen bloqueia instalador | Alto | Code signing (SSL.com ou Certum) |
| Antivirus flagra PyInstaller exe | Alto | Code signing + exclusao no NSIS |
| Porta 8000 ocupada | Medio | Porta dinamica (ja no plano) |
| SQLite lock por processo duplo | Medio | Verificar instancia unica |
| PyInstaller hidden imports | Medio | Testar build frequentemente |
| Caminhos longos no Windows | Baixo | Manter nomes curtos |
| CORS com file:// | Baixo | CORS `*` no modo desktop |

---

## 11. Plano de Implementacao

O plano de implementacao com tarefas atomicas esta em: `docs/PLANO_IMPLEMENTACAO.md`

Contem:
- 32+ tarefas atomicas numeradas (T0.1 a T8.4)
- Distribuicao por agente (Claude: 28 tarefas, Gemini: 10 tarefas)
- Dependencias explicitas entre tarefas
- Codigo de referencia para cada modificacao
- Criterios de aceite para cada tarefa
- Diagrama de dependencias visual

---

*Este documento deve ser atualizado conforme as fases sao completadas.*
