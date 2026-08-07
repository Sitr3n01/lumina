# 07 · Implementação

**LUMINA Design System v1.0.0**

Este documento é a ponte entre a especificação e o código. Ele responde a cinco perguntas
operacionais: onde cada arquivo mora, em que ordem o CSS vence, como o tema troca, como um
componente React consome token, e como as ~40 variáveis legadas que o produto usa hoje passam a
apontar para o sistema sem que nenhum dos seus consumidores seja tocado.

Nada aqui descreve código existente. **Nenhum componente do sistema foi escrito.** O que segue
é o alvo — o contrato que a Fase 4 do [`PLANO_REFATORACAO.md`](PLANO_REFATORACAO.md) implementa
e contra o qual ela é revisada. Onde o texto descreve o estado atual do produto, ele diz
explicitamente "hoje" e cita arquivo e linha.

**Alvo de runtime.** Electron 28/29 (`package.json`, `"electron": "^28.3.3"`), portanto
Chromium 120+. `color-mix()`, `@layer`, `:focus-visible`, `:where()`, `:is()` e propriedades
lógicas têm suporte pleno. **Nenhum fallback é escrito para eles** — escrever fallback para um
recurso com suporte garantido é dívida sem credor.

---

## Índice

| Seção | Conteúdo |
|---|---|
| [1](#1-estrutura-de-arquivos) | Estrutura de arquivos — o que é gerado, o que é escrito |
| [2](#2-cascade-layers) | Cascade layers — a ordem canônica e os três bugs que ela mata |
| [3](#3-temas) | Temas — guard, `color-scheme`, persistência sem flash |
| [4](#4-consumo-dos-tokens) | Consumo dos tokens e o mecanismo da camada de estado |
| [5](#5-api-de-componentes-react) | API de componentes React |
| [6](#6-a-ponte-de-variáveis-legadas) | A ponte de variáveis legadas |
| [7](#7-fontes-auto-hospedadas) | Fontes auto-hospedadas |
| [8](#8-gráficos-com-recharts) | Gráficos com Recharts |
| [9](#9-testes-visuais-e-de-comportamento) | Testes visuais e de comportamento |
| [Lacunas](#lacunas) | O que este documento não pôde fechar |

---

## 1. Estrutura de arquivos

### 1.1 A árvore alvo de `frontend/src/styles/`

> **Estado: migração concluída.** `bridge.css` e `global.css` foram **apagados**, e com eles as
> camadas `lm.bridge` e `lm.legacy`. As 53 classes do legado ficaram sem consumidor; a ponte só
> era consumida pelo próprio legado. O último a segurar os dois era `ErrorBoundary`, hoje escrito
> com `EmptyState` e `Button`. O que este documento diz sobre os dois arquivos continua valendo
> como **registro do porquê** — as armadilhas descritas voltam se alguém reintroduzir CSS antigo.

```
frontend/src/styles/
├── layers.css              ESCRITO  · uma linha: a ordem canônica das camadas
├── fonts.css               ESCRITO  · @font-face da Inter, fora de qualquer camada
├── reset.css               ESCRITO  · @layer lm.reset
├── base.css                ESCRITO  · @layer lm.base
├── layout.css              ESCRITO  · @layer lm.layout — shell, grid, regiões
├── utilities.css           ESCRITO  · @layer lm.utilities — conjunto fechado
└── tokens/
    ├── primitives.css      GERADO   · @layer lm.tokens
    ├── semantic.css        GERADO   · @layer lm.tokens
    ├── components.css      GERADO   · @layer lm.tokens
    ├── breakpoints.js      GERADO   · BREAKPOINTS, MEDIA, windowClass()
    └── tokens.json         GERADO   · fonte de verdade legível por máquina
```

### 1.2 A árvore alvo de `frontend/src/components/ui/`

Um diretório por componente. O CSS do componente mora ao lado do componente, nunca numa folha
central — a folha central é como se chega a `global.css` com 769 linhas.

```
frontend/src/components/ui/
├── index.js                barrel: re-exporta os primitivos públicos
├── Button/
│   ├── Button.jsx
│   └── Button.css          @layer lm.components
├── IconButton/
├── TextField/
├── Textarea/
├── Select/
├── Checkbox/
├── Radio/
├── Switch/
├── Card/
├── Dialog/
├── Menu/
├── Chip/
├── Badge/
├── Tooltip/
├── Snackbar/               inclui o provider de fila
├── EmptyState/
├── Skeleton/
├── Spinner/
├── Tabs/
└── DataTable/
```

Em paralelo, e fora de `ui/` porque não são primitivos:

```
frontend/src/components/charts/
├── useChartTheme.js        lê --lm-chart-* e --lm-color-chart-* do CSS computado (§8)
└── chartSlots.js           mapa entidade → slot fixo (§8.4)
```

A ordem de construção é a da Fase 4 do plano: `Button` primeiro porque todo o resto o usa;
`DataTable` por último porque ele consome quase todos os outros.

### 1.3 Gerado × escrito à mão

| Caminho | Origem | Regra |
|---|---|---|
| `styles/tokens/*` — **todos os cinco arquivos**, inclusive `breakpoints.js` | `scripts/design/generate_tokens.py` | **Editar é sempre errado.** A próxima execução do gerador sobrescreve o arquivo inteiro |
| Todo o resto | Mão humana | Nenhuma linha pode ser reescrita por gerador |

`breakpoints.js` é gerado apesar de ser JavaScript, e isso é deliberado: o prelúdio de uma
`@media` não consome `var()`, então os limites precisam existir como literais em dois lugares —
no CSS e no JS. Duas fontes divergem. Uma fonte que emite as duas, não.

```js
// frontend/src/styles/tokens/breakpoints.js — GERADO
export const BREAKPOINTS = Object.freeze({ compact: 0, medium: 600, expanded: 840, large: 1200, xlarge: 1600 });
export const MEDIA = Object.freeze({ compact: 'all', medium: '(min-width: 600px)', /* … */ });
export function windowClass(width) { /* … */ }
```

Todo consumo JS de breakpoint importa daqui. Um `window.innerWidth > 768` escrito à mão é o
mesmo defeito que um `#137fec` escrito à mão: um valor fora do sistema, que o sistema não
consegue auditar nem mudar.

**Como reconhecer um arquivo gerado.** Os cinco começam com o mesmo cabeçalho:

```css
/* =============================================================
   LUMINA Design System — Tokens primitivos
   ARQUIVO GERADO por scripts/design/generate_tokens.py
   Não edite à mão. Altere as sementes no gerador e rode-o novamente.
   ============================================================= */
```

**O que fazer quando a vontade de editar aparece.** Ela sempre aparece na forma "só preciso de
um tom um pouco mais claro aqui". A resposta é `08-governanca.md` §3.2: mudar a semente, o papel
semântico ou o token de componente **no gerador**, rodar, e deixar o `--check` dizer se o
contraste sobreviveu. Editar o `.css` produz um valor que passa no olho e some no próximo
`python scripts/design/generate_tokens.py`.

### 1.4 A ordem de import

`main.jsx` importa CSS numa ordem que **não** decide quem vence — quem decide é `@layer` — mas
que ainda importa por dois motivos: `layers.css` precisa ser avaliado antes de qualquer regra
em camada nomeada, e `@font-face` precisa existir antes de a primeira folha pedir a família.

```jsx
// frontend/src/main.jsx — alvo
import './styles/layers.css';          // 1. a ordem, e nada mais
import './styles/fonts.css';           // 2. @font-face (sem camada — §7.3)
import './styles/tokens/primitives.css';
import './styles/tokens/semantic.css';
import './styles/tokens/components.css';
import './styles/bridge.css';          // 3. temporário (§6)
import './styles/reset.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/utilities.css';
import './styles/global.css';          // 4. legado, em lm.overrides
```

`layers.css` declara a ordem antes de qualquer camada ser usada. Uma camada mencionada pela
primeira vez fora dessa declaração é anexada **no fim** da lista — e uma camada anexada no fim
vence todas as anteriores. É exatamente assim que um `@layer lm.components` importado cedo
demais passa a perder para um `@layer lm.base` importado depois. A declaração única em
`layers.css` elimina a classe inteira de bug.

---

## 2. Cascade layers

### 2.1 A ordem canônica

Declarada **uma única vez**, em `frontend/src/styles/layers.css`, que é o primeiro import do
app e não contém mais nada:

```css
/* frontend/src/styles/layers.css — o arquivo inteiro */
@layer lm.reset, lm.tokens, lm.base, lm.layout, lm.components, lm.utilities, lm.overrides;
```

Sete camadas, ordem crescente de prioridade: `lm.overrides` vence todas, `lm.reset` perde para
todas.

#### `lm.legacy` e `lm.bridge` — encerradas

As duas nasceram com data de remoção e a data chegou: saíram da ordem junto com `global.css` e
`bridge.css`. A seção continua aqui porque o defeito que motivou `lm.legacy` é uma armadilha
geral do mecanismo de camadas, e volta a valer no dia em que qualquer CSS antigo reentrar no
projeto.

Acréscimo à ordem original, `lm.legacy` era o único lugar de `global.css`. Foi introduzida
depois de um defeito medido, não por gosto de arquitetura.

`global.css` estava em `lm.overrides` — a **última** camada, portanto acima de `lm.components`.
O efeito: `button { background: none }`, um seletor de elemento com especificidade (0,0,1),
derrubava `.lm-button { background-color: var(--_container) }`, com especificidade (0,1,0). Não
há empate a resolver — **ordem de camada é avaliada antes de especificidade**, e a camada
posterior ganha por definição. O botão primário renderizava transparente com rótulo branco.

A lição vale para qualquer sistema que conviva com CSS antigo: código legado precisa ficar
**abaixo** dos componentes novos, nunca acima. "Overrides" é um nome que convida ao erro.

**Contenção adicional.** Baixar a camada resolve as propriedades que o componente novo declara,
mas não as que ele deixa em branco: `td { background: rgba(22,32,42,0.85) }` continuava pintando
as células do `DataTable`, porque o componente não declarava fundo de célula. Um seletor de
elemento não precisa de especificidade para preencher um vazio.

Os quatro grupos de seletor de elemento de `global.css` (`button`, `input/select/textarea`,
`table/th/td`, `tr:hover td`) passam a ser escritos com `:where(:not([class*='lm-']))`. `:where()`
vale **zero** de especificidade, então as regras continuam valendo exatamente o que valiam para
o markup antigo — e param de alcançar o novo.

A camada e a contenção somem juntas, quando `global.css` sumir.

**A regra que sustenta tudo.** Estilo **sem camada vence qualquer camada**. Isso não é intuitivo
e é a armadilha mais cara do mecanismo: uma folha esquecida fora de `@layer` derrota o sistema
inteiro sem erro nenhum. Portanto: **toda regra de estilo do frontend mora dentro de uma
camada.** As duas exceções legítimas são `@font-face` (§7.3), que não é regra de estilo e não
participa da cascata, e o bloco `prefers-reduced-motion` de `01-fundamentos.md` §9.4, que usa
`!important` justamente para vencer inclusive estilo inline.

### 2.2 O que entra em cada camada

| Camada | Conteúdo | Seletores permitidos | Arquivo |
|---|---|---|---|
| `lm.reset` | Normalização do agente de usuário: `box-sizing`, zeragem de margem, herança de fonte em controles de formulário, `text-size-adjust`, `img`/`svg` como `block`. **Nunca `outline: none`** | Elemento e universal | `reset.css` |
| `lm.tokens` | **Só** os três `.css` gerados. Nada mais, nunca | `:root`, `[data-density]`, `[data-theme]` | `tokens/*.css` |
| ~~`lm.bridge`~~ | Remapeava as variáveis legadas (§6). **Removida** — nasceu com data de remoção e a data chegou | — | — |
| `lm.base` | Padrão de elemento **usando token**: `html`/`body`, tipografia base, links, `::selection`, barra de rolagem, o anel de foco de `03-acessibilidade.md` §3.3, o bloco `prefers-reduced-motion` | Elemento, envolto em `:where()` | `base.css` |
| `lm.layout` | Estrutura sem decoração: shell da aplicação, grid, regiões de navegação, contêineres de página, `--lm-form-column-max-width` | Classe `.lm-*` | `layout.css` |
| `lm.components` | Um bloco por componente de `components/ui/`. Anatomia, variantes, estados | Classe `.lm-*` e `[data-*]` do próprio componente. **Nunca seletor de elemento** | `ui/*/**.css` |
| `lm.utilities` | Conjunto **fechado** de auxiliares de propósito único: `.lm-visually-hidden`, `.lm-truncate`, `.lm-stack`. Crescer essa lista é sintoma, não solução | Classe `.lm-*` | `utilities.css` |
| `lm.overrides` | Escape com prazo. Hoje: só folhas de página que precisam vencer os componentes (`CondoTemplate.css` e afins). Nada de legado entra aqui | Qualquer | `pages/*.css` |

**Por que `lm.tokens` vem depois de `lm.reset`.** Não por precedência — custom property em
`:root` não disputa com reset — mas porque a leitura do arquivo deve espelhar a ordem de
existência: o reset normaliza a página, os tokens a definem, a ponte a traduz, a base a aplica.

**Por que `lm.bridge` vem depois de `lm.tokens`.** A ponte só declara nomes legados
(`--primary`, `--glass-2`), que não colidem com nenhum `--lm-*`. A posição garante que, se um
nome legado sobreviver dentro de `global.css` durante a migração, é a ponte que vence — e a
ponte é a versão certa.

**Por que `lm.utilities` vence `lm.components`.** Um utilitário existe para fazer uma coisa
sempre. `.lm-visually-hidden` que perde para o CSS do componente não esconde nada, e o defeito é
invisível até alguém usar leitor de tela. A contrapartida é disciplina: a lista de utilitários é
fechada e pequena.

### 2.3 Os três problemas reais que a ordem resolve

Não são hipóteses. Os três estão no código hoje.

#### Problema 1 — `!important` de escape em `global.css:476`

```css
/* global.css:442 */              /* global.css:475 */
.form-field {                     .checkbox-field {
  display: flex;                    flex-direction: row !important;
  flex-direction: column;           align-items: center;
  gap: 0;                         }
}
```

O `!important` existe porque `.form-field` e `.checkbox-field` são declarados em **quatro** e
**três** arquivos respectivamente, todos com a mesma especificidade (0,1,0), aplicados ao mesmo
elemento (`<div className="form-field checkbox-field">`, `Emails.jsx:279`, `Settings.jsx:565`,
`579`, `697`, `711`):

| Classe | Declarada em |
|---|---|
| `.form-field` | `global.css:442`, `Documents.css:185`, `Emails.css:42`, `Settings.css:55` |
| `.checkbox-field` | `global.css:475`, `Emails.css:54`, `Settings.css:67` |

E `Emails.css:54` e `Settings.css:67` declaram exatamente o oposto do `global.css:476`:

```css
/* Settings.css:67 e Emails.css:54 — idênticos */
.checkbox-field { display: flex; flex-direction: column; gap: 8px; }
```

Com especificidade empatada, quem vence é a ordem no bundle, e a ordem no bundle é a ordem de
avaliação dos módulos. Em `main.jsx`, `import App from './App.jsx'` está na **linha acima** de
`import './styles/global.css'` — trocar essas duas linhas de lugar inverte a resolução de sete
declarações duplicadas, em quatro arquivos, sem erro, sem aviso e sem diff no componente. O
`!important` é o preço pago para não depender disso, e o preço é alto: `!important` não tem
gradação, então o próximo conflito precisa de outro `!important`, e a partir daí o vencedor é
quem gritou mais alto por último.

**Com camadas:** `Checkbox` é um componente em `lm.components`, dono do próprio arranjo
horizontal. `.form-field` vira `--lm-form-row-gap` em `lm.layout`. `lm.components` vence
`lm.layout` **por camada**, independentemente de especificidade e de ordem de import. As três
declarações duplicadas de `.checkbox-field` desaparecem junto com o `!important`, porque não há
mais nada para elas contradizerem.

#### Problema 2 — estilo de elemento sem escopo

`global.css` estiliza elementos cruamente:

| Linha | Seletor | Alcance real |
|---|---|---|
| 140 | `button` | Todo botão da aplicação, inclusive os que ainda serão escritos |
| 257 | `input, select, textarea` | Todo campo, inclusive `type="checkbox"` e `type="radio"` |
| 713–745 | `table`, `th`, `td`, `td:first-child`, `td:last-child`, `tr:hover td` | Toda tabela, com fundo, raio e borda embutidos |

O alcance de `input, select, textarea { width: 100% }` inclui a caixa de seleção — e o remendo
está três centenas de linhas abaixo, em `global.css:494`, devolvendo `width: 18px; height: 18px;
padding: 0` para `.checkbox-label input[type="checkbox"]`. É a assinatura do problema: uma regra
ampla demais e um remendo estreito para cada lugar onde ela errou.

Especificidade não resolve isso. `input` tem especificidade 0,0,1; qualquer classe a vence — mas
só quando a classe existe **e** vem depois. Um componente `TextField` novo que não redeclare
`background` herda `var(--glass-1)` de `global.css:259` sem que ninguém perceba, porque o
componente não está errado: ele apenas não disse nada.

**Com camadas:** todo seletor de elemento mora em `lm.base`, envolto em `:where()` para
especificidade zero:

```css
@layer lm.base {
  :where(input, select, textarea) {
    font: inherit;
    color: var(--lm-color-on-surface);
  }
}
```

Qualquer regra em `lm.components` vence, mesmo com especificidade menor, mesmo importada antes.
O componente passa a poder assumir que herda só o que pediu.

#### Problema 3 — vitória dependente da ordem de import

Hoje o CSS é emitido na ordem de avaliação dos módulos: `main.jsx` → `App.jsx` → cada página →
o `.css` de cada página → e só então `global.css`. Essa ordem é uma consequência acidental da
ordem das linhas de `import` em treze arquivos `.jsx`. Ela muda quando alguém reordena imports,
quando um lint autofix os alfabetiza, quando uma página passa a ser carregada por `lazy()`, ou
quando o Vite muda a estratégia de chunk.

Nenhuma dessas mudanças aparece num diff de estilo. Todas mudam qual regra vence.

**Com camadas:** a ordem de vitória é declarada uma vez em `layers.css` e é imune a tudo isso.
Uma folha pode ser importada em qualquer ponto do grafo de módulos e continua na camada onde foi
escrita. Esse é o ganho principal — não a organização, e sim a **determinismo**.

### 2.4 O que a camada não resolve

Honestidade, para não criar expectativa falsa:

- **Estilo inline (`style={{}}`) vence qualquer camada.** O frontend tem `style={{}}` de cor em
  oito arquivos `.jsx` (§6.5). Camada não os alcança; migração alcança.
- **`!important` dentro de uma camada** inverte a ordem das camadas para aquela declaração. Por
  isso o único `!important` permitido no sistema é o de `prefers-reduced-motion`, que precisa
  vencer tudo por definição.
- **Especificidade continua valendo dentro de cada camada.** Camada desempata entre camadas, não
  dentro. Dentro de `lm.components` a disciplina de seletor raso continua sendo obrigação.

---

## 3. Temas

### 3.1 A implementação completa

Três blocos, todos emitidos por `generate_tokens.py` em `semantic.css`, todos dentro de
`@layer lm.tokens`:

```css
@layer lm.tokens {
  /* 1. Tema claro — padrão do produto. */
  :root {
    color-scheme: light;
    --lm-color-primary: #005eb2;
    --lm-color-surface: #f7f9fd;
    --lm-color-on-surface: #1a1c1f;
    /* …57 papéis + elevação + paleta de gráficos… */
  }

  /* 2. Preferência do sistema. O :not() permite que um tema claro
     escolhido manualmente vença o escuro do SO. */
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      color-scheme: dark;
      --lm-color-primary: #b1c5ff;
      --lm-color-surface: #111317;
      --lm-color-on-surface: #e0e3e7;
      /* …idem… */
    }
  }

  /* 3. Escolha explícita do usuário — vence nos dois sentidos. */
  :root[data-theme="dark"] {
    color-scheme: dark;
    /* …idem ao bloco 2… */
  }
}
```

Três estados possíveis do atributo, e o que cada um produz:

| `data-theme` no `<html>` | SO em claro | SO em escuro |
|---|---|---|
| ausente (`system`) | claro | escuro |
| `"light"` | claro | **claro** |
| `"dark"` | **escuro** | escuro |

### 3.2 Por que o guard existe, e por que a escolha manual precisa vencer nos dois sentidos

A escolha manual precisa vencer **nos dois sentidos** porque as duas direções são pedidos
igualmente legítimos: quem roda o Windows em escuro e prefere o LUMINA claro (superfícies claras
lêem melhor em texto denso de tabela) e quem roda o Windows em claro e prefere o LUMINA escuro
(sessão longa noturna). Um seletor de tema que só sabe escurecer é meio seletor.

As duas direções são resolvidas por mecanismos diferentes:

**Manual escuro sobre sistema claro** — trivial. O bloco 3 não está dentro de nenhuma `@media`;
quando o SO está claro, o bloco 2 nem é avaliado, e o bloco 3 sobrescreve o bloco 1 por vir
depois na folha.

**Manual claro sobre sistema escuro** — só funciona por causa do guard. Sem ele, o bloco 2 é
`:root { … }` dentro da media query, empatado em especificidade com o bloco 1 e vindo depois:
ele venceria, e `data-theme="light"` não teria efeito nenhum. O `:not([data-theme="light"])`
**desliga o bloco 2** quando a escolha manual é clara, deixando o bloco 1 valer. Não é um
desempate — é uma exclusão.

**Por que `:where()` em volta do `:not()`.** `:where()` zera a especificidade do que contém.
Sem ele o seletor seria `:root:not([data-theme="light"])`, especificidade (0,1,1) — a mesma de
`:root[data-theme="dark"]`. Empate de especificidade resolvido por ordem de fonte funciona hoje
(o bloco 3 vem depois), mas passa a depender da ordem em que o gerador emite os blocos: uma
troca de ordem no `emit_semantic()` inverteria o comportamento silenciosamente. Com `:where()`,
o bloco 2 fica em (0,0,1) — a mesma do `:root` puro — e o bloco 3, em (0,1,1), vence por
especificidade real. A garantia deixa de depender de ordem.

### 3.3 `color-scheme`

`color-scheme` não é decoração. É o que informa ao Chromium que ele deve pintar em escuro tudo
que **não** é DOM estilizável:

| Superfície | Quem pinta | O que acontece sem `color-scheme` |
|---|---|---|
| Popup do `<select>` nativo | Chromium | Lista branca sobre app escuro |
| Barras de rolagem padrão | Chromium | Trilho claro |
| Fundo do canvas antes da primeira pintura | Chromium | Flash branco |
| `input[type="date"]`, `[type="number"]` (spinners, calendário) | Chromium | Controles claros |
| Realce de autofill | Chromium | Amarelo claro |

Isso importa muito no LUMINA porque o produto usa `<select>` **nativo**: o seletor de período de
`Statistics.jsx:170-178` (`className="period-selector"`) e os selects de Configurações. O popup
de um `<select>` nativo no Windows é desenhado pelo sistema; não há CSS que o alcance. O único
controle é `color-scheme`.

O código hoje já sabe disso, e resolve errado — `global.css:277-284`:

```css
/* Forçar tema escuro no dropdown nativo do Chromium/Electron */
select { color-scheme: dark; }
select option { background: var(--card-bg); color: var(--text-main); }
```

Isso trava o dropdown em escuro para sempre. No dia em que o tema claro existir, o app fica
claro e o dropdown continua escuro. E `select option { background }` é notoriamente ignorado no
Windows, porque a lista é desenhada pelo sistema — a declaração dá a impressão de resolver e não
resolve.

**A implementação:** `color-scheme` é emitido em `:root` pelos três blocos de `semantic.css`
(`light` no bloco 1, `dark` nos blocos 2 e 3). Ele **herda**, então todo `<select>` da aplicação
o recebe sem uma linha de CSS. As duas regras de `global.css:277-284` são deletadas na migração;
mantê-las é reintroduzir o bug que elas tentavam resolver.

### 3.4 Persistência lida antes da primeira pintura

Se o tema for aplicado por React, ele é aplicado **depois** do primeiro paint: o usuário com
escolha "escuro" e SO claro vê um flash branco de um a três frames a cada abertura. Num app que
abre todo dia, isso é uma piscada por dia.

A leitura vai num script **inline e síncrono** no `<head>` de `frontend/index.html`, antes do
`<script type="module">`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LUMINA - Gestão de Apartamento</title>
    <script>
      // Aplicado antes da primeira pintura. Sem isto, o tema escolhido
      // entra depois do primeiro paint e o usuário vê um flash.
      (function () {
        try {
          var t = localStorage.getItem('lumina_theme');
          if (t === 'light' || t === 'dark') {
            document.documentElement.setAttribute('data-theme', t);
          }
        } catch (e) {
          // localStorage indisponível: cai no tema do sistema. Aceitável.
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Quatro exigências, todas necessárias:

1. **Inline.** Um arquivo externo é uma requisição a mais antes do paint.
2. **Sem `type="module"`.** Módulo é adiado por definição (`defer` implícito) e roda depois do
   parse — tarde demais.
3. **Dentro de `try`.** `localStorage` lança em contextos restritos. A falha correta é cair no
   tema do sistema, não quebrar a aplicação antes de o React montar.
4. **Validado contra uma lista.** Só `light` e `dark` são escritos no atributo. Qualquer outro
   valor — inclusive `system`, inclusive lixo — resulta em ausência do atributo, que é
   exatamente o comportamento de `system`. O atributo nunca recebe conteúdo não validado do
   armazenamento.

**Chave.** `lumina_theme`, seguindo o prefixo já usado pelo produto (`lumina_token`,
`lumina_remember_login`, `lumina_last_username` em `AuthContext.jsx` e `Login.jsx`).

**Nota de CSP.** `electron/main.js` carrega o frontend por `loadFile` com
`contextIsolation: true` e hoje não declara Content-Security-Policy. Se uma CSP for adicionada,
esse script inline precisa de `'unsafe-inline'` ou, melhor, de um hash `'sha256-…'` na diretiva
`script-src`. Vale registrar junto do script para que o endurecimento futuro não o quebre em
silêncio — o sintoma seria o flash voltando, sem erro visível.

### 3.5 `data-theme` vai no `<html>`, nunca no `<body>`

O CSS gerado tem escopo em `:root`, que é o elemento `<html>`. `body[data-theme="dark"]` não
casa com `:root[data-theme="dark"]` e não redefine nada — o atributo fica lá, correto,
inofensivo e sem efeito, que é a pior categoria de bug.

Há um segundo motivo, independente: `color-scheme` só afeta o canvas e a barra de rolagem da
página quando declarado no elemento raiz. No `<body>` ele vale para os descendentes, mas o fundo
da página e a barra de rolagem da janela continuam claros.

```jsx
// certo
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.removeAttribute('data-theme');   // volta a "system"

// errado — o atributo existe, o tema não muda
document.body.dataset.theme = 'dark';
```

A mesma regra vale para `data-density` (`primitives.css` declara `[data-density="compact"]` e
irmãos): raiz para o padrão da aplicação, contêiner local só quando a densidade é da região —
uma `DataTable` compacta dentro de uma página `default`.

### 3.6 O contexto React

`frontend/src/contexts/ThemeContext.jsx` tem três estados e uma responsabilidade: manter o
atributo e o `localStorage` em sincronia. Ele **não** decide cor — cor está em `semantic.css`.

```jsx
const THEMES = ['system', 'light', 'dark'];

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}
```

- Estado inicial lido de `localStorage.getItem('lumina_theme')`, com `'system'` como padrão. O
  script inline já aplicou o atributo; o contexto apenas concorda com ele, não repinta.
- Em `system`, um `matchMedia('(prefers-color-scheme: dark)')` com listener mantém o **tema
  resolvido** derivado atualizado. O CSS não precisa disso — a media query já reage sozinha —
  mas o módulo de gráficos precisa (§8.2), porque ele carrega valores, não referências.
- O contexto expõe `{ theme, setTheme, resolvedTheme }`, onde `resolvedTheme` é sempre `'light'`
  ou `'dark'`, nunca `'system'`.

---

## 4. Consumo dos tokens

### 4.1 A cadeia

Três saltos, sempre na mesma direção, nunca pulando degrau para cor:

```
CSS do componente  →  token de componente  →  token semântico  →  primitivo  →  valor
```

```css
/* ui/Button/Button.css — escrito à mão, @layer lm.components */
.lm-button--filled { background: var(--lm-button-filled-bg); }

/* tokens/components.css — gerado */
--lm-button-filled-bg: var(--lm-color-primary);

/* tokens/semantic.css — gerado, muda com o tema */
--lm-color-primary: #005eb2;   /* claro */
--lm-color-primary: #b1c5ff;   /* escuro */
```

**A regra, de `01-fundamentos.md` §2.2:** para cor, um token de componente referencia **apenas**
um token semântico. Nunca um primitivo, nunca um hexadecimal. As duas exceções valem só no nível
de componente: grandeza não-cromática (`--lm-card-padding: var(--lm-space-16)`) e dimensão
estrutural literal (`--lm-navigation-rail-width: 88px`).

Do lado do CSS escrito à mão, a regra correspondente:

| Situação | O que escrever |
|---|---|
| Existe token de componente para a propriedade | Usar o token de componente |
| Não existe token de componente | Usar o token **semântico** |
| Grandeza não-cromática sem token de componente | Usar o primitivo (`--lm-space-*`, `--lm-radius-*`, `--lm-duration-*`) |
| Cor sem token semântico adequado | **Parar.** É pedido de token novo (`08-governanca.md` §3.7), não de exceção local |

**Nunca, em CSS de componente:** hexadecimal, `rgba()` literal, `--lm-palette-*`. O `--check` do
gerador só consegue auditar contraste porque toda cor de produto passa pelos papéis semânticos;
um hexadecimal solto é um par que o teste nunca vê.

### 4.2 O mecanismo da camada de estado

`01-fundamentos.md` §7.5 define as sete opacidades `--lm-state-*` e a regra — a camada é
derivada da **cor de conteúdo** do componente — mas não fixa o mecanismo CSS. **O mecanismo do
sistema é `color-mix(in oklab, …)`, sem fallback.**

```css
.lm-button--filled:hover {
  background: color-mix(in oklab,
    var(--lm-color-on-primary) calc(var(--lm-state-hover) * 100%),
    var(--lm-color-primary));
}
```

**Por que `color-mix` e não um pseudo-elemento com `opacity`.** Um `::before` com fundo e
opacidade exige `position: relative`, `overflow: hidden` e um `z-index` no conteúdo em todo
componente que tenha camada de estado; ele cria contexto de empilhamento onde não havia; e ele
compõe contra o que estiver atrás, e não contra a cor declarada — o que torna o resultado
imprevisível quando o componente está sobre uma superfície tonal. `color-mix` produz **uma cor**,
avaliada na declaração, auditável, sem DOM extra.

**Por que `oklab`.** Interpolação em `srgb` escurece a mistura no meio da faixa e desloca a
matiz. `oklab` é perceptualmente uniforme: 8% de mistura tem o mesmo peso visual sobre azul,
vermelho e verde. É a mesma razão pela qual as rampas são derivadas em LCh — o sistema mede cor
em espaço perceptual do começo ao fim.

**Por que `calc(var(--lm-state-hover) * 100%)`.** `--lm-state-hover` é `0.08`, um número sem
unidade, porque ele também é usado em contextos onde porcentagem não serve. `color-mix` exige
porcentagem. O `calc` converte no ponto de uso e mantém uma fonte só para o número.

**Por que não há fallback.** `color-mix()` chegou no Chromium 111; o alvo é o Chromium 120+ do
Electron 28/29. Um fallback aqui é código que nunca executa e que precisa ser mantido
sincronizado com o código que executa.

### 4.3 Fundo preenchido

Cor-fonte = `on-primary`; base = `primary`.

```css
.lm-button--filled {
  background: var(--lm-button-filled-bg);
  color: var(--lm-button-filled-label);
}
.lm-button--filled:hover {
  background: color-mix(in oklab,
    var(--lm-color-on-primary) calc(var(--lm-state-hover) * 100%),
    var(--lm-color-primary));
}
.lm-button--filled:active {
  background: color-mix(in oklab,
    var(--lm-color-on-primary) calc(var(--lm-state-pressed) * 100%),
    var(--lm-color-primary));
}
```

O mesmo par de tokens serve os dois temas: no claro, `on-primary` é `#ffffff` e a mistura
clareia; no escuro, `on-primary` é `#003061` e a mistura escurece. O sentido do efeito se
inverte junto com o tema, sem uma linha condicional — porque a cor-fonte é sempre "o que está
escrito ali".

O botão destrutivo segue exatamente a mesma forma, trocando o par por `--lm-color-on-error` /
`--lm-color-error`. O anel de foco **não** muda de cor: continua `--lm-focus-ring-color`
(`03-acessibilidade.md` §3.3).

### 4.4 Fundo tonal

Cor-fonte = `on-secondary-container`; base = `secondary-container`.

```css
.lm-button--tonal {
  background: var(--lm-button-tonal-bg);
  color: var(--lm-button-tonal-label);
}
.lm-button--tonal:hover {
  background: color-mix(in oklab,
    var(--lm-color-on-secondary-container) calc(var(--lm-state-hover) * 100%),
    var(--lm-color-secondary-container));
}
```

### 4.5 Item de lista, linha de tabela e superfície transparente

Aqui a base **não** é uma cor: o item é transparente e deixa ver a superfície de trás, que pode
ser `surface`, `surface-container` ou `surface-container-high` dependendo de onde a lista está.
A camada mistura para `transparent`, e o resultado se sobrepõe ao que houver.

```css
.lm-table__row:hover {
  background: color-mix(in oklab,
    var(--lm-table-row-hover) calc(var(--lm-state-hover) * 100%),
    transparent);
}
```

`--lm-table-row-hover` aponta para `--lm-color-on-surface`, e não para uma cor de fundo,
precisamente por isso: a camada é sempre derivada da **tinta**, nunca do papel. Uma linha de
tabela dentro de um card `surface-container-high` e a mesma linha dentro de um painel
`surface-container-low` recebem a mesma regra e produzem o realce correto nas duas, nos dois
temas.

O mesmo vale para item de menu, item de navegação não selecionado e `Chip` não selecionado.

### 4.6 `--lm-state-selected` e contêiner tonal se excluem

`01-fundamentos.md` §7.5, sem exceção: **ou** a seleção é um contêiner tonal, **ou** é uma
camada. Nunca as duas.

| Componente | Como marca seleção | Token | `--lm-state-selected`? |
|---|---|---|---|
| Item de navegação | Contêiner tonal (pílula) | `--lm-navigation-item-bg-selected` | Não |
| `Chip` de filtro | Contêiner tonal | `--lm-chip-selected-bg` | Não |
| Linha de `DataTable` | Contêiner tonal | `--lm-table-row-selected-bg` | Não |
| `Card` selecionável | Contêiner tonal | `--lm-card-selected-bg` | Não |
| `IconButton` alternável | Contêiner tonal | `--lm-icon-button-selected-bg` | Não |
| Item de `Menu` marcado | **Camada** — não há token de contêiner para item de menu | `--lm-state-selected` sobre `--lm-color-on-surface` | Sim |

```css
/* certo — contêiner tonal, sem camada de seleção */
.lm-nav-item[aria-current="page"] {
  background: var(--lm-navigation-item-bg-selected);
  color: var(--lm-navigation-item-label-selected);
}

/* certo — camada, porque não há contêiner para este caso */
.lm-menu__item[aria-checked="true"] {
  background: color-mix(in oklab,
    var(--lm-color-on-surface) calc(var(--lm-state-selected) * 100%),
    transparent);
}

/* errado — acumula: a pílula fica com duas intensidades e a seleção
   deixa de ser distinguível do hover sobre item já selecionado */
.lm-nav-item[aria-current="page"] {
  background: var(--lm-navigation-item-bg-selected);
}
.lm-nav-item[aria-current="page"]::before {
  background: color-mix(in oklab, var(--lm-color-on-surface) 12%, transparent);
}
```

**Hover sobre item já selecionado.** A camada de hover se aplica sobre a base **daquele estado**
— `secondary-container` quando há contêiner tonal, com `on-secondary-container` como cor-fonte.
Não se soma hover à base não selecionada.

### 4.7 Foco: camada soma, nunca substitui

`--lm-state-focus` (0.10) é **adicionado** ao anel, nunca colocado no lugar dele. O anel comunica
"o teclado está aqui"; a camada comunica "este alvo está quente". Remover o anel e deixar só a
camada é falha de WCAG 2.4.7 e 2.4.11.

Sobre fundo da mesma matiz do anel — um botão `filled` primário, por exemplo — o anel de
`--lm-color-primary` a 2px de afastamento pode se aproximar demais da cor do próprio botão. É
para isso que existem `--lm-focus-ring-inner-width` (1px) e `--lm-focus-ring-inner-color`
(`--lm-color-surface`): um filete de superfície entre o controle e o anel, garantindo separação
em qualquer combinação.

```css
.lm-button:focus-visible {
  outline: var(--lm-focus-ring-width) solid var(--lm-focus-ring-color);
  outline-offset: var(--lm-focus-ring-offset);
  box-shadow: 0 0 0 var(--lm-focus-ring-inner-width) var(--lm-focus-ring-inner-color);
}
```

O `box-shadow` aqui é o filete **interno**, não o anel. O anel continua sendo `outline`, porque
é `outline` que sobrevive ao modo de alto contraste forçado do Windows.

### 4.8 Desabilitado é cor, não opacidade

```css
/* certo */
.lm-field--disabled .lm-field__input {
  color: var(--lm-field-disabled-text);      /* → --lm-color-on-surface-disabled */
  border-color: var(--lm-field-disabled-border);
}

/* errado */
.lm-field--disabled { opacity: 0.38; }
```

`opacity` numa subárvore compõe **tudo** contra o que estiver atrás: o texto, a borda, o ícone,
o anel de foco e o próprio fundo, cada um com a sua opacidade multiplicada. O contraste
resultante depende da superfície de trás e não pode ser calculado a partir de tokens — é
exatamente o par que o `--check` do gerador não consegue auditar. `--lm-color-on-surface-disabled`
é um valor sólido (`#6c7889` claro, `#8692a3` escuro), verificado como qualquer outro papel.

Os tokens `--lm-state-disabled-content` (0.38) e `--lm-state-disabled-container` (0.12)
continuam sendo os números de registro, usados **como proporção dentro de `color-mix`** quando
um fundo desabilitado precisa ser derivado — nunca aplicados como propriedade `opacity` a uma
subárvore.

---

## 5. API de componentes React

### 5.1 As convenções

| Convenção | Regra | Por quê |
|---|---|---|
| **Variante em vez de booleano** | `variant="filled"`, nunca `<Button primary elevated />` | Quatro booleanos são 16 combinações, das quais 12 são inválidas e nenhuma dá erro. Uma enum tem exatamente os estados que existem |
| **`size` só onde há token** | Exposto apenas quando existe conjunto de tokens para os tamanhos | Um `size="lg"` sem token é um número inventado no componente — a mesma falha que um hexadecimal |
| **`density` local, opcional** | Escreve `data-density` no elemento, reaproveitando os blocos já emitidos em `primitives.css` | A densidade é do contexto, não do componente. O padrão é herdar |
| **Composição por `children`** | Estrutura interna é `children`, não uma prop de conteúdo | `<Dialog.Footer>` aceita qualquer coisa; `footerButtons={[…]}` aceita o que o autor previu |
| **Slot nomeado só quando o componente posiciona** | `leading` / `trailing` em `TextField`; `children` para o resto | O componente precisa saber onde pôr — e só nesse caso |
| **`forwardRef` sempre** | Todo componente que renderiza um elemento nativo encaminha `ref` | Foco programático, `scrollIntoView`, medição, integração com `Menu`/`Tooltip`. Sem `ref`, `03-acessibilidade.md` §4.5 (devolução de foco) é impossível de implementar |
| **`...rest` propagado** | Sempre para o elemento raiz nativo | É o que permite `aria-describedby`, `data-testid`, `onKeyDown` e `title` sem o componente crescer uma prop por caso |
| **`className` mesclado** | `className={['lm-button', variantClass, className].filter(Boolean).join(' ')}` | Substituir a classe do componente destrói o componente |
| **Padrão seguro** | Todo default é o comportamento menos destrutivo | `type="button"` num `<button>` dentro de `<form>` evita submissão silenciosa |
| **Acessibilidade não opcional** | Ver §5.4 | |

### 5.2 `Button`

```jsx
import { forwardRef } from 'react';
import './Button.css';

/**
 * @param {'filled'|'tonal'|'outlined'|'text'|'elevated'|'destructive'} variant
 * @param {'comfortable'|'default'|'compact'} [density]  omitido = herda da raiz
 * @param {React.ComponentType} [icon]                   componente lucide-react
 */
const Button = forwardRef(function Button(
  {
    variant = 'filled',
    density,
    icon: Icon,
    iconPosition = 'start',
    loading = false,
    disabled = false,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-density={density}
      className={['lm-button', `lm-button--${variant}`, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {Icon && iconPosition === 'start' && <Icon size={18} aria-hidden="true" />}
      <span className="lm-button__label">{children}</span>
      {Icon && iconPosition === 'end' && <Icon size={18} aria-hidden="true" />}
    </button>
  );
});

export default Button;
```

Decisões que a assinatura registra:

- **Não há `size`.** A altura do botão vem de `--lm-button-height`, que aponta para
  `--lm-density-control` — 40px em `default`, 48px em `comfortable`, 32px em `compact`, e 48px
  forçado sob `@media (pointer: coarse)`. Não existe conjunto `--lm-button-height-sm/-lg`, e
  inventá-lo no componente seria criar valor fora do sistema. O eixo de tamanho do botão é
  `density`. Registrado em [Lacunas](#lacunas).
- **`icon` é um componente, não um nó.** `icon={Plus}` e não `icon={<Plus />}`: o componente
  controla `size` e `aria-hidden`, que são decisões do sistema (`01-fundamentos.md` §8.2 e §8.4),
  não de quem chama.
- **`aria-hidden="true"` no ícone.** O rótulo textual já nomeia o botão; o ícone anunciado de
  novo produz "adicionar adicionar".
- **`loading` desabilita e marca `aria-busy`**, mas o componente **não** troca o rótulo por um
  spinner sozinho: trocar largura no meio do clique move o layout sob o ponteiro. O CSS mantém a
  caixa e sobrepõe o indicador.
- **`children` é o rótulo e é obrigatório.** Botão só com ícone é `IconButton`, um componente
  diferente, com contrato diferente.

### 5.3 `TextField`

```jsx
import { forwardRef, useId } from 'react';
import './TextField.css';

const TextField = forwardRef(function TextField(
  {
    label,                    // obrigatório — rótulo persistente, nunca só placeholder
    value,
    onChange,
    type = 'text',
    helpText,
    errorText,                // presença ⇒ estado de erro
    required = false,
    disabled = false,
    readOnly = false,
    leading,                  // slot posicionado: ícone ou prefixo
    trailing,                 // slot posicionado: ação ou sufixo
    id: idProp,
    className,
    ...rest
  },
  ref,
) {
  const auto = useId();
  const id = idProp ?? `lm-field-${auto}`;
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;

  return (
    <div
      className={['lm-field', errorText && 'lm-field--error', disabled && 'lm-field--disabled', className]
        .filter(Boolean).join(' ')}
    >
      <label className="lm-field__label" htmlFor={id}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>

      <div className="lm-field__control">
        {leading}
        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
          className="lm-field__input"
          {...rest}
        />
        {trailing}
      </div>

      {errorText && <p id={errorId} className="lm-field__error">{errorText}</p>}
      {helpText && <p id={helpId} className="lm-field__help">{helpText}</p>}
    </div>
  );
});

export default TextField;
```

Decisões que a assinatura registra:

- **`label` é obrigatório e é um elemento real.** `placeholder` como rótulo some quando o usuário
  digita, não é lido de forma confiável, e falha no contraste (o `::placeholder` do sistema usa
  `--lm-field-placeholder`, uma cor de apoio). O placeholder é exemplo, não nome.
- **`id` gerado por `useId()`.** Sem isso, quem usa precisa inventar um id único por campo, e a
  associação `label`/`input` vira responsabilidade da página. Um formulário com dois campos de
  mesmo id não dá erro e quebra o clique no rótulo.
- **`errorText` é a única fonte do estado de erro.** Não existe prop `hasError` separada — dois
  estados que podem discordar são um bug esperando. Presença do texto é o estado.
- **Erro antes da ajuda no DOM.** `aria-describedby` é lido na ordem em que os ids aparecem na
  lista; a mensagem que importa vem primeiro (`03-acessibilidade.md` §6.4).
- **O asterisco é `aria-hidden`.** A obrigatoriedade é anunciada por `required`; o asterisco é
  reforço visual, e o leitor de tela anunciando "asterisco" é ruído.
- **`...rest` vai no `<input>`, não na `<div>`.** É onde `maxLength`, `autoComplete`,
  `inputMode`, `onBlur` e `pattern` precisam chegar.

### 5.4 Props de acessibilidade não são opcionais

**Regra.** Quando um componente não tem texto visível, a prop que fornece o nome acessível é
**obrigatória**, e a ausência dela é erro de ferramenta — nunca decisão de quem usa.

O caso canônico é `IconButton`. Sem `aria-label`, um leitor de tela anuncia "botão" e nada mais:
o usuário sabe que há um botão e não sabe o que ele faz. Esse defeito é invisível em revisão
visual, invisível em teste manual com mouse, e barato de introduzir — exatamente o perfil de
defeito que precisa de portão automático.

```jsx
// erro de lint — sem nome acessível
<IconButton icon={Trash2} onClick={remove} />

// certo
<IconButton icon={Trash2} aria-label="Excluir documento" onClick={remove} />
```

Duas camadas de aplicação, ambas necessárias porque uma pega o que a outra não pega:

| Camada | Ferramenta | Pega | Estado |
|---|---|---|---|
| Estático | `eslint-plugin-jsx-a11y` com mapa `components`, associando `IconButton → button` | O caso literal, no editor, antes do commit | Não instalado — `package.json` tem apenas `eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks` |
| Runtime, em desenvolvimento | `PropTypes` com `isRequired` no próprio componente | O caso passado por spread (`{...props}`), que o lint não consegue seguir | Não escrito — nenhum componente existe |

```jsx
IconButton.propTypes = {
  'aria-label': PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
};
```

A lista dos que carregam essa obrigação: `IconButton`, `Chip` sem rótulo textual, `Switch` sem
rótulo associado, `Tabs.Tab` só com ícone, e qualquer botão de fechar de `Dialog`, `Snackbar` ou
`Side sheet`. Componentes com texto visível **não** aceitam `aria-label`: ele substituiria o nome
acessível pelo texto da prop, quebrando a correspondência entre o que se vê e o que se fala
(WCAG 2.5.3), que é pior que não ter prop nenhuma.

### 5.5 O que não é prop

| Não é prop | Onde mora |
|---|---|
| Cor | Token. Um `color="danger"` reabre a porta que `variant="destructive"` fechou |
| Margem, posição, largura | No contêiner. Componente não conhece o próprio entorno |
| `style` de aparência | Nenhum lugar. `style` inline vence toda camada (§2.4) e é a fuga que esvazia o sistema |
| Ícone como nó pronto | `icon` recebe o **componente**; tamanho e `aria-hidden` são do sistema |
| Duração de animação | `--lm-duration-*`, decidido pelo tipo de transição (`01-fundamentos.md` §9.3) |
| Tempo de permanência | `--lm-dwell-snackbar` (5000ms), `--lm-dwell-snackbar-action` (10000ms), `--lm-dwell-tooltip-delay` (500ms), `--lm-dwell-tooltip-delay-repeat` (0ms) |

**A exceção de `style` que continua legítima:** valor calculado em runtime que não pode existir
como token — a largura de uma barra de progresso, a posição de um popover, a altura de uma linha
virtualizada. Cada ocorrência é comentada com o motivo. `style={{ marginTop: 16 }}` nunca é esse
caso; `--lm-space-16` existe.

---

## 6. A ponte de variáveis legadas

### 6.1 O que a ponte é, e por que ela é a decisão certa

`frontend/src/styles/global.css` declara **40 custom properties** num bloco `:root` (linhas
3–61). Elas são consumidas em 19 arquivos do frontend — 11 `.css` (incluindo o próprio
`global.css`) e 8 `.jsx`, estes últimos dentro de `style={{}}`.

Existem duas formas de migrar isso:

1. Abrir os 19 arquivos e substituir cada `var(--text-muted)` por
   `var(--lm-color-on-surface-variant)`. São **369 ocorrências**: um commit gigante, revisão
   impossível, e nenhuma forma de saber se um erro entrou.
2. **Reapontar as 40 declarações** para os tokens novos, num arquivo só. Os 19 consumidores
   migram juntos, sem serem tocados, e o diff cabe numa tela.

A segunda. Ela também tem uma propriedade que a primeira não tem: é **reversível**. Se o
resultado visual sair errado, o `git revert` é de um arquivo.

```css
/* frontend/src/styles/bridge.css — TEMPORÁRIO, removido na Fase 12 do plano */
@layer lm.bridge {
  :root {
    /* mapeamento de §6.2 */
  }
}
```

### 6.2 O mapeamento completo — legado → token

As 40 variáveis de `global.css:3-61`, na ordem em que aparecem no arquivo.

| # | Legada | Valor hoje | Passa a ser | Nota |
|---|---|---|---|---|
| 1 | `--bg-app` | `#101922` | `var(--lm-color-background)` | |
| 2 | `--bg-sidebar` | `#0b1219` | `var(--lm-color-surface-container-lowest)` | Declarada e **nunca consumida** via `var()` |
| 3 | `--card-bg` | `#16202a` | `var(--lm-color-surface-container-low)` | |
| 4 | `--border-color` | `#23303d` | `var(--lm-color-outline-variant)` | |
| 5 | `--primary` | `#137fec` | `var(--lm-color-primary)` | 28 usos — a segunda mais consumida |
| 6 | `--primary-hover` | `#1171d4` | **camada de estado** — ver §6.3 | |
| 7 | `--primary-glow` | `rgba(19,127,236,.25)` | **descartada** — ver §6.3 | |
| 8 | `--primary-light` | `rgba(19,127,236,.12)` | `var(--lm-color-primary-container)` | Translúcida → sólida |
| 9 | `--danger` | `#ef4444` | `var(--lm-color-error)` | |
| 10 | `--success` | `#10b981` | `var(--lm-color-success)` | |
| 11 | `--warning` | `#f59e0b` | `var(--lm-color-warning)` | |
| 12 | `--info` | `#3b82f6` | `var(--lm-color-info)` | |
| 13 | `--secondary` | `#64748b` | `var(--lm-color-secondary)` | |
| 14 | `--text-main` | `#f1f5f9` | `var(--lm-color-on-surface)` | |
| 15 | `--text-muted` | `#94a3b8` | `var(--lm-color-on-surface-variant)` | |
| 16 | `--text-disable` | `#475569` | `var(--lm-color-on-surface-disabled)` | **Lacuna fechada** — ver §6.3 |
| 17 | `--border-glass` | `1px solid var(--border-color)` | `1px solid var(--lm-color-outline-variant)` | Valor composto, não cor |
| 18 | `--border-glass-hover` | `1px solid #2e3f50` | `1px solid var(--lm-color-outline)` | Destino final é camada de estado, não troca de borda |
| 19 | `--radius-sm` | `8px` | `var(--lm-radius-sm)` | 8px → 8px |
| 20 | `--radius-md` | `12px` | `var(--lm-radius-md)` | 12px → 12px |
| 21 | `--radius-lg` | `24px` | `var(--lm-radius-xl)` | 24px → 24px. **Não** `--lm-radius-lg`, que é 16px |
| 22 | `--ease-out-expo` | `cubic-bezier(.16,1,.3,1)` | `var(--lm-easing-emphasized)` | |
| 23 | `--ease-out-quart` | `cubic-bezier(.25,1,.5,1)` | `var(--lm-easing-emphasized)` | Duas curvas colapsam em uma |
| 24 | `--ease-in-out` | `cubic-bezier(.4,0,.2,1)` | `var(--lm-easing-standard)` | |
| 25 | `--duration-fast` | `0.15s` | `var(--lm-duration-fast)` | **150ms → 120ms** |
| 26 | `--duration-normal` | `0.25s` | `var(--lm-duration-standard)` | **250ms → 200ms** |
| 27 | `--duration-slow` | `0.4s` | `var(--lm-duration-emphasized)` | **400ms → 320ms** |
| 28 | `--glass-1` | `rgba(22,32,42,.9)` | `var(--lm-color-surface-container-low)` | **Translúcida → sólida** |
| 29 | `--glass-2` | `rgba(26,38,52,.95)` | `var(--lm-color-surface-container-high)` | **Translúcida → sólida** |
| 30 | `--glass-3` | `rgba(30,46,60,1)` | `var(--lm-color-surface-container-highest)` | Já era opaca |
| 31 | `--bg-primary` | `var(--card-bg)` | `var(--lm-color-surface-container-low)` | Alias de compatibilidade |
| 32 | `--bg-secondary` | `var(--bg-app)` | `var(--lm-color-background)` | Alias |
| 33 | `--bg-tertiary` | `rgba(22,32,42,.9)` | `var(--lm-color-surface-container)` | **Translúcida → sólida** |
| 34 | `--text-primary` | `var(--text-main)` | `var(--lm-color-on-surface)` | Alias — 12 usos |
| 35 | `--text-secondary` | `var(--text-muted)` | `var(--lm-color-on-surface-variant)` | Alias — 33 usos, a mais consumida de todas |
| 36 | `--border` | `var(--border-color)` | `var(--lm-color-outline-variant)` | Alias |
| 37 | `--shadow` | `0 4px 16px rgba(0,0,0,.4)` | `var(--lm-elevation-2)` | |
| 38 | `--shadow-sm` | `0 2px 8px rgba(0,0,0,.3)` | `var(--lm-elevation-1)` | |
| 39 | `--shadow-lg` | `0 8px 32px rgba(0,0,0,.5)` | `var(--lm-elevation-3)` | |
| 40 | `--transition-normal` | `all .25s var(--ease-in-out)` | `all var(--lm-duration-standard) var(--lm-easing-standard)` | Ver §6.3 |

Os nomes `--glass-1/2/3` são resquício do glassmorphism já removido — o próprio `global.css`
comenta na linha 303 "flat, replaces glass-card" e na 30 "Flat borders (replaces glassmorphism
borders)". O nome descreve uma aparência que não existe mais, o que é a definição de nome que
descreve aparência em vez de função (`01-fundamentos.md` §2.4). Eles não são renomeados na ponte
— renomear obrigaria a tocar nos consumidores, que é justamente o que a ponte evita. Eles morrem
com ela.

### 6.3 Os casos sem equivalente direto

Quatro casos merecem tratamento explícito, porque a resposta ingênua quebra o produto.

#### `--primary-hover` → camada de estado, mas a ponte precisa declarar algo

Não existe token `--lm-color-primary-hover`, e não vai existir: o sistema não guarda cor de
hover, ele a deriva (§4.2).

Mas **deixar a variável sem declaração é um bug**, não um "sem efeito". Uma custom property não
declarada torna a declaração que a usa inválida no tempo de valor computado; para uma
propriedade não herdada como `background`, o resultado é o valor inicial — `transparent`. Ou
seja: `global.css:171` (`.btn-primary:hover { background: var(--primary-hover) }`) passaria a
apagar o botão no hover.

A ponte declara a derivação correta, e todos os consumidores legados ganham o hover certo de
graça:

```css
--primary-hover: color-mix(in oklab,
  var(--lm-color-on-primary) calc(var(--lm-state-hover) * 100%),
  var(--lm-color-primary));
```

#### `--primary-glow` → descartada, mas declarada como `transparent`

Sombra colorida sai do sistema: `01-fundamentos.md` §7.2 define seis níveis de elevação em preto
com opacidade, e nenhum deles é matizado. `--primary-glow` é consumida três vezes, sempre em
`box-shadow` (`global.css:168`, `173`, `177`).

Mesmo problema do caso anterior: remover a declaração invalida o `box-shadow` inteiro. A ponte
declara `--primary-glow: transparent`. A sombra continua sendo calculada, custa nada e não
aparece — que é o resultado desejado — e nenhuma declaração fica inválida.

> Correção declarada: o esboço de `PLANO_REFATORACAO.md` §2.2 marca esses dois com "—". Um traço
> na tabela significa "não tem destino", não "não declarar". As duas **são declaradas**, com os
> valores acima.

#### `--text-disable` → `--lm-color-on-surface-disabled`

Era a lacuna real registrada como risco R5 no plano. **Está fechada.** O token semântico
`--lm-color-on-surface-disabled` existe agora nos dois temas (`#6c7889` no claro, `#8692a3` no
escuro), e é uma **cor**, não uma opacidade — pelo motivo de §4.8.

Os oito consumidores — `global.css:297` (`::placeholder`), `global.css:450` (`.field-help`),
`Dashboard.css:212`, `AISuggestions.jsx:215` e `:400`, `Login.jsx:132` e `:165`,
`Settings.jsx:877` — passam a apontar para ele sem alteração. Vale notar que
`::placeholder` usando a cor de desabilitado é um defeito de conteúdo, não de token — o
placeholder deve usar `--lm-field-placeholder`; a ponte só preserva o comportamento atual, e a
correção acontece quando o `TextField` substituir o `input` cru.

#### `--transition-normal` → composta na ponte

Três consumidores. O plano sugere compor no ponto de uso, o que exigiria tocar nos três — contra
o princípio da ponte. A ponte compõe:

```css
--transition-normal: all var(--lm-duration-standard) var(--lm-easing-standard);
```

Com a ressalva de que `transition: all` é defeito independente: ele anima toda propriedade que
mudar, incluindo `width`, `height` e `box-shadow` que ninguém escolheu animar, e é uma das
fontes de jank em listas longas. A correção é do consumidor, na migração da página, listando as
propriedades. A ponte preserva o comportamento; ela não conserta comportamento.

### 6.4 As mudanças de valor que a ponte introduz

A ponte **não é neutra**, e isso é intencional: ela é o momento em que o produto passa a usar as
grandezas do sistema. Diferenças sutis são esperadas; diferenças grosseiras indicam erro de
mapeamento. As duas classes de mudança:

**Movimento — tudo fica 20% mais rápido.**

| Legada | Antes | Depois | Onde aparece |
|---|---|---|---|
| `--duration-fast` | 150ms | **120ms** | 18 usos — hover de botão, aba, ícone |
| `--duration-normal` | 250ms | **200ms** | 16 usos — foco de campo, card, modal |
| `--duration-slow` | 400ms | **320ms** | 3 usos — entrada de página (`fadeInUp`), estado vazio, carregamento |

As durações do sistema vêm de `01-fundamentos.md` §9.1 e são mais curtas de propósito: num app de
uso prolongado, a animação é confirmação, não espetáculo. A percepção é de app mais responsivo,
não de app diferente.

**Superfície — `--glass-*` deixa de ser translúcida.**

| Legada | Antes | Depois | Consequência |
|---|---|---|---|
| `--glass-1` | `rgba(22,32,42,0.9)` | `#f1f4f8` claro / `#1a1c1f` escuro | Nada mais transparece por trás |
| `--glass-2` | `rgba(26,38,52,0.95)` | `#e6e8ed` claro / `#282a2e` escuro | Idem |
| `--glass-3` | `rgba(30,46,60,1.0)` | `#e0e3e7` claro / `#323539` escuro | Já era opaca; só muda o tom |
| `--bg-tertiary` | `rgba(22,32,42,0.9)` | `#ebeef2` claro / `#1d2023` escuro | Idem |
| `--primary-light` | `rgba(19,127,236,0.12)` | `#d9e2ff` claro / `#004788` escuro | Idem |

Três consequências concretas de deixar de ser translúcido:

1. **Contraste passa a ser previsível.** A cor efetiva de `rgba(22,32,42,0.9)` depende do que
   está atrás. Dois `.glass-card` em contextos diferentes tinham contrastes diferentes contra o
   mesmo texto, e nenhum deles podia ser auditado por token.
2. **Empilhamento deixa de somar.** Um `--glass-1` dentro de outro `--glass-1` produzia uma
   terceira cor. Com superfície sólida, a hierarquia é a escala `surface-container-*`, que tem
   cinco degraus nomeados e verificados.
3. **A barra de rolagem muda.** `global.css:79` usa `var(--glass-2)` como `::-webkit-scrollbar-thumb`;
   ela passa a ser `surface-container-high` sólida.

**O que a ponte não muda:** os raios (8/12/24 → 8/12/24, desde que `--radius-lg` vá para
`--lm-radius-xl`) e as curvas de easing, cuja diferença de forma é imperceptível nas durações do
sistema.

### 6.5 Como medir a dívida

A ponte é **dívida declarada**, e dívida declarada precisa de medidor. O número que importa é
quantos arquivos ainda dependem dela:

```bash
grep -rlP "var\(--(?!lm-)" frontend/src --include=*.css --include=*.jsx \
  | grep -v "styles/tokens" \
  | wc -l
```

O lookahead negativo `(?!lm-)` casa qualquer `var(--…)` que **não** seja do sistema — é a
formulação que não precisa ser mantida em sincronia com a lista de 40 nomes.

**Linha de base, medida hoje: 19 arquivos.**

| Grupo | Arquivos |
|---|---|
| CSS (11) | `styles/global.css`, `components/Calendar.css`, `components/EventModal.css`, `pages/CalendarPage.css`, `pages/ConflictsPage.css`, `pages/Dashboard.css`, `pages/Documents.css`, `pages/Emails.css`, `pages/Notifications.css`, `pages/Settings.css`, `pages/Statistics.css` |
| JSX (8) | `App.jsx`, `components/ErrorBoundary.jsx`, `pages/AISuggestions.jsx`, `pages/CondoTemplate.jsx`, `pages/Dashboard.jsx`, `pages/Documents.jsx`, `pages/Login.jsx`, `pages/Settings.jsx` |

O número desce a cada página migrada e **precisa chegar a zero** antes da Fase 12. Se ele
estagnar por várias fases, a ponte deixou de ser ponte e virou o sistema — o modo mais comum de
uma migração incremental falhar.

Dois medidores complementares, do mesmo espírito:

```bash
# hexadecimais fora dos tokens — hoje 25 só em pages/Statistics.jsx
grep -rEo "#[0-9a-fA-F]{3,8}\b" frontend/src --include=*.css --include=*.jsx \
  | grep -v "styles/tokens" | wc -l

# o @import de CDN que quebra offline (§7) — precisa ser zero
grep -rn "fonts.googleapis" frontend/src
```

### 6.6 A data de remoção

A ponte nasce na Fase 1 do plano e morre na Fase 12. As condições de óbito:

1. O medidor de §6.5 retorna zero.
2. `bridge.css` é excluído, junto com o import em `main.jsx`.
3. O que sobrar de `global.css` migra para `base.css` ou para o CSS do componente dono; o
   arquivo é excluído, e com ele a camada `lm.overrides` fica vazia — mas **permanece declarada**
   em `layers.css`, porque uma camada de escape vazia é barata e recriá-la sob pressão é o
   momento em que ela é recriada errado.

Enquanto existir, `bridge.css` carrega o comentário de cabeçalho que diz o que é, quando morre e
como se mede — no arquivo, não só neste documento. Dívida documentada longe do código é dívida
esquecida.

---

## 7. Fontes auto-hospedadas

### 7.1 O defeito

`frontend/src/styles/global.css`, **linha 1**:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

Num aplicativo **100% local e offline**, isso é um defeito de conformidade com a própria
premissa do produto, não uma preferência de empacotamento. Sem rede:

1. O `@import` falha. Nenhum `@font-face` é definido.
2. `body { font-family: 'Inter', sans-serif }` (`global.css:67`) e
   `input, select, textarea { font-family: 'Inter', sans-serif }` (`global.css:264`) caem no
   `sans-serif` genérico do sistema.
3. Métricas mudam: altura-x, largura de avanço e entrelinha efetiva são outras. Texto que cabia
   em uma linha passa a caber em duas; colunas de tabela desalinham; rótulos de botão estouram.
   A tipografia inteira sai do sistema de uma vez.

Há um segundo custo, que existe mesmo **com** rede: `@import` na primeira linha da folha
principal bloqueia a renderização até resolver. Sob `file://` no Electron, com rede indisponível
ou lenta, isso é uma espera até o timeout antes do primeiro paint.

E um terceiro: o `@import` pede **cinco pesos** (300, 400, 500, 600, 700). A escala tipográfica
usa dois.

### 7.2 O que empacotar

A escala completa de `primitives.css` usa exatamente **dois** pesos:

| Peso | Papéis |
|---|---|
| **400** | `display-lg`, `display-md`, `display-sm`, `headline-lg`, `headline-md`, `headline-sm`, `title-lg`, `body-lg`, `body-md`, `body-sm`, `code` |
| **500** | `title-md`, `title-sm`, `label-lg`, `label-md`, `label-sm` |

Nenhum papel usa 300, 600 ou 700. **Não empacotar 300, 600 nem 700.** Cada peso é um arquivo a
mais no instalador para servir zero papéis do sistema.

**Consequência que precisa ser tratada junto.** O CSS atual declara `font-weight: 600` ou `700`
em **51 pontos** — `.empty-state h3`, `.form-section-title`, `.section-title`, `.badge`,
`.platform-badge`, `.companion-number` e outros. Com apenas 400 e 500 empacotados, o Chromium
**sintetiza** o 600: ele engorda o glifo de 500 artificialmente, produzindo um negrito falso com
espaçamento errado e contornos sujos, visivelmente pior que o 500 real. Portanto empacotar a
Inter e não migrar esses 51 pontos para `--lm-type-title-*-weight` / `--lm-type-label-*-weight`
piora a tipografia.

As duas mudanças andam juntas: o mesmo commit que remove o `@import` normaliza os pesos. Se a
migração dos 51 pontos for adiada, a alternativa honesta é empacotar 600 temporariamente e
registrar a remoção — nunca deixar a síntese acontecer em silêncio.

**Cobertura.** Latino básico (`latin`) e latino estendido (`latin-ext`). `pt-BR` precisa dos
dois: `latin` cobre a maioria dos acentos, `latin-ext` cobre o restante do repertório usado em
nomes próprios e endereços. Grego e cirílico não têm consumidor no produto. Quatro arquivos:

```
frontend/src/assets/fonts/
├── inter-latin-400.woff2
├── inter-latin-500.woff2
├── inter-latin-ext-400.woff2
└── inter-latin-ext-500.woff2
```

Só `woff2`. `woff` e `ttf` são fallback para navegadores que o alvo não tem.

### 7.3 `@font-face`

`frontend/src/styles/fonts.css`, **fora de qualquer camada**:

```css
/* @font-face não é regra de estilo e não participa da ordem de camadas.
   É o único conteúdo do frontend legitimamente fora de @layer (§2.1). */

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fonts/inter-latin-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
                 U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC,
                 U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('../assets/fonts/inter-latin-500.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
                 U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC,
                 U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

/* latin-ext: mesmo par de pesos, unicode-range complementar. */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('../assets/fonts/inter-latin-ext-400.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF,
                 U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF,
                 U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
/* …e o 500 correspondente. */
```

Três decisões:

- **`font-display: swap`.** O arquivo está no disco local; a janela de bloqueio de 100ms quase
  sempre basta. `swap` garante que, se não bastar, o texto aparece no fallback e troca depois —
  nunca texto invisível. `block` arriscaria FOIT; `optional` desistiria da Inter numa abertura
  lenta, e essa abertura seria a única com tipografia diferente, o que é pior que uma troca.
- **`unicode-range` por face.** Sem ele, o Chromium baixaria os quatro arquivos sempre. Com ele,
  `latin-ext` só é carregado quando um caractere daquela faixa aparece. Num app local o ganho é
  de memória e de tempo de parse, não de rede — mas continua sendo o certo, e é grátis.
- **`font-family: 'Inter'` casando com `--lm-font-sans`.** O primitivo é
  `"Inter", "Inter Variable", system-ui, -apple-system, "Segoe UI", "Noto Sans", sans-serif`.
  O nome declarado no `@font-face` precisa ser exatamente `Inter`. `system-ui` **permanece** na
  pilha, mesmo com a fonte empacotada: a Inter não cobre árabe, hebraico, CJK nem tailandês, e é
  `system-ui` que resolve esses casos (`04-conteudo.md` §8.5).

### 7.4 A monoespaçada não é empacotada

`--lm-font-mono` é
`"JetBrains Mono", "Cascadia Mono", ui-monospace, "SFMono-Regular", Consolas, monospace`.

JetBrains Mono é a primeira da pilha e **não é empacotada**. Na prática, o alvo cai em
`Cascadia Mono`, que existe no Windows 10 e 11 — único alvo do produto, conforme
`package.json` (`"win": { "target": ["nsis"], "arch": ["x64"] }`). `Consolas` está presente em
qualquer Windows como segunda rede.

O raciocínio é de custo/benefício, e ele é explícito: a monoespaçada serve **um** papel na escala
inteira — `--lm-type-code-*` (13px), para IDs de reserva, códigos e dados técnicos, que aparecem
em poucos lugares. Empacotá-la significaria dois arquivos a mais no instalador (400 e, se algum
dia houver ênfase, 500) para servir esse papel, quando o sistema operacional já entrega uma
monoespaçada de qualidade equivalente para ele. O peso do instalador é uma característica do
produto, não um detalhe.

Se um dia a monoespaçada passar a carregar mais papéis — uma visualização de log, um editor de
template — a decisão se reabre. Hoje ela não carrega.

### 7.5 Como o Vite empacota, e como o `electron-builder` leva

**Vite.** `fonts.css` é importado por `main.jsx` (§1.4). Cada `url()` relativo é resolvido pelo
Vite em build: arquivos acima de `assetsInlineLimit` (4096 bytes por padrão) são emitidos em
`dist/assets/` com hash no nome, e a `url()` é reescrita para o caminho final. Um `.woff2` de
subconjunto latino está confortavelmente acima desse limite, então é emitido como arquivo — que
é o desejado: inline em base64 aumentaria o CSS em ~33% e o tornaria não-cacheável.

`vite.config.js` já tem `base: './'`, com o comentário "Necessário para Electron (file://
protocol)". Isso é o que faz a URL emitida ser relativa. **Sem isso, a URL seria
`/assets/inter-…woff2`, absoluta a partir da raiz — que sob `file://` aponta para a raiz do
disco, e a fonte não carrega.** A configuração certa já está lá; o requisito é não removê-la.

**Por que `src/assets/fonts/` e não `frontend/public/`.** Arquivos em `public/` são copiados
verbatim, sem hash, e referenciados por caminho absoluto a partir da raiz — exatamente o que
`file://` quebra. Para este projeto, `src/assets/` processado pelo Vite é a única das duas opções
que funciona no destino real.

**electron-builder.** A configuração `build` de `package.json` já leva os assets, sem alteração:

```json
"extraResources": [
  { "from": "frontend/dist", "to": "app/frontend/dist", "filter": ["**/*"] },
  …
]
```

O filtro `**/*` copia `dist/assets/` inteiro. Tudo que o Vite emitir chega ao instalador. **Nada
precisa ser adicionado** — e é importante entender por quê, porque o oposto é uma armadilha:

- O array `files` inclui apenas `electron/**/*` e `package.json`. O frontend **não** chega por
  `files`; ele chega exclusivamente por `extraResources`. Uma fonte colocada fora de
  `frontend/dist` não é empacotada.
- Em particular, `"!electron/assets/!(tray-icon.*)"` exclui de `electron/assets/` tudo que não
  seja o ícone da bandeja. Uma fonte colocada ali seria **silenciosamente descartada** do
  instalador — o app abriria, e a fonte cairia no fallback só na máquina do usuário.
- `"asar": false`, então os arquivos ficam legíveis no diretório de instalação; nenhuma
  consideração de `asarUnpack` se aplica.

**A verificação de aceitação** é comportamental, não estrutural, e é a única que prova o ponto:
desconectar a rede, abrir o app empacotado, abrir o DevTools em *Computed → Rendered Fonts* e
confirmar `Inter`. Somado a `grep -rn "fonts.googleapis" frontend/src` retornando vazio. E, por
disciplina de tamanho: comparar o `.exe` gerado antes e depois.

---

## 8. Gráficos com Recharts

### 8.1 Por que existe um módulo, em vez de `var()` direto

Recharts recebe cor por prop (`stroke`, `fill`, `contentStyle`) e a usa em três lugares
diferentes: atributo de apresentação SVG, estilo inline, e cálculo em JavaScript — o quadradinho
da legenda, o ponto ativo do hover, o degradê de área. Os dois primeiros resolvem `var()`; o
terceiro não, porque em JavaScript `'var(--lm-chart-series-1)'` é uma string sem cor dentro.

Passar `var()` em alguns lugares e valor em outros produz um gráfico que funciona **quase**
sempre, e falha exatamente nas partes que ninguém olha em revisão. A regra do sistema é uma só:
**o módulo resolve tudo para valor, e o gráfico recebe valores.**

O preço é que valores não reagem sozinhos à troca de tema — daí a segunda responsabilidade do
módulo: reler quando o tema muda.

### 8.2 O módulo

`frontend/src/components/charts/useChartTheme.js`:

```js
import { useCallback, useEffect, useState } from 'react';

const SERIES = ['--lm-chart-series-1', '--lm-chart-series-2', '--lm-chart-series-3',
                '--lm-chart-series-4', '--lm-chart-series-5', '--lm-chart-series-6',
                '--lm-chart-series-7', '--lm-chart-series-8'];

const SEQUENTIAL = Array.from({ length: 8 }, (_, i) => `--lm-chart-sequential-${i + 1}`);
const ORDINAL    = Array.from({ length: 5 }, (_, i) => `--lm-chart-ordinal-${i + 1}`);

function readChartTheme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();

  return {
    series:     SERIES.map(v),
    sequential: SEQUENTIAL.map(v),
    ordinal:    ORDINAL.map(v),
    diverging: {
      negative: v('--lm-chart-diverging-negative'),
      neutral:  v('--lm-chart-diverging-neutral'),
      positive: v('--lm-chart-diverging-positive'),
    },
    status: {
      good:     v('--lm-chart-status-good'),
      warning:  v('--lm-chart-status-warning'),
      serious:  v('--lm-chart-status-serious'),
      critical: v('--lm-chart-status-critical'),
    },
    surface:      v('--lm-color-chart-surface'),
    ink:          v('--lm-color-chart-ink'),
    inkMuted:     v('--lm-color-chart-ink-muted'),
    grid:         v('--lm-color-chart-grid'),
    axis:         v('--lm-color-chart-axis'),
    tooltipBg:    v('--lm-color-chart-tooltip-bg'),
    tooltipLabel: v('--lm-color-chart-tooltip-label'),
  };
}

export function useChartTheme() {
  const [theme, setTheme] = useState(readChartTheme);
  const refresh = useCallback(() => setTheme(readChartTheme()), []);

  useEffect(() => {
    // 1. escolha manual: data-theme muda no <html>
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // 2. modo "system": o SO troca com o app aberto
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', refresh);

    return () => { observer.disconnect(); mq.removeEventListener('change', refresh); };
  }, [refresh]);

  return theme;
}

export function usePrefersReducedMotion() {
  const mq = () => window.matchMedia('(prefers-reduced-motion: reduce)');
  const [reduced, setReduced] = useState(() => mq().matches);
  useEffect(() => {
    const m = mq();
    const on = (e) => setReduced(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}
```

Notas de implementação:

- **Os dois gatilhos são necessários.** `MutationObserver` cobre a escolha manual; `matchMedia`
  cobre o modo `system` quando o usuário troca o tema do Windows com o app aberto. Só o primeiro
  deixa o gráfico com a paleta antiga; só o segundo, idem.
- **`getComputedStyle` dentro do callback está correto.** A mudança de atributo já invalidou o
  estilo; a leitura força o recálculo e devolve o valor novo.
- **A leitura é de `document.documentElement`** — os tokens são declarados em `:root`.
- **Um módulo, não uma constante.** Uma constante em JS congelaria o tema no primeiro render e
  duplicaria valores que só o gerador tem o direito de escrever.

### 8.3 Os tokens reais

Todos existem em `tokens.json` e são emitidos em `semantic.css`, nos dois temas.

**Categórica — `--lm-chart-series-1..8`**, ordem fixa:

| Slot | Matiz | Claro | Escuro |
|---|---|---|---|
| 1 | blue | `#2a83ed` | `#2a83ed` |
| 2 | green | `#15975c` | `#2fa469` |
| 3 | violet | `#a36ec3` | `#a36ec3` |
| 4 | orange | `#db5c32` | `#db5c32` |
| 5 | teal | `#009396` | `#00a1a5` |
| 6 | amber | `#b87500` | `#c98100` |
| 7 | cyan | `#0090b0` | `#009ec1` |
| 8 | rose | `#ab2968` | `#d9548e` |

**Sequencial — `--lm-chart-sequential-1..8`.** Uma única matiz (`primary`), claro → escuro no
tema claro, invertida no escuro para que "mais" seja sempre "mais distante da superfície".

**Ordinal — `--lm-chart-ordinal-1..5`.** Mesma matiz, janela mais estreita: etapas discretas
ordenadas (por exemplo, faixas de ocupação), onde o passo vizinho da superfície ainda precisa se
distinguir dela.

**Divergente — `--lm-chart-diverging-negative` / `-neutral` / `-positive`.** Duas matizes com
cinza no meio: `#dd3742` / `#e0e3e7` / `#0077de` no claro. O cinza central é a única cor que
comunica "nada" — usar um tom da mesma rampa no meio faria o zero parecer um valor pequeno.

**Status — `--lm-chart-status-good` / `-warning` / `-serious` / `-critical`.** Significado
reservado. **Nunca** se mistura com a categórica no mesmo gráfico, e nunca aparece sozinho:
ícone e rótulo acompanham sempre.

**Superfície e tinta — os sete papéis de `--lm-color-chart-*`:**

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `--lm-color-chart-surface` | `#f1f4f8` | `#1a1c1f` | A superfície contra a qual as marcas foram verificadas. Mudá-la invalida a paleta |
| `--lm-color-chart-ink` | `#1a1c1f` | `#e0e3e7` | Rótulo de série, valor, título do eixo. ≥ 4,5:1 sobre `chart-surface` |
| `--lm-color-chart-ink-muted` | `#3d4756` | `#bdc7d7` | Marcação de eixo, legenda secundária. ≥ 4,5:1 |
| `--lm-color-chart-grid` | `#d2dbe8` | `#323c49` | Linhas de grade. Deliberadamente fraco — grade é referência, não conteúdo |
| `--lm-color-chart-axis` | `#a1acbd` | `#545f70` | A linha do eixo, um degrau mais forte que a grade |
| `--lm-color-chart-tooltip-bg` | `#2e3135` | `#e0e3e7` | Superfície invertida: o tooltip é uma peça flutuante |
| `--lm-color-chart-tooltip-label` | `#eef1f5` | `#2e3135` | Tinta do tooltip. O par é verificado em ≥ 4,5:1 |

Os três pares de contraste (`chart-ink` sobre `chart-surface`, `chart-ink-muted` sobre
`chart-surface`, `chart-tooltip-label` sobre `chart-tooltip-bg`) estão entre os 68 que
`generate_tokens.py --check` percorre a cada execução.

### 8.4 As regras invioláveis

#### Ordem de slots fixa, nunca ciclada

A ordem dos oito slots não é estética: `generate_tokens.py` registra que as 40.320 permutações
foram enumeradas e pontuadas pelo pior par adjacente sob simulação de daltonismo, e esta é a
melhor entre as que abrem no azul da marca. Reordenar destrói a garantia; ciclar
(`series[i % 8]`) a destrói duas vezes, porque a 9ª série recebe a cor da 1ª e as duas passam a
significar coisas diferentes com a mesma cor.

**A 9ª série vira "Outros", ou o gráfico vira small multiples.** Não há nona cor.

```js
// errado
const color = theme.series[index % theme.series.length];

// certo
if (index >= 8) return null;      // a série foi dobrada em "Outros" antes de chegar aqui
const color = theme.series[index];
```

#### A cor segue a entidade, nunca o ranking

Um filtro que muda a **contagem** de séries não pode repintar as sobreviventes. Se "Airbnb" é
azul, ela é azul quando aparece sozinha, quando aparece em terceiro lugar, e quando o usuário
volta da tela de detalhe. Cor que se remaneja a cada filtro obriga o usuário a reler a legenda a
cada interação — e a comparar dois gráficos lado a lado torna-se impossível.

```js
// frontend/src/components/charts/chartSlots.js
export const PLATFORM_SLOT = Object.freeze({ airbnb: 0, booking: 1, manual: 2 });
export const seriesColor = (theme, slot) => theme.series[slot];
```

O mapa é por chave de domínio (`'airbnb'`, `'booking'`, `'manual'`), não por posição no array de
dados. Ele é a única fonte, e vive em código versionado — não é token, porque não é uma decisão
visual: é a associação entre uma entidade do domínio e um slot já decidido.

**Marcas de plataforma em gráfico usam `--lm-chart-series-*`, e só.**
`--lm-color-airbnb` e `--lm-color-booking` são tokens de **badge com rótulo**
(`01-fundamentos.md` §3.8), verificados como par contêiner/conteúdo, não para adjacência entre
marcas num gráfico. Usar a cor de badge como cor de série sai da verificação.

#### Proibido eixo duplo

Duas medidas de escala diferente no mesmo par de eixos produzem cruzamentos que dependem
inteiramente de onde cada eixo foi zerado — quem desenha escolhe, sem perceber, qual das duas
séries "está ganhando". Duas saídas legítimas:

1. **Dois gráficos empilhados**, compartilhando o eixo x. É a resposta certa quase sempre.
2. **Indexar a uma base comum** (mês 1 = 100) e usar um eixo só, quando a pergunta é sobre
   variação relativa e não sobre nível.

No LUMINA a tentação tem nome: sobrepor "Receita Mensal" (reais) e "Taxa de Ocupação" (%). Hoje
`Statistics.jsx` já os mantém em cards separados, o que está certo — a regra existe para que
continue assim.

#### Legenda com 2+ séries; rótulo direto em até 4

- **1 série:** sem legenda. O título do gráfico já diz o que é; a legenda repete e ocupa altura.
  Hoje `Statistics.jsx` renderiza `<Legend />` em três gráficos de **uma** série cada
  (`:262`, `:304`, `:397`).
- **2 a 4 séries:** rótulo direto na ponta da linha ou dentro da barra, preferível à legenda —
  elimina o vaivém entre marca e chave, e sobrevive ao daltonismo, porque o texto identifica
  independentemente da cor.
- **5 a 8 séries:** legenda, sempre presente.

#### Texto sempre em token de tinta, nunca na cor da série

Rótulo colorido com a cor da série é ilegível justamente nas séries claras, que foram escolhidas
para se distinguir **entre si**, não para contrastar com a superfície como texto faz. Todo texto
de gráfico usa `--lm-color-chart-ink` ou `--lm-color-chart-ink-muted` — os únicos dois com
contraste verificado contra `--lm-color-chart-surface`.

Isso inclui o `label` do `<Pie>`, que por padrão herda a cor da fatia.

#### Sequencial é uma matiz; divergente são duas com cinza no meio

Sequencial (quantidade contínua sem ponto neutro) é **uma** matiz variando em luminância. Uma
rampa arco-íris não tem ordem perceptual: ninguém sabe se verde vem antes ou depois de laranja.
Divergente (quantidade com zero significativo — variação percentual, lucro/prejuízo) são **duas**
matizes com cinza no centro.

Categórica nunca é usada como sequencial, e sequencial nunca é usada para categoria: as duas
trocas produzem gráficos que parecem certos e comunicam errado.

#### Teto de séries em formas all-pairs

Em scatter, bubble e small multiples, toda série pode ficar adjacente a toda outra — não há
ordem espacial que separe. A verificação registrada no gerador é explícita:

| Séries | Situação |
|---|---|
| **2** | Limpo (ΔE sob simulação de daltonismo 23,5 no claro / 23,6 no escuro) |
| **3** | Só com **codificação secundária** — rótulo direto ou forma distinta. O par azul × violeta cai para ΔE 6,7 |
| **4+** | Dobrar em "Outros" ou facetar em small multiples |

Nos gráficos com ordem espacial — linha, barra, área empilhada — o teto é 8, porque a adjacência
é conhecida e foi a métrica otimizada.

#### `prefers-reduced-motion`

```jsx
const reduced = usePrefersReducedMotion();
<Line isAnimationActive={!reduced} … />
```

A propriedade vale para todos os componentes de marca do Recharts (`Line`, `Bar`, `Area`, `Pie`).
O bloco global de `01-fundamentos.md` §9.4 zera `transition-duration` e `animation-duration`,
mas as animações de entrada do Recharts são interpolação em JavaScript sobre atributos SVG —
CSS não as alcança. `isAnimationActive={false}` é o único desligamento.

### 8.5 `Statistics.jsx` — antes e depois

O arquivo tem **25 hexadecimais** literais, além de `rgba()` em oito pontos. A distribuição:

| Hex | Ocorrências | Onde | Problema |
|---|---|---|---|
| `#94a3b8` | 5 | `tick.fill` de eixos | Cinza fora de token; deveria ser `chart-ink-muted` |
| `#e2e8f0` | 4 | `contentStyle.color` de tooltip | Idem, `chart-tooltip-label` |
| `#1a2535` | 3 | `contentStyle.background` | Não corresponde a token algum do sistema |
| `#64748b` | 2 | `tick.fill` (`:386`) e `COLORS.Manual` | Dois cinzas diferentes para a mesma função em eixos |
| `#2563eb` | 2 | `stroke` e `dot.fill` da linha de ocupação | |
| `#16a34a` | 1 | `fill` da barra de receita | Verde de "sucesso" para uma medida que não é status |
| `#6366f1` | 1 | `fill` da barra de noites | |
| `#8884d8` | 1 | `<Pie fill>` (`:331`) | **A cor de demonstração padrão do Recharts** — ninguém a escolheu |
| `#FF5A5F` / `#003580` | 2 | `COLORS.Airbnb` / `COLORS['Booking.com']` | Hexadecimais de marca, fora de qualquer verificação |
| `#60a5fa`, `#4ade80`, `#fbbf24`, `#a5b4fc` | 4 | `style` inline dos ícones dos cards de resumo | Quatro matizes decorativas sem papel semântico |

Dois merecem destaque:

- **`fill="#8884d8"` na linha 331.** É o roxo de exemplo da documentação do Recharts. Ele está no
  produto porque foi copiado junto com o snippet e nunca removido. Ele fica visível sempre que
  `COLORS[entry.name]` retorna `undefined` — ou seja, para qualquer plataforma que não seja
  exatamente `'Airbnb'`, `'Booking.com'` ou `'Manual'`.
- **`background: 'white'` na linha 340**, no tooltip do gráfico de plataformas. Um retângulo
  branco num app de fundo `#101922`, com borda `#e2e8f0` e texto herdado — o pior contraste da
  tela, e num elemento que só aparece sob o ponteiro, onde ninguém revisa.

**Antes** (`Statistics.jsx:239-273`, gráfico de ocupação):

```jsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={occupancyData}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatMonth} />
    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
    <Tooltip contentStyle={{
      background: '#1a2535',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      color: '#e2e8f0',
    }} />
    <Legend />
    <Line type="monotone" dataKey="occupancy_rate" stroke="#2563eb" strokeWidth={2}
          name="Taxa de Ocupação" dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} />
  </LineChart>
</ResponsiveContainer>
```

**Depois:**

```jsx
const chart = useChartTheme();
const reduced = usePrefersReducedMotion();

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={occupancyData}>
    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
    <XAxis
      dataKey="month"
      stroke={chart.axis}
      tick={{ fill: chart.inkMuted, fontSize: 12 }}
      tickFormatter={formatMonth}
    />
    <YAxis
      stroke={chart.axis}
      tick={{ fill: chart.inkMuted, fontSize: 12 }}
      domain={[0, 100]}
      tickFormatter={(v) => `${v}%`}
    />
    <Tooltip
      cursor={{ stroke: chart.grid }}
      contentStyle={{
        background: chart.tooltipBg,
        color: chart.tooltipLabel,
        border: 'none',
        borderRadius: 'var(--lm-tooltip-radius)',
        boxShadow: 'var(--lm-elevation-2)',
      }}
      itemStyle={{ color: chart.tooltipLabel }}
      labelStyle={{ color: chart.tooltipLabel }}
    />
    {/* uma série: sem <Legend />. O título do card já nomeia a medida. */}
    <Line
      type="monotone"
      dataKey="occupancy_rate"
      name="Taxa de Ocupação"
      stroke={chart.series[0]}
      strokeWidth={2}
      dot={{ fill: chart.series[0], r: 4 }}
      activeDot={{ r: 6 }}
      isAnimationActive={!reduced}
    />
  </LineChart>
</ResponsiveContainer>
```

Sete mudanças, cada uma fechando uma regra: grade e eixo em token; tinta de eixo em
`chart-ink-muted`; tooltip na superfície invertida verificada; `<Legend />` removida por ser
série única; cor da linha vinda do slot 0; sombra do tooltip em `--lm-elevation-2` em vez de
borda semitransparente; animação respeitando a preferência.

`borderRadius` e `boxShadow` podem usar `var()` porque `contentStyle` vira atributo `style` no
DOM — declaração CSS, que resolve custom property. `stroke` e `fill` não podem, porque o Recharts
também os consome em JavaScript. **Na dúvida, valor.**

**Antes** (`Statistics.jsx:324-348`, plataformas):

```jsx
const COLORS = { Airbnb: '#FF5A5F', 'Booking.com': '#003580', Manual: '#64748b' };

<Pie data={platformChartData} outerRadius={100} fill="#8884d8" dataKey="value"
     label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
  {platformChartData.map((entry, i) => <Cell key={i} fill={COLORS[entry.name]} />)}
</Pie>
<Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
```

**Depois:**

```jsx
import { PLATFORM_SLOT } from '../components/charts/chartSlots';

<Pie
  data={platformChartData}
  outerRadius={100}
  dataKey="value"
  isAnimationActive={!reduced}
  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
  labelLine={false}
  style={{ fill: chart.ink }}          /* o rótulo é texto: tinta, não cor da fatia */
>
  {platformChartData.map((entry) => (
    <Cell key={entry.key} fill={chart.series[PLATFORM_SLOT[entry.key]]} />
  ))}
</Pie>
<Tooltip contentStyle={{ background: chart.tooltipBg, color: chart.tooltipLabel, border: 'none' }} />
```

Quatro mudanças estruturais: o `fill="#8884d8"` some junto com o conceito de cor padrão; o
`<Cell>` passa a indexar por **chave de domínio** (`entry.key` = `'airbnb'`, não `entry.name` =
`'Airbnb'`), o que sobrevive à tradução do rótulo; o rótulo textual vai para `chart.ink`; e o
tooltip deixa de ser branco.

### 8.6 Estados de gráfico

Todo gráfico tem quatro estados, e três deles não são o gráfico (`06-padroes.md`, contrato de
estados): **carregando** (`Skeleton` com a altura final, para o layout não pular quando os dados
chegam), **vazio** (`EmptyState` com o texto de `04-conteudo.md` §6.4 — nunca eixos vazios, que
parecem "zero" em vez de "sem dados"), **erro** (mensagem e ação de repetir) e **com dados**.

`Statistics.jsx` hoje tem um estado de carregamento na página inteira (`:131-140`) e um estado
vazio global (`:410-416`) que só aparece quando `totalBookings === 0` — mas cada gráfico
individual, quando o seu endpoint falha em `Promise.allSettled`, renderiza eixos sem série,
indistinguível de "zero reservas".

---

## 9. Testes visuais e de comportamento

### 9.1 O que existe hoje

Sem otimismo:

| Camada | Estado |
|---|---|
| Backend | pytest — `npm test` → `python -m pytest tests/ -v` |
| Contraste dos tokens | `python scripts/design/generate_tokens.py --check` — 68 pares nos dois temas, sai com código 1 em falha. **Passa** |
| Lint | `npm run quality` (ruff + ruff format + eslint), husky + lint-staged com `--max-warnings=0` |
| **Frontend — qualquer teste** | **Nenhum.** `frontend/package.json` não tem script `test` nem runner instalado |
| Paleta de gráficos | Validada **manualmente**. O resultado está registrado como comentário em `generate_tokens.py` (ΔE sob daltonismo 11,8 no claro / 9,0 no escuro para o pior par adjacente; 23,5/23,6 para all-pairs com duas séries), **não como código executável** |

Os dois últimos são os que importam. Não há teste de frontend porque não há componente de
frontend do sistema — a suíte não está atrasada, ela ainda não tem sujeito. E a validação da
paleta de gráficos, que é a garantia mais forte e mais cara do sistema, hoje é um comentário: se
alguém mudar a semente de uma rampa, o `--check` verifica os 68 pares de contraste e **não**
verifica a separação entre séries. A garantia sobrevive por disciplina, não por portão.

### 9.2 A ordem de introdução

Do mais barato e mais protetor para o mais caro. Cada item só é útil se o anterior existir.

| # | O que | Custo | Por que nesta posição |
|---|---|---|---|
| 1 | `--check` em `lint-staged` para `scripts/design/*.py` e `frontend/src/styles/tokens/*` | Duas linhas em `package.json` | O único teste que existe hoje não roda automaticamente. É o item de melhor razão custo/benefício do projeto inteiro |
| 2 | Portão de deriva: rodar o gerador e falhar se `git diff --exit-code frontend/src/styles/tokens/` não vier vazio | Um script | Prova que os gerados são de fato a saída do gerador. Sem ele, "arquivo gerado" é convenção, não fato |
| 3 | Promover a validação da paleta de gráficos de comentário para código (`--check` estendido, ou `--check-charts`) | Média — a matemática já está descrita no arquivo | É a garantia mais forte do sistema e a menos protegida. Enquanto for comentário, ela regride em silêncio |
| 4 | Portão de hexadecimal: reaproveitar o `grep` de §6.5 como `npm run quality:no-hex` | Uma linha | Impede que a migração ande para trás enquanto anda para frente |
| 5 | Vitest + jsdom + Testing Library, **junto com o primeiro componente** de `ui/`, nunca depois | Instalação + configuração | Escrever a suíte depois de vinte componentes prontos é reescrever vinte componentes |
| 6 | `eslint-plugin-jsx-a11y` com o mapa `components` (§5.4) | Uma dependência + config | É o que torna `IconButton` sem `aria-label` um erro em vez de uma opinião |
| 7 | `axe-core` sobre a árvore renderizada, logo após o runner | Uma dependência | Substitui o revisor de acessibilidade humano que o projeto não tem. Pega contraste de composição, que os pares de token não cobrem |
| 8 | Roteiro de teclado por componente, na mesma suíte do item 5 | Escrita, por componente | Tab, Shift+Tab, setas, Enter, Espaço, Esc, Home/End e a devolução de foco (`03-acessibilidade.md` §4) |
| 9 | Regressão visual **no runtime do Electron**, com baseline versionada por tema | Alto | Só quando houver componentes suficientes para a baseline ficar estável. Cedo demais, ela muda a cada commit e ninguém olha mais |
| 10 | Roteiros manuais por release: 200% de zoom, 320px de largura, troca de tema nos dois sentidos, `<select>` nativo nos dois temas, e a **verificação offline da fonte** (§7.5) | Uma hora por release | Coisas que valem mais escritas num roteiro do que automatizadas mal |

**Por componente**, o que a suíte do item 5 prova — o mínimo, não o desejável:

- Renderiza em **toda** variante e **todo** estado, nos dois temas e nas três densidades.
- Contrato de acessibilidade: nome, papel e estado expostos; `aria-*` presentes; `ref`
  encaminhado; `...rest` chegando ao elemento nativo; `className` mesclado e não substituído.
- Roteiro de teclado do componente, incluindo o retorno de foco ao acionador quando ele abre
  algo.
- Nenhum hexadecimal no `.css` do componente (o item 4 cobre isso globalmente).

### 9.3 O que não vale a pena agora

Igualmente importante, e mais fácil de errar por entusiasmo:

- **Storybook.** Um segundo pipeline de build, uma segunda configuração de Vite e uma segunda
  superfície de manutenção para uma biblioteca de vinte componentes com **um** consumidor. A rota
  `/__ui` temporária que a Fase 4 já prevê entrega a mesma matriz visual pelo custo de um arquivo
  — e é removida na Fase 12, o que o Storybook nunca é.
- **Matriz cross-browser.** Uma engine, fixada por `"electron": "^28.3.3"`. O que precisa ser
  garantido não é *qual* navegador, e sim que a suíte rode **no runtime do Electron** e não no
  Chrome que o desenvolvedor abre no `vite dev` — é o Electron que chega ao usuário.
- **Baseline visual antes da Fase 4.** Baseline de um produto em migração é ruído: cada fase muda
  a tela de propósito, e uma baseline que falha de propósito é ignorada em duas semanas.
- **Cobertura como meta numérica.** Vinte componentes com 90% de cobertura de linha e nenhum
  teste de teclado é pior que dez com roteiro de teclado completo. A métrica do sistema é a
  *Definition of Done* de `08-governanca.md` §8, que não tem crédito parcial.

---

## Lacunas
> **Registro autoritativo:** [`LACUNAS.md`](LACUNAS.md). A lista abaixo reflete o estado
> do dia em que este documento foi escrito e não é atualizada quando uma lacuna fecha —
> várias destas já foram fechadas por extensão do gerador.


O que este documento **não** conseguiu fechar. Cada item é regra em prosa hoje e pedido de token
ou de decisão amanhã.

| # | Lacuna | Regra em prosa enquanto durar |
|---|---|---|
| 1 | **Escala de tamanho de `Button` e `IconButton`.** Não existe `--lm-button-height-sm/-lg`; a altura vem de `--lm-density-control` | O eixo de tamanho do botão é `density`, não `size`. `Button` não expõe `size` (§5.2). Se um tamanho fixo for necessário, é pedido de token, não prop |
| 2 | **Geometria de marca de gráfico.** Não há token para espessura de linha, raio de ponto, raio de barra ou espessura de grade | Linha 2px; ponto r=4, ativo r=6; raio de barra `--lm-radius-xs` (4px); grade com traço `3 3`. Valores replicados em cada gráfico até existirem tokens |
| 3 | **Breakpoint em CSS.** `breakpoints.js` fecha o lado JS; o prelúdio de `@media` continua exigindo literal | Só `min-width`, só 600/840/1200/1600, sempre conferidos contra `primitive.breakpoint` em `tokens.json` (`02-layout.md` §2.3) |
| 4 | **Barra de rolagem.** `global.css:76-82` estiliza `::-webkit-scrollbar` com `--glass-2`; não há `--lm-scrollbar-*` | Trilho transparente, polegar `--lm-color-outline-variant`, polegar em hover `--lm-color-outline`, largura 8px. Migra para `lm.base` com esses tokens semânticos |
| 5 | **Mapa entidade → slot de gráfico.** `PLATFORM_SLOT` é constante JS, não token — e está certo assim, mas não tem portão | Vive em `components/charts/chartSlots.js`, `Object.freeze`, chaveado por chave de domínio e nunca por rótulo traduzido. Nenhum teste garante que ele não seja contornado |
| 6 | **Aplicação de `aria-label` obrigatório.** Depende de `eslint-plugin-jsx-a11y`, não instalado, e de `PropTypes`, não escrito | Enquanto não existirem, é item de revisão humana na *Definition of Done* — o modo de aplicação mais fraco possível, e assumidamente insuficiente (§5.4) |
| 7 | **Validação da paleta de gráficos como código.** A matemática de separação sob daltonismo é comentário em `generate_tokens.py`, não portão | Reexecutar a verificação manualmente a cada mudança de semente de `primary`, `success`, `tertiary`, `warning`, `error`, `chart-violet`, `chart-orange`, `chart-cyan` ou `chart-rose`, e a cada mudança da rampa `neutral`, que define `chart-surface` |
| 8 | **Hash de CSP para o script inline de tema.** Não há CSP hoje; se houver, o script de §3.4 quebra | Registrar o hash junto do script no momento em que uma CSP for adicionada. Sintoma da falha: o flash de tema volta, sem erro no console |
| 9 | **Pesos 600/700 no CSS legado.** 51 declarações que a Inter empacotada (400/500) sintetizaria | O commit que remove o `@import` migra os 51 pontos para `--lm-type-title-*-weight` e `--lm-type-label-*-weight`. Se for adiado, empacotar 600 temporariamente e registrar a remoção — nunca deixar a síntese acontecer em silêncio (§7.2) |

---

**Referências cruzadas.** Arquitetura e regra de referência de token: `01-fundamentos.md` §2.
Camadas de estado: `01-fundamentos.md` §7.5. Movimento e `prefers-reduced-motion`:
`01-fundamentos.md` §9. Breakpoints e densidade: `02-layout.md` §2 e §5. Anel de foco, teclado e
alvos: `03-acessibilidade.md` §3, §4 e §5. Rótulos, erros e estados vazios: `04-conteudo.md` §3,
§4 e §6. Anatomia dos componentes: `05-componentes.md`. Contrato de estados e padrões de
composição: `06-padroes.md`. Versionamento, processo de token, estratégia de testes e
*Definition of Done*: `08-governanca.md` §2, §3, §7 e §8. Fases e ordem de migração:
`PLANO_REFATORACAO.md`.
