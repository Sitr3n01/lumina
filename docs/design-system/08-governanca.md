# 08 · Governança

Um design system sem governança vira uma pasta de sugestões. Este documento define quem pode
mudar o quê, por qual caminho, com qual prova, e o que impede uma mudança de entrar. As regras
aqui valem sobre as dos outros sete documentos: se uma decisão de fundamentos, layout ou
componentes for alterada, é este processo que autoriza a alteração.

O produto tem um único desenvolvedor. Isso não afrouxa a governança — aperta. Sem uma segunda
pessoa para revisar, a única defesa contra a deriva é ter portões mecânicos e verificáveis, não
julgamento. Toda regra abaixo foi escrita para ser checável por comando, não por opinião.

---

## 1. O que é versionado

Três artefatos mudam juntos e carregam uma única versão:

| Artefato | Caminho | Papel |
|---|---|---|
| Gerador | `scripts/design/generate_tokens.py` | Fonte de verdade real — todas as sementes e mapeamentos |
| Tokens gerados | `frontend/src/styles/tokens/{tokens.json,primitives.css,semantic.css,components.css}` | Saída determinística do gerador |
| Documentação | `docs/design-system/*.md` | Contrato escrito das regras que os tokens não conseguem expressar |

A versão vive em dois lugares que precisam concordar: `$meta.version` em `tokens.json` (escrito
por `build_tokens()`) e o cabeçalho do `README.md`. Hoje: **1.0.0**.

Essa versão descreve o **sistema**, não o aplicativo. `package.json` (`0.1.0`) e
`frontend/package.json` (`A.0.1.0`) seguem trilhas próprias e não devem ser sincronizados com
ela. Confundir as duas produz saltos de versão do produto por causa de uma correção de croma.

**Regra.** Nenhuma mudança visual recorrente entra fora do gerador ou fora da documentação. Se
uma regra não cabe em nenhum dos dois, ela não é do sistema — é uma exceção local, e exceções
locais têm o tratamento definido em `README.md` §3.8.

---

## 2. Versionamento semântico

A ideia de "quebra" num design system não é "o build falhou": é **um consumidor que continua
compilando e passa a significar outra coisa**. Um token renomeado quebra ruidosamente — o CSS
cai no valor inicial e a tela fica sem cor. Um token *repapelado* quebra em silêncio, e silêncio
é pior. Por isso a faixa MAJOR cobre significado, não só nome.

### 2.1 As três faixas

| Faixa | Critério | O que o consumidor precisa fazer |
|---|---|---|
| **MAJOR** (`2.0.0`) | Quebra de contrato: um nome some, muda de significado, ou uma decisão estrutural é revertida | Reler o diff e editar código |
| **MINOR** (`1.1.0`) | Capacidade nova, ou deriva visual dentro do mesmo papel | Nada; revisar visualmente |
| **PATCH** (`1.0.1`) | Correção que restaura a intenção já declarada | Nada |

**Desempate.** Quando uma mudança se encaixa em duas faixas, vale a mais alta. Uma correção de
contraste que aproveita para renomear um token é MAJOR, não PATCH.

### 2.2 MAJOR — exemplos concretos

| Mudança | Por que é MAJOR |
|---|---|
| Renomear `--lm-color-divider` para `--lm-color-separator` | Toda referência existente resolve para vazio |
| Remover a variante `elevated` do botão e seus `--lm-button-elevated-bg` / `--lm-button-elevated-shadow` | Some uma opção do catálogo; composições que a usavam perdem fundo e sombra |
| Repapelar `--lm-color-info`: hoje deriva da paleta `primary`, passar a derivar de `tertiary` | O nome sobrevive, o significado não. Quebra silenciosa — a pior categoria |
| Mudar o padrão de `--lm-density-control` de `40px` para `48px` | Reposiciona todo controle interativo do produto de uma vez |
| Mudar o valor de um breakpoint (`expanded` de `840px` para `900px`) | Reescreve o comportamento adaptativo inteiro, inclusive a troca rail → drawer |
| Trocar o prefixo `--lm-` | Invalida 100% das referências |
| Abandonar o navigation rail adaptativo, ou tornar o tema escuro o padrão | Reverte uma decisão estrutural registrada no `README.md` §4 |
| Remover um nível de elevação (`--lm-elevation-5`) ou um degrau da escala tipográfica | Reduz o vocabulário; composições existentes ficam sem valor |

### 2.3 MINOR — exemplos concretos

| Mudança | Por que é MINOR |
|---|---|
| Documentar um componente novo e adicionar seu bloco em `COMPONENT_TOKENS` | Só acrescenta nomes; nada existente muda |
| Adicionar uma variante a um componente sem tocar nas atuais | Aditivo |
| Novo papel semântico em `SEMANTIC_COLOR` (ex.: um `--lm-color-*` para um estado ainda sem token) | Aditivo |
| Nova paleta em `PALETTES` (foi assim que `chart-rose` entrou) | Aditivo; a rampa `--lm-palette-chart-rose-*` nasce inteira |
| Novo nível em `DENSITY` | Aditivo; `default` continua sendo o padrão |
| Mudar o tom de `primary` no claro de 40 para 45 mantendo o papel e passando o `--check` | Deriva visual dentro do mesmo papel: `--lm-color-primary` continua significando "ação primária" |
| Acrescentar um par a `CONTRAST_PAIRS` que já passa | Aumenta a cobertura do teste sem mudar pixel |
| Nova regra de composição em `06-padroes.md` que não invalida as anteriores | Aditivo |

