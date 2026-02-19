# GEMINI.md - Instrucoes para Agentes Gemini

> Este arquivo fornece contexto para agentes Gemini trabalhando neste projeto.
> Para o plano completo e contexto compartilhado, leia `docs/PLANO_UNIVERSAL.md`.

## Projeto

**LUMINA v3.0.0** - Sistema de Gestao de Apartamentos para Airbnb/Booking.com
Migracao em andamento: Web App → Electron Desktop (Windows)

## Stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0, SQLite (gerenciado pelo agente Claude)
- **Frontend:** React 18.3.1, Vite 5.1.4, Axios 1.6.7, Recharts 3.7.0, Lucide-react 0.344.0
- **Desktop:** Electron + electron-builder (Windows NSIS installer)
- **Estilo:** CSS puro com glassmorphism dark theme, CSS variables, sem Tailwind

## Estrutura do Frontend

```
frontend/
  index.html                    # Entry point HTML
  package.json                  # Dependencias NPM
  vite.config.js                # Config Vite (ARQUIVO CRITICO)
  src/
    main.jsx                    # React entry point
    App.jsx                     # App principal, routing state-based (switch/case)
    App.css                     # Estilos globais do app
    components/
      Calendar.jsx + .css       # Widget de calendario customizado
      Sidebar.jsx               # Navegacao lateral (8 itens, collapse)
      EventModal.jsx + .css     # Modal de detalhes de reserva
      ErrorBoundary.jsx         # Error boundary React
    pages/
      Dashboard.jsx             # KPIs, notificacoes, reservas proximas
      Calendar.jsx              # Pagina de calendario com sync
      Conflicts.jsx             # Deteccao e resolucao de conflitos
      Statistics.jsx            # Analytics com Recharts
      Documents.jsx             # Geracao/gestao de documentos (ARQUIVO CRITICO)
      Emails.jsx                # Envio de emails
      Notifications.jsx         # Central de notificacoes
      Settings.jsx              # Configuracoes (tabs Easy/Advanced)
    contexts/
      PropertyContext.jsx        # Context para property_id (multi-property ready)
    services/
      api.js                    # Axios instance + todos os endpoints (ARQUIVO CRITICO)
    styles/
      global.css                # CSS variables, animacoes, tema base
    utils/
      formatters.js             # Formatacao de data, moeda, hora
```

## Arquivos Criticos para a Migracao

### `frontend/src/services/api.js`
- Instancia Axios com `baseURL: '/api'`
- Precisa suportar URL dinamica para Electron: `http://127.0.0.1:{porta}/api`
- Pattern: usar request interceptor para resolver base URL
- Deteccao Electron: `window.electronAPI` (exposto pelo preload.js)

### `frontend/src/pages/Documents.jsx`
- Linha 72-82: Download via `window.URL.createObjectURL` + link click
- Linha 90: `window.confirm()` para exclusao
- Ambos precisam fallback para dialogos nativos Electron via IPC

### `frontend/vite.config.js`
- Atualmente: proxy `/api` → `http://127.0.0.1:8000`
- Precisa: `base: './'` para que assets funcionem em `file://` protocol do Electron
- Cuidado: `base: './'` nao deve quebrar o dev mode web

### `frontend/src/pages/Dashboard.jsx`
- Usa `alert()` (linhas 149, 153) - substituir por `showMessage()` ou notificacao nativa

## Design System

### CSS Variables (definidas em `styles/global.css`)
```css
/* Cores */
--primary: #6366f1
--bg-app: gradiente escuro
--glass-1/2/3: glassmorphism com backdrop-filter: blur

/* Tipografia */
Font: Inter (weight 300-700)

/* Espacamento */
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 24px

/* Animacoes */
fadeInUp, fadeIn, slideInLeft, scaleIn, spin
```

### Tema
- Dark mode com glassmorphism (backdrop-filter: blur)
- Responsivo em 768px breakpoint
- Cores de status: success (verde), danger (vermelho), warning (amarelo), info (azul)

## Padroes de Codigo

### React
- Functional components com hooks (`useState`, `useEffect`, `useContext`)
- Sem React Router - routing via state em `App.jsx`:
  ```jsx
  const [currentPage, setCurrentPage] = useState('dashboard');
  switch (currentPage) {
    case 'dashboard': return <Dashboard />;
    // ...
  }
  ```
