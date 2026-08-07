# Acessibilidade

**Alvo: WCAG 2.2, nível AA.** Não é aspiração — é o critério de aceite de qualquer componente do
LUMINA. Um componente sem foco visível, sem operação por teclado ou sem nome acessível está
incompleto, e "incompleto" não entra no produto.

Este documento diz o número, o par e o método. Onde não houver número verificável, há uma regra
que pode ser reprovada por um revisor sem discussão de gosto.

---

## 1. Escopo e alvo de conformidade

O LUMINA é um app Electron, Windows, usuário único, offline. Isso muda o que precisa ser
verificado e o que não precisa:

| Fato do produto | Consequência para acessibilidade |
|---|---|
| Renderizador é o Chromium do Electron | `:focus-visible`, `<dialog>`, `inert`, `forced-colors`, `@layer` e `prefers-reduced-motion` estão garantidos. Não há fallback a escrever para navegador antigo |
| Sem rede | Nenhum recurso de acessibilidade pode depender de CDN. Fonte, ícones e ilustrações empacotados |
| Leitor de tela de referência | NVDA sobre o Chromium do Electron. Narrador como verificação secundária |
| Usuário único, sessão longa | O teclado é o caminho principal, não a alternativa. Um fluxo que só funciona com mouse é um defeito de produto, não só de acessibilidade |
| Dinheiro em jogo | Erro, conflito e confirmação destrutiva têm exigência mais alta que o mínimo da norma |

**Critérios que não se aplicam, com justificativa registrada:** 1.2.1–1.2.5 (não há áudio nem
vídeo), 1.4.2 (não há som automático), 2.4.5 Multiple Ways (aplica-se a conjuntos de páginas web;
o app tem navegação única e busca global), 3.1.2 (a interface é monolíngue, `pt-BR`). O critério
4.1.1 Parsing foi removido da WCAG 2.2 e não é mais verificado.

O único teste **automatizado** que existe hoje no repositório é o de contraste:

```bash
python scripts/design/generate_tokens.py --check
```

Ele percorre 34 pares "texto sobre fundo" nos dois temas — 68 verificações — e sai com código 1 se
algum ficar abaixo do mínimo. **O que ele não cobre** (e portanto continua sendo verificação
manual): contraste depois das camadas de estado, cores de gráfico contra a superfície do card,
texto sobre `--lm-color-surface-dim`, `--lm-color-outline-variant` como fronteira de controle, e
qualquer cor escrita fora do sistema de tokens. Os 94 hexadecimais soltos e 87 `rgba()` que hoje
existem nos CSS do frontend são invisíveis para esse teste — essa é a razão prática de eliminá-los.

---

## 2. Requisitos obrigatórios

Tabela normativa. "Como verificar" é o que um revisor faz; se não der para fazer, o requisito está
mal escrito.

### 2.1 Perceptível

| Requisito LUMINA | Critério | Nível | Como verificar |
|---|---|---|---|
| Todo ícone informativo tem texto equivalente; ícone decorativo é `aria-hidden="true"` | 1.1.1 | A | Ler a árvore de acessibilidade: nenhum nó `img`/`graphics-symbol` sem nome, nenhum nome duplicado do rótulo ao lado |
| Estrutura vem de HTML semântico: `<h1>`–`<h3>`, `<table>` com `<th scope>`, `<fieldset>`/`<legend>`, `<nav>`, `<main>` | 1.3.1 | A | Desligar todo o CSS: a página ainda faz sentido lida de cima a baixo |
| Ordem do DOM = ordem visual. Nenhum `order`/`grid-area` reordena conteúdo interativo | 1.3.2 | A | Tab do início ao fim: o foco nunca "pula para trás" na tela |
| Campos de dados pessoais declaram `autocomplete` (`name`, `email`, `tel`) | 1.3.5 | AA | Inspecionar os campos de hóspede e de login |
| Nenhum estado é comunicado só por cor (§7) | 1.4.1 | A | Screenshot em escala de cinza: todo estado continua identificável |
| Texto ≥ 4,5:1; texto grande (≥ 18,66px bold ou ≥ 24px) e ícone/fronteira ≥ 3:1 | 1.4.3 / 1.4.11 | AA | `generate_tokens.py --check` para os pares de token; conta-gotas para o resto |
| Todo tamanho de texto em `rem`; nada em `px` na escala tipográfica | 1.4.4 | AA | Zoom 200% (§10) sem perda de conteúdo ou função |
| Nenhum texto renderizado como imagem — inclusive em gráfico e em logotipo de plataforma | 1.4.5 | AA | Buscar por `background-image` e `<img>` com texto |
| Conteúdo reflui a 320px CSS de largura sem rolagem horizontal (exceto tabela e gráfico, que rolam no próprio container) | 1.4.10 | AA | Janela a 1600px com zoom 400%, ou 400×N direto |
| Nada quebra com espaçamento do usuário: `line-height 1.5`, parágrafo `2em`, letra `0.12em`, palavra `0.16em` | 1.4.12 | AA | Injetar o CSS de teste no DevTools; procurar corte e sobreposição |
| Tooltip e popover de hover: dispensáveis por `Esc`, apontáveis com o mouse, persistentes enquanto o ponteiro estiver sobre eles | 1.4.13 | AA | Abrir por hover, mover o mouse para dentro do tooltip: ele não some |

### 2.2 Operável

| Requisito LUMINA | Critério | Nível | Como verificar |
|---|---|---|---|
| Toda função é alcançável e executável só pelo teclado (§4) | 2.1.1 | A | Desconectar o mouse e executar os fluxos da matriz (§10) |
| Nenhuma armadilha de foco fora de dialog modal; no dialog, `Esc` sempre sai | 2.1.2 | A | Tab circulando 2× por toda a aplicação |
| Atalho de tecla única só existe com modificador, ou apenas com o componente focado | 2.1.4 | A | Digitar texto em qualquer campo: nenhum atalho global dispara |
| Snackbar tem no mínimo 5 s e some sem levar informação embora; nada com prazo | 2.2.1 | A | Cronometrar; conferir que a mesma informação existe em outro lugar |
| Nenhuma animação em laço acima de 5 s sem controle de pausa (exceto indicador de carregamento) | 2.2.2 | A | Inspecionar `animation-iteration-count: infinite` |
| Nada pisca mais de 3× por segundo | 2.3.1 | A | Revisão visual dos estados de alerta |
| Link "Pular para o conteúdo" é o primeiro ponto de tabulação | 2.4.1 | A | Primeiro Tab após carregar |
| Título da janela nomeia a página atual: `Conflitos — LUMINA` | 2.4.2 | A | Trocar de página e ler a barra de título |
| Ordem de foco segue a leitura; nenhum `tabindex` positivo (§4.3) | 2.4.3 | A | `document.querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])')` retorna vazio |
| Rótulo de link/botão descreve o destino sem depender do entorno visual | 2.4.4 | A | Listar todos os nomes acessíveis: nenhum "Ver", "Aqui", "Mais" isolado |
| Cabeçalhos e rótulos descrevem o conteúdo; um `<h1>` por página | 2.4.6 | AA | Navegar por cabeçalhos no NVDA (tecla `H`) |
| Anel de foco visível em todo elemento focável (§3) | 2.4.7 | AA | Tab pela aplicação inteira |
| O elemento focado nunca fica coberto pelo app bar fixo, pelo snackbar ou pelo drawer | 2.4.11 | AA | Tab até o fim de uma lista longa com a página rolada |
| Nenhum gesto de caminho ou multitoque; tudo tem equivalente de toque único | 2.5.1 | A | Redimensionar barra e reordenar coluna também por teclado |
| A ação acontece no `pointerup`, sobre o alvo; sair do alvo antes de soltar cancela | 2.5.2 | A | Pressionar um botão, arrastar para fora, soltar: nada acontece |
| O nome acessível contém o rótulo visível, na mesma ordem | 2.5.3 | A | Comparar `aria-label` com o texto na tela |
| Nenhuma função depende de mover o dispositivo | 2.5.4 | A | N/A por construção (desktop) |
| Todo arrastar (mover reserva no calendário, reordenar coluna) tem alternativa por clique/teclado | 2.5.7 | AA | Executar a operação sem arrastar |
| Alvo mínimo de 24×24px CSS; alvo de projeto de 40–48px (§5) | 2.5.8 | AA | Medir a caixa do alvo no DevTools, não o desenho |

