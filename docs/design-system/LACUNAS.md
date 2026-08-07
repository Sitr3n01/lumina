# Registro consolidado de lacunas

Fonte autoritativa das lacunas de token do LUMINA Design System. Substitui as listas
"Lacunas" ao final de cada documento, que refletem o estado do dia em que foram escritas e
**não** são atualizadas quando uma lacuna fecha.

Fecha a tarefa 3.2 do backlog de [`08-governanca.md`](08-governanca.md).

Uma lacuna é uma regra que o sistema exige e para a qual nenhum token existe. Enquanto
aberta, a regra vale em prosa e o valor fica literal e isolado no componente. **Nenhuma
lacuna autoriza batizar um token novo ad hoc** — o caminho é alterar a semente em
`scripts/design/generate_tokens.py` e regerar.

---

## Fechadas

Todas por extensão do gerador. Os documentos que as declararam foram escritos antes.

| Lacuna | Declarada em | Token que a fechou |
|---|---|---|
| Texto desabilitado com contraste declarado | `03` #9 | `--lm-color-on-surface-disabled` — 3,48:1 no fundo de campo, contra 2,34:1 da opacidade |
| Borda de controle interativo a 3:1 (WCAG 1.4.11) | `03` #5 | `--lm-color-outline-interactive` — 4,19:1 no pior fundo, contra 1,62:1 de `outline-variant` |
| Conteúdo sobre plataforma sólida | `01` #4, `06` #5 | `--lm-color-on-airbnb`, `--lm-color-on-booking` |
| Superfície de verificação dos gráficos | `08` L2 | `--lm-color-chart-surface` |
| Eixo, grade e tooltip de gráfico | `08` L3 | `--lm-color-chart-axis`, `-grid`, `-ink`, `-ink-muted`, `-tooltip-bg`, `-tooltip-label` |
| Tokens de esqueleto | `06` #4 | bloco `skeleton` (`bg`, `sheen`, `radius`, `duration`) |
| Indicador de progresso linear e circular | `06` #6 | bloco `progress` |
| Contorno tracejado da zona de soltar | `06` #7 | bloco `dropzone` |
| Largura de folha lateral e de painel de apoio | `02` #5, `06` #1 | `--lm-side-sheet-width`, `--lm-supporting-panel-width` |
| Opacidade de véu genérica | `02` #6, `06` #2, `08` L7 | bloco `scrim` (`color`, `opacity`) — `--lm-dialog-scrim-opacity` continua para o diálogo |
| Largura máxima de coluna de formulário | `06` #10 | `--lm-form-column-max-width` |
| Badge com contagem de dois ou três caracteres | `06` #11 | `--lm-badge-min-width`, `--lm-badge-padding-inline` |
| Anel de foco de duas camadas | `03` #1 | `--lm-focus-ring-inner-width`, `--lm-focus-ring-inner-color` |
| Alvo de ponteiro independente do desenho | `03` #3 | `--lm-target-min-size` (24px) |
| Distância mínima entre alvos | `03` #4 | `--lm-target-min-gap` (8px) |
| Tempo de permanência (snackbar, tooltip) | `03` #8, `04` #3, `06` #3, `08` L8 | `--lm-dwell-snackbar`, `-snackbar-action`, `-tooltip-delay`, `-tooltip-delay-repeat` |
| Breakpoints com fonte única para JS | `02` #3, `06` #12, `08` L1 | `frontend/src/styles/tokens/breakpoints.js` (`BREAKPOINTS`, `MEDIA`, `windowClass`) |

---

## Abertas

Ordenadas por impacto na Fase 4 do plano (biblioteca de primitivos).

### Alto — resolver antes ou durante a Fase 4

