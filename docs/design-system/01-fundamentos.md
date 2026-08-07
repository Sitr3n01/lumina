# 01 · Fundamentos

Este documento define as camadas que todo o resto do sistema consome: identidade, tokens,
cor, tipografia, espaçamento, forma, elevação, ícone e movimento. Nada aqui é preferência
pessoal — cada regra tem um token, um motivo e um teste. Se uma tela precisa de um valor que
não está aqui, ou a tela está errada ou o sistema tem uma lacuna registrada. Não há terceira
opção.

Os valores hexadecimais, tamanhos e curvas citados foram lidos de
`frontend/src/styles/tokens/tokens.json` e dos três arquivos `.css` gerados. Eles são a
fonte; este documento é o índice legível dela.

---

## 1. Identidade visual

### 1.1 O que "luz calma" significa

A filosofia está no [`README.md`](README.md). Aqui ela vira quatro decisões concretas.

**Superfície — nem papel, nem buraco.** O tema claro parte de `--lm-color-surface`
`#f7f9fd`: neutro de tom 98, com croma 4 na matiz 268, ou seja, um branco levemente frio, não
um branco de folha. O branco absoluto `#ffffff` existe uma única vez, como
`--lm-color-surface-container-lowest`, e serve para o degrau que precisa recuar mais que a
página. O tema escuro parte de `#111317` (tom 6), não de `#000000`. Preto puro está reservado
para `--lm-color-scrim` e `--lm-color-shadow` — duas coisas que não são superfície.

O ganho é físico: superfícies levemente tonais reduzem o brilho emitido numa tela grande
aberta o dia inteiro, e dão espaço para uma escada de cinco contêineres acima e abaixo da
página sem estourar nas pontas.

**Cor — uma só ação.** Existe uma única cor de ação no produto: `--lm-color-primary`. Todas
as outras famílias cromáticas têm significado reservado — `error`, `success`, `warning`,
`info`, `airbnb`, `booking`, e as oito séries de gráfico. Uma tela do LUMINA em repouso é
essencialmente neutra; a cor aparece onde existe ação, seleção, estado ou dado. Cor que não
significa nada é ruído com custo de atenção.

**Forma — o que é redondo se aperta.** Tudo que é acionável usa `--lm-radius-full`: botão,
ícone-botão, item de navegação, badge. Contêineres usam retângulos arredondados —
`--lm-radius-md` (12px) em card, `--lm-radius-xl` (24px) em dialog. A forma comunica
affordance antes da cor, e sobrevive ao daltonismo, ao tema escuro e ao alto contraste.

**Movimento — curto e informativo.** Nenhuma transição de interação direta passa de
`--lm-duration-emphasized` (320ms). Não há parallax, não há entrada escalonada de lista, não
há animação decorativa em laço — a única exceção é indicador de progresso indeterminado, que
é informação, não decoração.

### 1.2 O que o sistema deliberadamente não é

| Não é | Motivo |
|---|---|
| **Glassmorphism, blur, glow** | O CSS atual tem `backdrop-filter: blur(6px)` no overlay de modal e `--primary-glow: rgba(19,127,236,.25)` em `.btn-primary`. Blur é composição contínua de GPU num app aberto o dia inteiro, e reduz o contraste de tudo que está atrás dele. Glow espalha a cor de ação por uma área que não é acionável. |
| **Vitrine de marketing** | `display-lg` (57px) existe na escala e é marcado "raro no produto". A densidade-alvo é de ferramenta: alinhamento à esquerda, controles de 40px, tabela antes de card decorativo. |
| **Escuro por padrão** | O tema claro é o padrão do produto. O escuro tem exatamente os mesmos 57 papéis, não é um "modo alternativo" degradado. Hoje o app tem tema único escuro, com `#101922` cravado em `App.css`, `App.jsx` e `Sidebar.css`. |
| **Colorido** | Sete matizes de UI e quatro exclusivas de gráfico já são o teto. Não existe cor "de seção", "de página" ou "de humor". |
| **Neumorfismo, skeumorfismo, sombra interna** | Profundidade vem de superfície tonal e de uma sombra discreta. Nada finge ser plástico, vidro ou papel. |
| **Preto sobre branco puro** | `#000000` sobre `#ffffff` dá 21:1 — muito acima do necessário, e desconfortável em leitura prolongada. O par de leitura é `--lm-color-on-surface` sobre `--lm-color-surface`. |
| **Uma extensão visual das plataformas** | Airbnb e Booking.com aparecem como origem de um dado, em badge com rótulo. Nunca como tema de tela, cor de linha ou identidade de seção. |
| **Um clone de Material 3** | A inspiração é de princípios — escada tonal, papéis semânticos, contêiner tonal, densidade adaptativa. As matizes, a tipografia, a escala de densidade, os nomes e os limites são do LUMINA. |

---

## 2. Arquitetura de tokens

### 2.1 Os três níveis

| Nível | O que é | Muda com o tema? | Exemplos reais |
|---|---|---|---|
| **Primitivo** | Valor bruto, sem opinião de uso. Uma escada de tons, um degrau de espaço, uma duração. | Não | `--lm-palette-primary-40`, `--lm-space-16`, `--lm-radius-md`, `--lm-type-body-md-size`, `--lm-duration-standard`, `--lm-easing-emphasized` |
| **Semântico** | Papel na interface. Responde "para que serve", não "que valor tem". | **Sim — é a única camada que muda** | `--lm-color-primary`, `--lm-color-on-surface-variant`, `--lm-color-error-container`, `--lm-elevation-2`, `--lm-chart-series-1` |
| **Componente** | Decisão congelada de um componente específico. | Não diretamente — herda a mudança do nível semântico | `--lm-button-filled-bg`, `--lm-field-border-focus`, `--lm-dialog-radius`, `--lm-navigation-item-bg-selected` |

Os três níveis vivem em arquivos separados e gerados: `primitives.css`, `semantic.css`,
`components.css`, todos dentro de `@layer lm.tokens`.

### 2.2 A regra de referência

**Regra.** Para cor, um token de componente referencia **apenas** um token semântico. Nunca um
primitivo, nunca um hexadecimal.

**Justificativa.** A troca de tema acontece em um único lugar — o bloco `:root` /
`[data-theme="dark"]` de `semantic.css` redefine 57 papéis e a interface inteira acompanha.
Se um componente apontasse para `--lm-palette-primary-40`, esse componente ficaria azul-escuro
no tema escuro, onde a primária correta é `#b1c5ff`. Um único componente furando a regra
quebra o tema para aquele componente, e o bug é invisível até alguém abrir o modo escuro.

**Uso correto:**

```css
/* components.css — gerado */
--lm-button-filled-bg: var(--lm-color-primary);
--lm-card-outlined-border: var(--lm-color-outline-variant);
```

**Uso incorreto:**

```css
--lm-button-filled-bg: var(--lm-palette-primary-40);  /* congela o tema claro */
--lm-button-filled-bg: #005eb2;                        /* pior: nem participa do sistema */
```

**A exceção honesta — grandezas não-cromáticas.** Não existe camada semântica de espaço, raio
ou densidade, e não deve existir: `--lm-space-16` já é o significado, não há nada a interpretar
entre "16px" e "o padding do card". Então tokens de componente referenciam esses primitivos
diretamente, e isso está certo:

```css
--lm-card-padding: var(--lm-space-16);
--lm-button-padding-inline: var(--lm-space-24);
--lm-field-height: var(--lm-density-control);
```

**A segunda exceção — dimensões estruturais.** Alguns tokens de componente carregam valor
literal: `--lm-navigation-rail-width: 88px`, `--lm-menu-max-width: 280px`,
`--lm-snackbar-min-width: 344px`, `--lm-dialog-max-width: 560px`,
`--lm-focus-ring-width: 3px`. São dimensões que não pertencem a nenhuma escala e cuja
repetição em outro componente seria coincidência, não relação. Literal é aceito **só** no nível
de componente e **só** para dimensão estrutural — nunca para cor, nunca para espaçamento
interno, nunca para tipografia.

| | |
|---|---|
| **Impacto em acessibilidade** | O modo `--check` do gerador só consegue auditar contraste porque toda cor de produto passa pelos 57 papéis semânticos. Um hexadecimal solto num componente é um par que o teste nunca vê. Hoje o frontend tem 94 hexadecimais e 87 `rgba()` fora de token — 181 pares não auditados. |
| **Comportamento responsivo** | `--lm-density-control` muda de 40px para 48px sob `@media (pointer: coarse)`. Todo componente que referencia esse token acompanha sem uma linha de CSS adicional; todo componente com `height: 40px` literal não acompanha. |

### 2.3 Convenção de nomenclatura

```
--lm-<categoria>-<papel>-<variação>
```

| Categoria | Nível | Forma | Exemplo |
|---|---|---|---|
| `palette` | Primitivo | `--lm-palette-<família>-<tom>` | `--lm-palette-neutral-variant-30` |
| `space` | Primitivo | `--lm-space-<px>` | `--lm-space-24` |
| `radius` | Primitivo | `--lm-radius-<degrau>` | `--lm-radius-xl` |
| `font` | Primitivo | `--lm-font-<família>` | `--lm-font-mono` |
| `type` | Primitivo | `--lm-type-<estilo>-<propriedade>` | `--lm-type-label-sm-tracking` |
| `duration` / `easing` | Primitivo | `--lm-duration-<papel>` | `--lm-easing-decelerate` |
| `state` | Primitivo | `--lm-state-<estado>` | `--lm-state-pressed` |
| `z` | Primitivo | `--lm-z-<camada>` | `--lm-z-modal` |
| `density` | Primitivo | `--lm-density-<medida>` | `--lm-density-row` |
| `color` | Semântico | `--lm-color-<papel>[-<variação>]` | `--lm-color-on-primary-container` |
| `elevation` | Semântico | `--lm-elevation-<nível>` | `--lm-elevation-4` |
| `chart` | Semântico | `--lm-chart-<escala>-<índice>` | `--lm-chart-series-3` |
| *nome do componente* | Componente | `--lm-<componente>-<parte>[-<estado>]` | `--lm-field-border-focus` |

