# 05 — Componentes

Catálogo do LUMINA Design System. Um componente só existe aqui quando tem anatomia,
estados, contrato de teclado e tokens definidos. Componente sem estado de foco e sem
operação por teclado está **incompleto**, não "quase pronto".

> Nenhum componente deste catálogo está implementado em código. O documento descreve o
> alvo; a implementação é a Fase 4 de [`PLANO_REFATORACAO.md`](PLANO_REFATORACAO.md).

---

## Como ler este catálogo

Cada componente da Parte 3 responde aos 20 campos do template, agrupados em blocos para
caber numa leitura. O mapeamento:

| Bloco | Campos do template que cobre |
|---|---|
| Objetivo · Usar / Não usar | 1, 2, 3, 4 |
| Anatomia | 5 |
| Variantes e tamanhos | 6, 7 |
| Estados | 8, 9 |
| Conteúdo | 10 |
| Acessibilidade · Teclado | 11, 12 |
| Responsividade | 13 |
| Tokens | 14, 15, 16 — tema claro e escuro saem do mesmo token semântico |
| Correto / Incorreto · Edge cases | 17, 18, 19 |
| Aceitação | 20 |

### Regras herdadas — citadas, nunca reescritas

Quatro especificações vivem fora deste documento e valem para todo componente. Repetí-las
aqui criaria uma segunda fonte de verdade que envelhece sozinha.

| O quê | Onde | Resumo operacional |
|---|---|---|
| **Anel de foco** | [`03-acessibilidade.md`](03-acessibilidade.md) §3.3 | `:focus-visible` + `:where()`, `--lm-focus-ring-width` 3px, `--lm-focus-ring-offset` 2px. A cor é **sempre** `--lm-focus-ring-color`, inclusive em botão destrutivo — mudar por contexto quebra WCAG 3.2.4 |
| **Teclado de widget composto** | [`03-acessibilidade.md`](03-acessibilidade.md) §4.2 | Tabelas completas de Menu, Dialog, Tabs, DataTable, Combobox, NavigationRail e paleta de comandos |
| **Estado nunca só por cor** | [`03-acessibilidade.md`](03-acessibilidade.md) §7 | Mínimo dois canais; cor é sempre o secundário |
| **Rótulo de botão** | [`04-conteudo.md`](04-conteudo.md) §3.2 | Vocabulário fechado. "Excluir documento", não "Excluir". "OK" proibido quando a ação pode ser nomeada |

---

## Parte 1 — Template de documentação

| # | Campo | Pergunta que responde |
|---|---|---|
| 1 | Nome | Como se chama, em inglês no código e em português na interface |
| 2 | Objetivo | Que problema resolve, em uma frase |
| 3 | Quando usar | Situação em que é a escolha certa |
| 4 | Quando não usar | Situação em que outro componente é melhor, e qual |
| 5 | Anatomia | Partes nomeadas, de fora para dentro |
| 6 | Variantes | Formas distintas, e o critério de escolha entre elas |
| 7 | Tamanhos | Escala disponível e o que muda em cada degrau |
| 8 | Estados | Desvios em relação aos estados universais da Parte 2 |
| 9 | Comportamento | O que acontece em resposta a cada interação |
| 10 | Conteúdo | Regras de texto, limites, truncamento |
| 11 | Acessibilidade | Papel, nome, estado; o que o leitor de tela anuncia |
| 12 | Navegação por teclado | Tecla a tecla, incluindo como se sai |
| 13 | Responsividade | Comportamento nas cinco classes de janela |
| 14 | Tema claro | Só quando diverge do token semântico |
| 15 | Tema escuro | Só quando diverge do token semântico |
| 16 | Tokens utilizados | Lista completa |
| 17 | Exemplos corretos | Uso real, do domínio do LUMINA |
| 18 | Exemplos incorretos | Erro real, com o motivo |
| 19 | Edge cases | Texto longo, valor ausente, volume grande, offline |
| 20 | Critérios de aceitação | Checklist objetiva de pronto |

---

## Parte 2 — Estados universais e camada de estado

### 2.1 Os estados

Todo componente interativo tem estes estados. Ausência de qualquer um é defeito.

| Estado | Quando | Sinal |
|---|---|---|
| `default` | Repouso | — |
| `hover` | Ponteiro sobre o alvo | Camada `--lm-state-hover` |
| `focus` | Foco por qualquer meio | Camada `--lm-state-focus` |
| `focus-visible` | Foco por teclado | Anel de foco **+** camada |
| `pressed` | Botão do ponteiro ou tecla pressionada | Camada `--lm-state-pressed` |
| `selected` | Escolha persistente | Contêiner tonal **ou** camada `--lm-state-selected` — nunca os dois |
| `disabled` | Indisponível | `--lm-color-on-surface-disabled` + `aria-disabled` + motivo |
| `loading` | Operação em curso | Tamanho preservado, envio bloqueado, `aria-busy` |
| `error` | Valor ou operação inválida | Borda + ícone + texto |
| `read-only` | Visível, não editável | Cor mantida, fundo diferente, chip de origem |

### 2.2 O mecanismo da camada de estado

Interação **não troca a cor do componente**. Sobrepõe uma camada da cor de **conteúdo**,
com a opacidade do estado. O mecanismo é `color-mix(in oklab, …)`, sem fallback — o
Electron 28/29 embarca Chromium 120+.

