# PLANO DE IMPLEMENTACAO - LUMINA Electron Desktop

> Documento operacional com tarefas atomicas para cada agente.
> Referencia: `docs/PLANO_UNIVERSAL.md` (arquitetura e contrato IPC)
> Criado: 2026-02-19

---

## Como usar este documento

Cada tarefa e atomica: pode ser executada independentemente e resulta em codigo funcional que pode ser commitado. As tarefas estao numeradas sequencialmente dentro de cada fase, com dependencias explicitas.

**Legenda:**
- `[CLAUDE]` = Agente Claude (Electron + Python backend)
- `[GEMINI]` = Agente Gemini (Frontend + Build + DX)
- `[BLOQUEIO]` = Tarefa anterior precisa estar completa antes
- `[PARALELO]` = Pode ser feita ao mesmo tempo que a anterior

**Formato de cada tarefa:**
```
ID | Agente | Arquivo(s) | O que fazer | Criterio de aceite
```

---

## FASE 0: Preparacao (antes de tudo)

### T0.1 [CLAUDE] Atualizar .gitignore
**Arquivo:** `.gitignore`
**Acao:** Adicionar ao final do arquivo:
```
# === ELECTRON ===
python-dist/
release/
node_modules/
!frontend/node_modules/
*.exe
*.msi

# === PYINSTALLER ===
lumina-backend/
*.spec.bak
```
**Criterio:** `git status` nao mostra arquivos indesejados

### T0.2 [CLAUDE] Criar branch de trabalho
**Acao:** Criar branch `feature/electron-migration` a partir de `main`
**Criterio:** Branch existe e esta baseada no commit mais recente de main

---

## FASE 1: Scaffolding Electron

### T1.1 [CLAUDE] Criar package.json raiz
**Arquivo:** `package.json` (raiz, NAO e o do frontend)
**Conteudo:**
```json
{
  "name": "lumina-desktop",
  "version": "1.0.0",
  "description": "LUMINA - Apartment Management System",
  "main": "electron/main.js",
  "private": true,
  "scripts": {
    "start": "electron .",
    "dev": "concurrently -n py,react,electron -c yellow,cyan,green \"npm run dev:python\" \"npm run dev:frontend\" \"npm run dev:electron\"",
    "dev:python": "cd . && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:electron": "wait-on http://127.0.0.1:5173 && cross-env ELECTRON_DEV=true electron .",
    "build:frontend": "cd frontend && npm run build",
    "build:python": "pyinstaller --noconfirm lumina.spec",
    "build:electron": "electron-builder --win",
    "dist": "npm run build:python && npm run build:frontend && npm run build:electron"
  },
  "dependencies": {
    "electron-updater": "^6.1.0",
    "electron-log": "^5.1.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "concurrently": "^8.2.0",
    "wait-on": "^7.2.0",
    "cross-env": "^7.0.3"
  }
}
```
**Criterio:** `npm install` (na raiz) completa sem erros

### T1.2 [CLAUDE] Criar electron/preload.js
**Arquivo:** `electron/preload.js`
**Descricao:** Context bridge que expoe `window.electronAPI` ao renderer.
Implementar TODAS as funcoes do contrato IPC definido em `docs/PLANO_UNIVERSAL.md` secao 8:
- `getBackendUrl()` → `ipcRenderer.invoke('backend:getUrl')`
- `restartBackend()` → `ipcRenderer.invoke('backend:restart')`
- `getBackendStatus()` → `ipcRenderer.invoke('backend:status')`
- `saveFile(options)` → `ipcRenderer.invoke('dialog:saveFile', options)`
- `showConfirmDialog(options)` → `ipcRenderer.invoke('dialog:confirm', options)`
- `showNotification(title, body)` → `ipcRenderer.invoke('notification:show', title, body)`
- `getAppVersion()` → `ipcRenderer.invoke('app:version')`
- `getAppPath()` → `ipcRenderer.invoke('app:path')`
- `minimize()` → `ipcRenderer.send('window:minimize')`
- `close()` → `ipcRenderer.send('window:close')`
- `onBackendReady(callback)` → `ipcRenderer.on('backend:ready', callback)`
- `onBackendError(callback)` → `ipcRenderer.on('backend:error', callback)`
- `onUpdateAvailable(callback)` → `ipcRenderer.on('update:available', callback)`
- `installUpdate()` → `ipcRenderer.invoke('update:install')`

**Regras:**
- Usar `contextBridge.exposeInMainWorld('electronAPI', { ... })`
- NUNCA `nodeIntegration: true`
- Remover listeners no `removeAllListeners` pattern para evitar memory leaks

**Criterio:** Arquivo sintaticamente correto, exporta todas as funcoes do contrato

### T1.3 [CLAUDE] Criar electron/splash.html
**Arquivo:** `electron/splash.html`
**Descricao:** HTML standalone (sem React) exibido enquanto Python inicia.
- Tela escura com gradiente compativel com LUMINA (usar cores do global.css)
- Logo/nome "LUMINA" centralizado
- Spinner animado CSS puro
- Texto "Iniciando sistema..." com animacao de pontinhos
- Sem dependencias externas (tudo inline: CSS + HTML)
- Dimensoes: 400x300px (frameless window)

**Criterio:** Abre como HTML standalone no browser e mostra animacao