Três detalhes que a forma geral não conta:

- **`on-` é prefixo de papel, não variação.** `--lm-color-on-surface` significa "conteúdo que
  vai sobre `surface`". O par `on-X` / `X` é garantido pelo verificador de contraste;
  combinações cruzadas (`on-primary` sobre `primary-container`, por exemplo) não são
  garantidas por nada.
- **`--lm-chart-*` mora em `semantic.css` e troca com o tema**, apesar de o nome parecer
  categoria própria. É nível semântico.
- **`--lm-focus-*` é o único "componente" que não é um componente.** É uma preocupação
  transversal — o anel de foco de tudo — e ficou nesse nível porque tem parte (`ring`) e
  variação (`inverse`), como qualquer outro.

### 2.4 Por que o nome descreve função e nunca aparência

**Regra.** O nome de um token semântico descreve o papel que ele cumpre. Nunca a cor, o
brilho ou a sensação que ele produz.

**Justificativa, em números do próprio sistema.** `--lm-color-primary` vale `#005eb2` no tema
claro e `#b1c5ff` no escuro. Um nome como `--lm-color-blue-dark` seria uma mentira em um dos
dois temas — e a pessoa que o lesse no código escolheria errado metade das vezes. Pior:
`--lm-color-error` continua correto se amanhã a semente de matiz mudar de 28 para outro valor;
`--lm-color-red` viraria uma mentira permanente que ninguém tem coragem de renomear porque 40
arquivos a usam.

| Nome ruim | Nome do sistema | O que quebra no nome ruim |
|---|---|---|
| `--lm-color-blue` | `--lm-color-primary` | Vira falso no tema escuro |
| `--lm-color-light-gray` | `--lm-color-surface-container` | Vira falso no tema escuro (`#1d2023` não é cinza-claro) |
| `--lm-color-red` | `--lm-color-error` | Amarra a semântica à matiz |
| `--lm-color-muted-text` | `--lm-color-on-surface-variant` | "Muted" não diz sobre o quê o texto vai; o contraste depende do fundo |
| `--lm-shadow-soft` | `--lm-elevation-1` | Não ordena; não dá para saber se `soft` fica acima ou abaixo de `subtle` |

**A exceção legítima:** nomes de primitivos **podem** ser posicionais, porque primitivos não
carregam uso. `--lm-palette-primary-80` diz "família primária, tom 80", e o `80` é literalmente
o L\* daquela cor. Isso é descrição de coordenada, não de aparência — e é o que torna a rampa
auditável.

---

## 3. Cor

### 3.1 Como as rampas são derivadas

Nenhum hexadecimal do sistema foi escolhido no olho. `scripts/design/generate_tokens.py`
define 14 sementes em LCh(ab) — matiz e teto de croma — e produz, para cada uma, os 27 tons da
escala. A conversão é `lch_to_hex(L, C, h)`: **L\* e matiz são mantidos fixos; quando a cor não
cabe no gamut sRGB, só a croma cede**, por busca binária.

```python
"primary":  (281.0, 62.0, "Azul LUMINA — marca, ações primárias, seleção")
"error":    ( 28.0, 72.0, "Erro e ações destrutivas")
```

Duas consequências operacionais:

1. **Tom N tem L\* = N.** `--lm-palette-primary-40` e `--lm-palette-error-40` têm a mesma
   luminância CIE. Não aproximadamente: por construção.
2. **Afunilamento de croma nas pontas** (`CHROMA_TAPER = 0.55`). Com croma constante, matizes
   que o sRGB acomoda bem em alta luminância — ciano, verde — produziam contêineres neon no
   tema claro. A croma é reduzida conforme o tom se afasta de 50:
   `chroma_at(cap, tom) = cap · (1 − 0.55 · ((|tom − 50| / 50)²))`. Os tons médios, que são
   limitados pelo gamut de todo jeito, não mudam.

### 3.2 A propriedade que isso garante

A luminância relativa da fórmula de contraste do WCAG é uma função **exclusiva** da
luminância — não da matiz, não da saturação. E L\* é, por definição, a codificação perceptual
da luminância. Logo:

> **A razão de contraste entre dois tons depende apenas dos números dos tons. Trocar a matiz ou
> a croma de uma paleta não altera o contraste de nenhum par do sistema.**

O que isso compra na prática:

- `on-primary-container` (tom 10) sobre `primary-container` (tom 90) e `on-error-container`
  (tom 10) sobre `error-container` (tom 90) têm praticamente o mesmo contraste, porque são o
  mesmo par de tons.
- Rebrand é uma operação de uma linha. Mudar `"primary": (281.0, 62.0, …)` para outra matiz
  troca a marca inteira e **não pode** quebrar nenhum dos 68 pares verificados.
- O afunilamento de croma, que existe só por razão estética, é seguro justamente por isso: ele
  mexe em croma, e croma não entra na conta do contraste.
- A auditoria vira aritmética. Um par novo é aprovado ou reprovado pelos números dos tons antes
  de existir em pixel.

O corolário disciplinar: **a única coisa que pode quebrar o contraste do sistema é mudar o
mapeamento de tom de um papel.** Por isso o mapa `SEMANTIC_COLOR` do gerador é o artefato mais
sensível do repositório, e por isso `--check` roda depois de toda alteração de semente.

### 3.3 Papéis semânticos — tabela completa

57 papéis. Coluna "tom" no formato `família tomClaro/tomEscuro`, lida de `SEMANTIC_COLOR`.

#### Primária, secundária, terciária

| Token | Tom | Claro | Escuro | Uso |
|---|---|---|---|---|
| `--lm-color-primary` | primary 40/80 | `#005eb2` | `#b1c5ff` | Ação principal, seleção, foco, link |
| `--lm-color-on-primary` | primary 100/20 | `#ffffff` | `#003061` | Conteúdo sobre preenchimento primário |
| `--lm-color-primary-container` | primary 90/30 | `#d9e2ff` | `#004788` | Contêiner tonal de ênfase primária |
| `--lm-color-on-primary-container` | primary 10/90 | `#001b3c` | `#d9e2ff` | Conteúdo sobre o contêiner primário |
| `--lm-color-primary-fixed` | primary 90/90 | `#d9e2ff` | `#d9e2ff` | Superfície que **não** troca com o tema |
| `--lm-color-on-primary-fixed` | primary 10/10 | `#001b3c` | `#001b3c` | Conteúdo sobre a superfície fixa |
| `--lm-color-secondary` | secondary 40/80 | `#45617e` | `#b3c8e4` | Ênfase média; apoio calmo |
| `--lm-color-on-secondary` | secondary 100/20 | `#ffffff` | `#1c3247` | Conteúdo sobre preenchimento secundário |
| `--lm-color-secondary-container` | secondary 90/30 | `#d3e4fb` | `#2f4963` | **Indicador de seleção** — pílula de navegação, chip e linha selecionados, botão tonal |
| `--lm-color-on-secondary-container` | secondary 10/90 | `#0b1d2d` | `#d3e4fb` | Conteúdo sobre o contêiner de seleção |
| `--lm-color-tertiary` | tertiary 40/80 | `#00696c` | `#64d8db` | Acento expressivo pontual |
| `--lm-color-on-tertiary` | tertiary 100/20 | `#ffffff` | `#003738` | Conteúdo sobre preenchimento terciário |
| `--lm-color-tertiary-container` | tertiary 90/30 | `#9af1f3` | `#004f51` | Contêiner tonal de acento |
| `--lm-color-on-tertiary-container` | tertiary 10/90 | `#002021` | `#9af1f3` | Conteúdo sobre o contêiner terciário |

#### Superfícies

| Token | Tom | Claro | Escuro | Uso |
|---|---|---|---|---|
| `--lm-color-background` | neutral 98/6 | `#f7f9fd` | `#111317` | Fundo da janela |
| `--lm-color-on-background` | neutral 10/90 | `#1a1c1f` | `#e0e3e7` | Conteúdo sobre o fundo |
| `--lm-color-surface` | neutral 98/6 | `#f7f9fd` | `#111317` | Superfície-base de página, rail e app bar |
| `--lm-color-on-surface` | neutral 10/90 | `#1a1c1f` | `#e0e3e7` | **Texto principal** e fonte das camadas de estado |
| `--lm-color-surface-dim` | neutral 87/6 | `#d7dadf` | `#111317` | Área rebaixada; fundo de região inativa |
| `--lm-color-surface-bright` | neutral 98/24 | `#f7f9fd` | `#36393e` | Área realçada dentro de superfície escura |
| `--lm-color-surface-container-lowest` | neutral 100/4 | `#ffffff` | `#0c0e12` | Degrau mais recuado da escada |
| `--lm-color-surface-container-low` | neutral 96/10 | `#f1f4f8` | `#1a1c1f` | Card elevado, botão elevado, **superfície de gráfico** |
| `--lm-color-surface-container` | neutral 94/12 | `#ebeef2` | `#1d2023` | Menu, dropdown, app bar rolada |
| `--lm-color-surface-container-high` | neutral 92/17 | `#e6e8ed` | `#282a2e` | Card preenchido, dialog |
| `--lm-color-surface-container-highest` | neutral 90/22 | `#e0e3e7` | `#323539` | Fundo de campo de formulário |
| `--lm-color-surface-variant` | neutral-variant 90/30 | `#dbe3f0` | `#3d4756` | Superfície de apoio com viés cromático |
| `--lm-color-on-surface-variant` | neutral-variant 30/80 | `#3d4756` | `#bdc7d7` | **Texto secundário**, rótulo, ícone em repouso, placeholder |
| `--lm-color-inverse-surface` | neutral 20/90 | `#2e3135` | `#e0e3e7` | Snackbar e tooltip — superfícies invertidas |
| `--lm-color-inverse-on-surface` | neutral 95/20 | `#eef1f5` | `#2e3135` | Conteúdo sobre superfície invertida |
| `--lm-color-inverse-primary` | primary 80/40 | `#b1c5ff` | `#005eb2` | Ação dentro de superfície invertida; anel de foco invertido |