### 2.3 Compreensível e robusto

| Requisito LUMINA | Critério | Nível | Como verificar |
|---|---|---|---|
| `<html lang="pt-BR">` | 3.1.1 | A | Inspecionar o documento |
| Receber foco nunca muda o contexto (não abre menu, não navega, não submete) | 3.2.1 | A | Tab por menus e selects |
| Alterar um campo nunca submete nem navega sozinho; filtro aplica no `change`, não a cada tecla, e anuncia o resultado | 3.2.2 | A | Digitar em cada filtro |
| A navegação está no mesmo lugar em todas as páginas, na mesma ordem | 3.2.3 | AA | Comparar duas páginas |
| O mesmo ícone significa a mesma coisa no app inteiro e tem o mesmo nome acessível | 3.2.4 | AA | Inventário de ícones × nomes |
| Ajuda e suporte, quando existirem, ficam no mesmo lugar em todas as páginas | 3.2.6 | A | Comparar duas páginas |
| Erro é identificado em texto, associado ao campo, e nunca só pela cor da borda | 3.3.1 | A | Submeter formulário vazio com NVDA ligado |
| Todo campo tem `<label>` visível e persistente. Placeholder não é rótulo | 3.3.2 | A | Preencher o campo: o rótulo continua na tela |
| A mensagem de erro diz o que fazer, não só o que está errado | 3.3.3 | AA | Ler as mensagens: cada uma sugere a correção |
| Excluir reserva, documento ou template exige confirmação com o nome do item; toda operação destrutiva é reversível ou confirmada | 3.3.4 | AA | Executar cada ação destrutiva |
| Dados já informados são reaproveitados (pré-preenchidos ou oferecidos), nunca exigidos duas vezes no mesmo fluxo | 3.3.7 | A | Percorrer o fluxo de nova reserva |
| Login aceita colar a senha, expõe `autocomplete="current-password"` e não impõe teste cognitivo | 3.3.8 | AA | Colar do gerenciador de senhas |
| Todo controle expõe nome, papel e valor corretos | 4.1.2 | A | Inspecionar a árvore de acessibilidade |
| Mudança de estado sem mudança de foco é anunciada por região viva (§6.5) | 4.1.3 | AA | Salvar, filtrar e importar com NVDA ligado |

---

## 3. Foco

### 3.1 A falha atual

```css
/* frontend/src/styles/global.css:64 — falha de conformidade 2.4.7, aplicação inteira */
* { margin: 0; padding: 0; box-sizing: border-box; outline: none; }
```

Esse seletor apaga o indicador de foco de **todo** elemento focável do LUMINA: botões do header,
abas de navegação, campos, checkboxes, links. Somado a zero ocorrências de `:focus-visible` no
código, o resultado é que hoje não existe forma de saber onde o teclado está. `Statistics.css:43`
repete o erro localmente (`.period-selector:focus { outline: none }`).

Remover o anel sem repor um equivalente **é** a violação — não é uma questão de gosto, e não há
exceção por "polui o visual". A reposição correta:

```css
@layer lm.base {
  /* Só apaga onde o :focus-visible vai repor. Nunca `* { outline: none }`. */
  :focus:not(:focus-visible) { outline: none; }
}
```

### 3.2 Por que `:focus-visible` e não `:focus`

`:focus` casa também com clique de mouse e com toque. Isso produz o anel em cima de um botão que
o usuário acabou de clicar — ruído que historicamente levou times a apagar o anel de vez, matando
o teclado junto. `:focus-visible` delega ao Chromium a heurística correta: teclado, tecnologia
assistiva e campos de texto (que sempre recebem, porque o cursor precisa de âncora) mostram o
anel; ponteiro não mostra.

Consequência prática, e é ela que fecha a discussão: com `:focus-visible` **não existe motivo
legítimo para escrever `outline: none`**. Qualquer ocorrência dessa declaração no código é um bug.

### 3.3 A especificação do anel

| Propriedade | Valor | Token | Justificativa |
|---|---|---|---|
| Espessura | 3px | `--lm-focus-ring-width` | Acima dos 2px mínimos que a WCAG 2.2 usa para descrever um indicador adequado; sobrevive a telas de alto DPI e a zoom de 200% |
| Afastamento | 2px | `--lm-focus-ring-offset` | Separa o anel do preenchimento do controle. Em botão preenchido, é a faixa de superfície nesse vão que dá contraste ao anel |
| Cor padrão | `--lm-color-primary` | `--lm-focus-ring-color` | Uma única cor de foco no sistema inteiro; ≥ 4,6:1 sobre qualquer superfície semântica (tabela abaixo) |
| Cor sobre superfície invertida | `--lm-color-inverse-primary` | `--lm-focus-ring-color-inverse` | `primary` sobre `inverse-surface` mede 2,02:1 no claro e 1,33:1 no escuro — reprovaria |
| Estilo | `solid` | — | `dotted`/`dashed` perdem área efetiva e somem em zoom |
| Forma | herda o raio do controle | — | `outline` acompanha `border-radius` no Chromium: um botão com `--lm-radius-full` ganha anel em pílula sem código extra |

**Uso correto — a regra única do sistema:**

```css
@layer lm.base {
  :where(a[href], button, input, select, textarea, summary, [tabindex]):focus-visible,
  :where([role="button"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"],
         [role="option"], [role="checkbox"], [role="radio"], [role="switch"]):focus-visible {
    outline: var(--lm-focus-ring-width) solid var(--lm-focus-ring-color);
    outline-offset: var(--lm-focus-ring-offset);
  }

  /* Superfícies invertidas: snackbar e tooltip usam inverse-surface. */
  :where(.lm-snackbar, .lm-tooltip) :where(a, button):focus-visible {
    outline-color: var(--lm-focus-ring-color-inverse);
  }

  /* 2.4.11 — o app bar fixo de 64px não pode cobrir o elemento que acabou de
     receber foco quando o navegador rola até ele. */
  :where(a[href], button, input, select, textarea, [tabindex]) {
    scroll-margin-block-start: calc(var(--lm-app-bar-height) + var(--lm-space-8));
    scroll-margin-block-end: var(--lm-space-16);
  }
}
```