### T1.4 [CLAUDE] Criar electron/main.js (versao minima)
**Arquivo:** `electron/main.js`
**Descricao:** Main process do Electron - versao funcional minima.

**Funcionalidades desta versao:**
1. `app.whenReady()` → cria BrowserWindow
2. Carrega `frontend/dist/index.html` (prod) ou `http://localhost:5173` (dev, via `ELECTRON_DEV` env)
3. Registra preload script
4. `BrowserWindow` config: `width: 1280, height: 800, minWidth: 1024, minHeight: 700`
5. `webPreferences`: `{ preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }`
6. `app.on('window-all-closed')` → `app.quit()` (simplificado, tray vem na Fase 4)
7. DevTools abrem automaticamente quando `ELECTRON_DEV=true`

**NAO incluir nesta versao:** Python manager, tray, IPC handlers, updater (virao em fases seguintes)

**Criterio:** `npx electron .` abre janela; com `ELECTRON_DEV=true` carrega localhost:5173; sem, carrega dist/index.html

### T1.5 [CLAUDE] Criar electron-builder.yml (config basica)
**Arquivo:** `electron-builder.yml`
**Conteudo minimo:**
```yaml
appId: com.lumina.desktop
productName: LUMINA
copyright: Copyright 2024-2026

directories:
  output: release
  buildResources: electron/assets

files:
  - electron/**/*
  - frontend/dist/**/*
  - "!**/*.map"

win:
  target:
    - target: nsis
      arch:
        - x64
  icon: electron/assets/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: LUMINA
```
**Nota:** `extraResources` para python-dist sera adicionado na Fase 2

**Criterio:** Arquivo YAML valido, electron-builder reconhece a config

### T1.6 [CLAUDE] Criar diretorio electron/assets com placeholder
**Acao:** Criar `electron/assets/` e adicionar um `icon.ico` placeholder (pode ser gerado de qualquer PNG 256x256 convertido para .ico, ou um placeholder temporario).

**Criterio:** Diretorio existe com pelo menos um arquivo

### T1.7 [CLAUDE] Verificacao da Fase 1
**Acao:** Executar em sequencia:
1. `npm install` (raiz) → sem erros
2. `cd frontend && npm run build` → gera `frontend/dist/`
3. `npx electron .` → janela abre, carrega `frontend/dist/index.html`
4. Com backend rodando (`python -m uvicorn app.main:app --port 8000`), o app funciona

**Criterio:** App Electron abre e exibe o LUMINA com dados do backend

---

## FASE 2: Python Bundling [BLOQUEIO: T1.4 completa]

### T2.1 [CLAUDE] Modificar app/config.py - suporte desktop
**Arquivo:** `app/config.py`
**Mudancas:**

1. **Novo campo** `LUMINA_DESKTOP: bool = False`

2. **Modificar `model_config`** para suportar env file dinamico:
```python
model_config = SettingsConfigDict(
    env_file=os.environ.get('LUMINA_ENV_FILE', '.env'),
    env_file_encoding="utf-8",
    case_sensitive=True,
    extra="ignore"
)
```
(Requer `import os` no topo)

3. **Modificar `validate_secret_key`** - adicionar `"desktop"` junto com `"development"` e `"testing"` na linha 119:
```python
if env in ["development", "testing", "desktop"]:
```

4. **Modificar `ensure_directories`** - usar `LUMINA_DATA_DIR` como base:
```python
def ensure_directories(self) -> None:
    base = Path(os.environ.get('LUMINA_DATA_DIR', '.'))
    directories = [
        base / "data",
        base / "data" / "downloads",
        base / "data" / "generated_docs",
        base / "data" / "logs",
        base / "data" / "backups",
        Path(self.TEMPLATE_DIR),
    ]
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
```

**Criterio:** Backend inicia normalmente sem LUMINA_DATA_DIR (fallback `.`); com LUMINA_DATA_DIR definido, cria diretorios no caminho especificado

### T2.2 [CLAUDE] Modificar app/main.py - suporte desktop
**Arquivo:** `app/main.py`
**Mudancas:**

1. **Rate limiting condicional** (linhas 29-31):
```python
if settings.LUMINA_DESKTOP:
    limiter = Limiter(key_func=get_remote_address, default_limits=[])
else:
    limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute", "1000/hour"])
```

2. **CORS condicional** (linhas 177-183):
```python
cors_origins = ["*"] if settings.LUMINA_DESKTOP else settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
```

3. **Security validation condicional** - na funcao `validate_security_settings()`, nao falhar para desktop:
```python
if settings.APP_ENV == "production" and not settings.LUMINA_DESKTOP:
    # validacoes existentes...
```

4. **Endpoint de shutdown** (adicionar antes das rotas basicas):
```python
@app.post("/api/v1/shutdown")
async def shutdown_server():
    """Shutdown gracioso do servidor (apenas modo desktop)"""
    if not settings.LUMINA_DESKTOP:
        return JSONResponse(status_code=403, content={"error": "Only available in desktop mode"})
    import os, signal
    os.kill(os.getpid(), signal.SIGTERM)
    return {"status": "shutting_down"}
```

5. **Backup task em desktop** (linhas 118-121): ativar backup tambem no modo desktop:
```python
if settings.APP_ENV in ["production", "desktop"]:
```