#### Estrutura

| Token | Tom | Claro | Escuro | Uso |
|---|---|---|---|---|
| `--lm-color-outline` | neutral-variant 50/60 | `#6c7889` | `#8692a3` | Contorno de componente **interativo** — verificado ≥3:1 |
| `--lm-color-outline-variant` | neutral-variant 80/30 | `#bdc7d7` | `#3d4756` | Contorno estrutural e divisor de tabela |
| `--lm-color-divider` | neutral-variant 87/25 | `#d2dbe8` | `#323c49` | Linha de separação entre itens de lista |
| `--lm-color-scrim` | neutral 0/0 | `#000000` | `#000000` | Véu atrás de dialog e drawer (com opacidade) |
| `--lm-color-shadow` | neutral 0/0 | `#000000` | `#000000` | Cor-fonte das sombras de elevação |

#### Estados semânticos

| Token | Tom | Claro | Escuro | Uso |
|---|---|---|---|---|
| `--lm-color-error` | error 40/80 | `#bb132d` | `#ffb3ad` | Erro, ação destrutiva, borda de campo inválido |
| `--lm-color-on-error` | error 100/20 | `#ffffff` | `#680012` | Conteúdo sobre preenchimento de erro |
| `--lm-color-error-container` | error 90/30 | `#ffdad6` | `#92001e` | Banner e bloco de erro |
| `--lm-color-on-error-container` | error 10/90 | `#410000` | `#ffdad6` | Conteúdo sobre o contêiner de erro |
| `--lm-color-success` | success 35/80 | `#005f37` | `#81d8a4` | Confirmação, estado saudável |
| `--lm-color-on-success` | success 100/20 | `#ffffff` | `#00391f` | Conteúdo sobre preenchimento de sucesso |
| `--lm-color-success-container` | success 90/30 | `#acf2c6` | `#00522f` | Banner de sucesso |
| `--lm-color-on-success-container` | success 10/90 | `#00210f` | `#acf2c6` | Conteúdo sobre o contêiner de sucesso |
| `--lm-color-warning` | warning 35/80 | `#754900` | `#ffb95f` | Atenção, dado potencialmente problemático |
| `--lm-color-on-warning` | warning 100/20 | `#ffffff` | `#462b00` | Conteúdo sobre preenchimento de aviso |
| `--lm-color-warning-container` | warning 90/30 | `#ffddb9` | `#653e00` | Banner de aviso |
| `--lm-color-on-warning-container` | warning 10/90 | `#281900` | `#ffddb9` | Conteúdo sobre o contêiner de aviso |
| `--lm-color-info` | primary 40/80 | `#005eb2` | `#b1c5ff` | Informação neutra — mesma matiz da primária |
| `--lm-color-on-info` | primary 100/20 | `#ffffff` | `#003061` | Conteúdo sobre preenchimento informativo |
| `--lm-color-info-container` | primary 90/30 | `#d9e2ff` | `#004788` | Banner informativo |
| `--lm-color-on-info-container` | primary 10/90 | `#001b3c` | `#d9e2ff` | Conteúdo sobre o contêiner informativo |

`info` é intencionalmente idêntico a `primary`. Informação neutra não merece uma matiz própria,
e ter o token separado permite que ela ganhe uma no futuro sem tocar em nenhum componente.

#### Identidade de plataforma

| Token | Tom | Claro | Escuro | Uso |
|---|---|---|---|---|
| `--lm-color-airbnb` | airbnb 40/80 | `#be0039` | `#ffb3b4` | Cor de identificação da origem Airbnb |
| `--lm-color-airbnb-container` | airbnb 92/25 | `#ffe1e1` | `#7c0022` | Fundo do badge de origem Airbnb |
| `--lm-color-on-airbnb-container` | airbnb 10/90 | `#40000a` | `#ffdad9` | Rótulo do badge Airbnb |
| `--lm-color-booking` | booking 40/80 | `#0061a3` | `#a5c8ff` | Cor de identificação da origem Booking.com |
| `--lm-color-booking-container` | booking 92/25 | `#dde9ff` | `#003d6a` | Fundo do badge de origem Booking.com |
| `--lm-color-on-booking-container` | booking 10/90 | `#001d36` | `#d4e3ff` | Rótulo do badge Booking.com |

### 3.4 Regras do tema claro

| Regra | Justificativa |
|---|---|
| A página é `--lm-color-surface` (`#f7f9fd`), nunca `#ffffff`. | Reduz o brilho emitido e deixa `surface-container-lowest` livre para ser o degrau que recua. |
| **A escada de contêineres escurece conforme sobe.** `lowest #ffffff` → `low #f1f4f8` → `container #ebeef2` → `high #e6e8ed` → `highest #e0e3e7`. | É contraintuitivo de propósito: num fundo claro, "mais claro" não pode significar "mais alto", porque não sobra alcance acima do branco. Quem carrega o sinal de altura é a sombra (ver §7). |
| Texto principal é `--lm-color-on-surface`; secundário é `--lm-color-on-surface-variant`. Não existe um terceiro nível. | Um terceiro nível ou repete o segundo ou cai abaixo de 4.5:1. Hoje o app tem três (`--text-main`, `--text-muted`, `--text-disable`), e o terceiro é usado em `.field-help` e `::placeholder` — texto que precisa ser lido. |
| Campo de formulário usa `--lm-field-bg` (`surface-container-highest`, `#e0e3e7`), o degrau mais alto. | O campo é a área que mais precisa se distinguir da página. É o único componente que usa `highest`. |
| Sombra é discreta: `--lm-elevation-1` abre em `rgba(0,0,0,.06)`. | Sombra forte sobre superfície clara vira sujeira cinza. |

### 3.5 Regras do tema escuro

| Regra | Justificativa |
|---|---|
| A página é `#111317` (tom 6), nunca `#000000`. | Preto puro maximiza o contraste com texto claro e produz halo em telas OLED; e não deixa alcance para recuar (`surface-container-lowest` é `#0c0e12`). |
| **A escada clareia conforme sobe.** `lowest #0c0e12` → `low #1a1c1f` → `container #1d2023` → `high #282a2e` → `highest #323539`. | Aqui o sinal tonal concorda com a intuição, e por isso ele — não a sombra — carrega a profundidade (ver §7). |
| As cores de conteúdo invertem de tom, não de papel: `primary` vai de tom 40 para 80, `on-primary` de 100 para 20. | Um tom 40 saturado sobre `#111317` não atinge 4.5:1 e vibra. O mesmo par de papéis com tons trocados atinge. |
| `error` no escuro é `#ffb3ad`, um rosa claro — não vermelho. | Vermelho escuro sobre fundo escuro é ilegível. O que comunica erro é a matiz mais o ícone mais o rótulo, não a escuridão. |
| `--lm-color-primary-fixed` e `--lm-color-on-primary-fixed` **não trocam** entre temas (`#d9e2ff` / `#001b3c`). | Existem para o caso raro de uma superfície precisar ser idêntica nos dois temas. Fora desse caso, usá-los é bug. |
| `color-scheme: dark` é declarado no mesmo bloco dos tokens. | Faz o Chromium do Electron pintar scrollbar, `<select>` nativo e caret corretamente. O código atual precisa de `select { color-scheme: dark }` avulso justamente por não ter isso. |

**Como o tema é selecionado.** `prefers-color-scheme: dark` aplica o tema escuro em
`:root:where(:not([data-theme="light"]))`; `:root[data-theme="dark"]` aplica o escuro
explicitamente. O `:where()` tem especificidade zero, então a escolha manual vence a
preferência do sistema **nos dois sentidos** — claro forçado sobre SO escuro, e escuro forçado
sobre SO claro. Nenhum `!important` é necessário.

### 3.6 Contraste

| Situação | Mínimo | Onde |
|---|---|---|
| Texto normal | 4.5:1 | Tudo até `title-lg` (22px) inclusive |
| Texto grande | 3:1 | `headline-sm` (24px) e acima |
| Componente não-textual, borda, ícone com significado, indicador de estado | 3:1 | `outline`, `primary`, `error`, `success`, `warning`, `tertiary` contra as superfícies |
| Conteúdo desabilitado | Isento | `--lm-state-disabled-content` (0.38) |

**"Texto grande" na escala do LUMINA começa em `headline-sm` (24px).** `title-lg` tem 22px e
peso 400 — não qualifica pelo critério do WCAG (≥24px, ou ≥18.66px com peso ≥700), e o sistema
não tem peso 700. Na prática: **4.5:1 é o piso para praticamente todo texto do produto.**

**O teste.** `python scripts/design/generate_tokens.py --check` percorre 34 pares por tema, 68
no total, e sai com código 1 se algum ficar abaixo do mínimo. Todos passam nesta versão.

**A regra que fecha o buraco.** Uma combinação de cores que **não está** em `CONTRAST_PAIRS`
não está verificada, e usá-la em produto é proibido até ela ser adicionada à lista e passar. O
teste é a definição de "combinação permitida", não um relatório sobre ela.

**Isenção de desabilitado, com limite.** `--lm-state-disabled-content: 0.38` quebra o contraste
de propósito — o WCAG isenta componentes inativos. O limite: essa mesma opacidade **nunca** pode
ser usada para conteúdo apenas secundário. Secundário tem papel próprio
(`--lm-color-on-surface-variant`), verificado a 4.5:1.

### 3.7 Restrições — o que nunca fazer com cor