**Uso incorreto:**

```css
/* Anel por box-shadow: some no modo de alto contraste forçado (§9). */
button:focus-visible { box-shadow: 0 0 0 3px var(--lm-color-primary); }

/* Anel por borda: muda a caixa e desloca o layout ao focar. */
button:focus-visible { border: 3px solid var(--lm-color-primary); }

/* Anel colorido por contexto: quebra 3.2.4 e multiplica o custo de verificação. */
.btn-danger:focus-visible  { outline-color: var(--lm-color-error); }
.btn-success:focus-visible { outline-color: var(--lm-color-success); }
```

O anel é **sempre** `--lm-focus-ring-color`, inclusive em botão destrutivo. A cor do foco identifica
o foco, não a natureza da ação.

### 3.4 Contraste do anel nos dois temas

Medido com a fórmula da WCAG 2.x sobre os hexadecimais gerados. Mínimo exigido para indicador de
foco: **3:1** (1.4.11).

| Anel sobre | Claro | Escuro |
|---|---|---|
| `surface` / `background` | 6,14:1 | 10,89:1 |
| `surface-container-lowest` | 6,47:1 | 11,31:1 |
| `surface-container` | 5,56:1 | 9,59:1 |
| `surface-container-high` (dialog, card preenchido) | 5,28:1 | 8,42:1 |
| `surface-container-highest` (fundo de campo) | 5,03:1 | 7,22:1 |
| `secondary-container` (item de navegação selecionado, chip selecionado, linha selecionada) | 5,01:1 | 5,46:1 |
| `primary-container` | 5,02:1 | 5,45:1 |
| `error-container` / `warning-container` / `success-container` | 5,01–5,02:1 | 5,47–5,49:1 |
| `airbnb-container` / `booking-container` | 5,27:1 / 5,29:1 | 6,54:1 / 6,56:1 |
| `surface-dim` (pior caso do sistema) | **4,62:1** | 10,89:1 |
| `inverse-surface` — **reprova** | **2,02:1** | **1,33:1** |

Duas leituras obrigatórias desta tabela:

1. O anel padrão tem margem confortável sobre **todas** as superfícies e contêineres semânticos nos
   dois temas. O pior caso é 4,62:1, 54% acima do mínimo. Nenhuma exceção precisa ser inventada.
2. `inverse-surface` é a única superfície onde o anel padrão reprova. É exatamente por isso que
   `--lm-focus-ring-color-inverse` existe: `inverse-primary` sobre `inverse-surface` mede 7,65:1 no
   claro e 5,03:1 no escuro. Snackbar e tooltip são as superfícies invertidas do produto.

Esse resultado não é sorte: as duas cores de anel são tons de luminância conhecida (`primary` é o
tom 40 no claro e 80 no escuro), e a razão de contraste depende só de L\*. Trocar a matiz da marca
não muda nenhum número desta tabela.

### 3.5 Anel sobre superfície arbitrária

Sobre marca de gráfico, miniatura de documento ou qualquer pixel que o sistema de tokens não
controla, uma cor sozinha não garante 3:1. A regra é **anel de duas camadas**: um contorno interno
na cor da superfície neutra (`--lm-color-surface`) e o anel externo em `--lm-focus-ring-color`. Um
dos dois sempre contrasta, seja o fundo claro ou escuro. Não existe token para esse anel duplo —
registrado em §11.

### 3.6 Foco e campos de texto

O campo focado tem **dois** sinais, e não são redundantes:

| Sinal | Quando | Token | O que comunica |
|---|---|---|---|
| Borda de 2px em `--lm-color-primary` | `:focus` (mouse, toque ou teclado) | `--lm-field-border-focus`, `--lm-field-border-width-focus` | "o cursor de texto está aqui" |
| Anel externo de 3px, afastado 2px | `:focus-visible` | `--lm-focus-ring-*` | "o foco do teclado está aqui" |

O afastamento de 2px impede que os dois se fundam em uma faixa azul única. Campo em erro mantém a
borda em `--lm-field-border-error` mesmo focado — o erro não desaparece porque o usuário voltou ao
campo.

### 3.7 Camada de estado e foco

`--lm-state-focus: 0.10` é a camada de estado (overlay da cor de conteúdo) que acompanha o foco em
itens de lista e de menu. Ela **complementa** o anel; nunca o substitui. Uma camada de 8–12% muda a
luminância do fundo em cerca de 1,2:1 — abaixo de qualquer limiar utilizável. Fundo de estado nunca
é indicador de foco sozinho.

---

## 4. Teclado

### 4.1 Comportamento global das teclas

| Tecla | Comportamento | Nunca |
|---|---|---|
| `Tab` | Avança um **ponto de tabulação**. Widget composto (rail, abas, tabela, menu, calendário) é um único ponto | Percorrer item a item dentro de um widget composto |
| `Shift+Tab` | Retrocede na mesma ordem, exatamente invertida | Seguir um caminho diferente da ida |
| `Enter` | Aciona o controle focado. Em campo de texto de linha única dentro de formulário, submete. Em item de menu/opção, seleciona e fecha | Ser o único acionador de algo que também aceita `Space` (botão) |
| `Space` | Aciona botão; alterna checkbox e switch; em campo de texto insere espaço; fora de controle, rola a página | Ser capturado por um `div` clicável — o usuário perde a rolagem |
| `Escape` | Fecha **uma** camada, sempre a mais alta: menu → popover → drawer → dialog. Cancela edição em linha revertendo o valor. Dispensa tooltip (1.4.13) | Fechar duas camadas de uma vez; fechar um dialog com formulário sujo sem confirmar |
| `↑` `↓` | Movem o foco dentro de widget vertical (menu, lista, combobox, tabela) | Cruzar a fronteira do widget ou rolar a página quando há widget focado |
| `←` `→` | Movem dentro de widget horizontal (abas, calendário por dia); abrem/fecham nó de árvore | Mudar de widget |
| `Home` | Primeiro item do widget. Em texto, início da linha. `Ctrl+Home` em tabela: primeira linha | Rolar a página quando há widget focado |
| `End` | Último item do widget. Em texto, fim da linha. `Ctrl+End` em tabela: última linha (inclusive virtualizada — carregar antes de mover) | Mover só até o fim do que já foi renderizado |
| `PageUp` | Uma tela acima no container rolável; mês anterior no calendário; 10 linhas acima na tabela | Perder o foco ao rolar |
| `PageDown` | Uma tela abaixo; mês seguinte; 10 linhas abaixo | Idem |

Setas movem o **foco**, não a seleção, sempre que a seleção tiver consequência (aplicar filtro,
carregar dados, marcar reserva). Nesse caso a seleção é confirmada com `Enter` ou `Space`. Seleção
que segue o foco é aceitável apenas quando é instantânea e sem efeito colateral — abas, por
exemplo, se o painel já estiver montado.

### 4.2 Comportamento por componente composto

Todos usam **roving tabindex**: um item com `tabindex="0"`, os demais com `tabindex="-1"`, e o par
se move com as setas. Exceção: combobox e paleta de comandos, onde o foco do DOM permanece no campo
de texto e o item ativo é apontado por `aria-activedescendant`.