Mudança de **valor** de token semântico é MINOR e não PATCH porque é visível: alguém que
atualiza vê a interface diferente. E é MINOR e não MAJOR porque o contrato — nome e papel —
continua de pé. A contrapartida é obrigatória: toda mudança de valor exige revisão do diff de
contraste (§3.4).

### 2.4 PATCH — exemplos concretos

| Mudança | Por que é PATCH |
|---|---|
| **Correção de contraste**: um par que caiu abaixo do mínimo volta a passar | O contrato declarado é "os 68 pares atendem AA". Ele estava violado. Restaurá-lo é conserto, não evolução — mesmo mudando pixels |
| Corrigir um bug do gerador (hex fora do gamut, afunilamento de croma aplicado ao tom errado) | A saída passa a ser o que a regra sempre disse que seria |
| Corrigir texto, tabela, exemplo ou link na documentação | Nada executável muda |
| Acrescentar comentário ou docstring no gerador | Nada muda na saída |

O caso da correção de contraste é o único em que pixels mudam sem ser MINOR, e a justificativa é
exatamente essa: a versão anterior estava errada segundo o próprio critério publicado. Toda
correção desse tipo entra no registro com a razão medida antes e depois — sem o número, é
indistinguível de uma mudança estética disfarçada de conserto.

### 2.5 O que não muda a versão

Reformatação aplicada pelo `ruff format`, comentários, reorganização interna do gerador sem
efeito na saída. O teste é objetivo: rode o gerador; se `git diff frontend/src/styles/tokens/`
sai vazio e nenhum `.md` mudou de conteúdo, não há versão nova.

---

## 3. Processo de mudança de token

### 3.1 Por que ninguém edita `frontend/src/styles/tokens/*` à mão

Três motivos, em ordem de gravidade:

1. **A edição é apagada.** Os quatro arquivos são reescritos inteiros a cada execução do
   gerador. Uma correção feita à mão sobrevive até a próxima mudança de semente e some sem
   aviso — e some justamente quando alguém está mexendo em cor, ou seja, no pior momento.
2. **A garantia matemática morre.** Todo tom N tem luminância CIE L\* = N *porque* foi derivado
   em LCh. Um hexadecimal digitado à mão não tem essa propriedade. A partir dele, o contraste
   deixa de ser previsível e o `--check` deixa de significar o que diz — ele valida os pares,
   mas a premissa de que a rampa é regular já não vale.
3. **A rastreabilidade some.** `git blame` passa a apontar para uma edição manual em vez de
   apontar para a decisão que a causou. Seis meses depois ninguém sabe por que aquele tom é
   aquele.

Os quatro arquivos abrem com o mesmo cabeçalho:

```css
/* =============================================================
   LUMINA Design System — Tokens de componente
   ARQUIVO GERADO por scripts/design/generate_tokens.py
   Não edite à mão. Altere as sementes no gerador e rode-o novamente.
   ============================================================= */
```

Esse cabeçalho é aviso, não portão. O portão automático ainda não existe (§7.2, backlog).

### 3.2 Onde cada tipo de mudança é feita

Toda mudança de token começa numa constante do gerador:

| Quero mudar | Mexo em |
|---|---|
| Matiz ou croma de uma família | `PALETTES` |
| Qual tom cada papel usa, por tema | `SEMANTIC_COLOR` |
| Quais tons existem na rampa | `TONES` |
| Quanto a croma cede nas pontas | `CHROMA_TAPER` |
| Escala de espaçamento, raios, tipografia | `SPACE`, `RADIUS`, `TYPE_SCALE` |
| Durações e curvas | `MOTION_DURATION`, `MOTION_EASING` |
| Opacidade das camadas de estado | `STATE_LAYER` |
| Camadas, breakpoints, densidade | `Z_INDEX`, `BREAKPOINTS`, `DENSITY` |
| Sombras por tema | `ELEVATION` |
| Séries e escalas de gráfico | `CHART_CATEGORICAL`, `build_chart()` |
| Tokens de um componente | `COMPONENT_TOKENS` |
| Cobertura do teste de contraste | `CONTRAST_PAIRS` |

### 3.3 O fluxo

```bash
# 1. capture a linha de base ANTES de editar
python scripts/design/generate_tokens.py --check > %TEMP%/contraste-antes.txt

# 2. edite a semente no gerador (nunca os arquivos gerados)

# 3. gere — este comando reescreve os 4 arquivos E roda o --check no fim
python scripts/design/generate_tokens.py

# 4. capture a nova tabela
python scripts/design/generate_tokens.py --check > %TEMP%/contraste-depois.txt

# 5. compare
diff %TEMP%/contraste-antes.txt %TEMP%/contraste-depois.txt

# 6. revise o diff dos gerados
git diff --stat frontend/src/styles/tokens/
git diff frontend/src/styles/tokens/semantic.css
```

Os arquivos temporários ficam **fora do repositório**. Uma tabela de contraste versionada é uma
segunda fonte de verdade que envelhece.

O passo 3 já valida: `main()` escreve os arquivos e só então chama `check_contrast()`,
devolvendo `1` se algum par falhar. O `--check` isolado (passos 1 e 4) existe para produzir a
tabela sem tocar em arquivo, que é o que torna a comparação honesta.

### 3.4 Como ler o diff de contraste

O `--check` imprime 68 linhas — 34 pares × 2 temas — no formato
`tema · texto · sobre · ratio · min · status`. No `diff`, procure três coisas, nesta ordem:

| Sinal | Leitura | Ação |
|---|---|---|
| Qualquer `FAIL` | Regressão dura | Bloqueia. Vá para §3.5 |
| Razão que caiu e ficou a menos de `0,3` do mínimo | Margem consumida; a próxima mudança quebra | Trate como falha e afaste os tons |
| Razão que mudou num par que você não pretendia tocar | A semente afetou mais papéis do que você imaginava | Confirme que é intencional antes de seguir |

Croma e matiz **não** alteram razão de contraste — L\* determina a luminância relativa sozinho.
Logo: se você mexeu só em `CHROMA_TAPER` ou só na matiz de uma paleta e o diff de contraste veio
com números diferentes, alguma outra coisa mudou junto. Investigue antes de commitar.

### 3.5 Quando o `--check` falha

| Sintoma | Causa provável | Ação correta |
|---|---|---|
| `on-<papel>` sobre `<papel>` abaixo de 4.5 | Os dois tons ficaram perto demais | Afastar os tons em `SEMANTIC_COLOR` — normalmente clarear o container no claro ou escurecer no escuro |
| `outline` sobre `surface` abaixo de 3.0 | A superfície clareou, ou o contorno clareou junto | Ajustar o tom de `outline` na coluna do tema afetado |
| Falha só no tema escuro | O mapa usa tons simétricos, e simetria de tom não é simetria de contraste | Ajustar apenas a coluna do escuro; as duas colunas são independentes por construção |
| Falhas em massa depois de mexer em `TONES` | Um tom citado por `SEMANTIC_COLOR` mudou de vizinhança | Reverter e mexer em `TONES` isoladamente, um degrau por vez |
| Falha num par de identidade de plataforma (`airbnb`, `booking`) | A matiz da marca externa é gamut-limitada nas pontas | Ajustar o tom do container, nunca a matiz — a matiz é a identidade |

**Proibições absolutas.** Cada uma delas transforma o teste em teatro:

1. Reduzir o mínimo de um par em `CONTRAST_PAIRS`. O mínimo é a WCAG 2.2 AA, não uma preferência.
2. Remover um par da lista para o vermelho sumir.
3. "Corrigir" no CSS de consumo com um hexadecimal que não veio do gerador.
4. Commitar com `--check` vermelho, mesmo prometendo consertar no commit seguinte.

Se nenhum ajuste de tom resolve sem destruir a identidade da paleta, **a mudança é rejeitada**.
O gerador é a autoridade; a estética cede. Isso é a regra de desempate do `README.md` §2 aplicada
ao caso concreto: compactação × acessibilidade → acessibilidade.

### 3.6 O commit

**Gerador e gerados vão no mesmo commit, sempre.** Um commit que muda a semente sem regenerar,
ou que regenera sem a semente, produz um estado do repositório em que os arquivos não são a
saída do gerador — e a partir dele `git bisect` sobre uma regressão visual aponta para o commit
errado, e `git blame` sobre uma cor mente.

O commit inclui, no mínimo:

```
scripts/design/generate_tokens.py
frontend/src/styles/tokens/tokens.json
frontend/src/styles/tokens/primitives.css
frontend/src/styles/tokens/semantic.css
frontend/src/styles/tokens/components.css
```

A mensagem registra a razão medida quando houve mudança de contraste:

```
fix(tokens): restaura AA em on-warning-container sobre warning-container

Tom do container no escuro: 30 -> 25.
Contraste: 4.31 -> 5.02 (min 4.5). 68/68 pares passam.
```

O hook de pre-commit (`.husky/pre-commit` → `npx lint-staged`) passa o gerador por
`ruff format` e `ruff check`, porque `scripts/**/*.py` está no `lint-staged`. Espere o formatador
tocar o arquivo. Ele **não** roda o `--check` — a validação de contraste é manual hoje (§7.2).

### 3.7 Quando criar um token novo

Token novo é vocabulário novo, e vocabulário grande demais é tão ruim quanto vocabulário
insuficiente: ninguém decora, todo mundo improvisa.

| Pergunta | Bloqueia se |
|---|---|
| Existe token semântico que já resolve? | Sim — use `--lm-color-*` diretamente |
| O valor aparece em pelo menos dois lugares, ou expressa uma regra do sistema? | Não — é constante local, fica no CSS do componente |
| O nome descreve o **papel**, não a aparência? | Não — `--lm-card-selected-bg` é papel; um nome com a cor dentro morre na primeira troca de tema |
| Se for token de componente, ele referencia outro token? | Não — hexadecimal em `COMPONENT_TOKENS` congela o tema e quebra a troca claro/escuro |

A exceção conhecida à última regra são constantes geométricas sem primitivo correspondente —
`--lm-navigation-rail-width: 88px`, `--lm-icon-button-icon-size: 20px`,
`--lm-app-bar-height: 64px`. Elas são literais porque não existe escala primitiva de tamanho.
Isso está registrado em **Lacunas**.

---

## 4. Criar um componente novo

### 4.1 A ordem de preferência

Antes de "componente novo", quatro alternativas mais baratas, nesta ordem:

1. **Usar o existente como está.** A maioria dos pedidos de componente novo é impaciência com a
   documentação do que já existe.
2. **Adicionar uma variante** ao existente. Mesma anatomia, mesmos estados, mesmo teclado —
   muda a ênfase visual. Um botão destrutivo é variante; não é componente.
3. **Compor** dois existentes. Um card com uma tabela dentro é composição, e composição vive em
   `06-padroes.md`, não no catálogo.
4. **Componente novo** — só quando as três acima falham.

### 4.2 As perguntas obrigatórias

Nenhuma linha de código antes de todas terem resposta escrita.