**Criterio:** Backend inicia com `LUMINA_DESKTOP=true` sem erros; CORS aceita qualquer origin; rate limiter nao bloqueia; endpoint `/api/v1/shutdown` responde 200; em modo normal sem LUMINA_DESKTOP, comportamento nao muda

### T2.3 [CLAUDE] Criar run_backend.py
**Arquivo:** `run_backend.py` (raiz)
**Conteudo:**
```python
"""Entry point para execucao do backend via PyInstaller."""
import sys
import os

# Fix para PyInstaller: garantir que modulos sao encontrados
if getattr(sys, 'frozen', False):
    os.chdir(os.path.dirname(sys.executable))

import uvicorn

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    host = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        workers=1  # Unico worker para desktop
    )

if __name__ == '__main__':
    main()
```

**Criterio:** `python run_backend.py 9000` inicia o backend na porta 9000

### T2.4 [CLAUDE] Criar lumina.spec
**Arquivo:** `lumina.spec` (raiz)
**Descricao:** Configuracao PyInstaller para empacotar o backend.

**Conteudo chave:**
- `Analysis`: entry point `run_backend.py`
- `hiddenimports`: lista de imports que PyInstaller nao detecta automaticamente:
  - `uvicorn.logging`, `uvicorn.loops.auto`, `uvicorn.protocols.http.auto`
  - `uvicorn.protocols.http.h11_impl`, `uvicorn.protocols.websockets.auto`
  - `uvicorn.lifespan.on`, `uvicorn.lifespan.off`
  - `pydantic`, `pydantic_settings`, `pydantic.deprecated.decorator`
  - `sqlalchemy.dialects.sqlite`, `aiosqlite`
  - `email.mime.text`, `email.mime.multipart`, `email.mime.base`
  - `passlib.handlers.bcrypt`, `passlib.handlers.des_crypt`
  - `jose`, `cryptography`
  - `docxtpl`, `docx`
  - `PIL`, `PIL.Image`
  - `jinja2`
  - `loguru`
  - `httpx`, `httpx._transports.default`
  - `tenacity`
  - `icalendar`
  - `slowapi`
  - `itsdangerous`
  - `multipart`
- `datas`: `[('app/templates/email', 'app/templates/email')]` para templates HTML de email
- `--onedir` mode, `name='lumina-backend'`
- `excludes`: `['tkinter', 'test', 'unittest']` para reduzir tamanho
- `console=False` para Windows (sem janela de terminal)

**Criterio:** `pyinstaller --noconfirm lumina.spec` gera `dist/lumina-backend/` com executavel funcional

### T2.5 [CLAUDE] Criar electron/python-manager.js
**Arquivo:** `electron/python-manager.js`
**Descricao:** Classe que gerencia o ciclo de vida do processo Python.

**API da classe `PythonManager`:**
```javascript
class PythonManager {
  constructor(options)    // { isDev, resourcesPath, userDataPath }

  async start()           // Encontra porta livre, spawn processo, health check
  async stop()            // SIGTERM → timeout 10s → taskkill (Windows)
  async restart()         // stop() + start()
  getPort()               // Retorna porta atual
  getUrl()                // Retorna "http://127.0.0.1:{port}"
  isRunning()             // Boolean
  getPid()                // PID do processo ou null
  onReady(callback)       // Evento: backend pronto
  onError(callback)       // Evento: backend crashou
  onLog(callback)         // Evento: log do stdout/stderr
}
```

**Logica interna:**
1. **Porta livre:** `net.createServer()` → `.listen(0)` → captura `.address().port` → `.close()`
2. **Spawn:**
   - Dev mode: `child_process.spawn('python', ['run_backend.py', port], { cwd: projectRoot })`
   - Prod mode: `child_process.spawn(path.join(resourcesPath, 'python-dist/lumina-backend/lumina-backend.exe'), [port])`
3. **Env vars passadas ao processo:**
   ```javascript
   env: {
     ...process.env,
     LUMINA_DESKTOP: 'true',
     LUMINA_DATA_DIR: userDataPath,
     LUMINA_ENV_FILE: path.join(userDataPath, '.env'),
     APP_ENV: 'desktop',
     DATABASE_URL: `sqlite:///${path.join(userDataPath, 'data', 'lumina.db')}`,
     TEMPLATE_DIR: isDev ? './templates' : path.join(resourcesPath, 'templates'),
     OUTPUT_DIR: path.join(userDataPath, 'data', 'generated_docs'),
   }
   ```
4. **Health check:** Poll `GET http://127.0.0.1:{port}/health` a cada 500ms, timeout 30s
5. **Crash recovery:** listener no evento `exit` do child process, ate 3 restarts com delay 2s/4s/8s
6. **Shutdown Windows:** `taskkill /PID {pid} /F` como fallback se SIGTERM nao funcionar (Windows nao suporta SIGTERM bem)
7. **Logging:** Capturar `stdout` e `stderr` do processo, emitir via callback `onLog`

**Criterio:** Em dev mode, `start()` spawna uvicorn, aguarda health check, resolve a Promise. `stop()` mata o processo. `restart()` para e reinicia.

### T2.6 [CLAUDE] Integrar PythonManager no main.js
**Arquivo:** `electron/main.js` (atualizar T1.4)
**Mudancas:**