```css
/* Botão preenchido: a camada nasce da cor do RÓTULO, não de um azul mais escuro. */
.lm-button--filled { background: var(--lm-button-filled-bg); }
.lm-button--filled:hover {
  background: color-mix(in oklab,
    var(--lm-button-filled-label) calc(var(--lm-state-hover) * 100%),
    var(--lm-button-filled-bg));
}
.lm-button--filled:active {
  background: color-mix(in oklab,
    var(--lm-button-filled-label) calc(var(--lm-state-pressed) * 100%),
    var(--lm-button-filled-bg));
}

/* Superfície transparente: a camada nasce da cor de conteúdo sobre a superfície. */
.lm-menu-item:hover {
  background: color-mix(in oklab,
    var(--lm-color-on-surface) calc(var(--lm-state-hover) * 100%),
    transparent);
}
```

As sete opacidades vêm de [`01-fundamentos.md`](01-fundamentos.md) §7.5:
`--lm-state-hover` 0.08 · `--lm-state-focus` 0.10 · `--lm-state-pressed` 0.12 ·
`--lm-state-dragged` 0.16 · `--lm-state-selected` 0.12 ·
`--lm-state-disabled-container` 0.12 · `--lm-state-disabled-content` 0.38.

**Três regras duras.**

1. `--lm-state-selected` **nunca** se acumula com contêiner tonal. Ou a seleção é
   `--lm-navigation-item-bg-selected` / `--lm-chip-selected-bg` /
   `--lm-table-row-selected-bg`, ou é camada. Nunca as duas.
2. Camada de estado **nunca** substitui o anel de foco. `--lm-state-focus` complementa.
3. Texto desabilitado usa `--lm-color-on-surface-disabled`, que é **cor**, não opacidade.
   `--lm-state-disabled-content` (0.38) fica para ícone e para o contêiner desabilitado —
   aplicá-la a texto rende 2,34:1, e desabilitado ainda precisa ser lido.

---

## Parte 3 — Os 19 componentes fundamentais

### 1. Button

**Objetivo.** Executar uma ação. **Usar** para ação; **não usar** para navegar entre
destinos — isso é Link ou item de NavigationRail.

**Anatomia.** Contêiner (altura `--lm-button-height`, raio `--lm-button-radius` = pílula) →
ícone inicial opcional (20px) → rótulo (`--lm-type-label-lg-*`) → ícone final opcional.
Espaço interno `--lm-button-padding-inline`, entre partes `--lm-button-gap`.

**Variantes.** A escolha é por **ênfase**, e a ênfase corresponde à importância funcional.

| Variante | Ênfase | Uso | Tokens |
|---|---|---|---|
| `filled` | Máxima | A ação principal da região. Uma só | `--lm-button-filled-bg`, `--lm-button-filled-label` |
| `tonal` | Alta | Ação importante que não é a principal | `--lm-button-tonal-bg`, `--lm-button-tonal-label` |
| `outlined` | Média | Alternativa relevante; par de `Cancelar` | `--lm-button-outlined-border`, `--lm-button-outlined-label` |
| `text` | Baixa | Ação terciária, dentro de card ou linha | `--lm-button-text-label` |
| `elevated` | Alta sobre superfície inquieta | Sobre imagem, mapa ou lista rolante | `--lm-button-elevated-bg`, `--lm-button-elevated-shadow` |
| `destructive` | Máxima, reservada | Ação irreversível, em zona separada | `--lm-button-destructive-bg`, `--lm-button-destructive-label` |
| `fab` / `fab-extended` | Máxima, flutuante | Uma ação de criação dominante na tela | `--lm-button-filled-bg`, `--lm-elevation-3` |
| `split` | Alta | Ação padrão + variações no menu anexo | Compõe Button + IconButton + Menu |

**Estados.** Camada de estado da Parte 2 sobre a cor de rótulo da variante.
`disabled` usa `--lm-color-on-surface-disabled` no rótulo e
`--lm-state-disabled-container` no fundo. `loading` troca o rótulo pelo gerúndio
(`Salvando…`) e **preserva a largura** — botão que encolhe move o layout sob o ponteiro.

**Conteúdo.** Verbo no infinitivo, até 3 palavras, do vocabulário de `04` §3.2. O verbo do
botão repete o verbo do título do diálogo. Nunca dois ícones decorativos.

**Acessibilidade.** `<button type="button">` real. Desabilitado que precisa ser descoberto
usa `aria-disabled="true"` em vez de `disabled`, para continuar alcançável e poder explicar
o motivo. `loading` marca `aria-busy="true"` e bloqueia reenvio.

**Teclado.** `Enter` e `Space` acionam — comportamento nativo, não reimplementar.

**Responsividade.** Largura livre; nunca fixe largura com base num rótulo curto (um rótulo
em inglês pode crescer 40%). Em `compact`, grupo de botões empilha e cada um vai a 100% de
largura, ação primária no topo.

**Correto.** `Gerar autorização` (filled) + `Cancelar` (outlined) num diálogo.
**Incorreto.** Quatro botões preenchidos lado a lado — a ênfase deixa de significar
alguma coisa. Hoje em [`Documents.jsx:413`](../../frontend/src/pages/Documents.jsx:413)
duas ações de mesma largura disputam o papel de primária.

**Edge cases.** Rótulo que não cabe: **não** trunca — o botão cresce ou o rótulo encurta na
origem. Ação que demora mais de 10s: barra de progresso determinada, não `loading` infinito.

**Aceitação.** Todas as variantes nos dois temas · foco visível · largura estável em
`loading` · rótulo do vocabulário aprovado · uma só `filled` por região.

**No LUMINA hoje:** `.btn-primary` → `filled`; `.btn-secondary` → `outlined`;
`.btn-ghost` → `text`. O "Hard Reset" de
[`Settings.jsx:266`](../../frontend/src/pages/Settings.jsx:266) é `destructive` com rótulo
fora do vocabulário e `#e53e3e` inline.

---

### 2. IconButton

**Objetivo.** Ação cujo ícone é autoexplicativo, onde não cabe rótulo.
**Não usar** quando o ícone é ambíguo — aí é Button com rótulo.