| # | Pergunta | Bloqueia se a resposta for |
|---|---|---|
| 1 | Algum componente do catálogo resolve isso hoje? | Sim — use-o |
| 2 | É só uma variante visual de um existente? | Sim — vire variante e documente na entrada dele |
| 3 | O padrão se repete em pelo menos três lugares, ou em duas das dez páginas? | Não — é um caso único; resolva local e documente a exceção |
| 4 | Tem comportamento próprio (estado interno, gestão de foco, ciclo de vida) que o existente não tem? | Não — a diferença é só de aparência, volte à pergunta 2 |
| 5 | Toda cor, espaço, raio, duração e tamanho sai de token? | Não — ou o token existe e você não achou, ou falta token: resolva §3.7 antes |
| 6 | Funciona nos dois temas, incluindo o override `[data-theme]`? | Não — ele depende de um valor que não é derivado; não entra |
| 7 | Tem comportamento definido nos cinco breakpoints — o que muda, some ou reorganiza? | Não — "encolhe" não é comportamento responsivo |
| 8 | Tem contrato de teclado escrito: quais teclas, o que fazem, como se sai? | Não — está incompleto, não "quase pronto" |
| 9 | Tem estado de foco visível definido, inclusive sobre superfície invertida? | Não — idem |
| 10 | Tem papel e nome acessíveis definidos, e estados expostos por atributo? | Não — idem |
| 11 | Tem estado vazio, de carregamento e de erro definidos? | Não — num produto onde uma reserva perdida custa dinheiro, esses três são metade do componente |

As perguntas 8, 9 e 10 não são negociáveis nem adiáveis: o `README.md` §3.6 já fixa que um
componente sem foco visível e sem operação por teclado está **incompleto**.

### 4.3 A ordem de produção

Especificação → tokens → documentação → código → testes. Nunca código primeiro. Um componente
implementado antes de especificado vira a especificação por acidente, e o acidente é permanente.

A entrada no catálogo nasce completa: anatomia, variantes, estados, tokens associados,
comportamento responsivo, teclado, semântica, estados de dados, usos corretos e incorretos.
Entrada incompleta fica no catálogo resumido e conta como backlog, não como pronto.

---

## 5. Depreciação

### 5.1 Os três estados

| Estado | Significa | Pode ser usado em código novo? |
|---|---|---|
| **Ativo** | Documentado e suportado | Sim |
| **Depreciado** | Documentado, ainda funciona, tem substituto declarado | Não |
| **Removido** | Não existe mais | Não |

### 5.2 Como marcar

| Onde | Como |
|---|---|
| Documentação | Linha no topo da entrada: `> Depreciado em 1.3.0 · remoção prevista em 2.0.0 · substituto: <nome>` |
| Gerador | Comentário sobre a chave: `# DEPRECATED 1.3.0 -> remover em 2.0.0, use <token>` |
| Registro | Uma linha na tabela de depreciações desta página |
| Código do componente | `@deprecated` no JSDoc e aviso apenas em desenvolvimento — nunca `console.warn` no build empacotado, que roda no Electron do usuário |

O registro tem formato fixo:

| Campo | Conteúdo |
|---|---|
| Item | Nome exato do token ou componente |
| Depreciado em | Versão |
| Remoção prevista | Versão MAJOR |
| Substituto | Nome exato, ou "nenhum — o papel deixou de existir" |
| Migração | "substituição literal" ou "requer decisão", com a descrição do que decidir |

Nenhuma depreciação foi declarada até 1.0.0. A tabela nasce vazia e é preenchida na primeira.

### 5.3 Por quanto tempo manter

**Depreciar em MINOR, remover em MAJOR. Nunca as duas na mesma versão.** Um ciclo mínimo de
convivência existe mesmo com um único consumidor: o intervalo é o que dá espaço para a migração
ser feita com o substituto já disponível, em vez de o código ficar quebrado enquanto se decide.

Mas o portão real da remoção não é o calendário — é a contagem de referências. Com um consumidor
só, dá para provar que a remoção é segura:

```bash
grep -rn -- "--lm-color-divider" frontend/src
```

**Zero resultados é condição necessária para remover.** Enquanto houver uma referência, o item
continua depreciado, independentemente de quantas versões passaram. Remover com referência viva
não economiza nada: a cor volta três telas depois como hexadecimal solto, e aí ela está fora do
sistema de vez.

Para tokens, a transição correta é um alias temporário no gerador — `--lm-antigo: var(--lm-novo)`
— que sobrevive um ciclo MINOR. O gerador não tem hoje um mapa dedicado a isso; a regra está em
prosa e o mecanismo está registrado em **Lacunas**.

### 5.4 Como comunicar e migrar

Toda depreciação e toda remoção entram no CHANGELOG, com o motivo e o comando de migração
quando ele for literal:

```
### Depreciado
- `--lm-color-divider` -> use `--lm-color-outline-variant`. Substituição literal.
  Remoção prevista: 2.0.0.
```

O CHANGELOG ainda não existe no repositório — é o primeiro item do backlog de governança (§10),
porque sem ele a depreciação não tem onde ser comunicada e o processo inteiro fica sem saída.

A migração é feita **antes** da remoção, num commit próprio, separado do commit que remove. Dois
commits pequenos são reversíveis; um commit grande que migra e remove junto não é.

---

## 6. Revisão de acessibilidade

### 6.1 Quem revisa

O autor da mudança. Não há segunda pessoa, e fingir que há produz revisão fantasma. A
consequência prática: **a revisão precisa ser mecânica e deixar evidência**. Onde o julgamento
seria necessário, o item vira teste automatizado — é por isso que a suíte de acessibilidade
(§7) é prioridade alta no backlog, e não um luxo.