| # | Nunca | Por quê | Faça |
|---|---|---|---|
| 1 | Hexadecimal ou `rgba()` literal em código de componente | O par nunca é auditado; o tema não troca. Há 94 hex e 87 `rgba()` fora de token hoje | Token semântico |
| 2 | Cor como único portador de significado | Daltonismo, alto contraste, impressão e monocromia perdem a informação | Cor **+** ícone **+** rótulo |
| 3 | `opacity` para escurecer ou clarear texto | Opacidade sobre fundo desconhecido produz contraste imprevisível | `--lm-color-on-surface-variant` |
| 4 | `--lm-color-primary` em elemento não interativo | Primária significa "ação ou seleção". Um título azul promete um clique que não existe | `--lm-color-on-surface` |
| 5 | Dois preenchimentos `--lm-color-primary` na mesma região | Duas ações primárias é nenhuma ação primária | Uma preenchida + tonais/outlined |
| 6 | `--lm-color-error` para ênfase | Erro é reservado a erro e destruição. Gastá-lo em destaque tira o peso de quando importa | `--lm-color-primary-container` |
| 7 | Cruzar pares `on-` com contêineres de outro nível | Só `on-X` sobre `X` é verificado | O par correspondente |
| 8 | `--lm-palette-*` em componente | Congela o tema claro no componente | O papel semântico |
| 9 | `--lm-chart-*` fora de gráfico, ou cor de UI dentro de gráfico | As séries foram ordenadas e verificadas contra `surface-container-low` e para daltonismo; fora dali a garantia não vale | Manter os dois mundos separados |
| 10 | Superfície fixa por tema (`#101922`, `#16202a`) | O tema deixa de trocar naquele ponto | `--lm-color-surface*` |
| 11 | Gradiente, `glow` ou `box-shadow` colorido em superfície de produto | Cor espalhada em área não acionável; e nenhum ponto do gradiente é auditável | Contêiner tonal |
| 12 | Ciclar a paleta categórica de gráfico além da 8ª série | A ordem dos 8 slots é o mecanismo de segurança para daltonismo, não estética | A 9ª série vira "Outros" ou small multiples |

### 3.8 Cores de plataforma

**Regra.** `--lm-color-airbnb` e `--lm-color-booking` identificam a **origem de um dado**.
Nunca aparecem sem um rótulo textual ao lado.

**Justificativa.** A cor da plataforma é a única no sistema cujo significado depende de
conhecimento externo. Quem nunca associou vermelho a Airbnb não decodifica um ponto vermelho —
e quem associa vermelho a "erro", que é o que o resto do sistema ensina, decodifica **errado**.
O rótulo não é redundância; é o portador do significado, e a cor é o reforço.

**Uso correto** — badge com contêiner tonal e texto:

```jsx
<span className="lm-badge-platform lm-badge-platform--airbnb">Airbnb</span>
```

```css
.lm-badge-platform--airbnb {
  background: var(--lm-color-airbnb-container);
  color: var(--lm-color-on-airbnb-container);
}
```

**Uso incorreto:**

- Ponto, barra lateral ou linha de calendário colorida sem texto.
- Fundo de linha de tabela inteira na cor da plataforma.
- Série de gráfico colorida por plataforma — gráfico usa `--lm-chart-series-*`, e só.
- Cabeçalho, aba ou página tematizada pela plataforma.
- `--lm-color-airbnb` como cor de texto sobre superfície de página: só o par
  `on-airbnb-container` sobre `airbnb-container` está verificado.

**Nota de identidade.** `--lm-color-airbnb` (`#be0039`) e `--lm-color-booking` (`#0061a3`) não
são os hexadecimais de marca das plataformas. São tons 40/80 de rampas do LUMINA nas matizes 21
e 272, derivados pelo mesmo gerador que todo o resto — por isso obedecem à matemática de
contraste do sistema e trocam de tema junto com ele. O badge indica de onde o dado veio; não
reproduz a identidade de ninguém. O código atual usa `#ff385c` e `#0071c2` literais em
`.platform-airbnb` / `.platform-booking`, fora de qualquer verificação.

| | |
|---|---|
| **Impacto em acessibilidade** | Com rótulo textual, a origem é legível por leitor de tela, sobrevive ao alto contraste do Windows e à impressão em preto e branco. Sem rótulo, ela some nos três casos. |
| **Comportamento responsivo** | Em `compact` o badge encolhe para `label-sm` (11px) mas **não** vira ponto colorido. Se não couber texto, a origem sai do badge e entra na linha de metadados. |

---

## 4. Tipografia

### 4.1 Família e fallback

```css
--lm-font-sans: "Inter", "Inter Variable", system-ui, -apple-system, "Segoe UI", "Noto Sans", sans-serif;
--lm-font-mono: "JetBrains Mono", "Cascadia Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;
```

**Regra.** Inter é **auto-hospedada e empacotada**, servida do disco local. `system-ui` é o
fallback real.

**Justificativa.** `global.css` abre com
`@import url('https://fonts.googleapis.com/css2?family=Inter…')`. O LUMINA é um app Electron
100% local e offline; sem rede, esse `@import` falha e toda a tipografia cai para o fallback do
sistema — com métricas diferentes, o que reflui o layout inteiro. Empacotar não é preferência,
é correção de bug.

Consequências operacionais:

- Empacotar **apenas os pesos 400 e 500** (ou o arquivo variável, restringido a essa faixa). O
  `@import` atual pede cinco pesos — 300, 400, 500, 600, 700 — e o sistema usa dois.
- `font-display: swap` deixa de importar: sem rede não há troca; a fonte é local.
- `--lm-font-mono` não precisa de empacotamento. A cadeia degrada para `Cascadia Mono` e
  `Consolas`, presentes no Windows, e `ui-monospace` cobre o resto. Se `JetBrains Mono` for
  empacotada, é uma melhoria opcional, não um requisito.

### 4.2 A escala completa

16 estilos. Todos os tamanhos em `rem` para respeitar o zoom e a fonte-base do usuário. Todos
os `line-height` são **múltiplos exatos de 4px**, o que faz qualquer bloco de texto cair na
grade de espaçamento.

| Token base | Tamanho | Altura | Peso | Tracking | Uso |
|---|---|---|---|---|---|
| `--lm-type-display-lg-*` | 3.5625rem · 57px | 4rem · 64px | 400 | -0.0044em | Marketing e telas de foco; raro no produto |
| `--lm-type-display-md-*` | 2.8125rem · 45px | 3.25rem · 52px | 400 | 0em | Números-herói de dashboard |
| `--lm-type-display-sm-*` | 2.25rem · 36px | 2.75rem · 44px | 400 | 0em | Valores de destaque em cards de estatística |
| `--lm-type-headline-lg-*` | 2rem · 32px | 2.5rem · 40px | 400 | 0em | Título de página em telas `expanded`+ |
| `--lm-type-headline-md-*` | 1.75rem · 28px | 2.25rem · 36px | 400 | 0em | Título de página padrão |
| `--lm-type-headline-sm-*` | 1.5rem · 24px | 2rem · 32px | 400 | 0em | Título de seção maior; título de página em `compact` |
| `--lm-type-title-lg-*` | 1.375rem · 22px | 1.75rem · 28px | 400 | 0em | Título de dialog e de painel |
| `--lm-type-title-md-*` | 1rem · 16px | 1.5rem · 24px | 500 | 0.0094em | Título de card e de grupo de formulário |
| `--lm-type-title-sm-*` | 0.875rem · 14px | 1.25rem · 20px | 500 | 0.0063em | Subtítulo, cabeçalho de lista |
| `--lm-type-body-lg-*` | 1rem · 16px | 1.5rem · 24px | 400 | 0.0313em | Texto corrido em telas de leitura |
| `--lm-type-body-md-*` | 0.875rem · 14px | 1.25rem · 20px | 400 | 0.0156em | **Corpo padrão da interface** |
| `--lm-type-body-sm-*` | 0.75rem · 12px | 1rem · 16px | 400 | 0.025em | **SOMENTE metadados** — nunca texto principal |
| `--lm-type-label-lg-*` | 0.875rem · 14px | 1.25rem · 20px | 500 | 0.0063em | Rótulo de botão, aba e item de navegação |
| `--lm-type-label-md-*` | 0.75rem · 12px | 1rem · 16px | 500 | 0.0313em | Rótulo de campo, chip, badge |
| `--lm-type-label-sm-*` | 0.6875rem · 11px | 1rem · 16px | 500 | 0.0455em | Cabeçalho de tabela, microrrótulo |
| `--lm-type-code-*` | 0.8125rem · 13px | 1.25rem · 20px | 400 | 0em | IDs, código, dados técnicos (`--lm-font-mono`) |

Cada estilo tem quatro tokens: `-size`, `-line`, `-weight`, `-tracking`. Aplicar um estilo é
aplicar os quatro — usar só o tamanho quebra a altura de linha e o tracking calibrado para
aquele tamanho.

```css
.lm-card__title {
  font-size: var(--lm-type-title-md-size);
  line-height: var(--lm-type-title-md-line);
  font-weight: var(--lm-type-title-md-weight);
  letter-spacing: var(--lm-type-title-md-tracking);
}
```

**Só existem dois pesos: 400 e 500.** O sistema não tem negrito. Ênfase vem de tamanho, de
espaço e de posição — nessa ordem — antes de vir de peso. Hoje `global.css` usa peso 600 em
sete regras (`.empty-state h3`, `.form-section-title`, `.section-title`, `.modal-header h2`,
`.badge`, `.platform-badge`, `.companion-number`); todas migram para `title-*` ou `label-*`.

**Tracking negativo aparece uma única vez**, em `display-lg`. Texto grande precisa de tracking
menor; texto pequeno precisa de mais. É por isso que `label-sm` (11px) tem 0.0455em e
`display-lg` (57px) tem −0.0044em — a curva não é decorativa, é compensação óptica.

### 4.3 Regras de uso