**Anatomia.** Alvo quadrado `--lm-icon-button-size` (= `--lm-density-control`) → ícone
`--lm-icon-button-icon-size` (20px) centrado. Raio `--lm-icon-button-radius` (pílula).

**Variantes.** `standard` (`--lm-icon-button-color`) · `selected`
(`--lm-icon-button-selected-bg` + `--lm-icon-button-selected-color`) · `destructive`
(`--lm-color-error`).

**Acessibilidade — o ponto crítico.** `aria-label` é **obrigatório** e descreve a **ação**,
não o desenho: `aria-label="Sincronizar agora"`, nunca `"seta circular"`. O `<svg>` leva
`aria-hidden="true"`. `title` não é nome acessível confiável — serve de tooltip, não de
rótulo. Alternância usa `aria-pressed`.

**Responsividade.** 40px padrão, 48px sob `(pointer: coarse)`. Espaço mínimo entre alvos
adjacentes `--lm-target-min-gap`. Quando o desenho é menor que o alvo, estenda com
pseudo-elemento — **não** com padding, que moveria o ícone.

**Incorreto.** [`Login.jsx:168`](../../frontend/src/pages/Login.jsx:168) tira o botão de
revelar senha do teclado com `tabIndex={-1}`. [`Calendar.jsx:145`](../../frontend/src/components/Calendar.jsx:145)
usa `title=` como único portador do nome do hóspede e da plataforma.

**Aceitação.** Todo IconButton tem `aria-label` · alvo ≥40px · tooltip quando o ícone não é
óbvio · nunca fora da ordem de tabulação.

---

### 3. TextField

**Objetivo.** Entrada de texto de uma linha. Textarea para múltiplas.

**Anatomia.** Rótulo persistente (`--lm-field-label`) → contêiner (altura
`--lm-field-height`, fundo `--lm-field-bg`, borda `--lm-field-border`, raio
`--lm-field-radius`) → prefixo opcional → texto (`--lm-field-text`) → sufixo/ícone/limpar →
texto de ajuda (`--lm-field-help`) ou mensagem de erro (`--lm-field-error-text`).

**Variantes.** `text` · `password` (com IconButton de revelar, `aria-pressed`) · `search`
(`type="search"`, lupa, botão limpar) · `number` com unidade no sufixo · `secret`
(mascarado, com ações "Substituir" e "Remover", nunca reexibe o valor).

**Estados.**

| Estado | Sinal |
|---|---|
| `hover` | `--lm-field-border-hover` |
| `focus` | Borda `--lm-field-border-focus` com `--lm-field-border-width-focus` (2px) |
| `focus-visible` | O mesmo **mais** o anel externo — dois sinais não redundantes: a borda diz "é aqui que eu digito", o anel diz "cheguei por teclado" |
| `error` | `--lm-field-border-error` + ícone + texto. Nunca só a borda |
| `disabled` | `--lm-field-disabled-text` e `--lm-field-disabled-border` |
| `read-only` | Cor de texto **mantida**, fundo `--lm-color-surface-container`, chip de origem |

**Conteúdo.** Rótulo persistente sempre — placeholder **nunca** é rótulo, some ao digitar e
não é lido de forma confiável. Campo obrigatório se identifica com a palavra "obrigatório"
no rótulo; asterisco vermelho sozinho é insuficiente. Instrução longa vai fora do campo.

**Acessibilidade.** `<label for>` real. `aria-describedby` liga o campo ao texto de ajuda
**e** ao erro. `aria-invalid="true"` quando inválido. O erro de campo **não** usa região
viva — evita anúncio duplicado; o resumo de submissão usa `role="alert"` e recebe foco.

**Validação.** Nunca antes da primeira interação. Valida ao sair do campo, revalida ao
digitar depois de já ter errado. Dados preenchidos sobrevivem ao erro. Submissão inválida
leva o foco ao primeiro campo com erro.

**Incorreto.** `input[readonly] { opacity: 0.7 }` em
[`global.css:292`](../../frontend/src/styles/global.css:292) — reduz contraste de tudo,
inclusive do rótulo, para comunicar "somente leitura". Pedir a chave primária ao usuário
("ID da Reserva" em [`Documents.jsx:399`](../../frontend/src/pages/Documents.jsx:399)) em
vez de um seletor de reserva com busca.

**Aceitação.** Rótulo persistente · erro associado por `aria-describedby` · foco com dois
sinais · dados preservados após erro · `read-only` legível.

---

### 4. Select

**Objetivo.** Escolher um valor de uma lista curta e conhecida (até ~12 itens). Acima
disso, ou quando o usuário sabe o que quer digitar, use Combobox.

**Anatomia.** Igual ao TextField, com chevron no sufixo. Lista em `--lm-z-dropdown`,
superfície `--lm-menu-bg`, elevação `--lm-menu-shadow`.

**Acessibilidade.** Prefira `<select>` nativo: teclado, leitor de tela e rolagem já
funcionam. Em Electron isso torna `color-scheme` obrigatório — sem ele o dropdown nativo
renderiza claro dentro de um app escuro. Lista customizada exige `role="listbox"`,
`aria-expanded`, `aria-controls` e a tabela de teclado de `03` §4.2 (Combobox).

**Aceitação.** Funciona nos dois temas incluindo o dropdown nativo · valor selecionado
anunciado · teclado completo.

---

### 5. Checkbox · 6. Radio · 7. Switch

Três controles que as pessoas confundem. O critério é o **efeito**, não a aparência.

| Componente | Semântica | Efeito | Uso no LUMINA |
|---|---|---|---|
| **Checkbox** | Zero ou mais de um conjunto | Aplicado ao **salvar** | Seleção de linha de tabela, aceite, filtros múltiplos |
| **Radio** | Exatamente um de um conjunto | Aplicado ao **salvar** | Escolha exclusiva em formulário (3+ opções; abaixo disso, botão segmentado) |
| **Switch** | Liga/desliga | **Imediato**, sem salvar | Preferência: notificação por Telegram, tema, densidade |