**Menu** (`role="menu"`, itens `role="menuitem"`, `--lm-menu-item-height: 48px`)

| Tecla | Comportamento |
|---|---|
| `Enter` / `Space` / `↓` no acionador | Abre e move o foco para o primeiro item |
| `↑` no acionador | Abre e move o foco para o último item |
| `↑` `↓` | Item anterior/seguinte, com laço nas pontas. Pula separadores e itens desabilitados |
| `Home` / `End` | Primeiro / último item |
| `A`–`Z` | Move para o próximo item cujo rótulo começa pela letra (busca por primeira letra, sem selecionar) |
| `Enter` / `Space` | Aciona o item, fecha o menu e devolve o foco ao acionador |
| `Escape` | Fecha sem acionar e devolve o foco ao acionador |
| `Tab` | Fecha o menu e continua a tabulação a partir do acionador |

**Dialog** (`role="dialog"`, `aria-modal="true"`)

| Tecla | Comportamento |
|---|---|
| `Tab` / `Shift+Tab` | Circulam **dentro** do dialog; do último volta ao primeiro |
| `Escape` | Fecha e devolve o foco ao acionador. Com formulário alterado, primeiro pede confirmação de descarte (3.3.4) |
| `Enter` | Em campo de linha única, aciona a ação primária. Nunca aciona a ação destrutiva por padrão |

**Abas** (`role="tablist"` / `tab` / `tabpanel`)

| Tecla | Comportamento |
|---|---|
| `←` `→` | Aba anterior/seguinte, com laço |
| `Home` / `End` | Primeira / última aba |
| `Tab` a partir da aba ativa | Vai para o painel (`tabindex="0"` no `tabpanel`), não para a próxima aba |
| `Enter` / `Space` | Ativa a aba focada quando a ativação é manual (obrigatório se o painel carrega dados) |

**Tabela de dados** (`role="grid"` quando navegável por célula; `--lm-table-row-height`)

| Tecla | Comportamento |
|---|---|
| `↑` `↓` | Linha anterior/seguinte, mantendo a coluna |
| `←` `→` | Célula anterior/seguinte na linha |
| `Home` / `End` | Primeira / última célula da linha |
| `Ctrl+Home` / `Ctrl+End` | Primeira / última célula da tabela, materializando linhas virtualizadas antes de mover |
| `PageUp` / `PageDown` | Uma altura de viewport, mantendo a coluna |
| `Enter` | Abre a linha (detalhe da reserva) ou entra em modo de edição da célula |
| `Escape` | Sai da edição revertendo o valor |
| `Space` | Alterna a seleção da linha quando há seleção múltipla |
| `Shift+↑` `Shift+↓` | Estende a seleção |
| Cabeçalho focado + `Enter` | Ordena; a nova ordem é anunciada por região viva e refletida em `aria-sort` |

**Combobox** (campo de texto + listbox; `aria-expanded`, `aria-controls`, `aria-activedescendant`)

| Tecla | Comportamento |
|---|---|
| `↓` | Abre a lista (se fechada) e move o item ativo para o primeiro/seguinte |
| `↑` | Move para o anterior; na primeira posição, volta ao campo sem item ativo |
| `Enter` | Confirma o item ativo, fecha a lista e mantém o foco no campo |
| `Escape` | Primeiro toque fecha a lista mantendo o texto; segundo toque limpa o campo |
| `Home` / `End` | Início / fim do **texto digitado** — não do fim da lista |
| Digitação | Filtra; a contagem de resultados é anunciada por região viva `polite` |
| `Tab` | Confirma o item ativo (se houver) e sai do componente |

**Navigation rail** (`<nav>` com `role="tablist"` implícito no padrão de navegação; item selecionado com `aria-current="page"`)

| Tecla | Comportamento |
|---|---|
| `Tab` | O rail inteiro é **um** ponto de tabulação; entra no item da página atual |
| `↑` `↓` (rail vertical) / `←` `→` (navegação inferior em compact) | Movem o foco entre destinos, com laço |
| `Home` / `End` | Primeiro / último destino |
| `Enter` / `Space` | Navega. O foco vai para o `<h1>` da nova página; o nome da página é anunciado |
| `Escape` (drawer modal em medium) | Fecha o drawer e devolve o foco ao botão de menu |

**Paleta de comandos**

| Tecla | Comportamento |
|---|---|
| `Ctrl+K` | Abre de qualquer lugar. Tem modificador por exigência do 2.1.4 — atalho de tecla única nunca é global |
| `↑` `↓` | Percorrem resultados; o foco do DOM fica no campo |
| `Enter` | Executa o comando ativo, fecha e move o foco para o alvo do comando |
| `Escape` | Primeiro toque limpa a consulta; segundo fecha e devolve o foco à origem |
| `Tab` | Circula dentro da paleta (é modal) |

### 4.3 Ordem de foco

| Regra | Justificativa |
|---|---|
| Ordem do DOM = ordem visual em cada breakpoint | 1.3.2 e 2.4.3. Se um `order` do flex reordena controles em compact, o DOM está errado, não o CSS |
| `tabindex` positivo é proibido | Cria uma ordem global paralela que quebra a cada componente novo |
| `tabindex="-1"` só para alvos programáticos (container de dialog, `<h1>` de página, item não ativo de roving) | Nunca para tirar um controle real do teclado |
| Ordem da aplicação: pular para o conteúdo → app bar → rail → conteúdo principal → painel auxiliar | Coloca a navegação antes do conteúdo, mas atrás de um atalho para ignorá-la (2.4.1) |
| Elemento invisível ou fora de tela nunca é focável (`display:none`, `hidden`, `inert`) | Foco em elemento invisível é a falha de teclado mais comum em drawer e menu |
| Ao trocar de página, o foco vai para o `<h1>` (`tabindex="-1"`), não para o `<body>` | Foco no `body` faz o leitor de tela recomeçar do topo a cada navegação |

**Uso incorreto, retirado do código atual** (`Login.jsx:159-171`):

```jsx
<button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
</button>
```

Três defeitos numa peça: o controle está fora do teclado (2.1.1), não tem nome acessível (4.1.2), e
não expõe o estado (deveria ser `aria-pressed`). O correto mantém o botão tabulável, nomeia a ação
pelo que ela fará e declara o estado.

### 4.4 Focus trap em dialog

Use o elemento `<dialog>` com `showModal()`. No Chromium do Electron ele entrega, sem código:
circulação de `Tab` confinada, `Escape` cancelando, o resto da árvore inerte para ponteiro e para
tecnologia assistiva, camada superior acima de qualquer `z-index`, e `::backdrop` para o scrim
(`--lm-dialog-scrim`, `--lm-dialog-scrim-opacity: 0.32`). Uma implementação manual de trap só se
justifica onde `<dialog>` for impossível — e então precisa reproduzir os cinco comportamentos.

```jsx
<dialog ref={ref} className="lm-dialog" aria-labelledby="dlg-title" onCancel={onCancel}>
  <h2 id="dlg-title">Excluir reserva</h2>
  {/* … */}
</dialog>
```

Regras que o `<dialog>` **não** resolve sozinho:

| Regra | Detalhe |
|---|---|
| Onde o foco entra | No primeiro campo editável; se não houver, no container do dialog (`tabindex="-1"`). **Nunca** no botão destrutivo |
| Descarte protegido | `onCancel` com `preventDefault()` quando o formulário está sujo, seguido de confirmação (3.3.4) |
| Sobreposição de camadas | Um dialog nunca abre outro dialog. Menu e tooltip **dentro** do dialog são permitidos, e o `Esc` fecha primeiro o de cima |
| Rolagem | O corpo do dialog rola; o cabeçalho e as ações ficam fixos, de modo que a ação primária nunca fica fora de alcance no zoom de 200% |

### 4.5 Devolução do foco ao acionador

| Situação | Para onde o foco volta |
|---|---|
| Dialog/menu/drawer fechado normalmente | Para o elemento que o abriu |
| O acionador deixou de existir (a linha foi excluída) | Para o item seguinte da lista; se a lista esvaziou, para o container do estado vazio (`tabindex="-1"`) |
| O acionador foi para fora da tela (rolagem, mudança de breakpoint) | Rola até ele antes de devolver o foco — foco invisível é o mesmo que foco perdido |
| Ação concluída com snackbar de desfazer | O foco **não** vai para o snackbar; o snackbar é `role="status"` e a ação "Desfazer" é alcançável por `Tab` a partir da posição atual |
| Fluxo de várias etapas | Ao avançar, foco no `<h1>` da nova etapa; ao voltar, no campo que originou o retorno |

Guarde a referência do acionador no momento da abertura (`document.activeElement`) e restaure
explicitamente. Não confie em o elemento continuar existindo.

---

## 5. Alvos de toque e ponteiro

### 5.1 Números

| Contexto | Alvo | Fonte |
|---|---|---|
| Mínimo absoluto de conformidade | 24×24px CSS | 2.5.8 AA |
| Recomendado do sistema | 44–48px | 2.5.5 (AAA) e ergonomia de toque |
| Padrão do produto (`default`, ponteiro fino) | 40px — `--lm-density-control` | Densidade útil em app de produtividade com mouse |
| Ponteiro grosseiro | 48px — `--lm-density-control` sob `@media (pointer: coarse)` | Já forçado pelos tokens gerados |
| Densidade `compact` (tabela) | Desenho de 32px, **alvo de 40px** | Exceção justificada; ver §5.3 |
| Item de navegação | 56px — `--lm-navigation-item-height` | Destino primário, alcançado o dia inteiro |
| Item de menu | 48px — `--lm-menu-item-height` | Lista de ações precisa tolerar erro de mira |
| Linha de tabela clicável | 52 / 64 / 40px — `--lm-table-row-height` | Segue `--lm-density-row` |

Os 40px do padrão ficam abaixo dos 44px recomendados e muito acima dos 24px exigidos. É uma troca
consciente: o LUMINA é operado com mouse e teclado durante horas, e 40px é o ponto em que a
densidade ainda paga. Onde o ponteiro é grosseiro, os tokens já sobem para 48px sem código do
componente.

### 5.2 O alvo pode ser maior que o desenho — o contrário nunca

O tamanho do alvo é medido pela **área que responde ao ponteiro**, não pelo pixel colorido. Um
ícone de 20px (`--lm-icon-button-icon-size`) dentro de um botão de 40px é um alvo de 40px, e está
correto. Um chip de 32px de altura desenhada com área clicável estendida a 40px é um alvo de 40px.

```css
/* Chip: 32px de desenho (--lm-chip-height), 40px de alvo. */
.lm-chip { position: relative; }
.lm-chip::after {
  content: "";
  position: absolute;
  inset-block: -4px;   /* 4 + 32 + 4 = 40 */
  inset-inline: 0;
}
```

**Uso incorreto:** encolher o botão para 24px porque "a norma permite 24". A norma define o piso de
conformidade, não o alvo de projeto — e 24px em tela de 27" a 150% de escala é uma mira de erro
garantida.

### 5.3 Distância entre alvos

| Regra | Valor | Token |
|---|---|---|
| Espaço mínimo entre alvos adjacentes | 8px | `--lm-space-8` |
| Espaço padrão em grupos de controle | 12px (16px em `comfortable`) | `--lm-density-gap` |
| Folga necessária para o anel de foco não ser cortado | 5px (3px de anel + 2px de afastamento) | `--lm-focus-ring-width` + `--lm-focus-ring-offset` |

Os 8px mínimos não são estéticos: são o que impede que duas áreas de alvo expandidas se sobreponham
(4px de expansão de cada lado) e o que garante que o anel de foco de 5px não seja cortado por um
vizinho ou por um ancestral com `overflow: hidden`. Container que recorta conteúdo precisa de
`padding` ≥ 5px, ou o anel some justamente no primeiro e no último item da lista.

Alvos menores que 24px só são aceitos nas exceções previstas pelo 2.5.8: controle inline dentro de
uma frase, alvo equivalente disponível em outro lugar da mesma tela, ou aparência determinada pelo
agente do usuário. `--lm-badge-size: 16px` e `--lm-badge-size-dot: 6px` não são alvos — badge é
decoração de um alvo maior e nunca recebe clique próprio.

### 5.4 Comportamento responsivo

| Breakpoint / condição | Alvo | Efeito |
|---|---|---|
| `(pointer: coarse)` | 48px | Densidade `comfortable` forçada nos tokens; `compact` fica indisponível |
| compact (navegação inferior) | 48px de altura mínima por destino | Navegação inferior é operada com o polegar |
| medium (drawer) | 48px por item | O drawer é modal e o alvo precisa tolerar mira imprecisa |
| expanded / large (rail) | 56px — `--lm-navigation-item-height` | Ponteiro fino, mas destino de alta frequência |
| `compact` (tabela, ponteiro fino) | 32px de desenho / 40px de alvo | Permitido só em tabela, só com mouse, e só com a expansão de área |

---

## 6. Leitores de tela

### 6.1 Nome acessível

| Regra | Correto | Incorreto |
|---|---|---|
| Botão com texto não precisa de `aria-label` | `<button>Salvar alterações</button>` | `<button aria-label="Confirmar">Salvar alterações</button>` — viola 2.5.3, o nome não contém o rótulo visível |
| Botão só de ícone precisa de nome que descreva a **ação** | `<button aria-label="Excluir reserva de Ana Souza"><Trash2 aria-hidden /></button>` | `aria-label="Lixeira"` — nomeia o desenho, não a ação |
| `title` não é nome acessível confiável | `aria-label` + tooltip visível com o mesmo texto | `<button title="Notificações">` — o `title` não aparece no foco por teclado e não é lido de forma consistente |
| Campo tem `<label for>` visível | `<label for="checkin">Check-in</label><input id="checkin">` | Placeholder como rótulo — some ao digitar (3.3.2) |
| Grupo de campos tem nome | `<fieldset><legend>Período</legend>…` | Dois campos soltos "De"/"Até" sem grupo |
| Ícone acompanhado de texto é decorativo | `<Bell aria-hidden="true" /> Notificações` | Ícone com `aria-label="sino"` ao lado do texto — o leitor anuncia duas vezes |
| Tabela tem nome | `<table aria-labelledby="titulo-secao">` | Tabela anônima no meio de três outras |