| Regra | Justificativa | Uso incorreto |
|---|---|---|
| **Corpo nunca abaixo de 14px.** `body-md` é o piso da prosa. | 14px é o limite confortável de leitura prolongada num monitor de mesa. Abaixo disso a taxa de erro de leitura sobe e o zoom vira obrigatório. | `.platform-badge` a 11px com `text-transform: uppercase`; `.field-help` a 12px carregando instrução de preenchimento. |
| **`body-sm` (12px) é SOMENTE metadado.** Timestamp, contador, unidade, origem, "há 3 dias". | Metadado é lido por varredura, não por leitura. Se a informação precisa ser lida para a tarefa ser concluída, ela não é metadado. | Texto de ajuda de campo, mensagem de erro, descrição de opção. |
| **Números tabulares em toda coluna de números.** `font-variant-numeric: tabular-nums`. | Sem isso, `1` é mais estreito que `8` em Inter, as colunas desalinham e comparar valores exige leitura dígito a dígito em vez de comparação visual. | Valores monetários, contagens e datas em largura proporcional. |
| **Mono só em código e identificador.** `--lm-font-mono` com `--lm-type-code-*`. | Monoespaçada sinaliza "isto é literal, copie exatamente" — ID de reserva, hash, trecho de template, chave de configuração. Usada em prosa, ela grita sem significar nada. | Rótulo, título, número em card de estatística. |
| **Máximo de 3 estilos tipográficos por bloco de conteúdo.** | Cada estilo a mais é um nível hierárquico a mais para o leitor decodificar. | Card com título, subtítulo, valor, unidade, rodapé e badge, cada um num estilo. |
| **Medida de leitura de 45–75 caracteres** em `body-lg`/`body-md` corrido. | Linha longa faz o olho perder a volta. | Parágrafo ocupando 1600px de largura em tela `xlarge`. |

### 4.4 A ordem da hierarquia

**Regra.** Hierarquia se constrói nesta ordem, e cada recurso só entra depois de o anterior se
esgotar:

**1. Tamanho → 2. Espaçamento → 3. Posição → 4. Peso → 5. Cor.**

**Justificativa.** Tamanho e espaço funcionam em monocromia, no alto contraste do Windows, na
impressão e para quem não distingue matizes. Cor é o único recurso da lista que falha em todos
esses casos — por isso é o último, e nunca o único. Peso vem antes da cor porque o sistema só
tem dois pesos: quando ele se esgota, se esgotou mesmo.

**Uso correto** — o título de uma seção se distingue por ser maior (`title-md` contra
`body-md`), ter 24px acima e 8px abaixo, e vir primeiro. Ele é `--lm-color-on-surface`, a
mesma cor do corpo.

**Uso incorreto** — o título tem o mesmo tamanho do corpo, o mesmo espaçamento, e se distingue
só por ser `--lm-color-primary`. Em monocromia, a seção some. E o azul promete um link.

| | |
|---|---|
| **Impacto em acessibilidade** | Tamanhos em `rem` respeitam a fonte-base do sistema; um usuário que configura 20px de base recebe a escala inteira ampliada. Alturas de linha fixas em `rem` acompanham. A hierarquia por tamanho/espaço sobrevive ao modo de alto contraste, que descarta cores de autor. |
| **Comportamento responsivo** | Título de página usa `headline-lg` (32px) em `expanded`+ e `headline-sm` (24px) em `compact` — os dois degraus estão previstos na coluna "uso" da escala. Corpo **não** muda de tamanho por breakpoint: 14px é 14px em qualquer largura. |

---

## 5. Espaçamento

### 5.1 A escala

Base de 4px. 14 degraus, um único sub-degrau.

| Token | Valor | Significado |
|---|---|---|
| `--lm-space-0` | 0px | Colapso deliberado — bordas coladas, tabela sem respiro |
| `--lm-space-2` | 2px | **Sub-grade.** Ajuste óptico apenas: `--lm-focus-ring-offset`, deslocamento de badge. Nunca layout |
| `--lm-space-4` | 4px | Relação mais forte possível — rótulo e seu valor, ícone e texto colados |
| `--lm-space-8` | 8px | Dentro de um componente — `--lm-button-gap`, separação de chips |
| `--lm-space-12` | 12px | Entre irmãos de um mesmo grupo — é o `--lm-density-gap` do nível `default` |
| `--lm-space-16` | 16px | Padding de contêiner — `--lm-card-padding`, `--lm-field-padding-inline` |
| `--lm-space-20` | 20px | Passo intermediário. **Evite**: só quando 16 aperta e 24 quebra a coluna |
| `--lm-space-24` | 24px | Padding de superfície maior e separação entre grupos — `--lm-dialog-padding`, `--lm-button-padding-inline` |
| `--lm-space-32` | 32px | Entre seções da mesma página |
| `--lm-space-40` | 40px | Margem de página em telas `expanded`+ |
| `--lm-space-48` | 48px | Entre blocos de conteúdo não relacionados |
| `--lm-space-64` | 64px | Respiro vertical de topo; estado vazio compacto |
| `--lm-space-80` | 80px | Estado vazio, tela de foco |
| `--lm-space-96` | 96px | Máximo do sistema — separação editorial em tela `xlarge` |

### 5.2 Proximidade

**Regra.** O espaço **dentro** de um grupo é sempre menor que o espaço **ao redor** dele. A
diferença precisa ser de pelo menos um degrau da escala.

**Justificativa.** Agrupamento é percebido antes de qualquer borda, cor ou título ser lido. Se
rótulo e campo têm 12px entre si e campos vizinhos também têm 12px, não há grupo — há seis
elementos soltos, e o leitor precisa ler todos para descobrir a estrutura.

**Uso correto** num formulário:

| Relação | Degrau |
|---|---|
| Rótulo → seu campo | `--lm-space-4` |
| Campo → seu texto de ajuda ou erro | `--lm-space-4` |
| Campo → campo seguinte | `--lm-space-16` |
| Grupo de campos → grupo seguinte | `--lm-space-24` |
| Seção → seção | `--lm-space-32` |

**Uso incorreto** — `.form-grid` usa `gap: 20px` uniforme entre campos e `.label` usa
`margin-bottom: 6px`: 6px não está na escala, e 20px entre campos não deixa distância para o
degrau seguinte separar grupos.

### 5.3 Proibição de valor arbitrário

**Regra.** Qualquer valor de espaçamento fora da escala é bug, inclusive em `style={{}}`.

**Justificativa.** Uma escala existe para que a diferença entre dois espaços seja **legível**.
Com 4, 8, 12, 16, 24 o leitor percebe degraus. Com 6, 10, 13, 20, 22 ele percebe ruído — e a
próxima pessoa a mexer no arquivo escolhe mais um valor "quase igual", porque nenhum é
autoritativo.

Estado atual: `global.css` usa 3px, 6px, 10px, 28px, 36px e 60px em padding, gap e margem,
todos fora da escala. Há 171 `style={{}}` no frontend — AISuggestions.jsx (55),
CondoTemplate.jsx (43), Settings.jsx (16), Dashboard.jsx (15), Login.jsx (11), Documents.jsx
(8), Sidebar.jsx (7) — e cada um é um lugar onde a escala não chega.

| | |
|---|---|
| **Impacto em acessibilidade** | Espaço é o principal criador de grupo perceptual e de região navegável. Ele também define a distância entre alvos adjacentes: dois botões de 40px separados por 4px são facilmente confundidos por quem tem tremor ou usa trackpad. Mínimo de `--lm-space-8` entre alvos interativos adjacentes. |
| **Comportamento responsivo** | Margem de página cai de `--lm-space-40` (`expanded`+) para `--lm-space-16` (`compact`). O espaçamento **interno** dos componentes não muda por breakpoint — muda por densidade, via `--lm-density-gap` (16 / 12 / 8px). |

---

## 6. Formas e cantos

### 6.1 A escala de raios

| Token | Valor | Papel |
|---|---|---|
| `--lm-radius-none` | 0 | Elemento que encosta na borda do contêiner; tabela edge-to-edge |
| `--lm-radius-xs` | 4px | Superfície pequena e transitória — snackbar, tooltip |
| `--lm-radius-sm` | 8px | Controle retangular — campo, chip |
| `--lm-radius-md` | 12px | Contêiner de conteúdo — card, menu |
| `--lm-radius-lg` | 16px | Sem componente atribuído nesta versão |
| `--lm-radius-xl` | 24px | Superfície modal grande — dialog |
| `--lm-radius-2xl` | 32px | Sem componente atribuído nesta versão |
| `--lm-radius-full` | 999px | Tudo que é acionável e tudo que é pílula |

`lg` e `2xl` existem para painel lateral e folha inferior, que ainda não têm componente
especificado. Enquanto não tiverem, **não os use**: um raio sem regra de uso vira raio
aleatório.

### 6.2 Aplicação por componente

Lida de `components.css` — esta é a tabela normativa, não uma sugestão.

| Componente | Token | Raio |
|---|---|---|
| Botão | `--lm-button-radius` | `full` |
| Ícone-botão | `--lm-icon-button-radius` | `full` |
| Item de navegação | `--lm-navigation-item-radius` | `full` |
| Badge | `--lm-badge-radius` | `full` |
| Campo | `--lm-field-radius` | `sm` (8px) |
| Chip | `--lm-chip-radius` | `sm` (8px) |
| Card | `--lm-card-radius` | `md` (12px) |
| Menu | `--lm-menu-radius` | `md` (12px) |
| Dialog | `--lm-dialog-radius` | `xl` (24px) |
| Snackbar | `--lm-snackbar-radius` | `xs` (4px) |
| Tooltip | `--lm-tooltip-radius` | `xs` (4px) |

O padrão por trás da tabela: **acionável é pílula, contêiner é retângulo arredondado, e o raio
cresce com o tamanho da superfície.** Um raio de 24px num botão de 40px de altura já é
praticamente pílula; um raio de 4px num dialog de 560px parece um erro de renderização. O raio
é proporcional à massa que ele contorna.

O par snackbar/tooltip a 4px é deliberado: são as duas superfícies mais efêmeras do sistema, e
um raio pequeno as faz parecer notas sobrepostas em vez de contêineres do layout.

### 6.3 Geometria aninhada

**Regra.** Quando um elemento arredondado fica dentro de outro elemento arredondado:

```
raio interno = raio externo − padding entre eles
```

Se o resultado for zero ou negativo, o elemento interno usa `--lm-radius-none`.

