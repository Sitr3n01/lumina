# Primitivos do LUMINA — contrato

Todo componente deste diretório segue as regras abaixo **sem exceção**. Elas existem porque a
aplicação anterior tinha 11 componentes "card" sem base comum, `.btn-sm` em 4 tamanhos
diferentes e 58 valores distintos de `padding`. Um contrato chato é o que impede isso de
voltar.

`Button.jsx` / `Button.css` é a implementação de referência. Na dúvida, copie o padrão dele.

---

## 1. Arquivos

Um componente = `Nome.jsx` + `Nome.css`. O JSX importa o próprio CSS na primeira linha.
Componentes irmãos e pequenos (Radio junto de Checkbox) podem dividir um arquivo.
Tudo é reexportado em `index.js`.

## 2. CSS

**Toda regra vive em `@layer lm.components`.** Sem exceção — é o que garante que uma folha de
página (que está fora de camada) possa sobrescrever sem `!important`.

Nomenclatura: bloco `.lm-<componente>`, elemento `.lm-<componente>__<parte>`.
**Variante e estado são atributos `data-*`, não classes modificadoras.** Ficam legíveis no
DevTools e evitam a explosão combinatória de `.lm-button--filled-lg-loading`.

```css
.lm-button { }
.lm-button__icon { }
.lm-button[data-variant='tonal'] { }
```

## 3. Valores

**Zero literal.** Nenhum hexadecimal, nenhum `rgba()`, nenhum pixel mágico, nenhuma duração
solta. Toda propriedade sai de um token:

| Precisa de | Use |
|---|---|
| Cor | `var(--lm-<componente>-*)`, e só ele — tokens de componente já apontam para semânticos |
| Espaço | `var(--lm-space-N)` |
| Raio | `var(--lm-radius-*)` |
| Tipografia | o quarteto `--lm-type-<papel>-size/-line/-weight/-tracking` — sempre os quatro |
| Movimento | `var(--lm-duration-*)` + `var(--lm-easing-*)` |
| Camada | `var(--lm-z-*)` |
| Altura de controle | `var(--lm-density-control)` — nunca um px fixo |

Falta um token? **Edite `scripts/design/generate_tokens.py` e rode-o.** Nunca escreva o valor
à mão, e nunca edite `styles/tokens/*` — são gerados.

Proibido: `transition: all` (anima layout e custa quadro), `outline: none` sem o par
`:focus-visible`, `z-index` literal, `!important`.

## 4. Camada de estado

O mecanismo único de hover/pressed/selected. Cada variante declara duas propriedades locais —
o container e o conteúdo — e os estados se derivam delas:

```css
.lm-button[data-variant='filled'] {
  --_container: var(--lm-button-filled-bg);
  --_content: var(--lm-button-filled-label);
}
.lm-button { background-color: var(--_container); color: var(--_content); }
.lm-button:hover:not(:disabled) {
  background-color: color-mix(in oklab, var(--_content) calc(var(--lm-state-hover) * 100%), var(--_container));
}
```

Funciona também quando `--_container` é `transparent` (botão de texto): a mistura devolve a cor
de conteúdo com alfa parcial, que é exatamente o desejado. Sem fallback — o alvo é Electron
28/29, ou seja, Chromium ≥ 120.

`--lm-state-selected` **nunca** se acumula com um contêiner tonal, e a camada de estado
**nunca** substitui o anel de foco.

## 5. Foco

Não redeclare o anel. Ele vem de `styles/base.css` com especificidade zero e já cobre
`button`, `input`, `select`, `textarea`, `a[href]`, `summary` e `[tabindex]`.

Só declare foco quando o componente **é** a exceção: um controle sobre superfície colorida usa
`--lm-focus-ring-color-inverse`; um controle cujo anel seria cortado por `overflow: hidden`
usa `box-shadow` no lugar de `outline`.

## 6. API React

```jsx
const Button = forwardRef(function Button(
  { variant = 'filled', density, className, children, ...rest },
  ref,
) { … })
```

- `forwardRef` **sempre** — diálogo, menu e tooltip precisam medir e focar o nó.
- `...rest` espalhado no elemento raiz, **depois** das props internas, para que quem chama
  possa sobrescrever `type`, `aria-*`, `onKeyDown`.
- `className` recebido é concatenado, nunca descartado.
- Variantes são **strings** (`variant="tonal"`), nunca booleanos acumulados
  (`primary secondary large` — a combinação inválida vira representável e alguém a usa).
- `density` é a única escala de tamanho. Não crie `size`. Um botão menor é
  `<Button density="compact">`, que escreve `data-density` no próprio nó e reusa os mesmos
  tokens. Foi a ausência dessa regra que produziu quatro `.btn-sm` diferentes.

## 7. Acessibilidade — condições de existência, não melhorias

- Controle sem texto visível exige `aria-label`. `IconButton` **lança** em desenvolvimento se
  faltar.
- Ícone decorativo ao lado de texto: `aria-hidden="true"` e `focusable="false"`.
- Estado interativo vai em atributo ARIA real (`aria-pressed`, `aria-expanded`,
  `aria-selected`, `aria-current`), nunca só em classe CSS.
- Alvo mínimo 24x24 (WCAG 2.5.8). Se o desenho for menor, estenda por pseudo-elemento —
  `--lm-target-min-size` existe para isso — sem inflar a pintura.
- Nada comunicado só por cor. Cor sempre acompanhada de ícone, texto ou forma.
- Teclado: `03-acessibilidade.md` §4.2 já define Menu, Dialog, Abas, Tabela, Combobox e
  Navigation rail. **Siga aquela tabela; não invente atalho.**
- `Dialog` precisa dos quatro: foco preso, `Escape` fecha, foco volta ao gatilho, rolagem do
  fundo travada. Três de quatro não é aceitável — os 4 modais que este diretório substitui
  não tinham nenhum.

## 8. Antes de considerar pronto

1. Renderiza nos dois temas (`data-theme="light"` e `"dark"`) e nas três densidades.
2. Operável só com teclado, com foco visível em cada parada.
3. `npx eslint frontend/src/ --max-warnings=0` limpo.
4. `grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(|[0-9]+px" Nome.css` só devolve o que a tabela da
   seção 3 permite (px cru é aceitável apenas para espessura de borda de 1px).