**Anatomia.** Controle (18px de desenho, alvo `--lm-target-min-size` no mínimo, na prática
`--lm-density-control`) + rótulo clicável. O rótulo faz parte do alvo.

**Estados.** Marcado, desmarcado, **indeterminado** (só Checkbox — cabeçalho de tabela com
seleção parcial, `indeterminate` via propriedade, não atributo). Camada de estado circular
em volta do controle.

**Acessibilidade.** `<input type="checkbox|radio">` nativo com `<label for>`. Grupo de
Radio em `<fieldset>` com `<legend>`. Switch é `<button role="switch" aria-checked>` ou
checkbox com `role="switch"`. Indeterminado expõe `aria-checked="mixed"`.

**Teclado.** Checkbox e Switch: `Space` alterna. Radio: setas movem **e selecionam** dentro
do grupo (um único ponto de tabulação); `Tab` sai do grupo.

**Incorreto.** [`Settings.jsx:565`](../../frontend/src/pages/Settings.jsx:565) usa checkbox
para preferências de efeito imediato — o usuário não sabe se precisa salvar. São Switches.

**Aceitação.** Rótulo clicável · alvo ≥40px · Radio navegável por setas · Switch aplica na
hora e confirma com snackbar quando o efeito não é visível.

---

### 8. Card

**Objetivo.** Agrupar informações que pertencem a uma **mesma entidade**. Não é moldura
decorativa.

**Anatomia.** Contêiner (raio `--lm-card-radius`, espaço interno `--lm-card-padding`)
→ cabeçalho opcional → conteúdo → zona de ações.

**Variantes.**

| Variante | Superfície | Quando |
|---|---|---|
| `filled` | `--lm-card-filled-bg` | Padrão em grade. **Sem sombra** |
| `elevated` | `--lm-card-elevated-bg` + `--lm-card-elevated-shadow` | Card que flutua sobre conteúdo inquieto |
| `outlined` | `--lm-card-outlined-bg` + `--lm-card-outlined-border` | Quando a separação precisa ser explícita sem peso tonal |
| `interactive` | Qualquer uma | Card inteiro é um controle: hover, foco e `<button>`/`<a>` envolvendo |
| `selectable` | `--lm-card-selected-bg` | Escolha em wizard; expõe `aria-pressed` ou checkbox real |

**Regras.** Card em grade usa **só** superfície tonal (elevação 0) — sombra em tudo achata
a hierarquia. Card dentro de card é proibido salvo agrupamento real de segundo nível.
Card interativo tem **uma** área clicável; ação secundária fica visualmente separada e é
um controle próprio, não um clique aninhado.

**Incorreto.** [`Dashboard.css:63`](../../frontend/src/pages/Dashboard.css:63) eleva o card
no hover com `translateY(-3px)` — hover que move layout. E `.glass-card` aplica sombra a
todos os cards, inclusive os estáticos em grade.

**Aceitação.** Agrupamento real · padding consistente · uma área clicável · elevação
justificada por comportamento.

---

### 9. NavigationRail

**Objetivo.** Destinos de primeiro nível. Um único componente com dois estados — recolhido
e expandido —, não dois componentes.

**Anatomia** (de cima para baixo, [`02-layout.md`](02-layout.md) §3.4): alternador →
divisor → seis destinos → espaço flexível → divisor → Configurações → zona de conta.

**Dimensões.** `--lm-navigation-rail-width` 88px recolhido ·
`--lm-navigation-rail-width-expanded` 256px · `--lm-navigation-item-height` 56px, fixo e
isento de densidade · indicador `--lm-navigation-indicator-width` × `-height`.

**Estado selecionado — três sinais simultâneos.** Como `lucide-react` não tem variante
preenchida, a seleção se comunica por:

1. Indicador tonal em pílula (`--lm-navigation-item-bg-selected`) — **forma**
2. Cor de conteúdo (`--lm-navigation-item-label-selected`) — **cor**
3. Peso do rótulo 400 → 500, mesmo tamanho e mesmo tracking — **tipografia**

Quarto sinal opcional: `strokeWidth` do ícone 2 → 2.25. `aria-current="page"` é obrigatório,
mas é semântica, não sinal visual.

**Responsividade.** `compact` → barra inferior, **teto de cinco itens**; `medium` → drawer
modal de `--lm-navigation-drawer-width`; `expanded` → rail recolhido; `large` → recolhido
com alternador; `xlarge` → expandido por padrão. Escolha do usuário persiste e vence.

**Teclado.** `03` §4.2. O rail inteiro é **um** ponto de tabulação e entra no destino atual.

**Aceitação.** Três sinais de seleção · `aria-current` · um ponto de tabulação · foco vai
ao `<h1>` da página nova · funciona nas cinco classes de janela.

---

### 10. AppBar

**Objetivo.** Contexto da página e ações globais.

**Anatomia.** Botão de menu (só em `medium`) → título da página → espaço → busca global →
IconButton de Notificações (com Badge) → IconButton de Sugestões IA → alternador de tema →
menu de conta.

**Dimensões.** `--lm-app-bar-height` 64px, `--lm-app-bar-height-compact` 56px. Superfície
`--lm-app-bar-bg`; ao rolar, `--lm-app-bar-bg-scrolled` — a mudança de superfície é o que
separa a barra do conteúdo, não uma sombra.

**Acessibilidade.** `<header>` com o `<h1>` da página. Como a barra é fixa, todo controle
focável precisa de `scroll-margin-block-start` para não ficar encoberto ao receber foco
(`03` §3.3 já traz a regra). O link "pular para o conteúdo" é o primeiro elemento focável
do documento.