| # | Lacuna | Declarada em | O que vale enquanto isso |
|---|---|---|---|
| A1 | Escala primitiva de tamanho de ícone. Só existe `--lm-icon-button-icon-size` (20px), preso a um componente; 16px e 24px não têm nome | `01` #1, `05` #1, `08` L4 | Literal no componente, sempre um dos três valores |
| A2 | Escala de tamanho de controle independente de `--lm-density-control` — desenho de 18px do checkbox, 32px do chip | `05` #4 | Literal; o **alvo** já tem `--lm-target-min-size` |
| A3 | Peso do rótulo selecionado na navegação. `--lm-type-label-lg-weight` e `-label-md-weight` são ambos 500; não há token de peso isolado | `02` #7, `05` #3 | `font-weight: 500` literal no item selecionado |
| A4 | `strokeWidth` do ícone selecionado (2 → 2.25) | `01` #2, `05` #2 | Literal no componente de navegação |
| A5 | Anel de foco em contexto de erro. Sobre `error-container`, `--lm-focus-ring-color` pode não alcançar 3:1 | `08` L6 | Verificar caso a caso; nunca trocar a cor do anel por contexto (WCAG 3.2.4) |
| A6 | Duração efetiva sob movimento reduzido — o gerador não emite o bloco `prefers-reduced-motion` | `03` #6 | Bloco escrito à mão em `base.css`, com `!important` (o único legítimo do sistema) |

### Médio

| # | Lacuna | Declarada em | O que vale enquanto isso |
|---|---|---|---|
| M1 | Teto do canvas (1600px) e medida do texto (68ch) — os dois números mais repetidos do sistema | `02` #2, `04` #1 | Literais, documentados em `02-layout.md` §1.3 |
| M2 | Espessura de borda estrutural de 1px | `01` #3, `08` L5 | `1px` literal |
| M3 | `font-variant-numeric: tabular-nums` | `01` #8, `04` #2 | Classe utilitária em `@layer lm.utilities` — é propriedade, não valor |
| M4 | Classe `.lm-sr-only` | `01` #10 | Escrita à mão em `base.css` |
| M5 | Altura da barra de navegação inferior em `compact` | `02` #4 | Composta: `--lm-navigation-item-height` + `--lm-space-8` |
| M6 | Altura mínima de célula de calendário e altura da barra de reserva | `06` #9, `05` #7 | Literais |
| M7 | Estados de disponibilidade do calendário (livre, ocupado, bloqueado, sobreposto) | `06` #8, `05` #8 | `--lm-chart-status-*` é de visualização de dados; não reutilizar |
| M8 | Tokens do link "pular para o conteúdo" | `03` #7 | Compostos de `--lm-color-primary-container` |
| M9 | Largura mínima de botão para absorver expansão de texto | `04` #4 | Largura livre; testar com pseudo-locale de +40% |
| M10 | Tamanho tipográfico de ajuda e erro de campo — `--lm-field-help` e `-error-text` são só cores | `04` #5 | `--lm-type-body-sm-*` aplicado no componente |

### Baixo

| # | Lacuna | Declarada em |
|---|---|---|
| B1 | Colunas, margens e gutters do grid como token | `02` #1 |
| B2 | Zonas seguras da janela Electron | `02` #8 |
| B3 | `line-clamp` para truncar conteúdo do usuário | `04` #6 |
| B4 | Direção lógica e espelhamento RTL | `04` #7 |
| B5 | `--lm-color-divider` sem consumidor — `--lm-table-divider` aponta para `outline-variant` | `01` #5 |
| B6 | Elevação nível 5 sem componente atribuído | `01` #6 |
| B7 | `--lm-radius-lg` e `--lm-radius-2xl` sem componente atribuído | `01` #7 |
| B8 | Cor de sistema `Highlight` em `forced-colors` — única exceção legítima fora do sistema de tokens | `03` #2 |
| B9 | Mapa de aliases de depreciação no gerador | `08` L9 |

---

## Lacuna de processo

Uma pendência que não é de token, levantada por [`07-implementacao.md`](07-implementacao.md):

> A validação de separação da paleta de gráficos sob daltonismo existe como **comentário**
> em `scripts/design/generate_tokens.py`, não como portão executável. `--check` valida
> contraste WCAG, mas não valida ΔE sob protanopia e deuteranopia. Se alguém alterar uma
> semente de matiz, a paleta pode regredir em silêncio.

Correção proposta: portar a verificação de ΔE para dentro do `--check`, para que o mesmo
comando cubra contraste **e** separação. Enquanto isso, a regra é revalidar manualmente com
o validador externo sempre que uma semente de matiz ou o afunilamento de croma mudar — e o
gerador registra em comentário as superfícies e os números da última validação
(`#f1f4f8` / `#1a1c1f`; CVD 11,8 claro / 9,0 escuro).