**Justificativa.** Quando a diferença não é respeitada, as duas curvas ficam concêntricas mas
com centros diferentes, e a espessura da moldura varia ao longo do canto — o olho lê isso como
desalinhamento antes de conseguir nomear o motivo. É o mesmo motivo pelo qual uma capa de
celular tem raio maior que o aparelho.

**Uso correto:**

```css
/* Miniatura dentro de um card, com 4px de moldura. */
.lm-card { border-radius: var(--lm-radius-md); padding: var(--lm-space-4); }  /* 12px */
.lm-card__thumb { border-radius: var(--lm-radius-sm); }                        /* 12 − 4 = 8px ✔ */
```

**Uso incorreto:**

```css
/* Card padrão: raio 12px, padding 16px. 12 − 16 = −4. */
.lm-card { border-radius: var(--lm-radius-md); padding: var(--lm-space-16); }
.lm-card__inner { border-radius: var(--lm-radius-md); }  /* ✘ dois raios de 12px sem relação */
```

Com o padding padrão de card (`--lm-space-16`), o resultado é sempre negativo — ou seja, **o
conteúdo interno de um card padrão não deve ser arredondado**. Se ele precisa ser, o padding
tem que encolher, não o raio crescer.

Corolário: se o interno encosta em uma borda do externo (imagem sangrando no topo do card), o
interno herda o raio externo **naquela borda** e usa `none` nas outras.

| | |
|---|---|
| **Impacto em acessibilidade** | Forma é um canal de informação que sobrevive à monocromia e ao alto contraste. `full` marcando "acionável" é uma dica redundante à cor — o tipo de redundância que o sistema quer. Cuidado com o inverso: um badge com `--lm-radius-full` não pode parecer um botão; ele se distingue por altura (16px contra 40px) e por não ter estado de hover. |
| **Comportamento responsivo** | Raio não escala com o viewport. O que muda é qual componente aparece: em `compact`, um dialog que vira folha de tela cheia perde os cantos inferiores (`--lm-radius-xl` no topo, `--lm-radius-none` embaixo), porque canto arredondado contra a borda do dispositivo é um vazio sem função. |

---

## 7. Bordas, divisores e elevação

### 7.1 Os três papéis de linha

| Token | Claro | Escuro | Papel | Contraste exigido |
|---|---|---|---|---|
| `--lm-color-outline` | `#6c7889` | `#8692a3` | Contorno de componente **interativo** — `--lm-field-border`, `--lm-button-outlined-border` | ≥3:1 contra a superfície, **verificado** |
| `--lm-color-outline-variant` | `#bdc7d7` | `#3d4756` | Contorno estrutural que não precisa ser percebido isoladamente — `--lm-card-outlined-border`, `--lm-chip-border`, `--lm-table-divider` | Nenhum — é decoração de agrupamento |
| `--lm-color-divider` | `#d2dbe8` | `#323c49` | Separação entre itens de uma lista | Nenhum |

**A distinção que importa:** `outline` é obrigação de acessibilidade — é o que informa onde
começa e termina um controle, e o WCAG exige 3:1 para isso. `outline-variant` e `divider` são
organização visual; se sumissem, nada ficaria inoperável. Usar `outline-variant` na borda de um
campo é um bug de acessibilidade, não uma escolha estética.

**Largura.** 1px em toda borda estrutural. As duas exceções são tokens:
`--lm-field-border-width-focus` (2px) e `--lm-focus-ring-width` (3px), com
`--lm-focus-ring-offset` de 2px.

**Regra de economia.** Uma linha só se justifica quando o espaço não resolve. Antes de somar um
divisor, tente `--lm-space-24`. Divisor dentro de card que já tem borda, mais divisor entre
seções, mais borda em cada linha de tabela, produz uma grade que compete com o conteúdo. O
princípio 3.4 do README ("divisores em excesso") é literal.

### 7.2 Os seis níveis de elevação

| Nível | Token de sombra (claro) | Token de sombra (escuro) | Superfície acompanhante | Onde |
|---|---|---|---|---|
| **0** | `none` | `none` | `--lm-color-surface` ou `--lm-color-surface-container-high` | Página, card preenchido em repouso |
| **1** | `0 1px 2px rgba(0,0,0,.06), 0 1px 3px 1px rgba(0,0,0,.04)` | `0 1px 2px rgba(0,0,0,.30), 0 1px 3px 1px rgba(0,0,0,.15)` | `--lm-color-surface-container-low` | `--lm-card-elevated-shadow`, `--lm-button-elevated-shadow` |
| **2** | `0 1px 2px rgba(0,0,0,.06), 0 2px 6px 2px rgba(0,0,0,.05)` | `0 1px 2px rgba(0,0,0,.30), 0 2px 6px 2px rgba(0,0,0,.18)` | `--lm-color-surface-container` | `--lm-menu-shadow` — menu, dropdown, autocomplete |
| **3** | `0 4px 8px 3px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.07)` | `0 4px 8px 3px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.30)` | `--lm-color-inverse-surface` | `--lm-snackbar-shadow` — superfície invertida por projeto |
| **4** | `0 6px 10px 4px rgba(0,0,0,.06), 0 2px 3px rgba(0,0,0,.07)` | `0 6px 10px 4px rgba(0,0,0,.20), 0 2px 3px rgba(0,0,0,.30)` | `--lm-color-surface-container-high` | `--lm-dialog-shadow` — dialog, drawer modal |
| **5** | `0 8px 12px 6px rgba(0,0,0,.07), 0 4px 4px rgba(0,0,0,.08)` | `0 8px 12px 6px rgba(0,0,0,.22), 0 4px 4px rgba(0,0,0,.32)` | — | Reservado. Nenhum componente desta versão o usa |

A escada de superfícies tem cinco degraus e a de sombras tem seis: o mapeamento não é 1:1 por
construção. `surface-container-highest` não participa da elevação — ele é o fundo de campo de
formulário (`--lm-field-bg`), que é um controle no nível 0.

### 7.3 Quando sombra, quando superfície tonal

**Regra.** Sombra é para o que **flutua sobre** o conteúdo e pode ser dispensado. Superfície
tonal é para o que **faz parte** do conteúdo.

| Situação | Recurso | Motivo |
|---|---|---|
| Menu, dialog, drawer, snackbar, tooltip | Sombra + superfície tonal | Estão temporariamente por cima; a sombra é a promessa de que vão sair |
| Card numa grade, seção, painel, rail de navegação | Só superfície tonal (nível 0) | Fazem parte da página. Vinte cards com sombra transformam a grade em relevo |
| Item selecionado, linha em hover | Só camada de estado | Seleção não é altura |
| Card que precisa se destacar numa lista | Superfície tonal um degrau acima, **não** sombra | Sombra deveria significar "flutuante", e o card não está flutuando |

**A elevação não é decorativa e não empilha por gosto.** Um dialog no nível 4 com um menu
aberto por cima dele **não** vai para o nível 5 — o menu usa nível 2 e a ordem é resolvida por
`--lm-z-modal` / `--lm-z-dropdown`. Elevação comunica categoria de superfície; `z-index`
resolve empilhamento.

### 7.4 Por que, no tema escuro, a profundidade vem da superfície

Compare as duas escadas:

| | `surface` | `container-low` | Direção |
|---|---|---|---|
| **Claro** | `#f7f9fd` (98) | `#f1f4f8` (96) | Subir **escurece** |
| **Escuro** | `#111317` (6) | `#1a1c1f` (10) | Subir **clareia** |

No tema claro, o sinal tonal contradiz a intuição física: uma superfície mais alta fica mais
escura, porque não existe alcance acima do branco. Sobra para a sombra a tarefa de dizer
"acima" — e é o que ela faz, com opacidades baixas (.06 / .04 no nível 1) porque sombra forte
sobre superfície clara vira mancha cinza.

No tema escuro é o contrário, e por dois motivos somados:

1. **A sombra praticamente não é visível.** Uma sombra preta sobre `#111317` tem uma diferença
   de luminância mínima — o fundo já está perto do fim da escala. Não há para onde escurecer.
2. **O sinal tonal funciona e concorda com a intuição.** A escada escura sobe de `#0c0e12` (tom
   4) a `#323539` (tom 22): 18 pontos de L\* de amplitude real, e "mais alto = mais claro" é o
   que o olho espera.

Por isso as sombras escuras são bem mais opacas — .30 no nível 1 contra .06 no claro — e ainda
assim fazem **menos** trabalho: elas atuam como uma linha de contato que delimita a borda da
superfície contra o fundo, não como uma pluma de altura.

**Consequência operacional.** No tema escuro, um componente que confia só na sombra fica
invisível. Toda superfície elevada **precisa** declarar sua superfície tonal, sempre, nos dois
temas — nunca só a sombra. É por isso que `--lm-menu-bg`, `--lm-dialog-bg` e
`--lm-card-elevated-bg` existem como tokens obrigatórios ao lado dos tokens de sombra, e não
como opcional.

**Uso incorreto:**

```css
.lm-menu { box-shadow: var(--lm-elevation-2); }  /* ✘ sem bg: some no tema escuro */
```

**Uso correto:**

```css
.lm-menu {
  background: var(--lm-menu-bg);        /* surface-container */
  box-shadow: var(--lm-menu-shadow);    /* elevation-2 */
  border-radius: var(--lm-menu-radius);
}
```

| | |
|---|---|
| **Impacto em acessibilidade** | O modo de alto contraste do Windows descarta `box-shadow` e cores de autor. Uma superfície flutuante que depende só de sombra desaparece — vira texto sobre texto. Toda superfície elevada precisa de fundo opaco declarado, e superfície modal precisa de contorno ou de scrim para permanecer delimitada. `--lm-dialog-scrim-opacity` é 0.32 sobre `--lm-color-scrim`. |
| **Comportamento responsivo** | O nível de elevação de um componente muda quando ele muda de forma: um menu (nível 2) que vira folha de tela cheia em `compact` sobe para o nível 4, porque passou a ser modal. A elevação segue o papel, não o componente. |

### 7.5 Camadas de estado

Interação não muda a cor do componente: ela sobrepõe uma camada da **cor de conteúdo** do
componente, com a opacidade do estado.