**No LUMINA hoje:** `TopNav` em
[`Sidebar.jsx`](../../frontend/src/components/Sidebar.jsx) acumula AppBar + navegação. O
menu de três pontos concentra o fluxo de auto-update — e usa `<div onClick>`
([`Sidebar.jsx:179`](../../frontend/src/components/Sidebar.jsx:179)), ou seja, **baixar e
instalar atualização não são operáveis por teclado hoje**.

**Aceitação.** `<h1>` presente e único · skip link primeiro · auto-update em `<button>` ·
altura correta por classe de janela.

---

### 11. Tabs

**Objetivo.** Alternar entre conteúdos irmãos **do mesmo objeto**.
**Não usar** como substituto de navegação, nem como filtro de lista — filtro é Chip.

**Anatomia.** Tablist → tabs (rótulo + badge opcional) → indicador → painel.

**Acessibilidade.** `role="tablist"` / `tab` / `tabpanel`, `aria-selected`, `aria-controls`.
Teclado em `03` §4.2. Ativação automática só quando o painel é barato de renderizar; caso
contrário manual (`Enter`/`Space`).

**Incorreto.** [`Notifications.jsx:249`](../../frontend/src/pages/Notifications.jsx:249)
usa abas como filtro de uma lista — e ainda duplica a mesma informação em chips logo acima.
[`Documents.jsx:382`](../../frontend/src/pages/Documents.jsx:382) põe abas **dentro** do
corpo de um modal.

**Aceitação.** Papéis ARIA corretos · setas navegam · `Tab` vai da aba ativa ao painel ·
não usado como navegação nem como filtro.

---

### 12. Dialog

**Objetivo.** Decisão ou tarefa curta que não pode mudar de contexto.
**Não usar** para formulário longo — isso é página.

**Anatomia.** Scrim (`--lm-scrim-color` com `--lm-scrim-opacity`) → contêiner
(`--lm-dialog-bg`, `--lm-dialog-radius`, `--lm-dialog-shadow`,
`--lm-dialog-max-width` 560px, `--lm-dialog-padding`) → título → corpo → ações à direita.

**Variantes.** `basic` · `confirmation` · `form` (curto) · `alertdialog` (destrutivo) ·
`fullscreen` (em `compact`).

**Comportamento.** Foco contido. `Escape` fecha — mas se houver alteração não salva, pede
confirmação em vez de descartar. Clique no scrim **só** fecha quando não há alteração
pendente. Ao fechar, o foco volta ao acionador.

**Destrutivo.** `role="alertdialog"`. Foco inicial em `Cancelar`. `Enter` não dispara a
destruição. Título nomeia verbo e objeto; o botão repete o verbo. "Tem certeza?" e
`window.confirm` são proibidos ([`04-conteudo.md`](04-conteudo.md) §5.2).

**Incorreto.** [`Documents.jsx:130`](../../frontend/src/pages/Documents.jsx:130) usa
`window.confirm`. Quatro modais fecham no clique do scrim com formulário sujo
([`Documents.jsx:372`](../../frontend/src/pages/Documents.jsx:372),
`Conflicts.jsx:216`, `Dashboard.jsx:49`, `EventModal.jsx:29`).
[`Conflicts.jsx:215`](../../frontend/src/pages/Conflicts.jsx:215) compara duas reservas em
560px — isso é list-detail, não modal.

**Aceitação.** Foco contido e devolvido · `Escape` seguro · scrim não descarta trabalho ·
destrutivo com foco em `Cancelar`.

---

### 13. Menu

**Objetivo.** Lista de ações ancorada a um acionador.
**Não usar** para escolher valor de formulário — isso é Select.

**Anatomia.** Contêiner (`--lm-menu-bg`, `--lm-menu-radius`, `--lm-menu-shadow`,
`--lm-menu-min-width`, `--lm-menu-max-width`) → itens de `--lm-menu-item-height` (48px) →
separadores só entre grupos reais.

**Comportamento.** Abre próximo ao acionador, com direção adaptativa para não sair da
viewport. Camada `--lm-z-popover`. Ação destrutiva fica no fim, separada, com
`--lm-color-error`.

**Teclado.** `03` §4.2.

**Aceitação.** `role="menu"` · setas com laço · `Escape` fecha e devolve foco · destrutiva
separada · nunca corta na borda da janela.

---

### 14. Chip

**Objetivo.** Filtro, entidade ou sugestão — um objeto compacto e manipulável.
**Não usar** como botão genérico.

**Variantes.** `filter` (alterna, `aria-pressed`) · `input` (entidade removível) ·
`assist` (ação contextual) · `suggestion`.

**Anatomia.** Contêiner `--lm-chip-height` (32px), raio `--lm-chip-radius`, borda
`--lm-chip-border` → ícone opcional → rótulo (`--lm-chip-label`) → botão de remover
opcional. Selecionado usa `--lm-chip-selected-bg` e `--lm-chip-selected-label`.

**Acessibilidade.** A borda de 32px de desenho precisa de alvo de 40px — estenda com
pseudo-elemento. `--lm-chip-border` aponta para `--lm-color-outline-interactive`
justamente porque é o único limite de um controle (WCAG 1.4.11, 3:1).

**Teclado.** Não coberto por `03` §4.2 — especificado aqui: `Tab` entra no chip;
`Space`/`Enter` alterna seleção; `Delete` e `Backspace` removem chip removível e movem o
foco para o chip seguinte (ou para o campo, se era o último).

**Aceitação.** Alvo ≥40px · borda a 3:1 · seleção com dois canais · remoção por teclado
com foco reposicionado.

---

### 15. Badge

**Objetivo.** Contagem ou presença de novidade, ancorada a outro elemento.

