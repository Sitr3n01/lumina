# 02 — Layout

Grid, classes de janela, navegação adaptativa, padrões de composição, densidade e camadas.
Este documento define **onde as coisas ficam e como se reorganizam**. O que elas parecem está
em [`01-fundamentos.md`](01-fundamentos.md); o que elas são está em
[`05-componentes.md`](05-componentes.md).

O LUMINA é um app Electron de janela única, usado o dia inteiro por um administrador. O layout
tem duas obrigações: não desperdiçar largura quando ela existe e não quebrar quando ela some.
Ambas são medidas, não opinião.

---

## 1. Grid

### 1.1 Estrutura

O layout tem três regiões fixas e uma variável:

| Região | Papel | Largura |
|---|---|---|
| **Navegação** | Rail, drawer ou barra inferior — a espinha do app | Fixa por classe de janela (§3) |
| **App bar** | Título da página, busca, ações globais, conta | Largura restante, altura `--lm-app-bar-height` (64px) ou `--lm-app-bar-height-compact` (56px) |
| **Canvas** | Onde o conteúdo da página vive e rola | Largura restante, com margem e teto |
| **Painéis** | Painel de apoio, detalhe, folha — aparecem e somem | Definida pelo padrão de layout (§4) |

Só o canvas rola. A navegação e a app bar são fixas — num app de uso prolongado, perder a
referência de onde se está por causa de rolagem é custo puro. Hoje `App.css` já acerta nisso
(`.app { overflow: hidden }` + `.main-content { overflow-y: auto }`) e essa parte da estrutura
se mantém.

### 1.2 Colunas, margens e gutters

Grid fluido de colunas iguais dentro do canvas. O número de colunas muda por classe de janela;
o tamanho da coluna nunca é fixo.

| Classe de janela | Colunas | Margem do canvas | Gutter | Tokens |
|---|---|---|---|---|
| compact | 4 | 16px | 16px | `--lm-space-16` / `--lm-space-16` |
| medium | 8 | 24px | 16px | `--lm-space-24` / `--lm-space-16` |
| expanded | 12 | 24px | 24px | `--lm-space-24` / `--lm-space-24` |
| large | 12 | 32px | 24px | `--lm-space-32` / `--lm-space-24` |
| xlarge | 12 | 40px | 24px | `--lm-space-40` / `--lm-space-24` |

O gutter para no 24px em expanded e não cresce mais. Espaço entre colunas maior que 24px não
lê como "colunas espaçadas", lê como "colunas desconectadas" — a partir daí, quem deve crescer
é a margem, que empurra o conteúdo para o centro do olhar, e não o vão entre cards.

Toda margem e todo gutter saem de `--lm-space-*`. Um `padding: 30px` é um bug de layout do
mesmo tipo que um `#3b82f6` é um bug de cor.

```css
.lm-canvas {
  padding-inline: var(--lm-space-16);
  --lm-canvas-gutter: var(--lm-space-16);
}
@media (min-width: 600px)  { .lm-canvas { padding-inline: var(--lm-space-24); } }
@media (min-width: 840px)  { .lm-canvas { --lm-canvas-gutter: var(--lm-space-24); } }
@media (min-width: 1200px) { .lm-canvas { padding-inline: var(--lm-space-32); } }
@media (min-width: 1600px) { .lm-canvas { padding-inline: var(--lm-space-40); } }
```

### 1.3 Teto do canvas e medida do texto

Duas larguras máximas diferentes, com propósitos diferentes, e confundi-las é o erro de layout
mais comum em app de dados.

**Teto do canvas: 1600px.** Acima disso o canvas para de crescer e centraliza. Numa janela
maximizada de monitor ultrawide (3440px é comum), um grid de 12 colunas full-bleed produz uma
linha de estatísticas cujo primeiro e último valor estão a meio metro de distância física um do
outro — o olho não faz essa varredura, ele desiste. O código atual já intui isso, mas sem
acordo: `Dashboard.css` e `Statistics.css` limitam em 1600px, `CalendarPage.css`,
`ConflictsPage.css`, `Documents.css`, `Emails.css` e `Notifications.css` em 1400px e
`Settings.css` em 1200px. Três tetos diferentes fazem as páginas "pularem" de largura ao trocar
de destino. Um só teto, aplicado no canvas e não em cada página, elimina o pulo.

**Medida do texto: 68ch.** Nenhum bloco de texto corrido passa de 68 caracteres por linha.
Acima disso o olho perde a linha no retorno de carro. `ch` é a unidade certa porque acompanha
a fonte e o zoom; um valor em px erraria assim que o usuário aumentasse o texto.

**Ficha — superfícies estruturais ocupam largura total, texto não**

| | |
|---|---|
| **Regra** | Superfície estrutural (tabela, calendário, gráfico, lista, barra de ferramentas, divisor, faixa de status) usa toda a largura do canvas. Texto corrido (parágrafo, descrição de campo, mensagem de erro, texto de estado vazio, corpo de e-mail) para em 68ch. |
| **Justificativa** | Tabela e calendário são grades: quanto mais largura, menos truncamento e menos rolagem horizontal. Texto é uma linha: quanto mais largura, pior a leitura. São regimes opostos e o mesmo container não serve para os dois. |
| **Uso correto** | A tabela de conflitos ocupa os 1600px; o parágrafo que explica o conflito, dentro da mesma página, para em 68ch alinhado à esquerda. |
| **Uso incorreto** | Centralizar o bloco de texto de 68ch no meio de um canvas de 1600px, criando duas colunas de ar de 460px de cada lado. Texto limitado continua alinhado à borda de início do canvas. |
| **Token** | Margens e gutters vêm de `--lm-space-*`. Teto do canvas e medida não têm token (§Lacunas). |
| **Acessibilidade** | WCAG 2.2 AAA 1.4.8 pede no máximo 80 caracteres; 68ch fica confortavelmente dentro. A medida em `ch` sobrevive ao zoom e ao ajuste de espaçamento de texto (1.4.12) sem sobreposição. |
| **Responsivo** | Em compact e medium a medida praticamente nunca é atingida — a margem já limita antes. Ela só passa a agir de expanded para cima, que é exatamente onde o problema aparece. |