| Token | Opacidade | Estado |
|---|---|---|
| `--lm-state-hover` | 0.08 | Ponteiro sobre o alvo |
| `--lm-state-focus` | 0.10 | Foco por teclado (**somado** ao anel, nunca no lugar dele) |
| `--lm-state-pressed` | 0.12 | Pressionado |
| `--lm-state-dragged` | 0.16 | Arrastado |
| `--lm-state-selected` | 0.12 | Selecionado, quando não há contêiner tonal |
| `--lm-state-disabled-content` | 0.38 | Conteúdo desabilitado |
| `--lm-state-disabled-container` | 0.12 | Fundo desabilitado |

A cor-fonte é a cor de conteúdo daquela superfície — é o motivo de `--lm-table-row-hover`
apontar para `--lm-color-on-surface` e não para uma cor de fundo. Um único par de tokens serve
os dois temas e todas as superfícies, porque a camada é sempre derivada do que está escrito
ali.

**Regra.** Camada de estado nunca substitui o anel de foco, e `--lm-state-selected` não se
acumula com `--lm-color-secondary-container`: ou a seleção é um contêiner tonal (navegação,
chip, linha de tabela) ou é uma camada, nunca as duas.

---

## 8. Iconografia

### 8.1 A família

`lucide-react`, mantida. Família única, já instalada, SVG tree-shakeable e empacotada — nenhuma
requisição de rede, o que é requisito num app offline. Ícone de outra família, emoji como ícone
e SVG desenhado à mão são proibidos: quebram o peso de traço, a grade e o alinhamento óptico da
família.

### 8.2 Tamanhos

**Regra.** Três tamanhos, e só três.

| Tamanho | Onde | Referência |
|---|---|---|
| **16px** | Ícone inline dentro de texto de `body-md` ou `label-md` | Alinha com a altura de x da fonte |
| **20px** | **Padrão.** Ícone de botão, de campo, de linha de tabela, de chip | `--lm-icon-button-icon-size` |
| **24px** | Ícone de navegação e de app bar — os alvos primários de varredura | — |

Acima de 24px, o desenho deixa de ser ícone e vira ilustração: permitido **apenas** em estado
vazio e tela de erro, onde é decoração explícita e sempre acompanha um título de texto.

Estado atual: o frontend usa **16 tamanhos distintos em 161 ocorrências**, de 11px a 64px — 47
usos de 16, 28 de 18, 23 de 14, 15 de 20, 12 de 32, 8 de 24, e mais dez tamanhos com menos de
7 usos cada. Nenhum tamanho ímpar (11, 15, 17, 22, 26) alinha na grade de 4px, e 17px é o
tamanho dos ícones das oito abas de navegação — abaixo do piso do sistema para o alvo mais
usado da aplicação.

### 8.3 Área interativa

**Regra.** O ícone é o desenho; o alvo é o botão. Um ícone de 20px ou 24px mora dentro de um
alvo de **40px** (`--lm-icon-button-size`, que é `--lm-density-control`), e de **48px** onde o
ponteiro é grosseiro.

**Justificativa.** O WCAG 2.2 exige 24×24 CSS px de alvo (2.5.8, nível AA) e recomenda 44×44
(2.5.5, AAA). 40px atende ao AA com folga confortável para mouse de precisão; 48px atende à
recomendação para toque. `primitives.css` já força isso automaticamente:

```css
@media (pointer: coarse) {
  :root { --lm-density-control: 48px; --lm-density-row: 64px; --lm-density-gap: 16px; }
}
```

Todo componente que dimensiona pelo token acompanha sem uma linha adicional.

**Uso correto** — o alvo tem a altura da densidade e o ícone flutua centralizado dentro dele:

```css
.lm-icon-button {
  inline-size: var(--lm-icon-button-size);
  block-size: var(--lm-icon-button-size);
  border-radius: var(--lm-icon-button-radius);
  color: var(--lm-icon-button-color);
}
.lm-icon-button > svg { inline-size: 20px; block-size: 20px; }
```

**Uso incorreto** — alvo do tamanho do ícone (`.btn-icon` hoje tem 36px fixos, com ícones de
14px e 18px dentro), ou área clicável ampliada por `padding` que quebra o alinhamento da linha.
Se o alvo precisa ser maior que o espaço disponível, use área de toque estendida por
pseudo-elemento, não padding.

**Espaçamento entre alvos.** Mínimo de `--lm-space-8` entre dois ícones-botão adjacentes. Alvos
de 40px encostados formam uma faixa contínua onde é fácil errar.

### 8.4 Nome acessível

**Regra.** Todo ícone é **decorativo** ou **portador de significado**, e cada caso tem um
tratamento obrigatório.

| Caso | Tratamento | Exemplo |
|---|---|---|
| Ícone ao lado de um rótulo textual | `aria-hidden="true"` no SVG | `<Bell aria-hidden="true" /> Notificações` |
| Ícone é o único conteúdo do controle | `aria-label` no **controle**, não no SVG | `<button aria-label="Notificações"><Bell aria-hidden="true" /></button>` |
| Ícone carrega estado (conflito, sincronizado) | Texto acessível ao lado, visualmente oculto ou visível | `<AlertTriangle aria-hidden="true" /><span className="lm-sr-only">Conflito</span>` |

**Justificativa.** `lucide-react` renderiza um `<svg>` sem nome acessível. Um botão que só
contém esse SVG é anunciado como "botão" — sem mais nada. Hoje o header usa
`title="Notificações"` nos ícones-botão: `title` é dica de mouse, some no toque, não é traduzida
de forma confiável e depende do leitor de tela para virar nome acessível. Não é substituto de
`aria-label`.

**Nunca** um ícone é o único portador de um estado. Ícone **+** rótulo, sempre — a mesma regra
que vale para cor (§3.7, restrição 2), pelo mesmo motivo.

### 8.5 O estado selecionado, sem variante preenchida

`lucide-react` é uma família exclusivamente de contorno: não existe versão preenchida do mesmo
ícone. O sistema não simula uma — trocar `Home` por outro glifo mais cheio quebra a
consistência da família e ainda depende de o par existir.

**Regra.** O estado selecionado é comunicado por **três sinais simultâneos**, nenhum deles a
forma do ícone:

| Sinal | Como | Token |
|---|---|---|
| **Indicador tonal (pílula)** | Fundo tonal atrás do ícone, 56×32px | `--lm-navigation-item-bg-selected`, `--lm-navigation-indicator-width`, `--lm-navigation-indicator-height` |
| **Cor de conteúdo** | Ícone e rótulo mudam de `on-surface-variant` para o par do contêiner | `--lm-navigation-item-label` → `--lm-navigation-item-label-selected` |
| **Peso do rótulo** | Repouso em 400, selecionado em 500, **mesmo tamanho e mesmo tracking** | `--lm-type-body-md-weight` → `--lm-type-label-lg-weight`, sobre `--lm-type-label-lg-size` / `-line` / `-tracking` |

```css
.lm-nav-item {
  font-size: var(--lm-type-label-lg-size);
  line-height: var(--lm-type-label-lg-line);
  letter-spacing: var(--lm-type-label-lg-tracking);
  font-weight: var(--lm-type-body-md-weight);        /* 400 */
  color: var(--lm-navigation-item-label);
}
.lm-nav-item[aria-current="page"] {
  font-weight: var(--lm-type-label-lg-weight);       /* 500 */
  color: var(--lm-navigation-item-label-selected);
  background: var(--lm-navigation-item-bg-selected);
}
```

Manter `-size`, `-line` e `-tracking` do mesmo estilo e trocar **somente** o peso evita que a
largura do rótulo mude na seleção — que é o defeito clássico de "negrito quando ativo".

Um quarto sinal, opcional, é a espessura de traço do ícone: `lucide-react` aceita
`strokeWidth`, e o item selecionado pode usar um valor maior que o de repouso. **Não há token
para isso** (ver Lacunas); enquanto não houver, o valor fica em um único lugar do componente de
navegação e não se espalha.

**O quarto sinal que não conta:** `aria-current="page"` no item ativo é obrigatório, mas é
semântica, não estilo — é o que faz o estado existir para quem não vê a pílula.

**Uso incorreto:** seleção comunicada só pela cor do ícone; ou só por uma barra de 2px embaixo,
como as abas atuais (`.tab.active` muda `color` e `border-bottom-color`, ambos para
`--primary`) — dois sinais que são o mesmo canal.

| | |
|---|---|
| **Impacto em acessibilidade** | Três canais independentes — forma da pílula, cor, peso — mais `aria-current`. Em monocromia sobra a pílula e o peso; no alto contraste sobra `aria-current` e o retângulo do indicador; para leitor de tela, `aria-current` é o único que importa. |
| **Comportamento responsivo** | A pílula é horizontal no rail expandido e no drawer (ícone + rótulo lado a lado, 56px de altura via `--lm-navigation-item-height`); no rail estreito (`--lm-navigation-rail-width: 88px`) o indicador de 56×32 fica acima do rótulo. Em `compact`, a navegação inferior mantém os três sinais e reduz o rótulo. |

---

## 9. Movimento

### 9.1 Durações

| Token | Valor | Uso |
|---|---|---|
| `--lm-duration-instant` | 0ms | Estado que precisa parecer imediato; e o valor de `prefers-reduced-motion` |
| `--lm-duration-fast` | 120ms | Camada de estado (hover, pressed), mudança de cor, rotação de chevron |
| `--lm-duration-standard` | 200ms | Entrada e saída de elemento pequeno — tooltip, chip, checkbox, badge |
| `--lm-duration-emphasized` | 320ms | Transição de superfície grande — dialog, drawer, troca de rail/drawer, mudança de página |
| `--lm-duration-complex` | 480ms | Sequência coordenada de múltiplos elementos. **Teto absoluto**; nenhum componente desta versão o usa |

**Regra.** Interação direta — algo que acontece porque o usuário acabou de clicar — nunca passa
de `--lm-duration-emphasized`. Acima de 320ms o usuário percebe que está esperando o software.