Os botões do header atual (`Sidebar.jsx:128-142`) usam apenas `title`. A correção é `aria-label`
com a ação e um tooltip do sistema com o mesmo texto — o mesmo texto, porque 2.5.3 exige que o nome
acessível contenha o rótulo visível.

### 6.2 Papel e estado

Elemento nativo antes de ARIA. `<button>` já é focável, aciona com `Enter` e `Space`, expõe papel e
participa de formulário; um `div` com `onClick` não faz nada disso.

```jsx
// Uso incorreto — Sidebar.jsx:179-186. Não é focável, não tem papel, não responde ao teclado.
<div className="app-dropdown-item" onClick={handleDownloadUpdate}>
  <Download size={14} /> Baixar atualização
</div>

// Uso correto.
<button type="button" role="menuitem" className="lm-menu__item" onClick={handleDownloadUpdate}>
  <Download size={14} aria-hidden="true" /> Baixar atualização
</button>
```

| Estado | Como expor |
|---|---|
| Página atual na navegação | `aria-current="page"` no item selecionado |
| Menu/combobox aberto | `aria-expanded` no acionador, `aria-controls` apontando o painel |
| Alternância (mostrar senha, fixar coluna) | `aria-pressed` |
| Seleção em lista/tabela | `aria-selected` (grid, listbox, tab) |
| Ordenação de coluna | `aria-sort="ascending" \| "descending" \| "none"` no `<th>` |
| Campo inválido | `aria-invalid="true"` + `aria-describedby` apontando a mensagem |
| Desabilitado sem tirar do teclado | `aria-disabled="true"` — preferível a `disabled` quando o usuário precisa descobrir **por que** está indisponível |
| Região carregando | `aria-busy="true"` enquanto durar |

### 6.3 Ícones decorativos

`lucide-react` renderiza `<svg>` com `stroke="currentColor"`. Todo ícone que acompanha texto recebe
`aria-hidden="true"`; ícone que é a única informação recebe o nome no elemento interativo que o
contém, nunca no `<svg>`. Hoje o frontend não tem um único `aria-hidden` — cada ícone ao lado de um
rótulo é lido duas vezes.

### 6.4 Erro associado ao campo

```jsx
<label htmlFor="checkout">Check-out</label>
<input
  id="checkout"
  type="date"
  aria-invalid={!!erro}
  aria-describedby={[ajudaId, erro && erroId].filter(Boolean).join(' ') || undefined}
/>
<p id={ajudaId} className="lm-field__help">Deve ser posterior ao check-in.</p>
{erro && <p id={erroId} className="lm-field__error">Check-out anterior ao check-in. Escolha uma data a partir de 12/03.</p>}
```

| Regra | Justificativa |
|---|---|
| A mensagem fica ligada ao campo por `aria-describedby`, não só perto dele visualmente | 3.3.1: o leitor precisa anunciar o erro ao entrar no campo |
| A mensagem diz o que fazer | 3.3.3: "Data inválida" não é suficiente |
| Erro de campo **não** usa região viva | Evita anúncio duplo: uma vez pela região, outra ao focar o campo |
| Na submissão com erros, um resumo `role="alert"` no topo lista os campos com link para cada um, e recebe o foco | Em formulário longo, o usuário não descobre sozinho onde estão os erros |
| A cor da borda nunca é o único sinal | §7 |

### 6.5 Regiões vivas

| Situação | Mecanismo | Cortesia |
|---|---|---|
| Confirmação ("Reserva salva") | `role="status"` no snackbar | `polite` |
| Contagem de resultados após filtro ("12 reservas") | `aria-live="polite"` na região da contagem | `polite` |
| Carregamento iniciado / concluído | `aria-busy="true"` na região + status "Carregando reservas…" e "48 reservas carregadas" | `polite` |
| Progresso de importação | `role="progressbar"` com `aria-valuenow`; texto anunciado a cada 25% | `polite` |
| Ordenação e paginação de tabela | `aria-sort` + status "Ordenado por check-in, crescente" | `polite` |
| Erro de submissão que bloqueia a tarefa | `role="alert"` no resumo, com foco movido para ele | `assertive` |
| Conflito de reserva detectado em tempo real | `role="alert"` | `assertive` |
| Falha de sincronização com perda de dados | `role="alert"` | `assertive` |
| Abertura de dialog | Nenhuma região viva | — |

**Regra de decisão:** `assertive` interrompe a fala em curso, inclusive no meio de uma palavra. Só é
legítimo quando o usuário perde dados ou dinheiro, ou quando a tarefa em andamento parou. Todo o
resto é `polite`. Conflito de reserva e falha de gravação estão entre os poucos casos do LUMINA que
justificam a interrupção — o custo de não avisar é uma reserva dupla.

| Regra técnica | Motivo |
|---|---|
| A região viva existe no DOM **antes** de receber conteúdo | Região criada junto com a mensagem não é anunciada |
| Uma região por tipo de mensagem, reaproveitada | Múltiplas regiões vivas competem e produzem fala embaralhada |
| No máximo uma região `assertive` na aplicação | Duas interrupções simultâneas cancelam uma à outra |
| Nada de região viva para conteúdo que muda a cada tecla | Vira ruído; use `polite` com debounce, anunciando só o resultado estável |
| Dialog não usa região viva | O anúncio vem do foco entrar em `role="dialog"` com `aria-labelledby` |

### 6.6 Anúncio de dialog

Ao abrir: o foco entra no dialog e o NVDA anuncia nome (`aria-labelledby` = título), papel
("diálogo") e o primeiro elemento focável. Por isso o título do dialog é uma frase completa
("Excluir 3 documentos?") e não um rótulo genérico ("Confirmação"). Corpo curto pode ser ligado por
`aria-describedby`; corpo longo, não — o leitor leria tudo de uma vez, sem controle.

---

## 7. Estados nunca comunicados só por cor

**Regra:** todo estado com significado carrega **no mínimo dois canais**. Cor é sempre um deles, e
sempre o secundário. Os canais disponíveis são cor, ícone, texto, forma e posição.

Motivo direto: cerca de 1 em cada 12 homens tem alguma deficiência de visão de cores; monitores mal
calibrados e o modo de alto contraste forçado (§9) apagam a diferença cromática por completo.

| Estado | Cor (secundária) | Canal obrigatório 1 | Canal obrigatório 2 |
|---|---|---|---|
| Reserva confirmada | `--lm-color-success` | Ícone de confirmação | Rótulo "Confirmada" |
| Conflito de datas | `--lm-color-error` | Ícone de alerta | Rótulo com a severidade + posição no topo da lista |
| Aguardando pagamento | `--lm-color-warning` | Ícone | Rótulo "Aguardando" |
| Plataforma Airbnb / Booking | `--lm-color-airbnb-container` / `--lm-color-booking-container` | Rótulo textual "Airbnb"/"Booking.com" | — (o contêiner colorido é o terceiro canal) |
| Item de navegação selecionado | `--lm-color-secondary-container` | Indicador tonal em pílula (forma) | Peso do rótulo + `strokeWidth` maior no ícone |
| Linha selecionada em tabela | `--lm-table-row-selected-bg` | Checkbox marcado | Contagem "3 selecionadas" acima da tabela |
| Campo obrigatório | — | Texto "obrigatório" no rótulo | — (asterisco vermelho sozinho é insuficiente) |
| Campo em erro | `--lm-field-border-error` | Ícone no campo | Mensagem em texto abaixo |
| Controle desabilitado | Opacidade `--lm-state-disabled-content` | `aria-disabled` | Texto explicando por quê, quando não for óbvio |
| Série de gráfico | `--lm-chart-series-*` | Rótulo direto na série ou legenda adjacente | Forma do marcador quando houver mais de 2 séries |
| Status em gráfico | `--lm-chart-status-*` | Ícone | Rótulo |
| Link dentro de texto corrido | `--lm-color-primary` | Sublinhado | — |

