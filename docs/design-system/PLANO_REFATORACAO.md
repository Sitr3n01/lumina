# Plano de refatoração — LUMINA Design System

Documento único de execução. Aplica o [LUMINA Design System](README.md) ao código de
`frontend/src/` e `electron/`.

É executável por alguém que não participou da conversa que o originou: cada fase declara o
que toca, o que precisa ser verdade ao final, como verificar, e qual seção do sistema a
especifica. Os oito documentos são a especificação de referência — este é o que se abre
para trabalhar.

> **Estado (rodada de qualidade de 2026-08-07).** A remoção do legado está **concluída**:
> `global.css` (737 linhas) e `bridge.css` (108) foram apagados, e as camadas `lm.legacy` e
> `lm.bridge` saíram de `layers.css`. O levantamento mostrou as 53 classes do legado sem um
> único consumidor, e a ponte de 40 variáveis consumida só pelo próprio legado — o último a
> segurar os dois era `ErrorBoundary`, hoje escrito com `EmptyState` e `Button`.
>
> Efeito colateral medido: as células do documento em `CondoTemplate` deixaram de ser pintadas
> pelo `td { background: var(--glass-1) }` do legado, que dava tinta translúcida e cantos
> arredondados de 8px a uma folha que deveria simular papel branco.
>
> O que este plano diz sobre os dois arquivos vira registro histórico. O risco **R7** (validação
> de daltonismo como comentário) continua aberto — ver [`LACUNAS.md`](LACUNAS.md).

---

## Sumário