1. Importar `PythonManager` de `./python-manager.js`
2. No `app.whenReady()`:
   - Mostrar splash screen (BrowserWindow frameless, 400x300, carregando `splash.html`)
   - Instanciar `PythonManager` com paths corretos
   - Chamar `pythonManager.start()`
   - No `onReady`: fechar splash, criar janela principal, carregar frontend
   - No `onError`: mostrar dialogo de erro com opcao de reiniciar ou sair
3. No `app.on('before-quit')`:
   - Chamar `pythonManager.stop()` e aguardar

**Criterio:** App inicia, splash aparece, Python sobe, splash fecha, janela principal carrega com dados do backend

### T2.7 [CLAUDE] Verificacao da Fase 2
**Acao:** Testar em sequencia:
1. `python run_backend.py 9000` → backend inicia na porta 9000
2. Backend inicia com `LUMINA_DESKTOP=true LUMINA_DATA_DIR=/tmp/lumina-test` → cria diretorios em /tmp
3. `npx electron .` (dev mode) → splash aparece, Python inicia, app carrega
4. Fechar app → processo Python e encerrado
5. (Opcional) `pyinstaller --noconfirm lumina.spec` → gera executavel

**Criterio:** Loop completo funciona: start → splash → backend → app → close → cleanup

---

## FASE 3: Adaptacao Frontend [BLOQUEIO: T1.2 completa (preload.js define a API)]

### T3.1 [GEMINI] Modificar api.js - base URL dinamica
**Arquivo:** `frontend/src/services/api.js`
**Mudanca:** Adicionar request interceptor para resolver base URL do Electron.

**Antes (linhas 3-8):**
```javascript
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});
```

**Depois:**
```javascript
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Resolve base URL dinamica para modo Electron
let electronBaseUrl = null;

api.interceptors.request.use(async (config) => {
  if (window.electronAPI && !electronBaseUrl) {
    const backendUrl = await window.electronAPI.getBackendUrl();
    electronBaseUrl = `${backendUrl}/api`;
  }
  if (electronBaseUrl) {
    config.baseURL = electronBaseUrl;
  }
  return config;
});
```

**Criterio:** No browser normal (sem Electron), base URL continua `/api`. No Electron, usa `http://127.0.0.1:{porta}/api`

### T3.2 [GEMINI] Modificar Documents.jsx - downloads nativos
**Arquivo:** `frontend/src/pages/Documents.jsx`
**Mudanca:** Funcao `handleDownload` (linhas 72-87) com fallback Electron.

**Nova implementacao:**
```javascript
const handleDownload = async (filename) => {
  try {
    const response = await documentsAPI.download(filename);

    if (window.electronAPI) {
      const result = await window.electronAPI.saveFile({
        defaultPath: filename,
        filters: [
          { name: 'Word Documents', extensions: ['docx'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        data: Array.from(new Uint8Array(response.data))
      });
      if (result.success) {
        showMessage('Documento salvo com sucesso!', 'success');
      }
    } else {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    showMessage('Erro ao baixar documento', 'error');
  }
};
```

**Criterio:** No browser, download funciona como antes. No Electron, abre dialogo nativo de "Salvar como"

### T3.3 [GEMINI] Modificar Documents.jsx - confirm dialog nativo
**Arquivo:** `frontend/src/pages/Documents.jsx`
**Mudanca:** Funcao `handleDelete` (linha 89-100) com confirm nativo.

**Nova implementacao:**
```javascript
const handleDelete = async (filename) => {
  let confirmed = false;

  if (window.electronAPI) {
    confirmed = await window.electronAPI.showConfirmDialog({
      title: 'Confirmar Exclusao',
      message: `Deseja realmente excluir "${filename}"?`,
      buttons: ['Cancelar', 'Excluir'],
      defaultId: 0,
      cancelId: 0,
    });
  } else {
    confirmed = window.confirm(`Deseja realmente excluir "${filename}"?`);
  }

  if (!confirmed) return;

  try {
    await documentsAPI.delete(filename);
    showMessage('Documento excluido com sucesso', 'success');
    await loadDocuments();
  } catch (error) {
    console.error('Error deleting document:', error);
    showMessage('Erro ao excluir documento', 'error');
  }
};
```

**Criterio:** No browser, confirm nativo. No Electron, dialogo OS nativo

### T3.4 [GEMINI] Modificar Dashboard.jsx - substituir alert()
**Arquivo:** `frontend/src/pages/Dashboard.jsx`
**Mudanca:** Substituir `alert()` nas linhas 148 e 152 por `showMessage()` pattern.

**Linha 148:** `alert('Relatório enviado com sucesso!');`
→ Criar funcao `showMessage` local (mesmo pattern do Documents.jsx) e usar:
```javascript
showMessage('Relatorio enviado com sucesso!', 'success');
```

**Linha 152:** `alert('Erro ao enviar relatório. Verifique as configurações de email.');`
→ `showMessage('Erro ao enviar relatorio. Verifique as configuracoes de email.', 'error');`

**Nota:** Se Dashboard.jsx nao tem state `message` e funcao `showMessage`, adicionar:
```javascript
const [message, setMessage] = useState(null);
const showMessage = (text, type) => {
  setMessage({ text, type });
  setTimeout(() => setMessage(null), 4000);
};
```
E renderizar o `message` no JSX (copiar pattern do Documents.jsx).

**Criterio:** Nenhum `alert()` no codigo. Mensagens aparecem como toast/banner inline