### 1.4 Zonas seguras

Áreas onde conteúdo interativo não entra, por motivo de sistema operacional e não de estética.

| Zona | Regra | Motivo |
|---|---|---|
| **Faixa de arrasto da janela** | A app bar é a região de arrasto (`-webkit-app-region: drag`). Todo controle dentro dela declara `no-drag`, e sobra pelo menos `--lm-space-24` de faixa arrastável contínua. | Sem isso o usuário não consegue mover a janela sem maximizá-la. |
| **Controles do sistema** | Nenhum controle do LUMINA no canto superior direito (Windows) ou esquerdo (macOS), na altura da app bar. | Colisão com minimizar/maximizar/fechar. |
| **Borda da janela** | Nada interativo a menos de `--lm-space-8` da borda. | A borda de redimensionamento do SO rouba os primeiros pixels do clique. |
| **Barra de rolagem** | O canvas declara `scrollbar-gutter: stable`. | Sem isso, o conteúdo salta lateralmente quando a lista passa a rolar — visível toda vez que Notificações carrega mais itens. |
| **Cantos arredondados** | Nenhum alvo de clique nos primeiros 12px de qualquer canto da janela. | O canto pode estar recortado pelo tema do SO. |

---

## 2. Breakpoints — classes de janela

### 2.1 As cinco classes

Os valores estão em `tokens.json`, em `primitive.breakpoint`:

| Classe | Faixa (px CSS) | Valor do token | O que é, na prática |
|---|---|---|---|
| **compact** | 0 – 599 | `breakpoint.compact` = `0px` | Janela apertada ou zoom alto. Uma coluna, navegação inferior. |
| **medium** | 600 – 839 | `breakpoint.medium` = `600px` | Janela em terço de tela, ou metade de tela com zoom. Duas colunas, drawer. |
| **expanded** | 840 – 1199 | `breakpoint.expanded` = `840px` | Janela em metade de tela num monitor 1080p+. Rail recolhido, layouts de dois painéis passam a caber. |
| **large** | 1200 – 1599 | `breakpoint.large` = `1200px` | Janela restaurada típica. Rail recolhido com opção de expandir, painel de apoio ancorado. |
| **xlarge** | ≥ 1600 | `breakpoint.xlarge` = `1600px` | Maximizada em monitor grande. Rail expandido por padrão, canvas no teto. |

### 2.2 Categoria de janela, não de dispositivo

Um breakpoint no LUMINA nunca significa "celular", "tablet" ou "desktop". O LUMINA não roda em
celular — e mesmo assim precisa das cinco classes, porque a largura CSS disponível varia por
motivos que nada têm a ver com o aparelho:

- **A janela é redimensionável.** O usuário arrasta a janela do LUMINA para metade da tela para
  conferir o calendário ao lado do e-mail do hóspede. Num monitor 1920×1080, metade da tela
  são 960px CSS — medium. Um terço (snap do Windows 11) são 640px — ainda medium, quase
  compact.
- **Zoom de página.** Ctrl+`+` no Electron aumenta o zoom de página, e zoom de página *divide a
  largura CSS*. Uma janela de 1280px físicos a 200% de zoom entrega 640px CSS: medium. Uma
  janela de 1024px a 200% entrega 512px CSS: **compact**. A classe compact não é hipótese de
  celular, é o LUMINA de um usuário com baixa visão numa janela normal.
- **Escala de DPI do Windows.** 125% e 150% são o padrão de fábrica em notebooks; eles reduzem
  a largura CSS efetiva antes de qualquer zoom do usuário.
- **Windows Snap.** Metade, terço e quarto de tela são gestos de um atalho, e o usuário os usa
  sem avisar.

Conclusão operacional: **toda página precisa funcionar em 320px CSS de largura**, mesmo que
nenhum celular jamais abra o LUMINA.

### 2.3 Como escrever a media query

Só `min-width`, sempre em ordem crescente, sempre com os cinco valores da escala. Compact é o
estado sem media query — é o padrão, não uma exceção.

```css
/* compact — padrão, sem media query */
@media (min-width: 600px)  { /* medium   */ }
@media (min-width: 840px)  { /* expanded */ }
@media (min-width: 1200px) { /* large    */ }
@media (min-width: 1600px) { /* xlarge   */ }
```

**Ficha — media queries usam a escala e só `min-width`**

| | |
|---|---|
| **Regra** | Nenhum valor de breakpoint fora de 600 / 840 / 1200 / 1600. Nenhuma media query de `max-width` para layout. |
| **Justificativa** | Misturar `min-width` e `max-width` cria faixas sobrepostas em que a mesma propriedade é declarada duas vezes e a vencedora depende da ordem no arquivo — a fonte de bug de responsividade mais cara de diagnosticar. O código atual usa cinco breakpoints (640, 768, 1024, 1200, 2000) e só um deles, 1200, pertence à escala; 768px separa `Dashboard.css`, `Emails.css`, `Documents.css` e `Statistics.css` num ponto que não corresponde a nenhuma classe de janela. |
| **Uso correto** | `@media (min-width: 840px) { .lm-list-detail { grid-template-columns: 360px 1fr; } }` |
| **Uso incorreto** | `@media (max-width: 768px) { ... }` — nem o operador nem o valor pertencem ao sistema. |
| **Token** | `primitive.breakpoint` em `tokens.json`. Não existe custom property correspondente (§Lacunas) e o prelúdio de media query não aceitaria `var()` de qualquer forma: os literais são obrigatórios e devem bater com o JSON. |
| **Acessibilidade** | Faixas sem sobreposição são pré-requisito para que o comportamento em 200% de zoom seja o mesmo comportamento já testado em janela estreita — um caminho de código, não dois. |
| **Responsivo** | Mobile-first significa que o estado degradado é o padrão: se uma media query falhar, o resultado é uma coluna legível, não um layout quebrado. |