Números que sustentam a regra: a camada de hover (`--lm-state-hover: 0.08`) altera a luminância do
fundo em cerca de 1,17:1 no tema claro. Isso é feedback de ponteiro, não informação — e nenhum
estado persistente pode depender dela. Texto desabilitado a 38% de opacidade mede 2,34:1 no claro e
3,04:1 no escuro; a WCAG isenta controles desabilitados do 1.4.3, mas isso não torna o texto
legível, e é por isso que "desabilitado" nunca pode ser a única explicação de uma ação indisponível.

**Uso incorreto, retirado do código atual** (`Sidebar.jsx:156`): a única indicação de "há uma
atualização disponível" é a borda e o texto mudarem para `#f59e0b`. Sem o segundo canal — e com um
hexadecimal fora do sistema.

---

## 8. Movimento reduzido

`@media (prefers-reduced-motion: reduce)` não significa "sem transição": significa **sem
deslocamento espacial**. Opacidade e cor continuam permitidas; o que sai é tudo que se move,
escala, gira por decoração ou desliza.

| Efeito padrão | Sob movimento reduzido | Motivo |
|---|---|---|
| Entrada de página com deslocamento + fade (`--lm-duration-emphasized`) | Fade de opacidade em `--lm-duration-fast`, sem `translate` | Deslocamento amplo é o principal gatilho de desconforto vestibular |
| Dialog entrando com escala 0,95 → 1 | Apenas opacidade | Escala no centro da tela é movimento de grande amplitude percebida |
| Snackbar deslizando de baixo | Aparece no lugar, com fade | |
| Drawer deslizando lateralmente | Aparece no lugar, com fade; o scrim mantém o fade | |
| Indicador de navegação escorregando entre destinos | Muda de posição sem transição | O indicador tonal é informação; a viagem dele é decoração |
| Shimmer de esqueleto de carregamento | Bloco estático, sem animação, com status `polite` "Carregando…" | Gradiente em movimento é animação decorativa contínua |
| Expansão/colapso com animação de altura | Instantâneo (`--lm-duration-instant`) | Animação de altura empurra todo o conteúdo abaixo |
| Rolagem suave (`scroll-behavior: smooth`) | `auto` | Rolagem programada é dos piores gatilhos |
| Animação de entrada de gráfico (recharts) | `isAnimationActive={false}` | Barras crescendo e linhas se desenhando são puramente decorativas |
| Indicador de carregamento em rotação | **Mantido** | É o único sinal de que o sistema está vivo; amplitude pequena, área pequena, essencial |
| Efeito de elevação/deslocamento no hover | Só mudança de cor de fundo | |
| Paralaxe, autoplay, carrossel | Não existem no sistema | Não há o que reduzir |

Regra de implementação: o produto **nunca** anima nada além de `opacity`, `transform`,
`background-color` e `color`. Sob movimento reduzido, as durações efetivas colapsam para
`--lm-duration-instant` (0ms) ou `--lm-duration-fast` (120ms), conforme a tabela. O gerador não
emite um bloco `prefers-reduced-motion` — essa redefinição vive na camada de aplicação (§11).

Movimento reduzido **não** é desculpa para remover feedback: se a transição some, o estado final
precisa ser inequívoco no primeiro quadro.

---

## 9. Modo de alto contraste forçado

`@media (forced-colors: active)` — no Windows, o "Contraste alto" do sistema. O Chromium substitui
cores por uma paleta do sistema (`Canvas`, `CanvasText`, `ButtonFace`, `ButtonText`, `ButtonBorder`,
`Field`, `FieldText`, `Highlight`, `HighlightText`, `LinkText`, `GrayText`, `Mark`). O que ele faz,
sem pedir licença: descarta `box-shadow`, descarta `background-image`, e força cor de texto, de
fundo e de borda.

| O que precisa sobreviver | Como |
|---|---|
| Anel de foco | Usar `outline` — o sistema o recolore para `Highlight`. É a razão técnica de o anel nunca ser `box-shadow` |
| Fronteira de menu, dialog, snackbar, tooltip, card elevado | `border: 1px solid CanvasText` dentro do bloco `forced-colors`. A elevação é sombra, e sombra desaparece |
| Estado selecionado (item de navegação, chip, linha) | O `background` tonal some. Repor com `border: 2px solid Highlight` **ou** `forced-color-adjust: none` **apenas** no indicador — nunca no componente inteiro |
| Estado desabilitado | `color: GrayText` |
| Ícones | `lucide-react` desenha com `currentColor` e é recolorido corretamente. SVG com `fill` fixo não sobrevive — não use |
| Scrim do dialog | Desaparece. O dialog precisa da borda do item 2 para não se fundir com o fundo |
| Divisor e contorno | `--lm-color-outline-variant` some; use `border-color: CanvasText` |
| Gráficos | Única exceção legítima a `forced-color-adjust: none`, aplicada à área de plotagem, **sempre** acompanhada de rótulo direto ou de forma de marcador distinta |
| Badge de contagem | `background: Highlight; color: HighlightText` |

```css
@media (forced-colors: active) {
  .lm-menu, .lm-dialog, .lm-snackbar, .lm-tooltip, .lm-card--elevated {
    border: 1px solid CanvasText;
  }
  .lm-nav__item[aria-current="page"] .lm-nav__indicator {
    forced-color-adjust: none;
    background: Highlight;
    color: HighlightText;
  }
  :where(a, button, input, select, textarea, [tabindex]):focus-visible {
    outline-color: Highlight;   /* explícito; o resto da regra §3.3 continua valendo */
  }
}
```

Teste no DevTools do Electron: `Ctrl+Shift+P` → *Show Rendering* → *Emulate CSS media feature
forced-colors: active*. Verificação de aprovação: toda fronteira ainda visível, todo estado
selecionado ainda identificável, todo foco ainda visível, nenhum texto sumindo sobre o fundo.

---

## 10. Matriz mínima de testes

Nenhuma linha desta tabela é opcional. Todas são manuais até que a governança adicione automação —
o único teste automatizado existente é o de contraste de tokens.