**Anatomia.** `dot` (`--lm-badge-size-dot` 6px, sem número) ou `count`
(`--lm-badge-size` 16px de altura, `--lm-badge-min-width`, `--lm-badge-padding-inline` para
crescer até "99+"). Cores `--lm-badge-bg` / `--lm-badge-label`.

**Regras.** Badge **nunca é alvo de toque** — quem recebe o clique é o elemento ancorado.
Contagem acima de 99 vira "99+". A contagem precisa estar no nome acessível do ancorador:
`aria-label="Notificações, 3 não lidas"`, não um `<span>3</span>` solto.

**Aceitação.** Nunca é alvo · contagem no nome acessível · "99+" não estoura o contêiner.

---

### 16. DataTable

**Objetivo.** Comparar muitas linhas pelos mesmos atributos.
**Não usar** quando cada item precisa de leitura individual — isso é List.

**Anatomia.** Barra de ações → cabeçalho (`--lm-table-header-height` 48px, **fixo**, preso
em `--lm-z-sticky`, rótulo `--lm-table-header-label`) → linhas (`--lm-table-row-height`,
segue `--lm-density-row`) → divisores `--lm-table-divider` → paginação.

**Alinhamento.** Texto à esquerda; número à direita com `font-variant-numeric: tabular-nums`
— sem isso as colunas dançam. Data em coluna própria, formato pt-BR.

**Seleção.** Checkbox na primeira coluna; cabeçalho com estado indeterminado quando parcial.
Linha selecionada usa `--lm-table-row-selected-bg` **e** checkbox marcado **e** contagem
visível ("3 selecionadas") — três canais. A barra de ações em lote substitui a barra normal.

**Estados.** Vazio (as quatro perguntas de `04` §6.1) · carregando (skeleton com a geometria
final, **não** giro que apaga a tabela) · erro por região, com "Tentar novamente" · parcial.

**Ordenação.** `aria-sort` no `<th>` e anúncio em região viva `polite`.

**Responsividade.** Em ordem: esconder colunas secundárias → linha vira card → detalhe em
painel. Rolagem horizontal só como último recurso, e **nunca** reduzir texto até ficar
ilegível.

**Teclado.** `03` §4.2 (DataTable, `role="grid"`).

**Incorreto.** [`global.css:713`](../../frontend/src/styles/global.css:713) estiliza
`table`, `th` e `td` cruamente — toda tabela nova herda sem pedir. "Atualizar" apaga a
página inteira em [`Notifications.jsx:190`](../../frontend/src/pages/Notifications.jsx:190),
`Documents.jsx:295` e `Conflicts.jsx:123`.

**Aceitação.** Cabeçalho fixo · números tabulares à direita · seleção com três canais ·
quatro estados de dados · teclado por célula · responsividade sem encolher texto.

---

### 17. Snackbar

**Objetivo.** Confirmar que algo aconteceu e, quando aplicável, oferecer desfazer.
**Não usar** para mensagem crítica que exige leitura — isso é Dialog ou banner.

**Anatomia.** Contêiner `--lm-snackbar-bg` (superfície invertida), rótulo
`--lm-snackbar-label`, ação `--lm-snackbar-action`, `--lm-snackbar-shadow`,
largura entre `--lm-snackbar-min-width` e `--lm-snackbar-max-width`. Camada `--lm-z-toast`.

**Permanência.** `--lm-dwell-snackbar` (5s) sem ação; `--lm-dwell-snackbar-action` (10s)
com "Desfazer"; **indefinido** enquanto o ponteiro estiver sobre ele ou o foco dentro.

**Acessibilidade.** `role="status"` (`polite`). Sobre superfície invertida, o foco usa
`--lm-focus-ring-color-inverse` — o anel primário mede 2,02:1 ali e reprovaria.

**Responsividade — regra obrigatória.** Em `compact`, `--lm-snackbar-min-width` (344px)
**não se aplica**: o snackbar ocupa a largura do canvas menos as margens. Sem essa regra
ele estoura. Medido no harness de conformidade: viewport de 320px, margem de 16px de cada
lado, restam 288px de espaço útil contra 344px de largura mínima — **56px de estouro**, o
que produz rolagem horizontal e reprova WCAG 1.4.10 (Reflow), exigido por
[`02-layout.md`](02-layout.md) §2.2 e [`03-acessibilidade.md`](03-acessibilidade.md) §2.

```css
.lm-snackbar {
  min-inline-size: var(--lm-snackbar-min-width);
  max-inline-size: var(--lm-snackbar-max-width);
}
@media (max-width: 599px) {          /* classe compact */
  .lm-snackbar { min-inline-size: 0; inline-size: 100%; }
}
```

Esta é a **única** exceção documentada ao "só `min-width`, nunca `max-width`" de
`02-layout.md` §2.3: a regra desliga um piso, e um piso só pode ser desligado por cima.

**Aceitação.** Anunciado em `polite` · não desaparece sob foco · ação alcançável por
teclado antes de sumir · anel invertido · **não estoura em 320px**.

---

### 18. EmptyState

**Objetivo.** Explicar uma ausência e oferecer a saída.

**Conteúdo.** As quatro perguntas de [`04-conteudo.md`](04-conteudo.md) §6.1, na ordem: o
que deveria estar aqui · por que está vazio · o que fazer agora · o que muda quando deixar
de estar vazio. Pular qualquer uma é defeito.