Duas consultas complementam a escala e **não** são breakpoints de largura:

| Consulta | Efeito |
|---|---|
| `@media (pointer: coarse)` | Força densidade confortável (§5). Já declarada em `primitives.css`. Vale para 2-em-1 e telas sensíveis ao toque, independentemente da largura. |
| `@media (prefers-reduced-motion: reduce)` | Transições de layout (expansão do rail, entrada de drawer e de painel) passam a `--lm-duration-instant`. A mudança de estado continua; só a interpolação some. |

---

## 3. Navegação adaptativa

### 3.1 O problema dos 10 destinos

O LUMINA tem 10 páginas. Hoje elas ocupam 8 abas horizontais de 52px de altura sob um header
fixo de 64px — 116px de cromo permanente no topo, e ainda assim Notificações e Configurações
não couberam nas abas e viraram ícones no header. Abas horizontais têm um teto rígido: elas
crescem no eixo em que a tela é escassa quando a janela encolhe, e o oitavo item é o primeiro a
ser cortado.

Um rail resolve o eixo, mas não resolve a contagem. **Dez itens num rail é ilegível**: a
varredura vertical de dez ícones custa mais do que a de cinco, o indicador de seleção perde
saliência num campo denso, e a lista deixa de ter forma memorizável. O limite prático é seis.

A resolução não é encolher os itens — é reconhecer que as 10 páginas não têm o mesmo papel.

### 3.2 A hierarquia proposta

**Seis destinos de primeiro nível, no rail:**

| # | Destino | Ícone `lucide-react` | Por que é de primeiro nível |
|---|---|---|---|
| 1 | Dashboard | `Home` | Ponto de partida do dia; estado geral do negócio. |
| 2 | Calendário | `Calendar` | Objeto central do produto. Toda decisão de aluguel é uma decisão sobre datas. |
| 3 | Conflitos | `AlertTriangle` | Custa dinheiro real e é sensível ao tempo. Carrega badge de contagem (`--lm-badge-bg`). |
| 4 | Emails | `Mail` | Alta frequência diária; é a caixa de entrada da operação. |
| 5 | Documentos | `FileText` | Tarefa recorrente com prazo (autorização por hóspede que chega). |
| 6 | Estatísticas | `BarChart3` | Destino de revisão, baixa frequência, mas é um lugar para onde se vai deliberadamente. |

**Quatro páginas que deixam de ser destinos:**

| Página | Passa a ser | Justificativa |
|---|---|---|
| **Notificações** | Painel de apoio ancorado à direita, invocado pelo `Bell` na app bar | Notificação é transversal a todas as páginas. Transformá-la em destino obriga o usuário a **sair** do contexto para ler um alerta e voltar — exatamente o oposto do que um alerta pede. Como painel, ela aparece ao lado do que motivou o alerta. |
| **Sugestões IA** | Painel de apoio ancorado à direita, invocado da app bar em qualquer página | O valor de uma sugestão de preço está em vê-la **ao lado** do calendário, comparando com as datas reais. Hoje é uma página de chat isolada: o usuário lê a sugestão, memoriza, troca de página e tenta aplicar. Painel elimina a memorização. |
| **Template de Condomínio** | Subdestino de Documentos (segmento no topo da página Documentos) | É a pré-visualização do modelo que a página Documentos gera. Nunca é ponto de partida: ninguém abre o LUMINA para olhar um template. Hoje ele já é alcançado com um botão "Voltar" que devolve ao Dashboard — sinal de que a hierarquia real já é de subdestino, só não está declarada. |
| **Configurações** | Zona de conta, no rodapé do rail, abaixo de um divisor | Baixa frequência e alta permanência: entra-se para mudar uma coisa e sai-se. Misturá-la aos seis destinos de trabalho aumenta o custo de varredura dos itens que importam todo dia. |

**Ficha — seis destinos, o resto é painel ou subdestino**

| | |
|---|---|
| **Regra** | O rail expõe exatamente seis destinos de trabalho. Conta e Configurações ficam numa zona separada no rodapé. Notificações e Sugestões IA são painéis de apoio, nunca destinos. Template de Condomínio é subdestino de Documentos. |
| **Justificativa** | Uma lista de navegação é memorizada por forma, não lida item a item. Seis itens têm forma; dez são uma lista que precisa ser lida toda vez. Além disso, duas das dez páginas são *acessórios de contexto* e uma é filha de outra — não eram destinos desde o começo. |
| **Uso correto** | Abrir Sugestões IA sobre a página Calendário e ver a sugestão contra as datas ocupadas. |
| **Uso incorreto** | Adicionar um sétimo destino "porque a página nova precisa de visibilidade". Visibilidade de página nova se resolve em §06 (padrões de descoberta), não no rail. |
| **Token** | `--lm-navigation-item-bg-selected`, `--lm-navigation-item-label`, `--lm-navigation-item-label-selected`, `--lm-navigation-surface`, `--lm-badge-bg` para o contador de Conflitos. |
| **Acessibilidade** | Menos destinos significa menos paradas de Tab antes do conteúdo. O rail é um `<nav>` único com rótulo acessível; a ordem visual e a ordem no DOM são a mesma. Badge de Conflitos precisa de texto acessível ("3 conflitos"), nunca só o número visual. |
| **Responsivo** | Seis itens cabem no rail e no drawer. Na barra inferior (compact) só cinco cabem — a regra de corte está em §3.6. |