Evidência aceitável: a saída do comando que provou o item, colada na mensagem do commit ou no
corpo do PR. Item sem evidência conta como não revisado.

### 6.2 O que é obrigatório antes de um componente ser considerado pronto

| # | Item | Critério | Como verificar | Bloqueia |
|---|---|---|---|---|
| 1 | Contraste de texto | ≥ 4.5:1 (≥ 3:1 para ≥ 24px, ou ≥ 19px em peso 700) | `--check` cobre os pares de token; combinação não coberta exige medição do par real | Sim |
| 2 | Contraste de não-texto | ≥ 3:1 para contornos, ícones com significado e indicadores de estado | Medição do par renderizado | Sim |
| 3 | Foco visível | Anel `--lm-focus-ring-width` (3px), `--lm-focus-ring-offset` (2px), `--lm-focus-ring-color`; sobre `--lm-color-inverse-surface` usar `--lm-focus-ring-color-inverse` | Percorrer o componente só com Tab | Sim |
| 4 | Ordem de tabulação | Igual à ordem visual de leitura | Tab do início ao fim, sem `tabindex` positivo | Sim |
| 5 | Operação por teclado | Toda ação alcançável sem ponteiro, incluindo a saída | Roteiro escrito no contrato de teclado do componente | Sim |
| 6 | Retenção e devolução de foco | Só em modal e drawer; ao fechar, o foco volta ao gatilho | Abrir, tabular até o fim, fechar com Esc | Sim |
| 7 | Nome acessível | Todo controle sem rótulo visível tem nome — ícone sozinho é o caso crítico | Inspeção da árvore de acessibilidade | Sim |
| 8 | Papel e estado | `role` quando o elemento nativo não basta; `aria-expanded`, `aria-selected`, `aria-current`, `aria-invalid`, `aria-describedby` conforme o caso | Idem | Sim |
| 9 | Erro associado | Mensagem ligada ao campo por `aria-describedby` + `aria-invalid`, e nunca apenas colorida | Ler o campo com leitor de tela | Sim |
| 10 | Alvo de toque | ≥ 24×24 CSS sempre; em `(pointer: coarse)` a densidade `comfortable` é forçada e `--lm-density-control` vale 48px | Medir o alvo, não o ícone | Sim |
| 11 | Movimento reduzido | Sob `prefers-reduced-motion: reduce`, durações caem para `--lm-duration-instant` | Alternar a preferência do SO | Sim |
| 12 | Cor não é o único portador | Status sempre com ícone + rótulo além da cor; séries de gráfico com rótulo direto a partir da terceira | Ver em escala de cinza | Sim |
| 13 | Zoom 200% | Sem perda de conteúdo nem de função | Zoom do Electron | Sim |
| 14 | Refluxo | Sem rolagem horizontal a 320px CSS de largura | Reduzir a janela | Sim |
| 15 | Texto em unidade relativa | A escala tipográfica já é em `rem` (`--lm-type-*-size`); nada de `px` em texto | Inspeção do CSS do componente | Sim |

### 6.3 O pré-requisito que hoje reprova tudo

Nenhum componente passa no item 3 enquanto `frontend/src/styles/global.css:64` mantiver:

```css
* { margin: 0; padding: 0; box-sizing: border-box; outline: none; }
```

Esse seletor apaga o foco da aplicação inteira, inclusive de um anel que o componente declare
corretamente. Removê-lo e estabelecer a base de `:focus-visible` é pré-condição de qualquer
revisão de acessibilidade — não é uma tarefa paralela. Hoje o repositório tem **zero**
ocorrências de `:focus-visible`, `aria-*` e `role=` em `frontend/src`.

---

## 7. Estratégia de testes do sistema

### 7.1 A restrição que define a suíte

O produto é offline e local. Nenhuma camada de teste pode depender de serviço hospedado — nem
para contraste, nem para regressão visual, nem para leitor de tela. Toda ferramenta escolhida
precisa rodar como dependência de desenvolvimento local. Essa restrição é a mesma que fez a
fonte ser empacotada em vez de importada de CDN, e vale igualmente para as ferramentas.

A contrapartida é confortável: o produto roda numa única engine, o Chromium embarcado no
Electron. "Cross-browser" aqui significa uma versão só, fixada pelo `package.json`. A matriz de
teste é pequena — mas o teste tem que rodar **no runtime do Electron**, não no navegador que o
desenvolvedor abre no `vite dev`, porque é o Electron que chega ao usuário.

### 7.2 As camadas