### T3.5 [GEMINI] Modificar vite.config.js - base relativa
**Arquivo:** `frontend/vite.config.js`
**Mudanca:** Adicionar `base: './'`

**Novo conteudo:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
```

**ATENCAO:** Testar que `npm run dev` ainda funciona (proxy para backend). Testar que `npm run build && npm run preview` funciona com caminhos relativos.

**Criterio:** Dev mode funciona. Build gera assets com caminhos `./assets/` (nao `/assets/`)

### T3.6 [GEMINI] Verificacao da Fase 3
**Acao:**
1. `cd frontend && npm run dev` → app funciona no browser em http://localhost:5173
2. `cd frontend && npm run build` → build sem erros
3. Inspecionar `frontend/dist/index.html` → links de assets comecam com `./`
4. Com Electron rodando (Fase 2 completa): abrir app, navegar para Documents, testar download

**Criterio:** App funciona tanto no browser quanto no Electron

---

## FASE 4: IPC Bridge e Features Nativas [BLOQUEIO: T2.6 completa]

### T4.1 [CLAUDE] Criar electron/ipc-handlers.js
**Arquivo:** `electron/ipc-handlers.js`
**Descricao:** Registrar todos os handlers IPC do main process.

**Funcao exportada:** `registerIpcHandlers(mainWindow, pythonManager)`

**Handlers a implementar:**

```javascript
// Backend
ipcMain.handle('backend:getUrl', () => pythonManager.getUrl());
ipcMain.handle('backend:restart', () => pythonManager.restart());
ipcMain.handle('backend:status', () => ({
  running: pythonManager.isRunning(),
  port: pythonManager.getPort(),
  pid: pythonManager.getPid()
}));

// Dialogs
ipcMain.handle('dialog:saveFile', async (event, options) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath,
    filters: options.filters,
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, Buffer.from(options.data));
    return { success: true, path: filePath };
  }
  return { success: false };
});

ipcMain.handle('dialog:confirm', async (event, options) => {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: options.title,
    message: options.message,
    buttons: options.buttons,
    defaultId: options.defaultId || 0,
    cancelId: options.cancelId || 0,
  });
  return response !== (options.cancelId || 0);
});

// Notifications
ipcMain.handle('notification:show', (event, title, body) => {
  new Notification({ title, body }).show();
});

// App info
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:path', () => app.getPath('userData'));

// Window
ipcMain.on('window:minimize', () => mainWindow.minimize());
ipcMain.on('window:close', () => mainWindow.hide());  // Esconder, nao fechar

// Updates (placeholder, implementacao completa em T4.3)
ipcMain.handle('update:install', () => { /* implementar em T4.3 */ });
```

**Criterio:** Todas as funcoes do contrato IPC respondem. Salvar arquivo funciona. Confirm dialog retorna boolean correto.

### T4.2 [CLAUDE] Criar electron/tray.js
**Arquivo:** `electron/tray.js`
**Descricao:** Icone na bandeja do sistema com menu de contexto.

**Funcao exportada:** `createTray(mainWindow, pythonManager)`

**Implementacao:**
- Criar `Tray` com `electron/assets/tray-icon.png`
- Tooltip: "LUMINA - Sistema de Gestao"
- Clique esquerdo: `mainWindow.show()` + `mainWindow.focus()`
- Menu de contexto (clique direito):
  1. "Abrir LUMINA" → `mainWindow.show()`
  2. Separador
  3. "Status: Backend rodando" (label, desabilitado) → texto dinamico baseado em `pythonManager.isRunning()`
  4. "Reiniciar Backend" → `pythonManager.restart()`
  5. Separador
  6. "Sair" → `app.quit()`

**Criterio:** Icone aparece na bandeja. Menu contexto funciona. Clicar "Sair" fecha o app.

### T4.3 [CLAUDE] Criar electron/updater.js
**Arquivo:** `electron/updater.js`
**Descricao:** Auto-updater via electron-updater.

**Funcao exportada:** `setupAutoUpdater(mainWindow)`

**Implementacao:**
```javascript
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

function setupAutoUpdater(mainWindow) {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    });
  });

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Verificar updates 30s apos startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 30000);
}

// Handler para instalar update (chamado via IPC)
function installUpdate() {
  autoUpdater.downloadUpdate();
}

module.exports = { setupAutoUpdater, installUpdate };
```

**Criterio:** Nao crashar na inicializacao (mesmo sem GitHub Releases configurado). Log de "No update available" e aceitavel.

### T4.4 [CLAUDE] Atualizar electron/main.js - integrar tray, IPC, updater
**Arquivo:** `electron/main.js` (atualizar T2.6)
**Mudancas:**

1. Importar e chamar `registerIpcHandlers(mainWindow, pythonManager)` apos criar janela
2. Importar e chamar `createTray(mainWindow, pythonManager)` apos janela pronta
3. Importar e chamar `setupAutoUpdater(mainWindow)` apos janela pronta
4. **Mudanca de comportamento de fechar:**
   - `mainWindow.on('close', (e) => { e.preventDefault(); mainWindow.hide(); })` → esconder ao inves de fechar
   - Apenas `app.quit()` (do tray menu) realmente fecha
   - `app.on('before-quit')` → setar flag `isQuitting` e permitir fechar
5. Emitir `backend:ready` para o renderer quando Python esta pronto
6. Emitir `backend:error` se Python crashar

**Criterio:** App completo funciona: splash → backend → app → tray → close=hide → sair via tray

### T4.5 [CLAUDE] Implementar notification polling
**Arquivo:** `electron/main.js` ou novo `electron/notification-poller.js`
**Descricao:** Polling de notificacoes do backend para exibir notificacoes nativas.

**Logica:**
- A cada 60 segundos, `GET http://127.0.0.1:{port}/api/v1/notifications/summary`
- Comparar `unread_count` com valor anterior
- Se houver novas: `new Notification({ title: 'LUMINA', body: 'Voce tem X novas notificacoes' }).show()`
- Parar polling quando janela esta visivel (usuario ja ve no app)
- Reiniciar polling quando janela esta escondida (minimizado no tray)