### 3.3 Comportamento por classe de janela

| Classe | Componente de navegação | Largura / altura | Rótulos | App bar |
|---|---|---|---|---|
| **compact** | Barra de navegação inferior | Altura de um item (`--lm-navigation-item-height`, 56px) mais `--lm-space-8` em cima e embaixo | Sempre visíveis, sob o ícone | `--lm-app-bar-height-compact` (56px) |
| **medium** | Drawer modal, invocado por botão de menu na app bar | `--lm-navigation-drawer-width` (320px) | Completos | `--lm-app-bar-height` (64px) |
| **expanded** | Rail recolhido, permanente | `--lm-navigation-rail-width` (88px) | Sob o ícone, `--lm-type-label-md-*` | 64px |
| **large** | Rail recolhido, permanente, com alternador para expandir | 88px, ou 256px se o usuário expandir | Sob o ícone, ou ao lado quando expandido | 64px |
| **xlarge** | Rail expandido por padrão | `--lm-navigation-rail-width-expanded` (256px) | Ao lado do ícone, `--lm-type-label-lg-*` | 64px |

Em large e xlarge existe um único componente com dois estados, não dois componentes. O que muda
entre as classes é apenas o **padrão inicial**; a escolha do usuário é persistida e vence o
padrão em ambas.

### 3.4 Anatomia do rail

De cima para baixo, em ambos os estados:

1. **Alternador** — botão de ícone (`--lm-icon-button-size`) que recolhe e expande. Presente
   de large para cima. Em expanded o rail é sempre recolhido e o alternador não aparece: 256px
   de rail dentro de 840px de janela consumiriam 30% da largura.
2. **Divisor** — `--lm-color-divider`.
3. **Os seis destinos** — cada item com altura `--lm-navigation-item-height` (56px).
4. **Espaço flexível.**
5. **Divisor.**
6. **Configurações** — mesmo formato de item de destino.
7. **Conta** — avatar e nome do usuário; abre menu com versão do app, verificar/instalar
   atualização e Sair. É o destino do menu de três pontos e do botão "Sair" que hoje moram na
   app bar.

Não há botão de ação flutuante no rail. O LUMINA não tem uma ação de criação dominante que
valha em todas as páginas — "nova reserva" pertence ao Calendário, "gerar autorização" a
Documentos. A ação primária vive no cabeçalho da página que a possui, onde o objeto dela está.

**Estado selecionado.** `lucide-react` não tem variantes preenchidas, então a seleção se
constrói com três sinais somados, nunca só com cor:

| Sinal | Recolhido (88px) | Expandido (256px) |
|---|---|---|
| Indicador tonal | Pílula de `--lm-navigation-indicator-width` (56px) × `--lm-navigation-indicator-height` (32px) atrás do ícone, raio `--lm-navigation-item-radius` | Pílula ocupando a largura do item menos `--lm-space-12` de cada lado, altura 56px |
| Fundo e rótulo | `--lm-navigation-item-bg-selected` / `--lm-navigation-item-label-selected` | Idem |
| Peso do traço do ícone | `strokeWidth` 2 → 2.25 | Idem |
| Peso do rótulo | Um degrau acima do não selecionado (§Lacunas — falta token de peso) | Idem |

```jsx
<button
  className="lm-rail__item"
  aria-current={selecionado ? 'page' : undefined}
>
  <span className="lm-rail__indicator">
    <Calendar size={24} strokeWidth={selecionado ? 2.25 : 2} aria-hidden="true" />
  </span>
  <span className="lm-rail__label">Calendário</span>
</button>
```

O `aria-current="page"` é o que carrega a seleção para leitores de tela; a pílula sozinha não
comunica nada a quem não a vê.

### 3.5 Recolher, expandir e virar drawer

**Recolher/expandir (large e xlarge).** A largura anima de 88px para 256px em
`--lm-duration-emphasized` (320ms) com `--lm-easing-emphasized`. Os rótulos laterais entram
depois, em `--lm-duration-fast` (120ms), para não aparecerem espremidos durante a animação. Sob
`prefers-reduced-motion: reduce` a largura troca em `--lm-duration-instant` e os rótulos
aparecem junto. O canvas **cede largura**: o rail empurra, não cobre. Um rail que cobre o
conteúdo obriga o usuário a fechá-lo para ler o que estava embaixo.

**Virar drawer (medium).** O rail não existe em medium. A app bar ganha um botão de menu que
abre um drawer de `--lm-navigation-drawer-width` (320px) a partir da borda de início, sobre o
conteúdo, com véu de `--lm-color-scrim`. O drawer é **modal**: prende o foco, fecha com `Esc`,
fecha com clique no véu e fecha ao escolher um destino.

Por que drawer e não rail recolhido: em medium a largura útil já está no limite, e o rail
recolhido é a pior troca possível — cobra 88px permanentes (até 15% da janela) para entregar
só um ícone, que é justamente a affordance que falha quando a janela está espremida ao lado de
outro app. O drawer devolve a largura ao conteúdo e entrega rótulos completos no momento em que
a navegação é usada.

**Virar barra inferior (compact).** A navegação desce. Em 320–599px CSS, a borda inferior é a
única região alcançável sem custo — e num 2-em-1 é onde o polegar está.

### 3.6 Regra de corte em compact

Cinco itens é o teto de uma barra inferior: com seis, o rótulo de 12px começa a truncar em
320px CSS, e rótulo de navegação truncado é rótulo inútil.

| Na barra inferior (5) | Fora dela |
|---|---|
| Dashboard, Calendário, Conflitos, Emails, Documentos | **Estatísticas** e **Configurações** migram para o menu de conta, no avatar da app bar |