**Variantes.** Primeira utilização · sem resultados · filtro sem resultados (com "Limpar
filtros") · conteúdo removido · recurso não configurado · serviço indisponível.
Não existe "sem permissão" — o LUMINA é de usuário único.

**Regras.** Ilustração nunca maior que o texto. Uma ação primária, no máximo. Proibido:
exclamação, a palavra "vazio", "clique", card dentro de card.

**Incorreto.** [`Calendar.jsx:146`](../../frontend/src/pages/Calendar.jsx:146) some com a
grade inteira quando não há reservas — a grade é o conteúdo, não o resultado.

**Aceitação.** Quatro perguntas respondidas · estrutura da tela preservada · ação de saída
presente quando existe.

---

### 19. Tooltip

**Objetivo.** Nomear um controle cujo ícone não é autoexplicativo.
**Não usar** para informação necessária — tooltip não existe no toque nem no teclado sem
foco. Informação necessária é texto visível.

**Anatomia.** `--lm-tooltip-bg`, `--lm-tooltip-label`, `--lm-tooltip-radius`,
`--lm-tooltip-max-width`. Camada `--lm-z-popover`.

**Comportamento.** Aparece após `--lm-dwell-tooltip-delay` (500ms); dentro de um grupo já
"aquecido", `--lm-dwell-tooltip-delay-repeat` (0ms). Aparece também no **foco por teclado**.
`Escape` fecha.

**Regras.** O conteúdo do tooltip repete o `aria-label` do controle — não o complementa,
senão a informação existe só para quem usa ponteiro.

**Aceitação.** Aparece no foco · fecha com `Escape` · nunca carrega informação exclusiva ·
não sai da viewport.

---

## Parte 4 — Catálogo restante

> **Especificação resumida.** Documentação completa nos 20 campos é backlog de governança
> ([`08-governanca.md`](08-governanca.md)). Todo componente citado pelos padrões de
> [`06-padroes.md`](06-padroes.md) está aqui, para que nenhum padrão referencie algo
> indefinido.

| Componente | Objetivo | Variantes / estados | Tokens-chave | Acessibilidade crítica |
|---|---|---|---|---|
| Accordion | Revelar seção sob demanda | expandido, recolhido | `--lm-card-radius`, `--lm-color-divider` | `aria-expanded`; sob movimento reduzido, expande instantâneo |
| Alert / InlineMessage | Mensagem presa ao contexto | info, sucesso, aviso, erro | `--lm-color-*-container` | Erro bloqueante usa `role="alert"`; os demais, nenhum |
| Avatar | Identidade visual de pessoa | imagem, iniciais | `--lm-color-secondary-container` | `alt` vazio quando o nome já está ao lado |
| Banner | Mensagem de escopo de tela, persistente | aviso, erro, informativo | `--lm-color-warning-container` | Uma ação primária; não é modal |
| BottomNavigation | Destinos em `compact` | 3–5 itens, **teto de 5** | `--lm-navigation-item-*` | Mesmos três sinais de seleção do rail |
| BottomSheet | Camada inferior em `compact` | padrão, modal, expansível | `--lm-scrim-*`, `--lm-z-drawer` | Foco contido quando modal |
| Breadcrumbs | Caminho na hierarquia | — | `--lm-color-on-surface-variant` | `<nav aria-label>`, último item `aria-current="page"` |
| ButtonGroup | Ações relacionadas | horizontal, vertical | `--lm-button-*`, `--lm-density-gap` | Uma primária apenas |
| Calendar | Grade temporal com reservas | mês, semana | `--lm-color-airbnb`, `--lm-color-booking` | `role="grid"`; reserva é **barra contínua**, não chip por dia |
| Carousel | Sequência navegável | — | `--lm-card-*` | Sem autoplay; controles sempre visíveis |
| CodeBlock | Dado técnico copiável | inline, bloco | `--lm-font-mono`, `--lm-color-surface-container-low` | Botão "Copiar" com confirmação por snackbar |
| CommandPalette | Ação e navegação por teclado | — | `--lm-dialog-*`, `--lm-z-modal` | `Ctrl+K`; teclado em `03` §4.2 |
| ContextMenu | Menu no botão direito | — | `--lm-menu-*` | Sempre alcançável também por controle visível |
| DatePicker / TimePicker | Escolher data ou hora | único, intervalo | `--lm-menu-*`, `--lm-color-primary-container` | Campo de texto sempre aceita digitação; grade é atalho |
| Divider | Separar grupos reais | horizontal, vertical | `--lm-color-divider` | Decorativo: `aria-hidden` |
| Drawer | Navegação em `medium` | modal, permanente | `--lm-navigation-drawer-width` | Foco contido; `Escape` devolve ao botão de menu |
| Dropzone / FileUpload | Receber arquivo | repouso, ativo, erro | `--lm-dropzone-*` | **Sempre** com botão "Escolher arquivo"; arrastar nunca é o único caminho |
| FormField | Envelope de rótulo, campo, ajuda e erro | — | `--lm-field-*`, `--lm-form-row-gap` | Une `label`, `aria-describedby` e `aria-invalid` |
| Link | Navegar | inline, standalone | `--lm-color-primary` | Sublinhado em texto corrido; `<a href>` real |
| List | Itens de leitura individual | simples, ícone, avatar, metadados, expansível | `--lm-density-row` | Item clicável é `<button>` ou `<a>`, nunca `<div onClick>` |
| Pagination | Percorrer páginas de dados | numérica, anterior/próxima | `--lm-button-text-label` | Página atual com `aria-current="page"` |
| Popover | Conteúdo ancorado, sem bloquear | — | `--lm-menu-*`, `--lm-z-popover` | Direção adaptativa; `Escape` fecha |
| Progress | Progresso de operação | linear, circular; determinado, indeterminado | `--lm-progress-*` | `role="progressbar"` + `aria-valuenow`; determinado quando mensurável |
| SearchField | Busca local ou global | — | `--lm-field-*` | `type="search"`; contagem de resultados em região `polite` |
| SectionIndex | Âncoras de formulário longo | — | `--lm-navigation-item-*` | `<nav aria-label>`; marca a seção visível |
| SegmentedButton | 2–3 opções exclusivas | — | `--lm-chip-selected-bg` | Um ponto de tabulação, setas dentro; acima de 3 opções use Radio |
| SelectionBar | Ações sobre seleção múltipla | — | `--lm-color-secondary-container` | Substitui a barra normal; anuncia a contagem |
| SideSheet | Painel lateral de conteúdo | modal, permanente | `--lm-side-sheet-*` | Em `compact` vira tela cheia |
| Skeleton | Estrutura enquanto carrega | bloco, texto, círculo | `--lm-skeleton-*` | Sob movimento reduzido, bloco estático + status `polite` |
| SkipLink | Pular a navegação | — | `--lm-color-primary-container` | Primeiro focável do documento |
| Slider | Valor numérico contínuo | único, intervalo | `--lm-progress-*`, `--lm-color-primary` | Setas ajustam; valor sempre visível em texto |
| SplashScreen | Arranque do app | — | `--lm-color-background` | Anuncia progresso; nunca é tela infinita |
| Stepper | Etapas de um wizard | — | `--lm-color-primary-container` | Lista ordenada com etapa atual, **não** barra de porcentagem |
| SupportingPanel | Notificações e Sugestões IA | ancorado, sobreposto | `--lm-supporting-panel-*` | Em `compact` vira folha modal |
| Tag | Rótulo de classificação | estático, removível | `--lm-chip-*` | Estático não é alvo; removível tem botão próprio |
| TechnicalDetails | Erro técnico sob demanda | — | `--lm-font-mono` | `<details>`/`<summary>`; conteúdo copiável |
| Textarea | Texto de múltiplas linhas | — | `--lm-field-*` | Redimensionamento vertical; contador quando há limite |
| Toast | Notificação do sistema | — | `--lm-snackbar-*` | Distinto de Snackbar: não confirma ação do usuário |
| TreeView | Hierarquia expansível | — | `--lm-density-row` | `role="tree"`; setas expandem e navegam |
| UnconfiguredPanel | Recurso sem configuração | — | `--lm-color-surface-container`, `--lm-color-outline-variant` | Diz o que falta e leva até onde configurar |

---

## Parte 5 — Hierarquia de ações e padrões proibidos

### 5.1 Hierarquia por região

Em qualquer região — página, card, diálogo, linha de tabela:

- **uma** ação primária (`filled`);
- até **duas** ações secundárias visíveis (`tonal`, `outlined` ou `text`);
- o resto em menu de estouro;
- ação destrutiva **separada** das construtivas, nunca na mesma barra;
- ação irreversível acompanhada do contexto que a torna compreensível.

A importância visual corresponde à importância funcional. Cinco botões preenchidos lado a
lado não têm hierarquia — têm cinco ações igualmente urgentes, o que nunca é verdade.

### 5.2 Padrões proibidos

Estrutura: card para todo conteúdo · card dentro de card · modal para decisão pequena ·
formulário longo dentro de modal · abas dentro de modal · abas como filtro de lista ·
divisor onde espaçamento resolve.

Ação: mais de uma primária por região · botão destrutivo dominante antes de ser necessário ·
"OK"/"Sim"/"Não" quando a ação pode ser nomeada · `window.confirm` · "Tem certeza?" ·
scrim que descarta trabalho não salvo.

Cor e forma: hexadecimal em componente · cor como único portador de estado · segunda cor de
marca sem papel · neon em superfície grande · gradiente sem função · sombra em todo card ·
glassmorphism · neumorphism.

Interação: `outline: none` · foco não visível · `<div onClick>` · `tabIndex={-1}` em
controle real · `title` como único portador de informação · hover que move o layout ·
animação acima de 320ms em interação direta · arrastar como único caminho.

Conteúdo: placeholder como rótulo · mensagem de erro vaga · código técnico sem tradução ·
texto principal abaixo de 14px · largura fixada por rótulo curto.

---

## Lacunas
> **Registro autoritativo:** [`LACUNAS.md`](LACUNAS.md). A lista abaixo reflete o estado
> do dia em que este documento foi escrito e não é atualizada quando uma lacuna fecha —
> várias destas já foram fechadas por extensão do gerador.


Regras deste documento que dependem de token inexistente. Enquanto não forem fechadas, o
valor fica literal e isolado no componente — **nenhuma delas autoriza batizar um token
novo ad hoc**.

| # | Regra | O que falta |
|---|---|---|
| 1 | Ícone de 16px e 24px (§ IconButton, NavigationRail) | Escala primitiva de tamanho de ícone. Só existe `--lm-icon-button-icon-size` (20px), preso a um componente |
| 2 | `strokeWidth` 2 → 2.25 no ícone selecionado | Token de espessura de traço |
| 3 | Peso do rótulo selecionado na navegação | `--lm-type-label-lg-weight` e `--lm-type-label-md-weight` são ambos 500; não há token de peso isolado |
| 4 | Desenho de 18px do Checkbox/Radio e 32px do Chip | Escala de tamanho de controle independente de `--lm-density-control` |
| 5 | `font-variant-numeric: tabular-nums` na DataTable | É propriedade, não valor — resolve-se em classe utilitária (`07-implementacao.md`) |
| 6 | Borda de 1px estrutural | Só existem `--lm-field-border-width-focus` (2px) e `--lm-focus-ring-width` (3px) |
| 7 | Altura mínima de célula de calendário e altura da barra de reserva | — |
| 8 | Estados de disponibilidade do calendário (livre, ocupado, bloqueado, sobreposto) | `--lm-chart-status-*` é de visualização de dados, não de calendário |
| 9 | Anel de foco em contexto de erro | Sobre `error-container`, `--lm-focus-ring-color` pode não alcançar 3:1 |