| Camada | O que prova | Ferramenta | Estado |
|---|---|---|---|
| Contraste de tokens | 68 pares "texto sobre fundo" atendem AA nos dois temas | `python scripts/design/generate_tokens.py --check` (sai 1 em falha) | ✅ Existe e passa |
| Contraste no portão de commit | Que ninguém commita com o `--check` vermelho | Entrada em `lint-staged` para `scripts/design/*.py` e `frontend/src/styles/tokens/*` | ❌ Backlog — o hook só roda `ruff` e `eslint` |
| Deriva dos gerados | Que os arquivos gerados são de fato a saída do gerador | Rodar o gerador e falhar se `git diff frontend/src/styles/tokens/` não vier vazio | ❌ Backlog |
| Lint | Regras de JS/JSX e Python | `npm run quality`, husky + lint-staged | ⚠️ Existe, mas não sabe nada sobre design |
| Unitário de componente | Render, props, variantes, estados | Vitest + Testing Library | ❌ Não há runner de frontend instalado |
| Interação | Clique, digitação, seleção, arrastar | `user-event` | ❌ Backlog |
| Teclado | Tab, Shift+Tab, setas, Enter, Espaço, Esc, Home/End, e o retorno de foco | Mesma suíte, roteiro por componente | ❌ Backlog |
| Semântica / leitor de tela | Nome, papel, estado expostos | `axe-core` automatizado + uma passagem manual com o leitor de tela do Windows | ❌ Backlog |
| Contraste de composição | Texto real sobre superfície real, que os pares de token não cobrem | `axe-core` sobre a árvore renderizada | ❌ Backlog |
| Visual | Regressão de pixel por tema | Captura em runtime Electron, comparação com baseline versionada | ❌ Backlog |
| Responsivo | Comportamento nos cinco breakpoints, inclusive a troca rail → drawer → navegação inferior | Teste parametrizado por viewport | ❌ Backlog |
| Tema | Claro, escuro e o override `[data-theme]` vencendo nos dois sentidos | Matriz cruzada com visual e com `axe` | ❌ Backlog |
| Zoom e refluxo | 200% de zoom e 320px de largura | Roteiro manual fixo, executado por release | ❌ Backlog |
| i18n | Rótulo que estoura com texto mais longo | Render com strings ~40% mais longas que as de `pt-BR` | ❌ Backlog |
| Cross-browser | Uma engine, a do Electron | Rodar a suíte no runtime empacotado | ⚠️ Parcial — nada roda lá hoje |

### 7.3 O único teste do sistema que existe hoje

```bash
python scripts/design/generate_tokens.py --check
```

Percorre 34 pares em dois temas, imprime a razão medida e o mínimo exigido de cada um, e sai com
código 1 se algum reprovar. Todos os 68 passam em 1.0.0.

É pouco, mas é o teste certo para o estágio: valida a única parte do sistema que já é código.
Todo o resto do sistema ainda é documento, e documento não tem teste — tem revisão.

### 7.4 Ordem de implantação e por quê

1. **Portões primeiro** (contraste no commit, deriva dos gerados). São baratos, protegem o que
   já está pronto, e sem eles toda camada seguinte é construída sobre um alicerce que pode
   mudar sozinho.
2. **Runner + unitário + teclado**, junto com os primeiros componentes implementados. Escrever a
   suíte depois de vinte componentes prontos é reescrever vinte componentes.
3. **`axe-core`**, imediatamente após o runner. É a camada que substitui o revisor humano que
   não existe.
4. **Visual, tema e responsivo**, quando houver componentes suficientes para que uma baseline
   faça sentido. Cedo demais, a baseline muda a cada commit e ninguém olha mais.
5. **Zoom, refluxo e i18n**, por release, com roteiro escrito.

---

## 8. Definition of Done de um componente

Um componente está pronto quando **todos** os itens abaixo estão verdadeiros. Não há crédito
parcial: 23 de 24 significa não pronto.

**Especificação**
1. Entrada completa no catálogo, com anatomia, variantes, estados e usos correto e incorreto.
2. Comportamento responsivo definido nos cinco breakpoints — o que muda, some ou reorganiza.
3. Estados de dados definidos: vazio, carregando, erro, parcial.
4. Contrato de teclado escrito, tecla por tecla, incluindo como se sai.

**Tokens**
5. Zero hexadecimal, `rgba()` ou `px` mágico no CSS do componente.
6. Toda cor vem de token semântico ou de token do componente; nenhum token de componente contém
   hexadecimal.
7. Espaçamento sai de `--lm-space-*`; raio de `--lm-radius-*`; duração de `--lm-duration-*`;
   curva de `--lm-easing-*`.
8. Altura de controle deriva de `--lm-density-control` (ou `--lm-density-row`, em linha de
   tabela), e não de um valor fixo.

**Estados**
9. Os estados de interação usam as opacidades de `--lm-state-*` — `hover` 0.08, `focus` 0.10,
   `pressed` 0.12, `selected` 0.12.
10. Desabilitado usa `--lm-state-disabled-content` (0.38) e `--lm-state-disabled-container`
    (0.12), e permanece legível o suficiente para ser identificado.
11. Selecionado é comunicado por indicador tonal + peso do rótulo + `strokeWidth` maior — não
    por preenchimento de ícone, que o `lucide-react` não oferece.

**Acessibilidade**
12. Os 15 itens de §6.2 verificados, com evidência.
13. `:focus-visible` implementado com os tokens `--lm-focus-ring-*`, e nenhum `outline: none`
    introduzido.
14. Nome, papel e estado acessíveis presentes e corretos.
15. Alvo de toque de no mínimo 24×24 CSS; 48px sob ponteiro grosseiro.

**Tema e responsividade**
16. Verificado no tema claro, no escuro e com o override `[data-theme]` nos dois sentidos.
17. Verificado nos cinco breakpoints, com o comportamento que a especificação prometeu.
18. Verificado nas três densidades — `comfortable`, `default`, `compact`.
19. Verificado a 200% de zoom e a 320px de largura.

**Código**
20. Sem estilo inline `style={{}}`, salvo valor genuinamente dinâmico e calculado em tempo de
    execução — e nesse caso apenas a propriedade dinâmica fica inline.
21. Sem dependência nova. O CSS usa `@layer` e custom properties.
22. `npm run quality` limpo, sem avisos.

**Documentação e teste**
23. Exemplo de uso mínimo e exemplo de uso errado, ambos reais.
24. Testes das camadas já disponíveis passando; as camadas ausentes registradas como pendência
    nominal do componente, não silenciadas.

---

## 9. Checklist de qualidade do sistema

