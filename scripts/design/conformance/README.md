# Harness de conformidade

Verifica no **navegador** o que o LUMINA Design System promete nos documentos. Diferente de
`generate_tokens.py --check`, que valida contraste a partir dos valores gerados, este mede
estilos **computados** — pega erro que só existe depois que o CSS carrega: camada errada,
`color-mix` não suportado, guard de tema invertido, densidade que não propaga.

## Rodar

A partir da raiz do repositório:

```bash
python -m http.server 8899 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8899/scripts/design/conformance/index.html` e, no console:

```js
await window.__conformance()
```

Retorna `{ total, pass, fail, resultados }`. Sai limpo quando `fail === 0`.

## O que cobre — 38 verificações em 12 grupos

| Grupo | Verifica |
|---|---|
| `tokens` | Todo papel semântico resolve nos dois temas |
| `contraste` | 25 pares medidos com cor computada, não com o hex do gerador |
| `foco` | Contraste do anel sobre cada superfície, e que o anel primário de fato reprovaria em superfície invertida — a razão de existir do invertido |
| `tema` | `data-theme` vence `prefers-color-scheme` **nos dois sentidos**; `color-scheme` acompanha |
| `densidade` | Os três níveis produzem as alturas documentadas e o Button as herda |
| `estado` | `color-mix()` funciona e a camada caminha na direção da cor de conteúdo |
| `camadas` | Escala z-index estritamente crescente; scrim abaixo de drawer abaixo de modal |
| `breakpoints` | `breakpoints.js` concorda com `tokens.json` e com `matchMedia` |
| `tipografia` | Corpo ≥14px; `body-sm` não é o corpo; escala só usa 400 e 500 |
| `gráficos` | 8 slots resolvem e todos a ≥3:1 sobre `chart-surface`, que continua sendo `surface-container-low` |
| `alvos` | Controles acima do mínimo; Chip estende alvo por pseudo-elemento, não por padding |
| `css` | `@layer` em uso; nenhuma regra universal com `outline: none` |

## O que NÃO cobre

- **O anel de foco desenhado.** `focus({focusVisible:true})` não faz o Chromium casar
  `:focus-visible`, e uma janela sem foco não casa nem `:focus`. O harness verifica a regra
  pelo CSSOM e o contraste por token; a verificação renderizada exige teclado real numa
  janela com foco.
- **`forced-colors` renderizado** e **`prefers-reduced-motion`** — precisam de emulação via CDP.
  Ver abaixo o que já foi medido sem ela.

## Impressão, `forced-colors` e zoom — medidos em 2026-08-07

Os três estavam listados aqui como não cobertos. Foram medidos **no aplicativo rodando**, e
não neste harness: são propriedades do produto, e este harness carrega só a camada de tokens.
O alvo é `PageSandbox` (`http://localhost:5173/#pages`), que expõe `window.__irPara(tela)` e
`window.__telas` justamente para varreduras assim.

**Zoom — passa.** 200% equivale a um viewport CSS de 640×400 numa janela de 1280×800; 400%,
que é o limite real da WCAG 1.4.10, equivale a 320px. Medido em 10 telas × 2 temas nos dois
níveis: **nenhuma rolagem horizontal do documento**. A 320px o `DataTable` fica mais largo que
o viewport (382px de tabela), mas rola dentro do próprio `.lm-data-table__scroller`
(`overflow-x: auto`) — que é exatamente a exceção que a 1.4.10 abre para conteúdo tabular,
contida do jeito certo.

**Impressão — passa.** Os **13** seletores dentro de `@media print` casam com elementos reais
na tela do documento; nenhum morto. É a regressão que importa: renomear `.lm-shell` ou
`.lm-nav` faria a folha voltar a sair com a navegação impressa junto, sem erro nenhum.

**`forced-colors` — parcial.** Dos **20** seletores sob `@media (forced-colors: active)`, 13
foram alcançados varrendo as dez telas. Os 7 restantes não estão mortos — dependem de estado
ou largura que a varredura não exercitou: `summary` (não há `<details>` no produto),
`.lm-radio__input` e `.lm-switch__input` com seus `::after` de marcação, e os dois
`.lm-nav__link[data-forma="expanded"|"drawer"]`, que só existem em outras classes de janela.

Isto verifica que as regras **alcançam** o documento. Verificar que a fronteira continua
**visível** com o alto contraste do Windows ligado exige emulação via CDP, e continua aberto.

## Armadilhas conhecidas (custaram tempo)

1. `color-mix(in oklab, …)` computa para `oklab(…)`, não `rgb(…)`. Ler os três primeiros
   números como RGB dá quase preto. O harness resolve cor via `canvas`, que converte
   qualquer espaço para sRGB.
2. No Chromium moderno `CSSStyleRule.cssRules` **existe** (CSS aninhado). Um walker que
   testa `if (r.cssRules)` antes de `r.selectorText` nunca visita regra de estilo alguma.
