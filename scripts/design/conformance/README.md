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
- **`forced-colors`** e **`prefers-reduced-motion`** — precisam de emulação via CDP.
- **Zoom de 200%** — precisa de mudança de escala no nível do navegador.

## Armadilhas conhecidas (custaram tempo)

1. `color-mix(in oklab, …)` computa para `oklab(…)`, não `rgb(…)`. Ler os três primeiros
   números como RGB dá quase preto. O harness resolve cor via `canvas`, que converte
   qualquer espaço para sRGB.
2. No Chromium moderno `CSSStyleRule.cssRules` **existe** (CSS aninhado). Um walker que
   testa `if (r.cssRules)` antes de `r.selectorText` nunca visita regra de estilo alguma.