Estado real em 1.0.0. Marcado honestamente: ✅ feito, ⚠️ parcial, ❌ pendente.

### 9.1 Tokens

| Item | Estado | Observação |
|---|---|---|
| Tokens primitivos gerados | ✅ | 14 rampas tonais completas em `primitives.css` |
| Tokens semânticos gerados, dois temas | ✅ | `semantic.css`, com `prefers-color-scheme` e override `[data-theme]` |
| Tokens de componente gerados | ✅ | 14 blocos em `components.css` |
| Fonte serializável | ✅ | `tokens.json`, com `$meta.version` |
| Contraste WCAG 2.2 AA | ✅ | 68/68 pares passam |
| Nenhum hexadecimal em token de componente | ✅ | Todos referenciam tokens semânticos ou primitivos |
| Breakpoints como variável CSS | ❌ | Existem em `tokens.json`, não são emitidos (ver Lacunas) |
| Superfície de gráfico como variável CSS | ❌ | `chart.surface` existe em `tokens.json`, não é emitida (ver Lacunas) |
| Tokens carregados pela aplicação | ❌ | `main.jsx` importa só `styles/global.css`; os quatro arquivos de token não são importados por ninguém |

### 9.2 Documentação

| Item | Estado | Observação |
|---|---|---|
| Os 8 documentos do sistema | ✅ | `README.md` + `01`…`08` |
| Componentes com documentação completa | ✅ | 19 entradas, 20 campos cada |
| Restante do catálogo | ⚠️ | Especificação resumida; documentação completa é backlog |
| Registro consolidado de lacunas | ⚠️ | Este documento é o destino; depende das seções "Lacunas" de `01`…`07` |
| CHANGELOG | ❌ | Não existe |
| Registro de depreciações | ✅ | Formato definido em §5.2; tabela vazia, nada depreciado até 1.0.0 |

### 9.3 Portões e testes

| Item | Estado | Observação |
|---|---|---|
| Teste de contraste dos tokens | ✅ | `--check`, 68 pares |
| Lint de Python e JS no commit | ✅ | `.husky/pre-commit` → `lint-staged` |
| Contraste no portão de commit | ❌ | O hook não roda o `--check` |
| Verificação de deriva dos gerados | ❌ | Nada impede um arquivo gerado editado à mão de ser commitado |
| Runner de teste de frontend | ❌ | Não há Vitest, Jest, Testing Library, axe ou Playwright em nenhum dos dois `package.json` |
| Teste de acessibilidade automatizado | ❌ | Depende do runner |
| Teste visual, de tema e responsivo | ❌ | Depende do runner |

### 9.4 Código do produto

| Item | Estado | Observação |
|---|---|---|
| Componentes React do sistema | ❌ | Nada implementado — é o objeto do plano de refatoração |
| `* { outline: none }` removido | ❌ | Ainda em `frontend/src/styles/global.css:64` |
| `:focus-visible` na base | ❌ | Zero ocorrências em `frontend/src` |
| `aria-*` e `role=` | ❌ | Zero ocorrências em `frontend/src` |
| Inter empacotada | ❌ | `@import` do CDN do Google Fonts na linha 1 de `global.css` — quebra offline |
| Estilos inline eliminados | ❌ | 171 ocorrências de `style={{}}` |
| Hexadecimais e `rgba()` fora de token | ❌ | 94 hexadecimais e 87 `rgba()` nos CSS |
| Tema claro disponível no produto | ❌ | Tema único escuro, com `#101922` fixo em `App.css`, `App.jsx` e `Sidebar.css` |
| Navigation rail adaptativo | ❌ | Header fixo de 64px + 8 abas horizontais de 52px |
| Densidade aplicada | ❌ | Depende dos tokens serem carregados |

O resumo honesto: **o sistema está pronto como especificação e como matemática de cor; não está
começado como código.** Os ✅ das seções 9.1 e 9.2 são reais e verificáveis por comando. Os ❌ da
seção 9.4 são o trabalho.

---

## 10. Backlog de governança

Ordenado. A ordem importa mais que a lista: cada onda existe porque a seguinte seria construída
sobre areia sem ela.

### Onda 0 — travar o que já está pronto

Antes de escrever qualquer código de componente. São tarefas pequenas, e cada uma delas evita
uma classe inteira de regressão silenciosa.

| # | Tarefa | Por quê |
|---|---|---|
| 0.1 | Criar o CHANGELOG | Sem ele, §2 e §5 não têm onde ser executados; o processo de depreciação fica sem saída |
| 0.2 | Rodar o `--check` no pre-commit, disparado por mudança no gerador ou nos tokens | Hoje o único teste do sistema é opcional |
| 0.3 | Verificação de deriva: rodar o gerador e falhar se `git diff` dos gerados não vier vazio | Único jeito de tornar "não edite à mão" uma regra, e não um pedido |
| 0.4 | Mapa de aliases de depreciação no gerador | §5.3 exige um mecanismo que não existe |

### Onda 1 — desbloquear a acessibilidade

Nenhum componente pode passar em §6.2 antes disto.

| # | Tarefa | Por quê |
|---|---|---|
| 1.1 | Remover `outline: none` do seletor universal em `global.css` | Reprova todo componente, inclusive os que fizerem o certo |
| 1.2 | Importar os quatro arquivos de token na aplicação, dentro de `@layer` | Os tokens existem e nada os consome — todo o sistema está desligado |
| 1.3 | Base de `:focus-visible` usando `--lm-focus-ring-width`, `--lm-focus-ring-offset` e `--lm-focus-ring-color` | Item 3 de §6.2 |
| 1.4 | Empacotar a Inter e remover o `@import` do CDN | Correção de bug offline, não preferência |