**Justificativa.** A relação é inversa entre distância e frequência: quanto mais frequente e
menor o elemento, mais curta a transição. Um hover acontece centenas de vezes por hora e move
zero pixel — 120ms. Um dialog acontece poucas vezes e atravessa a tela — 320ms.

Hoje `global.css` usa `--duration-fast: 0.15s`, `--duration-normal: 0.25s` e
`--duration-slow: 0.4s`, e aplica `fadeInUp` de 0.4s em **oito** contêineres de página. A troca
de página é a transição mais frequente do app: ela pertence a `--lm-duration-emphasized`, e a
animação de entrada de página inteira é justamente a que mais incomoda em uso prolongado.

### 9.2 Curvas

| Token | Curva | Semântica |
|---|---|---|
| `--lm-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Padrão. Muda algo que **começa e termina** visível na tela |
| `--lm-easing-decelerate` | `cubic-bezier(0, 0, 0, 1)` | **Entrada.** Elemento chega de fora e freia |
| `--lm-easing-accelerate` | `cubic-bezier(0.3, 0, 1, 1)` | **Saída.** Elemento parte e acelera para fora |
| `--lm-easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Transição grande, de navegação ou de superfície modal |
| `--lm-easing-spring` | `cubic-bezier(0.34, 1.3, 0.64, 1)` | Confirmação pontual, com ultrapassagem |

Entrada e saída usam curvas **diferentes** de propósito: um elemento que chega precisa frear
para ser lido; um que sai não precisa ser lido, então acelera e libera a tela. Usar a mesma
curva nos dois sentidos faz a saída parecer lenta.

`--lm-easing-emphasized` tem hoje exatamente a mesma curva de `--lm-easing-standard`. Isso é
intencional: o token existe para que as duas possam divergir depois sem tocar em nenhum
componente. Componente de navegação e de superfície modal usam `emphasized`; o resto usa
`standard`.

`--lm-easing-spring` ultrapassa o valor final (o `1.3` no terceiro parâmetro) e volta. Reserve
para confirmação pontual — um check que aparece, um badge que incrementa. **Nunca** em texto,
nunca em superfície grande, nunca em algo que o usuário esteja lendo: ultrapassagem em bloco de
texto obriga a reencontrar a linha.

### 9.3 Aplicação por tipo de transição

| Transição | Duração | Curva | Propriedade animada |
|---|---|---|---|
| Camada de estado (hover, pressed) | `fast` | `standard` | `background-color`, `color` |
| Mudança de cor ou de borda | `fast` | `standard` | `color`, `border-color`, `box-shadow` |
| Anel de foco | `instant` | — | **Não anime.** Foco tem que aparecer no mesmo quadro |
| Tooltip, chip, badge entrando | `standard` | `decelerate` | `opacity`, `transform` |
| Tooltip, chip, badge saindo | `fast` | `accelerate` | `opacity`, `transform` |
| Menu abrindo | `standard` | `decelerate` | `opacity`, `transform: scale` |
| Dialog abrindo | `emphasized` | `emphasized` | `opacity`, `transform`; scrim em `standard` |
| Dialog fechando | `standard` | `accelerate` | `opacity`, `transform` |
| Drawer, rail expandindo | `emphasized` | `emphasized` | `inline-size`, `transform` |
| Mudança de página | `standard` | `standard` | `opacity` apenas — sem deslocamento |
| Indicador de seleção da navegação | `standard` | `emphasized` | `transform`, `background-color` |

**Anime apenas `opacity` e `transform`.** São as duas propriedades que o compositor resolve sem
recalcular layout. Animar `width`, `height`, `top`, `margin` ou `padding` força reflow a cada
quadro — perceptível num app Electron com tabela grande aberta. A exceção é a largura do
rail/drawer, que não tem alternativa e acontece raramente.

Saída é sempre mais rápida que entrada. Um dialog que abre em 320ms fecha em 200ms: fechar é a
confirmação de um comando já dado.

### 9.4 `prefers-reduced-motion` — tratamento obrigatório

**Regra.** Toda animação e toda transição respeitam `prefers-reduced-motion: reduce`. Sem
exceção, e sem depender de o autor do componente lembrar.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: var(--lm-duration-instant) !important;
    animation-iteration-count: 1 !important;
    transition-duration: var(--lm-duration-instant) !important;
    scroll-behavior: auto !important;
  }
}
```

Esta é a única regra do sistema que usa `!important` legitimamente: ela precisa vencer qualquer
declaração de componente, presente ou futura, incluindo estilo inline. Ela é rede de segurança,
não substituto — um componente que anima corretamente deve **também** consultar a preferência
ao decidir seu efeito.

**Reduzido não é ausente.** Movimento reduzido significa trocar o canal, não remover o
feedback:

| Em vez de | Use |
|---|---|
| Deslizar a superfície do dialog | Aparecer em `opacity`, com duração ainda perceptível |
| Deslizar o indicador de navegação entre itens | Trocar de posição sem interpolação; a pílula continua existindo |
| Rotação contínua do carregador | Barra de progresso ou texto de estado |
| Snackbar entrando por baixo | Snackbar aparecendo no lugar |

**O que a preferência não desliga:** aparecimento e desaparecimento de anel de foco, mudança de
cor de estado, e qualquer indicação de que algo aconteceu. Remover o feedback junto com o
movimento troca um problema de acessibilidade por outro.

Estado atual: `global.css` declara cinco `@keyframes` (`fadeInUp`, `fadeIn`, `slideInLeft`,
`scaleIn`, `spin`), aplica `fadeInUp` a oito contêineres de página, `spin` em laço infinito na
classe `.spin`, `transform: rotate(90deg)` no hover do botão de fechar do modal, e
`transform: translateY(-1px)` no hover de `.btn-primary`. Não há nenhuma consulta a
`prefers-reduced-motion` em todo o frontend.

| | |
|---|---|
| **Impacto em acessibilidade** | Movimento vestibular — deslocamento amplo, parallax, zoom, rotação — provoca náusea e tontura em pessoas com distúrbio vestibular, e é gatilho de enxaqueca. `prefers-reduced-motion` é a única forma de o sistema operacional comunicar isso, e ignorá-la é falha de WCAG 2.3.3. A rotação de 90° no hover do botão de fechar é exatamente o padrão a eliminar: movimento amplo, involuntário, disparado por passar o mouse. |
| **Comportamento responsivo** | Em `compact`, superfícies passam a ocupar a tela inteira e o deslocamento fica maior: use `emphasized` e nunca `spring` nesses casos. Em `(pointer: coarse)` não existe hover — todo estado que dependa dele precisa de equivalente em `:active` e em foco. |

---

## Lacunas
> **Registro autoritativo:** [`LACUNAS.md`](LACUNAS.md). A lista abaixo reflete o estado
> do dia em que este documento foi escrito e não é atualizada quando uma lacuna fecha —
> várias destas já foram fechadas por extensão do gerador.


Regras deste documento que precisariam de um token que **não existe** em `tokens.json` nem nos
três `.css` gerados. Enquanto não existirem, a regra vale em prosa e o valor mora em um único
lugar do componente — nunca espalhado.

| # | Regra afetada | O que falta | Impacto |
|---|---|---|---|
| 1 | §8.2 — três tamanhos de ícone (16 / 20 / 24px) | Escala de tamanho de ícone. Só existe `--lm-icon-button-icon-size` (20px), preso a um componente. Nada dá nome a 16px e 24px | Alto. É a lacuna mais cara: sem token, os 16 tamanhos atuais não têm para onde migrar |
| 2 | §8.5 — traço mais espesso no ícone selecionado | Token de `strokeWidth` de ícone (repouso e selecionado) | Médio. Sem ele o quarto sinal de seleção fica com valor literal no componente de navegação |
| 3 | §7.1 — largura de borda de 1px | Token de espessura de borda. Só existem `--lm-field-border-width-focus` (2px) e `--lm-focus-ring-width` (3px); o 1px estrutural não tem nome | Baixo. 1px é o padrão implícito, mas fica invisível a qualquer auditoria |
| 4 | §3.8 — cor de conteúdo sobre preenchimento de plataforma | `on-airbnb` e `on-booking`. Existem `airbnb`/`booking` e o par `*-container`/`on-*-container`, mas não há papel para texto sobre o preenchimento sólido | Médio. Na prática, proíbe preenchimento sólido de plataforma — o que está alinhado com a regra do badge tonal, mas por acidente e não por decisão |
| 5 | §7.1 — `--lm-color-divider` | Nenhum token de componente o consome. `--lm-table-divider` aponta para `--lm-color-outline-variant` | Baixo. Dois papéis para a mesma função, um deles sem uso; precisa de decisão de governança: atribuir ou remover |
| 6 | §7.2 — nível 5 de elevação | Nenhum componente atribuído a `--lm-elevation-5` | Baixo. Nível sem regra de uso tende a virar uso aleatório |
| 7 | §6.1 — `--lm-radius-lg` e `--lm-radius-2xl` | Nenhum componente atribuído | Baixo. Mesmo risco da lacuna 6 |
| 8 | §4.3 — números tabulares em tabela | Nenhum token expressa `font-variant-numeric: tabular-nums`. É propriedade CSS, não valor — mas a regra fica sem ponto único de aplicação | Baixo. Resolve-se numa classe utilitária, decisão do documento de implementação |
| 9 | §5 / §9 — breakpoints | `breakpoint` existe em `tokens.json` (compact 0, medium 600, expanded 840, large 1200, xlarge 1600) mas **não** é emitido como custom property. `@media` não consome `var()`, então isso está correto — a lacuna é de ferramenta: nada garante que os valores no CSS acompanhem os do JSON | Médio. Pertence a `02-layout.md` e à governança |
| 10 | §1.1 / §9.4 — classe de conteúdo só para leitor de tela | `.lm-sr-only`, usada em §8.4, é classe utilitária e não token — mas não existe em lugar nenhum ainda | Baixo. Pertence a `03-acessibilidade.md` |