**Criterio:** Quando app esta no tray, notificacoes nativas aparecem se houver novas

### T4.6 [CLAUDE] Verificacao da Fase 4
**Acao:**
1. Iniciar app → splash → backend → janela principal
2. Fechar janela → app continua na bandeja
3. Clicar no tray → janela reaparece
4. Menu do tray → "Reiniciar Backend" → backend reinicia sem fechar app
5. Menu do tray → "Sair" → app fecha completamente, Python encerrado
6. (Na pagina Documents) → baixar documento → dialogo nativo "Salvar como"
7. (Na pagina Documents) → excluir documento → dialogo nativo de confirmacao

**Criterio:** Todos os 7 cenarios funcionam

---

## FASE 5: Setup Wizard [BLOQUEIO: T4.4 completa]

### T5.1 [CLAUDE] Criar electron/wizard/wizard-preload.js
**Arquivo:** `electron/wizard/wizard-preload.js`
**Descricao:** Preload minimo para o wizard.

**API exposta via `window.wizardAPI`:**
- `saveConfig(data)` → `ipcRenderer.invoke('wizard:save', data)`
- `testIcalUrl(url)` → `ipcRenderer.invoke('wizard:testIcal', url)`
- `testEmailConnection(config)` → `ipcRenderer.invoke('wizard:testEmail', config)`
- `complete()` → `ipcRenderer.invoke('wizard:complete')`
- `getDefaultConfig()` → `ipcRenderer.invoke('wizard:getDefaults')`

**Criterio:** Arquivo sintaticamente correto

### T5.2 [CLAUDE] Criar electron/wizard/wizard.css
**Arquivo:** `electron/wizard/wizard.css`
**Descricao:** Estilos do wizard. Deve usar o mesmo tema visual do LUMINA:
- Background escuro com gradiente
- Glassmorphism nos cards/forms
- Cores primarias: `#6366f1` (indigo)
- Font: Inter (via Google Fonts CDN ou inline)
- Animacoes suaves de transicao entre steps
- Responsivo dentro da janela (800x600)
- Progress bar no topo mostrando step atual (1-7)
- Botoes styled consistentes com LUMINA

**Criterio:** Visual coerente com o tema dark glassmorphism do LUMINA

### T5.3 [CLAUDE] Criar electron/wizard/wizard.html + wizard.js
**Arquivos:** `electron/wizard/wizard.html`, `electron/wizard/wizard.js`
**Descricao:** Wizard de 7 passos. HTML puro com JS vanilla.

**Steps:**
1. **Boas-vindas** - Nome do app, descricao, botao "Comecar"
2. **Dados do Imovel** - Inputs: PROPERTY_NAME, PROPERTY_ADDRESS, CONDO_NAME, CONDO_ADMIN_NAME, CONDO_EMAIL
3. **Dados do Proprietario** - Inputs: OWNER_NAME, OWNER_EMAIL, OWNER_PHONE, OWNER_APTO, OWNER_BLOCO, OWNER_GARAGEM
4. **Calendarios** - Toggle "Configurar calendarios?", inputs: AIRBNB_ICAL_URL, BOOKING_ICAL_URL, CALENDAR_SYNC_INTERVAL_MINUTES (slider 5-120), botao "Testar URL" para cada
5. **Email** - Toggle "Configurar email?", select: EMAIL_PROVIDER (gmail/outlook/yahoo/custom), inputs condicionais: EMAIL_FROM, EMAIL_PASSWORD, SMTP/IMAP custom fields, botao "Testar Conexao"
6. **Conta Admin** - Inputs: email, password (com forca), confirm password
7. **Revisao** - Resumo de tudo (senhas mascaradas), botao "Salvar e Iniciar"

**Navegacao:**
- Botoes "Anterior" / "Proximo" / "Pular" (para steps opcionais)
- Validacao inline em cada step (campos obrigatorios, formato email, URL valida, senha minima)
- Progress bar no topo (7 circulos conectados por linha)

**Ao clicar "Salvar e Iniciar" (step 7):**
1. Chamar `window.wizardAPI.saveConfig(allFormData)`
2. Mostrar loading "Configurando sistema..."
3. Chamar `window.wizardAPI.complete()`
4. Janela fecha automaticamente (main.js cuida de abrir o app principal)

**Criterio:** Wizard navega entre 7 steps, valida campos, coleta dados, envia via IPC

### T5.4 [CLAUDE] Implementar IPC handlers do wizard no main.js
**Arquivo:** `electron/main.js` (ou `electron/ipc-handlers.js`)
**Handlers novos:**