Estatísticas é o item que sai porque é o único dos seis que **não funciona** em compact:
gráficos com menos de 240px de altura útil não são leitura, são decoração. Quem vai ver
estatísticas alarga a janela — e a regra apenas reconhece isso em vez de fingir o contrário.

Notificações e Sugestões IA, que em janelas largas são painéis ancorados, viram folha modal de
largura total em compact, com rolagem interna e fechamento explícito.

---

## 4. Padrões de layout

Seis padrões. Toda página do LUMINA é uma instância de um deles; se uma tela nova não couber em
nenhum, o padrão certo é um dos seis mal aplicado, não um sétimo padrão.

### 4.1 Single pane (painel único)

**Quando usar.** A tarefa é um fluxo só, sem objeto secundário persistente para comparar ou
consultar. Formulários, editores, leituras longas.

| Classe | Comportamento |
|---|---|
| compact / medium | Uma coluna, largura do canvas menos a margem. Campos empilhados. |
| expanded + | Campos relacionados em duas colunas; texto explicativo em 68ch; canvas no teto de 1600px. Um campo nunca estica até 1600px — campo largo demais mente sobre o tamanho esperado da entrada. |

**Páginas LUMINA.** Configurações (com `form-grid` de duas colunas a partir de expanded),
Template de Condomínio, Login.

### 4.2 List-detail (lista e detalhe)

**Quando usar.** Uma coleção homogênea de itens e o conteúdo do item selecionado. É o padrão
mais subutilizado no LUMINA hoje.

| Classe | Comportamento |
|---|---|
| compact / medium | Empilhado. A lista **é** a página; escolher um item substitui a lista pelo detalhe, com voltar canônico na app bar. Nunca os dois ao mesmo tempo. |
| expanded + | Lado a lado. Painel de lista com largura fixa (≈360px), painel de detalhe flexível. Divisor `--lm-color-divider` entre eles. A lista mantém a seleção visível com `--lm-table-row-selected-bg`. |
| large / xlarge | Igual, com o painel de detalhe absorvendo toda a largura extra. |

Regras invariantes: a lista rola independentemente do detalhe; a seleção sobrevive à rolagem
da lista; entrar no detalhe move o foco para o cabeçalho do detalhe; sair devolve o foco ao
item da lista de onde se veio.

**Páginas LUMINA.** Emails (lista de mensagens → corpo — hoje é uma lista de cards com o
conteúdo dentro do card, o que impede comparar), Documentos (lista de autorizações →
pré-visualização), Conflitos (lista de conflitos → comparação das duas reservas). Conflitos
hoje abre o detalhe em modal, com uma grade de comparação `1fr auto 1fr`; essa grade é
exatamente o conteúdo do painel de detalhe, e trocar o modal pelo painel devolve ao usuário a
capacidade de olhar o próximo conflito da lista sem fechar o atual.

### 4.3 Supporting pane (painel de apoio)

**Quando usar.** O conteúdo principal continua sendo o assunto, e um conteúdo secundário o
apoia sem substituí-lo. Distingue-se do list-detail porque o painel **não depende de uma
seleção na página** — ele é global.

| Classe | Comportamento |
|---|---|
| compact | Folha modal de largura total, ancorada ao fundo, rolagem interna, fecha com `Esc` e com botão explícito. |
| medium | Drawer modal sobre o conteúdo, com véu, camada `--lm-z-drawer`. |
| expanded | Drawer sobre o conteúdo, invocável, sem empurrar o canvas — não há largura sobrando. |
| large / xlarge | Painel ancorado à direita (≈360px), permanente enquanto aberto, **empurrando** o canvas. Estado persistido por página. |

**Páginas LUMINA.** Notificações e Sugestões IA em qualquer página; Sugestões IA sobre
Calendário e Estatísticas é o caso que justifica o padrão. Só um painel de apoio aberto por
vez — abrir Notificações fecha Sugestões IA.

### 4.4 Feed

**Quando usar.** Coleção heterogênea de cards que se varre em busca do que importa, sem
comparação coluna a coluna.

| Classe | Colunas | Largura mínima do card |
|---|---|---|
| compact | 1 | — |
| medium | 2 | 280px |
| expanded | 2 | 280px |
| large | 3 | 280px |
| xlarge | 4 | 280px |

A contagem de colunas é declarada por classe de janela, não deduzida por `auto-fit`. `auto-fit`
com `minmax` produz um número de colunas que ninguém previu e que muda no meio de um arrasto
de janela; o código atual tem seis variações de `minmax` diferentes (140px em
`Notifications.css`, 200px e 250px em `Documents.css`, 250px e 320px em `Emails.css`, 300px em
`Settings.css`), e o resultado é que duas páginas com o mesmo card mostram números diferentes
de colunas na mesma janela.

**Páginas LUMINA.** Notificações (hoje `bento-grid` com `repeat(4, 1fr)` fixo, que só quebra em
1024px e 640px — valores fora da escala), a área de automações de Emails.

### 4.5 Dashboard

**Quando usar.** Métricas de posição fixa mais gráficos, lidos de relance. A **ordem importa**:
a métrica mais importante ocupa a primeira posição em todas as classes de janela.

| Classe | Linha de métricas | Gráficos |
|---|---|---|
| compact | 1 coluna | 1 coluna, altura mínima 240px |
| medium | 2 colunas | 1 coluna |
| expanded | 2 colunas | 1 coluna |
| large | 4 colunas | 2 colunas |
| xlarge | 4 colunas | 2 colunas |

Regras: nenhum gráfico abaixo de 240px de altura útil — abaixo disso ele deixa de ser leitura e
o certo é substituí-lo pelo número em `--lm-type-display-sm-*`. O reflow nunca pode tirar a
métrica primária da primeira posição. A grade de métricas não usa `auto-fit`: 4 → 2 → 1, sem
o degrau de 3, porque 3 colunas quebram o pareamento visual dos quatro valores.