- Cada pagina gerencia seu proprio state local
- Context API para dados globais (`PropertyContext`)
- Error boundaries para graceful error handling

### CSS
- Um arquivo .css por componente
- BEM-like naming (`.documents-page`, `.document-card`, `.btn-primary`)
- Nao usar CSS-in-JS, styled-components, ou Tailwind
- Manter consistencia com o tema glassmorphism existente

### API Calls
- Sempre via funcoes exportadas em `api.js` (ex: `documentsAPI.list()`)
- Axios interceptor global para log de erros
- Blob responses para downloads de arquivos

## Responsabilidades do Agente Gemini na Migracao

### Fase 3: Adaptacao do Frontend
- [ ] Modificar `api.js` para base URL dinamica (deteccao `window.electronAPI`)
- [ ] Modificar `Documents.jsx` para downloads nativos via IPC
- [ ] Modificar `Documents.jsx` para confirm dialog via IPC
- [ ] Modificar `Dashboard.jsx` para substituir `alert()`
- [ ] Modificar `vite.config.js` para `base: './'`
- [ ] Garantir que todas as mudancas mantenham compatibilidade web

### Fase 6: Instalador e Distribuicao
- [ ] Configurar `electron-builder.yml` completo
- [ ] Configurar NSIS (atalhos, auto-start, desinstalacao)
- [ ] Otimizar tamanho do pacote (tree-shaking, UPX, exclusoes)

### Fase 7: Experiencia de Desenvolvimento
- [ ] Configurar scripts `dev` com `concurrently` no `package.json` raiz
- [ ] Configurar `wait-on` para sincronizar startup dos 3 processos
- [ ] Documentar workflow de desenvolvimento

## Pattern de Deteccao Electron

Use este pattern em TODO lugar que precisar diferenciar web vs desktop:

```javascript
// Electron disponivel?
if (window.electronAPI) {
  // Modo desktop - usar IPC
  const result = await window.electronAPI.someMethod(args);
} else {
  // Modo web - comportamento existente
  // ... codigo original ...
}
```

**API disponivel no `window.electronAPI`** (exposta pelo preload.js):
- `getBackendUrl()` → retorna `http://127.0.0.1:{porta}`
- `saveFile({ defaultPath, filters, data })` → dialogo salvar + escreve arquivo
- `showConfirmDialog({ title, message, buttons })` → dialogo confirmacao nativo
- `showNotification(title, body)` → notificacao OS
- `getAppVersion()` → versao do app
- `restartBackend()` → reiniciar processo Python
- `minimize()` → minimizar para bandeja
- `close()` → fechar (esconde, nao sai)

## Regras de Commits

- Branch: `feature/electron-migration`
- Prefixos: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Mensagens em ingles
- Um commit por mudanca logica
- Nunca commitar: `.env`, `data/`, `python-dist/`, `release/`, `node_modules/`

## Comandos Uteis

```bash
# Frontend dev server
cd frontend && npm run dev

# Build frontend para producao
cd frontend && npm run build

# Preview build de producao
cd frontend && npm run preview

# Dev mode completo (quando Electron estiver configurado)
npm run dev  # concurrently: python + vite + electron
```

## Ambiente

- OS: Windows 11
- Node.js: 20+
- Repo: `C:\Users\zegil\Documents\GitHub\AP_Controller`
- Frontend em: `frontend/`

## Como Executar Tarefas

1. Abra `docs/PLANO_IMPLEMENTACAO.md`
2. Encontre suas tarefas (marcadas `[GEMINI]`)
3. Execute na ordem (respeitar `[BLOQUEIO]` e `[PARALELO]`)
4. Cada tarefa tem: arquivo(s), o que fazer, e criterio de aceite
5. Commit apos cada tarefa completada (nao acumular)

**IMPORTANTE:** Suas tarefas da Fase 3 dependem do Claude completar a Fase 1 (T1.2 preload.js define a API `window.electronAPI`). Verifique que o preload.js existe antes de comecar.

## Referencias

- Plano de implementacao: `docs/PLANO_IMPLEMENTACAO.md`
- Plano completo: `docs/PLANO_UNIVERSAL.md`
- Instrucoes Claude: `CLAUDE.md`
- API docs: `docs/architecture/API_DOCUMENTATION.md`
- Arquitetura geral: `docs/architecture/ARQUITETURA_GERAL.md`