1. [Diagnóstico](#1-diagnóstico)
2. [Estratégia](#2-estratégia)
3. [Fases](#3-fases)
4. [Ordem de migração das páginas](#4-ordem-de-migração-das-páginas)
5. [Riscos](#5-riscos-e-mitigação)
6. [Fora de escopo](#6-fora-de-escopo)
7. [Checklist de conclusão](#7-checklist-de-conclusão)

---

## 1. Diagnóstico

Medido em `frontend/src/` — 9.259 linhas, 13 arquivos `.css`, 19 `.jsx` — e em
`electron/wizard/`.

### 1.1 Acessibilidade — defeitos de conformidade, não melhorias

| # | Defeito | Evidência |
|---|---|---|
| A1 | Foco removido globalmente | [`global.css:64`](../../frontend/src/styles/global.css:64) — `* { outline: none; }`. Falha WCAG 2.4.7 em toda a aplicação |
| A2 | Nenhuma semântica assistiva | Zero `aria-*` e zero `role=` em 9.259 linhas |
| A3 | Nenhum `:focus-visible` | Zero ocorrências |
| A4 | `<div onClick>` como controle | [`Notifications.jsx:275`](../../frontend/src/pages/Notifications.jsx:275), [`Calendar.jsx:141`](../../frontend/src/components/Calendar.jsx:141), [`Sidebar.jsx:179`](../../frontend/src/components/Sidebar.jsx:179) — **este último torna baixar e instalar atualização inoperáveis por teclado** |
| A5 | Controle real retirado do teclado | [`Login.jsx:168`](../../frontend/src/pages/Login.jsx:168) — `tabIndex={-1}` no botão de revelar senha |
| A6 | `title=` como único portador de informação | [`Calendar.jsx:145`](../../frontend/src/components/Calendar.jsx:145) (nome do hóspede e plataforma), `Documents.jsx:353,361`, `Settings.jsx:272` |
| A7 | Dialog sem contenção de foco | `EventModal.jsx`, modais de `Dashboard.jsx`, `Documents.jsx`, `Conflicts.jsx` |
| A8 | Sem `prefers-reduced-motion` | Zero ocorrências, com 6 `@keyframes` e animação de entrada em 8 páginas. Falha WCAG 2.3.3 |
| A9 | `input[readonly] { opacity: 0.7 }` | [`global.css:292`](../../frontend/src/styles/global.css:292) — reduz contraste de tudo, inclusive do rótulo, para comunicar "somente leitura" |

### 1.2 Cor e tokens

| # | Defeito | Evidência |
|---|---|---|
| T1 | **170** hexadecimais soltos — 96 em `.css`, 74 em `.jsx` | `.css`: `Sidebar.css` (25), `global.css` (22), `Notifications.css` (21), `Calendar.css` (16). `.jsx`: `Statistics.jsx` (25), `AISuggestions.jsx` (13), `CondoTemplate.jsx` (12), `Notifications.jsx` (9) |
| T2 | **115** `rgba()` literais — 87 em `.css`, 28 em `.jsx` | `global.css` (39), `Notifications.css` (18), `Sidebar.css` (11) |
| T3 | Tema único escuro, cor de fundo repetida em 4 arquivos | `#101922` em [`App.css:11,18`](../../frontend/src/App.css:11), [`App.jsx:26`](../../frontend/src/App.jsx:26), [`Login.jsx:219`](../../frontend/src/pages/Login.jsx:219), [`global.css:7`](../../frontend/src/styles/global.css:7) |
| T4 | Camada de compatibilidade apodrecida | `global.css:47-60` — `--glass-1/2/3` são resquício de um glassmorphism removido; os nomes descrevem aparência que não existe mais |
| T5 | Texto em gradiente com `-webkit-text-fill-color: transparent` | [`Dashboard.css:19`](../../frontend/src/pages/Dashboard.css:19) — some em `forced-colors` |
| T6 | Cores de gráfico cravadas no JSX | [`Statistics.jsx:149`](../../frontend/src/pages/Statistics.jsx:149) (`COLORS` com `#FF5A5F`/`#003580`), `:266` `stroke="#2563eb"`, `:307` `fill="#16a34a"`, `:331` `fill="#8884d8"` — **o roxo de demonstração padrão do Recharts**, que ninguém escolheu |
| T7 | Tooltip claro em app escuro | [`Statistics.jsx:340`](../../frontend/src/pages/Statistics.jsx:340) — `background: 'white'` |
| T8 | Uma cor servindo a dois significados | `#8b5cf6` é "IA" em [`AISuggestions.jsx:9`](../../frontend/src/pages/AISuggestions.jsx:9) **e** "documento" em `Dashboard.jsx:38` e `Notifications.css:155,238,257` |
| T9 | 51 declarações `font-weight: 600/700` | A escala tipográfica do sistema usa só 400 e 500 |

### 1.3 Arquitetura de CSS

| # | Defeito | Evidência |
|---|---|---|
| C1 | 171 estilos inline `style={{}}` | `AISuggestions.jsx` (55), `CondoTemplate.jsx` (43), `Settings.jsx` (16), `Dashboard.jsx` (15), `Login.jsx` (11), `Documents.jsx` (8), `Sidebar.jsx` (7) |
| C2 | Bloco `<style>` embutido no JSX — quarto mecanismo de estilo | [`Login.jsx:213`](../../frontend/src/pages/Login.jsx:213), [`AISuggestions.jsx:223`](../../frontend/src/pages/AISuggestions.jsx:223), [`CondoTemplate.jsx:237`](../../frontend/src/pages/CondoTemplate.jsx:237). CSS global sem escopo, reinjetado a cada render, invisível para o ESLint |
| C3 | Estilo de elemento sem escopo | `global.css` estiliza `input, select, textarea`, `table`, `th`, `td` cruamente — todo componente novo herda sem pedir |
| C4 | **Ordem de cascata frágil, com consequência real** | `.form-field` é declarada em 4 arquivos e `.checkbox-field` em 3, todas com especificidade (0,1,0). [`Emails.css:56`](../../frontend/src/pages/Emails.css:56) e [`Settings.css:69`](../../frontend/src/pages/Settings.css:69) declaram `flex-direction: column`; [`global.css:476`](../../frontend/src/styles/global.css:476) declara `row !important`. O `!important` existe **só para vencer uma briga que a ordem não resolve**. Em [`main.jsx`](../../frontend/src/main.jsx), `import App from './App.jsx'` está uma linha **acima** de `import './styles/global.css'` — trocar as duas linhas inverte a resolução de sete declarações duplicadas, sem erro, sem aviso e sem diff visível |
| C5 | Impressão por força bruta | [`CondoTemplate.jsx:239`](../../frontend/src/pages/CondoTemplate.jsx:239) — `body * { visibility: hidden !important }` |

### 1.4 Offline e empacotamento

| # | Defeito | Evidência |
|---|---|---|
| O1 | Fonte carregada de CDN | [`global.css:1`](../../frontend/src/styles/global.css:1) — `@import url('https://fonts.googleapis.com/...')`. Num app **local e offline**, sem rede a tipografia inteira cai no fallback |
| O2 | Armadilha de empacotamento | `package.json` → `files` inclui só `electron/**/*`, e `"!electron/assets/!(tray-icon.*)"` descartaria **silenciosamente** uma fonte colocada ali. `extraResources` já leva `frontend/dist` com `**/*`, e `base: './'` no `vite.config.js` é o que faz a `url()` emitida ser relativa — sem ele a fonte não carrega sob `file://` |

### 1.5 Composição e navegação

| # | Defeito | Evidência |
|---|---|---|
| N1 | 8 destinos horizontais competindo | `Sidebar.jsx:97`; header 64px + nav 52px = **116px** de altura fixa antes do conteúdo |
| N2 | Notificações e Sugestões IA como destinos | Alerta e sugestão de preço são transversais. Ver [`02-layout.md`](02-layout.md) §3.2 |
| N3 | Hierarquia real não declarada | `CondoTemplate` recebe `onBack={() => setCurrentPage('dashboard')}` — já é subdestino sem ser um |
| N4 | Roteamento por `useState` | [`App.jsx:22`](../../frontend/src/App.jsx:22) — sem URL, histórico ou deep link |
| N5 | Componente com nome mentiroso | `components/Sidebar.jsx` exporta `TopNav` |
| N6 | Formulário de ~15 campos em modal de 800px | [`Documents.jsx:371`](../../frontend/src/pages/Documents.jsx:371), com abas **dentro** do modal (`:382`) |
| N7 | `window.confirm` para ação destrutiva | [`Documents.jsx:130`](../../frontend/src/pages/Documents.jsx:130) |
| N8 | Scrim descarta trabalho não salvo | `Documents.jsx:372`, `Conflicts.jsx:216`, `Dashboard.jsx:49`, `EventModal.jsx:29` |
| N9 | Botão destrutivo na mesma barra que "Salvar" | [`Settings.jsx:266`](../../frontend/src/pages/Settings.jsx:266) — `#e53e3e` inline, rótulo "Hard Reset" fora do vocabulário |
| N10 | Aba usada como filtro, duplicando chips | [`Notifications.jsx:249`](../../frontend/src/pages/Notifications.jsx:249) e `:233` |
| N11 | Comparação de duas reservas em 560px | [`Conflicts.jsx:215`](../../frontend/src/pages/Conflicts.jsx:215) — é list-detail, não modal |
| N12 | Chave primária pedida ao usuário | "ID da Reserva" em `Documents.jsx:399`, `Emails.jsx:395,419` |
| N13 | Modo global de edição destravando ~12 campos | [`Settings.jsx:277`](../../frontend/src/pages/Settings.jsx:277) |
| N14 | Checkbox para preferência de efeito imediato | `Settings.jsx:565,579,697,711` — são Switches |
| N15 | Grade do calendário some sem reservas | [`Calendar.jsx:146`](../../frontend/src/pages/Calendar.jsx:146) — a grade é o conteúdo |
| N16 | Reserva como chip por dia | [`Calendar.jsx:140`](../../frontend/src/components/Calendar.jsx:140) — deveria ser barra contínua |
| N17 | Três giros de carregamento, três geometrias | `App.jsx:24`, `Login.jsx:75`, `Dashboard.jsx:163` |
| N18 | "Atualizar" apaga a página inteira | `Notifications.jsx:190`, `Documents.jsx:295`, `Conflicts.jsx:123` |
| N19 | Erro genérico com cor de aviso | [`ErrorBoundary.jsx:35`](../../frontend/src/components/ErrorBoundary.jsx:35) |
| N20 | Backend fora → formulário de login inútil | `Login.jsx:24`; 401 descarta trabalho em curso (`api.js:37`, `AuthContext.jsx:74`) |

### 1.6 Wizard do Electron — fora do sistema

`electron/wizard/` é a **primeira tela que o usuário vê na instalação** e hoje não pertence
ao design system: `wizard.css` tem 23 KB de linguagem visual independente e `wizard.html`
usa **74 emoji** como ícones de etapa.

### 1.7 O que já está pronto

| Item | Estado |
|---|---|
| `frontend/src/styles/tokens/*` | Gerados e validados. **Nada os importa ainda** — o app roda hoje sem tocá-los |
| `python scripts/design/generate_tokens.py --check` | 80+ pares de contraste, todos passando nos dois temas |
| Paleta de gráficos | Validada contra `--lm-color-chart-surface` (`#f1f4f8` / `#1a1c1f`): CVD ΔE 11,8 claro / 9,0 escuro |
| Documentação | Os 8 documentos + [`LACUNAS.md`](LACUNAS.md) |

---

## 2. Estratégia

### 2.1 Incremental, nunca reescrita

Uma reescrita deixa o app quebrado por um período longo e torna a regressão indetectável.
O LUMINA já está distribuído como release Alpha. A migração é **arquivo a arquivo, com o
app funcionando o tempo todo**.

### 2.2 A ponte de variáveis legadas

`global.css` define **40** variáveis, consumidas **369 vezes em 19 arquivos** (11 `.css` +
8 `.jsx`). Reapontá-las para os tokens novos migra todos os consumidores de uma vez, sem
tocar em nenhum.

**A ponte declara todas as 40 — inclusive as que "não têm destino".** Uma custom property
não declarada torna a declaração inválida no tempo de valor computado: `background:
var(--primary-hover)` cairia para `transparent` e apagaria o hover de `.btn-primary`. Um
traço na tabela significa "sem token equivalente", nunca "não declarar".

| Legada | Destino | Nota |
|---|---|---|
| `--bg-app`, `--bg-secondary` | `--lm-color-background` | |
| `--bg-sidebar` | `--lm-color-surface-container-lowest` | |
| `--card-bg`, `--bg-primary`, `--glass-1` | `--lm-color-surface-container-low` | |
| `--bg-tertiary` | `--lm-color-surface-container` | |
| `--glass-2` | `--lm-color-surface-container-high` | Deixa de ser `rgba` translúcido |
| `--glass-3` | `--lm-color-surface-container-highest` | Idem |
| `--border-color`, `--border` | `--lm-color-outline-variant` | |
| `--primary`, `--info` | `--lm-color-primary` | |
| `--primary-hover` | `color-mix` de `--lm-state-hover` sobre `--lm-color-primary` | **Declarada.** Todos os consumidores legados ganham o hover do sistema de graça |
| `--primary-glow` | `transparent` | Sombra colorida sai do sistema; declarar mantém o CSS válido |
| `--primary-light` | `--lm-color-primary-container` | |
| `--danger` | `--lm-color-error` | |
| `--success` | `--lm-color-success` | |
| `--warning` | `--lm-color-warning` | |
| `--secondary` | `--lm-color-secondary` | |
| `--text-main`, `--text-primary` | `--lm-color-on-surface` | |
| `--text-muted`, `--text-secondary` | `--lm-color-on-surface-variant` | |
| `--text-disable` | `--lm-color-on-surface-disabled` | 8 consumidores. Era o risco R5 — **fechado** |
| `--border-glass` | `1px solid var(--lm-color-outline-variant)` | |
| `--border-glass-hover` | `1px solid var(--lm-color-outline)` | |
| `--radius-sm` / `-md` / `-lg` | `--lm-radius-sm` / `-md` / `-xl` | 8/12/24px, sem mudança de valor |
| `--shadow-sm` / `--shadow` / `--shadow-lg` | `--lm-elevation-1` / `-2` / `-3` | |
| `--duration-fast` | `--lm-duration-fast` | 150ms → **120ms**, 18 usos |
| `--duration-normal` | `--lm-duration-standard` | 250ms → **200ms**, 16 usos |
| `--duration-slow` | `--lm-duration-emphasized` | 400ms → **320ms**, 3 usos |
| `--ease-in-out` | `--lm-easing-standard` | |
| `--ease-out-expo`, `--ease-out-quart` | `--lm-easing-emphasized` | Duas curvas colapsam em uma |
| `--transition-normal` | Composta **na ponte** | Compor no consumidor contradiz o princípio de não tocar em consumidor |

Especificação completa: [`07-implementacao.md`](07-implementacao.md) §6.

A ponte é **dívida declarada**, com data de remoção (Fase 12) e uma medida de progresso:

```bash
grep -rlE "var\(--(bg-|card-|text-|glass-|primary|danger|success|warning|info|secondary|border|shadow|radius-|duration-|ease-|transition-)" frontend/src --include=*.css --include=*.jsx | wc -l
```

### 2.3 Critério de "pronto" de qualquer fase

1. `npm run lint:frontend` sem warnings (o lint-staged usa `--max-warnings=0`).
2. `npm run build:frontend` conclui.
3. O app abre com `npm run dev` e a área tocada funciona **nos dois temas**.
4. Nenhum hexadecimal novo nos arquivos tocados.

---

## 3. Fases

### Fase 0 — Fechar as lacunas bloqueantes de token ✅ **concluída**

Sem os tokens de texto desabilitado e de borda de controle interativo, nenhum componente
passaria no *Definition of Done* de [`08-governanca.md`](08-governanca.md) §8.

Feito: 12 papéis semânticos novos, 8 blocos de componente novos, os primitivos
`--lm-dwell-*`, e `breakpoints.js` como fonte única dos limites para o JS.

| Antes | Depois |
|---|---|
| Texto desabilitado 2,34:1 / 3,04:1 (opacidade) | `--lm-color-on-surface-disabled` — 3,48:1 / 3,91:1 |
| Borda de controle 1,62:1 / 1,98:1 | `--lm-color-outline-interactive` — 4,19:1 / 4,59:1 |

Lacunas restantes e sua prioridade: [`LACUNAS.md`](LACUNAS.md).

---

### Fase 1 — Fundação de CSS

**Objetivo.** Ordem de cascata previsível. **Especifica:** [`07-implementacao.md`](07-implementacao.md) §1, §2.

**Arquivos.** Novos: `styles/layers.css`, `reset.css`, `base.css`, `bridge.css`.
Modificados: `main.jsx`, `styles/global.css`.

**Passos.**
1. `layers.css` com a ordem canônica, e nada mais. É o **primeiro import** do app:
   ```css
   @layer lm.reset, lm.tokens, lm.bridge, lm.base, lm.layout, lm.components, lm.utilities, lm.overrides;
   ```
2. `reset.css` em `@layer lm.reset` — box-sizing, margens, herança de fonte em controles.
   **Sem `outline: none`.**
3. `base.css` em `@layer lm.base` — `html`/`body` com tokens, tipografia base, anel de foco
   (Fase 2) e bloco de `prefers-reduced-motion`.
4. `bridge.css` em `@layer lm.bridge` com as **40** variáveis de §2.2.
5. `main.jsx`: importar na ordem `layers` → `tokens/primitives` → `tokens/semantic` →
   `tokens/components` → `bridge` → `reset` → `base` → `global.css`.
6. `global.css`: envolver o conteúdo em `@layer lm.overrides` e **remover o bloco `:root`**
   (agora vem da ponte) e a linha 1 (`@import` do CDN — Fase 3).

**Aceitação.** O app renderiza igual, com todas as cores vindo dos tokens novos via ponte.
As camadas tornam a ordem de import irrelevante — resolvendo C4 na raiz.

**Verificação.** `npm run build:frontend`; comparar Dashboard, Calendário e Configurações
com capturas anteriores.

**Risco.** Médio — `--duration-*` muda o timing em toda a app e `--glass-*` deixa de ser
translúcido. Diferença sutil é esperada; diferença grosseira indica erro de mapeamento.

**Esforço.** M · **Depende de.** Fase 0

---

### Fase 2 — Foco e acessibilidade de base

**Objetivo.** Eliminar A1, A3 e A8. **Especifica:** [`03-acessibilidade.md`](03-acessibilidade.md) §3, §8.

**Passos.**
1. Confirmar que `* { outline: none }` não existe mais: `grep -rn "outline:\s*none" frontend/src/`.
2. Anel de foco de `03` §3.3 em `base.css`, com `:where()` para manter especificidade zero.
3. Reset correto que o acompanha: `:focus:not(:focus-visible) { outline: none; }`.
4. `scroll-margin-block-start` nos focáveis, para o app bar fixo não encobrir quem recebe
   foco (WCAG 2.4.11).
5. Bloco global de `prefers-reduced-motion` — o único `!important` legítimo do sistema.

**Aceitação.** As 10 páginas percorríveis inteiramente por Tab, com foco visível em cada
parada, nos dois temas.

**Risco.** Baixo. **Esforço.** P · **Depende de.** Fase 1

---

### Fase 3 — Tipografia offline

**Objetivo.** Eliminar O1. **Especifica:** [`07-implementacao.md`](07-implementacao.md) §7.

**Passos.**
1. Empacotar Inter — **apenas pesos 400 e 500** (a escala não usa outros), `unicode-range`
   latino, `font-display: swap`.
2. **Não** empacotar a monoespaçada: `Cascadia Mono` já existe no Windows 10/11, único alvo.
3. Remover a linha 1 de `global.css`.
4. Colocar as fontes sob `frontend/src/assets/`, **nunca** em `electron/assets/` — o filtro
   `"!electron/assets/!(tray-icon.*)"` as descartaria em silêncio (O2).
5. Confirmar que `base: './'` continua no `vite.config.js`.
6. Tratar T9 — as 51 declarações `font-weight: 600/700` precisam cair para 500.

**Aceitação.** Sem rede, o app renderiza em Inter (DevTools → *Computed* → *Rendered Fonts*).

**Risco.** Baixo — medir o tamanho do instalador antes e depois.

**Esforço.** P · **Depende de.** Fase 1

---

### Fase 4 — Biblioteca de primitivos

**Objetivo.** Os componentes React que as páginas vão consumir. Nenhuma página muda aqui.
**Especifica:** [`05-componentes.md`](05-componentes.md) Partes 2 e 3;
[`07-implementacao.md`](07-implementacao.md) §4, §5.

**Arquivos.** Novos, em `frontend/src/components/ui/`.

**Passos.** Implementar nesta ordem, cada um com seu CSS em `@layer lm.components`:
Button → IconButton → TextField/Textarea → Select → Checkbox/Radio/Switch → Card → Dialog →
Menu → Chip → Badge → Tooltip → Snackbar (+ provider de fila) → EmptyState/Skeleton/Progress
→ Tabs → DataTable.

Cada um segue a API de `07` §5 e a camada de estado por `color-mix` de `05` §2.2.

**Aceitação.** Toda variante e todo estado renderizam nos dois temas e nas três densidades,
operáveis por teclado. Cada componente passa nos 24 itens do DoD de `08` §8 — **não há
crédito parcial: 23 de 24 é "não pronto"**.

**Verificação.** Sandbox `/__ui` temporária com a matriz completa, removida na Fase 12.

**Risco.** Médio — define a qualidade de todas as fases seguintes. Errar a API custa
retrabalho em 10 páginas.

**Esforço.** G · **Depende de.** Fases 1, 2

---

### Fase 5 — Tema claro/escuro com alternância

**Objetivo.** Ativar os dois temas. **Especifica:** [`07-implementacao.md`](07-implementacao.md) §3.

**Passos.**
1. `ThemeContext` com `system` (padrão), `light`, `dark`. Escreve `data-theme` no `<html>` —
   nunca no `<body>`, porque o CSS gerado tem escopo em `:root`.
2. Persistir em `localStorage`, lido antes da primeira pintura (script inline em
   `index.html`) para não piscar.
3. Remover os quatro `#101922` literais (T3).
4. Alternância no menu da app bar.

**Aceitação.** Alternar atualiza a app inteira sem recarregar; a escolha manual vence a
preferência do SO **nos dois sentidos**; sem flash inicial.

**Risco.** Médio — `<select>` nativo em Electron depende de `color-scheme`, já emitido pelos
tokens. Testar os dropdowns de Configurações nos dois temas.

**Esforço.** M · **Depende de.** Fase 1

---

### Fase 6 — Piloto: Login

**Objetivo.** Validar a API dos primitivos numa tela isolada, de baixo risco.
**Especifica:** [`06-padroes.md`](06-padroes.md) Padrão 1.

**Arquivos.** `pages/Login.jsx` (247 linhas, 11 inline, bloco `<style>` na linha 213).

**Passos.** Trocar por `TextField`, `Button`, `Card`. **Extrair o bloco `<style>` para um
`.css` próprio** — é o piloto do defeito C2, e o padrão vale para `AISuggestions` e
`CondoTemplate` depois. Corrigir A5 (`tabIndex={-1}`). Rótulos persistentes, erro associado
por `aria-describedby`, foco no primeiro campo inválido.

**Aceitação.** `grep -cE "style=\{\{|<style>|#[0-9a-fA-F]{3,8}" frontend/src/pages/Login.jsx` = 0.

**Risco.** Baixo. **Esforço.** P · **Depende de.** Fase 4

---

### Fase 7 — Navegação adaptativa

**Objetivo.** A hierarquia de [`02-layout.md`](02-layout.md) §3: seis destinos no rail;
Notificações e Sugestões IA viram painéis; Template vira subdestino de Documentos;
Configurações no rodapé do rail.

**Arquivos.** Renomear `components/Sidebar.{jsx,css}` → `AppNavigation.{jsx,css}` (corrige
N5). Novos: `AppBar.jsx`, `NavigationRail.jsx`, `SupportingPanel.jsx`. Modificados:
`App.jsx`, `App.css`.

**Passos.**
1. Extrair a app bar do `TopNav` atual.
2. Rail com os 6 destinos e os **três sinais** de seleção de `05` §NavigationRail —
   indicador tonal, cor de conteúdo e peso do rótulo; `strokeWidth` como quarto opcional.
   Nunca cor sozinha.
3. `SupportingPanel` à direita, hospedando Notificações e Sugestões IA sem tirar o usuário
   da página.
4. `CondoTemplate` vira segmento de Documentos.
5. Rail em expanded/large, drawer em medium, barra inferior em compact (**teto de 5 itens**).
6. **Migrar o fluxo de auto-update para `<button>`** — hoje é `<div onClick>`
   (`Sidebar.jsx:179`, defeito A4) e não funciona por teclado. Preservar
   `checkForUpdates`/`downloadUpdate`/`installUpdate` sem alterar a lógica.

**Aceitação.** Seis destinos por teclado com ordem lógica; painéis não perdem contexto;
auto-update operável por teclado e funcional; `Escape` fecha painel e drawer devolvendo foco.

**Verificação.** Redimensionar pelos cinco breakpoints; **testar o update em build
empacotado**, não em `npm run dev`.

**Risco.** **Alto** — maior mudança de UX e toca o auto-update, crítico e difícil de testar
em desenvolvimento. Branch própria.

**Esforço.** G · **Depende de.** Fases 4, 5

---

### Fase 8 — Páginas de leitura

**Objetivo.** Dashboard, Conflitos, Notificações.
**Especifica:** [`06-padroes.md`](06-padroes.md) Padrões 10, 11, 14.

**Passos.** Por página: `Card`, `Button`, remoção de inline, e os três estados obrigatórios
(vazio, carregando com skeleton de geometria real, erro com repetição). Corrigir:
- N18 — "Atualizar" deixa de apagar a página; indicador linear, conteúdo permanece
- N19 — `ErrorBoundary` com escopo nomeado, código copiável e cor de **erro**
- N10 — Notificações: chips de filtro, sem abas duplicando
- N11 — Conflitos vira list-detail, não modal
- T5 — remover o texto em gradiente do Dashboard
- A4 — `<div onClick>` de `Notifications.jsx:275` vira `<button>`

**Aceitação.** Zero inline e zero hexadecimal nos seis arquivos; três estados demonstráveis.

**Risco.** Médio. **Esforço.** G · **Depende de.** Fases 4, 6

---

### Fase 9 — Gráficos

**Objetivo.** Ligar Recharts aos tokens validados.
**Especifica:** [`07-implementacao.md`](07-implementacao.md) §8.

**Passos.**
1. Módulo que lê `--lm-chart-*` do CSS computado e reage à troca de tema (Recharts precisa
   de valor, não de `var()`).
2. Regras invioláveis: ordem de slots fixa, **nunca ciclada**; cor segue a **entidade**, não
   o ranking; **proibido eixo duplo**; legenda com 2+ séries; texto em token de tinta.
3. Séries de plataforma com slot fixo por entidade, documentado.
4. Eliminar T6 e T7 — os 25 hexadecimais de `Statistics.jsx`, com atenção ao `#8884d8` da
   linha 331 e ao tooltip `background:'white'` da 340, que passa a
   `--lm-color-chart-tooltip-bg`.
5. `isAnimationActive={false}` sob `prefers-reduced-motion`.

**Aceitação.** Legíveis nos dois temas; trocar filtro não repinta séries; nenhuma identidade
comunicada só por cor. Em scatter, teto de 2 séries limpo / 3 com rótulo direto.

**Risco.** Médio. **Esforço.** M · **Depende de.** Fase 5

---

### Fase 10 — Formulários e tabelas

**Objetivo.** Documentos, Emails, Estatísticas, CondoTemplate.
**Especifica:** [`06-padroes.md`](06-padroes.md) Padrões 3, 4, 6, 9.

**Passos.** `DataTable` com ordenação, filtros e responsividade (esconder colunas →
linha vira card → detalhe em painel; **nunca** encolher texto). Formulários com rótulo
persistente e foco no primeiro erro. Corrigir:
- N6 — o formulário de ~15 campos sai do modal e vira página
- N7 — `window.confirm` vira Dialog do sistema
- N8 — scrim deixa de descartar trabalho não salvo
- N12 — seletor de reserva com busca, no lugar de "ID da Reserva"
- C5 — folha de impressão dedicada com `@page`, no lugar de `body * { visibility: hidden }`
- C2 — extrair o `<style>` de `CondoTemplate.jsx`

**Risco.** Médio. **Esforço.** G · **Depende de.** Fases 4, 7, 8

---

### Fase 11 — Configurações e Sugestões IA

**Objetivo.** As duas piores páginas, por último de propósito.
**Especifica:** [`06-padroes.md`](06-padroes.md) Padrões 5, 15.

**Passos.**
1. `Settings` precisa de reestruturação, não só de tokens: 893 linhas é o sintoma. Um
   componente por seção, agrupado **por assunto** e não por dificuldade (N13). Desbloqueio
   por seção no lugar do modo global de edição. Preferências de efeito imediato viram
   `Switch` (N14). Zona destrutiva separada, com confirmação por digitação (N9).
2. `AISuggestions` vira o conteúdo do painel criado na Fase 7 — deixa de ser página.
   Elimina os 55 inline e o `<style>` da linha 223.
3. Resolver T8 — `#8b5cf6` some; "IA" e "documento" recebem papéis distintos.
4. Eliminar o `!important` de `global.css:476` junto com o checkbox (C4).

**Aceitação.** Zero inline nos dois arquivos; nenhum arquivo de página acima de ~400 linhas.

**Risco.** **Médio-alto** — `Settings` toca configuração real (credenciais de e-mail, URLs
de iCal, chaves de IA). Erro aqui quebra funcionalidade, não aparência. Testar cada seção
salvando de verdade.

**Esforço.** G · **Depende de.** Fases 4, 7, 10

---

### Fase 12 — Wizard do Electron

**Objetivo.** A primeira tela da instalação passa a pertencer ao sistema.

**Arquivos.** `electron/wizard/wizard.css` (23 KB), `wizard.html` (30 KB), `wizard.js`.

**Passos.**
1. Importar `tokens/primitives.css` e `tokens/semantic.css` no `wizard.html` — os mesmos
   tokens, sem duplicar valores.
2. Substituir os **74 emoji** por ícones `lucide-react` (ou SVG inline equivalente, já que o
   wizard não é React) com rótulo textual.
3. Aplicar o padrão de wizard de `06-padroes.md` Padrão 2: indicador de etapas como lista
   ordenada, não barra de porcentagem.
4. Foco, teclado e `prefers-reduced-motion` iguais aos do app.

**Aceitação.** Wizard visualmente contínuo com o app nos dois temas; nenhum emoji como
ícone; navegável por teclado.

**Risco.** Médio — roda em janela Electron separada, fora do bundle Vite. Verificar que os
caminhos de import funcionam sob `file://`.

**Esforço.** M · **Depende de.** Fases 1, 5

---

### Fase 13 — Limpeza

**Objetivo.** Remover a dívida declarada na Fase 1.

**Passos.**
1. Confirmar zero consumidores da ponte com o `grep` de §2.2.
2. Excluir `bridge.css` e seu import.
3. Migrar o resto de `global.css` para `base.css` ou para o CSS do componente dono; excluir
   o arquivo.
4. Remover a sandbox `/__ui`.
5. Varredura final de hexadecimais e de blocos `<style>`.

**Aceitação.** `bridge.css` e `global.css` não existem. Nenhum hexadecimal fora de
`styles/tokens/`. Nenhum `style={{}}` estático — cada exceção dinâmica documentada.

**Risco.** Baixo, se as fases anteriores fecharam. **Esforço.** M · **Depende de.** Todas

---

## 4. Ordem de migração das páginas

| # | Página | Linhas (jsx+css) | Inline | Por quê nesta posição |
|---|---|---|---|---|
| 1 | Login | 247 + 0 | 11 | Isolada, sem CSS compartilhado, fácil de reverter. Piloto que valida a API com custo mínimo |
| 2 | Dashboard | 323 + 245 | 15 | Mais visível: problema de token aparece na hora. Exercita card, estatística, feed e gráfico |
| 3 | Conflitos | 408 + 328 | 1 | Quase nenhum inline — o esforço é em tokens e no padrão list-detail |
| 4 | Notificações | 324 + 361 | 2 | Mais CSS que JSX; vira painel na Fase 7 |
| 5 | Estatísticas | 423 + 209 | 5 | Depende da paleta de gráficos (Fase 9) |
| 6 | Emails | 515 + 288 | 0 | Zero inline; volume alto mas mecânico |
| 7 | Documentos | 688 + 258 | 8 | Tabela + formulário; absorve `CondoTemplate` |
| 8 | CondoTemplate | 282 + 0 | 43 | Deixa de existir como página |
| 9 | Sugestões IA | 461 + 0 | 55 | Pior densidade de inline e muda de natureza |
| 10 | Configurações | 893 + 123 | 16 | Maior arquivo, precisa reestruturação, toca configuração funcional |

Princípio: **risco crescente**. Começa pelo que é fácil reverter, termina pelo que quebra
funcionalidade se errar.

---

## 5. Riscos e mitigação

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Regressão visual silenciosa | Alta | Médio | Capturas antes/depois por página nos dois temas. Não há teste visual automatizado hoje |
| R2 | A Fase 7 quebra o auto-update | Média | **Alto** | O menu de três pontos concentra o fluxo e hoje é `<div onClick>`. Migrar sem alterar a lógica; testar em **build empacotado** |
| R3 | `Settings` quebra funcionalmente | Média | **Alto** | Seção a seção, salvando de verdade a cada uma. Última fase de página por isso |
| R4 | Tema claro expõe contraste que o escuro escondia | Média | Médio | Mitigado na origem: 80+ pares verificados por `--check`. O risco residual é de composição |
| R5 | ~~`--text-disable` sem equivalente~~ | — | — | **Fechado** na Fase 0 por `--lm-color-on-surface-disabled` |
| R6 | Ponte legada vira permanente | Média | Médio | A Fase 13 é fase, não intenção; o `grep` de §2.2 mede a qualquer momento |
| R7 | Paleta de gráficos regride em silêncio | Média | Médio | A validação de ΔE sob daltonismo é **comentário**, não portão. `--check` valida contraste, não separação. Revalidar manualmente ao mudar semente de matiz — ver [`LACUNAS.md`](LACUNAS.md) § Lacuna de processo |
| R8 | Fonte empacotada aumenta o instalador | Alta | Baixo | Só 400 e 500, só latino, mono não empacotada. Medir antes e depois |
| R9 | Fonte colocada em `electron/assets/` é descartada | Média | Médio | O filtro do `package.json` a removeria em silêncio. Fase 3 passo 4 |
| R10 | Roteamento por `useState` limita deep link | Baixa | Baixo | Fora de escopo (§6). Reavaliar depois da Fase 7 |

---

## 6. Fora de escopo

- **Backend.** Nenhuma mudança em `app/`, endpoints, modelos ou schema.
- **Funcionalidades novas.** O plano reorganiza a capacidade existente. Busca global e
  paleta de comandos estão especificadas no sistema mas **não** são implementadas aqui.
- **`react-router`.** O roteamento por `useState` é limitado, mas trocá-lo é mudança de
  arquitetura ortogonal, e a Fase 7 já é a maior mudança estrutural do plano. Empilhar as
  duas multiplica o risco. Reavaliar depois da Fase 7, como trabalho próprio.
- **TypeScript.**
- **Suíte de testes de frontend.** A Fase 4 introduz a sandbox de componentes; montar uma
  suíte é trabalho próprio.
- **As lacunas de prioridade média e baixa** de [`LACUNAS.md`](LACUNAS.md).
- **Documentação completa do catálogo resumido** de `05` Parte 4 — backlog de governança.

---

## 7. Checklist de conclusão

- [ ] `grep -rE "#[0-9a-fA-F]{3,8}\b" frontend/src/ --include=*.css --include=*.jsx | grep -v "styles/tokens"` vazio
- [ ] `grep -rn "outline:\s*none" frontend/src/` vazio, exceto `:focus:not(:focus-visible)`
- [ ] `grep -rn "fonts.googleapis" frontend/src/` vazio
- [ ] `grep -rn "<style>" frontend/src/` vazio
- [ ] `grep -rn "window.confirm" frontend/src/` vazio
- [ ] `frontend/src/styles/bridge.css` e `global.css` não existem
- [ ] Nenhum `style={{}}` estático; cada exceção dinâmica documentada
- [ ] Nenhum arquivo de página acima de ~400 linhas
- [ ] Nenhum `!important` fora de `@layer lm.overrides` e do bloco `prefers-reduced-motion`
- [ ] Nenhum `<div onClick>` como controle
- [ ] Toda página navegável só por teclado, com foco visível em cada parada
- [ ] Todo botão de ícone com nome acessível
- [ ] Todo campo com rótulo persistente e erro associado
- [ ] Todo dialog com contenção de foco, `Escape` e devolução de foco
- [ ] Toda página com estado vazio, carregando e erro
- [ ] Os dois temas completos, alternância persistida, sem flash inicial
- [ ] Layout íntegro nos cinco breakpoints e em zoom de 200%
- [ ] Nenhum estouro horizontal em 320px CSS — atenção ao Snackbar, cujo piso de 344px precisa ser desligado em `compact` ([`05-componentes.md`](05-componentes.md) §Snackbar)
- [ ] `prefers-reduced-motion` respeitado
- [ ] Wizard do Electron usando os mesmos tokens, sem emoji como ícone
- [ ] `python scripts/design/generate_tokens.py --check` passa
- [ ] `npm run lint:frontend` sem warnings
- [ ] `npm run build:frontend` e `npm run dist` concluem
- [ ] Verificado **offline, em build empacotado**, com auto-update funcionando por teclado