**Páginas LUMINA.** Dashboard e Estatísticas. `Statistics.css` hoje usa
`minmax(500px, 1fr)` nos gráficos, o que em 1024px de canvas produz uma coluna só — o
comportamento certo, pelo valor errado; em 1200px produz duas colunas de 500px com o resto
distribuído, o que muda a proporção do gráfico sem que ninguém tenha decidido isso.

### 4.6 Focus mode (modo foco)

**Quando usar.** Um único objeto merece a janela inteira e o cromo compete com ele. É o padrão
mais raro e o mais fácil de abusar.

| Classe | Comportamento |
|---|---|
| compact / medium | Navegação some por completo. App bar reduzida a título e fechar. |
| expanded + | Rail recolhe para o estado de ícones e não pode ser expandido. Painéis de apoio fecham. App bar mantém só o título, o fechar e as ações do próprio objeto. |

A saída é **sempre** explícita e dupla: `Esc` e um botão de fechar visível. Modo foco nunca é
o estado inicial de uma página — sempre se entra nele a partir de algo.

**Páginas LUMINA.** Template de Condomínio (é a réplica fiel de um PDF; cromo ao redor faz o
usuário duvidar de que está vendo o documento real), a visão de mês ampliada do Calendário, e
a pré-visualização de impressão de uma autorização em Documentos.

### 4.7 Mapa das 10 páginas

| Página | Padrão | No rail? | Observação |
|---|---|---|---|
| Dashboard | Dashboard | Sim (1) | Métricas 4→2→1, gráficos 2→1 |
| Calendário | Single pane + focus mode | Sim (2) | Grade de 7 colunas rola no eixo X dentro do próprio contêiner |
| Conflitos | List-detail | Sim (3) | Badge de contagem; substitui o modal atual pelo painel de detalhe |
| Emails | List-detail | Sim (4) | Lista → corpo da mensagem |
| Documentos | List-detail | Sim (5) | Lista → pré-visualização; Template é subdestino |
| Estatísticas | Dashboard | Sim (6) | Sai da barra inferior em compact |
| Notificações | Supporting pane | Não | Ancorado à direita; folha modal em compact |
| Sugestões IA | Supporting pane | Não | Invocável de qualquer página |
| Template de Condomínio | Focus mode | Não | Subdestino de Documentos |
| Configurações | Single pane | Rodapé | Zona de conta, abaixo do divisor |

---

## 5. Densidade

### 5.1 Os três níveis

Já declarados em `primitives.css`, comutáveis por `[data-density]`:

| Nível | `--lm-density-control` | `--lm-density-row` | `--lm-density-gap` | Quando se aplica |
|---|---|---|---|---|
| `comfortable` | 48px | 64px | 16px | Forçado em `(pointer: coarse)`. Escolha explícita do usuário. |
| `default` | 40px | 52px | 12px | Padrão de todo o produto. |
| `compact` | 32px | 40px | 8px | Opt-in **por região**: tabelas longas, lista de e-mails, grade do calendário. |

**Ficha — densidade é propriedade de região, não de aplicação**

| | |
|---|---|
| **Regra** | `[data-density="compact"]` se aplica ao contêiner de uma tabela ou lista, nunca ao `:root` — salvo quando o próprio usuário escolheu compacto em Configurações, que aí sim vale globalmente. |
| **Justificativa** | O ganho de compacto é ver mais linhas de uma vez; ele não existe em botões, formulários e estados vazios, onde compacto só entrega alvos menores e menos ar. Aplicar globalmente troca um ganho local por uma perda geral. |
| **Uso correto** | `<div className="lm-table-wrap" data-density="compact">` em volta da tabela de reservas de Estatísticas. |
| **Uso incorreto** | `document.documentElement.dataset.density = 'compact'` porque "a tabela ficou melhor assim". |
| **Token** | `--lm-density-control`, `--lm-density-row`, `--lm-density-gap`; consumidos por `--lm-button-height`, `--lm-icon-button-size`, `--lm-field-height` e `--lm-table-row-height`. |
| **Acessibilidade** | 32px de altura de controle continua acima do mínimo de 24×24 CSS da WCAG 2.2 AA (2.5.8), mas não sobra folga: qualquer redução adicional reprova. |
| **Responsivo** | `(pointer: coarse)` sobrescreve para confortável e **vence** o compacto de região — num 2-em-1, o dedo ganha da densidade. |

### 5.2 Restrições que valem mesmo em compacto

Compacto reduz espaço, não reduz garantias.

| Restrição | Valor | Motivo |
|---|---|---|
| Alvo de ponteiro | ≥ 24×24 CSS, incluindo a área de clique efetiva | WCAG 2.2 AA 2.5.8. Um ícone de 16px clicável sem área ampliada reprova mesmo dentro de uma linha de 40px. |
| Tamanho de texto de conteúdo | ≥ `--lm-type-body-md-size` (14px) | `--lm-type-body-sm-size` (12px) só para metadado; `--lm-type-label-sm-size` (11px) só para cabeçalho de tabela. Compacto nunca é desculpa para rebaixar o corpo. |
| Anel de foco | `--lm-focus-ring-width` (3px) + `--lm-focus-ring-offset` (2px) | O anel se estende 5px além da borda do controle. Com `--lm-density-gap` em 8px ele invade 2px do vizinho — tolerável porque só um elemento tem foco por vez, desde que o elemento focado receba `position: relative` para pintar por cima. É também a razão pela qual o gap não pode descer abaixo de 8px. |
| Altura do cabeçalho de tabela | `--lm-table-header-height` (48px), fixa | O cabeçalho não encolhe com a densidade: ele é a âncora de leitura de uma tabela que ficou mais densa, e é ele que fica preso (`--lm-z-sticky`) durante a rolagem. |
| Item de navegação | `--lm-navigation-item-height` (56px), fixo | Navegação é isenta de densidade. Errar o destino custa mais que 16px de altura. |
| Fora do escopo de compacto | Ações primárias, confirmação destrutiva, estados vazios, onboarding, diálogos | São momentos de decisão ou de orientação; densidade neles economiza pixel e gasta atenção. |