```javascript
ipcMain.handle('wizard:save', async (event, config) => {
  // 1. Gerar SECRET_KEY
  const crypto = require('crypto');
  const secretKey = crypto.randomBytes(32).toString('base64url');

  // 2. Montar conteudo do .env
  const envContent = buildEnvFile({ ...config, SECRET_KEY: secretKey });

  // 3. Escrever .env em userDataPath
  const envPath = path.join(app.getPath('userData'), '.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');

  // 4. Criar diretorios de dados
  const dirs = ['data', 'data/downloads', 'data/generated_docs', 'data/logs', 'data/backups'];
  dirs.forEach(d => fs.mkdirSync(path.join(app.getPath('userData'), d), { recursive: true }));

  return { success: true };
});

ipcMain.handle('wizard:testIcal', async (event, url) => {
  // Fazer HTTP GET na URL e verificar se retorna conteudo iCal valido
  try {
    const http = require('http');  // ou https
    // fetch URL, verificar Content-Type ou conteudo BEGIN:VCALENDAR
    return { success: true, events: count };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('wizard:testEmail', async (event, config) => {
  // Para testar email, precisa do backend rodando
  // Opcao 1: Iniciar Python temporariamente
  // Opcao 2: Fazer teste SMTP direto do Node.js (mais simples)
  // Recomendacao: Opcao 2 com nodemailer ou net.connect
  return { success: true }; // ou { success: false, error: '...' }
});

ipcMain.handle('wizard:complete', async (event) => {
  // 1. Iniciar backend Python (se nao estiver rodando)
  // 2. Criar usuario admin via POST /api/v1/auth/register
  // 3. Fechar wizard, abrir janela principal
});

ipcMain.handle('wizard:getDefaults', () => ({
  CALENDAR_SYNC_INTERVAL_MINUTES: 30,
  EMAIL_PROVIDER: 'gmail',
  EMAIL_SMTP_PORT: 587,
  EMAIL_IMAP_PORT: 993,
  EMAIL_USE_TLS: true,
}));
```

**Funcao helper `buildEnvFile(config)`:**
Gera string formatada de .env com todos os campos:
```
# LUMINA Configuration - Generated by Setup Wizard
APP_NAME=Lumina
APP_ENV=desktop
SECRET_KEY=xxxxx
DATABASE_URL=sqlite:///./data/lumina.db
PROPERTY_NAME=...
...
```

**Criterio:** `wizard:save` gera arquivo .env valido. `wizard:complete` cria usuario admin e abre app.

### T5.5 [CLAUDE] Integrar deteccao de primeiro run no main.js
**Arquivo:** `electron/main.js`
**Mudanca:** No `app.whenReady()`, ANTES de iniciar splash/backend:

```javascript
const envPath = path.join(app.getPath('userData'), '.env');
const isFirstRun = !fs.existsSync(envPath);

if (isFirstRun) {
  // Abrir wizard ao inves do app normal
  const wizardWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    frame: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'wizard', 'wizard-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  wizardWindow.loadFile(path.join(__dirname, 'wizard', 'wizard.html'));

  // Quando wizard completa, fechar e iniciar app normal
  ipcMain.once('wizard:complete', async () => {
    wizardWindow.close();
    await startNormalApp();  // Funcao que faz splash → python → main window
  });
} else {
  await startNormalApp();
}
```

**Criterio:** Primeiro run → wizard. Segundo run → app normal direto.

### T5.6 [CLAUDE] Verificacao da Fase 5
**Acao:**
1. Deletar `%APPDATA%/lumina/.env` (se existir)
2. Iniciar app → wizard aparece
3. Preencher todos os campos, clicar "Salvar e Iniciar"
4. App principal abre com dados vazios
5. Fechar e reabrir → app abre direto (sem wizard)

**Criterio:** Fluxo completo de primeiro run funciona

---

## FASE 6: Instalador [BLOQUEIO: Fases 1-5 completas]

### T6.1 [GEMINI] Finalizar electron-builder.yml
**Arquivo:** `electron-builder.yml` (atualizar T1.5)
**Adicionar:**
```yaml
extraResources:
  - from: python-dist/lumina-backend/
    to: python-dist/
    filter:
      - "**/*"
  - from: templates/
    to: templates/
    filter:
      - "**/*"

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: LUMINA
  installerIcon: electron/assets/icon.ico
  uninstallerIcon: electron/assets/icon.ico
  deleteAppDataOnUninstall: false

publish:
  provider: github
  owner: zegil
  repo: AP_Controller
  releaseType: release
```

**Criterio:** `npm run build:electron` gera instalador .exe na pasta `release/`

### T6.2 [GEMINI] Testar instalador end-to-end
**Acao:**
1. `npm run dist` (build completo: python + frontend + electron)
2. Executar instalador gerado em `release/`
3. Verificar: atalho desktop criado, app inicia, wizard aparece, preencher, app funciona

**Criterio:** Instalador funciona em maquina limpa (sem Python/Node instalados)

---

## FASE 7: Developer Experience [PARALELO: pode comecar junto com Fase 1]

### T7.1 [GEMINI] Configurar scripts dev no package.json raiz
**Arquivo:** `package.json` (raiz, ja criado em T1.1)
**Verificar que os scripts `dev`, `dev:python`, `dev:frontend`, `dev:electron` funcionam.
Ajustar se necessario apos testes.

**Criterio:** `npm run dev` (na raiz) inicia 3 processos e todos funcionam