| # | Cenário | Como testar | Aprovação |
|---|---|---|---|
| 1 | Tema claro | Padrão do produto, ou `data-theme="light"` no `<html>` | Todos os pares de token passam no `--check`; nenhum hexadecimal fora de token na tela |
| 2 | Tema escuro | DevTools → *Emulate prefers-color-scheme: dark*, e `data-theme="dark"` | Idem; nenhuma superfície `#101922` remanescente; nenhuma cor "vazando" do tema claro |
| 3 | Alternância de tema | Trocar o tema com um dialog aberto e um gráfico renderizado | Nada pisca em branco, nenhuma cor fica presa, o gráfico troca de paleta |
| 4 | Contraste de tokens | `python scripts/design/generate_tokens.py --check` | Saída 0; 68/68 pares aprovados |
| 5 | Contraste fora dos tokens | Conta-gotas sobre texto em gráfico, badge, estado de hover, texto sobre `surface-dim` | ≥ 4,5:1 texto, ≥ 3:1 ícone e fronteira |
| 6 | Alto contraste forçado | DevTools → *Emulate forced-colors: active* | Checklist do §9 |
| 7 | Movimento reduzido | DevTools → *Emulate prefers-reduced-motion: reduce* | Nenhum deslocamento; nenhum shimmer; gráficos sem animação; feedback preservado |
| 8 | Zoom 200% | `Ctrl` `+` no Electron até 200% (viewport de 1280 vira 640 CSS px → breakpoint medium) | Nenhum conteúdo perdido nem cortado; a navegação vira drawer; a ação primária do dialog continua alcançável |
| 9 | Refluxo a 320px | Janela de 1600px com zoom 400%, ou 400×900 | Sem rolagem horizontal da página; tabela e gráfico rolam dentro do próprio container |
| 10 | Espaçamento de texto | Injetar `line-height:1.5; letter-spacing:0.12em; word-spacing:0.16em` e `2em` de parágrafo | Nada corta, nada se sobrepõe; nenhum container com altura fixa em texto |
| 11 | Teclado completo | Desconectar o mouse. Executar: login, criar reserva, resolver conflito, exportar documento, mudar configuração | Toda função alcançável; nenhuma armadilha; foco sempre visível; `Esc` sempre sai |
| 12 | Ordem de foco | `Tab` do início ao fim de cada uma das 10 páginas | Ordem = leitura; nenhum salto; nenhum foco em elemento invisível; nenhum `tabindex` positivo |
| 13 | Foco não obscurecido | Rolar até o fim de uma lista longa e tabular | O app bar de 64px nunca cobre o elemento focado (§3.3) |
| 14 | Leitor de tela | NVDA: percorrer por cabeçalhos (`H`), por regiões (`D`), por formulário (`F`); executar salvar, filtrar, excluir | Todo controle tem nome e papel; toda mudança sem foco é anunciada; nada é anunciado duas vezes |
| 15 | Ponteiro grosseiro | DevTools → emulação de toque, ou `(pointer: coarse)` | Densidade sobe para 48px; nenhum alvo abaixo de 44px; nada depende de hover |
| 16 | Mouse | Uso normal | Nenhum anel de foco aparecendo ao clicar; hover só onde há ação; cursor coerente com o papel |
| 17 | Tamanhos de tela | 400 / 600 / 840 / 1200 / 1600px | compact = navegação inferior; medium = drawer; expanded/large = rail; nada some sem alternativa |
| 18 | Textos longos | Nome de hóspede com 80 caracteres, título de documento com 120, e-mail longo sem espaços | Quebra ou truncamento com o texto completo disponível (`title` + nome acessível); controle cresce com `min-height`, não corta |
| 19 | Estado de erro | Derrubar o backend; submeter formulário vazio; datas invertidas | Mensagem em texto associada ao campo; resumo com foco na submissão; caminho de recuperação óbvio |
| 20 | Estado de carregando | Estrangular a rede local / atrasar a resposta | `aria-busy` na região; status `polite`; esqueleto com a mesma geometria do conteúdo final; sem salto de layout |
| 21 | Estado vazio | Base zerada, filtro sem resultado | Explica o motivo e oferece a ação seguinte; o container do estado vazio é focável para receber o foco após esvaziar a lista |
| 22 | Volume grande de dados | 5.000 reservas, 500 documentos, calendário de 2 anos | Teclado continua fluido; `Ctrl+End` materializa a última linha; a contagem é anunciada uma vez, não a cada lote |
| 23 | Offline | Desconectar a rede por completo | Fonte, ícones e estilos intactos (o `@import` do Google Fonts é a falha conhecida a eliminar) |

---

## 11. Lacunas
> **Registro autoritativo:** [`LACUNAS.md`](LACUNAS.md). A lista abaixo reflete o estado
> do dia em que este documento foi escrito e não é atualizada quando uma lacuna fecha —
> várias destas já foram fechadas por extensão do gerador.


Regras acima que hoje precisariam de um token que não existe. Nenhum nome foi inventado; cada item
descreve a regra e o que falta.

1. **Anel de foco de duas camadas** (§3.5). Sobre superfície arbitrária — marca de gráfico,
   miniatura de documento, imagem — a regra exige um contorno interno neutro somado ao anel
   colorido. Existem só `--lm-focus-ring-color` e `--lm-focus-ring-color-inverse`; falta a cor do
   contorno interno e a espessura dele.
2. **Anel em `forced-colors`** (§9). A regra usa a cor de sistema `Highlight`, que por definição não
   pode ser um token do design system. Fica registrado que este é um valor legítimo escrito fora do
   sistema de tokens — a única categoria de exceção permitida.
3. **Alvo de ponteiro independente do desenho** (§5.2). `--lm-density-control` descreve a altura
   desenhada do controle, não a área que responde ao ponteiro. A regra "32px de desenho, 40px de
   alvo" em densidade `compact` precisa de um token próprio de área mínima de alvo.
4. **Distância mínima entre alvos** (§5.3). A regra usa `--lm-space-8`, que é um token de layout. O
   valor de 8px é um requisito de acessibilidade e deveria ser expresso como tal, para não ser
   reduzido por uma decisão de espaçamento.
5. **Fronteira de controle com contraste garantido.** `--lm-chip-border` e
   `--lm-card-outlined-border` resolvem para `--lm-color-outline-variant`, que mede 1,62:1 sobre
   `surface` no claro e 1,98:1 no escuro. Quando a borda é a **única** fronteira de um controle
   interativo (chip de filtro, card selecionável), o 1.4.11 exige 3:1 — o que só
   `--lm-color-outline` entrega (4,25:1 / 5,89:1). Falta um token de borda de controle interativo
   distinto do token de borda decorativa.
6. **Durações sob movimento reduzido** (§8). O gerador não emite bloco `prefers-reduced-motion`.
   `--lm-duration-instant: 0ms` existe como valor, mas não há variável de "duração efetiva" que os
   componentes consumam e que a preferência do usuário possa reescrever num único lugar.
7. **Faixa "pular para o conteúdo"** (§2.2, 2.4.1). Não há token de altura nem de superfície para o
   link de salto, que precisa aparecer sobre o app bar quando focado.
8. **Tempo mínimo de exibição de snackbar** (§2.2, 2.2.1). A regra dos 5 segundos não tem token; as
   durações de movimento existentes descrevem transições, não tempo de leitura.
9. **Texto desabilitado.** Só existe a opacidade `--lm-state-disabled-content: 0.38`, que produz
   2,34:1 no claro e 3,04:1 no escuro. A regra "desabilitado ainda precisa ser lido" exigiria uma
   cor de texto desabilitado com contraste declarado, não uma opacidade aplicada sobre a cor de
   conteúdo.