---

## 6. Camadas (z-index)

### 6.1 A escala semântica

Nove camadas, declaradas em `primitives.css`, espaçadas de 100 para caber ordenação interna
dentro de uma camada sem inventar valores novos.

| Token | Valor | Propósito | Ocupantes no LUMINA |
|---|---|---|---|
| `--lm-z-base` | 0 | Conteúdo em fluxo | Canvas, cards, tabelas, gráficos |
| `--lm-z-sticky` | 100 | Preso ao viewport, mas ainda parte do conteúdo | App bar, rail, barra inferior, cabeçalho de tabela preso, barra de ações em lote |
| `--lm-z-dropdown` | 200 | Lista invocada por um controle e ancorada a ele | Select, autocomplete, seletor de mês do Calendário, filtro de Documentos |
| `--lm-z-popover` | 300 | Conteúdo flutuante ancorado, possivelmente com foco | Menu de conta do rail, menu de ações de linha, seletor de data, tooltip |
| `--lm-z-overlay` | 400 | Véu que bloqueia o que está abaixo | Scrim de drawer e de diálogo, em `--lm-color-scrim` |
| `--lm-z-drawer` | 500 | Painel que desliza sobre o conteúdo | Drawer de navegação em medium, painéis de Notificações e Sugestões IA quando sobrepostos, folha inferior em compact |
| `--lm-z-modal` | 600 | Diálogo que exige uma decisão antes de continuar | EventModal, confirmação de exclusão de documento, modal de resolução de conflito |
| `--lm-z-toast` | 700 | Feedback transitório, que precisa aparecer inclusive sobre um modal | Snackbar de "Autorização gerada", "Desfazer", erro de sincronização |
| `--lm-z-critical` | 800 | O que não pode ser encoberto por nada | Falha de conexão com o backend local, atualização baixada e pronta para instalar, tela do `ErrorBoundary` |

O véu vive numa camada **abaixo** do que ele acompanha, não junto: scrim em
`--lm-z-overlay` (400), drawer em 500, diálogo em 600. Assim um mesmo véu serve aos dois sem
duplicação e sem que a ordem dependa de qual foi montado primeiro.

### 6.2 Proibições

| Proibido | Por quê |
|---|---|
| `z-index` com literal numérico | Todo `z-index: 10`, `z-index: 999`, `z-index: 9999` é a declaração de que o autor não sabia contra o que estava competindo. Se não há token para o caso, o caso está errado. |
| `calc(var(--lm-z-modal) + 1)` | Duas coisas na mesma camada se ordenam pela **ordem no DOM**, não por incremento. O `+1` de hoje vira o `+2` de amanhã. |
| Camada nova sem passar pela governança | A escala é fechada nesta versão. Nova camada é mudança de token, com o processo de [`08-governanca.md`](08-governanca.md). |
| Criar contexto de empilhamento sem necessidade | `transform`, `filter`, `opacity < 1`, `will-change`, `isolation` e `contain` criam contexto novo, e um filho **nunca escapa** dele por maior que seja seu `z-index`. É a causa número um de "o z-index não funciona". |
| Renderizar sobreposição dentro do conteúdo | Diálogo, drawer, menu, tooltip e toast renderizam em nó irmão do `#root`, via portal. Dentro do conteúdo, qualquer `overflow: hidden` de card corta o menu, e a rolagem do canvas leva o popover junto. |

Dois exemplos concretos do código atual, que existem justamente porque não havia escala:
`App.css` declara `.main-content { overflow-y: auto }` — um popover posicionado dentro dessa
região rola junto com o conteúdo em vez de ficar ancorado ao seu controle. E `global.css`
aplica `animation: fadeInUp` a `.dashboard-container`, `.conflicts-page`, `.statistics-page`,
`.documents-page`, `.emails-page`, `.settings-page`, `.calendar-page` e `.notifications-page`;
como a animação usa `transform`, ela cria um contexto de empilhamento **e** um bloco contêiner
para descendentes `position: fixed` enquanto roda — qualquer diálogo montado durante a entrada
da página se ancora à página, não à janela.

### 6.3 Camadas são relativas ao contexto

Um tooltip sobre um botão dentro de um diálogo não precisa de `--lm-z-toast` para aparecer: ele
é renderizado dentro do contexto de empilhamento do diálogo, e `--lm-z-popover` já o coloca
acima de todo o conteúdo **do diálogo**. Só o que atravessa contextos — o que vai para o
portal na raiz — usa a camada em sentido absoluto. Escalar a camada para "garantir" é o que
produz a corrida de `z-index` que a escala existe para evitar.

---

## 7. Zoom de 200% e janelas estreitas

### 7.1 O que a norma exige

| Critério WCAG 2.2 | Exigência | Como isso aparece no LUMINA |
|---|---|---|
| 1.4.4 Resize Text (AA) | Texto até 200% sem perda de conteúdo ou de função | Ctrl+`+` até o dobro; nenhum rótulo truncado, nenhum botão inalcançável |
| 1.4.10 Reflow (AA) | Conteúdo em 320px CSS de largura sem rolagem em dois eixos | Classe compact tem que funcionar de verdade, não só não quebrar |
| 1.4.12 Text Spacing (AA) | Suportar entrelinha 1,5×, parágrafo 2×, `letter-spacing` 0,12em, `word-spacing` 0,16em | Nenhum contêiner de texto com altura fixa |

### 7.2 O que precisa continuar funcionando