### T7.2 [GEMINI] Criar .vscode/launch.json para debug
**Arquivo:** `.vscode/launch.json`
**Conteudo:** Configuracoes de debug para:
1. Electron Main Process (attach port 5858)
2. Python Backend (debugpy port 5678)
3. Compound: ambos ao mesmo tempo

**Criterio:** F5 no VS Code attaches ao processo correto

---

## FASE 8: Testes [BLOQUEIO: Fases 1-7 completas]

### T8.1 [CLAUDE] Testes do backend (modo desktop)
**Acao:** Testar manualmente:
- Backend com `LUMINA_DESKTOP=true` → sem rate limit, CORS aberto, SECRET_KEY auto-gerada
- Endpoint `/api/v1/shutdown` → encerra processo
- `ensure_directories` com LUMINA_DATA_DIR custom → diretorios criados no lugar certo

### T8.2 [CLAUDE] Testes do PythonManager
**Acao:** Testar manualmente:
- `start()` → porta encontrada, processo rodando, health check OK
- `stop()` → processo encerrado, porta liberada
- Matar processo Python manualmente → crash detectado, restart automatico

### T8.3 [GEMINI] Testes do frontend adaptado
**Acao:** Testar manualmente:
- App no browser (sem Electron) → tudo funciona como antes
- App no Electron → API base URL resolvida, downloads nativos, confirms nativos

### T8.4 [CLAUDE] Teste E2E: fresh install
**Acao:**
1. Desinstalar LUMINA (se instalado)
2. Deletar `%APPDATA%/lumina/`
3. Instalar via .exe
4. Abrir → wizard → configurar → app funciona → fechar → reabrir → app abre direto

---

## Resumo de Tarefas por Agente

### Claude (22 tarefas)
| ID | Fase | Descricao |
|----|------|-----------|
| T0.1 | 0 | Atualizar .gitignore |
| T0.2 | 0 | Criar branch |
| T1.1 | 1 | Criar package.json raiz |
| T1.2 | 1 | Criar preload.js |
| T1.3 | 1 | Criar splash.html |
| T1.4 | 1 | Criar main.js (minimo) |
| T1.5 | 1 | Criar electron-builder.yml (basico) |
| T1.6 | 1 | Criar diretorio assets |
| T1.7 | 1 | Verificacao Fase 1 |
| T2.1 | 2 | Modificar config.py |
| T2.2 | 2 | Modificar main.py |
| T2.3 | 2 | Criar run_backend.py |
| T2.4 | 2 | Criar lumina.spec |
| T2.5 | 2 | Criar python-manager.js |
| T2.6 | 2 | Integrar PythonManager no main.js |
| T2.7 | 2 | Verificacao Fase 2 |
| T4.1 | 4 | Criar ipc-handlers.js |
| T4.2 | 4 | Criar tray.js |
| T4.3 | 4 | Criar updater.js |
| T4.4 | 4 | Integrar tray/IPC/updater no main.js |
| T4.5 | 4 | Notification polling |
| T4.6 | 4 | Verificacao Fase 4 |
| T5.1 | 5 | Criar wizard-preload.js |
| T5.2 | 5 | Criar wizard.css |
| T5.3 | 5 | Criar wizard.html + wizard.js |
| T5.4 | 5 | IPC handlers do wizard |
| T5.5 | 5 | Deteccao primeiro run |
| T5.6 | 5 | Verificacao Fase 5 |
| T8.1 | 8 | Testes backend desktop |
| T8.2 | 8 | Testes PythonManager |
| T8.4 | 8 | Teste E2E fresh install |

### Gemini (10 tarefas)
| ID | Fase | Descricao |
|----|------|-----------|
| T3.1 | 3 | api.js base URL dinamica |
| T3.2 | 3 | Documents.jsx downloads nativos |
| T3.3 | 3 | Documents.jsx confirm nativo |
| T3.4 | 3 | Dashboard.jsx substituir alert() |
| T3.5 | 3 | vite.config.js base relativa |
| T3.6 | 3 | Verificacao Fase 3 |
| T6.1 | 6 | Finalizar electron-builder.yml |
| T6.2 | 6 | Testar instalador E2E |
| T7.1 | 7 | Scripts dev |
| T7.2 | 7 | Debug configs |
| T8.3 | 8 | Testes frontend adaptado |

---

## Diagrama de Dependencias

```
T0.1 → T0.2 → T1.1 ─┬─→ T1.2 (preload.js)
                      ├─→ T1.3 (splash)
                      ├─→ T1.4 (main.js)
                      ├─→ T1.5 (builder.yml)
                      └─→ T1.6 (assets)
                            │
                      T1.7 (verificacao)
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         T2.1-T2.7    T3.1-T3.6    T7.1-T7.2
         (Python)     (Frontend)    (DX)
         [CLAUDE]     [GEMINI]     [GEMINI]
              │             │
              ▼             │
         T4.1-T4.6         │
         (IPC/Tray)        │
         [CLAUDE]          │
              │             │
              ▼             │
         T5.1-T5.6         │
         (Wizard)          │
         [CLAUDE]          │
              │             │
              ├─────────────┘
              ▼
         T6.1-T6.2
         (Installer)
         [GEMINI]
              │
              ▼
         T8.1-T8.4
         (Testes)
         [AMBOS]
```