### Onda 2 — instalar a rede de segurança

| # | Tarefa | Por quê |
|---|---|---|
| 2.1 | Runner de teste de frontend (Vitest + Testing Library), local | Não existe nenhum |
| 2.2 | `axe-core` na suíte | Substitui o revisor humano que o projeto não tem |
| 2.3 | Roteiro de teclado por componente, como teste | O contrato de teclado precisa ser executável, não descritivo |

### Onda 3 — fechar a documentação

| # | Tarefa | Por quê |
|---|---|---|
| 3.1 | Documentação completa dos componentes que hoje estão no catálogo em especificação resumida — mesmos 20 campos das 19 entradas completas | É a maior pendência de documentação do sistema. Enquanto durar, o catálogo tem duas classes de entrada, e a classe resumida é onde a improvisação vai acontecer |
| 3.2 | Consolidar aqui as seções "Lacunas" de `01`…`07`, com origem e prioridade | Lacuna registrada em sete lugares é lacuna esquecida |
| 3.3 | Resolver as lacunas consolidadas — cada uma vira token no gerador ou regra em prosa com justificativa de por que não vira token | Uma lacuna aberta é um convite ao valor improvisado |

### Onda 4 — automatizar a regressão

| # | Tarefa | Por quê |
|---|---|---|
| 4.1 | Regressão visual por tema, no runtime do Electron | Só faz sentido com componentes suficientes para uma baseline estável |
| 4.2 | Matriz responsiva pelos cinco breakpoints | Inclui a troca rail → drawer → navegação inferior, que é a decisão estrutural mais frágil |
| 4.3 | Matriz de tema com o override `[data-theme]` nos dois sentidos | O `:where(:not([data-theme="light"]))` do `semantic.css` é sutil e merece teste |

### Onda 5 — o resto

| # | Tarefa |
|---|---|
| 5.1 | Roteiro fixo de zoom 200% e refluxo a 320px, executado por release |
| 5.2 | Teste de expansão de rótulo para i18n |
| 5.3 | Revisão do sistema por release: rodar §9 inteiro e atualizar os estados |

---

## Lacunas
> **Registro autoritativo:** [`LACUNAS.md`](LACUNAS.md). A lista abaixo reflete o estado
> do dia em que este documento foi escrito e não é atualizada quando uma lacuna fecha —
> várias destas já foram fechadas por extensão do gerador.


Tokens que uma regra deste documento precisaria citar e que **não existem** em `tokens.json` nem
nos três arquivos CSS. Registrados aqui em vez de inventados.

| # | Lacuna | Onde aparece | Consequência |
|---|---|---|---|
| L1 | Não há variável CSS de breakpoint. `primitive.breakpoint` existe em `tokens.json` (`compact` 0px, `medium` 600px, `expanded` 840px, `large` 1200px, `xlarge` 1600px), mas `emit_primitives()` não a emite | §2.2, §7.2, onda 4.2 | Os literais das media queries ficam soltos no CSS, sem nada que os amarre a `tokens.json`. Agrava o fato de que custom property não funciona dentro de `@media` — mesmo emitida, a variável não resolveria o problema sozinha; é preciso uma verificação que compare os literais com a fonte |
| L2 | Não há `--lm-chart-surface`. `chart.surface` existe em `tokens.json` apontando para `surface-container-low` nos dois temas, mas não vira variável | §9.1 | A superfície contra a qual o contraste das marcas de gráfico foi verificado não é referenciável. Trocá-la por engano invalida a paleta inteira sem que nada acuse |
| L3 | Não há tokens de eixo, grade e tooltip de gráfico | §6.2 item 2 | O contraste de linhas de grade e rótulos de eixo não é derivado nem verificado pelo `--check` |
| L4 | Não há escala primitiva de tamanho. `--lm-icon-button-icon-size: 20px`, `--lm-navigation-rail-width: 88px`, `--lm-app-bar-height: 64px` e afins são literais em `components.css` | §3.7 | A regra "todo token de componente referencia outro token" tem exceções que não podem ser eliminadas hoje |
| L5 | Não há token de espessura de contorno genérico. Existe `--lm-field-border-width-focus` (2px), específico do campo | §8 item 5 | A espessura de 1px de contornos e divisores fica literal em todo componente |
| L6 | Não há anel de foco para contexto destrutivo ou de erro. Existem `--lm-focus-ring-color` e `--lm-focus-ring-color-inverse` | §6.2 item 3 | Sobre `--lm-color-error-container`, o anel primário pode não alcançar 3:1; a regra fica em prosa |
| L7 | Não há token de opacidade de scrim genérico. Existe `--lm-dialog-scrim-opacity` (0.32), específico do diálogo | §5, drawer e overlay | Drawer e overlay reusam por convenção um valor que pertence nominalmente ao diálogo |
| L8 | Não há tokens de tempo de permanência — atraso de tooltip, duração do snackbar em tela | §8 item 7 | Valores temporais visíveis ficam fora do sistema, que é exatamente onde eles divergem entre telas |
| L9 | Não há mapa de aliases de depreciação no gerador | §5.3, backlog 0.4 | A transição de um token depreciado não tem mecanismo; hoje ela só existe como regra escrita |

Lacunas registradas pelos documentos `01` a `07` são consolidadas nesta tabela pela tarefa 3.2 do
backlog, com a coluna de origem indicando o documento que a levantou. Enquanto a consolidação não
acontece, cada documento mantém a sua própria seção — e nenhuma delas autoriza inventar o nome do
token que falta.