| Requisito | Regra |
|---|---|
| **Nada é cortado** | Contêiner de texto usa `min-height`, nunca `height`. `overflow: hidden` é proibido em qualquer elemento que contenha texto que possa crescer. |
| **A página não rola no eixo X** | O `body` nunca rola horizontalmente. Conteúdo genuinamente bidimensional — grade mensal do Calendário, tabela larga de Estatísticas, gráfico do `recharts` — rola dentro do próprio contêiner com `overflow-x: auto`, com o cabeçalho preso em `--lm-z-sticky`. Essa é a exceção que a 1.4.10 permite, e ela vale para a grade, não para a página. |
| **Rótulo não trunca** | Truncar é permitido em uma linha de metadado (nome de arquivo, assunto de e-mail na lista). É proibido em rótulo de botão, de campo, de aba e de item de navegação. Rótulo que não cabe é sintoma de layout errado, não de rótulo comprido. |
| **Controles crescem junto** | `--lm-density-control` (40px) vira 80px físicos a 200%; isso é correto e desejado. O que não pode é o texto dentro do controle ter `line-height` em px fixo que não acompanhe. |
| **Diálogo cabe** | `--lm-dialog-max-width` (560px) mais margem. Abaixo de 600px CSS o diálogo vira folha de largura total ancorada ao fundo, com rolagem interna e as ações fixas no rodapé — a ação primária nunca sai da viewport. |
| **Foco permanece alcançável** | O navegador precisa conseguir rolar o elemento focado para dentro da viewport. Nenhum ancestral com `overflow: hidden` no caminho de um elemento focável. |
| **A navegação segue a largura CSS** | O rail de 88px continua sendo 88px CSS a 200% de zoom; quem resolve é a classe de janela. Abaixo de 840px CSS o rail deixa de existir e vira drawer; abaixo de 600px, barra inferior. Não existe regra de zoom separada — o zoom entra pela mesma porta que o redimensionamento. |
| **Mínimo declarado** | A janela do Electron declara largura e altura mínimas compatíveis com 320×256 CSS na maior escala suportada. Abaixo disso o comportamento é indefinido e não é testado. |
| **Movimento** | Sob `prefers-reduced-motion: reduce`, transições de layout vão a `--lm-duration-instant`. Reflow com animação em 200% de zoom é desconforto real, não polimento. |

### 7.3 Como testar

Três verificações, nesta ordem, em toda página:

1. **Zoom 200% em janela de 1280px.** Resultado esperado: 640px CSS, classe medium, drawer,
   duas colunas, zero rolagem horizontal de página.
2. **Zoom 200% em janela de 1024px.** Resultado esperado: 512px CSS, classe compact, barra
   inferior de cinco itens, uma coluna, painéis de apoio como folha modal.
3. **Janela arrastada de 1920px até o mínimo, devagar.** Resultado esperado: quatro transições
   visíveis (1600, 1200, 840, 600), nenhuma outra. Qualquer reflow em outro ponto é um
   breakpoint fora da escala escondido no CSS.

A matriz completa de testes está em [`03-acessibilidade.md`](03-acessibilidade.md).

---

## Lacunas
> **Registro autoritativo:** [`LACUNAS.md`](LACUNAS.md). A lista abaixo reflete o estado
> do dia em que este documento foi escrito e não é atualizada quando uma lacuna fecha —
> várias destas já foram fechadas por extensão do gerador.


Regras deste documento que precisariam de um token que ainda não existe. Todas foram escritas
em prosa; nenhuma inventou nome de variável.

| # | Lacuna | Onde aparece |
|---|---|---|
| 1 | **Grid** — não há token para número de colunas, margem e gutter por classe de janela. A tabela de §1.2 compõe os valores a partir de `--lm-space-*`, mas a relação "classe de janela → margem" existe só na prosa e no CSS de cada arquivo. | §1.2 |
| 2 | **Teto do canvas (1600px) e medida do texto (68ch)** não têm token. São os dois números mais repetidos do sistema e hoje seriam literais. | §1.3 |
| 3 | **Breakpoints não são emitidos como custom property.** Os valores estão em `tokens.json` (`primitive.breakpoint`) mas não em `primitives.css`. O prelúdio de `@media` não aceitaria `var()` de qualquer forma, então os literais permanecem obrigatórios; a lacuna real é para container queries nomeadas e para leitura dos limites em JS. | §2.1, §2.3 |
| 4 | **Altura da barra de navegação inferior** (compact) não tem token; §3.3 a compõe de `--lm-navigation-item-height` mais `--lm-space-8`. | §3.3 |
| 5 | **Larguras de painel** — o painel de lista do list-detail (≈360px) e o painel de apoio ancorado (≈360px) não têm token. Existe `--lm-navigation-drawer-width` para o drawer de navegação, mas ele é de navegação, não de conteúdo. | §4.2, §4.3 |
| 6 | **Opacidade de véu genérica** — só existe `--lm-dialog-scrim-opacity`, de escopo de diálogo. Drawer de navegação, painel de apoio modal e folha inferior reutilizam o valor por falta de token próprio. | §3.5, §4.3, §6.1 |
| 7 | **Peso do rótulo de navegação selecionado** — a seleção precisa de um peso acima de 500, e a escala tipográfica expõe peso apenas acoplado a um papel (`--lm-type-label-lg-weight` e `--lm-type-label-md-weight` são ambos 500). Não há token de peso isolado. | §3.4 |
| 8 | **Zonas seguras** — nenhum token para o inset de segurança da borda da janela nem para a altura mínima da faixa de arrasto do Electron. §1.4 usa `--lm-space-8` e `--lm-space-24` por composição. | §1.4 |
| 9 | **Altura mínima de gráfico (240px)** não tem token, embora seja uma regra de layout e não uma escolha de página. | §4.5 |
